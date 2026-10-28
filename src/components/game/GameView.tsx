'use client'

import { useEffect, useRef } from 'react'
import { createEngine, getEngine } from '@/lib/game/engine'
import { boot, readRenderMode, readSave, useGame } from '@/lib/game/store'
import { initTutorial } from '@/lib/game/systems/tutorial'
import { t, useLocale } from '@/lib/game/i18n'
import Hud from './Hud'
import DialogueOverlay from './DialogueOverlay'
import Panels from './Panels'
import TouchControls from './TouchControls'

export default function GameView() {
  useLocale() // v1.6: перерисовка при переключении языка
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const canvas3dRef = useRef<HTMLCanvasElement | null>(null)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const screen = useGame((s) => s.screen)
  const renderMode = useGame((s) => s.renderMode)
  const zoneFade = useGame((s) => s.zoneFade)

  useEffect(() => {
    if (screen !== 'game') return
    initTutorial() // v2.3: обучение — прогресс + подписки на стор
    const canvas = canvasRef.current
    if (!canvas) return
    const save = boot.mode === 'continue' ? readSave() : null
    const mode = readRenderMode()
    useGame.getState().patch({ renderMode: mode })
    const engine = createEngine(canvas, save, { canvas3d: canvas3dRef.current, mode, origin: boot.origin })
    const onResize = () => engine.resize()
    window.addEventListener('resize', onResize)
    // v2.2: смена вьюпорта при входе/выходе из полного экрана, повороте телефона
    // и коллапсе адресной строки Android (visualViewport) — канвас не «буксует»
    // со старым размером (чёрные поля/обрезанный кадр после fullscreen)
    const onFsChange = () => setTimeout(onResize, 60) // ждём применения нового вьюпорта
    document.addEventListener('fullscreenchange', onFsChange)
    document.addEventListener('webkitfullscreenchange', onFsChange)
    window.addEventListener('orientationchange', onFsChange)
    window.visualViewport?.addEventListener('resize', onResize)
    // миникарта рендерится в HUD (дочерний эффект уже отработал)
    engine.attachMinimap(wrapRef.current?.querySelector('[data-minimap]') as HTMLCanvasElement | null)
    engine.start()
    const ro = new ResizeObserver(onResize)
    if (wrapRef.current) ro.observe(wrapRef.current)
    return () => {
      window.removeEventListener('resize', onResize)
      document.removeEventListener('fullscreenchange', onFsChange)
      document.removeEventListener('webkitfullscreenchange', onFsChange)
      window.removeEventListener('orientationchange', onFsChange)
      window.visualViewport?.removeEventListener('resize', onResize)
      ro.disconnect()
      const e = getEngine()
      if (e) e.destroy()
    }
  }, [screen])

  // Переключение режима рендера на живую игру
  useEffect(() => {
    if (screen !== 'game') return
    const e = getEngine()
    if (!e) return
    e.setRenderMode(renderMode)
    const id = requestAnimationFrame(() => e.resize())
    return () => cancelAnimationFrame(id)
  }, [renderMode, screen])

  if (screen !== 'game') return null

  const is3d = renderMode === '3d'

  return (
    // v2.2: h-dvh вместо h-screen — 100vh на Android не сжимается адресной строкой,
    // из-за чего нижняя часть игры уходила под браузерный UI
    <div ref={wrapRef} className="relative h-dvh w-screen overflow-hidden bg-[#12100c]">
      <canvas
        ref={canvas3dRef}
        className={`absolute inset-0 h-full w-full touch-none ${is3d ? 'block cursor-crosshair' : 'hidden'}`}
        aria-label={t('Трёхмерный мир Эха Разлома')}
      />
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 h-full w-full touch-none ${is3d ? 'hidden' : 'block cursor-crosshair'}`}
        aria-label={t('Игровое поле Эха Разлома')}
      />
      <Hud />
      <DialogueOverlay />
      <Panels />
      {/* v2.0: сенсорное управление (сам скрывается по настройке/устройству) */}
      <TouchControls />
      {/* Переход через Врата Тумана (Фаза 3): затемнение с названием зоны */}
      {zoneFade && (
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-0 z-50 flex flex-col items-center justify-center bg-black transition-opacity duration-700 ${
            zoneFade.phase === 'out' ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <p className="game-title-font text-4xl tracking-[0.4em] text-[#9ad0a8]/90">{zoneFade.label.toUpperCase()}</p>
          <div className="mt-4 h-px w-56 bg-gradient-to-r from-transparent via-[#9ad0a8]/70 to-transparent" />
          <p className="mt-3 text-xs tracking-widest text-[#6a7a68]">{t('ТУМАН ЧАСТИТ ПУТЬ...')}</p>
        </div>
      )}
    </div>
  )
}
