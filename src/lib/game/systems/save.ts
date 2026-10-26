// ============================================================
// ЭХО РАЗЛОМА — система сохранений (Phase 0.3)
// saveGame / applySave (loadFrom) / toTitle + версионирование
// схемы сейва. Логика untouched: collectSave/applySave — точный
// перенос тел saveGame/loadFrom из engine.ts.
// ============================================================

import { QuestState, SaveData, SignId } from '../types'
import { useGame, writeSave } from '../store'
import { EngineCtx } from '../core/ctx'

/** Текущая версия схемы сейва (ключ localStorage: echo-rift-save-v1). */
export const SAVE_VERSION = 1

/**
 * Цепочка миграций схемы. Каждая миграция поднимает версию ровно на 1.
 * Сейчас актуальна v1 — цепочка пуста; старые сейвы прототипа (v1)
 * читаются как есть. При вводе v2 добавить: { from: 1, up: (d) => ({ ...d, newField, version: 2 }) }.
 */
export interface Migration {
  from: number
  up: (raw: Record<string, unknown>) => Record<string, unknown>
}
export const migrations: Migration[] = []

/**
 * Поднимает сырой сейв до актуальной версии. Возвращает null, если
 * сейв невозможно мигрировать (как раньше — readSave вернёт null).
 */
export function migrateSave(raw: unknown): SaveData | null {
  if (!raw || typeof raw !== 'object') return null
  let data = raw as Record<string, unknown>
  const from = typeof data.version === 'number' ? data.version : -1
  if (from > SAVE_VERSION) return null
  let v = from
  while (v < SAVE_VERSION) {
    const m = migrations.find((x) => x.from === v)
    if (!m) return null // нет пути миграции — отвергаем (прежнее поведение для v≠1)
    data = m.up(data)
    v = typeof data.version === 'number' ? data.version : v + 1
  }
  return data as unknown as SaveData
}

/** Снимок состояния движка → объект SaveData (ex-saveGame, часть 1). */
export function collectSave(ctx: EngineCtx): SaveData {
  return {
    version: SAVE_VERSION,
    savedAt: Date.now(),
    playtime: ctx.playtime,
    kills: ctx.kills,
    level: ctx.level,
    xp: ctx.xp,
    lp: ctx.lp,
    gold: ctx.gold,
    hp: ctx.hp,
    maxHp: ctx.maxHp,
    stamina: ctx.stamina,
    maxStamina: ctx.maxStamina,
    attributes: { ...ctx.attributes },
    skills: { ...ctx.skills },
    signs: JSON.parse(JSON.stringify(ctx.signs)) as Record<SignId, { unlocked: boolean; level: number }>,
    weapon: ctx.weapon,
    armor: ctx.armor,
    inventory: ctx.inventory.map((i) => ({ ...i })),
    faction: ctx.faction,
    quests: JSON.parse(JSON.stringify(ctx.quests)) as Record<string, QuestState>,
    flags: { ...ctx.flags },
    companions: { ...ctx.companionIds },
    bestiary: [...ctx.bestiary],
    pos: { ...ctx.player.pos },
  }
}

/** Запись сейва (manual=false — автосейв, без тоста). */
export function saveGame(ctx: EngineCtx, manual = true) {
  writeSave(collectSave(ctx))
  useGame.getState().setHasSave(true)
  if (manual) ctx.toast('Игра сохранена.', 'info')
}

/** Загрузка состояния из сейва (ex-loadFrom): поля + пересоздание мира. */
export function applySave(ctx: EngineCtx, s: SaveData) {
  ctx.playtime = s.playtime
  ctx.kills = s.kills
  ctx.level = s.level
  ctx.xp = s.xp
  ctx.lp = s.lp
  ctx.gold = s.gold
  ctx.hp = s.hp
  ctx.maxHp = s.maxHp
  ctx.stamina = s.stamina
  ctx.maxStamina = s.maxStamina
  ctx.attributes = { ...s.attributes }
  ctx.skills = { ...s.skills }
  ctx.signs = JSON.parse(JSON.stringify(s.signs)) as Record<SignId, { unlocked: boolean; level: number }>
  ctx.weapon = s.weapon
  ctx.armor = s.armor
  ctx.inventory = s.inventory.map((i) => ({ ...i }))
  ctx.faction = s.faction
  ctx.quests = JSON.parse(JSON.stringify(s.quests)) as Record<string, QuestState>
  ctx.flags = { ...s.flags }
  ctx.companionIds = { ...s.companions }
  ctx.bestiary = new Set(s.bestiary)
  ctx.createPlayer({ ...s.pos })
  ctx.spawnWorld()
}

/** Сохраниться и вернуться на титульный экран. */
export function toTitle(ctx: EngineCtx) {
  saveGame(ctx, false)
  useGame.getState().setScreen('title')
}
