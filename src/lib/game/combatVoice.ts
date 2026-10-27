// ============================================================
// ЭХО РАЗЛОМА — воспроизведение боевых реплик (v1.4, GDD 04 §4.3)
// Барки — короткие реплики поверх боя. В отличие от диалоговой
// озвучки (voice.ts) играют МГНОВЕННО: аудио — статичные WAV из
// public/audio/combat/ (RU, канон) и public/audio/combat/en/
// (v1.8 — EN-варианты того же пайплайна, флаг --en генератора).
// Правила (чтобы не было «какаду»):
//  · глобальный кулдаун 2.5 с (спавн босса — исключение, глушит барк);
//  · кулдаун на пул (lowhp 30 с, kill 20 с, synergy 3 с, down 6 с, boss 8 с);
//  · kill — шанс 25%;
//  · вариант из пула не повторяется подряд.
// Ошибки глотаются — барк никогда не ломает бой. Громкость —
// шина озвучки (voiceVol), как у dialogue-TTS.
// ============================================================

import { useGame } from './store'
import { getLocale, t } from './i18n'
import { allCombatLines, BarkEvent, BOSS_SPAWN_LINES, COMPANION_LINES, CombatLine, CompanionId } from './data/combatVoice'

/** v1.8: путь WAV по локали — EN-локаль слушает EN-набор (RU — канон-фолбэк). */
function lineSrc(line: CombatLine): string {
  return getLocale() === 'en' ? line.src.replace('/audio/combat/', '/audio/combat/en/') : line.src
}

const GLOBAL_CD = 2.5
const POOL_CD: Record<Exclude<BarkEvent, 'spawn'>, number> = {
  synergy: 3,
  down: 6,
  lowhp: 30,
  boss: 8,
  kill: 20,
}
const KILL_CHANCE = 0.25

let current: HTMLAudioElement | null = null
let playing = false
let lastGlobal = 0 // performance.now()/1000 последнего барка
const poolLast = new Map<string, number>()
const lastIdByPool = new Map<string, string>()
let lastBark: { event: BarkEvent; id: string; text: string; at: number } | null = null

function now(): number {
  return typeof performance !== 'undefined' ? performance.now() / 1000 : Date.now() / 1000
}

/** Остановить текущий барк (спавн босса глушит фоновые реплики; выход в титул). */
export function stopBark() {
  if (current) {
    try {
      current.pause()
      current.src = ''
    } catch {
      /* уже мёртв */
    }
    current = null
  }
  playing = false
}

function playLine(line: CombatLine, event: BarkEvent) {
  const s = useGame.getState().settings
  if (!s.voiceOn || s.voiceVol <= 0) return
  try {
    const el = new Audio(lineSrc(line))
    el.volume = Math.max(0, Math.min(1, s.voiceVol))
    el.onplay = () => {
      playing = true
    }
    el.onended = () => {
      if (current === el) {
        current = null
        playing = false
      }
    }
    el.onerror = () => {
      if (current === el) {
        current = null
        playing = false
      }
    }
    current = el
    void el.play().catch(() => {
      if (current === el) {
        current = null
        playing = false
      }
    })
    lastBark = { event, id: line.id, text: t(line.text), at: Date.now() }
  } catch {
    /* аудио недоступно — бой важнее */
  }
}

/** Взять вариант из пула: не повторять предыдущий подряд. */
function pickFrom(pool: CombatLine[], poolKey: string): CombatLine | null {
  if (pool.length === 0) return null
  if (pool.length === 1) return pool[0]
  const prev = lastIdByPool.get(poolKey)
  let cand = pool[Math.floor(Math.random() * pool.length)]
  let guard = 0
  while (cand.id === prev && guard++ < 6) {
    cand = pool[Math.floor(Math.random() * pool.length)]
  }
  return cand
}

/**
 * Барк компаньона по боевому событию. Вызывается из боевых систем.
 * opts.companionId — кто говорит; для lowhp/kill передаём живого компаньона.
 */
export function bark(event: Exclude<BarkEvent, 'spawn'>, opts: { companionId: CompanionId }) {
  const t = now()
  // «down» — критичное событие: обходит глобальный кулдаун (нельзя пропустить)
  if (event !== 'down' && t - lastGlobal < GLOBAL_CD) return
  const cd = POOL_CD[event]
  const key = `${event}:${opts.companionId}`
  if (t - (poolLast.get(key) ?? -999) < cd) return
  if (event === 'kill' && Math.random() > KILL_CHANCE) return
  const pool = COMPANION_LINES[opts.companionId]?.[event] ?? []
  const line = pickFrom(pool, key)
  if (!line) return
  poolLast.set(key, t)
  lastIdByPool.set(key, line.id)
  lastGlobal = t
  playLine(line, event)
}

/**
 * Спавн босса: угроза босса (+ реакция компаньона, если он жив).
 * prevBossType трекается здесь же — срабатывает один раз на появление босса.
 * Вызывается из syncUi (каждые 0.12 с) — сам следит за сменой «нет → босс».
 */
let prevBossType: string | null = null
export function bossSpawnBark(enemyType: string | null, companionId: CompanionId | null) {
  if (enemyType === prevBossType) return
  const appeared = enemyType !== null
  prevBossType = enemyType
  if (!appeared) return
  stopBark() // угроза босса важнее фоновых барков
  const pool = BOSS_SPAWN_LINES[enemyType] ?? []
  const line = pickFrom(pool, `spawn:${enemyType}`)
  if (line) {
    lastIdByPool.set(`spawn:${enemyType}`, line.id)
    lastGlobal = now()
    playLine(line, 'spawn')
  }
  if (companionId) {
    const bpool = COMPANION_LINES[companionId].boss
    const bline = pickFrom(bpool, `boss:${companionId}`)
    if (bline) {
      poolLast.set(`boss:${companionId}`, now())
      lastIdByPool.set(`boss:${companionId}`, bline.id)
      // боссовая реплика уже заняла «эфир» — играем реакцию сразу после
      setTimeout(() => playLine(bline, 'boss'), 2600)
    }
  }
}

/** Сброс трекера босса (новая игра / загрузка) — чтобы босс «вернулся» в трекер. */
export function resetBossBark() {
  prevBossType = null
}

/** Прелоад статичных WAV текущей локали (вызывается при старте движка — после клика игрока). */
export function preloadCombatVoice() {
  if (typeof window === 'undefined') return
  try {
    for (const l of ALL_LINES) {
      const a = new Audio()
      a.preload = 'auto'
      a.src = lineSrc(l)
      void a.load()
    }
  } catch {
    /* прелоад не критичен */
  }
}

const ALL_LINES = allCombatLines()

// ---------------- E2E/отладочный хук ----------------
if (typeof window !== 'undefined') {
  ;(window as unknown as { __echoBark?: object }).__echoBark = {
    bark,
    bossSpawnBark,
    reset: () => {
      poolLast.clear()
      lastGlobal = 0
    },
    get last() {
      return lastBark
    },
    get playing() {
      return playing
    },
  }
}
