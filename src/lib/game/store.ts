import { create } from 'zustand'
import { Faction, InventoryEntry, SaveData, SignId, Stance } from './types'

export type Screen = 'title' | 'game'
export type PanelId = null | 'char' | 'inv' | 'journal' | 'pause' | 'shop' | 'trainer' | 'map' | 'ending'

export interface PartyHud {
  eid: number
  id: string
  name: string
  role: string
  hp: number
  maxHp: number
  alive: boolean
  stance: Stance
  abilities: Array<{ id: string; name: string; icon: string; cd: number; cdMax: number }>
}

export interface AbilityHud {
  id: string
  name: string
  desc: string
  icon: string
  hotkey: string
  cd: number
  cdMax: number
  unlocked: boolean
  staminaCost: number
}

export interface PlayerHud {
  level: number
  xp: number
  xpNext: number
  hp: number
  maxHp: number
  stamina: number
  maxStamina: number
  lp: number
  gold: number
  faction: Faction
  weapon: string | null
  armor: string | null
  attributes: { might: number; vigor: number; intellect: number; charisma: number }
  skills: { blade: number; vitality: number; signs: number; speech: number }
  signs: Record<SignId, { unlocked: boolean; level: number }>
  shield: number
}

export interface QuestHud {
  id: string
  name: string
  stage: number
  done: boolean
  counter: number
  summary: string
  stageText: string
  side: boolean
}

export interface DialogueChoiceHud {
  text: string
  tag?: string
  checkLabel?: string
}

export interface DialogueHudState {
  speaker: string
  role: string
  portraitIcon: string
  portraitColor: string
  text: string
  choices: DialogueChoiceHud[]
}

export interface ToastMsg {
  id: number
  text: string
  kind: 'info' | 'quest' | 'level' | 'warn' | 'loot'
}

export interface EndingHudState {
  epilogue: string[]
  stats: Array<[string, string]>
}

export interface ShopHudState {
  merchantName: string
  stock: string[]
}

export interface TrainerHudState {
  options: Array<{
    id: string
    name: string
    desc: string
    kind: 'skill' | 'sign' | 'attr'
    cost: string
    affordable: boolean
    maxed: boolean
  }>
}

export interface AreaToastState {
  id: number
  name: string
}

/** Активное масло на клинке (Фаза 3). */
export interface OilHudState {
  name: string
  remain: number
}

/** Экран перехода через Врата Тумана (Фаза 3). */
export interface ZoneFadeState {
  label: string
  phase: 'out' | 'in'
}

// Режим запуска игры (новая / продолжить)
export const boot: { mode: 'new' | 'continue' } = { mode: 'new' }

// Режим рендера: '3d' (Three.js, по умолчанию) или '2d' (легаси-канвас)
export type RenderModePref = '3d' | '2d'
export const RENDER_KEY = 'echo-rift-render-mode'

export function readRenderMode(): RenderModePref {
  if (typeof window === 'undefined') return '3d'
  try {
    return localStorage.getItem(RENDER_KEY) === '2d' ? '2d' : '3d'
  } catch {
    return '3d'
  }
}

export function writeRenderMode(mode: RenderModePref) {
  try {
    localStorage.setItem(RENDER_KEY, mode)
  } catch {
    /* приватный режим — игнорируем */
  }
}

interface GameStore {
  screen: Screen
  panel: PanelId
  party: PartyHud[]
  player: PlayerHud | null
  abilities: AbilityHud[]
  inventory: InventoryEntry[]
  quests: QuestHud[]
  trackerQuest: QuestHud | null
  contractQuest: QuestHud | null
  dialogue: DialogueHudState | null
  toasts: ToastMsg[]
  areaToast: AreaToastState | null
  bossBar: { name: string; hp: number; maxHp: number } | null
  shop: ShopHudState | null
  trainer: TrainerHudState | null
  ending: EndingHudState | null
  bestiary: string[]
  hasSave: boolean
  paused: boolean
  interactHint: string | null
  renderMode: RenderModePref
  // Фаза 3
  oil: OilHudState | null
  daytime: number
  zoneLabel: string
  zoneFade: ZoneFadeState | null
  setScreen: (s: Screen) => void
  setPanel: (p: PanelId) => void
  patch: (partial: Partial<GameStore>) => void
  pushToast: (text: string, kind?: ToastMsg['kind']) => void
  clearToast: (id: number) => void
  setHasSave: (v: boolean) => void
}

let toastSeq = 1

export const useGame = create<GameStore>((set) => ({
  screen: 'title',
  panel: null,
  party: [],
  player: null,
  abilities: [],
  inventory: [],
  quests: [],
  trackerQuest: null,
  contractQuest: null,
  dialogue: null,
  toasts: [],
  areaToast: null,
  bossBar: null,
  shop: null,
  trainer: null,
  ending: null,
  bestiary: [],
  hasSave: false,
  paused: false,
  interactHint: null,
  renderMode: '3d',
  oil: null,
  daytime: 0.3,
  zoneLabel: 'ХЕЙМХОЛЛ И ОКРЕСТНОСТИ',
  zoneFade: null,
  setScreen: (s) => set({ screen: s }),
  setPanel: (p) => set({ panel: p }),
  patch: (partial) => set(partial),
  pushToast: (text, kind = 'info') =>
    set((st) => ({
      toasts: [...st.toasts.slice(-4), { id: toastSeq++, text, kind }],
    })),
  clearToast: (id) => set((st) => ({ toasts: st.toasts.filter((t) => t.id !== id) })),
  setHasSave: (v) => set({ hasSave: v }),
}))

export const SAVE_KEY = 'echo-rift-save-v1'

export function readSave(): SaveData | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as SaveData
    if (data.version !== 1) return null
    return data
  } catch {
    return null
  }
}

export function writeSave(data: SaveData) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(data))
}

export function clearSave() {
  localStorage.removeItem(SAVE_KEY)
}
