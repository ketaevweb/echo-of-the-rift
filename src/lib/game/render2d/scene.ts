// ============================================================
// ЭХО РАЗЛОМА — сборка кадра (Phase 0.8)
// drawScene: композиция кадра 2D-рендера (террейн, пропсы,
// травы-интерактивы, телеграф слэма босса, сущности, частицы,
// текст, виньетка, красная пелена смерти). Движок только
// передаёт снимок состояния (SceneView).
// ============================================================

import { INTERACTABLES } from '../data/world'
import { Entity, Floater, Particle, PropDef, Telegraph, Vec } from '../types'
import { rndRange } from '../core/util'
import { IRenderer } from './types'

export interface SceneView {
  ctx: CanvasRenderingContext2D
  renderer: IRenderer
  w: number
  h: number
  dpr: number
  camera: Vec
  shake: number
  time: number
  baked: HTMLCanvasElement
  props: PropDef[]
  removedProps: Set<string>
  entities: Entity[]
  targetEid: number | null
  particles: Particle[]
  floaters: Floater[]
  telegraphs: Telegraph[]
  playerAlive: boolean
}

export function drawScene(v: SceneView) {
  const ctx = v.ctx
  const w = v.w
  const h = v.h
  ctx.setTransform(v.dpr, 0, 0, v.dpr, 0, 0)
  ctx.fillStyle = '#1a2014'
  ctx.fillRect(0, 0, w, h)
  const shakeX = v.shake > 0 ? rndRange(-v.shake, v.shake) : 0
  const shakeY = v.shake > 0 ? rndRange(-v.shake, v.shake) : 0
  ctx.save()
  ctx.translate(Math.round(w / 2 - v.camera.x + shakeX), Math.round(h / 2 - v.camera.y + shakeY))
  ctx.drawImage(v.baked, 0, 0)
  for (const p of v.props) {
    if (p.id && v.removedProps.has(p.id)) continue
    v.renderer.drawProp(ctx, p, v.time)
  }
  // травы-интерактивы (визуал)
  for (const it of INTERACTABLES) {
    if (it.kind !== 'herb' || v.removedProps.has(it.id)) continue
    const pulse = 0.5 + 0.5 * Math.sin(v.time * 2.5 + it.pos.x)
    ctx.fillStyle = `rgba(200,230,190,${0.35 + pulse * 0.3})`
    ctx.beginPath()
    ctx.arc(it.pos.x, it.pos.y - 8, 5 + pulse * 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#9fb8a4'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(it.pos.x, it.pos.y)
    ctx.lineTo(it.pos.x, it.pos.y - 10)
    ctx.moveTo(it.pos.x, it.pos.y - 5)
    ctx.lineTo(it.pos.x - 5, it.pos.y - 11)
    ctx.moveTo(it.pos.x, it.pos.y - 5)
    ctx.lineTo(it.pos.x + 5, it.pos.y - 11)
    ctx.stroke()
  }
  // Телеграфы АоЕ (Фаза 2): круг/конус/коридор с пульсацией
  for (const t of v.telegraphs) {
    const a = 0.1 + 0.12 * (0.5 + 0.5 * Math.sin(v.time * 13))
    ctx.fillStyle = t.color
    ctx.globalAlpha = a
    if (t.shape === 'circle') {
      const r = t.radius * (1.06 - (1 - t.life / t.maxLife) * 0.06)
      ctx.beginPath()
      ctx.arc(t.x, t.y, r, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = Math.min(1, a + 0.25)
      ctx.strokeStyle = t.color
      ctx.lineWidth = 3
      ctx.stroke()
    } else if (t.shape === 'cone') {
      ctx.beginPath()
      ctx.moveTo(t.x, t.y)
      ctx.arc(t.x, t.y, t.radius, t.facing - t.width, t.facing + t.width)
      ctx.closePath()
      ctx.fill()
    } else {
      ctx.save()
      ctx.translate(t.x, t.y)
      ctx.rotate(t.facing)
      ctx.fillRect(0, -t.width, t.radius, t.width * 2)
      ctx.restore()
    }
    ctx.globalAlpha = 1
  }
  const sorted = [...v.entities].sort((a, b) => a.pos.y - b.pos.y)
  for (const e of sorted) {
    v.renderer.drawEntity(ctx, e, v.time, v.targetEid === e.eid)
  }
  v.renderer.drawParticles(ctx, v.particles)
  v.renderer.drawFloaters(ctx, v.floaters)
  ctx.restore()
  const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.45, w / 2, h / 2, Math.max(w, h) * 0.75)
  vg.addColorStop(0, 'rgba(0,0,0,0)')
  vg.addColorStop(1, 'rgba(10,8,5,0.55)')
  ctx.fillStyle = vg
  ctx.fillRect(0, 0, w, h)
  if (!v.playerAlive) {
    ctx.fillStyle = 'rgba(60,10,10,0.5)'
    ctx.fillRect(0, 0, w, h)
  }
}
