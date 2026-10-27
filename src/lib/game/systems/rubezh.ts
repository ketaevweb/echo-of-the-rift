// ============================================================
// ЭХО РАЗЛОМА — Внешний Рубеж (Фаза 6.5, домен ME2)
// Правило домена: подготовка рейда. Хребет сигналов — головоломка
// порядка ретрансляторов; посадочные кольца — карта оф-тропой;
// стазис-капсулы — имена погибшего экипажа (миссия лояльности
// Ашера, LOY-05). Капитан «Двенадцатого» — босс: лазерная линия,
// EMP-волна, дроны-подкрепления, слаб к Аксию (GDD 07 §3).
// ============================================================

import { ENEMY_STATS } from '../data/abilities'
import { ENEMY_NAME } from '../data/tables'
import { CREW_NAMES, RELAY_ORDER, RELAYS, STASIS_HALL } from '../data/world'
import { Entity } from '../types'
import { sfx } from '../sfx'
import { t } from '../i18n'
import { d } from '../core/util'
import { EngineCtx } from '../core/ctx'
import { makeEntity } from '../core/entity'
import { damage, floater, meleeAttack, ring, spawnTelegraph } from './combat'
import { advanceQuest } from './quest'
import { saveGame } from './save'

// ---------------- Хребет сигналов (VR-02): головоломка порядка ----------------

/**
 * Синхронизация ретранслятора. Головоломка: активировать в порядке
 * RELAY_ORDER (подсказка Ашера: «первый, третий, второй»). Неверный
 * порядок сбрасывает прогресс — ретрансляторы гаснут (ME2-миниигра).
 */
export function activateRelay(ctx: EngineCtx, relayId: string, uiId: string) {
  const q = ctx.quests.rubezh_signal
  if (!q || q.done || q.stage !== 1) return
  if (ctx.flags.ridgeOnline) return
  const step = q.counter
  const expected = RELAY_ORDER[step]
  if (relayId !== expected) {
    // Сбой: прогресс гаснет, цепь разорвана (интеракты остаются — цепь можно пройти заново)
    q.counter = 0
    sfx('warn')
    floater(ctx, RELAYS.find((r) => r.id === relayId)!.pos, 'ЦЕПЬ РАЗОРВАНА', '#d96b3a', 15)
    ctx.toast('Ретрансляторы гаснут. Порядок был не тот — начинай заново: Ашер говорил — первый, третий, второй.', 'warn')
    ctx.syncUi()
    return
  }
  // Верный шаг: ретранслятор загорается
  q.counter = step + 1
  ctx.flags['relay_' + relayId] = true
  ctx.removedProps.add(uiId)
  ring(ctx, RELAYS.find((r) => r.id === relayId)!.pos, '#7de8c4', 60, 0.8)
  floater(ctx, RELAYS.find((r) => r.id === relayId)!.pos, 'СИНХРОН', '#7de8c4', 14)
  sfx('level')
  if (q.counter >= RELAY_ORDER.length) {
    q.counter = 0
    ctx.flags.ridgeOnline = true
    advanceQuest(ctx, 'rubezh_signal', 2)
    ctx.toast('Хребет сигналов поёт! Дроны-разведчики Ашера вышли на плато — поддержка рейда обеспечена.', 'quest')
    saveGame(ctx, false)
  } else {
    ctx.toast(t('Ретранслятор синхронизирован ({n}/{total}).', { n: q.counter, total: RELAY_ORDER.length }), 'info')
  }
  ctx.syncUi()
}

// ---------------- Стазис-капсулы (VR-04): имена экипажа ----------------

/** Чтение таблички стазис-капсулы: имя погибшего → счётчик квеста. */
export function readCrewPod(ctx: EngineCtx, uiId: string) {
  const q = ctx.quests.rubezh_crew
  if (!q || q.done || q.stage !== 1) return
  const podId = uiId.replace('_ui', '')
  const idx = parseInt(podId.slice(3), 10) - 1
  if (ctx.flags['crew_' + podId]) return
  ctx.flags['crew_' + podId] = true
  ctx.removedProps.add(uiId)
  q.counter++
  const name = CREW_NAMES[idx] ?? 'неизвестный'
  const c = q.counter
  if (c >= CREW_NAMES.length) {
    advanceQuest(ctx, 'rubezh_crew', 2)
    ctx.toast(`Двенадцать имён возвращены из стазиса. К Ашеру — он должен их услышать.`, 'quest')
  } else {
    ctx.toast(t('Стазис-капсула: {name} ({c}/12)', { name: t(name), c }), 'info')
  }
  sfx('quest')
  saveGame(ctx, false)
  ctx.syncUi()
}

// ---------------- Посадочные кольца (VR-03): карта оф-тропой ----------------

/** Осмотр посадочного кольца: разметка старой аварийной полосы. */
export function surveyRing(ctx: EngineCtx, uiId: string) {
  const q = ctx.quests.rubezh_rings
  if (!q || q.done || q.stage !== 1) return
  const ringId = uiId.replace('_ui', '')
  if (ctx.flags['ringseen_' + ringId]) return
  ctx.flags['ringseen_' + ringId] = true
  ctx.removedProps.add(uiId)
  q.counter++
  const c = q.counter
  if (c >= 3) {
    advanceQuest(ctx, 'rubezh_rings', 2)
    ctx.toast('Три кольца нанесены на карту: аварийная полоса «Двенадцатого» восстановлена оф-тропой.', 'quest')
  } else {
    ctx.toast(t('Посадочные кольца: {c}/3', { c }), 'info')
  }
  sfx('quest')
  saveGame(ctx, false)
  ctx.syncUi()
}

// ---------------- Капитан «Двенадцатого» (босс домена) ----------------

/** Спавн капитана-эха (идемпотентно): будится при входе в стазис-зал после журнала. */
export function spawnRbCaptain(ctx: EngineCtx, pos = { x: STASIS_HALL.x, y: STASIS_HALL.y + 40 }) {
  if (ctx.flags.captainEchoDead) return
  if (ctx.entities.some((x) => x.enemyType === 'rb_captain' && x.alive)) return
  const st = ENEMY_STATS.rb_captain
  const e = makeEntity(ctx, {
    id: 'rb_captain',
    name: ENEMY_NAME.rb_captain,
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
    enemyType: 'rb_captain',
    boss: true,
    aggroR: 0,
    leashR: 9999,
    aiState: 'chase',
  })
  e.home = { ...pos }
  ctx.entities.push(e)
  ring(ctx, pos, '#7de8c4', 70, 1.0)
  ctx.shake = 6
  sfx('boss')
  floater(ctx, pos, 'КАПИТАН «ДВЕНАДЦАТОГО»', '#7de8c4', 18)
  ctx.toast('Эхо капитана встало из стазиса: приказ, отданный 12 лет назад, ещё исполняется.', 'warn')
}

/**
 * ИИ капитана: лазерная линия (телеграф → луч), EMP-волна (кольцо →
 * замедление), дроны-подкрепления по фазам HP (66/33%), слаб к Аксию
 * (усиленный стан — STUN_WEAK). Полный перехват движения, как у Гхарза.
 */
export function rbCaptainLogic(ctx: EngineCtx, e: Entity, dist: number, dt: number) {
  const prey = ctx.entities.find((a) => a.team === 'party' && a.alive)
  if (prey) e.facing = Math.atan2(prey.pos.y - e.pos.y, prey.pos.x - e.pos.x)

  // --- Лазерная линия: телеграф, затем выжигающая полоса ---
  if (e.chargeT !== undefined && e.chargeT > 0) {
    e.chargeT -= dt
    if (e.chargeT <= 0) {
      // Выстрел: урон по линии
      for (const a of ctx.entities) {
        if (a.team !== 'party' || !a.alive) continue
        const dx = a.pos.x - e.pos.x
        const dy = a.pos.y - e.pos.y
        const dd = Math.hypot(dx, dy)
        if (dd > 440) continue
        const da = Math.atan2(dy, dx)
        const diff = Math.abs(((da - e.facing + Math.PI * 3) % (Math.PI * 2)) - Math.PI)
        // точечная проекция на ось луча
        const along = dx * Math.cos(e.facing) + dy * Math.sin(e.facing)
        const perp = Math.abs(-dx * Math.sin(e.facing) + dy * Math.cos(e.facing))
        if (diff < 0.6 && along > 0 && perp < 26) {
          damage(ctx, a, d(10) + e.dmgMod, { color: '#7de8c4' })
          floater(ctx, a.pos, 'ЛАЗЕР!', '#7de8c4', 14)
        }
      }
      ctx.shake = 5
      sfx('fire')
      return
    }
    return
  }
  if (e.cds['laser'] === undefined) e.cds['laser'] = 5
  if ((e.cds['laser'] ?? 0) <= 0 && dist > 90 && dist < 480) {
    e.cds['laser'] = 9
    e.chargeT = 0.9
    floater(ctx, e.pos, 'ЗАЛП ОРУДИЯ!', '#7de8c4', 16)
    spawnTelegraph(ctx, {
      shape: 'line',
      x: e.pos.x,
      y: e.pos.y,
      facing: e.facing,
      radius: 440,
      width: 30,
      life: 0.9,
      maxLife: 0.9,
      color: '#7de8c4',
      followEid: e.eid,
    })
    return
  }
  // --- EMP-волна: кольцо вокруг → сбой брони (замедление) + урон ---
  if (e.cds['emp'] === undefined) e.cds['emp'] = 6
  if ((e.cds['emp'] ?? 0) <= 0 && dist < 240) {
    e.cds['emp'] = 12
    e.castT = 0.7
    e.slamT = 0.7
    spawnTelegraph(ctx, {
      shape: 'circle',
      x: e.pos.x,
      y: e.pos.y,
      facing: 0,
      radius: 250,
      width: 0,
      life: 0.7,
      maxLife: 0.7,
      color: '#c9a3e8',
      followEid: e.eid,
    })
    floater(ctx, e.pos, 'EMP-ВОЛНА!', '#c9a3e8', 16)
    sfx('boss')
    e.cds['empHit'] = 0.7
    return
  }
  if ((e.cds['empHit'] ?? 0) > 0) {
    e.cds['empHit'] = (e.cds['empHit'] ?? 0) - dt
    if ((e.cds['empHit'] ?? 0) <= 0) {
      e.castT = 0
      sfx('mind')
      ring(ctx, e.pos, '#c9a3e8', 250, 1.0)
      ctx.shake = 6
      for (const a of ctx.entities) {
        if (a.team !== 'party' || !a.alive) continue
        if (Math.hypot(a.pos.x - e.pos.x, a.pos.y - e.pos.y) < 255) {
          damage(ctx, a, d(4) + 2, { color: '#c9a3e8' })
          a.slowT = Math.max(a.slowT, 3)
          floater(ctx, a.pos, 'СБОЙ', '#c9a3e8', 12)
        }
      }
      return
    }
  }
  // --- Фазы: дроны-подкрепления (GDD 07 §3) ---
  const ratio = e.hp / e.maxHp
  if (ratio < 0.66 && e.summonStage < 1) {
    e.summonStage = 1
    summonDrones(ctx, e)
  }
  if (ratio < 0.33 && e.summonStage < 2) {
    e.summonStage = 2
    summonDrones(ctx, e)
  }
  // Бьёт в упор
  if (prey && e.cds['atk'] <= 0 && dist <= e.attackRange + prey.radius * 0.6) {
    meleeAttack(ctx, e, prey)
  }
}

/** Свита капитана: два боевых дрона из трюма. */
function summonDrones(ctx: EngineCtx, e: Entity) {
  for (let i = 0; i < 2; i++) {
    const st = ENEMY_STATS.drone
    const a = Math.random() * Math.PI * 2
    const h = makeEntity(ctx, {
      id: 'drone',
      name: ENEMY_NAME.drone,
      pos: { x: e.pos.x + Math.cos(a) * 90, y: e.pos.y + Math.sin(a) * 90 },
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
      enemyType: 'drone',
      aggroR: st.aggroR,
      leashR: 9999,
      aiState: 'chase',
    })
    h.zoneId = 'rubezh_boss'
    h.home = { ...h.pos }
    ctx.entities.push(h)
    ring(ctx, h.pos, '#7de8c4', 40, 0.6)
  }
  floater(ctx, e.pos, 'ДРОНЫ, НА АТАКУ!', '#7de8c4', 15)
  sfx('boss')
}

// ---------------- Тик домена ----------------

/** Тик Внешнего Рубежа: будим капитана при входе в стазис-зал (после журнала). */
export function updateRubezh(ctx: EngineCtx, dt: number) {
  void dt
  const q = ctx.quests.rubezh_ship
  if (
    q &&
    !q.done &&
    q.stage === 2 &&
    ctx.flags.shipLogRead &&
    !ctx.flags.captainEchoDead &&
    !ctx.entities.some((x) => x.enemyType === 'rb_captain' && x.alive)
  ) {
    const dHall = Math.hypot(ctx.player.pos.x - STASIS_HALL.x, ctx.player.pos.y - STASIS_HALL.y)
    if (dHall < 260) spawnRbCaptain(ctx)
  }
}

/** Зеркало для UI: у Рубежа нет HUD-панелей — возвращаем null. */
export function rubezhHud(ctx: EngineCtx): null {
  void ctx
  return null
}
