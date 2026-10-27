// ============================================================
// ЭХО РАЗЛОМА — Спорные Земли (Фаза 6.4, домен BG3)
// Механика домена: выборы, меняющие ландшафт. applyLandscapeShift
// физически перестраивает мир (removedProps ↔ флаги через
// SHIFT_PROPS). Набег Орды на Рощу — волновой штурм (HORDE_WAVES),
// Гхарз Кровавый Пёс — босс финала (рывок/рёв/призыв).
// ============================================================

import { ENEMY_STATS } from '../data/abilities'
import { ENEMY_NAME } from '../data/tables'
import { GROVE, GROVE_HEART, HORDE_BREAK, HORDE_CAMP, HORDE_WAVES, SHIFT_PROPS } from '../data/world'
import { Entity } from '../types'
import { sfx } from '../sfx'
import { t } from '../i18n'
import { d } from '../core/util'
import { AssaultState, EngineCtx } from '../core/ctx'
import { makeEntity, nearestParty } from '../core/entity'
import { damage, floater, meleeAttack, ring, spawnTelegraph } from './combat'
import { advanceQuest } from './quest'
import { saveGame } from './save'

// ---------------- Ландшафтные сдвиги (механика BG3) ----------------

/**
 * Синхронизация hidden-пропсов с флагами: shift-пропсы с visible=true
 * скрыты, пока флаг не поднят; с visible=false — скрыты, когда поднят.
 * Вызывается из spawnWorld (инициализация/загрузка сейва).
 */
export function syncShiftProps(ctx: EngineCtx) {
  for (const sp of SHIFT_PROPS) {
    const on = !!ctx.flags[sp.flag]
    const hidden = sp.visible ? !on : on
    if (hidden) ctx.removedProps.add(sp.id)
    else ctx.removedProps.delete(sp.id)
  }
}

/**
 * ГЛАВНАЯ МЕХАНИКА ДОМЕНА (BG3): решение игрока физически перестраивает
 * ландшафт. Поднимает флаг и пересобирает видимость shift-пропсов:
 * роща расцветает/выгорает, лагерь Орды разбивается/празднует.
 */
export function applyLandscapeShift(
  ctx: EngineCtx,
  shift: 'grove_saved' | 'grove_burned' | 'horde_broken',
) {
  const flagMap = { grove_saved: 'groveSaved', grove_burned: 'groveBurned', horde_broken: 'hordeBroken' } as const
  const flag = flagMap[shift]
  if (ctx.flags[flag]) return
  ctx.flags[flag] = true
  syncShiftProps(ctx)
  ctx.shake = shift === 'grove_burned' ? 9 : 6
  sfx(shift === 'grove_saved' ? 'level' : 'boss')
  const heart = { x: GROVE_HEART.x, y: GROVE_HEART.y }
  const camp = { x: HORDE_CAMP.pos.x, y: HORDE_CAMP.pos.y }
  if (shift === 'grove_saved') {
    ring(ctx, heart, '#9fb8a4', 150, 1.3)
    floater(ctx, heart, 'РОЩА ЦВЕТЕТ!', '#9fb8a4', 20)
    ctx.toast('Семя благословлено: вереск вспыхивает золотом, фонари загораются в Роще.', 'quest')
  } else if (shift === 'grove_burned') {
    ring(ctx, heart, '#d96b3a', 170, 1.4)
    floater(ctx, heart, 'РОЩА ВЫЖЖЕНА', '#d96b3a', 20)
    ctx.toast('Роща Садовников выгорела дотла. Только уголь и пепел помнят беженцев.', 'warn')
  } else {
    ring(ctx, camp, '#d9a441', 160, 1.2)
    floater(ctx, camp, 'ЛАГЕРЬ ОРДЫ ПАЛ', '#d9a441', 20)
    ctx.toast('Пепельная Орда разбита: тотемы срублены, шатры разбиты, пира́ погасли.', 'quest')
    // Мирный уход: Гхарз-диалоговое ядро уходит вместе с Ордой
    const npc = ctx.entities.find((x) => x.kind === 'npc' && x.id === 'gharz')
    if (npc) npc.alive = false
  }
  saveQuiet(ctx)
  ctx.syncUi()
}

/** Тихий автосейв после крупного решения (ландшафт меняется навсегда). */
function saveQuiet(ctx: EngineCtx) {
  saveGame(ctx, false)
}

// ---------------- Набег Орды на Рощу (волны) ----------------

/**
 * Начать набег (идемпотентно): волны идут из лагеря Орды к Роще.
 * Вызывается, когда игрок выбрал «защитить рощу» и вернулся к Роще
 * (триггер близости — как дракон Пределья).
 */
export function startAssault(ctx: EngineCtx) {
  const q = ctx.quests.disputed
  if (!q || q.done || q.stage !== 3) return
  if (ctx.flags.hordeBroken) return
  if (ctx.assault) {
    ctx.toast('Набег уже идёт — держи Рощу!', 'warn')
    return
  }
  ctx.assault = { wave: 0, pending: [], spawnT: 0, breakT: 2.2 }
  sfx('boss')
  ctx.shake = 5
  ring(ctx, GROVE.pos, '#d96b3a', 130, 1.1)
  floater(ctx, GROVE.pos, 'ОРДА ИДЁТ!', '#d96b3a', 20)
  // Фаза 4 × Фаза 6.4: партия обороняет сердце Рощи
  for (const c of ctx.entities) {
    if (c.kind !== 'companion' || !c.alive) continue
    c.stance = 'hold'
    c.home = { x: GROVE_HEART.x + (c.id === 'torvald' ? -40 : 40), y: GROVE_HEART.y + 40 }
    c.dest = null
  }
  ctx.toast('Набег Орды! Волны идут от лагеря к Роще — не пропусти их к Семени (Space — тактические приказы).', 'warn')
  ctx.syncUi()
}

/** Спавн мародёра из лагеря Орды. */
function spawnAssaultEnemy(ctx: EngineCtx, type: Entity['enemyType']) {
  if (!type) return
  if (type === 'horde_chief' && ctx.flags.gharzDead) return
  const camp = { x: HORDE_CAMP.pos.x, y: HORDE_CAMP.pos.y }
  const st = ENEMY_STATS[type]
  const a = Math.random() * Math.PI * 2
  const rr = Math.random() * 60
  const pos = { x: camp.x + Math.cos(a) * rr, y: camp.y + Math.sin(a) * rr }
  const e = makeEntity(ctx, {
    id: type,
    name: ENEMY_NAME[type] ?? type,
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
    enemyType: type,
    boss: type === 'horde_chief',
    aggroR: type === 'horde_chief' ? 0 : st.aggroR,
    leashR: 99999,
    aiState: 'chase',
  })
  e.zoneId = 'assault' // не из зоны респавна — набеговая тварь
  e.home = { ...pos }
  ctx.entities.push(e)
  ring(ctx, pos, '#d96b3a', 42, 0.7)
  if (type === 'horde_chief') {
    ctx.shake = 7
    sfx('boss')
    floater(ctx, pos, 'ГХАРЗ ВЫШЕЛ!', '#b0563a', 18)
    ctx.toast('Гхарз Кровавый Пёс идёт сам — это последняя волна!', 'warn')
  }
}

/** Победа: волны отбиты, Орда разбита. */
function assaultVictory(ctx: EngineCtx) {
  ctx.assault = null
  applyLandscapeShift(ctx, 'horde_broken')
  const q = ctx.quests.disputed
  if (q && !q.done && q.stage === 3) {
    advanceQuest(ctx, 'disputed', 5)
  }
  ctx.toast('Набег отбит! Гхарз мёртв, Орда рассеялась — вернись к Ульве.', 'quest')
}

/** Тик набега: триггер близости Рощи, спавн волн, победа, когда все волны выбиты. */
export function updateDisputed(ctx: EngineCtx, dt: number) {
  // Триггер: игрок выбрал «защитить рощу» и вернулся к Роще — начинается набег
  const q = ctx.quests.disputed
  if (
    q &&
    !q.done &&
    q.stage === 3 &&
    ctx.flags.defendChosen &&
    !ctx.assault &&
    !ctx.flags.hordeBroken
  ) {
    const dGrove = Math.hypot(ctx.player.pos.x - GROVE.pos.x, ctx.player.pos.y - GROVE.pos.y)
    if (dGrove < 430) startAssault(ctx)
  }
  const A: AssaultState | null = ctx.assault
  if (!A) return
  // Пауза между волнами
  if (A.breakT > 0) {
    A.breakT -= dt
    if (A.breakT <= 0) {
      A.pending = [...HORDE_WAVES[A.wave]]
      A.spawnT = 0
      floater(ctx, GROVE.pos, t('ВОЛНА {n}!', { n: A.wave + 1 }), '#d96b3a', 18)
      ctx.toast(t('Набег Орды: волна {n} из {total}!', { n: A.wave + 1, total: HORDE_WAVES.length }), 'warn')
      sfx('boss')
    }
    return
  }
  // Выплёвываем волну из лагеря
  if (A.pending.length > 0) {
    A.spawnT -= dt
    if (A.spawnT <= 0) {
      const type = A.pending.shift()
      spawnAssaultEnemy(ctx, type as Entity['enemyType'])
      A.spawnT = 0.6
    }
    return
  }
  // Волна в бою
  let alive = 0
  for (const e of ctx.entities) {
    if (e.kind === 'enemy' && e.zoneId === 'assault' && e.alive) alive++
  }
  if (alive === 0) {
    A.wave++
    if (A.wave >= HORDE_WAVES.length) {
      assaultVictory(ctx)
      return
    }
    A.breakT = HORDE_BREAK
    ctx.toast(t('Волна отбита! Орда перегруппировывается — следующая волна через {sec} с.', { sec: HORDE_BREAK }), 'quest')
    sfx('level')
    ctx.syncUi()
  }
}

/** Зеркало для UI: прогресс набега в стор (null — нет штурма). */
export function assaultHud(ctx: EngineCtx) {
  if (!ctx.assault) return null
  return { wave: ctx.assault.wave, waves: HORDE_WAVES.length }
}

// ---------------- Гхарз Кровавый Пёс (босс домена) ----------------

/**
 * Спавн Гхарза (идемпотентно): финал штурма, бой по предательству
 * или путь «забрать Семя силой».
 */
export function spawnHordeChief(ctx: EngineCtx, pos = { x: HORDE_CAMP.pos.x, y: HORDE_CAMP.pos.y }) {
  if (ctx.flags.gharzDead) return
  if (ctx.entities.some((x) => x.enemyType === 'horde_chief' && x.alive)) return
  const st = ENEMY_STATS.horde_chief
  const e = makeEntity(ctx, {
    id: 'horde_chief',
    name: ENEMY_NAME.horde_chief,
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
    enemyType: 'horde_chief',
    boss: true,
    aggroR: 0,
    leashR: 9999,
    aiState: 'chase',
  })
  e.home = { ...pos }
  ctx.entities.push(e)
  ring(ctx, pos, '#b0563a', 60, 0.9)
  sfx('boss')
}

/**
 * ИИ Гхарза: таранный рывок (полоса-телеграф), рёв страха (конус →
 * замедление), призыв мародёров по фазам HP. Полный перехват движения,
 * вызывается из updateEnemy.
 */
export function hordeChiefLogic(ctx: EngineCtx, e: Entity, dist: number, dt: number) {
  const prey = nearestParty(ctx, e.pos, 1e9)
  if (prey) e.facing = Math.atan2(prey.pos.y - e.pos.y, prey.pos.x - e.pos.x)

  // --- Таранный рывок: полоса-телеграф, затем прыжок ---
  if (e.chargeT !== undefined && e.chargeT > 0) {
    e.chargeT -= dt
    if (e.chargeT <= 0) {
      e.dashDir = e.facing
      e.dashT = 0.62
      e.dashHits = new Set()
      sfx('fire')
      ctx.shake = 4
    }
    return
  }
  if (e.dashT !== undefined && e.dashT > 0) {
    e.dashT -= dt
    const spd = 720
    ctx.moveWithCollisions(e, Math.cos(e.dashDir!) * spd, Math.sin(e.dashDir!) * spd, dt)
    for (const a of ctx.entities) {
      if (a.team !== 'party' || !a.alive || e.dashHits!.has(a.eid)) continue
      if (Math.hypot(a.pos.x - e.pos.x, a.pos.y - e.pos.y) < e.radius + a.radius + 14) {
        e.dashHits!.add(a.eid)
        damage(ctx, a, d(8) + e.dmgMod, { color: '#b0563a' })
        ctx.kb.set(a.eid, { x: Math.cos(e.dashDir!) * 300, y: Math.sin(e.dashDir!) * 300 })
      }
    }
    return
  }
  if (e.cds['charge'] === undefined) e.cds['charge'] = 6
  if (e.cds['charge'] <= 0 && dist > 130 && dist < 460) {
    e.cds['charge'] = 9
    e.chargeT = 0.85
    floater(ctx, e.pos, 'ПЁС ДЕЛАЕТ ПРЫЖОК!', '#b0563a', 16)
    spawnTelegraph(ctx, {
      shape: 'line',
      x: e.pos.x,
      y: e.pos.y,
      facing: e.facing,
      radius: 420,
      width: 44,
      life: 0.85,
      maxLife: 0.85,
      color: '#b0563a',
      followEid: e.eid,
    })
    return
  }
  // --- Рёв страха: конус → замедление + урон ---
  if (e.cds['roar'] === undefined) e.cds['roar'] = 3.5
  if ((e.cds['roar'] ?? 0) <= 0 && dist < 300) {
    e.cds['roar'] = 10
    e.castT = 0.8
    e.slamT = 0.8
    spawnTelegraph(ctx, {
      shape: 'cone',
      x: e.pos.x,
      y: e.pos.y,
      facing: e.facing,
      radius: 300,
      width: 0.55,
      life: 0.8,
      maxLife: 0.8,
      color: '#c9a44a',
      followEid: e.eid,
    })
    floater(ctx, e.pos, 'КРОВАВЫЙ РЁВ!', '#c9a44a', 16)
    sfx('boss')
    e.cds['roarHit'] = 0.8
    return
  }
  if ((e.cds['roarHit'] ?? 0) > 0) {
    e.cds['roarHit'] = (e.cds['roarHit'] ?? 0) - dt
    if ((e.cds['roarHit'] ?? 0) <= 0) {
      e.castT = 0
      sfx('boss')
      ctx.shake = 6
      for (const a of ctx.entities) {
        if (a.team !== 'party' || !a.alive) continue
        const da = Math.atan2(a.pos.y - e.pos.y, a.pos.x - e.pos.x)
        const dd = Math.hypot(a.pos.x - e.pos.x, a.pos.y - e.pos.y)
        const diff = Math.abs(((da - e.facing + Math.PI * 3) % (Math.PI * 2)) - Math.PI)
        if (dd < 305 && diff < 0.55) {
          damage(ctx, a, d(5) + 2, { color: '#c9a44a' })
          a.slowT = Math.max(a.slowT, 2.6)
        }
      }
      return
    }
  }
  // --- Фазы: призыв мародёров ---
  const ratio = e.hp / e.maxHp
  if (ratio < 0.66 && e.summonStage < 1) {
    e.summonStage = 1
    summonRaiders(ctx, e)
  }
  if (ratio < 0.33 && e.summonStage < 2) {
    e.summonStage = 2
    summonRaiders(ctx, e)
  }
  // Кусает в упор
  if (prey && e.cds['atk'] <= 0 && dist <= e.attackRange + prey.radius * 0.6) {
    meleeAttack(ctx, e, prey)
  }
}

/** Свита Гхарза: два мародёра из-под руки вожака. */
function summonRaiders(ctx: EngineCtx, e: Entity) {
  for (let i = 0; i < 2; i++) {
    const st = ENEMY_STATS.raider
    const a = Math.random() * Math.PI * 2
    const h = makeEntity(ctx, {
      id: 'raider',
      name: ENEMY_NAME.raider,
      pos: { x: e.pos.x + Math.cos(a) * 70, y: e.pos.y + Math.sin(a) * 70 },
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
      enemyType: 'raider',
      aggroR: st.aggroR,
      leashR: 9999,
      aiState: 'chase',
    })
    h.zoneId = 'assault'
    h.home = { ...h.pos }
    ctx.entities.push(h)
    ring(ctx, h.pos, '#b0563a', 40, 0.6)
  }
  floater(ctx, e.pos, 'ОРДА, К МНЕ!', '#b0563a', 15)
  sfx('boss')
}
