'use client'

import { useEffect, useRef } from 'react'
import { createEngine, getEngine } from '@/lib/game/engine'
import { boot, readSave, useGame } from '@/lib/game/store'
import Hud from './Hud'
import DialogueOverlay from './DialogueOverlay'
import Panels from './Panels'

export default function GameView() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const screen = useGame((s) => s.screen)

  useEffect(() => {
    if (screen !== 'game') return
    const canvas = canvasRef.current
    if (!canvas) return
    const save = boot.mode === 'continue' ? readSave() : null
    const engine = createEngine(canvas, save)
    const onResize = () => engine.resize()
    window.addEventListener('resize', onResize)
    // миникарта рендерится в HUD (дочерний эффект уже отработал)
    engine.attachMinimap(wrapRef.current?.querySelector('[data-minimap]') as HTMLCanvasElement | null)
    engine.start()
    const ro = new ResizeObserver(onResize)
    if (wrapRef.current) ro.observe(wrapRef.current)
    return () => {
      window.removeEventListener('resize', onResize)
      ro.disconnect()
      const e = getEngine()
      if (e) e.destroy()
    }
  }, [screen])

  if (screen !== 'game') return null

  return (
    <div ref={wrapRef} className="relative h-screen w-screen overflow-hidden bg-[#12100c]">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full cursor-crosshair touch-none"
        aria-label="Игровое поле Эха Разлома"
      />
      <Hud />
      <DialogueOverlay />
      <Panels />
    </div>
  )
}
