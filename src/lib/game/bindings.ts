// ============================================================
// ЭХО РАЗЛОМА — ремап клавиш (v1.1, бэклог GDD 04 §4.3)
// Единый источник биндингов действий → клавиши. Хранится в
// localStorage, читается input.ts/uiSync.ts/HUD-подписями.
// Клавиша хранится канонически латиницей; русская раскладка
// нормализуется (CYR2LAT) — биндинг работает на обеих.
// Движение (WASD/стрелки) не ремапится — как в большинстве RPG.
// ============================================================

/** Действия, доступные для ремапа. */
export type ActionId =
  | 'ability1'
  | 'ability2'
  | 'ability3'
  | 'ability4'
  | 'ability5'
  | 'ability6'
  | 'ability7'
  | 'shout_force'
  | 'shout_frost'
  | 'potion_heal'
  | 'potion_stam'
  | 'interact'
  | 'pause'
  | 'target'
  | 'formation'
  | 'panel_char'
  | 'panel_inv'
  | 'panel_journal'
  | 'panel_map'

export type KeyBindings = Record<ActionId, string[]>

/** Порядок и подписи для UI настроек. */
export const ACTION_DEFS: Array<{ id: ActionId; name: string; group: 'Бой' | 'Партия' | 'Панели' }> = [
  { id: 'ability1', name: 'Знак / слот 1', group: 'Бой' },
  { id: 'ability2', name: 'Знак / слот 2', group: 'Бой' },
  { id: 'ability3', name: 'Знак / слот 3', group: 'Бой' },
  { id: 'ability4', name: 'Знак / слот 4', group: 'Бой' },
  { id: 'ability5', name: 'Знак / слот 5', group: 'Бой' },
  { id: 'ability6', name: 'Слот 6 (зелье HP)', group: 'Бой' },
  { id: 'ability7', name: 'Слот 7 (зелье стамины)', group: 'Бой' },
  { id: 'shout_force', name: 'Крик: Сила', group: 'Бой' },
  { id: 'shout_frost', name: 'Крик: Мороз', group: 'Бой' },
  { id: 'potion_heal', name: 'Зелье лечения', group: 'Бой' },
  { id: 'potion_stam', name: 'Зелье стамины', group: 'Бой' },
  { id: 'interact', name: 'Взаимодействие', group: 'Бой' },
  { id: 'pause', name: 'Тактическая пауза', group: 'Партия' },
  { id: 'target', name: 'Смена цели', group: 'Партия' },
  { id: 'formation', name: 'Строй отряда', group: 'Партия' },
  { id: 'panel_char', name: 'Персонаж', group: 'Панели' },
  { id: 'panel_inv', name: 'Инвентарь', group: 'Панели' },
  { id: 'panel_journal', name: 'Журнал', group: 'Панели' },
  { id: 'panel_map', name: 'Карта', group: 'Панели' },
]

export const DEFAULT_BINDINGS: KeyBindings = {
  ability1: ['1'],
  ability2: ['2'],
  ability3: ['3'],
  ability4: ['4'],
  ability5: ['5'],
  ability6: ['6'],
  ability7: ['7'],
  shout_force: ['r'],
  shout_frost: ['t'],
  potion_heal: ['q'],
  potion_stam: ['e'],
  interact: ['f'],
  pause: ['space'],
  target: ['tab'],
  formation: ['v'],
  panel_char: ['c'],
  panel_inv: ['i'],
  panel_journal: ['j'],
  panel_map: ['m'],
}

const KEYBINDS_KEY = 'echo-rift-keybinds'

/** Русская раскладка → латиница (нормализация ввода). */
export const CYR2LAT: Record<string, string> = {
  й: 'q', ц: 'w', у: 'e', к: 'r', е: 't', н: 'y', г: 'u', ш: 'i', щ: 'o', з: 'p',
  ф: 'a', ы: 's', в: 'd', а: 'f', п: 'g', р: 'h', о: 'j', л: 'k', д: 'l',
  я: 'z', ч: 'x', с: 'c', м: 'v', и: 'b', т: 'n', ь: 'm', ё: '`',
}

const SPECIAL_KEYS = new Set(['space', 'tab', 'esc', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'enter', 'shift'])

/** Нормализовать ev.key к канонической форме биндинга. */
export function normKey(evKey: string): string {
  const k = evKey.toLowerCase()
  if (k === ' ') return 'space'
  if (k === 'escape') return 'esc'
  return CYR2LAT[k] ?? k
}

/** Ключ допустим для биндинга: одиночный символ или спец-клавиша. */
export function isBindable(evKey: string): boolean {
  const k = normKey(evKey)
  return k.length === 1 || SPECIAL_KEYS.has(k)
}

function validKey(k: unknown): k is string {
  return typeof k === 'string' && (k.length === 1 || SPECIAL_KEYS.has(k))
}

/** Прочитать биндинги из localStorage (с валидацией и фолбэком). */
export function readBindings(): KeyBindings {
  if (typeof window === 'undefined') return snapshot(DEFAULT_BINDINGS)
  try {
    const raw = localStorage.getItem(KEYBINDS_KEY)
    if (!raw) return snapshot(DEFAULT_BINDINGS)
    const p = JSON.parse(raw) as Partial<KeyBindings>
    const out = snapshot(DEFAULT_BINDINGS)
    for (const { id } of ACTION_DEFS) {
      const v = p[id]
      if (Array.isArray(v) && v.length > 0 && v.every(validKey)) out[id] = [...v]
    }
    return out
  } catch {
    return snapshot(DEFAULT_BINDINGS)
  }
}

function snapshot(b: KeyBindings): KeyBindings {
  const out = {} as KeyBindings
  for (const { id } of ACTION_DEFS) out[id] = [...b[id]]
  return out
}

// Живая копия (обновляется setBindings — input.ts читает без localStorage каждый раз)
let current: KeyBindings | null = null

export function getBindings(): KeyBindings {
  if (!current) current = readBindings()
  return current
}

/** Записать биндинги (localStorage + живая копия). */
export function setBindings(b: KeyBindings) {
  current = snapshot(b)
  try {
    localStorage.setItem(KEYBINDS_KEY, JSON.stringify(current))
  } catch {
    /* приватный режим — только в памяти */
  }
}

/** Сброс к дефолту. */
export function resetBindings() {
  setBindings(DEFAULT_BINDINGS)
}

/** Проверить событие клавиатуры против действия. */
export function keyMatches(action: ActionId, evKey: string): boolean {
  return getBindings()[action].includes(normKey(evKey))
}

/** Кому принадлежит клавиша сейчас (для конфликтов в UI). */
export function keyOwner(key: string): ActionId | null {
  const b = getBindings()
  for (const { id } of ACTION_DEFS) if (b[id].includes(key)) return id
  return null
}

/** Красивая подпись клавиши для HUD/настроек. */
export function keyLabel(key: string): string {
  switch (key) {
    case 'space': return 'Пробел'
    case 'tab': return 'Tab'
    case 'esc': return 'Esc'
    case 'arrowup': return '↑'
    case 'arrowdown': return '↓'
    case 'arrowleft': return '←'
    case 'arrowright': return '→'
    case 'enter': return 'Enter'
    case 'shift': return 'Shift'
    default: return key.toUpperCase()
  }
}

export function labelFor(action: ActionId): string {
  return keyLabel(getBindings()[action][0] ?? '')
}

// ability id → действие биндинга (для подписей HUD)
const ABILITY_ACTION: Record<string, ActionId> = {
  igni: 'ability1',
  aard: 'ability2',
  quen: 'ability3',
  axii: 'ability4',
  shout: 'ability5',
  potion_heal: 'potion_heal',
  potion_stam: 'potion_stam',
  shout_force: 'shout_force',
  shout_frost: 'shout_frost',
}

/** Подпись хоткея способности по её id (null — оставить из data/abilities). */
export function hotkeyLabelForAbility(abilityId: string): string | null {
  const a = ABILITY_ACTION[abilityId]
  return a ? labelFor(a) : null
}
