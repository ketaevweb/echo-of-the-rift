// ============================================================
// ЭХО РАЗЛОМА — общие утилиты ядра (Phase 0.2)
// Чистые функции без состояния; ничего не знают о движке.
// ============================================================

/** Круглый коллайдер мира (дом/палатка/камень/озеро). */
export interface Collider {
  x: number
  y: number
  r: number
  propId?: string
}

/** Случайное число в диапазоне [a, b). */
export function rndRange(a: number, b: number) {
  return a + Math.random() * (b - a)
}

/** Бросок dN (1..sides). */
export function d(sides: number) {
  return 1 + Math.floor(Math.random() * sides)
}

/** Минимальная разница углов в радианах (0..PI). */
export function angleDiff(a: number, b: number) {
  let x = Math.abs(a - b) % (Math.PI * 2)
  if (x > Math.PI) x = Math.PI * 2 - x
  return x
}
