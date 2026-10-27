// ============================================================
// ЭХО РАЗЛОМА — i18n (v1.6 «Локализация I» + v1.7 «Локализация II», GDD 06 §2)
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
// v1.7: диалоговые деревья (data/dialogues.ts) переведены — субтитры
// на языке интерфейса; TTS-озвучка остаётся русской (оригинальный VO).
// t() в диалоговом оверлее — только на точках отображения: ключи
// арта/романсов/сущностей остаются сырыми RU-именами. Словарь расширяем.
// ============================================================

import { useEffect, useSyncExternalStore } from 'react'
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

// v1.7: локаль читается из localStorage НЕ при импорте модуля, а ПОСЛЕ
// гидратации (первым смонтированным useLocale-подписчиком). SSR всегда
// рендерит RU-канон; клиент переключает пост-фактум — гидратационных
// рассинхронов нет (v1.6 читала localStorage до гидратации: при reload
// с locale=en тексты SSR (RU) расходились с первым рендером (EN)).

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
  // v1.7: первый mounted-подписчик применяет сохранённую локаль ПОСЛЕ гидратации.
  useEffect(() => {
    if (!hydrated) {
      hydrated = true
      const stored = readStored()
      if (stored !== current) {
        current = stored
        subs.forEach((fn) => fn())
      }
    }
  }, [])
  return useSyncExternalStore(subscribeLocale, clientSnapshot, serverSnapshot)
}
