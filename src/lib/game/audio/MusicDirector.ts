// ============================================================
// ЭХО РАЗЛОМА — музыкальный директор (Фаза 8, GDD 04 §4.1)
// Горизонтальные слои: explore (пэд-аккорды домена + колокольчики)
// и combat (пульс баса + напряжённая квинта), кроссфейд 2 с,
// стингеры событий, lowpass «под водой» в тактической паузе.
// Всё синтезируется WebAudio — без внешних ассетов.
// ============================================================

import { ZoneId } from '../core/ctx'
import { audioCore, setStingerHook } from '../sfx'

interface DomainMotif {
  /** Тоника слоя explore, Гц. */
  root: number
  /** Аккорды (полутоны от тоники), циклическая прогрессия. */
  chords: number[][]
  /** Лад колокольчиков (полутоны от тоники). */
  scale: number[]
  /** Пульс боя — частота баса, Гц. */
  pulse: number
}

/** Голоса доменов (GDD 04 §1 палитры → музыкальные лады). */
const MOTIFS: Record<ZoneId, DomainMotif> = {
  // Тёплый дорийский покой долины
  valley: { root: 110, chords: [[0, 3, 7, 14], [10, 14, 17, 24], [3, 7, 10, 19]], scale: [0, 3, 5, 7, 10, 12, 15], pulse: 55 },
  // Болотный минор с низким дроном
  veld: { root: 73.42, chords: [[0, 3, 7, 12], [8, 12, 15, 20], [5, 8, 12, 17]], scale: [0, 3, 5, 7, 10, 12], pulse: 36.7 },
  // Пепельный фригийский звон кирки
  granite: { root: 82.41, chords: [[0, 3, 7, 12], [1, 5, 8, 13], [10, 13, 17, 22]], scale: [0, 1, 3, 7, 8, 12], pulse: 41.2 },
  // Воздушный sus-лад метели
  frost: { root: 130.81, chords: [[0, 2, 7, 14], [7, 11, 14, 21], [9, 12, 16, 23]], scale: [0, 2, 4, 7, 9, 12], pulse: 65.4 },
  // Утробный тритоновый гул скверны
  mara: { root: 49, chords: [[0, 3, 7, 12], [6, 10, 13, 18], [8, 11, 15, 20]], scale: [0, 3, 6, 7, 10, 12], pulse: 24.5 },
  // Чужая лидийская симметрия Спорных Земель
  disputed: { root: 87.31, chords: [[0, 4, 7, 14], [2, 6, 9, 16], [4, 8, 12, 19]], scale: [0, 2, 4, 6, 7, 11, 12], pulse: 43.65 },
}

const CHORD_LEN = 6.4 // сек на аккорд explore
const CROSSFADE = 2.0 // сек кроссфейда слоёв (GDD 04 §4.1)
const BEAT = 0.42 // сек удара пульса боя (~143 bpm)

let started = false
let lowpass: BiquadFilterNode | null = null
let exploreGain: GainNode | null = null
let combatGain: GainNode | null = null
let domain: ZoneId = 'valley'
let combatOn = false
let pausedOn = false
let chordIdx = 0
let nextChordAt = 0
let nextBellAt = 0
let nextBeatAt = 0

/** Полутоны от тоники → частота. */
function semis(root: number, s: number): number {
  return root * Math.pow(2, s / 12)
}

function init() {
  if (started) return
  const core = audioCore()
  if (!core) return
  started = true
  // Музыка идёт через собственный lowpass («под водой» в тактической паузе)
  lowpass = core.ctx.createBiquadFilter()
  lowpass.type = 'lowpass'
  lowpass.frequency.value = 18000
  lowpass.connect(core.musicBus)
  exploreGain = core.ctx.createGain()
  exploreGain.gain.value = 1
  exploreGain.connect(lowpass)
  combatGain = core.ctx.createGain()
  combatGain.gain.value = 0
  combatGain.connect(lowpass)
  nextChordAt = core.ctx.currentTime + 0.4
  nextBellAt = core.ctx.currentTime + 2.5
  nextBeatAt = core.ctx.currentTime + 0.5

  // Стингеры: sfx('boss'|'level'|'quest') дёргают музыкальный слой
  setStingerHook((k) => stinger(k))
}

// ---------------- Слой explore: пэд-аккорды домена ----------------

function scheduleChord(at: number) {
  if (!exploreGain) return
  const c = audioCore()
  if (!c) return
  const m = MOTIFS[domain]
  const chord = m.chords[chordIdx % m.chords.length]
  chordIdx++
  for (const s of chord) {
    const f = semis(m.root, s)
    for (const det of [-0.6, 0.7]) {
      const osc = c.ctx.createOscillator()
      osc.type = 'triangle'
      osc.frequency.value = f
      osc.detune.value = det * 4
      const g = c.ctx.createGain()
      g.gain.setValueAtTime(0.0001, at)
      g.gain.linearRampToValueAtTime(0.028, at + 1.8) // медленная атака пэда
      g.gain.setValueAtTime(0.028, at + CHORD_LEN - 1.6)
      g.gain.exponentialRampToValueAtTime(0.0001, at + CHORD_LEN)
      osc.connect(g)
      g.connect(exploreGain)
      osc.start(at)
      osc.stop(at + CHORD_LEN + 0.1)
    }
  }
}

function scheduleBell(at: number) {
  if (!exploreGain) return
  const c = audioCore()
  if (!c) return
  const m = MOTIFS[domain]
  const f = semis(m.root * 2, m.scale[Math.floor(Math.random() * m.scale.length)])
  const osc = c.ctx.createOscillator()
  osc.type = 'sine'
  osc.frequency.value = f
  const g = c.ctx.createGain()
  g.gain.setValueAtTime(0.0001, at)
  g.gain.linearRampToValueAtTime(0.02, at + 0.02)
  g.gain.exponentialRampToValueAtTime(0.0001, at + 2.8)
  osc.connect(g)
  g.connect(exploreGain)
  osc.start(at)
  osc.stop(at + 3)
}

// ---------------- Слой combat: пульс баса + квинта ----------------

function scheduleBeat(at: number) {
  if (!combatGain) return
  const c = audioCore()
  if (!c) return
  const m = MOTIFS[domain]
  // Бас-пульс
  const osc = c.ctx.createOscillator()
  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(m.pulse, at)
  const g = c.ctx.createGain()
  g.gain.setValueAtTime(0.0001, at)
  g.gain.linearRampToValueAtTime(0.09, at + 0.02)
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.3)
  osc.connect(g)
  g.connect(combatGain)
  osc.start(at)
  osc.stop(at + 0.35)
  // Напряжённая квинта-дрон (тихая, с вибрато)
  if (Math.random() < 0.35) {
    const o2 = c.ctx.createOscillator()
    o2.type = 'triangle'
    o2.frequency.value = semis(m.pulse * 4, 7)
    const g2 = c.ctx.createGain()
    g2.gain.setValueAtTime(0.0001, at)
    g2.gain.linearRampToValueAtTime(0.03, at + 0.1)
    g2.gain.exponentialRampToValueAtTime(0.0001, at + 0.8)
    o2.connect(g2)
    g2.connect(combatGain)
    o2.start(at)
    o2.stop(at + 0.9)
  }
}

// ---------------- Стингеры событий ----------------

function stinger(kind: 'boss' | 'level' | 'quest') {
  const c = audioCore()
  if (!c || !exploreGain) return
  const m = MOTIFS[domain]
  const t = c.ctx.currentTime + 0.02
  const notes =
    kind === 'boss'
      ? [m.root / 2, (m.root / 2) * Math.pow(2, 7 / 12)] // низкий брам
      : kind === 'level'
        ? [m.root, m.root * Math.pow(2, 4 / 12), m.root * 2]
        : [m.root * 2, m.root * 2 * Math.pow(2, 3 / 12)]
  notes.forEach((f, i) => {
    const osc = c.ctx.createOscillator()
    osc.type = kind === 'boss' ? 'sawtooth' : 'triangle'
    osc.frequency.value = f
    const g = c.ctx.createGain()
    const at = t + i * (kind === 'boss' ? 0.05 : 0.12)
    g.gain.setValueAtTime(0.0001, at)
    g.gain.linearRampToValueAtTime(kind === 'boss' ? 0.1 : 0.06, at + 0.04)
    g.gain.exponentialRampToValueAtTime(0.0001, at + (kind === 'boss' ? 1.6 : 0.7))
    osc.connect(g)
    g.connect(exploreGain!)
    osc.start(at)
    osc.stop(at + 2)
  })
}

// ---------------- Публичный API ----------------

/** Сменить домен (зону) — прогрессия и лад переключаются на следующем аккорде. */
export function musicDomain(zone: ZoneId) {
  init()
  if (!started) return
  if (domain === zone) return
  domain = zone
  chordIdx = 0
}

/** Войти/выйти из боя — кроссфейд explore ⇄ combat 2 с. */
export function musicCombat(on: boolean) {
  init()
  if (!started || combatOn === on) return
  combatOn = on
  const c = audioCore()
  if (!c || !combatGain || !exploreGain) return
  const t = c.ctx.currentTime
  combatGain.gain.cancelScheduledValues(t)
  combatGain.gain.setTargetAtTime(on ? 1 : 0, t, CROSSFADE / 3)
  exploreGain.gain.cancelScheduledValues(t)
  exploreGain.gain.setTargetAtTime(on ? 0.45 : 1, t, CROSSFADE / 3)
  if (on) nextBeatAt = t + 0.1
}

/** Тактическая пауза — фильтр «под водой» (GDD 04 §4.1). */
export function musicPaused(on: boolean) {
  init()
  if (!started || pausedOn === on) return
  pausedOn = on
  const c = audioCore()
  if (!c || !lowpass) return
  lowpass.frequency.setTargetAtTime(on ? 620 : 18000, c.ctx.currentTime, 0.25)
}

/** Планировщик — вызывать каждый кадр (при скрытой вкладке rAF стоит — музыка ждёт). */
export function musicTick() {
  if (!started) {
    init()
    if (!started) return
  }
  const c = audioCore()
  if (!c) return
  const now = c.ctx.currentTime
  const horizon = now + 0.35
  while (nextChordAt < horizon) {
    scheduleChord(Math.max(nextChordAt, now + 0.05))
    nextChordAt += CHORD_LEN
  }
  if (!combatOn && now >= nextBellAt) {
    scheduleBell(nextBellAt)
    nextBellAt = now + 3 + Math.random() * 5
  }
  if (combatOn) {
    while (nextBeatAt < horizon) {
      scheduleBeat(Math.max(nextBeatAt, now + 0.05))
      nextBeatAt += BEAT
    }
  } else {
    nextBeatAt = now + 0.2
  }
}

/** Фаза 8: дебаг-снимок для QA-ворота (GDD 08) — состояние слоёв директора. */
export function musicDebug() {
  return { started, domain, combat: combatOn, paused: pausedOn }
}
