// ============================================================
// ЭХО РАЗЛОМА — система ИИ и спавна (Phase 0.6)
// Спавн: createPlayer/spawnWorld/spawnZoneEnemy/spawnUnique/
// spawnCompanion. ИИ: updateEnemy/bossLogic/summonHorrors,
// updateCompanion (ИИ спутников) + castCompanionAbility.
// ============================================================

import { ABILITY_MAP, ENEMY_STATS } from '../data/abilities'
import { ENEMY_NAME } from '../data/tables'
import { NPCS, PLAYER_SPAWN, SPAWN_ZONES, UNIQUE_SPAWNS } from '../data/world'
import { Entity, Stance, Vec } from '../types'
import { sfx } from '../sfx'
import { d, rndRange } from '../core/util'
import { EngineCtx } from '../core/ctx'
import { makeEntity, nearestEnemyOf, nearestParty } from '../core/entity'
import { playerAc, playerAtk } from './progression'
import { beam, damage, floater, meleeAttack, rangedAttack, ring } from './combat'
import { openDialogue } from './quest'

// ---------------- Инициализация/спавн ----------------

export function createPlayer(ctx: EngineCtx, pos: Vec) {
  ctx.player = makeEntity(ctx, {
    id: 'player',
    kind: 'player',
    name: 'Смотритель',
    pos: { ...pos },
    color: '#c46a2b',
    radius: 13,
    hp: ctx.hp,
    maxHp: ctx.maxHp,
    team: 'party',
    speed: 160,
    atkBonus: playerAtk(ctx).atkBonus,
    ac: playerAc(ctx),
    dmgDice: 1,
    dmgSides: 6,
    dmgMod: playerAtk(ctx).mod,
    attackCd: 0.9,
    attackRange: 52,
    aggroR: 0,
    leashR: 99999,
  })
  ctx.entities.push(ctx.player)
}

export function spawnWorld(ctx: EngineCtx) {
  for (const n of NPCS) {
    if (n.id === 'kaya' && ctx.companionIds.kaya) continue
    if (n.id === 'torvald_npc' && ctx.companionIds.torvald) continue
    ctx.entities.push(
      makeEntity(ctx, {
        id: n.id,
        kind: 'npc',
        name: n.name,
        role: n.role,
        pos: { ...n.pos },
        color: n.color,
        radius: 13,
        hp: 1,
        maxHp: 1,
        team: 'village',
        speed: 0,
        npc: n,
      }),
    )
  }
  for (const z of SPAWN_ZONES) {
    for (let i = 0; i < z.max; i++) spawnZoneEnemy(ctx, z)
  }
  for (const u of UNIQUE_SPAWNS) {
    if (u.enemy === 'alpha' && ctx.flags.alphaDead) continue
    if (u.enemy === 'captain' && ctx.flags.captainDead) continue
    if (u.enemy === 'boss' && ctx.flags.bossDead) continue
    spawnUnique(ctx, u.enemy, u.pos)
  }
  if (ctx.companionIds.kaya) spawnCompanion(ctx, 'kaya')
  if (ctx.companionIds.torvald) spawnCompanion(ctx, 'torvald')
  if (ctx.flags.gateOpen) {
    ctx.removedProps.add('barrier')
    ctx.removedProps.add('barrier2')
    ctx.removedProps.add('barrier3')
  }
  for (let i = 1; i <= 4; i++) {
    if (ctx.flags['herb_herb' + i]) ctx.removedProps.add('herb' + i)
  }
}

export function spawnZoneEnemy(ctx: EngineCtx, z: (typeof SPAWN_ZONES)[number]) {
  const st = ENEMY_STATS[z.enemy]
  const a = Math.random() * Math.PI * 2
  const rr = Math.random() * z.radius
  const pos = { x: z.center.x + Math.cos(a) * rr, y: z.center.y + Math.sin(a) * rr }
  const e = makeEntity(ctx, {
    id: z.enemy,
    name: ENEMY_NAME[z.enemy],
    pos,
    radius: st.radius,
    hp: st.hp,
    maxHp: st.hp,
    speed: st.speed,
    atkBonus: st.atk,
    ac: st.ac,
    dmgDice: st.dmgDice,
    dmgSides: st.dmgSides,
    dmgMod: st.dmgMod,
    attackCd: st.attackCd,
    attackRange: st.attackRange,
    ranged: st.ranged,
    enemyType: z.enemy,
    aggroR: st.aggroR,
    leashR: st.leashR,
  })
  e.zoneId = z.id
  e.home = { ...pos }
  ctx.entities.push(e)
}

export function spawnUnique(ctx: EngineCtx, type: 'alpha' | 'captain' | 'boss', pos: Vec) {
  const st = ENEMY_STATS[type]
  const e = makeEntity(ctx, {
    id: type,
    name: ENEMY_NAME[type],
    pos: { ...pos },
    radius: st.radius,
    hp: st.hp,
    maxHp: st.hp,
    speed: st.speed,
    atkBonus: st.atk,
    ac: st.ac,
    dmgDice: st.dmgDice,
    dmgSides: st.dmgSides,
    dmgMod: st.dmgMod,
    attackCd: st.attackCd,
    attackRange: st.attackRange,
    ranged: st.ranged,
    enemyType: type,
    boss: type === 'boss',
    aggroR: type === 'boss' ? 0 : st.aggroR,
    leashR: st.leashR,
  })
  ctx.entities.push(e)
}

export function spawnCompanion(ctx: EngineCtx, id: 'kaya' | 'torvald') {
  if (ctx.companionIds[id]) return
  ctx.companionIds[id] = true
  const npcDef = NPCS.find((n) => n.id === (id === 'torvald' ? 'torvald_npc' : id))
  const isKaya = id === 'kaya'
  const e = makeEntity(ctx, {
    id,
    kind: 'companion',
    name: npcDef?.name ?? id,
    role: npcDef?.role ?? '',
    pos: { x: ctx.player.pos.x - 26, y: ctx.player.pos.y + 18 },
    color: isKaya ? '#9fb8a4' : '#7a8a4a',
    radius: 13,
    hp: (isKaya ? 70 : 110) + (ctx.level - 1) * 10,
    maxHp: (isKaya ? 70 : 110) + (ctx.level - 1) * 10,
    team: 'party',
    speed: 158,
    atkBonus: isKaya ? 4 : 5,
    ac: isKaya ? 12 : 13,
    dmgDice: 1,
    dmgSides: isKaya ? 6 : 8,
    dmgMod: isKaya ? 2 : 3,
    attackCd: isKaya ? 1.8 : 1.1,
    attackRange: isKaya ? 220 : 46,
    ranged: isKaya ? 240 : undefined,
    aggroR: 0,
    leashR: 99999,
    stance: 'follow',
  })
  ctx.entities.push(e)
  ctx.entities = ctx.entities.filter(
    (x) => !(x.kind === 'npc' && x.id === (id === 'torvald' ? 'torvald_npc' : id)),
  )
}

// ---------------- ИИ спутников ----------------

export function updateCompanion(ctx: EngineCtx, e: Entity, dt: number) {
  if (!e.alive) {
    e.downT -= dt
    if (e.downT <= 0) {
      e.alive = true
      e.hp = Math.round(e.maxHp * 0.45)
      floater(ctx, e.pos, 'На ноги!', '#8fbf7f', 14)
    }
    return
  }
  const stance: Stance = e.stance ?? 'follow'
  const player = ctx.player
  let desired: Vec | null = null
  let target: Entity | null = null

  if (stance === 'hold') {
    if (Math.hypot(e.home.x - e.pos.x, e.home.y - e.pos.y) > 14) desired = { ...e.home }
    target = nearestEnemyOf(ctx, e, 260)
  } else if (stance === 'aggressive') {
    target = nearestEnemyOf(ctx, e, 460)
    if (!target) desired = { x: player.pos.x - 20, y: player.pos.y + 16 }
  } else {
    const t = ctx.targetEid ? ctx.entities.find((x) => x.eid === ctx.targetEid) : null
    if (t && t.alive && Math.hypot(t.pos.x - e.pos.x, t.pos.y - e.pos.y) < 400) target = t
    else target = nearestEnemyOf(ctx, e, 240)
    const off = e.id === 'torvald' ? { x: -30, y: 22 } : { x: -26, y: -26 }
    desired = { x: player.pos.x + off.x, y: player.pos.y + off.y }
  }
  if (target) {
    const dist = Math.hypot(target.pos.x - e.pos.x, target.pos.y - e.pos.y)
    const stopAt = e.ranged ? e.ranged * 0.75 : e.attackRange + target.radius * 0.6
    desired = dist > stopAt ? { ...target.pos } : null
    e.facing = Math.atan2(target.pos.y - e.pos.y, target.pos.x - e.pos.x)
    if (dist <= (e.ranged ?? e.attackRange) + target.radius * 0.6 && e.cds['atk'] <= 0) {
      if (e.ranged) rangedAttack(ctx, e, target)
      else meleeAttack(ctx, e, target)
    }
    if (e.id === 'torvald') {
      if (e.cds['shieldbash'] <= 0 && dist < 70) castCompanionAbility(ctx, e.eid, 'shieldbash', target.eid)
      if (e.cds['warcry'] <= 0 && dist < 300) castCompanionAbility(ctx, e.eid, 'warcry', target.eid)
    }
    if (e.id === 'kaya' && e.cds['frostbolt'] <= 0 && dist < 260) {
      castCompanionAbility(ctx, e.eid, 'frostbolt', target.eid)
    }
  }
  if (e.id === 'kaya' && e.cds['mend'] <= 0) castCompanionAbility(ctx, e.eid, 'mend', null)

  if (desired) {
    const dx = desired.x - e.pos.x
    const dy = desired.y - e.pos.y
    const dist = Math.hypot(dx, dy)
    if (dist > 10) {
      const sp = e.speed * (e.slowT > 0 ? 0.5 : 1)
      e.vel = { x: (dx / dist) * sp, y: (dy / dist) * sp }
    } else e.vel = { x: 0, y: 0 }
  } else {
    e.vel = { x: 0, y: 0 }
  }
  if (!target && Math.hypot(e.vel.x, e.vel.y) > 4) {
    e.facing = Math.atan2(e.vel.y, e.vel.x)
  }
  ctx.moveWithCollisions(e, e.vel.x, e.vel.y, dt)
  e.walkPhase += dt * (Math.hypot(e.vel.x, e.vel.y) > 4 ? 1 : 0.2)
}

export function castCompanionAbility(ctx: EngineCtx, eid: number, abilityId: string, targetEid: number | null) {
  const e = ctx.entities.find((x) => x.eid === eid)
  if (!e || !e.alive) return
  if ((e.cds[abilityId] ?? 0) > 0) return
  const target = targetEid ? ctx.entities.find((x) => x.eid === targetEid) : null
  switch (abilityId) {
    case 'shieldbash': {
      const t = target ?? nearestEnemyOf(ctx, e, 70)
      if (!t) return
      e.cds['shieldbash'] = ABILITY_MAP['shieldbash'].cooldown
      t.stunT = Math.max(t.stunT, 1.3)
      damage(ctx, t, d(6) + 2, { color: '#c9c4bc' })
      floater(ctx, t.pos, 'Оглушён!', '#c9c4bc', 12)
      sfx('hit')
      break
    }
    case 'warcry': {
      e.cds['warcry'] = ABILITY_MAP['warcry'].cooldown
      ctx.buffT = 6
      ring(ctx, e.pos, '#d9a441', 60, 0.6)
      floater(ctx, e.pos, 'Клич!', '#d9a441', 14)
      sfx('shield')
      break
    }
    case 'frostbolt': {
      const t = target ?? nearestEnemyOf(ctx, e, 260)
      if (!t) return
      e.cds['frostbolt'] = ABILITY_MAP['frostbolt'].cooldown
      damage(ctx, t, d(4) + d(4) + 2, { color: '#bfe3ea' })
      t.slowT = 2.5
      beam(ctx, e.pos, t.pos, '#bfe3ea')
      sfx('frost')
      break
    }
    case 'mend': {
      let lowAlly: Entity | null = null
      let lowRatio = 0.6
      for (const a of ctx.entities) {
        if (a.team !== 'party' || !a.alive) continue
        const r = a.hp / a.maxHp
        if (r < lowRatio && Math.hypot(a.pos.x - e.pos.x, a.pos.y - e.pos.y) < 280) {
          lowRatio = r
          lowAlly = a
        }
      }
      if (!lowAlly) return
      e.cds['mend'] = ABILITY_MAP['mend'].cooldown
      const amount = Math.round(lowAlly.maxHp * 0.3)
      lowAlly.hp = Math.min(lowAlly.maxHp, lowAlly.hp + amount)
      if (lowAlly.kind === 'player') ctx.hp = lowAlly.hp
      floater(ctx, lowAlly.pos, '+' + amount, '#8fbf7f', 14)
      ring(ctx, lowAlly.pos, '#8fbf7f', 30, 0.5)
      sfx('heal')
      break
    }
  }
  ctx.syncUi()
}

// ---------------- ИИ врагов ----------------

export function updateEnemy(ctx: EngineCtx, e: Entity, dt: number) {
  if (!e.alive) {
    if (e.respawnAt !== undefined && ctx.time >= e.respawnAt) {
      if (Math.hypot(ctx.player.pos.x - e.home.x, ctx.player.pos.y - e.home.y) > 500) {
        e.alive = true
        e.hp = e.maxHp
        e.aiState = 'idle'
        e.burnT = 0
        e.stunT = 0
        const zone = SPAWN_ZONES.find((z) => z.id === e.zoneId)
        if (zone) {
          const a = Math.random() * Math.PI * 2
          const rr = Math.random() * zone.radius
          e.pos = { x: zone.center.x + Math.cos(a) * rr, y: zone.center.y + Math.sin(a) * rr }
          e.home = { ...e.pos }
        }
        e.respawnAt = undefined
      }
    }
    return
  }
  // Интро босса
  if (e.boss && !ctx.flags.bossIntroDone) {
    if (Math.hypot(ctx.player.pos.x - e.pos.x, ctx.player.pos.y - e.pos.y) < 340) {
      ctx.flags.bossIntroDone = true
      e.aggroR = 400
      openDialogue(ctx, 'boss_intro')
      return
    }
  }
  if (e.stunT > 0) {
    e.vel = { x: 0, y: 0 }
    ctx.moveWithCollisions(e, 0, 0, dt)
    return
  }
  const prey = nearestParty(ctx, e.pos, e.aiState === 'idle' || e.aiState === 'wander' ? e.aggroR : 1e9)
  const homeDist = Math.hypot(e.pos.x - e.home.x, e.pos.y - e.home.y)

  // поводок: слишком далеко от дома — возвращаемся
  if (e.aiState === 'chase' && homeDist > e.leashR) {
    e.aiState = 'return'
  }

  if (e.aiState === 'return') {
    if (homeDist < 20) {
      e.aiState = 'idle'
      e.hp = e.maxHp
    } else {
      const dx = e.home.x - e.pos.x
      const dy = e.home.y - e.pos.y
      const l = Math.hypot(dx, dy)
      e.vel = { x: (dx / l) * e.speed, y: (dy / l) * e.speed }
      e.facing = Math.atan2(dy, dx)
      ctx.moveWithCollisions(e, e.vel.x, e.vel.y, dt)
      e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.12 * dt)
      e.walkPhase += dt
    }
    return
  }

  if (!prey) {
    if (e.aiState === 'chase' || e.aiState === 'attack') {
      e.aiState = 'return'
    } else {
      e.wanderT -= dt
      if (e.wanderT <= 0) {
        e.wanderT = rndRange(1.5, 4)
        const a = Math.random() * Math.PI * 2
        const rr = rndRange(0, 60)
        e.dest = { x: e.home.x + Math.cos(a) * rr, y: e.home.y + Math.sin(a) * rr }
      }
      if (e.dest) {
        const dx = e.dest.x - e.pos.x
        const dy = e.dest.y - e.pos.y
        const l = Math.hypot(dx, dy)
        if (l < 6) e.dest = null
        else {
          e.vel = { x: (dx / l) * e.speed * 0.35, y: (dy / l) * e.speed * 0.35 }
          e.facing = Math.atan2(e.vel.y, e.vel.x)
          ctx.moveWithCollisions(e, e.vel.x, e.vel.y, dt)
          e.walkPhase += dt
          return
        }
      }
      e.vel = { x: 0, y: 0 }
    }
    return
  }

  e.aiState = 'chase'
  const dist = Math.hypot(prey.pos.x - e.pos.x, prey.pos.y - e.pos.y)
  e.facing = Math.atan2(prey.pos.y - e.pos.y, prey.pos.x - e.pos.x)

  if (e.boss) bossLogic(ctx, e, dist)

  const isRanged = !!e.ranged
  const wantRange = isRanged ? e.ranged! * 0.85 : e.attackRange + prey.radius * 0.6
  let vx = 0
  let vy = 0
  if (isRanged && dist < wantRange * 0.6) {
    vx = -Math.cos(e.facing) * e.speed
    vy = -Math.sin(e.facing) * e.speed
  } else if (dist > wantRange) {
    vx = Math.cos(e.facing) * e.speed
    vy = Math.sin(e.facing) * e.speed
  }
  const spd = e.slowT > 0 ? 0.5 : 1
  ctx.moveWithCollisions(e, vx * spd, vy * spd, dt)
  e.walkPhase += dt * (Math.hypot(vx, vy) > 4 ? 1 : 0.2)

  if (e.cds['atk'] <= 0) {
    if (isRanged && dist < e.ranged!) rangedAttack(ctx, e, prey)
    else if (!isRanged && dist <= e.attackRange + prey.radius * 0.6) meleeAttack(ctx, e, prey)
  }
}

export function bossLogic(ctx: EngineCtx, e: Entity, dist: number) {
  if (e.slamT > 0) {
    e.slamT -= 0.016
    if (e.slamT <= 0) {
      ring(ctx, e.pos, '#c94f3d', 170, 0.7, 'slam')
      ctx.shake = 10
      sfx('boss')
      for (const a of ctx.entities) {
        if (a.team !== 'party' || !a.alive) continue
        if (Math.hypot(a.pos.x - e.pos.x, a.pos.y - e.pos.y) < 175) {
          damage(ctx, a, d(8) + d(8) + e.dmgMod, { color: '#e0653a' })
          ctx.kb.set(a.eid, { x: (a.pos.x - e.pos.x) * 4, y: (a.pos.y - e.pos.y) * 4 })
        }
      }
    }
    return
  }
  if (e.cds['slam'] === undefined) e.cds['slam'] = 4
  if (e.cds['slam'] <= 0 && dist < 200) {
    e.cds['slam'] = 7
    e.slamT = 0.9
    floater(ctx, e.pos, 'Буря близко!', '#a06bd9', 16)
    return
  }
  const ratio = e.hp / e.maxHp
  if (ratio < 0.66 && e.summonStage < 1) {
    e.summonStage = 1
    summonHorrors(ctx, e)
  }
  if (ratio < 0.33 && e.summonStage < 2) {
    e.summonStage = 2
    summonHorrors(ctx, e)
  }
}

export function summonHorrors(ctx: EngineCtx, e: Entity) {
  for (let i = 0; i < 2; i++) {
    const st = ENEMY_STATS.horror
    const a = Math.random() * Math.PI * 2
    const h = makeEntity(ctx, {
      id: 'horror',
      name: ENEMY_NAME.horror,
      pos: { x: e.pos.x + Math.cos(a) * 60, y: e.pos.y + Math.sin(a) * 60 },
      radius: st.radius,
      hp: st.hp,
      maxHp: st.hp,
      speed: st.speed,
      atkBonus: st.atk,
      ac: st.ac,
      dmgDice: st.dmgDice,
      dmgSides: st.dmgSides,
      dmgMod: st.dmgMod,
      attackCd: st.attackCd,
      attackRange: st.attackRange,
      enemyType: 'horror',
      aggroR: st.aggroR,
      leashR: 9999,
      aiState: 'chase',
    })
    ctx.entities.push(h)
    ring(ctx, h.pos, '#a06bd9', 40, 0.6)
  }
  floater(ctx, e.pos, 'Разлом извергает слуг!', '#a06bd9', 15)
  sfx('boss')
}
