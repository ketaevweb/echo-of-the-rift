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

/** Текущее состояние (с учётом webkit-префикса iOS-планшетов). */
export function isFullscreen(): boolean {
  if (typeof document === 'undefined') return false
  return Boolean(document.fullscreenElement || (document as Document & { webkitFullscreenElement?: Element }).webkitFullscreenElement)
}

/** Переключить полный экран (только по жесту пользователя — иначе браузер отклонит). */
export function toggleFullscreen(): void {
  const el = document.documentElement as HTMLElement & {
    webkitRequestFullscreen?: () => void
  }
  const doc = document as Document & { webkitExitFullscreen?: () => void }
  try {
    if (isFullscreen()) {
      if (doc.exitFullscreen) void doc.exitFullscreen().catch(() => {})
      else doc.webkitExitFullscreen?.()
    } else if (el.requestFullscreen) {
      void el.requestFullscreen({ navigationUI: 'hide' }).catch(() => {})
    } else {
      el.webkitRequestFullscreen?.()
    }
  } catch {
    /* браузер отклонил запрос — молча */
  }
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
