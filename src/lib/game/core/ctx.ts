// ============================================================
// ЭХО РАЗЛОМА — контекст движка (Phase 0)
// EngineCtx — интерфейс состояния движка, который передаётся
// в системы (systems/*) первым аргументом. GameEngine реализует
// его структурно: системы не знают о классе, только о полях.
// Правило: системы мутируют состояние ТОЛЬКО через ctx.
// ============================================================

import { Attributes, DialogueChoice, Entity, Faction, Floater, InventoryEntry, Particle, PropDef, QuestState, SignId, SkillRanks, Vec } from '../types'
import { Collider } from './util'

export type ToastKind = 'info' | 'quest' | 'level' | 'warn' | 'loot'

export interface EngineCtx {
  // --- Метрики сессии ---
  playtime: number
  kills: number

  // --- Прогресс игрока ---
  level: number
  xp: number
  lp: number
  gold: number
  hp: number
  maxHp: number
  stamina: number
  maxStamina: number
  attributes: Attributes
  skills: SkillRanks
  signs: Record<SignId, { unlocked: boolean; level: number }>
  weapon: string | null
  armor: string | null
  inventory: InventoryEntry[]
  faction: Faction

  // --- Мир/квесты ---
  quests: Record<string, QuestState>
  flags: Record<string, boolean>
  companionIds: { kaya: boolean; torvald: boolean }
  bestiary: Set<string>
  player: Entity

  // --- Сущности и эффекты ---
  eidSeq: number
  entities: Entity[]
  particles: Particle[]
  floaters: Floater[]
  kb: Map<number, Vec>

  // --- Рендер/ввод/цикл ---
  canvas: HTMLCanvasElement
  baked: HTMLCanvasElement
  colliders: Collider[]
  props: PropDef[]
  removedProps: Set<string>
  keys: Set<string>
  camera: Vec
  shake: number
  tacticalPaused: boolean
  dialogueTree: string | null
  dlgChoices: DialogueChoice[]
  targetEid: number | null
  time: number
  currentArea: string
  endingAt: number | null
  buffT: number
  destroyed: boolean

  // --- Хуки, реализуемые движком (делегируют в системы/инициализацию) ---
  toast(text: string, kind?: ToastKind): void
  createPlayer(pos: Vec): void
  spawnWorld(): void
  spawnCompanion(id: 'kaya' | 'torvald'): void
  syncUi(): void
  castAbility(id: string): void
  isFrozen(): boolean
  moveWithCollisions(e: Entity, vx: number, vy: number, dt: number): void
}
