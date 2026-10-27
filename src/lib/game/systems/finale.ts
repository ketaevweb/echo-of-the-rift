// ============================================================
// ЭХО РАЗЛОМА — Финал (Фаза 7, ME2/GDD 01 §6)
// Рейд в Сердце Разлома: триггер близости, 4 волны эха, матрица
// выживания компаньонов (лояльность × одобрение × роли), суд
// Пожирателя Эха (не HP-бой) и резолвер 5 концовок.
// ============================================================

import { ENEMY_STATS } from '../data/abilities'
import { ENEMY_NAME } from '../data/tables'
import {
  APPROVAL_GOAL,
  RAID_BREAK,
  RAID_HEART,
  RAID_ROLES,
  RAID_TRIGGER,
  RAID_WAVES,
  CompanionId,
  ENDINGS,
  LOYALTY_FLAG,
  companionFates,
  endingState,
} from '../data/finale'
import { Entity } from '../types'
import { sfx } from '../sfx'
import { d } from '../core/util'
import { RaidState, EngineCtx } from '../core/ctx'
import { makeEntity } from '../core/entity'
import { floater, ring } from './combat'
import { advanceQuest, openDialogue } from './quest'
import { saveGame } from './save'

// ---------------- Рейд (MQ-08 «Сердце Разлома») ----------------

/** Начать рейд (идемпотентно): компаньоны держат сердце, идёт первая пауза. */
export function startRaid(ctx: EngineCtx) {
  if (ctx.raid || ctx.flags.judged) return
  const main = ctx.quests.main
  if (!main || main.done || main.stage !== 5) return
  ctx.raid = { wave: 0, pending: [], spawnT: 0, breakT: 3 }
  sfx('boss')
  ctx.shake = 6
  ring(ctx, RAID_HEART, '#a06bd9', 140, 1.2)
  floater(ctx, RAID_HEART, 'РЕЙД НАЧАЛСЯ', '#a06bd9', 20)
  // ME2: партия держит точки у сердца — авангард впереди, артиллерия фланг
  for (const c of ctx.entities) {
    if (c.kind !== 'companion' || !c.alive) continue
    c.stance = 'hold'
    c.home = { x: RAID_HEART.x + (c.id === 'torvald' ? -60 : 60), y: RAID_HEART.y + 55 }
    c.dest = null
  }
  ctx.toast('Рейд в Сердце Разлома! Четыре волны эха. Торвальд — авангард, Кайя — артиллерия. Не дай волнам сомкнуться.', 'warn')
  if (ctx.quests.raid && ctx.quests.raid.stage < 2) advanceQuest(ctx, 'raid', 2)
  ctx.syncUi()
}

/** Спавн эхо-твари волны из кромки арены. */
function spawnRaidEnemy(ctx: EngineCtx, type: string) {
  const st = ENEMY_STATS[type as keyof typeof ENEMY_STATS]
  if (!st) return
  const a = Math.random() * Math.PI * 2
  const rr = 200 + Math.random() * 90
  const pos = { x: RAID_HEART.x + Math.cos(a) * rr, y: RAID_HEART.y + Math.sin(a) * rr }
  const e = makeEntity(ctx, {
    id: type,
    name: ENEMY_NAME[type as keyof typeof ENEMY_NAME] ?? type,
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
    enemyType: type as Entity['enemyType'],
    aggroR: st.aggroR,
    leashR: 99999,
    aiState: 'chase',
  })
  e.zoneId = 'raid'
  e.home = { ...pos }
  ctx.entities.push(e)
  ring(ctx, pos, '#a06bd9', 40, 0.7)
}

/** Смерть компаньона по сценарию волны (лояльность не выполнена). */
function killCompanion(ctx: EngineCtx, id: CompanionId) {
  const c = ctx.entities.find((x) => x.id === id && x.kind === 'companion')
  if (!c || !c.alive) return
  c.alive = false
  ctx.flags[`${id}Dead`] = true
  ring(ctx, c.pos, '#c94f3d', 70, 1.1)
  floater(ctx, c.pos, `${RAID_ROLES[id].role} ПАЛ`, '#c94f3d', 16)
  ctx.toast(
    id === 'torvald'
      ? 'Торвальд пал на волне авангарда — лояльность не была заслужена (Бастион Ветвей не удержан).'
      : 'Кайя пала на волне артиллерии — лояльность не была заслужена (Роща не спасена).',
    'warn',
  )
  sfx('boss')
}

/** Матрица выживания (GDD 07 §7).
 *  Лоялен + одобрение ≥ 25 — жив. Лоялен + < 25 — с волны 2 бросок d20 + одобрение/10 против СЛ 15.
 *  Не лоялен — гибнет на волне своей роли (Торвальд-авангард — 1, Кайя-артиллерия — 2). */
function survivalCheck(ctx: EngineCtx, waveNo: number) {
  for (const id of ['kaya', 'torvald'] as CompanionId[]) {
    const loyal = !!ctx.flags[LOYALTY_FLAG[id]]
    const approval = ctx.approval[id]
    if (!loyal) {
      if (RAID_ROLES[id].wave === waveNo) killCompanion(ctx, id)
      continue
    }
    if (approval >= 25) continue
    if (waveNo < 2) continue // GDD: броски выживания — в каждой волне ≥ 2
    const roll = d(20) + Math.floor(approval / 10)
    const ok = roll >= 15
    ctx.toast(
      `${id === 'kaya' ? 'Кайя' : 'Торвальд'}: выживание волны ${waveNo} — d20+${Math.floor(approval / 10)} = ${roll} против СЛ 15 — ${ok ? 'держится' : 'едва уходит'}`,
      ok ? 'quest' : 'warn',
    )
  }
}

/** Суд (MQ-09): Пожиратель Эха является — не бой, а диалог. */
export function startJudgment(ctx: EngineCtx) {
  if (ctx.flags.judged) return
  if (!ctx.entities.some((x) => x.id === 'devourer' && x.kind === 'npc')) {
    const e = makeEntity(ctx, {
      id: 'devourer',
      name: 'Пожиратель Эха',
      pos: { x: RAID_HEART.x, y: RAID_HEART.y - 70 },
      radius: 26,
      hp: 9999,
      maxHp: 9999,
      speed: 0,
      atkBonus: 0,
      ac: 30,
      dmgDice: 0,
      dmgSides: 0,
      dmgMod: 0,
      attackCd: 999,
      attackRange: 0,
    })
    e.kind = 'npc'
    e.npc = {
      id: 'devourer',
      name: 'Пожиратель Эха',
      role: 'Пустота, питающаяся памятью миров',
      pos: { ...e.pos },
      color: '#a06bd9',
      dialogue: 'judgment_devourer',
    }
    e.facing = Math.PI / 2
    e.home = { ...e.pos }
    ctx.entities.push(e)
  }
  sfx('boss')
  ctx.shake = 8
  ring(ctx, RAID_HEART, '#a06bd9', 200, 1.6)
  floater(ctx, RAID_HEART, 'ПОЖИРАТЕЛЬ ЭХА', '#a06bd9', 22)
  ctx.toast('Пожиратель Эха вышел на суд. Не HP-бой: мир предъявляет счёт за каждый флаг.', 'quest')
  if (ctx.quests.raid && !ctx.quests.raid.done) advanceQuest(ctx, 'raid', 3)
  if (ctx.quests.judgment && ctx.quests.judgment.stage === 0) advanceQuest(ctx, 'judgment', 1)
  // Суд открывается сам — игрок стоит у сердца после четвёртой волны
  openDialogue(ctx, 'judgment_devourer')
}

/** Резолвер концовок (GDD 01 §6, приоритет: Раскол → Тишь → Заря → Печать → Эхо). */
export function resolveEnding(ctx: EngineCtx, choice: 'seal' | 'merge' | 'silence' | 'rift') {
  if (ctx.flags.judged) return
  ctx.flags.judged = true
  const s = endingState(ctx)
  let id: string
  if (choice === 'merge') id = 'echo'
  else if (choice === 'rift') id = 'rift_of_eternity'
  else if (choice === 'silence') id = 'silence'
  else {
    const chain: Array<[string, (s: ReturnType<typeof endingState>) => boolean]> = [
      ['rift_of_eternity', ENDINGS.rift_of_eternity.check!],
      ['silence', ENDINGS.silence.check!],
      ['dawn', ENDINGS.dawn.check!],
      ['seal', ENDINGS.seal.check!],
    ]
    id = chain.find(([, ok]) => ok(s))?.[0] ?? 'seal'
  }
  ctx.pendingEndingId = id
  // Квесты финала: суд окончен, рейд завершён, главный — закрыт
  if (ctx.quests.judgment && !ctx.quests.judgment.done) advanceQuest(ctx, 'judgment', 2)
  if (ctx.quests.raid && !ctx.quests.raid.done) advanceQuest(ctx, 'raid', 4)
  if (ctx.quests.main && !ctx.quests.main.done) advanceQuest(ctx, 'main', 6)
  // Эпилог после паузы (титры суда затухают)
  ctx.endingAt = ctx.time + 2.2
  saveQuiet(ctx)
  ctx.syncUi()
}

/** Тихий автосейв после суда (судьба мира фиксируется). */
function saveQuiet(ctx: EngineCtx) {
  saveGame(ctx, false)
}

/** Тик финала: триггер близости, спавн волн, выживание, переход к суду. */
export function updateFinale(ctx: EngineCtx, dt: number) {
  const main = ctx.quests.main
  // Триггер: главный квест ведёт в Разлом — рейд стартует у сердца
  if (
    main &&
    !main.done &&
    main.stage === 5 &&
    !ctx.raid &&
    !ctx.flags.judged &&
    ctx.flags.barrierOpen
  ) {
    const dH = Math.hypot(ctx.player.pos.x - RAID_HEART.x, ctx.player.pos.y - RAID_HEART.y)
    if (dH < RAID_TRIGGER) startRaid(ctx)
  }
  const R: RaidState | null = ctx.raid
  if (!R) return
  if (R.breakT > 0) {
    R.breakT -= dt
    if (R.breakT <= 0) {
      R.pending = [...RAID_WAVES[R.wave]]
      R.spawnT = 0
      floater(ctx, RAID_HEART, `ВОЛНА ${R.wave + 1}!`, '#a06bd9', 18)
      ctx.toast(`Рейд: волна ${R.wave + 1} из ${RAID_WAVES.length}!`, 'warn')
      sfx('boss')
    }
    return
  }
  if (R.pending.length > 0) {
    R.spawnT -= dt
    if (R.spawnT <= 0) {
      const type = R.pending.shift()
      spawnRaidEnemy(ctx, type as string)
      R.spawnT = 0.6
    }
    return
  }
  let alive = 0
  for (const e of ctx.entities) {
    if (e.kind === 'enemy' && e.zoneId === 'raid' && e.alive) alive++
  }
  if (alive === 0) {
    R.wave++
    const done = R.wave
    if (done >= RAID_WAVES.length) {
      ctx.raid = null
      ctx.toast('Четыре волны выдержаны. Воздух звенит — суд начинается.', 'quest')
      startJudgment(ctx)
      return
    }
    survivalCheck(ctx, done) // смерть за нелояльность — на волне роли (с 1-й), броски approval — с 2-й
    R.breakT = RAID_BREAK
    ctx.toast(`Волна отбита! Эхо перестраивается — следующая через ${RAID_BREAK} с.`, 'quest')
    sfx('level')
    ctx.syncUi()
  }
}

/** Зеркало для UI: прогресс рейда в стор (null — нет рейда). */
export function raidHud(ctx: EngineCtx) {
  if (!ctx.raid) return null
  return { wave: ctx.raid.wave, waves: RAID_WAVES.length }
}

/** Экспорт судьб компаньонов для эпилога. */
export { companionFates }
