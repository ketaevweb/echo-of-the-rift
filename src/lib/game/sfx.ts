// ============================================================
// ЭХО РАЗЛОМА — звук (Фаза 8: шины громкости по GDD 04 §4.1)
// Мини-синтезатор SFX на WebAudio — без внешних ассетов.
// Шины: sfx (эффекты) / ambient (голоса доменов) / music
// (музыкальный директор в audio/MusicDirector.ts) → master.
// Громкости и mute живут в settings.ts (localStorage).
// ============================================================

import { ZoneId } from './core/ctx'

type SfxName =
  | 'click'
  | 'hit'
  | 'swing'
  | 'fire'
  | 'frost'
  | 'shield'
  | 'mind'
  | 'shout'
  | 'heal'
  | 'level'
  | 'quest'
  | 'coin'
  | 'death'
  | 'boss'
  | 'potion'
  | 'portal'
  | 'warn'
  // Фаза 8: кубик d20 и шаги по поверхностям
  | 'dice'
  | 'step_grass'
  | 'step_stone'
  | 'step_snow'
  | 'step_ash'

let ctx: AudioContext | null = null
let master: GainNode | null = null
let sfxBus: GainNode | null = null
let ambBus: GainNode | null = null
let musicBus: GainNode | null = null
let muted = false
let volumes = { music: 0.55, sfx: 0.85, amb: 0.8 }

function ensure(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
    master = ctx.createGain()
    master.gain.value = 0.22
    master.connect(ctx.destination)
    sfxBus = ctx.createGain()
    sfxBus.gain.value = volumes.sfx
    sfxBus.connect(master)
    ambBus = ctx.createGain()
    ambBus.gain.value = volumes.amb
    ambBus.connect(master)
    musicBus = ctx.createGain()
    musicBus.gain.value = volumes.music
    musicBus.connect(master)
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

/** Доступ аудиослоя музыки к контексту и шине (MusicDirector). */
export function audioCore(): { ctx: AudioContext; musicBus: GainNode } | null {
  const c = ensure()
  if (!c || !musicBus) return null
  return { ctx: c, musicBus }
}

export function setMuted(v: boolean) {
  muted = v
  if (master) master.gain.value = v ? 0 : 0.22
}

export function isMuted() {
  return muted
}

/** Громкости шин (0..1): музыка / эффекты / эмбиент. */
export function setVolumes(v: { music: number; sfx: number; amb: number }) {
  volumes = { ...v }
  if (sfxBus) sfxBus.gain.value = volumes.sfx
  if (ambBus) ambBus.gain.value = volumes.amb
  if (musicBus) musicBus.gain.value = volumes.music
}

export function getVolumes() {
  return { ...volumes }
}

// --- Фаза 8: хук музыкальных стингеров (подключает MusicDirector) ---
type StingerKind = 'boss' | 'level' | 'quest'
let stingerHook: ((k: StingerKind) => void) | null = null
export function setStingerHook(fn: ((k: StingerKind) => void) | null) {
  stingerHook = fn
}

function tone(freq: number, dur: number, type: OscillatorType, vol: number, slideTo?: number) {
  const c = ensure()
  if (!c || !sfxBus || muted) return
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, c.currentTime)
  if (slideTo !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), c.currentTime + dur)
  }
  g.gain.setValueAtTime(vol, c.currentTime)
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur)
  osc.connect(g)
  g.connect(sfxBus)
  osc.start()
  osc.stop(c.currentTime + dur + 0.02)
}

function noise(dur: number, vol: number, filterFreq: number, dest?: AudioNode) {
  const c = ensure()
  if (!c || muted) return
  const bus = dest ?? sfxBus
  if (!bus) return
  const len = Math.floor(c.sampleRate * dur)
  const buffer = c.createBuffer(1, len, c.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len)
  const src = c.createBufferSource()
  src.buffer = buffer
  const filter = c.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = filterFreq
  const g = c.createGain()
  g.gain.value = vol
  src.connect(filter)
  filter.connect(g)
  g.connect(bus)
  src.start()
}

export function sfx(name: SfxName) {
  switch (name) {
    case 'click':
      tone(600, 0.05, 'square', 0.12)
      break
    case 'warn':
      // Фаза 5: провал проверки / тревога — низкий диссонанс
      tone(160, 0.28, 'sawtooth', 0.14, 90)
      tone(151, 0.28, 'square', 0.07, 86)
      break
    case 'swing':
      noise(0.12, 0.16, 2400)
      break
    case 'hit':
      noise(0.1, 0.22, 900)
      tone(180, 0.08, 'square', 0.1, 90)
      break
    case 'fire':
      noise(0.35, 0.2, 1400)
      tone(140, 0.3, 'sawtooth', 0.08, 60)
      break
    case 'frost':
      tone(900, 0.25, 'sine', 0.1, 1600)
      noise(0.15, 0.08, 3000)
      break
    case 'shield':
      tone(300, 0.2, 'triangle', 0.14, 520)
      break
    case 'mind':
      tone(500, 0.4, 'sine', 0.09, 220)
      tone(760, 0.4, 'sine', 0.07, 340)
      break
    case 'shout':
      noise(0.5, 0.3, 700)
      tone(90, 0.5, 'sawtooth', 0.2, 40)
      break
    case 'heal':
      tone(520, 0.3, 'sine', 0.1, 780)
      break
    case 'level':
      tone(440, 0.15, 'triangle', 0.14)
      setTimeout(() => tone(660, 0.15, 'triangle', 0.14), 120)
      setTimeout(() => tone(880, 0.3, 'triangle', 0.14), 240)
      stingerHook?.('level')
      break
    case 'quest':
      tone(392, 0.18, 'triangle', 0.12)
      setTimeout(() => tone(587, 0.25, 'triangle', 0.12), 140)
      stingerHook?.('quest')
      break
    case 'coin':
      tone(1200, 0.06, 'square', 0.1)
      setTimeout(() => tone(1600, 0.1, 'square', 0.1), 60)
      break
    case 'death':
      tone(220, 0.5, 'sawtooth', 0.16, 60)
      break
    case 'boss':
      tone(70, 0.9, 'sawtooth', 0.24, 45)
      noise(0.7, 0.2, 400)
      stingerHook?.('boss')
      break
    case 'potion':
      tone(300, 0.12, 'sine', 0.12, 500)
      setTimeout(() => tone(500, 0.15, 'sine', 0.1, 700), 90)
      break
    case 'portal':
      // Врата Тумана: восходящий вихрь
      tone(180, 0.7, 'sine', 0.1, 720)
      tone(320, 0.9, 'triangle', 0.07, 900)
      noise(0.8, 0.1, 600)
      break
    case 'dice':
      // Фаза 5 (BG3): кубик катится — серия щелчков, затухающих к результату
      for (let i = 0; i < 5; i++) {
        setTimeout(() => tone(900 + Math.random() * 700, 0.03, 'square', 0.07), i * 70 + Math.random() * 40)
      }
      break
    case 'step_grass':
      noise(0.07, 0.055, 650)
      break
    case 'step_stone':
      noise(0.05, 0.06, 1600)
      tone(140 + Math.random() * 40, 0.03, 'triangle', 0.03)
      break
    case 'step_snow':
      noise(0.09, 0.065, 950)
      break
    case 'step_ash':
      noise(0.08, 0.05, 420)
      break
  }
}

/** Шаг по поверхности зоны (Фаза 8, GDD 04 §4.1 — звук поверхностей). */
export function stepSfx(zone: ZoneId) {
  sfx(zone === 'frost' ? 'step_snow' : zone === 'mara' ? 'step_ash' : zone === 'granite' ? 'step_stone' : zone === 'disputed' ? 'step_stone' : zone === 'rubezh' ? 'step_stone' : 'step_grass')
}

// ---------------- Эмбиент (Фаза 3): петля ветра/топей ----------------

type AmbientMode = 'valley' | 'veld' | 'granite' | 'frost' | 'mara' | 'disputed' | 'off'
interface AmbientNodes {
  src: AudioBufferSourceNode
  filter: BiquadFilterNode
  gain: GainNode
}
let amb: AmbientNodes | null = null
let ambMode: AmbientMode = 'off'

const AMBIENT_PARAMS: Record<AmbientMode, { freq: number; q: number; gain: number }> = {
  valley: { freq: 850, q: 0.5, gain: 0.022 },
  veld: { freq: 260, q: 1.1, gain: 0.042 },
  granite: { freq: 520, q: 1.8, gain: 0.034 }, // сухой пыльный свист над котловиной
  frost: { freq: 1250, q: 2.4, gain: 0.046 }, // высокий свист метели над тундрой
  mara: { freq: 95, q: 4.2, gain: 0.05 }, // утробный гул скверны над багровой пустошью
  disputed: { freq: 640, q: 1.4, gain: 0.04 }, // глухой шелест вереска, хриплый ветер спора
  off: { freq: 400, q: 0.7, gain: 0 },
}

/** Медленный ветер (долина) или низкий гул топей (Вельд). Вызывать регулярно. */
export function setAmbient(mode: AmbientMode) {
  const c = ensure()
  if (!c || !ambBus) return
  if (ambMode === mode && amb) return
  ambMode = mode
  if (!amb) {
    // Зацикленный шум через полосовой фильтр
    const len = Math.floor(c.sampleRate * 2)
    const buffer = c.createBuffer(1, len, c.sampleRate)
    const data = buffer.getChannelData(0)
    let v = 0
    for (let i = 0; i < len; i++) {
      v = v * 0.98 + (Math.random() * 2 - 1) * 0.02
      data[i] = v * 8
    }
    const src = c.createBufferSource()
    src.buffer = buffer
    src.loop = true
    const filter = c.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 800
    filter.Q.value = 0.6
    const gain = c.createGain()
    gain.gain.value = 0
    src.connect(filter)
    filter.connect(gain)
    gain.connect(ambBus)
    src.start()
    amb = { src, filter, gain }
  }
  const p = AMBIENT_PARAMS[mode]
  const t = c.currentTime
  amb.filter.frequency.setTargetAtTime(p.freq, t, 1.2)
  amb.filter.Q.setTargetAtTime(p.q, t, 1.2)
  amb.gain.gain.setTargetAtTime(p.gain, t, 1.5)
}
