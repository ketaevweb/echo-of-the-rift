// ============================================================
// ЭХО РАЗЛОМА — i18n (v1.6 «Локализация I», GDD 06 §2)
// Gettext-подход: русский текст в коде остаётся КАНОНИЧЕСКИМ
// ключом; словарь EN (data/i18n-en.ts) отображает RU → EN.
// Правила:
//  • t('строка')            — перевод или сама строка (RU-фолбэк);
//  • t('шаблон {x}', vars)  — интерполяция {x} в ОБЕИХ локалях;
//  • t('контекст|строка')   — контекстный ключ 'контекст|строка',
//    фолбэк на перевод 'строка', затем на RU без префикса;
//  • локаль живёт в localStorage ('echo-rift-locale'), реактивна
//    для React через useLocale() (useSyncExternalStore — без
//    гидратационных рассинхронов), для движка — обычный t().
// Диалоговые деревья (data/dialogues.ts) сознательно НЕ
// переводятся в v1.6 — «оригинальная озвучка + локализованный
// интерфейс» (как релизы с RU VO + EN UI). Словарь расширяем.
// ============================================================

import { useSyncExternalStore } from 'react'
import { EN } from './data/i18n-en'

export type Locale = 'ru' | 'en'

const LOCALE_KEY = 'echo-rift-locale'

let current: Locale = 'ru'
let hydrated = false
const subs = new Set<() => void>()

function readStored(): Locale {
  if (typeof window === 'undefined') return 'ru'
  try {
    return localStorage.getItem(LOCALE_KEY) === 'en' ? 'en' : 'ru'
  } catch {
    return 'ru'
  }
}

/** Однократная инициализация с клиентом (модульный сайд-эффект, SSR-безопасно). */
if (typeof window !== 'undefined' && !hydrated) {
  hydrated = true
  current = readStored()
}

export function getLocale(): Locale {
  return current
}

export function setLocale(l: Locale): void {
  if (l === current) return
  current = l
  try {
    localStorage.setItem(LOCALE_KEY, l)
  } catch {
    /* приватный режим — игнорируем */
  }
  subs.forEach((fn) => fn())
}

export function subscribeLocale(fn: () => void): () => void {
  subs.add(fn)
  return () => subs.delete(fn)
}

/**
 * Перевод строки-ключа. Русский текст — канонический ключ.
 * Поддержка шаблонов: t('Уровень {n}!', { n: 5 }).
 * Поддержка контекста: t('journal|Назад') ищет 'journal|Назад', потом 'Назад'.
 */
export function t(s: string, vars?: Record<string, string | number>): string {
  let raw = s
  if (s.charCodeAt(0) === 35 /* # */) raw = s // зарезервировано
  const pipe = s.indexOf('|')
  if (pipe > 0) raw = s.slice(pipe + 1)
  let out: string
  if (current === 'en') {
    out = EN[s] ?? EN[raw] ?? raw
  } else {
    out = raw
  }
  if (vars) {
    for (const k of Object.keys(vars)) {
      out = out.split(`{${k}}`).join(String(vars[k]))
    }
  }
  return out
}

/** Снапшоты для useSyncExternalStore: сервер — 'ru', клиент — актуальная локаль. */
const clientSnapshot = () => current
const serverSnapshot = () => 'ru' as Locale

/** Реактивная локаль для компонентов (перерисовка при переключении). */
export function useLocale(): Locale {
  return useSyncExternalStore(subscribeLocale, clientSnapshot, serverSnapshot)
}
