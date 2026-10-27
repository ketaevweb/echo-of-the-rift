// ============================================================
// ЭХО РАЗЛОМА — Спорные Земли (Фаза 6.4, домен BG3)
// Вересковые пустоши за Рубежным Кряжем, восточнее Стылого Пределья.
// Правило домена: выборы, меняющие ландшафт. Роща Садовников хранит
// Семя Разлома — за него спорят беженцы и Пепельная Орда. Решение
// игрока физически перестраивает мир: роща расцветает или выгорает,
// лагерь Орды разбивается или празднует.
// Мир общий (одна heightmap) — переход через Врата Спорных Земель.
// Data-only: никаких импортов движка.
// ============================================================

import { InteractableDef, PropDef, SpawnZoneDef, Vec } from '../types'

// ---------------- Границы и переходы ----------------

/** Рубежный Кряж между Предельем и Спорными Землями (вертикальная полоса по x). */
export const KRAJ = { x: 6720, band: 170 }

/** Врата Спорных Земель: порталы по обе стороны Кряжа. */
export const DF_GATES = {
  frostSide: { x: 6560, y: 1450, exit: { x: 6530, y: 1450 }, label: 'СТЫЛОЕ ПРЕДЕЛЬЕ' },
  disputed: { x: 6880, y: 1450, exit: { x: 6910, y: 1450 }, label: 'СПОРНЫЕ ЗЕМЛИ' },
}

// ---------------- Ключевые точки ----------------

/** Роща Садовников — вересковая роща с хижинами беженцев и Семенем в сердце. */
export const GROVE = { pos: { x: 7330, y: 1150 } }
/** Сердце Рощи: здесь стоит Ульва и Семя Разлома. */
export const GROVE_HEART = { x: 7330, y: 1090 }
/** Лагерь Пепельной Орды — тотемы, пира́, шатры мародёров. */
export const HORDE_CAMP = { pos: { x: 7250, y: 2920 } }
/** Обугленный погост — мрачный ориентир в центре пустоши. */
export const SHRINE = { pos: { x: 7500, y: 2050 } }
/** Узлы беженцев (побочный Пруши): закопанные пожитки по пустоши. */
export const DIG_SPOTS: Array<{ id: string; pos: Vec }> = [
  { id: 'dig1', pos: { x: 7020, y: 1080 } },
  { id: 'dig2', pos: { x: 7520, y: 1560 } },
  { id: 'dig3', pos: { x: 6980, y: 2350 } },
]

// ---------------- Волны набега (правило домена: выбор решает ландшафт) ----------------

/** Состав волн штурма Рощи (после 2-й волны выходит Гхарз). */
export const HORDE_WAVES: string[][] = [
  ['raider', 'raider', 'raider', 'raider'],
  ['raider', 'raider', 'hexer', 'raider', 'hexer'],
  ['raider', 'hexer', 'raider', 'horde_chief'],
]
/** Пауза между волнами набега, сек. */
export const HORDE_BREAK = 7

// ---------------- Ландшафтные сдвиги (механика BG3) ----------------

/**
 * Пропсы-участники сдвига ландшафта. visible:
 *  true  — появляется, когда flags[flag] = true (до того скрыт);
 *  false — исчезает, когда flags[flag] = true (до того виден).
 * Состояние синхронизируется в removedProps (syncShiftProps) —
 * коллизии/рендер 2D/3D работают без изменений движка.
 */
export interface ShiftProp {
  id: string
  flag: string
  visible: boolean
}

export const SHIFT_PROPS: ShiftProp[] = [
  // --- groveBurned: роща выгорает дотла ---
  ...['gt1', 'gt2', 'gt3', 'gt4', 'gt5', 'gt6', 'gt7', 'gt8', 'gt9', 'gt10'].map((id) => ({ id, flag: 'groveBurned', visible: false })),
  { id: 'grove_hut', flag: 'groveBurned', visible: false },
  { id: 'ref_tent1', flag: 'groveBurned', visible: false },
  { id: 'ref_tent2', flag: 'groveBurned', visible: false },
  { id: 'ref_tent3', flag: 'groveBurned', visible: false },
  { id: 'grove_fire', flag: 'groveBurned', visible: false },
  // ...и появляются обугленные стволы
  ...['bt1', 'bt2', 'bt3', 'bt4', 'bt5', 'bt6', 'bt7'].map((id) => ({ id, flag: 'groveBurned', visible: true })),
  { id: 'grove_pyre', flag: 'groveBurned', visible: true },
  // --- groveSaved: роща расцветает (Семя благословлено) ---
  ...['fl1', 'fl2', 'fl3', 'fl4', 'fl5', 'fl6', 'fl7', 'fl8'].map((id) => ({ id, flag: 'groveSaved', visible: true })),
  ...['lan1', 'lan2', 'lan3'].map((id) => ({ id, flag: 'groveSaved', visible: true })),
  // --- hordeBroken: лагерь Орды разбит ---
  ...['hc_tent1', 'hc_tent2', 'hc_tent3', 'hc_tent4', 'tot1', 'tot2', 'hc_fire1', 'hc_fire2'].map((id) => ({
    id,
    flag: 'hordeBroken',
    visible: false,
  })),
  ...['rub1', 'rub2', 'rub3', 'rub4', 'rub5'].map((id) => ({ id, flag: 'hordeBroken', visible: true })),
]

// ---------------- Дороги и пропсы Спорных Земель ----------------

export const DISPUTED_ROADS: Vec[][] = [
  // Врата → развилка
  [
    { x: 6910, y: 1450 }, { x: 7060, y: 1420 }, { x: 7180, y: 1330 },
  ],
  // Развилка → Роща Садовников
  [
    { x: 7180, y: 1330 }, { x: 7260, y: 1260 }, { x: 7330, y: 1180 },
  ],
  // Развилка → обугленный погост → лагерь Орды
  [
    { x: 7180, y: 1330 }, { x: 7380, y: 1720 }, { x: 7480, y: 2010 },
  ],
  [
    { x: 7480, y: 2010 }, { x: 7390, y: 2470 }, { x: 7270, y: 2870 },
  ],
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
  for (const road of DISPUTED_ROADS) {
    for (let i = 0; i < road.length - 1; i++) {
      const d = distToSeg(x, y, road[i].x, road[i].y, road[i + 1].x, road[i + 1].y)
      if (d < best) best = d
    }
  }
  return best
}

function disputedBlocked(x: number, y: number): boolean {
  if (roadDist(x, y) < 85) return true
  if (Math.hypot(x - DF_GATES.disputed.x, y - DF_GATES.disputed.y) < 150) return true
  if (Math.hypot(x - GROVE.pos.x, y - GROVE.pos.y) < 300) return true
  if (Math.hypot(x - HORDE_CAMP.pos.x, y - HORDE_CAMP.pos.y) < 280) return true
  if (Math.hypot(x - SHRINE.pos.x, y - SHRINE.pos.y) < 170) return true
  for (const d of DIG_SPOTS) {
    if (Math.hypot(x - d.pos.x, y - d.pos.y) < 100) return true
  }
  return false
}

/** Вересковые заросли: золотисто-сухие кусты спорной пустоши. */
function buildHeathShrubs(): PropDef[] {
  const rnd = lcg(9151)
  const out: PropDef[] = []
  let guard = 0
  while (out.length < 96 && guard < 5000) {
    guard++
    const x = KRAJ.x + 240 + rnd() * (7760 - KRAJ.x - 300)
    const y = 260 + rnd() * 3700
    if (disputedBlocked(x, y)) continue
    if (out.some((t) => Math.hypot(t.pos.x - x, t.pos.y - y) < 80)) continue
    out.push({ kind: 'shrub', pos: { x: Math.round(x), y: Math.round(y) }, r: 6, seed: Math.floor(rnd() * 9999) })
  }
  return out
}

/** Каменные россыми Кряжа. */
function buildDisputedRocks(): PropDef[] {
  const rnd = lcg(5521)
  const out: PropDef[] = []
  let guard = 0
  while (out.length < 40 && guard < 4000) {
    guard++
    const x = KRAJ.x + 230 + rnd() * (7760 - KRAJ.x - 290)
    const y = 260 + rnd() * 3720
    if (disputedBlocked(x, y)) continue
    if (out.some((t) => Math.hypot(t.pos.x - x, t.pos.y - y) < 120)) continue
    out.push({ kind: 'rock', pos: { x: Math.round(x), y: Math.round(y) }, r: 9 + Math.floor(rnd() * 9), solid: true, seed: Math.floor(rnd() * 9999) })
  }
  return out
}

/** Живые деревья Рощи: id'шники — выгорают по shift-механике. */
const GROVE_TREES: Array<{ id: string; dx: number; dy: number }> = [
  { id: 'gt1', dx: -160, dy: -40 },
  { id: 'gt2', dx: -120, dy: 90 },
  { id: 'gt3', dx: -200, dy: 160 },
  { id: 'gt4', dx: 130, dy: -60 },
  { id: 'gt5', dx: 190, dy: 70 },
  { id: 'gt6', dx: 110, dy: 170 },
  { id: 'gt7', dx: -60, dy: 220 },
  { id: 'gt8', dx: 40, dy: -180 },
  { id: 'gt9', dx: -230, dy: -130 },
  { id: 'gt10', dx: 230, dy: 200 },
]

/** Обугленные стволы: появляются только после groveBurned. */
const BURNT_TREES: Array<{ id: string; dx: number; dy: number }> = [
  { id: 'bt1', dx: -150, dy: -30 },
  { id: 'bt2', dx: -110, dy: 100 },
  { id: 'bt3', dx: 140, dy: -50 },
  { id: 'bt4', dx: 180, dy: 90 },
  { id: 'bt5', dx: -50, dy: 210 },
  { id: 'bt6', dx: 30, dy: -170 },
  { id: 'bt7', dx: -220, dy: 150 },
]

export const DISPUTED_PROPS: PropDef[] = [
  // Врата Спорных Земель (две стороны Рубежного Кряжа)
  { id: 'dgate_f', kind: 'portal', pos: { x: DF_GATES.frostSide.x, y: DF_GATES.frostSide.y }, r: 40, solid: false, seed: 191 },
  { id: 'dgate_d', kind: 'portal', pos: { x: DF_GATES.disputed.x, y: DF_GATES.disputed.y }, r: 40, solid: false, seed: 192 },
  // --- Роща Садовников: хижина, шатры беженцев, костёр (исчезают при выжигании) ---
  { id: 'grove_hut', kind: 'house', pos: { x: GROVE.pos.x - 60, y: GROVE.pos.y + 120 }, w: 130, h: 70, solid: true, seed: 193 },
  { id: 'ref_tent1', kind: 'tent', pos: { x: GROVE.pos.x + 90, y: GROVE.pos.y + 110 }, w: 56, h: 42, solid: true, seed: 194 },
  { id: 'ref_tent2', kind: 'tent', pos: { x: GROVE.pos.x + 150, y: GROVE.pos.y + 30 }, w: 52, h: 40, solid: true, seed: 195 },
  { id: 'ref_tent3', kind: 'tent', pos: { x: GROVE.pos.x - 160, y: GROVE.pos.y + 30 }, w: 54, h: 42, solid: true, seed: 196 },
  { id: 'grove_fire', kind: 'fire', pos: { x: GROVE.pos.x + 10, y: GROVE.pos.y + 60 }, r: 10, solid: true, seed: 197 },
  // Живые деревья Рощи (grove_tree — крупные, с золотой листвой)
  ...GROVE_TREES.map((t) => ({ id: t.id, kind: 'grove_tree' as const, pos: { x: GROVE.pos.x + t.dx, y: GROVE.pos.y + t.dy }, r: 15, solid: true, seed: 198 + t.dx })),
  // Обугленные стволы и пир-костёр (видны только после выжигания рощи)
  ...BURNT_TREES.map((t) => ({ id: t.id, kind: 'burnt_tree' as const, pos: { x: GROVE.pos.x + t.dx, y: GROVE.pos.y + t.dy }, r: 11, solid: true, seed: 230 + t.dx })),
  { id: 'grove_pyre', kind: 'fire', pos: { x: GROVE_HEART.x, y: GROVE_HEART.y + 20 }, r: 14, solid: true, seed: 240 },
  // Цветы Семени и фонари (видны только после благословения)
  ...[[-90, -70], [70, -90], [110, 40], [-130, 20], [-40, 150], [40, 120], [-170, 90], [170, -20]].map(([dx, dy], i) => ({
    id: 'fl' + (i + 1),
    kind: 'bloom' as const,
    pos: { x: GROVE.pos.x + dx, y: GROVE.pos.y + dy },
    r: 5,
    solid: false,
    seed: 241 + i,
  })),
  ...[[-70, -110], [80, 80], [-140, 140]].map(([dx, dy], i) => ({
    id: 'lan' + (i + 1),
    kind: 'lantern' as const,
    pos: { x: GROVE.pos.x + dx, y: GROVE.pos.y + dy },
    r: 6,
    solid: false,
    seed: 251 + i,
  })),
  // --- Обугленный погост: часовня-руина, свечи ---
  { kind: 'stone', pos: { x: SHRINE.pos.x - 40, y: SHRINE.pos.y - 30 }, r: 13, solid: true, seed: 261 },
  { kind: 'stone', pos: { x: SHRINE.pos.x + 44, y: SHRINE.pos.y - 20 }, r: 12, solid: true, seed: 262 },
  { kind: 'carcass', pos: { x: SHRINE.pos.x + 8, y: SHRINE.pos.y + 34 }, r: 12, solid: false, seed: 263 },
  { kind: 'deadtree', pos: { x: SHRINE.pos.x - 80, y: SHRINE.pos.y + 40 }, r: 10, solid: true, seed: 264 },
  // --- Лагерь Пепельной Орды: шатры, тотемы, костры (исчезают при разгроме) ---
  { id: 'hc_tent1', kind: 'tent', pos: { x: HORDE_CAMP.pos.x - 110, y: HORDE_CAMP.pos.y - 60 }, w: 62, h: 46, solid: true, seed: 265 },
  { id: 'hc_tent2', kind: 'tent', pos: { x: HORDE_CAMP.pos.x + 100, y: HORDE_CAMP.pos.y - 80 }, w: 58, h: 44, solid: true, seed: 266 },
  { id: 'hc_tent3', kind: 'tent', pos: { x: HORDE_CAMP.pos.x + 40, y: HORDE_CAMP.pos.y + 100 }, w: 60, h: 46, solid: true, seed: 267 },
  { id: 'hc_tent4', kind: 'tent', pos: { x: HORDE_CAMP.pos.x - 60, y: HORDE_CAMP.pos.y + 110 }, w: 54, h: 42, solid: true, seed: 268 },
  { id: 'tot1', kind: 'totem', pos: { x: HORDE_CAMP.pos.x - 150, y: HORDE_CAMP.pos.y + 20 }, r: 10, solid: true, seed: 269 },
  { id: 'tot2', kind: 'totem', pos: { x: HORDE_CAMP.pos.x + 160, y: HORDE_CAMP.pos.y + 30 }, r: 10, solid: true, seed: 270 },
  { id: 'hc_fire1', kind: 'fire', pos: { x: HORDE_CAMP.pos.x - 20, y: HORDE_CAMP.pos.y - 10 }, r: 13, solid: true, seed: 271 },
  { id: 'hc_fire2', kind: 'fire', pos: { x: HORDE_CAMP.pos.x + 90, y: HORDE_CAMP.pos.y + 60 }, r: 11, solid: true, seed: 272 },
  // Обломки разбитого лагеря (видны после hordeBroken)
  ...[[-100, -40], [80, -70], [20, 90], [-60, 130], [140, 20]].map(([dx, dy], i) => ({
    id: 'rub' + (i + 1),
    kind: 'rubble' as const,
    pos: { x: HORDE_CAMP.pos.x + dx, y: HORDE_CAMP.pos.y + dy },
    r: 12,
    solid: true,
    seed: 273 + i,
  })),
  ...buildHeathShrubs(),
  ...buildDisputedRocks(),
]

// ---------------- NPC Спорных Земель ----------------

export const DISPUTED_NPCS = [
  { id: 'ulva', name: 'Ульва', role: 'Хранительница Рощи', pos: { x: GROVE_HEART.x, y: GROVE_HEART.y }, color: '#9fb8a4', dialogue: 'disputed_ulva' },
  { id: 'prusha', name: 'Пруша', role: 'Беженка из Колонии', pos: { x: GROVE.pos.x + 60, y: GROVE.pos.y + 140 }, color: '#d9a441', dialogue: 'disputed_prusha' },
  { id: 'tarben', name: 'Тарбен', role: 'Следопыт пустоши', pos: { x: 7080, y: 1470 }, color: '#b08356', dialogue: 'disputed_tarben' },
  { id: 'gharz', name: 'Гхарз Кровавый Пёс', role: 'Вожак Пепельной Орды', pos: { x: HORDE_CAMP.pos.x - 20, y: HORDE_CAMP.pos.y - 60 }, color: '#b0563a', dialogue: 'disputed_gharz' },
]

// ---------------- Спавны и интеракты ----------------

export const DISPUTED_SPAWN_ZONES: SpawnZoneDef[] = [
  { id: 'disp_raider_a', enemy: 'raider', center: { x: 7050, y: 1900 }, radius: 200, max: 3, respawnSec: 48 },
  { id: 'disp_raider_b', enemy: 'raider', center: { x: 7540, y: 2450 }, radius: 190, max: 3, respawnSec: 52 },
  { id: 'disp_hexer', enemy: 'hexer', center: { x: 7300, y: 2350 }, radius: 170, max: 2, respawnSec: 60 },
]

export const DISPUTED_INTERACTABLES: InteractableDef[] = [
  {
    id: 'dgate_frost',
    name: 'Врата Спорных Земель',
    pos: { x: DF_GATES.frostSide.x, y: DF_GATES.frostSide.y },
    r: 64,
    prompt: 'Войти',
    kind: 'portal',
    action: 'portal:disputed',
  },
  {
    id: 'dgate_disputed',
    name: 'Врата Спорных Земель',
    pos: { x: DF_GATES.disputed.x, y: DF_GATES.disputed.y },
    r: 64,
    prompt: 'Войти',
    kind: 'portal',
    action: 'portal:frost',
  },
  // Узлы беженцев (побочный Пруши)
  ...DIG_SPOTS.map((d) => ({
    id: d.id,
    name: 'Узел беженцев',
    pos: d.pos,
    r: 40,
    prompt: 'Откопать',
    kind: 'clue' as const,
    action: 'dig:disputed_hoard',
    cond: 'quest.disputed_hoard==1',
  })),
  // Семя Разлома в сердце Рощи (осмотреть)
  {
    id: 'rift_seed',
    name: 'Семя Разлома',
    pos: { x: GROVE_HEART.x - 34, y: GROVE_HEART.y + 26 },
    r: 44,
    prompt: 'Осмотреть',
    kind: 'altar',
    action: 'dialogue:disputed_seed',
    cond: 'quest.disputed>=1',
  },
]

export const DISPUTED_AREAS: Array<{ id: string; name: string; rect: [number, number, number, number] }> = [
  { id: 'disputed', name: 'Спорные Земли', rect: [6900, 0, 860, 4200] },
  { id: 'grove', name: 'Роща Садовников', rect: [7080, 900, 460, 460] },
  { id: 'shrine', name: 'Обугленный погост', rect: [7330, 1890, 360, 320] },
  { id: 'horde', name: 'Лагерь Пепельной Орды', rect: [7010, 2700, 480, 420] },
]

export const DISPUTED_MARKERS: Array<{ pos: Vec; label: string }> = [
  { pos: { x: DF_GATES.disputed.x, y: DF_GATES.disputed.y }, label: 'Врата Спорных Земель' },
  { pos: { ...GROVE.pos }, label: 'Роща Садовников' },
  { pos: { ...SHRINE.pos }, label: 'Обугленный погост' },
  { pos: { ...HORDE_CAMP.pos }, label: 'Лагерь Пепельной Орды' },
]
