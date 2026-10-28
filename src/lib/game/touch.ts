// ============================================================
// ЭХО РАЗЛОМА — сенсорное управление (v2.0, GDD 06 §10)
// Единый источник тач-состояния: детекция устройства/режима,
// аналоговый вектор левого джойстика (экранные оси: x — вправо,
// y — вниз) и служебные флаги. Кнопки действий живут в
// components/game/TouchControls.tsx и вызывают те же системы,
// что клавиатура (input.ts triggerAction / castAbility).
// ============================================================

import type { TouchMode } from './settings'

/** Аналоговый вектор джойстика в ЭКРАННЫХ осях (x — вправо, y — вниз),
 *  компоненты −1..1. updatePlayer превращает его в fw/sd относительно камеры. */
export interface JoyState {
  active: boolean
  x: number
  y: number
}

const joy: JoyState = { active: false, x: 0, y: 0 }

/** Текущий вектор джойстика (только чтение — мутирует TouchControls). */
export function touchJoy(): JoyState {
  return joy
}

/** Сбросить джойстик (при открытии панели/диалога — палец «отпущен»). */
export function resetTouchJoy() {
  joy.active = false
  joy.x = 0
  joy.y = 0
}

// ---------------- Детекция ----------------

let coarseQuery: MediaQueryList | null = null
let sawTouch = false

function detectCoarse(): boolean {
  if (typeof window === 'undefined') return false
  if (!coarseQuery) {
    coarseQuery = window.matchMedia('(pointer: coarse)')
  }
  return coarseQuery.matches || 'ontouchstart' in window
}

/** Был ли хоть один реальный touchstart в сессии (ноутбук с тачскрином). */
export function markTouchSeen() {
  sawTouch = true
}

/** Одноразовая установка слушателей детекции (вызывается из GameView). */
let detectionBound = false
export function initTouchDetection() {
  if (detectionBound || typeof window === 'undefined') return
  detectionBound = true
  window.addEventListener(
    'touchstart',
    () => markTouchSeen(),
    { passive: true, once: true },
  )
}

/** Итоговое решение «показывать ли сенсорные контролы» для текущей сессии. */
export function resolveTouchEnabled(mode: TouchMode): boolean {
  if (mode === 'on') return true
  if (mode === 'off') return false
  return detectCoarse() || sawTouch
}

/** Признак сенсорного устройства (для подсказок, не для переключения UI). */
export function isTouchDevice(): boolean {
  return detectCoarse()
}
