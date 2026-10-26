// ============================================================
// ЭХО РАЗЛОМА — контекст движка (Phase 0)
// EngineCtx — интерфейс состояния движка, который передаётся
// в системы (systems/*) первым аргументом. GameEngine реализует
// его структурно: системы не знают о классе, только о полях.
// Правило: системы мутируют состояние ТОЛЬКО через ctx.
// ============================================================

import { Attributes, Entity, Faction, InventoryEntry, QuestState, SignId, SkillRanks, Vec } from '../types'

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

  // --- Хуки, реализуемые движком (делегируют в системы/инициализацию) ---
  toast(text: string, kind?: ToastKind): void
  createPlayer(pos: Vec): void
  spawnWorld(): void
}
