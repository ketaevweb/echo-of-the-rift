// Мини-синтезатор SFX на WebAudio — без внешних ассетов
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

let ctx: AudioContext | null = null
let master: GainNode | null = null
let muted = false

function ensure(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
    master = ctx.createGain()
    master.gain.value = 0.22
    master.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

export function setMuted(v: boolean) {
  muted = v
  if (master) master.gain.value = v ? 0 : 0.22
}

export function isMuted() {
  return muted
}

function tone(freq: number, dur: number, type: OscillatorType, vol: number, slideTo?: number) {
  const c = ensure()
  if (!c || !master || muted) return
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
  g.connect(master)
  osc.start()
  osc.stop(c.currentTime + dur + 0.02)
}

function noise(dur: number, vol: number, filterFreq: number) {
  const c = ensure()
  if (!c || !master || muted) return
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
  g.connect(master)
  src.start()
}

export function sfx(name: SfxName) {
  switch (name) {
    case 'click':
      tone(600, 0.05, 'square', 0.12)
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
      break
    case 'quest':
      tone(392, 0.18, 'triangle', 0.12)
      setTimeout(() => tone(587, 0.25, 'triangle', 0.12), 140)
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
      break
    case 'potion':
      tone(300, 0.12, 'sine', 0.12, 500)
      setTimeout(() => tone(500, 0.15, 'sine', 0.1, 700), 90)
      break
  }
}
