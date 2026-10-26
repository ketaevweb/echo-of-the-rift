// ============================================================
// ЭХО РАЗЛОМА — heightmap (Phase 1)
// Детерминированная функция высоты и цвета террейна.
// Мир игры живёт в плоскости (x, y) — в 3D это (x, z),
// высота — ось Y. Используется и для меша, и для постановки
// сущностей/камеры на землю каждый кадр (дешёвая, без аллокаций).
// ============================================================

import { LAKE, ROADS, WORLD, GATES, POOLS, RIDGE } from '../data/world'

// ---------------- Детерминированный шум ----------------

function hash2(ix: number, iy: number): number {
  let h = (ix * 374761393 + iy * 668265263) | 0
  h = (h ^ (h >>> 13)) | 0
  h = Math.imul(h, 1274126177)
  h = (h ^ (h >>> 16)) | 0
  return (h >>> 0) / 4294967296
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t)
}

function valueNoise(x: number, y: number): number {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  const a = hash2(ix, iy)
  const b = hash2(ix + 1, iy)
  const c = hash2(ix, iy + 1)
  const d = hash2(ix + 1, iy + 1)
  const ux = smooth(fx)
  const uy = smooth(fy)
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy
}

function fbm(x: number, y: number, octaves: number): number {
  let sum = 0
  let amp = 1
  let freq = 1
  let norm = 0
  for (let i = 0; i < octaves; i++) {
    sum += valueNoise(x * freq, y * freq) * amp
    norm += amp
    amp *= 0.5
    freq *= 2.07
  }
  return sum / norm
}

// ---------------- Расстояние до дороги ----------------

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
  for (const road of ROADS) {
    for (let i = 0; i < road.length - 1; i++) {
      const d = distToSeg(x, y, road[i].x, road[i].y, road[i + 1].x, road[i + 1].y)
      if (d < best) best = d
    }
  }
  return best
}

// ---------------- Ключевые зоны ----------------

const VILLAGE = { x: 960, y: 1560, rx: 300, ry: 210 }
export const RIFT = { x: 2950, y: 280, r: 420 }
const CAMP = { x: 2590, y: 1650, r: 170 }
const STONES = { x: 2200, y: 660, r: 160 }

export const WATER_LEVEL = -1.6

function inEllipse(px: number, py: number, ex: number, ey: number, rx: number, ry: number): number {
  const dx = (px - ex) / rx
  const dy = (py - ey) / ry
  return Math.sqrt(dx * dx + dy * dy) // 1.0 на границе
}

/** Плавный спад 1→0 на кромке [edge..edge+fall]. */
function falloff(t: number, edge: number, fall: number): number {
  if (t <= edge) return 1
  if (t >= edge + fall) return 0
  return 1 - smooth((t - edge) / fall)
}

// ---------------- Высота ----------------

/**
 * Высота рельефа в мировой точке. Вызывается часто
 * (каждый кадр для каждой сущности + камера), поэтому без аллокаций.
 */
export function heightAt(x: number, y: number): number {
  // Базовые холмы: крупные волны + мелкая рябь
  let h = (fbm(x / 520, y / 520, 4) - 0.5) * 26
  h += (fbm(x / 130 + 7.3, y / 130 + 2.1, 2) - 0.5) * 7

  // Горные стены по краям света (визуальная граница мира)
  const edge = Math.min(x, y, WORLD.w - x, WORLD.h - y)
  if (edge < 340) {
    const t = falloff(edge, 150, 190)
    h += t * t * 90
  }

  // Плоские площадки: деревня, лагерь, Камни Древних
  const tv = inEllipse(x, y, VILLAGE.x, VILLAGE.y, VILLAGE.rx, VILLAGE.ry)
  const fv = falloff(tv, 0.75, 0.6)
  h = h * (1 - fv) + 2.2 * fv

  const tc = Math.hypot(x - CAMP.x, y - CAMP.y)
  const fc = falloff(tc, CAMP.r * 0.8, CAMP.r * 0.5)
  h = h * (1 - fc) + 3.4 * fc

  const ts = Math.hypot(x - STONES.x, y - STONES.y)
  const fs = falloff(ts, STONES.r * 0.7, STONES.r * 0.6)
  h = h * (1 - fs) + 5.5 * fs

  // Озеро: чаша ниже уровня воды
  const tl = Math.hypot(x - LAKE.x, y - LAKE.y)
  const fl = falloff(tl, LAKE.r * 0.72, LAKE.r * 0.75)
  const bowl = -3.4 - 1.6 * (1 - Math.min(1, tl / LAKE.r))
  h = h * (1 - fl) + bowl * fl

  // Разлом: воронка с рваными краями
  const tr = Math.hypot(x - RIFT.x, y - RIFT.y)
  if (tr < RIFT.r) {
    const jag = (fbm(x / 60 + 31, y / 60 + 17, 2) - 0.5) * 5
    const fr = falloff(tr, RIFT.r * 0.42, RIFT.r * 0.58)
    const crater = -2.0 + (tr / RIFT.r) * 3 + jag * fr
    h = h * (1 - fr) + crater * fr
  }

  // --- Фаза 3: Хребет и Вельд ---
  // Хребет между долиной и Вельдом (движение блокирует systems/movement)
  const dr = Math.abs(y - RIDGE.y)
  if (dr < 330) {
    const jag = (fbm(x / 110 + 51, y / 110 + 7, 2) - 0.5) * 10
    const t = falloff(dr, 70, 260)
    h += t * t * (56 + jag)
  }
  // Вельд: болотистая низина с омутами
  if (y > RIDGE.y + 40) {
    const sw = falloff(y - (RIDGE.y + 40), 0, 240)
    const swamp = (fbm(x / 340 + 13, y / 340 + 3, 3) - 0.5) * 6 + 0.9
    h = h * (1 - sw) + swamp * sw
    for (const p of POOLS) {
      const dp = Math.hypot(x - p.x, y - p.y)
      const fp = falloff(dp, p.r * 0.72, p.r * 0.6)
      if (fp > 0) {
        const bowl = -2.9 - 1.2 * (1 - Math.min(1, dp / p.r))
        h = h * (1 - fp) + bowl * fp
      }
    }
  }
  // Плоские пятачки у Врат Тумана (по обе стороны хребта)
  for (const g of [GATES.valley, GATES.veld]) {
    const tg = Math.hypot(x - g.x, y - g.y)
    const fg = falloff(tg, 90, 80)
    h = h * (1 - fg) + 1.6 * fg
  }

  return h
}

// ---------------- Цвет (vertex colors) ----------------

// Палитра — тёплая северная тайга, без синих оттенков
const C_GRASS: [number, number, number] = [0.24, 0.33, 0.15]
const C_GRASS2: [number, number, number] = [0.18, 0.26, 0.12]
const C_DRY: [number, number, number] = [0.38, 0.35, 0.2]
const C_ROAD: [number, number, number] = [0.3, 0.24, 0.15]
const C_DIRT: [number, number, number] = [0.42, 0.34, 0.22]
const C_SNOW: [number, number, number] = [0.85, 0.87, 0.85]
const C_ASH: [number, number, number] = [0.32, 0.27, 0.34]
const C_EMBER: [number, number, number] = [0.42, 0.2, 0.24]
const C_SAND: [number, number, number] = [0.62, 0.56, 0.4]
const C_ROCK: [number, number, number] = [0.42, 0.42, 0.4]
// Палитра Вельда (Фаза 3): торф, тина, мёртвые пятна
const C_PEAT: [number, number, number] = [0.19, 0.22, 0.13]
const C_PEAT2: [number, number, number] = [0.14, 0.16, 0.10]
const C_MURK: [number, number, number] = [0.25, 0.27, 0.16]
const C_DEAD: [number, number, number] = [0.33, 0.32, 0.25]
const C_MUD: [number, number, number] = [0.22, 0.18, 0.12]

function lerp3(a: [number, number, number], b: [number, number, number], t: number, out: [number, number, number]) {
  out[0] = a[0] + (b[0] - a[0]) * t
  out[1] = a[1] + (b[1] - a[1]) * t
  out[2] = a[2] + (b[2] - a[2]) * t
}

const tmpA: [number, number, number] = [0, 0, 0]
const tmpB: [number, number, number] = [0, 0, 0]

/** Цвет террейна в точке — запекается в vertex colors чанков. */
export function terrainColorAt(x: number, y: number, h: number, out: [number, number, number]): void {
  // Крупные пятна травы
  const patch = fbm(x / 240 + 3.7, y / 240 + 9.1, 3)
  lerp3(C_GRASS, C_GRASS2, patch, tmpA)

  // Сухостой/вытоптанность вторым шумом
  const dry = fbm(x / 380 + 21, y / 380 + 4, 2)
  lerp3(tmpA, C_DRY, Math.max(0, dry - 0.55) * 1.4, tmpA)

  // Высота → скалы
  if (h > 26) lerp3(tmpA, C_ROCK, Math.min(1, (h - 26) / 30), tmpA)

  // Север — снежная дымка
  const snowT = falloff(y, 620, 380) * 0.85
  lerp3(tmpA, C_SNOW, snowT, tmpA)

  // Вельд — торф и мёртвая тина (Фаза 3)
  if (y > RIDGE.y - 120) {
    const sw = falloff(y - (RIDGE.y - 120), 0, 300)
    if (sw > 0) {
      const peat = fbm(x / 200 + 41, y / 200 + 17, 3)
      lerp3(tmpA, peat > 0.5 ? C_PEAT : C_PEAT2, sw, tmpB)
      tmpA[0] = tmpB[0]
      tmpA[1] = tmpB[1]
      tmpA[2] = tmpB[2]
      lerp3(tmpA, C_MURK, Math.max(0, dry - 0.42) * sw, tmpA)
      lerp3(tmpA, C_DEAD, Math.max(0, 0.52 - dry) * 0.9 * sw, tmpA)
    }
    // Омуты — тёмная грязь по кромке
    for (const p of POOLS) {
      const dp = Math.hypot(x - p.x, y - p.y)
      if (dp < p.r + 26) {
        lerp3(tmpA, C_MUD, falloff(dp, p.r * 0.8, p.r * 0.5) * 0.9, tmpA)
      }
    }
  }
  // Хребет — голый камень
  const drg = Math.abs(y - RIDGE.y)
  if (drg < 320) {
    lerp3(tmpA, C_ROCK, falloff(drg, 70, 250) * 0.85, tmpA)
  }

  // Разлом — пепел и тлеющие трещины
  const tr = Math.hypot(x - RIFT.x, y - RIFT.y)
  if (tr < RIFT.r) {
    const t = falloff(tr, RIFT.r * 0.35, RIFT.r * 0.65)
    const crack = fbm(x / 46 + 13, y / 46 + 29, 2)
    lerp3(tmpA, crack > 0.62 ? C_EMBER : C_ASH, t, tmpB)
    tmpA[0] = tmpB[0]
    tmpA[1] = tmpB[1]
    tmpA[2] = tmpB[2]
  }

  // Берег озера — песок
  const tl = Math.hypot(x - LAKE.x, y - LAKE.y)
  const sandT = falloff(tl, LAKE.r + 6, 55)
  lerp3(tmpA, C_SAND, sandT * (1 - falloff(tl, LAKE.r * 0.9, 30)), tmpA)

  // Дороги
  const rd = roadDist(x, y)
  if (rd < 70) {
    lerp3(tmpA, C_ROAD, falloff(rd, 20, 50) * 0.85, tmpA)
  }

  // Площадь деревни — утоптанная земля
  const tv = inEllipse(x, y, VILLAGE.x, VILLAGE.y, 165, 115)
  lerp3(tmpA, C_DIRT, falloff(tv, 0.72, 0.45), tmpA)

  // Пятно лагеря
  const tc = Math.hypot(x - CAMP.x, y - CAMP.y)
  lerp3(tmpA, C_DIRT, falloff(tc, 90, 70) * 0.9, tmpA)

  // Круг Камней
  const ts = Math.hypot(x - STONES.x, y - STONES.y)
  lerp3(tmpA, C_DIRT, falloff(ts, 100, 60) * 0.8, tmpA)

  // Лёгкая вариация, чтобы не было плоско
  const v = (hash2(Math.floor(x * 0.5), Math.floor(y * 0.5)) - 0.5) * 0.05
  out[0] = Math.max(0, Math.min(1, tmpA[0] + v))
  out[1] = Math.max(0, Math.min(1, tmpA[1] + v))
  out[2] = Math.max(0, Math.min(1, tmpA[2] + v))
}

/** Крутизна рельефа (для декора и будущих эффектов). */
export function slopeAt(x: number, y: number): number {
  const d = 6
  const hx = heightAt(x + d, y) - heightAt(x - d, y)
  const hy = heightAt(x, y + d) - heightAt(x, y - d)
  return Math.hypot(hx, hy) / (2 * d)
}
