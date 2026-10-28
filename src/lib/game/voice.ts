// ============================================================
// ЭХО РАЗЛОМА — озвучка ключевых реплик (v1.1, GDD 04 §4.3; v2.3)
// v2.3: сначала браузерный speechSynthesis — ГОЛОС СИСТЕМЫ телефона
// (настоящий русский TTS, мгновенно и без акцента); бэкенд /api/tts
// (z-ai-web-dev-sdk только там) — fallback, если системного голоса
// нужного языка нет. Голоса male/female — маппинг спикеров VOICE_OF.
// Кэш blob-URL в памяти сессии; сервер кэширует WAV на диске
// (db/tts-cache). Ошибки глотаются — озвучка никогда не блокирует диалог.
// ============================================================

import { useGame } from './store'
import { getLocale } from './i18n'
import { browserSpeak, browserStopVoice, browserVoiceAvailable } from './browserVoice'

export type VoiceKind = 'male' | 'female'

/** Спикеры с голосом (ключевые реплики): пол → голос TTS. */
const VOICE_OF: Record<string, VoiceKind> = {
  // Мужские голоса
  Бьорн: 'male',
  Дорн: 'male',
  Торвальд: 'male',
  Грим: 'male',
  Брок: 'male',
  Йорв: 'male',
  Финн: 'male',
  Хран: 'male',
  'Мастер Ямы': 'male',
  'Пожиратель Бурь': 'male',
  'Пожиратель Эха': 'male',
  Ашер: 'male',
  // Женские голоса
  Кайя: 'female',
  Селена: 'female',
  Ирма: 'female',
  Альра: 'female',
  Кассия: 'female',
  Лиара: 'female',
  Ульва: 'female',
  Мирва: 'female',
  Нэри: 'female',
}

const MAX_LEN = 400
const cache = new Map<string, string>() // ключ (voice|text) → blob URL
const inflight = new Map<string, Promise<string | null>>()
let current: HTMLAudioElement | null = null
let lastReq = 0

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

/** Громкость текущей озвучки (0 — стоп воспроизведения звука). Вызывает applySettings. */
export function setVoiceVolume(v: number) {
  if (current) current.volume = clamp01(v)
  if (v <= 0) stopVoice()
}

/** Остановить текущую реплику (закрытие диалога, новая игра, титул). */
export function stopVoice() {
  lastReq++ // отмена всех незавершённых запросов
  browserStopVoice()
  if (current) {
    try {
      current.pause()
      current.src = ''
    } catch {
      /* уже мёртв */
    }
    current = null
  }
}

async function ensureUrl(key: string, voice: VoiceKind, text: string): Promise<string | null> {
  const hit = cache.get(key)
  if (hit) return hit
  const running = inflight.get(key)
  if (running) return running
  const job = (async () => {
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice }),
        signal: AbortSignal.timeout(30_000), // озвучка не должна висеть дольше 30 с
      })
      if (!res.ok) return null
      const blob = await res.blob()
      if (!blob.type.startsWith('audio/') || blob.size < 512) return null
      const url = URL.createObjectURL(blob)
      cache.set(key, url)
      return url
    } catch {
      return null
    } finally {
      inflight.delete(key)
    }
  })()
  inflight.set(key, job)
  return job
}

/**
 * Озвучить реплику узла диалога. Вызывается из setNode.
 * Голос есть только у ключевых спикеров (VOICE_OF); текст режется до 400 симв.
 * v2.3: сперва системный голос языка интерфейса (на RU-локали — русский TTS
 * телефона); fallback — бэкенд-TTS (китайские голоса SDK).
 */
export function speakLine(speaker: string, text: string) {
  if (typeof window === 'undefined') return
  const s = useGame.getState().settings
  if (!s.voiceOn || s.voiceVol <= 0) return
  const voice = VOICE_OF[speaker]
  if (!voice) return
  const clean = text.replace(/\s+/g, ' ').trim().slice(0, MAX_LEN)
  if (clean.length < 2) return
  const lang = getLocale() === 'en' ? 'en' : 'ru'
  const my = ++lastReq
  // 1) системный голос устройства — мгновенно, по-настоящему на языке игрока
  if (browserVoiceAvailable(lang)) {
    browserSpeak(clean, lang, voice, s.voiceVol)
    return
  }
  // 2) fallback: бэкенд-TTS (кэш blob)
  const key = `${voice}|${clean}`
  void (async () => {
    const url = await ensureUrl(key, voice, clean)
    if (!url || my !== lastReq) return
    stopVoice() // глушим предыдущую реплику
    const el = new Audio(url)
    el.volume = clamp01(useGame.getState().settings.voiceVol)
    current = el
    try {
      await el.play()
    } catch {
      if (current === el) current = null
    }
  })()
}

// E2E/отладочный хук: произнести реплику тем же путём, что игра
if (typeof window !== 'undefined') {
  ;(window as unknown as { __echoSpeak?: (speaker: string, text: string) => void }).__echoSpeak = (speaker, text) =>
    speakLine(speaker, text)
}
