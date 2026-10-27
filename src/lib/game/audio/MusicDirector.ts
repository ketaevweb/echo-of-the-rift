// ============================================================
// ЭХО РАЗЛОМА — музыкальный директор (Фаза 8, GDD 04 §4.1)
// Горизонтальные слои: explore (пэд-аккорды домена + колокольчики)
// и combat (пульс баса + напряжённая квинта), кроссфейд 2 с,
// стингеры событий, lowpass «под водой» в тактической паузе.
// v1.1 (бэклог GDD 04 §4.3): адаптивные темы боссов — слой boss
// с 3 фазами по HP (0: дрон + сердцебиение, 1: +остинато тритона,
// 2: +хаос-кластеры), стингер на входе в новую фазу.
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

// v1.1: слой босса и его фазы
let bossGain: GainNode | null = null
let bossOn = false
let bossLevel = 0 // 0 — база, 1 — остинато, 2 — хаос
let bossHp01 = 1
let nextBossHitAt = 0
let nextOstinatoAt = 0
let nextChaosAt = 0
let droneOscs: OscillatorNode[] = []
let droneGain: GainNode | null = null

const BOSS_BEAT = 0.84 // сердцебиение босса (~71 bpm, «тук-тук»)
const OSTINATO_STEP = 0.21 // восьмые остинато
const CHAOS_STEP = 0.47 // кластеры фазы 2

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
  bossGain = core.ctx.createGain()
  bossGain.gain.value = 0
  bossGain.connect(lowpass)
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

// ---------------- v1.1: слой босса (тема + фазы по HP) ----------------

/** Непрерывный дрон темы босса (две расстроенные пилы на тонике домена /2). */
function ensureDrone() {
  const c = audioCore()
  if (!c || !bossGain || droneOscs.length > 0) return
  droneGain = c.ctx.createGain()
  droneGain.gain.value = 0
  droneGain.connect(bossGain)
  const root = MOTIFS[domain].root / 2
  for (const det of [-4, 5]) {
    const osc = c.ctx.createOscillator()
    osc.type = 'sawtooth'
    osc.frequency.value = root
    osc.detune.value = det
    osc.connect(droneGain)
    osc.start()
    droneOscs.push(osc)
  }
  droneGain.gain.setTargetAtTime(0.05, c.ctx.currentTime, 1.2)
}

function releaseDrone() {
  const c = audioCore()
  if (!c || !droneGain) return
  const t = c.ctx.currentTime
  droneGain.gain.cancelScheduledValues(t)
  droneGain.gain.setTargetAtTime(0, t, 0.6)
  const oscs = droneOscs
  const g = droneGain
  droneOscs = []
  droneGain = null
  window.setTimeout(() => {
    for (const o of oscs) {
      try {
        o.stop()
      } catch {
        /* уже остановлен */
      }
    }
    g.disconnect()
  }, 2500)
}

/** Перестроить дрон под новый домен (если босс активен). */
function retuneDrone() {
  const c = audioCore()
  if (!c) return
  const root = MOTIFS[domain].root / 2
  for (const o of droneOscs) o.frequency.setTargetAtTime(root, c.ctx.currentTime, 0.8)
}

/** «Тук-тук» — двойной удар сердца босса. */
function scheduleBossHit(at: number) {
  if (!bossGain) return
  const c = audioCore()
  if (!c) return
  const loud = 0.2 + 0.08 * bossLevel
  for (const [dt, vol] of [[0, loud], [0.31, loud * 0.55]] as Array<[number, number]>) {
    const osc = c.ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(96, at + dt)
    osc.frequency.exponentialRampToValueAtTime(38, at + dt + 0.22)
    const g = c.ctx.createGain()
    g.gain.setValueAtTime(0.0001, at + dt)
    g.gain.linearRampToValueAtTime(vol, at + dt + 0.015)
    g.gain.exponentialRampToValueAtTime(0.0001, at + dt + 0.34)
    osc.connect(g)
    g.connect(bossGain)
    osc.start(at + dt)
    osc.stop(at + dt + 0.4)
  }
}

/** Фаза 1+: остинато тритона — приглушённые восьмые. */
const OSTINATO_PATTERN = [0, 0, 3, 0, 5, 3, 0, -2]
let ostinatoIdx = 0

function scheduleOstinato(at: number) {
  if (!bossGain) return
  const c = audioCore()
  if (!c) return
  const root = MOTIFS[domain].root / 2
  const f = root * Math.pow(2, OSTINATO_PATTERN[ostinatoIdx % OSTINATO_PATTERN.length] / 12)
  ostinatoIdx++
  const osc = c.ctx.createOscillator()
  osc.type = 'square'
  osc.frequency.value = f
  const g = c.ctx.createGain()
  g.gain.setValueAtTime(0.0001, at)
  g.gain.linearRampToValueAtTime(0.032, at + 0.015)
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.17)
  osc.connect(g)
  g.connect(bossGain)
  osc.start(at)
  osc.stop(at + 0.2)
}

/** Фаза 2+: хаос — кластеры из диссонирующих пар высоких треугольников. */
function scheduleChaos(at: number) {
  if (!bossGain) return
  const c = audioCore()
  if (!c) return
  const root = MOTIFS[domain].root * 6
  for (const s of [0, 1]) {
    const osc = c.ctx.createOscillator()
    osc.type = 'triangle'
    osc.frequency.value = root * Math.pow(2, s / 12)
    const g = c.ctx.createGain()
    g.gain.setValueAtTime(0.0001, at)
    g.gain.linearRampToValueAtTime(0.028, at + 0.28)
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.8)
    osc.connect(g)
    g.connect(bossGain)
    osc.start(at)
    osc.stop(at + 0.85)
  }
}

/** Войти/выйти из боя с боссом — кроссфейд слоя темы 2 с. */
export function musicBoss(on: boolean) {
  init()
  if (!started || bossOn === on) return
  bossOn = on
  const c = audioCore()
  if (!c || !bossGain || !exploreGain) return
  const t = c.ctx.currentTime
  bossGain.gain.cancelScheduledValues(t)
  bossGain.gain.setTargetAtTime(on ? 1 : 0, t, CROSSFADE / 3)
  // explore дополнительно глушим под тему босса
  exploreGain.gain.cancelScheduledValues(t)
  exploreGain.gain.setTargetAtTime(on ? 0.3 : combatOn ? 0.45 : 1, t, CROSSFADE / 3)
  if (on) {
    ensureDrone()
    nextBossHitAt = t + 0.3
    nextOstinatoAt = t + 0.4
    nextChaosAt = t + 0.6
  } else {
    releaseDrone()
    bossLevel = 0
    bossHp01 = 1
  }
}

/** Фаза темы по HP босса (0..1): >0.66 база, >0.33 остинато, ниже — хаос. */
export function musicBossPhase(hp01: number) {
  init()
  if (!started) return
  bossHp01 = Math.max(0, Math.min(1, hp01))
  const lv = bossHp01 > 0.66 ? 0 : bossHp01 > 0.33 ? 1 : 2
  if (lv !== bossLevel) {
    const up = lv > bossLevel
    bossLevel = lv
    // Стингер на входе в новую, более тяжёлую фазу
    if (up && bossOn) stinger('boss')
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
  if (bossOn) retuneDrone()
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
  // v1.1: слой босса — сердцебиение всегда, остинато/хаос по фазам HP
  if (bossOn) {
    while (nextBossHitAt < horizon) {
      scheduleBossHit(Math.max(nextBossHitAt, now + 0.05))
      nextBossHitAt += BOSS_BEAT
    }
    if (bossLevel >= 1) {
      while (nextOstinatoAt < horizon) {
        scheduleOstinato(Math.max(nextOstinatoAt, now + 0.05))
        nextOstinatoAt += OSTINATO_STEP
      }
    } else {
      nextOstinatoAt = now + 0.2
    }
    if (bossLevel >= 2) {
      while (nextChaosAt < horizon) {
        scheduleChaos(Math.max(nextChaosAt, now + 0.05))
        nextChaosAt += CHAOS_STEP
      }
    } else {
      nextChaosAt = now + 0.3
    }
  }
}

/** Фаза 8: дебаг-снимок для QA-ворота (GDD 08) — состояние слоёв директора. */
export function musicDebug() {
  return { started, domain, combat: combatOn, paused: pausedOn, boss: { on: bossOn, level: bossLevel, hp: Math.round(bossHp01 * 100) } }
}
