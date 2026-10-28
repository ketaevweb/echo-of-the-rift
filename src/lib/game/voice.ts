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

/** Спикеры с голосом (ключевые реплики): пол → голос TTS.
 *  v2.4: полный ростер — раньше молчали все персонажи восточных доменов
 *  (Пруша/Тарбен/Гхарз, Мейра/Хольт/Ингрид/Эйнар, бортжурнал «Двенадцатого»)
 *  и предметные спикеры (алтари, доски, рог) — репорт «в двух последних
 *  доменах нет озвучки». Теперь говорит каждый, кто ведёт диалог. */
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
  // v2.4: восточные домены и реплики-предметы
  'Гхарз Кровавый Пёс': 'male',
  Тарбен: 'male',
  'Досент Хольт': 'male',
  Эйнар: 'male',
  'Бортжурнал «Двенадцатого»': 'male',
  'Доска объявлений': 'male',
  'Древний Алтарь': 'male',
  'Древняя плита': 'male',
  'Осколочный барьер': 'male',
  'Сигнальный рог': 'male',
  '???': 'male',
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
  // v2.4
  Пруша: 'female',
  'Командор Мейра': 'female',
  Ингрид: 'female',
  'Семя Разлома': 'female',
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

/** Зеркало для E2E/диагностики: кого и каким голосом взяли озвучивать. */
export const voiceState: { lastSpeaker: string | null; lastKind: VoiceKind | null; refused: string | null } = {
  lastSpeaker: null,
  lastKind: null,
  refused: null,
}

/**
 * Озвучить реплику узла диалога. Вызывается из setNode.
 * Голос есть у всех спикеров VOICE_OF; текст режется до 400 симв.
 * v2.3: сперва системный голос языка интерфейса (на RU-локали — русский TTS
 * телефона); fallback — бэкенд-TTS (китайские голоса SDK).
 */
export function speakLine(speaker: string, text: string) {
  if (typeof window === 'undefined') return
  const s = useGame.getState().settings
  if (!s.voiceOn || s.voiceVol <= 0) return
  const voice = VOICE_OF[speaker]
  if (!voice) {
    voiceState.refused = speaker
    return
  }
  voiceState.lastSpeaker = speaker
  voiceState.lastKind = voice
  voiceState.refused = null
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
  ;(window as unknown as { __echoVoiceState?: typeof voiceState }).__echoVoiceState = voiceState
}
