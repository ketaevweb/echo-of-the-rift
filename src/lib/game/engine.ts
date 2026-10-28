// ============================================================
// ЭХО РАЗЛОМА — движок (Phase 0.9: фасад)
// GameEngine — публичный API для UI и владелец состояния
// (реализует EngineCtx). Вся логика живёт в systems/*,
// отрисовка — в render2d/*, цикл — в core/Game.ts.
// Правило направления: UI → движок (публичные методы),
// движок → UI (только через стор-зеркало в systems/uiSync).
// ============================================================

import {
  DialogueChoice,
  Entity,
  Faction,
  Floater,
  FormationId,
  InventoryEntry,
  OriginId,
  Particle,
  QuestState,
  SaveData,
  SignId,
  Stance,
  Telegraph,
  Vec,
} from './types'
import { LAKE, PLAYER_SPAWN, GATES, GR_GATES, FR_GATES, MA_GATES, DF_GATES, RB_GATES, zoneOf } from './data/world'
import { ZONE_DATA, zoneViewRect } from './data/zones'
import { sfx, setAmbient, setMuted, setVolumes } from './sfx'
import { setVoiceVolume } from './voice'
import { musicBoss, musicBossPhase, musicCombat, musicDebug, musicDomain, musicPaused, musicTick } from './audio/MusicDirector'
import { EffQuality, MOBILE_FPS_CAP, QUALITY_NAME, stepDown, stepUp, writeSettings } from './settings'
import { PanelId, useGame } from './store'
import { Collider, seedRot } from './core/util'
import { EngineCtx, AssaultState, RaidState, RenderMode, SiegeState, ToastKind, ZoneId } from './core/ctx'
import { GameLoop, stepCosmetics, stepWorld } from './core/Game'
import { bakeZoneTerrain, renderer2d } from './render2d/renderer'
import { drawScene } from './render2d/scene'
import { Renderer3d } from './render3d/Renderer3d'
import { writeRenderMode } from './store'
import { applySave, saveGame as saveGameSys, toTitle as toTitleSys } from './systems/save'
import { completeTutorial, hideTutorial, showTutorial, tickTutorial } from './systems/tutorial'
import {
  buyItem as buyItemSys,
  equipItem as equipItemSys,
  sellItem as sellItemSys,
  unequipItem as unequipItemSys,
  useItem as applyUseItem,
} from './systems/inventory'
import {
  openTrainer as openTrainerSys,
  recalcStats as recalcStatsSys,
  spendLp as spendLpSys,
  trainOption as trainOptionSys,
} from './systems/progression'
import {
  castCompanionAbility as castCompanionAbilitySys,
  createPlayer as createPlayerSys,
  spawnCompanion as spawnCompanionSys,
  spawnWorld as spawnWorldSys,
  spawnZoneContent,
} from './systems/ai'
import { castAbility as castAbilitySys } from './systems/combat'
import { bindInput as bindInputSys, unbindInput as unbindInputSys } from './systems/input'
import { moveWithCollisions as moveWithCollisionsSys } from './systems/movement'
import { nearestEnemyOf } from './core/entity'
import { cycleFormation as cycleFormationSys } from './systems/party'
import { endPitFight } from './systems/career'
import { RUNE_INIT } from './data/frost'
import {
  chooseOption as chooseOptionSys,
  closeDialogue as closeDialogueSys,
  initQuests as initQuestsSys,
  openDialogue as openDialogueSys,
  questMarker as questMarkerSys,
} from './systems/quest'
import { syncUi as syncUiSys, findActiveBoss } from './systems/uiSync'
import { preloadCombatVoice, resetBossBark } from './combatVoice'
import { t } from './i18n'

/** Телепорт через врата прерывает ямный бой (арена остаётся в Граните). */
function endPitFightSafe(ctx: GameEngine) {
  try {
    endPitFight(ctx)
  } catch {
    /* яма уже пуста */
  }
}

export { BESTIARY_INFO } from './data/tables'

let engineInstance: GameEngine | null = null
export function getEngine() {
  return engineInstance
}
export interface CreateEngineOpts {
  /** WebGL-канвас для 3D-режима. */
  canvas3d?: HTMLCanvasElement | null
  /** Стартовый режим рендера (по умолчанию 3d). */
  mode?: RenderMode
  /** Фаза 5: происхождение героя при новой игре (по умолчанию — Дозорный). */
  origin?: OriginId
}
export function createEngine(canvas: HTMLCanvasElement, save: SaveData | null, opts?: CreateEngineOpts) {
  engineInstance = new GameEngine(canvas, save, opts)
  if (typeof window !== 'undefined') {
    ;(window as unknown as { __echoEngine?: GameEngine }).__echoEngine = engineInstance
    ;(window as unknown as { __musicDebug?: typeof musicDebug }).__musicDebug = musicDebug
  }
  return engineInstance
}

export class GameEngine implements EngineCtx {
  // --- Состояние (EngineCtx) ---
  canvas: HTMLCanvasElement
  canvas3d: HTMLCanvasElement | null
  inputCanvas: HTMLCanvasElement
  renderMode: RenderMode
  view3d: Renderer3d | null = null
  baked: HTMLCanvasElement
  /** v2.1: мировые границы запечённого терена текущей зоны (для сцены/миникарты/карты). */
  bakedRect: [number, number, number, number] = [0, 0, 1, 1]
  /** v2.1: построенная сцена зоны (идемпотентность enterZone). */
  private sceneZone: ZoneId | null = null
  colliders: Collider[] = []
  /** v2.1: пропсы ТОЛЬКО текущей зоны (сцены-локации) — отсортированы по y. */
  props = ZONE_DATA.valley.props
  zoneInteractables = ZONE_DATA.valley.interactables
  zoneClues = ZONE_DATA.valley.clues

  eidSeq = 1
  entities: Entity[] = []
  particles: Particle[] = []
  floaters: Floater[] = []
  telegraphs: Telegraph[] = []
  kb = new Map<number, Vec>()

  player!: Entity
  companionIds = { kaya: false, torvald: false }

  level = 1
  xp = 0
  lp = 0
  gold = 60
  hp = 100
  maxHp = 100
  stamina = 80
  maxStamina = 80
  attributes = { might: 3, vigor: 3, intellect: 3, charisma: 3 }
  skills = { blade: 0, vitality: 0, signs: 0, speech: 0 }
  signs: Record<SignId, { unlocked: boolean; level: number }> = {
    igni: { unlocked: true, level: 1 },
    aard: { unlocked: false, level: 0 },
    quen: { unlocked: false, level: 0 },
    axii: { unlocked: false, level: 0 },
    shout: { unlocked: false, level: 1 },
  }
  weapon: string | null = 'sword_rusty'
  armor: string | null = null
  inventory: InventoryEntry[] = []
  faction: Faction = 'none'

  quests: Record<string, QuestState> = {}
  flags: Record<string, boolean> = {}
  bestiary = new Set<string>()
  removedProps = new Set<string>()
  kills = 0
  playtime = 0

  keys = new Set<string>()
  camera: Vec = { ...PLAYER_SPAWN }
  shake = 0
  tacticalPaused = false
  dialogueTree: string | null = null
  dlgChoices: DialogueChoice[] = []
  targetEid: number | null = null
  time = 0
  endingAt: number | null = null
  /** Фаза 7: выбранная в суде концовка. */
  pendingEndingId: string | null = null
  currentArea = ''
  destroyed = false
  buffT = 0

  // --- Фаза 3: сутки, зоны, масла ---
  dayClock = 0.3
  zone: ZoneId = 'valley'
  oilT = 0
  oilKind: string | null = null
  private zoneBusy = false

  // --- Фаза 4: партия (формации/одобрение/тактика) ---
  approval = { kaya: 45, torvald: 45 }
  formation: FormationId = 'wedge'
  selEid: number | null = null

  // --- Фаза 5: происхождение, Тишь, кинокамера диалогов ---
  origin: OriginId = 'warden'
  silence = 0
  dialogueFocusEid: number | null = null

  // --- Фаза 6: карьера (Gothic) и ямные бои ---
  career = { faction: null, rep: { order: 0, coven: 0, watch: 0 }, rank: { order: 0, coven: 0, watch: 0 } }
  pitTier = 0
  pitWave = 0

  // --- Фаза 6.2: Стылое Пределье (Thu'um и руны) ---
  shoutLv = { force: 0, frost: 0 }
  runes = { ...RUNE_INIT }

  // --- Фаза 6.3: Багровая Мара (оборона бастиона, транзитное — не сейвится) ---
  siege: SiegeState | null = null

  // --- Фаза 6.4: Спорные Земли (набег Орды, транзитное — не сейвится) ---
  assault: AssaultState | null = null
  /** Фаза 7: рейд в Сердце Разлома (транзитное). */
  raid: RaidState | null = null

  // --- Фаза 8: действующий пресет качества (при auto — с авто-даунгрейдом) ---
  effQuality: EffQuality = 'medium'
  private upStreak = 0
  /** v2.2: сенсорное устройство? (только для авто-даунгрейда в 'mobile') */
  private touchDevice = false

  // --- Внутреннее ---
  private ctx2d: CanvasRenderingContext2D
  private mini: HTMLCanvasElement | null = null
  private loop: GameLoop | null = null
  private dpr = 1

  constructor(canvas: HTMLCanvasElement, save: SaveData | null, opts?: CreateEngineOpts) {
    this.canvas = canvas
    this.canvas3d = opts?.canvas3d ?? null
    this.renderMode = opts?.mode ?? '3d'
    this.origin = opts?.origin ?? 'warden'
    this.inputCanvas = this.renderMode === '3d' && this.canvas3d ? this.canvas3d : canvas
    // v2.2: стартовый пресет ДО создания 3D-рендера — MSAA/разрешение верны с первого кадра
    const s0 = useGame.getState().settings
    if (s0.quality !== 'auto') this.effQuality = s0.quality
    this.touchDevice = typeof window !== 'undefined' && (window.matchMedia?.('(pointer: coarse)').matches || 'ontouchstart' in window)
    if (this.renderMode === '3d' && this.canvas3d) {
      // v2.1: 3D-сцена строится сразу под зону (по умолчанию долина; при загрузке
      // сейва в другой земле enterZone перестроит — идемпотентно)
      this.view3d = new Renderer3d(this.canvas3d, this.zone, { quality: this.effQuality })
    }
    this.ctx2d = canvas.getContext('2d') as CanvasRenderingContext2D
    // v2.1: терен запекается ПО ЗОНЕ (заглушка до первого enterZone).
    // Полный мир 8800×4200 на канвасе — ~148 МБ VRAM, что душило мобильные GPU.
    this.baked = document.createElement('canvas')
    this.baked.width = 1
    this.baked.height = 1
    this.initQuests()
    if (save) this.loadFrom(save)
    else this.newGame()
    this.bindInput()
    this.resize()
    // Фаза 8: применяем сохранённые настройки (громкости + пресет качества)
    this.applySettings(useGame.getState().settings)
    // v1.4: прелоад статичных WAV боевых реплик + сброс трекера босса
    preloadCombatVoice()
    resetBossBark()
  }

  // ---------------- Инициализация ----------------

  private buildColliders() {
    // v2.1: коллайдеры сцены зоны — озеро только в долине
    this.colliders = this.zone === 'valley' ? [{ x: LAKE.x, y: LAKE.y, r: LAKE.r - 5, propId: 'lake' }] : []
    for (const p of this.props) {
      if (!p.solid) continue
      if (p.kind === 'house') {
        // Дома — прямоугольный OBB-коллайдер точно по футпринту корпуса
        // (раньше круг r = max(w,h)*0.36 был вдвое меньше — игрок проходил сквозь стены)
        const hw = (p.w ?? 120) / 2
        const hd = (p.h ?? 70) / 2
        this.colliders.push({
          x: p.pos.x,
          y: p.pos.y,
          r: Math.hypot(hw, hd),
          hw,
          hd,
          rot: seedRot(p.seed ?? 1) * 0.2, // тот же поворот, что у меша в Props3d
          propId: p.id,
        })
      } else if (p.kind === 'stall') {
        const hw = (p.w ?? 70) / 2 + 4
        const hd = (p.h ?? 42) / 2 + 4
        this.colliders.push({ x: p.pos.x, y: p.pos.y, r: Math.hypot(hw, hd), hw, hd, rot: 0, propId: p.id })
      } else if (p.kind === 'tent') {
        // Конус-палатка: радиус меша w*0.42
        this.colliders.push({ x: p.pos.x, y: p.pos.y, r: (p.w ?? 60) * 0.45, propId: p.id })
      } else {
        this.colliders.push({ x: p.pos.x, y: p.pos.y, r: p.r ?? 10, propId: p.id })
      }
    }
  }

  private newGame() {
    this.inventory = [
      { item: 'potion_heal', qty: 3 },
      { item: 'potion_stam', qty: 2 },
    ]
    recalcStatsSys(this, true)
    this.hp = this.maxHp
    this.stamina = this.maxStamina
    this.createPlayer({ ...PLAYER_SPAWN })
    this.spawnWorld()
    // v2.3: обучение — первый шаг «движение» (продолжающим пройденное не показываем)
    showTutorial('move')
  }

  private loadFrom(s: SaveData) {
    applySave(this, s)
  }

  // ---------------- Делегаты: спавн/ввод ----------------

  createPlayer(pos: Vec) {
    createPlayerSys(this, pos)
  }

  spawnWorld() {
    spawnWorldSys(this)
  }

  /** v2.1: вход в зону-сцену. Фильтрует пропсы/коллайдеры/интерактивы под землю,
   *  выселяет сущности прошлой сцены, заселяет текущую, пересобирает 3D-вид
   *  и запекание терена. Идемпотентно (та же зона — нет работы). */
  enterZone(zone: ZoneId) {
    if (this.destroyed || this.sceneZone === zone) return
    this.sceneZone = zone
    this.zone = zone
    const zd = ZONE_DATA[zone]
    this.props = zd.props
    this.zoneInteractables = zd.interactables
    this.zoneClues = zd.clues
    this.buildColliders()
    // выселить сущности прошлой сцены — герой и партия переходят с игроком
    this.entities = this.entities.filter((e) => e.kind === 'player' || e.kind === 'companion')
    this.targetEid = null
    this.selEid = null
    spawnZoneContent(this, zone)
    this.baked = bakeZoneTerrain(zone)
    this.bakedRect = zoneViewRect(zone)
    // камера мгновенно к герою — без перелёта через полкарты
    this.camera = { ...this.player.pos }
    this.currentArea = '' // плашка зоны/области покажется заново
    this.view3d?.rebuildZone(zone)
    this.syncUi()
    // зеркало для E2E/диагностики (скрипты читают __echoScene)
    if (typeof window !== 'undefined') {
      ;(window as unknown as { __echoScene?: object }).__echoScene = {
        zone,
        props: this.props.length,
        entities: this.entities.length,
        npcs: this.entities.filter((e) => e.kind === 'npc').length,
        enemies: this.entities.filter((e) => e.kind === 'enemy').length,
        bakedW: this.baked.width,
        bakedH: this.baked.height,
      }
    }
  }

  spawnCompanion(id: 'kaya' | 'torvald') {
    spawnCompanionSys(this, id)
  }

  private bindInput() {
    bindInputSys(this)
  }

  private unbindInput() {
    unbindInputSys(this)
  }

  resize() {
    // v2.1: на узких экранах (телефон) капим DPR — полный dpr×2.5+ убивает FPS
    this.dpr = Math.min(window.innerWidth < 768 ? 1.5 : 2, window.devicePixelRatio || 1)
    const w = this.canvas.clientWidth || window.innerWidth
    const h = this.canvas.clientHeight || window.innerHeight
    this.canvas.width = Math.floor(w * this.dpr)
    this.canvas.height = Math.floor(h * this.dpr)
    this.view3d?.resize()
  }

  attachMinimap(c: HTMLCanvasElement | null) {
    this.mini = c
  }

  // ---------------- Цикл (делегат core/Game) ----------------

  start() {
    this.loop = new GameLoop(this)
    this.loop.start()
  }

  destroy() {
    this.destroyed = true
    this.loop?.stop()
    this.unbindInput()
    this.view3d?.dispose()
    this.view3d = null
    if (engineInstance === this) engineInstance = null
  }

  isFrozen() {
    return useGame.getState().panel !== null || this.dialogueTree !== null
  }

  /** Автосейв по расписанию цикла. */
  autosave() {
    this.saveGame(false)
  }

  // ---------------- Фаза 8: настройки/качество/FPS ----------------

  /** Применить настройки (зеркало стора) к аудио и рендеру; сохраняет в localStorage. */
  applySettings(s = useGame.getState().settings) {
    setMuted(s.muted)
    setVolumes({ music: s.musicVol, sfx: s.sfxVol, amb: s.ambVol })
    setVoiceVolume(s.voiceOn ? s.voiceVol : 0) // v1.1: озвучка реплик
    if (s.quality !== 'auto') this.effQuality = s.quality
    this.view3d?.setQuality(this.effQuality)
    useGame.getState().patch({ effQuality: this.effQuality })
    writeSettings(s)
  }

  /** FPS-метр цикла: зеркало в стор + авто-даунгрейд в режиме «Авто» (GDD 06 §7).
   *  v2.2: цепочка high → medium → low → mobile (в 'mobile' упираемся только
   *  на сенсорных устройствах — на десктопе терминал остаётся 'low'). */
  onFps(fps: number) {
    useGame.getState().patch({ fps })
    const q = useGame.getState().settings.quality
    if (q !== 'auto') return
    // Даунгрейд: среднее < 42 FPS → ступень ниже (на телефоне — вплоть до «Мобильного»)
    const bottom = this.touchDevice ? 'mobile' : 'low'
    if (fps < 42 && this.effQuality !== bottom) {
      this.effQuality = stepDown(this.effQuality)
      this.view3d?.setQuality(this.effQuality)
      useGame.getState().patch({ effQuality: this.effQuality })
      this.upStreak = 0
      this.toast(t('Производительность: качество снижено до «{q}»', { q: t(QUALITY_NAME[this.effQuality]) }), 'info')
      return
    }
    // Апгрейд после просадки: стабильно > 55 FPS три окна подряд — ступень вверх
    if (fps > 55 && this.effQuality !== 'high') {
      this.upStreak++
      if (this.upStreak >= 3) {
        this.effQuality = stepUp(this.effQuality)
        this.upStreak = 0
        this.view3d?.setQuality(this.effQuality)
        useGame.getState().patch({ effQuality: this.effQuality })
        this.toast(t('Качество повышено до «{q}»', { q: t(QUALITY_NAME[this.effQuality]) }), 'info')
      }
    } else {
      this.upStreak = 0
    }
  }

  /** v2.2: кап частоты кадров цикла — пресет «Мобильное» держит 30 FPS,
   *  экономя батарею и GPU (скип целых кадров, dt копится). */
  frameCap(): number {
    return this.effQuality === 'mobile' ? MOBILE_FPS_CAP : 0
  }

  /** Порядок систем симуляции — см. core/Game.stepWorld. */
  update(dt: number) {
    const px = this.player.pos.x
    const py = this.player.pos.y
    stepWorld(this, dt)
    // v2.3: обучение — шаг «движение» (дистанция за кадр) + таймер «меню»
    tickTutorial(Math.hypot(this.player.pos.x - px, this.player.pos.y - py), dt)
  }

  /** Косметика (частицы/флоатеры/тряска) — тикает даже при паузе/панелях. */
  updateCosmetics(dt: number) {
    stepCosmetics(this, dt)
  }

  // ---------------- Способности (делегаты systems/combat, ai) ----------------

  castAbility(id: string) {
    castAbilitySys(this, id)
  }

  castCompanionAbility(eid: number, abilityId: string, targetEid: number | null) {
    castCompanionAbilitySys(this, eid, abilityId, targetEid)
  }

  moveWithCollisions(e: Entity, vx: number, vy: number, dt: number) {
    moveWithCollisionsSys(this, e, vx, vy, dt)
  }

  // ---------------- Диалоги/квесты (делегаты systems/quest) ----------------

  private initQuests() {
    initQuestsSys(this)
  }

  openDialogue(treeId: string) {
    openDialogueSys(this, treeId)
  }

  chooseOption(i: number) {
    chooseOptionSys(this, i)
  }

  closeDialogue() {
    closeDialogueSys(this)
  }

  // ---------------- Предметы/прогресс (делегаты) ----------------

  buyItem(id: string) {
    buyItemSys(this, id)
  }

  sellItem(id: string) {
    sellItemSys(this, id)
  }

  equipItem(id: string) {
    equipItemSys(this, id)
  }

  unequipItem(slot: 'weapon' | 'armor') {
    unequipItemSys(this, slot)
  }

  useItem(id: string) {
    applyUseItem(this, id)
  }

  spendLp(attr: 'might' | 'vigor' | 'intellect' | 'charisma') {
    spendLpSys(this, attr)
  }

  trainOption(id: string) {
    trainOptionSys(this, id)
  }

  // ---------------- Панели / приказы / сейвы ----------------

  /** Переход через Врата Тумана / Врата Гранита: затемнение → телепорт партии → проявление. */
  travelTo(zone: ZoneId) {
    if (this.zoneBusy || this.destroyed) return
    if (zoneOf(this.player.pos.x, this.player.pos.y) === zone) return
    if (!this.player.alive) return
    this.zoneBusy = true
    // Фаза 6/6.2/6.3/6.4/6.5: из Гранита назад — через врата его стороны, из Пределья — через свои,
    // из Мары — через врата её стороны, из Спорных Земель — через свои, из Рубежа — через свои;
    // иначе — обычные врата
    let gate =
      zone === 'veld'
        ? GATES.veld
        : zone === 'granite'
          ? GR_GATES.granite
          : zone === 'frost'
            ? FR_GATES.frost
            : zone === 'mara'
              ? MA_GATES.mara
              : zone === 'disputed'
                ? DF_GATES.disputed
                : zone === 'rubezh'
                  ? RB_GATES.rubezh
                  : GATES.valley
    const from = zoneOf(this.player.pos.x, this.player.pos.y)
    if (zone === 'valley' && from === 'granite') {
      gate = GR_GATES.valleySide
    }
    if (zone === 'granite' && from === 'frost') {
      gate = FR_GATES.graniteSide
    }
    if (zone === 'granite' && from === 'mara') {
      gate = MA_GATES.graniteSide
    }
    if (zone === 'frost' && from === 'disputed') {
      gate = DF_GATES.frostSide
    }
    if (zone === 'disputed' && from === 'rubezh') {
      gate = RB_GATES.disputedSide
    }
    sfx('portal')
    useGame.getState().patch({ zoneFade: { label: t(gate.label), phase: 'out' } })
    window.setTimeout(() => {
      if (this.destroyed) return
      const p = { ...gate.exit }
      this.player.pos = { ...p }
      this.player.dest = null
      for (const e of this.entities) {
        if (e.kind === 'companion') {
          e.pos = { x: p.x - 26, y: p.y + 18 }
          e.home = { x: p.x - 26, y: p.y + 18 } // не возвращаться в прошлую зону
          e.dest = null
        }
      }
      // v2.1: перестроить сцену под зону (на фоне затемнения)
      this.enterZone(zone)
      endPitFightSafe(this) // яма остаётся в Граните — телепорт прерывает бой
      useGame.getState().patch({ zoneFade: { label: t(gate.label), phase: 'in' } })
      this.syncUi()
      window.setTimeout(() => {
        if (this.destroyed) return
        useGame.getState().patch({ zoneFade: null })
        this.zoneBusy = false
      }, 750)
    }, 750)
  }

  /** Переключение режима рендера (2D ⇄ 3D) на живую игру. */
  setRenderMode(mode: RenderMode) {
    if (this.renderMode === mode) return
    if (mode === '3d' && !this.canvas3d) return
    this.renderMode = mode
    this.unbindInput()
    this.inputCanvas = mode === '3d' ? this.canvas3d! : this.canvas
    if (mode === '3d') {
      this.view3d = new Renderer3d(this.canvas3d!, this.zone, { quality: this.effQuality })
      this.view3d.setQuality(this.effQuality) // Фаза 8: пресет качества и в новом 3D-виде
    } else {
      this.view3d?.dispose()
      this.view3d = null
    }
    this.bindInput()
    writeRenderMode(mode)
    useGame.getState().patch({ renderMode: mode })
    sfx('click')
    // канвас станет видимым после ре-рендера React — подгоняем размер следующим кадром
    requestAnimationFrame(() => {
      if (!this.destroyed) this.resize()
    })
  }

  openPanel(p: PanelId) {
    if (p === 'trainer') openTrainerSys(this)
    else useGame.getState().setPanel(p)
    sfx('click')
  }

  closePanel() {
    useGame.getState().setPanel(null)
    sfx('click')
  }

  setStance(eid: number) {
    const e = this.entities.find((x) => x.eid === eid)
    if (!e || e.kind !== 'companion') return
    const cur = e.stance ?? 'follow'
    const next: Stance = cur === 'follow' ? 'hold' : cur === 'hold' ? 'aggressive' : 'follow'
    e.stance = next
    if (next === 'hold') e.home = { ...e.pos }
    else e.dest = null // уходя с «держать», сбрасываем приказ движения
    this.toast(
      t('{name}: {order}', {
        name: t(e.name),
        order: t(next === 'follow' ? 'следовать' : next === 'hold' ? 'держать позицию' : 'атаковать всех'),
      }),
      'info',
    )
    sfx('click')
    this.syncUi()
  }

  // ---------------- Фаза 4: партия ----------------

  cycleFormation() {
    cycleFormationSys(this)
  }

  setTactical(on: boolean) {
    this.view3d?.setTactical(on)
  }

  saveGame(manual = true) {
    saveGameSys(this, manual)
  }

  toTitle() {
    hideTutorial()
    toTitleSys(this)
  }

  // ---------------- UI-мост ----------------

  toast(text: string, kind: ToastKind = 'info') {
    useGame.getState().pushToast(text, kind)
  }

  syncUi() {
    syncUiSys(this)
    // Эмбиент по зоне (Фаза 3/6/6.2/6.4)
    setAmbient(
      this.zone === 'veld'
        ? 'veld'
        : this.zone === 'granite'
          ? 'granite'
          : this.zone === 'frost'
            ? 'frost'
            : this.zone === 'mara'
              ? 'mara'
              : this.zone === 'disputed'
                ? 'disputed'
                : 'valley',
    )
    // Фаза 8: музыкальный директор — домен, бой (враг рядом или волновой штурм), пауза
    musicDomain(this.zone)
    const storm = this.siege !== null || this.assault !== null || this.raid !== null
    musicCombat(storm || nearestEnemyOf(this, this.player, 340) !== null)
    // v2.3: обучение — бой: впервые враг поблизости
    if (!storm && nearestEnemyOf(this, this.player, 340) !== null) showTutorial('combat')
    musicPaused(this.tacticalPaused)
    // v1.1: адаптивная тема босса — 3 фазы по HP (GDD 04 §4.3)
    const boss = findActiveBoss(this)
    musicBoss(boss !== null)
    if (boss) musicBossPhase(Math.max(0, Math.min(1, boss.hp / Math.max(1, boss.maxHp))))
  }

  // ---------------- Рендер (делегаты render2d) ----------------

  /** v2.3: на таче панели/диалог разворачиваются на весь экран непрозрачно —
   *  мир за ними можно вообще не рисовать: GPU/батарея отдыхают, пока игрок
   *  читает журнал/инвентарь/карту или ведёт диалог. musicTick продолжает
   *  тикать — музыка не замирает. На десктопе (полупрозрачные шторки) рендер
   *  живёт как раньше. */
  private renderSuspended(): boolean {
    const s = useGame.getState()
    return s.touchUi && (s.panel !== null || this.dialogueTree !== null)
  }

  renderMinimap() {
    if (!this.mini || this.renderSuspended()) return
    renderer2d.drawMinimap(
      this.mini,
      this.baked,
      this.bakedRect,
      this.entities,
      this.player.pos,
      questMarkerSys(this),
      this.mini.width,
      this.time,
    )
  }

  renderFullMap(canvas: HTMLCanvasElement) {
    renderer2d.drawFullMap(canvas, this.baked, this.bakedRect, this.zone, this.player.pos, questMarkerSys(this))
  }

  render() {
    musicTick() // Фаза 8: планировщик музыки — каждый кадр
    // v2.3: полноэкранная непрозрачная панель/диалог на таче — кадр не рисуем
    if (this.renderSuspended()) return
    if (this.renderMode === '3d' && this.view3d) {
      this.view3d.render({
        time: this.time,
        shake: this.shake,
        player: this.player,
        playerAlive: this.player.alive,
        entities: this.entities,
        particles: this.particles,
        floaters: this.floaters,
        telegraphs: this.telegraphs,
        targetEid: this.targetEid,
        removedProps: this.removedProps,
        zone: this.zone,
        dayT: this.dayClock,
        tactical: this.tacticalPaused,
        selEid: this.selEid,
        dialogue: this.dialogueTree !== null,
        dialogueFocus: this.dialogueFocusEid,
        silence: this.silence,
        runes: this.runes,
      })
      return
    }
    drawScene({
      ctx: this.ctx2d,
      renderer: renderer2d,
      w: this.canvas.clientWidth || 1,
      h: this.canvas.clientHeight || 1,
      dpr: this.dpr,
      camera: this.camera,
      shake: this.shake,
      time: this.time,
      baked: this.baked,
      bakedRect: this.bakedRect,
      props: this.props,
      removedProps: this.removedProps,
      interactables: this.zoneInteractables,
      clues: this.zoneClues,
      entities: this.entities,
      targetEid: this.targetEid,
      particles: this.particles,
      floaters: this.floaters,
      telegraphs: this.telegraphs,
      playerAlive: this.player.alive,
      zone: this.zone,
      dayT: this.dayClock,
      tactical: this.tacticalPaused,
      selEid: this.selEid,
      silence: this.silence,
    })
  }
}
