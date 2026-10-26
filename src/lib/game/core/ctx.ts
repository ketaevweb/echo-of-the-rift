// ============================================================
// ЭХО РАЗЛОМА — контекст движка (Phase 0)
// EngineCtx — интерфейс состояния движка, который передаётся
// в системы (systems/*) первым аргументом. GameEngine реализует
// его структурно: системы не знают о классе, только о полях.
// Правило: системы мутируют состояние ТОЛЬКО через ctx.
// ============================================================

import { Attributes, DialogueChoice, Entity, Faction, Floater, InventoryEntry, Particle, PropDef, QuestState, SignId, SkillRanks, Telegraph, Vec } from '../types'
import { Collider } from './util'
import type { PanelId } from '../store'

export type ToastKind = 'info' | 'quest' | 'level' | 'warn' | 'loot'

// ---------------- Мост 3D-рендера (Фаза 1) ----------------

/** Снимок состояния движка для 3D-рендера (структурно = SceneView3d). */
export interface View3dSnapshot {
  time: number
  shake: number
  player: Entity
  playerAlive: boolean
  entities: Entity[]
  particles: Particle[]
  floaters: Floater[]
  telegraphs: Telegraph[]
  targetEid: number | null
  removedProps: Set<string>
}

/** Минимальный интерфейс 3D-вью, которым пользуется движок/ввод. */
export interface View3dBridge {
  render(view: View3dSnapshot): void
  /** Точка мира под курсором (для приказов движения). */
  screenToGround(sx: number, sy: number): Vec | null
  /** Сущность под курсором (проекционный пикинг). */
  pickAtScreen(sx: number, sy: number, padPx: number): {
    eid: number
    kind: Entity['kind']
    alive: boolean
    enemyType?: Entity['enemyType']
    npcDialogue?: string
  } | null
  /** Азимут орбиты камеры (рад) — для WASD относительно камеры. */
  getCameraYaw(): number
  resize(): void
  dispose(): void
}

export type RenderMode = '2d' | '3d'

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
  telegraphs: Telegraph[]
  kb: Map<number, Vec>

  // --- Рендер/ввод/цикл ---
  canvas: HTMLCanvasElement
  /** Активный канвас ввода (= canvas в 2D, webgl-канвас в 3D). */
  inputCanvas: HTMLCanvasElement
  renderMode: RenderMode
  view3d: View3dBridge | null
  setRenderMode(mode: RenderMode): void
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
  /** Косметический тик (частицы/флоатеры/тряска) — идёт даже при паузе/панелях. */
  updateCosmetics(dt: number): void
  moveWithCollisions(e: Entity, vx: number, vy: number, dt: number): void
  openPanel(p: PanelId): void
  closePanel(): void
}
