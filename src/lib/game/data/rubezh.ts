// ============================================================
// ЭХО РАЗЛОМА — Внешний Рубеж (Фаза 6.5, домен ME2)
// Плато-космодром за восточным Обрывом, тёмное небо с чужими
// созвездиями. Правило домена: подготовка рейда (ME2) — дроны,
// ретрансляторы Хребта, ремонт «Двенадцатого». Корабль-призрак
// хранит экипаж в стазисе, а его капитан — эхо, которое помнит
// приказ, отданный 12 лет назад.
// Мир общий (одна heightmap) — переход через Врата Внешнего Рубежа.
// Data-only: никаких импортов движка.
// ============================================================

import { InteractableDef, PropDef, SpawnZoneDef, Vec } from '../types'

// ---------------- Границы и переходы ----------------

/** Восточный Обрыв между Спорными Землями и плато Внешнего Рубежа (стена по x). */
export const RB_EDGE = { x: 7960, band: 170 }

/** Врата Внешнего Рубежа: порталы по обе стороны Обрыва. */
export const RB_GATES = {
  disputedSide: { x: 7700, y: 3760, exit: { x: 7670, y: 3760 }, label: 'СПОРНЫЕ ЗЕМЛИ' },
  rubezh: { x: 8140, y: 3760, exit: { x: 8170, y: 3760 }, label: 'ВНЕШНИЙ РУБЕЖ' },
}

// ---------------- Ключевые точки ----------------

/** Корабль-призрак «Двенадцатый» — лежит в кратере в центре плато. */
export const SHIP = { pos: { x: 8430, y: 1500 } }
/** Стазис-зал корабля: капсулы с экипажем (VR-04). */
export const STASIS_HALL = { x: 8430, y: 1660 }
/** Хребет сигналов — гряда с тремя ретрансляторами (VR-02). */
export const RIDGE_RB = { pos: { x: 8560, y: 2740 } }
/** Посадочные кольца плато (VR-03). */
export const RINGS: Array<{ id: string; pos: Vec }> = [
  { id: 'ring1', pos: { x: 8230, y: 700 } },
  { id: 'ring2', pos: { x: 8620, y: 480 } },
  { id: 'ring3', pos: { x: 8320, y: 2360 } },
]
/** Лагерь Ашера у посадочного трапа корабля. */
export const ASHER_CAMP = { x: 8320, y: 1800 }

/** Порядок активации ретрансляторов Хребта (мини-головоломка: 1 → 3 → 2). */
export const RELAY_ORDER = ['relay1', 'relay3', 'relay2'] as const
export const RELAYS: Array<{ id: string; pos: Vec }> = [
  { id: 'relay1', pos: { x: 8480, y: 2600 } },
  { id: 'relay2', pos: { x: 8680, y: 2820 } },
  { id: 'relay3', pos: { x: 8540, y: 2920 } },
]

/** Экипаж «Двенадцатого» — 12 имён погибших (VR-04, «Список экипажа»). */
export const CREW_NAMES = [
  'Силв, Ханна — капитан',
  'Крой, Дан — пилот',
  'Мэй, Ора — техник',
  'Вант, Йель — медик',
  'Гарс, Тэм — связист',
  'Ило, Кэсс — штурман',
  'Рид, Март — оружейник',
  'Сонн, Лея — ботаник',
  'Фейн, Дори — кочегар',
  'Укко, Барт — грузчик',
  'Ясс, Нива — радист',
  'Орт, Кем — кадет',
] as const

// ---------------- Дороги и пропсы ----------------

export const RUBEZH_ROADS: Vec[][] = [
  // Врата → посадочные кольца → корабль
  [{ x: 8170, y: 3760 }, { x: 8260, y: 3140 }, { x: 8340, y: 2380 }],
  [{ x: 8340, y: 2380 }, { x: 8400, y: 1960 }, { x: 8430, y: 1700 }],
  // Корабль → кольцо1 → кольцо2 (северная дуга)
  [{ x: 8430, y: 1700 }, { x: 8280, y: 1160 }, { x: 8230, y: 760 }],
  [{ x: 8230, y: 760 }, { x: 8420, y: 560 }, { x: 8610, y: 540 }],
  // Корабль → Хребет сигналов
  [{ x: 8430, y: 1700 }, { x: 8520, y: 2200 }, { x: 8560, y: 2700 }],
]

function lcg(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

function distToSeg(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax
  const dy = by - ay
  const l2 = dx * dx + dy * dy
  if (l2 === 0) return Math.hypot(px - ax, py - ay)
  let t = ((px - ax) * dx + (py - ay) * dy) / l2
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

function roadDist(x: number, y: number): number {
  let best = Infinity
  for (const road of RUBEZH_ROADS) {
    for (let i = 0; i < road.length - 1; i++) {
      const d = distToSeg(x, y, road[i].x, road[i].y, road[i + 1].x, road[i + 1].y)
      if (d < best) best = d
    }
  }
  return best
}

function rubezhBlocked(x: number, y: number): boolean {
  if (roadDist(x, y) < 85) return true
  if (Math.hypot(x - RB_GATES.rubezh.x, y - RB_GATES.rubezh.y) < 150) return true
  if (Math.hypot(x - SHIP.pos.x, y - SHIP.pos.y) < 360) return true
  if (Math.hypot(x - RIDGE_RB.pos.x, y - RIDGE_RB.pos.y) < 240) return true
  for (const r of RINGS) if (Math.hypot(x - r.pos.x, y - r.pos.y) < 140) return true
  for (const r of RELAYS) if (Math.hypot(x - r.pos.x, y - r.pos.y) < 100) return true
  if (Math.hypot(x - ASHER_CAMP.x, y - ASHER_CAMP.y) < 120) return true
  return false
}

/** Базальтовые выходы плато. */
function buildRubezhRocks(): PropDef[] {
  const rnd = lcg(7717)
  const out: PropDef[] = []
  let guard = 0
  while (out.length < 46 && guard < 4000) {
    guard++
    const x = RB_EDGE.x + 240 + rnd() * (8800 - RB_EDGE.x - 300)
    const y = 260 + rnd() * 3700
    if (rubezhBlocked(x, y)) continue
    if (out.some((t) => Math.hypot(t.pos.x - x, t.pos.y - y) < 120)) continue
    out.push({ kind: 'rock', pos: { x: Math.round(x), y: Math.round(y) }, r: 9 + Math.floor(rnd() * 9), solid: true, seed: Math.floor(rnd() * 9999) })
  }
  return out
}

/** Обломки аварийной посадки: рваный металл (rubble), выжженные пятна. */
const DEBRIS_SPOTS: Array<[number, number]> = [
  [-380, -240], [420, -180], [-260, 320], [360, 380], [-420, 120], [240, -420],
]

export const RUBEZH_PROPS: PropDef[] = [
  // Врата Внешнего Рубежа (две стороны Обрыва)
  { id: 'rgate_d', kind: 'portal', pos: { x: RB_GATES.disputedSide.x, y: RB_GATES.disputedSide.y }, r: 40, solid: false, seed: 301 },
  { id: 'rgate_r', kind: 'portal', pos: { x: RB_GATES.rubezh.x, y: RB_GATES.rubezh.y }, r: 40, solid: false, seed: 302 },
  // --- Корабль «Двенадцатый»: корпус, крыло, рубка, стазис-капсулы ---
  { id: 'ship_hull', kind: 'ship', pos: { x: SHIP.pos.x, y: SHIP.pos.y }, r: 120, solid: true, seed: 303 },
  { id: 'ship_wing', kind: 'ship', pos: { x: SHIP.pos.x - 210, y: SHIP.pos.y + 140 }, r: 60, solid: true, seed: 304 },
  { id: 'ship_tower', kind: 'ship', pos: { x: SHIP.pos.x + 140, y: SHIP.pos.y - 90 }, r: 44, solid: true, seed: 305 },
  { id: 'ship_fire', kind: 'fire', pos: { x: SHIP.pos.x - 90, y: SHIP.pos.y + 60 }, r: 12, solid: true, seed: 306 },
  // Стазис-капсулы зала (12 — по числу экипажа; VR-04)
  ...[[-150, 120], [-90, 150], [-30, 168], [30, 168], [90, 150], [150, 120], [-120, 190], [-60, 214], [0, 222], [60, 214], [120, 190], [180, 150]].map(
    ([dx, dy], i) => ({
      id: 'pod' + (i + 1),
      kind: 'stasis' as const,
      pos: { x: STASIS_HALL.x + dx, y: STASIS_HALL.y + dy },
      r: 12,
      solid: true,
      seed: 310 + i,
    }),
  ),
  // --- Лагерь Ашера: палатка, костёр, ящик дронов ---
  { id: 'asher_tent', kind: 'tent', pos: { x: ASHER_CAMP.x - 70, y: ASHER_CAMP.y + 40 }, w: 58, h: 44, solid: true, seed: 330 },
  { id: 'asher_fire', kind: 'fire', pos: { x: ASHER_CAMP.x + 10, y: ASHER_CAMP.y + 30 }, r: 10, solid: true, seed: 331 },
  { id: 'asher_box', kind: 'rubble', pos: { x: ASHER_CAMP.x + 60, y: ASHER_CAMP.y - 20 }, r: 10, solid: true, seed: 332 },
  // --- Хребет сигналов: 3 ретранслятора (VR-02) ---
  ...RELAYS.map((r, i) => ({
    id: r.id,
    kind: 'relay' as const,
    pos: { x: r.pos.x, y: r.pos.y },
    r: 10,
    solid: true,
    seed: 340 + i,
  })),
  // --- Посадочные кольца (VR-03) ---
  ...RINGS.map((r, i) => ({
    id: r.id,
    kind: 'pring' as const,
    pos: { x: r.pos.x, y: r.pos.y },
    r: 70,
    solid: false,
    seed: 350 + i,
  })),
  // Обломки аварийной полосы
  ...DEBRIS_SPOTS.map(([dx, dy], i) => ({
    id: 'rdeb' + (i + 1),
    kind: 'rubble' as const,
    pos: { x: SHIP.pos.x + dx * 1.4, y: SHIP.pos.y + dy * 1.4 },
    r: 12,
    solid: true,
    seed: 360 + i,
  })),
  ...buildRubezhRocks(),
]

// ---------------- NPC Внешнего Рубежа ----------------

export const RUBEZH_NPCS = [
  {
    id: 'asher',
    name: 'Ашер',
    role: 'Техник Внешнего Рубежа',
    pos: { x: ASHER_CAMP.x, y: ASHER_CAMP.y },
    color: '#c9a34a',
    dialogue: 'rubezh_asher',
  },
]

// ---------------- Спавны и интеракты ----------------

export const RUBEZH_SPAWN_ZONES: SpawnZoneDef[] = [
  { id: 'rb_drone_a', enemy: 'drone', center: { x: 8280, y: 1100 }, radius: 200, max: 3, respawnSec: 46 },
  { id: 'rb_drone_b', enemy: 'drone', center: { x: 8600, y: 2300 }, radius: 190, max: 2, respawnSec: 52 },
  { id: 'rb_drone_c', enemy: 'drone', center: { x: 8360, y: 3100 }, radius: 200, max: 2, respawnSec: 50 },
]

export const RUBEZH_INTERACTABLES: InteractableDef[] = [
  {
    id: 'rgate_disputed',
    name: 'Врата Внешнего Рубежа',
    pos: { x: RB_GATES.disputedSide.x, y: RB_GATES.disputedSide.y },
    r: 64,
    prompt: 'Войти',
    kind: 'portal',
    action: 'portal:rubezh',
  },
  {
    id: 'rgate_rubezh',
    name: 'Врата Внешнего Рубежа',
    pos: { x: RB_GATES.rubezh.x, y: RB_GATES.rubezh.y },
    r: 64,
    prompt: 'Войти',
    kind: 'portal',
    action: 'portal:disputed',
  },
  // Стазис-капсулы: имена экипажа (VR-04)
  ...CREW_NAMES.map((name, i) => ({
    id: 'pod' + (i + 1) + '_ui',
    name: 'Стазис-капсула',
    pos: { x: STASIS_HALL.x + [[-150, 120], [-90, 150], [-30, 168], [30, 168], [90, 150], [150, 120], [-120, 190], [-60, 214], [0, 222], [60, 214], [120, 190], [180, 150]][i][0], y: STASIS_HALL.y + [[-150, 120], [-90, 150], [-30, 168], [30, 168], [90, 150], [150, 120], [-120, 190], [-60, 214], [0, 222], [60, 214], [120, 190], [180, 150]][i][1] },
    r: 40,
    prompt: 'Прочитать табличку',
    kind: 'clue' as const,
    action: 'crew:rubezh_crew',
    cond: 'quest.rubezh_ship>=1',
  })),
  // Ретрансляторы Хребта (VR-02): активация в порядке RELAY_ORDER
  ...RELAYS.map((r) => ({
    id: r.id + '_ui',
    name: 'Ретранслятор',
    pos: { x: r.pos.x, y: r.pos.y },
    r: 44,
    prompt: 'Синхронизировать',
    kind: 'altar' as const,
    action: 'relay:' + r.id,
    cond: 'quest.rubezh_signal==1',
  })),
  // Посадочные кольца (VR-03): облететь карту
  ...RINGS.map((r) => ({
    id: r.id + '_ui',
    name: 'Посадочное кольцо',
    pos: { x: r.pos.x, y: r.pos.y },
    r: 60,
    prompt: 'Осмотреть разметку',
    kind: 'clue' as const,
    action: 'ringmap:rubezh_rings',
    cond: 'quest.rubezh_rings==1',
  })),
  // Бортжурнал у трапа корабля (VR-01: осмотреть корабль)
  {
    id: 'ship_log',
    name: 'Бортжурнал «Двенадцатого»',
    pos: { x: SHIP.pos.x - 60, y: SHIP.pos.y + 150 },
    r: 48,
    prompt: 'Прочитать',
    kind: 'altar',
    action: 'dialogue:rubezh_log',
    cond: 'quest.rubezh_ship>=1',
  },
]

export const RUBEZH_AREAS: Array<{ id: string; name: string; rect: [number, number, number, number] }> = [
  { id: 'rubezh', name: 'Внешний Рубеж', rect: [8060, 0, 740, 4200] },
  { id: 'shipwreck', name: 'Кратер «Двенадцатого»', rect: [8150, 1150, 560, 700] },
  { id: 'signal_ridge', name: 'Хребет сигналов', rect: [8380, 2500, 420, 500] },
]

export const RUBEZH_MARKERS: Array<{ pos: Vec; label: string }> = [
  { pos: { x: RB_GATES.rubezh.x, y: RB_GATES.rubezh.y }, label: 'Врата Внешнего Рубежа' },
  { pos: { ...SHIP.pos }, label: '«Двенадцатый»' },
  { pos: { ...RIDGE_RB.pos }, label: 'Хребет сигналов' },
  { pos: { x: RINGS[0].pos.x, y: RINGS[0].pos.y }, label: 'Посадочные кольца' },
]
