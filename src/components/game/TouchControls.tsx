'use client'

// ============================================================
// ЭХО РАЗЛОМА — сенсорное управление (v2.0, GDD 06 §10)
// Левый нижний квадрант — плавающий джойстик (движение относительно
// камеры, аналоговая скорость). Правая look-зона — орбита камеры
// свайпом, пинч — зум, короткий тап — «тап по миру» (общий путь
// мыши: враг/НПС/интеракт/приказ движения). Правый нижний кластер —
// действия: знаки/зелья (общий словарь с HUD-баром), цель,
// взаимодействие, тактическая пауза, крики.
// Видимость: settings.touch (авто/вкл/выкл) + детекция устройства
// (lib/game/touch.ts). При панелях/диалоге контролы скрываются.
// ============================================================

import { useEffect, useRef, useState } from 'react'
import { Crosshair, Hand, Pause, Play } from 'lucide-react'
import { getEngine } from '@/lib/game/engine'
import { useGame } from '@/lib/game/store'
import { t, useLocale } from '@/lib/game/i18n'
import { triggerAction, tapWorld } from '@/lib/game/systems/input'
import {
  initTouchDetection,
  markTouchSeen,
  resetTouchJoy,
  resolveTouchEnabled,
  touchJoy,
} from '@/lib/game/touch'
import type { AbilityHud, ShoutHud } from '@/lib/game/store'
import { GameIcon } from './GameIcon'

const JOY_RADIUS = 58 // радиус хода ручки, px
const JOY_DEAD = 0.14 // мёртвая зона наклона
const TAP_PX = 9 // порог «короткий тап» в look-зоне, px
const TAP_MS = 350

interface Ptr {
  x: number
  y: number
}

export default function TouchControls() {
  useLocale() // v1.6: перерисовка при переключении языка
  const screen = useGame((s) => s.screen)
  const panel = useGame((s) => s.panel)
  const dialogue = useGame((s) => s.dialogue)
  const diceRoll = useGame((s) => s.diceRoll)
  const settings = useGame((s) => s.settings)
  const abilities = useGame((s) => s.abilities)
  const shouts = useGame((s) => s.shouts)
  const interactHint = useGame((s) => s.interactHint)
  const paused = useGame((s) => s.paused)

  const [enabled, setEnabled] = useState(false)
  const [joyUi, setJoyUi] = useState<{ ox: number; oy: number; kx: number; ky: number } | null>(null)
  const [hintOn, setHintOn] = useState(true) // v2.1: подсказка гаснет — экран не перегружен
  const zoneRef = useRef<HTMLDivElement | null>(null)
  const lookRef = useRef<HTMLDivElement | null>(null)

  // --- Детекция/режим: реакция на настройки и первый touchstart ---
  useEffect(() => {
    initTouchDetection()
    const reevaluate = () => setEnabled(resolveTouchEnabled(settings.touch))
    reevaluate()
    const onFirstTouch = () => {
      markTouchSeen()
      reevaluate()
    }
    window.addEventListener('touchstart', onFirstTouch, { passive: true, once: true })
    return () => window.removeEventListener('touchstart', onFirstTouch)
  }, [settings.touch])

  // --- Зеркало для Hud (скрыть центральный бар умений, увеличить меню-кнопки) ---
  useEffect(() => {
    useGame.getState().patch({ touchUi: enabled })
    if (!enabled) resetTouchJoy()
    return () => {
      useGame.getState().patch({ touchUi: false })
      resetTouchJoy()
    }
  }, [enabled])

  const active = enabled && screen === 'game' && !panel && !dialogue

  // v2.1: подсказка раскладки показывается первые 7 секунд сессии
  useEffect(() => {
    if (!active || !hintOn) return
    const t = setTimeout(() => setHintOn(false), 7000)
    return () => clearTimeout(t)
  }, [active, hintOn])

  // --- Джойстик ---
  const joyPtr = useRef<number | null>(null)
  const joyOrigin = useRef<Ptr | null>(null)

  const joyDown = (e: React.PointerEvent) => {
    if (joyPtr.current !== null) return
    joyPtr.current = e.pointerId
    const rect = zoneRef.current?.getBoundingClientRect()
    if (!rect) return
    joyOrigin.current = { x: e.clientX, y: e.clientY }
    setJoyUi({ ox: e.clientX - rect.left, oy: e.clientY - rect.top, kx: 0, ky: 0 })
  }

  const joyMove = (e: PointerEvent) => {
    if (joyPtr.current !== e.pointerId || !joyOrigin.current) return
    const dx = e.clientX - joyOrigin.current.x
    const dy = e.clientY - joyOrigin.current.y
    const len = Math.hypot(dx, dy) || 1
    const clamped = Math.min(JOY_RADIUS, len)
    const nx = (dx / len) * clamped
    const ny = (dy / len) * clamped
    const scale = clamped > JOY_DEAD * JOY_RADIUS ? (clamped - JOY_DEAD * JOY_RADIUS) / (JOY_RADIUS * (1 - JOY_DEAD)) : 0
    const joy = touchJoy()
    joy.active = scale > 0.01
    joy.x = (dx / len) * scale
    joy.y = (dy / len) * scale
    setJoyUi((prev) => (prev ? { ...prev, kx: nx, ky: ny } : prev))
  }

  const joyUp = (e: PointerEvent) => {
    if (joyPtr.current !== e.pointerId) return
    joyPtr.current = null
    joyOrigin.current = null
    resetTouchJoy()
    setJoyUi(null)
  }

  // --- Look-зона: свайп = орбита, пинч = зум, тап = мир ---
  const lookPtrs = useRef(new Map<number, Ptr>())
  const lookStart = useRef<{ t: number; x: number; y: number; moved: number } | null>(null)
  const pinchDist = useRef<number | null>(null)

  const lookDown = (e: React.PointerEvent) => {
    lookPtrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (lookPtrs.current.size === 1) {
      lookStart.current = { t: performance.now(), x: e.clientX, y: e.clientY, moved: 0 }
    } else if (lookPtrs.current.size === 2) {
      const [a, b] = [...lookPtrs.current.values()]
      pinchDist.current = Math.hypot(a.x - b.x, a.y - b.y)
      lookStart.current = null // пинч отменяет тап
    }
  }

  const lookMove = (e: PointerEvent) => {
    const prev = lookPtrs.current.get(e.pointerId)
    if (!prev) return
    const dx = e.clientX - prev.x
    const dy = e.clientY - prev.y
    lookPtrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (lookPtrs.current.size === 1) {
      if (lookStart.current) lookStart.current.moved += Math.hypot(dx, dy)
      getEngine()?.view3d?.orbitBy(dx, dy)
    } else if (lookPtrs.current.size === 2 && pinchDist.current !== null) {
      const [a, b] = [...lookPtrs.current.values()]
      const d = Math.hypot(a.x - b.x, a.y - b.y)
      getEngine()?.view3d?.zoomBy((pinchDist.current - d) * 0.35)
      pinchDist.current = d
    }
  }

  const lookUp = (e: PointerEvent) => {
    const had = lookPtrs.current.delete(e.pointerId)
    if (lookPtrs.current.size < 2) pinchDist.current = null
    if (!had) return
    const st = lookStart.current
    lookStart.current = null
    if (st && performance.now() - st.t < TAP_MS && st.moved < TAP_PX) {
      const eng = getEngine()
      if (!eng) return
      if (useGame.getState().panel || eng.dialogueTree) return // жест пережил заморозку
      if (eng.tacticalPaused) {
        // v2.0: тап в тактической паузе = приказ (общий путь мыши через canvas-бинд)
        eng.inputCanvas.dispatchEvent(
          new PointerEvent('pointerdown', { button: 0, clientX: e.clientX, clientY: e.clientY, bubbles: true }),
        )
      } else {
        tapWorld(eng, e.clientX, e.clientY)
      }
    }
  }

  // --- Глобальные слушатели движений (по pointerId, без capture — дружелюбно к синтетике) ---
  useEffect(() => {
    if (!active) return
    const onMove = (e: PointerEvent) => {
      joyMove(e)
      lookMove(e)
    }
    const onUp = (e: PointerEvent) => {
      joyUp(e)
      lookUp(e)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      resetTouchJoy()
    }
  }, [active])

  if (!active) return null

  const press = (fn: () => void) => (e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    fn()
  }

  const abilityBtn = (a: AbilityHud) => {
    const cdPct = a.cdMax > 0 ? (a.cd / a.cdMax) * 100 : 0
    const dis = !a.unlocked || a.cd > 0
    return (
      <button
        key={a.id}
        data-touch-ability={a.id}
        disabled={dis}
        onPointerDown={press(() => getEngine()?.castAbility(a.id))}
        className={`relative h-11 w-11 touch-none overflow-hidden rounded-full border backdrop-blur-sm ${
          a.unlocked ? 'border-[#d9a441]/60 bg-[#181410]/85' : 'border-[#3a2e20] bg-[#181410]/70 opacity-40'
        }`}
        aria-label={a.name}
      >
        <GameIcon name={a.icon} className="mx-auto h-5 w-5 text-[#e8d5a8]" />
        {a.cd > 0 && (
          <>
            <span className="absolute inset-x-0 bottom-0 bg-black/70" style={{ height: `${cdPct}%` }} />
            <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-white">
              {a.cd.toFixed(0)}
            </span>
          </>
        )}
        {!a.unlocked && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-[9px] text-[#8a8068]">—</span>
        )}
      </button>
    )
  }

  const shoutBtn = (sh: ShoutHud) => {
    if (sh.lv <= 0) return null
    const cdPct = sh.cdMax > 0 ? (sh.cd / sh.cdMax) * 100 : 0
    return (
      <button
        key={sh.id}
        data-touch-shout={sh.id}
        disabled={sh.cd > 0}
        onPointerDown={press(() => getEngine()?.castAbility(sh.id))}
        className="relative h-11 w-11 touch-none overflow-hidden rounded-full border border-[#f5c96b]/60 bg-[#1c1a10]/85 backdrop-blur-sm"
        aria-label={sh.name}
      >
        <GameIcon name={sh.id === 'shout_force' ? 'Wind' : 'Snowflake'} className="mx-auto h-5 w-5 text-[#f5c96b]" />
        {sh.cd > 0 && (
          <>
            <span className="absolute inset-x-0 bottom-0 bg-black/70" style={{ height: `${cdPct}%` }} />
            <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-white">
              {sh.cd.toFixed(0)}
            </span>
          </>
        )}
      </button>
    )
  }

  const shoutsOpen = shouts.filter((s) => s.lv > 0)
  const signs = abilities.slice(0, 5)
  const potions = abilities.slice(5)

  return (
    <div data-touch-root className="pointer-events-none absolute inset-0 z-30 select-none">
      {/* Джойстик: левый нижний квадрант */}
      <div
        ref={zoneRef}
        data-touch-joystick
        onPointerDown={joyDown}
        className="pointer-events-auto absolute bottom-0 left-0 h-[44%] w-[46%] touch-none"
        role="application"
        aria-label={t('Джойстик движения')}
      >
        {joyUi && (
          <>
            <div
              className="absolute rounded-full border-2 border-[#d9a441]/40 bg-[#181410]/25"
              style={{ left: joyUi.ox - JOY_RADIUS - 10, top: joyUi.oy - JOY_RADIUS - 10, width: (JOY_RADIUS + 10) * 2, height: (JOY_RADIUS + 10) * 2 }}
            />
            <div
              className="absolute rounded-full border border-[#f5c96b]/70 bg-[#d9a441]/35 backdrop-blur-[1px]"
              style={{ left: joyUi.ox + joyUi.kx - 24, top: joyUi.oy + joyUi.ky - 24, width: 48, height: 48 }}
            />
          </>
        )}
        {!joyUi && (
          <div className="absolute bottom-6 left-6 h-24 w-24 rounded-full border border-[#d9a441]/20 bg-[#181410]/10" aria-hidden />
        )}
      </div>

      {/* Look-зона: правые 54% между шторкой меню и кластером (камера/пинч/тап) */}
      <div
        ref={lookRef}
        data-touch-look
        onPointerDown={lookDown}
        className="pointer-events-auto absolute right-0 top-[14%] h-[42%] w-[54%] touch-none"
        aria-hidden
      />

      {/* Кластер действий — правый нижний угол */}
      <div
        className="pointer-events-none absolute bottom-3 right-3 flex flex-col items-end gap-2"
        style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {/* Ряд 0: крики (если открыты) */}
        {shoutsOpen.length > 0 && <div className="pointer-events-auto flex gap-1.5">{shoutsOpen.map(shoutBtn)}</div>}
        {/* Ряд 1: знаки + тактическая пауза */}
        <div className="pointer-events-auto flex items-center gap-1.5">
          {signs.map(abilityBtn)}
          <button
            data-touch-action="pause"
            onPointerDown={press(() => getEngine() && triggerAction(getEngine()!, 'pause'))}
            className="flex h-11 w-11 touch-none items-center justify-center rounded-full border border-[#5a4632] bg-[#181410]/85 text-[#cfc0a0] backdrop-blur-sm"
            aria-label={t('Тактическая пауза')}
            title={t('Тактическая пауза')}
          >
            {paused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
          </button>
        </div>
        {/* Ряд 2: зелья + цель + взаимодействие */}
        <div className="pointer-events-auto flex items-center gap-1.5">
          {potions.map(abilityBtn)}
          <button
            data-touch-action="interact"
            onPointerDown={press(() => getEngine() && triggerAction(getEngine()!, 'interact'))}
            disabled={!interactHint}
            className={`flex h-16 w-16 touch-none items-center justify-center rounded-full border backdrop-blur-sm transition ${
              interactHint
                ? 'border-[#f5c96b]/80 bg-[#2a2010]/90 text-[#f5c96b] shadow-[0_0_18px_rgba(217,164,65,0.35)]'
                : 'border-[#3a2e20] bg-[#181410]/70 text-[#6a5f4a]'
            }`}
            aria-label={t('Взаимодействовать')}
            title={interactHint ?? t('Взаимодействовать')}
          >
            <Hand className="h-7 w-7" />
          </button>
          <button
            data-touch-action="target"
            onPointerDown={press(() => getEngine() && triggerAction(getEngine()!, 'target'))}
            className="flex h-16 w-16 touch-none items-center justify-center rounded-full border border-[#c94f3d]/60 bg-[#2a1410]/85 text-[#e08a6b] backdrop-blur-sm"
            aria-label={t('Цель')}
            title={t('Смена цели')}
          >
            <Crosshair className="h-7 w-7" />
          </button>
        </div>
      </div>

      {/* Подсказка раскладки — первые секунды сессии (v2.1: затем гаснет) */}
      {hintOn && (
        <p className="pointer-events-none absolute left-1/2 top-16 -translate-x-1/2 rounded bg-[#181410]/70 px-2 py-0.5 text-[10px] text-[#8a8068] opacity-80">
          {t('Свайп справа — камера · тап по врагу — цель')}
        </p>
      )}
    </div>
  )
}
