'use client'

// ============================================================
// ЭХО РАЗЛОМА — полноэкранный режим (v2.1)
// Для игры в браузере на телефоне: разворот на весь экран прячет
// адресную строку и системные жесты браузера. На iOS Safari
// (iPhone) Fullscreen API для страницы недоступен — там кнопка
// не показывается, а почти весь экран достижим через
// «На экран “Домой”» (подсказка в настройках не нужна).
// ============================================================

import { useCallback, useSyncExternalStore } from 'react'

/** Поддерживается ли разворот страницы в полный экран. */
export function isFullscreenSupported(): boolean {
  if (typeof document === 'undefined') return false
  const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => void }
  return typeof el.requestFullscreen === 'function' || typeof el.webkitRequestFullscreen === 'function'
}

/** Сенсорное устройство (pointer: coarse / ontouchstart) — для авто-fullscreen на старте игры. */
function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia?.('(pointer: coarse)').matches || 'ontouchstart' in window
}

/** Текущее состояние (с учётом webkit-префикса iOS-планшетов). */
export function isFullscreen(): boolean {
  if (typeof document === 'undefined') return false
  return Boolean(document.fullscreenElement || (document as Document & { webkitFullscreenElement?: Element }).webkitFullscreenElement)
}

/** v2.2: попытка зафиксировать ландшафтную ориентацию (Android в fullscreen;
 *  iOS/десктоп её не поддерживают — молча игнорируем). */
function lockLandscape(): void {
  try {
    // телефон уже лежит боком — фиксируем; в портрете не мешаем
    if (window.innerWidth < window.innerHeight) return
    const so = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }
    void so?.lock?.('landscape')?.catch(() => {})
  } catch {
    /* не поддерживается — молча */
  }
}

function unlockOrientation(): void {
  try {
    screen.orientation?.unlock?.()
  } catch {
    /* не поддерживается — молча */
  }
}

/** Переключить полный экран (только по жесту пользователя — иначе браузер отклонит).
 *  v2.2: в ландшафте дополнительно фиксируем ориентацию, чтобы адресная строка
 *  и системные жесты не возвращались при случайном повороте. */
export function toggleFullscreen(): void {
  const el = document.documentElement as HTMLElement & {
    webkitRequestFullscreen?: () => void
  }
  const doc = document as Document & { webkitExitFullscreen?: () => void }
  try {
    if (isFullscreen()) {
      unlockOrientation()
      if (doc.exitFullscreen) void doc.exitFullscreen().catch(() => {})
      else doc.webkitExitFullscreen?.()
    } else if (el.requestFullscreen) {
      void el
        .requestFullscreen({ navigationUI: 'hide' })
        .then(() => lockLandscape())
        .catch(() => {})
    } else {
      el.webkitRequestFullscreen?.()
      lockLandscape()
    }
  } catch {
    /* браузер отклонил запрос — молча */
  }
}

/** v2.2: авто-fullscreen при старте игры на телефоне — игра запускается
 *  «как приложение»: адресная строка и системный UI прячутся без поиска
 *  кнопки в меню. Вызывается из обработчика клика по «Начать путь» —
 *  это валидный user-жест, требование браузеров соблюдено. */
export function autoFullscreenIfTouch(): void {
  if (typeof window === 'undefined') return
  if (isFullscreen() || !isFullscreenSupported() || !isTouchDevice()) return
  toggleFullscreen()
}

/** React-хук: [в полном экране, переключить, поддерживается].
 *  useSyncExternalStore: SSR-снапшот false, клиентский — реальное состояние —
 *  без гидратационного рассинхрона (useState-инициализаторы ломали SSR). */
function subscribeFs(cb: () => void): () => void {
  document.addEventListener('fullscreenchange', cb)
  document.addEventListener('webkitfullscreenchange', cb)
  return () => {
    document.removeEventListener('fullscreenchange', cb)
    document.removeEventListener('webkitfullscreenchange', cb)
  }
}
const noopSubscribe = (_cb: () => void) => () => {}
const getFsOn = () => isFullscreen()
const getFsSupported = () => isFullscreenSupported()
const getServer = () => false

export function useFullscreen(): [boolean, () => void, boolean] {
  const on = useSyncExternalStore(subscribeFs, getFsOn, getServer)
  const supported = useSyncExternalStore(noopSubscribe, getFsSupported, getServer)
  const toggle = useCallback(() => toggleFullscreen(), [])
  return [on, toggle, supported]
}
