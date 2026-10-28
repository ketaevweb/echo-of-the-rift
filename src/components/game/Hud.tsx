'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Hand, Heart, Map, Maximize2, Menu, Minimize2, Moon, ScrollText, Shield, Snowflake, Sun, User, Volume2, VolumeX, Wind, X } from 'lucide-react'
import { isMuted, setMuted } from '@/lib/game/sfx'
import { getEngine } from '@/lib/game/engine'
import { triggerAction } from '@/lib/game/systems/input'
import { completeTutorial, tutorialText } from '@/lib/game/systems/tutorial'
import { useGame } from '@/lib/game/store'
import { t, useLocale } from '@/lib/game/i18n'
import { useFullscreen } from '@/lib/game/fullscreen'
import { QUALITY_NAME } from '@/lib/game/settings'
import { GameIcon } from './GameIcon'

/** Цели счётчиков побочных квестов для трекера (N из M). */
const CONTRACT_TOTALS: Record<string, number> = {
  veld: 3,
  granite_ore: 4,
  granite_scorpions: 5,
  frost_dragon: 3,
  mara_wells: 3,
  mara_glands: 5,
}

const STANCE_LABEL: Record<string, string> = {
  follow: 'Следовать',
  hold: 'Держать позицию',
  aggressive: 'Атаковать всех',
}

function Bar({ value, max, color, bg = 'bg-[#241c14]' }: { value: number; max: number; color: string; bg?: string }) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100))
  return (
    <div className={`h-2 w-full overflow-hidden rounded-sm border border-[#3a2e20] ${bg}`}>
      <div className={`h-full ${color} transition-[width] duration-200`} style={{ width: `${pct}%` }} />
    </div>
  )
}

function PartyFrame({
  p,
  compact = false,
}: {
  p: { eid: number; id: string; name: string; role: string; hp: number; maxHp: number; alive: boolean; stance: string; approval: number; abilities: Array<{ id: string; name: string; icon: string; cd: number; cdMax: number }> }
  compact?: boolean
}) {
  const engine = getEngine()
  const isPlayer = p.id === 'player'
  const trusted = p.approval >= 60 // порог парных приёмов (Фаза 4)
  return (
    <div
      className={`pointer-events-auto rounded border border-[#5a4632]/80 bg-[#181410]/85 p-2 backdrop-blur-sm ${
        // v2.2: карточка игрока шире — «Смертник» не режется до «См...» (w-32 было тесно)
        compact ? (isPlayer ? 'w-44' : 'w-36') : 'w-44 sm:w-56'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${p.alive ? 'border-[#d9a441]/60 bg-[#241c14]' : 'border-[#c94f3d] bg-[#c94f3d]/20 text-[#e08a6b]'}`}>
            {isPlayer ? <User className="h-4 w-4 text-[#d9a441]" /> : <GameIcon name={p.id === 'kaya' ? 'Sparkles' : 'ShieldHalf'} className="h-4 w-4 text-[#9fb8a4]" />}
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-[#e8d5a8]">{p.name}</p>
            {!compact && (
              <p className="truncate text-[10px] text-[#8a8068]">
                {isPlayer ? p.role : t(STANCE_LABEL[p.stance] ?? '')}
              </p>
            )}
          </div>
        </div>
        <span className="shrink-0 text-[10px] tabular-nums text-[#9a8f78]">
          {p.hp}/{p.maxHp}
        </span>
      </div>
      <div className="mt-1.5">
        <Bar value={p.hp} max={p.maxHp} color={p.alive ? (isPlayer ? 'bg-[#8fbf7f]' : 'bg-[#7a9a6a]') : 'bg-[#c94f3d]'} />
      </div>
      {/* Фаза 4: одобрение компаньона — при ≥60 открываются парные приёмы (в компакт-режиме скрыто) */}
      {!isPlayer && !compact && (
        <div className="mt-1 flex items-center gap-1.5" title={trusted ? t('Доверие высоко — парные приёмы доступны') : t('Доверие растёт от боёв и квестов. При 60 — парные приёмы')}>
          <Heart className={`h-2.5 w-2.5 shrink-0 ${trusted ? 'text-[#e08a6b]' : 'text-[#6a5f4a]'}`} />
          <div className="h-1 w-full overflow-hidden rounded-sm bg-[#241c14]">
            <div
              className={`h-full transition-[width] duration-300 ${trusted ? 'bg-[#d9a441]' : 'bg-[#6a5f4a]'}`}
              style={{ width: `${Math.max(0, Math.min(100, p.approval))}%` }}
            />
          </div>
          <span className={`shrink-0 text-[9px] tabular-nums ${trusted ? 'text-[#f5c96b]' : 'text-[#8a8068]'}`}>{p.approval}</span>
        </div>
      )}
      {!isPlayer && !compact && (
        <div className="mt-1.5 flex items-center gap-1">
          <button
            onClick={() => engine?.setStance(p.eid)}
            className="rounded border border-[#3a2e20] bg-[#241c14] px-2 py-0.5 text-[10px] text-[#cfc0a0] transition hover:border-[#d9a441] hover:text-[#f5c96b]"
            title={t('Сменить приказ')}
          >
            {t('Приказ: {x}', { x: t(STANCE_LABEL[p.stance] ?? '') })}
          </button>
          {p.abilities.map((a) => {
            const cdPct = a.cdMax > 0 ? (a.cd / a.cdMax) * 100 : 0
            return (
              <button
                key={a.id}
                onClick={() => engine?.castCompanionAbility(p.eid, a.id, null)}
                disabled={a.cd > 0 || !p.alive}
                className="relative h-7 w-7 overflow-hidden rounded border border-[#3a2e20] bg-[#241c14] text-[#cfc0a0] transition hover:border-[#d9a441] disabled:opacity-60"
                title={`${a.name}${a.cd > 0 ? t(' — откат {s}с', { s: a.cd.toFixed(1) }) : ''}`}
              >
                <GameIcon name={a.icon} className="mx-auto h-4 w-4" />
                {a.cd > 0 && (
                  <span className="absolute inset-x-0 bottom-0 bg-black/70" style={{ height: `${cdPct}%` }} />
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function Hud() {
  useLocale() // v1.6: перерисовка при переключении языка
  const party = useGame((s) => s.party)
  const player = useGame((s) => s.player)
  const abilities = useGame((s) => s.abilities)
  const trackerQuest = useGame((s) => s.trackerQuest)
  const contractQuest = useGame((s) => s.contractQuest)
  const toasts = useGame((s) => s.toasts)
  const clearToast = useGame((s) => s.clearToast)
  const areaToast = useGame((s) => s.areaToast)
  const bossBar = useGame((s) => s.bossBar)
  const paused = useGame((s) => s.paused)
  const interactHint = useGame((s) => s.interactHint)
  const oil = useGame((s) => s.oil)
  const daytime = useGame((s) => s.daytime)
  const zoneLabel = useGame((s) => s.zoneLabel)
  const formation = useGame((s) => s.formation)
  const shouts = useGame((s) => s.shouts)
  const siege = useGame((s) => s.siege)
  const assault = useGame((s) => s.assault)
  const raid = useGame((s) => s.raid)
  const touchUi = useGame((s) => s.touchUi) // v2.0: сенсорные контролы активны
  const effQuality = useGame((s) => s.effQuality) // v2.2: FPS-чип
  const fps = useGame((s) => s.fps)
  const tutorial = useGame((s) => s.tutorial) // v2.3: подсказка обучения
  const miniRef = useRef<HTMLCanvasElement | null>(null)
  const [muted, setMutedUi] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false) // v2.1: шторка меню
  const [trackerOpen, setTrackerOpen] = useState(false) // v2.2: свёрнутый трекер в таче
  const [fsOn, fsToggle, fsSupported] = useFullscreen()

  useEffect(() => {
    const engine = getEngine()
    if (engine && miniRef.current) engine.attachMinimap(miniRef.current)
  }, [])

  // автоудаление тостов
  useEffect(() => {
    if (toasts.length === 0) return
    const timers = toasts.map((t) => setTimeout(() => clearToast(t.id), 3600))
    return () => timers.forEach(clearTimeout)
  }, [toasts, clearToast])

  // плашка области
  useEffect(() => {
    if (!areaToast) return
    const t = setTimeout(() => useGame.getState().patch({ areaToast: null }), 2400)
    return () => clearTimeout(t)
  }, [areaToast])

  const xpPct = player ? Math.min(100, (player.xp / Math.max(1, player.xpNext)) * 100) : 0
  // Сутки (Фаза 3): рассвет 0.25, закат 0.75
  const isDay = daytime > 0.23 && daytime < 0.77

  return (
    <div className="pointer-events-none absolute inset-0 select-none font-sans text-[#e8d5a8]">
      {/* Отряд слева сверху (v2.1: в тач-режиме — компактные рамки, не спорятся с меню;
          v2.2: под ними FPS-чип — игрок видит, что даёт пресет «Мобильное») */}
      <div className="absolute left-3 top-3 flex flex-col gap-2" style={{ marginTop: 'env(safe-area-inset-top, 0px)' }}>
        {party.map((p) => (
          <PartyFrame key={p.eid} p={p} compact={touchUi} />
        ))}
        {touchUi && (
          <p data-hud-fps className="w-fit rounded bg-[#181410]/70 px-1.5 py-0.5 text-[9px] tabular-nums text-[#8a8068] backdrop-blur-sm">
            {fps} FPS · {t(QUALITY_NAME[effQuality])}
          </p>
        )}
      </div>

      {/* Миникарта и трекер справа сверху (v2.0: на узких экранах — уже;
          v2.2: safe-area — в полноэкранном режиме блок не уходит под вырез) */}
      <div
        className={`absolute right-3 top-3 flex flex-col gap-2 ${touchUi ? 'w-36' : 'w-44 sm:w-56'}`}
        style={{ marginTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="pointer-events-auto overflow-hidden rounded border border-[#5a4632]/80 bg-[#181410]/85 p-1 backdrop-blur-sm">
          <canvas ref={miniRef} data-minimap width={214} height={160} className="h-auto w-full rounded-sm" />
          <div className="mt-1 flex items-center justify-between px-1 pb-0.5">
            <span className="flex items-center gap-1.5">
              {isDay ? <Sun className="h-3.5 w-3.5 text-[#d9a441]" /> : <Moon className="h-3.5 w-3.5 text-[#8a9a88]" />}
              <span className="text-[10px] tracking-widest text-[#8a8068]">{zoneLabel}</span>
            </span>
            <button
              onClick={() => getEngine()?.openPanel('map')}
              className="text-[#9a8f78] transition hover:text-[#d9a441]"
              title={t('Полная карта [M]')}
            >
              <Map className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        {(trackerQuest || contractQuest) &&
          (touchUi ? (
            // v2.2: трекер в таче свёрнут в одну строку — правый кластер действий
            // больше не наезжает на него; тап разворачивает полный текст
            <div data-hud-tracker className="pointer-events-auto rounded border border-[#5a4632]/80 bg-[#181410]/85 p-2 backdrop-blur-sm">
              <button
                onClick={() => setTrackerOpen((v) => !v)}
                aria-expanded={trackerOpen}
                className="flex w-full touch-none items-center justify-between gap-1 text-left"
              >
                <span className="truncate text-[11px] font-semibold text-[#f5c96b]">
                  {trackerQuest?.name ?? contractQuest?.name}
                </span>
                <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-[#8a8068] transition ${trackerOpen ? 'rotate-180' : ''}`} />
              </button>
              {trackerOpen && (
                <div
                  onClick={() => getEngine()?.openPanel('journal')}
                  title={t('Открыть журнал [J]')}
                  className="mt-1.5 cursor-pointer border-t border-[#3a2e20] pt-1.5"
                >
                  {trackerQuest && (
                    <div>
                      <p className="text-[11px] font-semibold text-[#f5c96b]">{trackerQuest.name}</p>
                      <p className="mt-0.5 text-[11px] leading-snug text-[#cfc0a0]">
                        {trackerQuest.stage === 2 ? `${trackerQuest.stageText} (${trackerQuest.counter}/4)` : trackerQuest.stageText}
                      </p>
                    </div>
                  )}
                  {contractQuest && (
                    <div className={trackerQuest ? 'mt-2' : ''}>
                      <p className="text-[11px] font-semibold text-[#c9b06b]">{contractQuest.name}</p>
                      <p className="mt-0.5 text-[11px] leading-snug text-[#a89a7d]">
                        {contractQuest.counter > 0
                          ? `${contractQuest.stageText} (${contractQuest.counter}/${CONTRACT_TOTALS[contractQuest.id] ?? contractQuest.counter})`
                          : contractQuest.stageText}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div
              onClick={() => getEngine()?.openPanel('journal')}
              title={t('Открыть журнал [J]')}
              className="pointer-events-auto cursor-pointer rounded border border-[#5a4632]/80 bg-[#181410]/85 p-2 backdrop-blur-sm transition hover:border-[#d9a441]/80"
            >
              {trackerQuest && (
                <div>
                  <p className="text-[11px] font-semibold text-[#f5c96b]">{trackerQuest.name}</p>
                  <p className="mt-0.5 text-[11px] leading-snug text-[#cfc0a0]">
                    {trackerQuest.stage === 2 ? `${trackerQuest.stageText} (${trackerQuest.counter}/4)` : trackerQuest.stageText}
                  </p>
                </div>
              )}
              {contractQuest && (
                <div className={trackerQuest ? 'mt-2 border-t border-[#3a2e20] pt-2' : ''}>
                  <p className="text-[11px] font-semibold text-[#c9b06b]">{contractQuest.name}</p>
                  <p className="mt-0.5 text-[11px] leading-snug text-[#a89a7d]">
                    {contractQuest.counter > 0
                      ? `${contractQuest.stageText} (${contractQuest.counter}/${CONTRACT_TOTALS[contractQuest.id] ?? contractQuest.counter})`
                      : contractQuest.stageText}
                  </p>
                </div>
              )}
            </div>
          ))}
      </div>

      {/* v2.1: шторка меню — верх-центр в тач-режиме (нижний угол отдаётся контролам;
          раньше кнопки лежали под джойстиком и были недоступны).
          v2.2: рядом — постоянная кнопка полного экрана (не нужно искать в меню),
          панель шторки скроллится — на низких экранах все пункты доступны. */}
      {touchUi && (
        <div
          className="pointer-events-auto absolute left-1/2 top-3 z-20 -translate-x-1/2"
          style={{ marginTop: 'env(safe-area-inset-top, 0px)' }}
        >
          <div className="flex items-center gap-2">
            <button
              data-hud-menu
              onClick={() => setMenuOpen((v) => !v)}
              className="flex h-11 w-11 touch-none items-center justify-center rounded-full border border-[#5a4632] bg-[#181410]/85 text-[#cfc0a0] backdrop-blur-sm transition active:border-[#d9a441] active:text-[#f5c96b]"
              aria-label={t('Меню игры')}
              aria-expanded={menuOpen}
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">{t('Меню игры')}</span>
            </button>
            {fsSupported && (
              <button
                data-fullscreen
                onClick={() => fsToggle()}
                className="flex h-11 w-11 touch-none items-center justify-center rounded-full border border-[#5a4632] bg-[#181410]/85 text-[#cfc0a0] backdrop-blur-sm transition active:border-[#d9a441] active:text-[#f5c96b]"
                aria-label={fsOn ? t('Свернуть экран') : t('Полный экран')}
                title={fsOn ? t('Свернуть экран') : t('Полный экран')}
              >
                {fsOn ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
                <span className="sr-only">{fsOn ? t('Свернуть экран') : t('Полный экран')}</span>
              </button>
            )}
          </div>
          {menuOpen && (
            <div
              data-hud-menu-panel
              className="game-scroll absolute left-1/2 top-[52px] flex w-52 -translate-x-1/2 flex-col gap-1 overflow-y-auto overscroll-contain rounded border border-[#5a4632] bg-[#181410]/95 p-2 shadow-xl backdrop-blur-md"
              style={{
                maxHeight: 'calc(100dvh - 88px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))',
              }}
            >
              {([
                ['char', 'User', 'Персонаж [C]'],
                ['inv', 'Backpack', 'Инвентарь [I]'],
                ['journal', 'ScrollText', 'Журнал [J]'],
                ['map', 'Map', 'Карта [M]'],
              ] as const).map(([id, icon, title]) => (
                <button
                  key={id}
                  onClick={() => {
                    setMenuOpen(false)
                    getEngine()?.openPanel(id as 'char')
                  }}
                  className="flex h-11 shrink-0 items-center gap-3 rounded border border-transparent px-3 text-sm text-[#cfc0a0] transition hover:border-[#d9a441]/50 hover:bg-[#241c14] hover:text-[#f5c96b]"
                >
                  <GameIcon name={icon} className="h-4 w-4" />
                  {t(title)}
                </button>
              ))}
              <div className="my-0.5 h-px shrink-0 bg-[#3a2e20]" />
              <button
                onClick={() => {
                  setMenuOpen(false)
                  getEngine()?.openPanel('pause')
                }}
                className="flex h-11 shrink-0 items-center gap-3 rounded border border-transparent px-3 text-sm text-[#cfc0a0] transition hover:border-[#d9a441]/50 hover:bg-[#241c14] hover:text-[#f5c96b]"
              >
                <GameIcon name="Settings" className="h-4 w-4" />
                {t('Меню [Esc]')}
              </button>
              <button
                onClick={() => {
                  const next = !muted
                  setMuted(next)
                  setMutedUi(next)
                }}
                className="flex h-11 shrink-0 items-center gap-3 rounded border border-transparent px-3 text-sm text-[#cfc0a0] transition hover:border-[#d9a441]/50 hover:bg-[#241c14] hover:text-[#f5c96b]"
              >
                {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                {t('Звук')}
              </button>
              {fsSupported && (
                <button
                  data-fullscreen
                  onClick={() => fsToggle()}
                  className="flex h-11 shrink-0 items-center gap-3 rounded border border-transparent px-3 text-sm text-[#cfc0a0] transition hover:border-[#d9a441]/50 hover:bg-[#241c14] hover:text-[#f5c96b]"
                >
                  {fsOn ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  {fsOn ? t('Свернуть экран') : t('Полный экран')}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* v2.1: XP-лента — тонкая полоса по верхней кромке в тач-режиме */}
      {player && touchUi && (
        <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-[#241c14]/70" style={{ paddingTop: 0 }}>
          <div className="h-full bg-[#c9b06b]/80" style={{ width: `${xpPct}%` }} />
        </div>
      )}

      {/* Босс-бар (v2.1: в тач-режиме ниже шторки меню) */}
      {bossBar && (
        <div className={`absolute left-1/2 w-80 max-w-[70vw] -translate-x-1/2 ${touchUi ? 'top-16' : 'top-3'}`}>
          <p className="game-title-font text-center text-sm tracking-[0.3em] text-[#c9a3e8]">{bossBar.name}</p>
          <div className="mt-1">
            <Bar value={bossBar.hp} max={bossBar.maxHp} color="bg-[#a06bd9]" bg="bg-[#1a1220]" />
          </div>
        </div>
      )}

      {/* v2.3: подсказка обучения — верх-центр (в таче — под шторкой),
          прячется за босс-баром; крестик = шаг пройден */}
      {tutorial && !bossBar && !paused && (
        <div
          data-tutorial
          className={`pointer-events-auto absolute left-1/2 z-10 flex w-[min(92vw,30rem)] -translate-x-1/2 items-center gap-2 rounded border border-[#d9a441]/50 bg-[#181410]/92 px-3 py-1.5 shadow-lg backdrop-blur-md ${
            touchUi ? 'top-[64px]' : 'top-3'
          }`}
          style={{ marginTop: touchUi ? 'env(safe-area-inset-top, 0px)' : undefined }}
        >
          <GameIcon name="Sparkles" className="h-4 w-4 shrink-0 text-[#f5c96b]" />
          <p className="min-w-0 flex-1 text-[11px] leading-snug text-[#e8d5a8]">{tutorialText(tutorial.id as 'move', touchUi)}</p>
          <button
            onClick={() => completeTutorial(tutorial.id as 'move')}
            aria-label={t('Понятно')}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-[#8a8068] transition hover:text-[#f5c96b]"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Оборона Бастиона (Фаза 6.3): волна + прочность частокола (v2.1: выше тач-кластера) */}
      {siege && (
        <div className={`absolute left-1/2 w-72 -translate-x-1/2 rounded border border-[#c94f3d]/60 bg-[#181410]/90 px-3 py-2 backdrop-blur-sm ${touchUi ? 'bottom-52' : 'bottom-40'}`}>
          <p className="game-title-font text-center text-[11px] tracking-[0.25em] text-[#e08a6b]">
            {t('ОБОРОНА БАСТИОНА · ВОЛНА {a}/{b}', { a: Math.min(siege.wave + 1, siege.waves), b: siege.waves })}
          </p>
          <div className="mt-1.5">
            <Bar value={siege.gateHp} max={100} color="bg-[#d9a441]" bg="bg-[#241a10]" />
          </div>
          <p className="mt-1 text-center text-[10px] text-[#9a8f78]">
            {t('Частокол: {p}% — не дай мору его прогрызть', { p: Math.max(0, Math.ceil(siege.gateHp)) })}
          </p>
        </div>
      )}

      {/* Набег Орды (Фаза 6.4): волны мародёров идут к Роще */}
      {assault && (
        <div className={`absolute left-1/2 w-72 -translate-x-1/2 rounded border border-[#b0563a]/60 bg-[#181410]/90 px-3 py-2 backdrop-blur-sm ${touchUi ? 'bottom-52' : 'bottom-40'}`}>
          <p className="game-title-font text-center text-[11px] tracking-[0.25em] text-[#e08a6b]">
            {t('НАБЕГ ОРДЫ · ВОЛНА {a}/{b}', { a: Math.min(assault.wave + 1, assault.waves), b: assault.waves })}
          </p>
          <p className="mt-1 text-center text-[10px] text-[#9a8f78]">
            {t('Не пропусти мародёров к сердцу Рощи — Space для приказов')}
          </p>
        </div>
      )}

      {/* Рейд в Сердце Разлома (Фаза 7): 4 волны эха + роли отряда */}
      {raid && (
        <div className={`absolute left-1/2 w-72 -translate-x-1/2 rounded border border-[#a06bd9]/60 bg-[#181410]/90 px-3 py-2 backdrop-blur-sm ${touchUi ? 'bottom-52' : 'bottom-40'}`}>
          <p className="game-title-font text-center text-[11px] tracking-[0.25em] text-[#c9a3e8]">
            {t('РЕЙД · ВОЛНА {a}/{b}', { a: Math.min(raid.wave + 1, raid.waves), b: raid.waves })}
          </p>
          <p className="mt-1 text-center text-[10px] text-[#9a8f78]">
            {t('Торвальд — авангард, Кайя — артиллерия. Держите сердце Разлома')}
          </p>
        </div>
      )}

      {/* Тосты (v2.3: слева, компактные — стиль «Ведьмак 3»: без крестиков,
          автоудаление; раньше крупный столбец в центре заслонял обзор и
          наезжал на плашку зоны «СУМРАЧНЫЙ ЛЕС») */}
      <div className="absolute left-3 top-1/2 flex w-52 -translate-y-1/2 flex-col gap-1 sm:w-60">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-none flex items-start gap-1.5 rounded-sm border-l-2 bg-[#181410]/80 py-1 pl-2 pr-1.5 text-[11px] leading-snug shadow-md backdrop-blur-sm ${
              t.kind === 'quest'
                ? 'border-[#d9a441] text-[#f5c96b]'
                : t.kind === 'level'
                  ? 'border-[#f5c96b] text-[#ffe4a0]'
                  : t.kind === 'warn'
                    ? 'border-[#c94f3d] text-[#e08a6b]'
                    : t.kind === 'loot'
                      ? 'border-[#c9b06b] text-[#c9b06b]'
                      : 'border-[#5a4632] text-[#cfc0a0]'
            }`}
          >
            {t.kind === 'quest' && <ScrollText className="mt-0.5 h-3 w-3 shrink-0" />}
            {t.kind === 'level' && <GameIcon name="Sparkles" className="mt-0.5 h-3 w-3 shrink-0" />}
            {t.kind === 'warn' && <Heart className="mt-0.5 h-3 w-3 shrink-0" />}
            {t.kind === 'loot' && <GameIcon name="Gem" className="mt-0.5 h-3 w-3 shrink-0" />}
            <span className="min-w-0">{t.text}</span>
          </div>
        ))}
      </div>

      {/* Плашка области */}
      {areaToast && (
        <div key={areaToast.id} className="absolute left-1/2 top-1/4 -translate-x-1/2 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
          <p className="game-title-font text-3xl font-semibold tracking-[0.35em] text-[#f5e6c4] drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]">
            {areaToast.name.toUpperCase()}
          </p>
          <div className="mx-auto mt-2 h-px w-40 bg-gradient-to-r from-transparent via-[#d9a441] to-transparent" />
        </div>
      )}

      {/* Тактическая пауза (Фаза 4): приказы DAO-lite */}
      {paused && (
        <>
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <p className="game-title-font rounded border border-[#d9a441]/70 bg-[#181410]/90 px-6 py-2 text-xl tracking-[0.4em] text-[#f5c96b]">
              {t('ТАКТИЧЕСКАЯ ПАУЗА')}
            </p>
          </div>
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 rounded border border-[#5a4632]/70 bg-[#181410]/90 px-4 py-2 text-center backdrop-blur-sm">
            <p className="text-[11px] leading-relaxed text-[#cfc0a0]">
              {touchUi ? (
                <>
                  <span className="text-[#f5c96b]">{t('Тап по компаньону')}</span> — {t('выбрать')} ·{' '}
                  <span className="text-[#f5c96b]">{t('тап по земле')}</span> — {t('приказ движения')} ·{' '}
                  <span className="text-[#f5c96b]">{t('тап по врагу')}</span> — {t('цель отряда')}
                </>
              ) : (
                <>
                  <span className="text-[#f5c96b]">{t('ЛКМ по компаньону')}</span> — {t('выбрать')} ·{' '}
                  <span className="text-[#f5c96b]">{t('ЛКМ по земле')}</span> — {t('приказ движения')} ·{' '}
                  <span className="text-[#f5c96b]">{t('ЛКМ по врагу')}</span> — {t('цель отряда')}
                </>
              )}
            </p>
            <p className="mt-0.5 text-[10px] text-[#8a8068]">
              <span className="text-[#f5c96b]">V</span> {t('— строй:')} {t(formation === 'wedge' ? 'клин' : 'линия')} ·{' '}
              <span className="text-[#f5c96b]">Tab</span> {t('— цель')} ·{' '}
              <span className="text-[#f5c96b]">Пробел</span> {t('— отпустить мир')}
            </p>
          </div>
        </>
      )}

      {/* Подсказка взаимодействия (v2.3: на таче — крупная кликабельная карточка
          с иконкой руки вместо мелкого текста «… — [F]»: читается и нажимается) */}
      {interactHint && !paused && (
        touchUi ? (
          <button
            data-touch-interact-hint
            onPointerDown={(e) => {
              e.preventDefault()
              e.stopPropagation()
              const eng = getEngine()
              if (eng) triggerAction(eng, 'interact')
            }}
            className="pointer-events-auto absolute bottom-44 right-3 flex max-w-[70%] touch-none items-center gap-2.5 rounded-lg border border-[#f5c96b]/80 bg-[#181410]/95 py-2.5 pl-2.5 pr-4 text-left shadow-[0_0_20px_rgba(217,164,65,0.4)] backdrop-blur-md"
            style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
          >
            <span className="flex h-10 w-10 shrink-0 animate-pulse items-center justify-center rounded-full border border-[#d9a441]/70 bg-[#2a2010] text-[#f5c96b]">
              <Hand className="h-5 w-5" />
            </span>
            <span className="min-w-0 text-xs font-semibold leading-snug text-[#f5c96b]">{interactHint}</span>
          </button>
        ) : (
          <div className="absolute bottom-28 left-1/2 -translate-x-1/2">
            <p className="rounded border border-[#d9a441]/50 bg-[#181410]/90 px-3 py-1 text-xs text-[#f5c96b]">{interactHint}</p>
          </div>
        )
      )}

      {/* Меню слева снизу (v2.1: только для мыши — в тач-режиме шторка сверху,
          нижние углы целиком отданы джойстику и кластеру действий) */}
      {!touchUi && (
        <div className="pointer-events-auto absolute bottom-3 left-3 flex flex-col gap-2" style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          <div className="flex gap-1.5">
            {[
              { id: 'char', label: 'C', icon: 'User', title: 'Персонаж [C]' },
              { id: 'inv', label: 'I', icon: 'Backpack', title: 'Инвентарь [I]' },
              { id: 'journal', label: 'J', icon: 'ScrollText', title: 'Журнал [J]' },
              { id: 'map', label: 'M', icon: 'Map', title: 'Карта [M]' },
            ].map((b) => (
              <button
                key={b.id}
                onClick={() => getEngine()?.openPanel(b.id as 'char')}
                title={t(b.title)}
                className="flex h-9 w-9 items-center justify-center rounded border border-[#5a4632] bg-[#181410]/85 text-[#cfc0a0] backdrop-blur-sm transition hover:border-[#d9a441] hover:text-[#f5c96b]"
              >
                <GameIcon name={b.icon} className="h-4 w-4" />
                <span className="sr-only">{t(b.title)}</span>
              </button>
            ))}
            <button
              onClick={() => getEngine()?.openPanel('pause')}
              title={t('Меню [Esc]')}
              className="flex h-9 w-9 items-center justify-center rounded border border-[#5a4632] bg-[#181410]/85 text-[#cfc0a0] backdrop-blur-sm transition hover:border-[#d9a441] hover:text-[#f5c96b]"
            >
              <GameIcon name="Settings" className="h-4 w-4" />
              <span className="sr-only">{t('Меню')}</span>
            </button>
            <button
              onClick={() => {
                const next = !muted
                setMuted(next)
                setMutedUi(next)
              }}
              title={t('Звук')}
              className="flex h-9 w-9 items-center justify-center rounded border border-[#5a4632] bg-[#181410]/85 text-[#cfc0a0] backdrop-blur-sm transition hover:border-[#d9a441]"
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              <span className="sr-only">{t('Звук')}</span>
            </button>
          </div>
        </div>
      )}

      {/* Панель умений снизу по центру (v2.0: в тач-режиме бар заменяют сенсорные кнопки) */}
      {player && !touchUi && (
        <div className="pointer-events-auto absolute bottom-3 left-1/2 -translate-x-1/2">
          <div className="flex items-end gap-1.5 rounded border border-[#5a4632]/70 bg-[#181410]/85 p-2 backdrop-blur-sm">
            {/* Фаза 6.2: крики Ту'ум (R/T) — слева от бара умений */}
            {shouts.map((sh) => {
              const cdPct = sh.cdMax > 0 ? (sh.cd / sh.cdMax) * 100 : 0
              const open = sh.lv > 0
              return (
                <button
                  key={sh.id}
                  onClick={() => getEngine()?.castAbility(sh.id)}
                  disabled={!open || sh.cd > 0}
                  className={`relative h-12 w-12 overflow-hidden rounded border ${
                    open
                      ? 'border-[#f5c96b]/50 bg-[#1c1a10]'
                      : 'border-[#3a2e20] bg-[#181410] opacity-40'
                  }`}
                  title={
                    open
                      ? t('{name} [{hotkey}] — слово «{word}» {lv}{cd}', {
                          name: sh.name,
                          hotkey: sh.hotkey,
                          word: sh.word,
                          lv: sh.lv >= 2 ? 'II' : 'I',
                          cd: sh.cd > 0 ? t(' — откат {s}с', { s: sh.cd.toFixed(1) }) : '',
                        })
                      : t('{name} — слово не открыто. Ищи Стены Слов в Стылом Пределье.', { name: sh.name })
                  }
                >
                  {sh.id === 'shout_force' ? (
                    <Wind className="mx-auto mt-2 h-6 w-6 text-[#f5c96b]" />
                  ) : (
                    <Snowflake className="mx-auto mt-2 h-6 w-6 text-[#bfe3ea]" />
                  )}
                  <span className="absolute left-1 top-0.5 text-[9px] font-bold text-[#d9a441]">{sh.hotkey}</span>
                  {open && (
                    <span className="absolute bottom-0.5 left-1 text-[8px] font-bold text-[#f5c96b]">
                      {sh.lv >= 2 ? 'II' : 'I'}
                    </span>
                  )}
                  {sh.cd > 0 && (
                    <>
                      <span className="absolute inset-x-0 bottom-0 bg-black/70" style={{ height: `${cdPct}%` }} />
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
                        {sh.cd.toFixed(0)}
                      </span>
                    </>
                  )}
                  {!open && (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <Shield className="h-4 w-4 text-[#8a8068]" />
                    </span>
                  )}
                </button>
              )
            })}
            <div className="mx-0.5 h-10 w-px bg-[#3a2e20]" />
            {abilities.map((a) => {
              const cdPct = a.cdMax > 0 ? (a.cd / a.cdMax) * 100 : 0
              return (
                <button
                  key={a.id}
                  onClick={() => getEngine()?.castAbility(a.id)}
                  disabled={!a.unlocked || a.cd > 0}
                  className={`ability-slot group relative h-12 w-12 overflow-hidden rounded ${!a.unlocked ? 'opacity-40' : ''}`}
                  title={t('{name} [{hotkey}]{stam}\n{desc}', {
                    name: a.name,
                    hotkey: a.hotkey,
                    stam: a.staminaCost ? t(' — {n} ОВ', { n: a.staminaCost }) : '',
                    desc: a.desc,
                  })}
                >
                  <GameIcon name={a.icon} className="mx-auto mt-2 h-6 w-6 text-[#e8d5a8]" />
                  <span className="absolute left-1 top-0.5 text-[9px] font-bold text-[#d9a441]">{a.hotkey}</span>
                  {a.staminaCost > 0 && (
                    <span className="absolute bottom-0.5 right-1 text-[8px] text-[#9a8f78]">{a.staminaCost}</span>
                  )}
                  {a.cd > 0 && (
                    <>
                      <span className="absolute inset-x-0 bottom-0 bg-black/70" style={{ height: `${cdPct}%` }} />
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
                        {a.cd.toFixed(0)}
                      </span>
                    </>
                  )}
                  {!a.unlocked && (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <Shield className="h-4 w-4 text-[#8a8068]" />
                    </span>
                  )}
                </button>
              )
            })}
          </div>
          {/* Масло на клинке (Фаза 3) */}
          {oil && (
            <div className="mx-auto mb-1 flex w-fit items-center gap-1.5 rounded border border-[#d9a441]/50 bg-[#181410]/90 px-2 py-0.5">
              <GameIcon name="Droplets" className="h-3 w-3 text-[#d9a441]" />
              <span className="text-[10px] text-[#f5c96b]">{oil.name}</span>
              <span className="text-[10px] tabular-nums text-[#9a8f78]">{t('{s}с', { s: oil.remain })}</span>
            </div>
          )}
          {/* XP полоска (мышь) */}
          <div className="mx-auto mt-1 w-72">
            <div className="h-1 overflow-hidden rounded-full bg-[#241c14]">
              <div className="h-full bg-[#c9b06b]/80" style={{ width: `${xpPct}%` }} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
