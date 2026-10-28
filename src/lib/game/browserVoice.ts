// ============================================================
// ЭХО РАЗЛОМА — браузерная озвучка (v2.3)
// Web Speech API (speechSynthesis): реплики говорит ГОЛОС СИСТЕМЫ
// устройства — на телефонах это настоящий русский TTS (Google/TTS-движок
// ОС). Прежний бэкенд-пайплайн (/api/tts, z-ai-web-dev-sdk) использует
// китайские голоса xiaochen/tongtong — русский текст в них звучал
// «не по-русски» (репорт игрока). Теперь:
//   1) если у устройства есть голос нужного языка (ru/en) — говорим им
//      (мгновенно, без сети, без кэша);
//   2) если нет — fallback на бэкенд-TTS (voice.ts/combatVoice.ts).
// Пол не различается надёжно — компенсируем высотой тона (pitch).
// ============================================================

export type VoiceGender = 'male' | 'female'

let voices: SpeechSynthesisVoice[] = []
let voicesHooked = false
/** Зеркало для E2E/диагностики: какой путь озвучки реально работает. */
export const browserVoiceState: { supported: boolean; lastVoice: string | null; lastLang: string | null } = {
  supported: typeof window !== 'undefined' && 'speechSynthesis' in window,
  lastVoice: null,
  lastLang: null,
}

function refreshVoices() {
  if (!browserVoiceState.supported) return
  try {
    voices = window.speechSynthesis.getVoices()
  } catch {
    voices = []
  }
}

/** Голоса приходят асинхронно — подписка один раз на сессию. */
function ensureVoices() {
  if (!browserVoiceState.supported) return
  refreshVoices()
  if (voicesHooked) return
  voicesHooked = true
  try {
    window.speechSynthesis.addEventListener('voiceschanged', refreshVoices)
  } catch {
    /* старые WebKit — без addEventListener */
    window.speechSynthesis.onvoiceschanged = refreshVoices
  }
}

/** Выбрать голос языка: системный TTS телефона обычно «Google русский» и т.п. */
function pickVoice(langPrefix: 'ru' | 'en'): SpeechSynthesisVoice | null {
  ensureVoices()
  if (voices.length === 0) refreshVoices()
  const byLang = voices.filter((v) => v.lang.toLowerCase().startsWith(langPrefix))
  if (byLang.length === 0) return null
  // предпочтения: локальные движки не требуют сети и стартуют мгновенно
  const preferred = /google|yandex|milena|yuri|tatyana|alena|dmitry|samantha|daniel|karen/i
  return byLang.find((v) => preferred.test(v.name)) ?? byLang[0]
}

/** Есть ли голос нужного языка (без попытки говорить). */
export function browserVoiceAvailable(langPrefix: 'ru' | 'en'): boolean {
  if (!browserVoiceState.supported) return false
  return pickVoice(langPrefix) !== null
}

let currentUtterance: SpeechSynthesisUtterance | null = null
/** onended колбэк владельца (combatVoice сбрасывает флаг playing). */
let onDone: (() => void) | null = null

/** Остановить текущую реплику браузерного синтеза. */
export function browserStopVoice() {
  onDone = null
  currentUtterance = null
  if (!browserVoiceState.supported) return
  try {
    window.speechSynthesis.cancel()
  } catch {
    /* уже молчит */
  }
}

/**
 * Сказать текст голосом системы. Возвращает false, если браузерный синтез
 * недоступен/нет голоса нужного языка — вызывающий уходит в fallback.
 * onEnded — колбэк по завершении (для флага playing у барок).
 */
export function browserSpeak(
  text: string,
  langPrefix: 'ru' | 'en',
  gender: VoiceGender,
  volume: number,
  onEnded?: () => void,
): boolean {
  if (!browserVoiceState.supported) return false
  const voice = pickVoice(langPrefix)
  if (!voice) return false
  try {
    browserStopVoice()
    const u = new SpeechSynthesisUtterance(text)
    u.voice = voice
    u.lang = voice.lang
    u.volume = Math.max(0, Math.min(1, volume))
    u.rate = 1.0
    // пол голоса системой не гарантирован — тон акцентирует (жен. выше, муж. ниже)
    u.pitch = gender === 'female' ? 1.1 : 0.92
    onDone = onEnded ?? null
    u.onend = () => {
      if (currentUtterance === u) {
        currentUtterance = null
        const cb = onDone
        onDone = null
        cb?.()
      }
    }
    u.onerror = () => {
      if (currentUtterance === u) {
        currentUtterance = null
        const cb = onDone
        onDone = null
        cb?.()
      }
    }
    currentUtterance = u
    browserVoiceState.lastVoice = voice.name
    browserVoiceState.lastLang = voice.lang
    window.speechSynthesis.speak(u)
    return true
  } catch {
    currentUtterance = null
    return false
  }
}

/** Зеркало для E2E: сколько голосов видно, какой выбран. */
export function __echoBrowserVoice() {
  ensureVoices()
  return { ...browserVoiceState, voices: voices.length }
}

if (typeof window !== 'undefined') {
  ;(window as unknown as { __echoBrowserVoice?: typeof __echoBrowserVoice }).__echoBrowserVoice = __echoBrowserVoice
}
