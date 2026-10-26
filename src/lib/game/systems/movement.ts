// ============================================================
// ЭХО РАЗЛОМА — система движения (Phase 0.7)
// moveWithCollisions (с коллайдерами и отбросом kb),
// separate (расталкивание сущностей), updatePlayer
// (WASD/клик-движение, автопатака по цели, стамина).
// ============================================================

import { WORLD } from '../data/world'
import { Entity } from '../types'
import { EngineCtx } from '../core/ctx'
import { nearestEnemyOf } from '../core/entity'
import { meleeAttack } from './combat'

export function moveWithCollisions(ctx: EngineCtx, e: Entity, vx: number, vy: number, dt: number) {
  const kbi = ctx.kb.get(e.eid)
  let nx = e.pos.x + (vx + (kbi?.x ?? 0)) * dt
  let ny = e.pos.y + (vy + (kbi?.y ?? 0)) * dt
  if (kbi) {
    const decay = Math.pow(0.002, dt)
    kbi.x *= decay
    kbi.y *= decay
    if (Math.hypot(kbi.x, kbi.y) < 8) ctx.kb.delete(e.eid)
  }
  nx = Math.max(30, Math.min(WORLD.w - 30, nx))
  ny = Math.max(30, Math.min(WORLD.h - 30, ny))
  for (const c of ctx.colliders) {
    if (c.propId && ctx.removedProps.has(c.propId)) continue
    const dx = nx - c.x
    const dy = ny - c.y
    const dist = Math.hypot(dx, dy)
    const min = c.r + e.radius * 0.7
    if (dist < min && dist > 0.001) {
      nx = c.x + (dx / dist) * min
      ny = c.y + (dy / dist) * min
    }
  }
  e.pos.x = nx
  e.pos.y = ny
}

export function separate(ctx: EngineCtx) {
  const alive = ctx.entities.filter((e) => e.alive && e.kind !== 'npc')
  for (let i = 0; i < alive.length; i++) {
    for (let j = i + 1; j < alive.length; j++) {
      const a = alive[i]
      const b = alive[j]
      const dx = b.pos.x - a.pos.x
      const dy = b.pos.y - a.pos.y
      const dist = Math.hypot(dx, dy)
      const min = a.radius + b.radius
      if (dist < min && dist > 0.01) {
        const push = ((min - dist) / 2) * 0.6
        const ux = dx / dist
        const uy = dy / dist
        if (a.kind !== 'player') {
          a.pos.x -= ux * push
          a.pos.y -= uy * push
        }
        if (b.kind !== 'player') {
          b.pos.x += ux * push
          b.pos.y += uy * push
        }
      }
    }
  }
}

export function updatePlayer(ctx: EngineCtx, dt: number) {
  const p = ctx.player
  if (!p.alive) return
  let mx = 0
  let my = 0
  if (ctx.keys.has('w') || ctx.keys.has('arrowup') || ctx.keys.has('ц')) my -= 1
  if (ctx.keys.has('s') || ctx.keys.has('arrowdown') || ctx.keys.has('ы')) my += 1
  if (ctx.keys.has('a') || ctx.keys.has('arrowleft') || ctx.keys.has('ф')) mx -= 1
  if (ctx.keys.has('d') || ctx.keys.has('arrowright') || ctx.keys.has('в')) mx += 1
  const moving = mx !== 0 || my !== 0
  if (moving) {
    const l = Math.hypot(mx, my)
    p.vel = { x: (mx / l) * p.speed, y: (my / l) * p.speed }
    p.dest = null
  } else if (p.dest) {
    const dx = p.dest.x - p.pos.x
    const dy = p.dest.y - p.pos.y
    const dist = Math.hypot(dx, dy)
    if (dist < 8) p.dest = null
    else p.vel = { x: (dx / dist) * p.speed, y: (dy / dist) * p.speed }
  } else {
    p.vel = { x: 0, y: 0 }
  }
  const target = ctx.targetEid ? ctx.entities.find((e) => e.eid === ctx.targetEid) : null
  if (target && target.alive) {
    p.facing = Math.atan2(target.pos.y - p.pos.y, target.pos.x - p.pos.x)
    const dist = Math.hypot(target.pos.x - p.pos.x, target.pos.y - p.pos.y)
    if (dist > p.attackRange + target.radius * 0.6 && !moving) {
      p.dest = { ...target.pos }
    } else if (dist <= p.attackRange + target.radius * 0.6) {
      p.dest = null
      if (p.cds['atk'] <= 0) meleeAttack(ctx, p, target)
    }
  } else if (moving) {
    p.facing = Math.atan2(p.vel.y, p.vel.x)
  }
  moveWithCollisions(ctx, p, p.vel.x, p.vel.y, dt)
  p.walkPhase += dt * (Math.hypot(p.vel.x, p.vel.y) > 4 ? 1 : 0.2)
  const inCombat = nearestEnemyOf(ctx, p, 320) !== null
  ctx.stamina = Math.min(ctx.maxStamina, ctx.stamina + (inCombat ? 6 : 14) * dt)
}
