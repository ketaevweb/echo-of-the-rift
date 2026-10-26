// ============================================================
// ЭХО РАЗЛОМА — система боя (Phase 0.4: эффекты; 0.6: атаки/урон)
// Пока перенесены частицы и всплывающий текст:
// floater/ring/beam/coneParticles/updateParticles + tickCds.
// ============================================================

import { Entity, Particle, Vec } from '../types'
import { EngineCtx } from '../core/ctx'
import { rndRange } from '../core/util'

export function floater(ctx: EngineCtx, pos: Vec, text: string, color: string, size: number) {
  ctx.floaters.push({
    x: pos.x + rndRange(-6, 6),
    y: pos.y - 18,
    text,
    color,
    life: 1.1,
    maxLife: 1.1,
    size,
    vy: -34,
  })
  if (ctx.floaters.length > 40) ctx.floaters.shift()
}

export function ring(ctx: EngineCtx, pos: Vec, color: string, size: number, life: number, kind: Particle['kind'] = 'ring') {
  ctx.particles.push({ x: pos.x, y: pos.y, vx: 0, vy: 0, life, maxLife: life, size, color, kind })
}

export function beam(ctx: EngineCtx, a: Vec, b: Vec, color: string) {
  for (let i = 0; i <= 8; i++) {
    const t = i / 8
    ctx.particles.push({
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
      vx: rndRange(-10, 10),
      vy: rndRange(-10, 10),
      life: 0.25,
      maxLife: 0.25,
      size: 2.4,
      color,
      kind: 'spark',
    })
  }
}

export function coneParticles(ctx: EngineCtx, pos: Vec, facing: number, range: number, color: string) {
  for (let i = 0; i < 26; i++) {
    const a = facing + rndRange(-0.55, 0.55)
    const dist = rndRange(20, range)
    ctx.particles.push({
      x: pos.x + Math.cos(a) * dist * 0.3,
      y: pos.y + Math.sin(a) * dist * 0.3 - 6,
      vx: Math.cos(a) * dist * 2.4,
      vy: Math.sin(a) * dist * 2.4,
      life: rndRange(0.2, 0.42),
      maxLife: 0.42,
      size: rndRange(2.5, 5),
      color,
      kind: 'fire',
    })
  }
}

export function updateParticles(ctx: EngineCtx, dt: number) {
  for (const p of ctx.particles) {
    p.life -= dt
    p.x += p.vx * dt
    p.y += p.vy * dt
    if (p.kind === 'fire' || p.kind === 'spark') {
      p.vx *= 0.92
      p.vy *= 0.92
    }
  }
  ctx.particles = ctx.particles.filter((p) => p.life > 0)
  for (const f of ctx.floaters) {
    f.life -= dt
    f.y += f.vy * dt
    f.vy *= 0.95
  }
  ctx.floaters = ctx.floaters.filter((f) => f.life > 0)
}

export function tickCds(e: Entity, dt: number) {
  for (const k of Object.keys(e.cds)) {
    if (e.cds[k] > 0) e.cds[k] = Math.max(0, e.cds[k] - dt)
  }
  e.attackT = Math.max(0, e.attackT - dt)
  e.hitT = Math.max(0, e.hitT - dt)
  e.castT = Math.max(0, e.castT - dt)
}
