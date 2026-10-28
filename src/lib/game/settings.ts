// ============================================================
// ЭХО РАЗЛОМА — настройки (Фаза 8, GDD 05/06)
// Единый источник пресетов графики и громкостей звука.
// Хранится в localStorage, зеркалится в zustand-сторе (store.ts).
// ============================================================

/** Пресет качества графики. 'auto' — авто-даунгрейд по FPS (GDD 06 §7). */
export type QualityId = 'low' | 'medium' | 'high' | 'auto'
/** Действующий пресет (результат auto-даунгрейда) — только 'low'|'medium'|'high'. */
export type EffQuality = Exclude<QualityId, 'auto'>

/** v2.0: режим сенсорного управления. 'auto' — по устройству (pointer: coarse / touchstart). */
export type TouchMode = 'auto' | 'on' | 'off'

export interface GameSettings {
  quality: QualityId
  musicVol: number
  sfxVol: number
  ambVol: number
  muted: boolean
  /** v1.1: озвучка ключевых реплик (TTS, 2 голоса). */
  voiceOn: boolean
  voiceVol: number
  /** v2.0: мобильное управление (джойстик + сенсорные кнопки). */
  touch: TouchMode
}

export const SETTINGS_KEY = 'echo-rift-settings'

export const DEFAULT_SETTINGS: GameSettings = {
  quality: 'auto',
  musicVol: 0.55,
  sfxVol: 0.85,
  ambVol: 0.8,
  muted: false,
  voiceOn: true,
  voiceVol: 0.8,
  touch: 'auto',
}

export function readSettings(): GameSettings {
  if (typeof window === 'undefined') return { ...DEFAULT_SETTINGS }
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    const p = JSON.parse(raw) as Partial<GameSettings>
    return {
      quality: p.quality === 'low' || p.quality === 'medium' || p.quality === 'high' || p.quality === 'auto' ? p.quality : DEFAULT_SETTINGS.quality,
      musicVol: clamp01(p.musicVol, DEFAULT_SETTINGS.musicVol),
      sfxVol: clamp01(p.sfxVol, DEFAULT_SETTINGS.sfxVol),
      ambVol: clamp01(p.ambVol, DEFAULT_SETTINGS.ambVol),
      muted: typeof p.muted === 'boolean' ? p.muted : DEFAULT_SETTINGS.muted,
      voiceOn: typeof p.voiceOn === 'boolean' ? p.voiceOn : DEFAULT_SETTINGS.voiceOn,
      voiceVol: clamp01(p.voiceVol, DEFAULT_SETTINGS.voiceVol),
      touch: p.touch === 'on' || p.touch === 'off' || p.touch === 'auto' ? p.touch : DEFAULT_SETTINGS.touch,
    }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function writeSettings(s: GameSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s))
  } catch {
    /* приватный режим — игнорируем */
  }
}

function clamp01(v: unknown, def: number): number {
  return typeof v === 'number' && isFinite(v) ? Math.max(0, Math.min(1, v)) : def
}

/** Порядок пресетов для авто-даунгрейда: high → medium → low. */
export function stepDown(q: EffQuality): EffQuality {
  return q === 'high' ? 'medium' : 'low'
}

export const QUALITY_NAME: Record<EffQuality, string> = {
  low: 'Низкое',
  medium: 'Среднее',
  high: 'Высокое',
}

/** v2.0: подписи режима сенсорного управления (для настроек). */
export const TOUCH_NAME: Record<TouchMode, string> = {
  auto: 'Авто',
  on: 'Вкл',
  off: 'Выкл',
}

/** Порядок режимов для цикла в настройках. */
export const TOUCH_MODES: TouchMode[] = ['auto', 'on', 'off']
