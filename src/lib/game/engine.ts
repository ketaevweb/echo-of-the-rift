import {
  DialogueChoice,
  Entity,
  Faction,
  Floater,
  InventoryEntry,
  Particle,
  QuestState,
  SaveData,
  SignId,
  Stance,
  Vec,
} from './types'
import { ABILITY_MAP } from './data/abilities'
import { QUESTS } from './data/quests'
import {
  INTERACTABLES,
  LAKE,
  PLAYER_SPAWN,
  PROPS,
  WORLD,
} from './data/world'
import {
  bakeTerrain,
  drawEntity,
  drawFloaters,
  drawFullMap,
  drawMinimap,
  drawParticles,
  drawProp,
} from './render'
import { sfx } from './sfx'
import {
  AbilityHud,
  PanelId,
  PartyHud,
  QuestHud,
  useGame,
} from './store'
import { ABILITY_BAR_IDS, BESTIARY_INFO } from './data/tables'
import { Collider, rndRange } from './core/util'
import { EngineCtx, ToastKind } from './core/ctx'
import { applySave, saveGame as saveGameSys, toTitle as toTitleSys } from './systems/save'
import {
  addItem as addItemSys,
  buyItem as buyItemSys,
  countItem as countItemSys,
  equipItem as equipItemSys,
  removeItem as removeItemSys,
  sellItem as sellItemSys,
  unequipItem as unequipItemSys,
  useItem as applyUseItem,
} from './systems/inventory'
import {
  openTrainer as openTrainerSys,
  recalcStats as recalcStatsSys,
  spendLp as spendLpSys,
  trainOption as trainOptionSys,
  xpNext as xpNextSys,
} from './systems/progression'
import {
  castCompanionAbility as castCompanionAbilitySys,
  createPlayer as createPlayerSys,
  spawnCompanion as spawnCompanionSys,
  spawnWorld as spawnWorldSys,
  updateCompanion as updateCompanionSys,
  updateEnemy as updateEnemySys,
} from './systems/ai'
import {
  castAbility as castAbilitySys,
  meleeAttack as meleeAttackSys,
  tickCds,
  updateParticles as updateParticlesSys,
  updateStatuses as updateStatusesSys,
} from './systems/combat'
import {
  bindInput as bindInputSys,
  unbindInput as unbindInputSys,
} from './systems/input'
import {
  moveWithCollisions as moveWithCollisionsSys,
  separate as separateSys,
  updatePlayer as updatePlayerSys,
} from './systems/movement'
import { nearestEnemyOf as nearestEnemyOfSys } from './core/entity'
import {
  advanceQuest as advanceQuestSys,
  checkProof as checkProofSys,
  chooseOption as chooseOptionSys,
  closeDialogue as closeDialogueSys,
  doInteract as doInteractSys,
  initQuests as initQuestsSys,
  nearestInteraction as nearestInteractionSys,
  openDialogue as openDialogueSys,
  pickInteractable as pickInteractableSys,
  questMarker as questMarkerSys,
  runInteractable as runInteractableSys,
  stageText as stageTextSys,
  updateArea as updateAreaSys,
  updateEnding as updateEndingSys,
} from './systems/quest'

export { BESTIARY_INFO } from './data/tables'

let engineInstance: GameEngine | null = null
export function getEngine() {
  return engineInstance
}
export function createEngine(canvas: HTMLCanvasElement, save: SaveData | null) {
  engineInstance = new GameEngine(canvas, save)
  if (typeof window !== 'undefined') {
    ;(window as unknown as { __echoEngine?: GameEngine }).__echoEngine = engineInstance
  }
  return engineInstance
}

export class GameEngine implements EngineCtx {
  canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private mini: HTMLCanvasElement | null = null
  baked: HTMLCanvasElement
  colliders: Collider[] = []
  props = [...PROPS].sort((a, b) => a.pos.y - b.pos.y)

  eidSeq = 1
  entities: Entity[] = []
  particles: Particle[] = []
  floaters: Floater[] = []
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
  private raf = 0
  private lastT = 0
  private syncT = 0
  private autosaveT = 0
  endingAt: number | null = null
  currentArea = ''
  destroyed = false
  buffT = 0
  private dpr = 1

  constructor(canvas: HTMLCanvasElement, save: SaveData | null) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d') as CanvasRenderingContext2D
    this.baked = bakeTerrain()
    this.buildColliders()
    this.initQuests()
    if (save) this.loadFrom(save)
    else this.newGame()
    this.bindInput()
    this.resize()
  }

  // ---------------- Инициализация ----------------

  private buildColliders() {
    this.colliders = [{ x: LAKE.x, y: LAKE.y, r: LAKE.r - 5, propId: 'lake' }]
    for (const p of this.props) {
      if (!p.solid) continue
      const r =
        p.kind === 'house'
          ? Math.max(p.w ?? 100, p.h ?? 60) * 0.36
          : p.kind === 'tent'
            ? (p.w ?? 60) * 0.4
            : (p.r ?? 10)
      this.colliders.push({ x: p.pos.x, y: p.pos.y, r, propId: p.id })
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
  }

  // ---------------- Спавн (делегаты systems/ai) ----------------

  createPlayer(pos: Vec) {
    createPlayerSys(this, pos)
  }

  spawnWorld() {
    spawnWorldSys(this)
  }

  spawnCompanion(id: 'kaya' | 'torvald') {
    spawnCompanionSys(this, id)
  }

  // ---------------- Ввод (делегаты systems/input) ----------------

  private bindInput() {
    bindInputSys(this)
  }

  private unbindInput() {
    unbindInputSys(this)
  }

  resize() {
    this.dpr = Math.min(2, window.devicePixelRatio || 1)
    const w = this.canvas.clientWidth || window.innerWidth
    const h = this.canvas.clientHeight || window.innerHeight
    this.canvas.width = Math.floor(w * this.dpr)
    this.canvas.height = Math.floor(h * this.dpr)
  }

  attachMinimap(c: HTMLCanvasElement | null) {
    this.mini = c
  }

  start() {
    this.lastT = performance.now()
    const loop = (t: number) => {
      if (this.destroyed) return
      const dt = Math.min(0.05, (t - this.lastT) / 1000)
      this.lastT = t
      this.time += dt
      if (!this.isFrozen() && !this.tacticalPaused) {
        this.playtime += dt
        this.update(dt)
      }
      this.render()
      this.syncT -= dt
      if (this.syncT <= 0) {
        this.syncT = 0.12
        this.syncUi()
        this.renderMinimap()
      }
      if (this.playtime > 0) {
        this.autosaveT += dt
        if (this.autosaveT > 45) {
          this.autosaveT = 0
          this.saveGame(false)
        }
      }
      this.raf = requestAnimationFrame(loop)
    }
    this.raf = requestAnimationFrame(loop)
  }

  destroy() {
    this.destroyed = true
    cancelAnimationFrame(this.raf)
    this.unbindInput()
    if (engineInstance === this) engineInstance = null
  }

  isFrozen() {
    return useGame.getState().panel !== null || this.dialogueTree !== null
  }

  // ---------------- Обновление ----------------

  private update(dt: number) {
    updatePlayerSys(this, dt)
    for (const e of this.entities) {
      if (e.kind === 'companion') updateCompanionSys(this, e, dt)
      else if (e.kind === 'enemy') updateEnemySys(this, e, dt)
      else if (e.kind === 'npc') e.walkPhase += dt * 0.5
      updateStatusesSys(this, e, dt)
      tickCds(e, dt)
    }
    separateSys(this)
    updateParticlesSys(this, dt)
    this.buffT = Math.max(0, this.buffT - dt)
    this.shake = Math.max(0, this.shake - dt * 26)
    updateAreaSys(this)
    updateEndingSys(this)
    const lerp = 1 - Math.pow(0.0001, dt)
    this.camera.x += (this.player.pos.x - this.camera.x) * lerp
    this.camera.y += (this.player.pos.y - this.camera.y) * lerp
    // не показываем зоны за пределами мира
    const vw = this.canvas.clientWidth || 1
    const vh = this.canvas.clientHeight || 1
    this.camera.x = Math.max(Math.min(vw / 2, WORLD.w / 2), Math.min(this.camera.x, WORLD.w - vw / 2))
    this.camera.y = Math.max(Math.min(vh / 2, WORLD.h / 2), Math.min(this.camera.y, WORLD.h - vh / 2))
  }

  moveWithCollisions(e: Entity, vx: number, vy: number, dt: number) {
    moveWithCollisionsSys(this, e, vx, vy, dt)
  }

  // ---------------- Способности игрока (делегат systems/combat) ----------------

  castAbility(id: string) {
    castAbilitySys(this, id)
  }

  castCompanionAbility(eid: number, abilityId: string, targetEid: number | null) {
    castCompanionAbilitySys(this, eid, abilityId, targetEid)
  }

  // ---------------- Диалоги/квесты/интеракты (делегаты systems/quest) ----------------

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

  private doInteract() {
    doInteractSys(this)
  }

  // ---------------- Предметы (делегаты systems/inventory) ----------------

  private addItem(id: string, qty: number) {
    addItemSys(this, id, qty)
  }

  private removeItem(id: string, qty: number) {
    removeItemSys(this, id, qty)
  }

  private countItem(id: string) {
    return countItemSys(this, id)
  }

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

  openPanel(p: PanelId) {
    if (p === 'trainer') openTrainerSys(this)
    else useGame.getState().setPanel(p)
    sfx('click')
  }

  closePanel() {
    useGame.getState().setPanel(null)
  }

  setStance(eid: number) {
    const e = this.entities.find((x) => x.eid === eid)
    if (!e || e.kind !== 'companion') return
    const cur = e.stance ?? 'follow'
    const next: Stance = cur === 'follow' ? 'hold' : cur === 'hold' ? 'aggressive' : 'follow'
    e.stance = next
    if (next === 'hold') e.home = { ...e.pos }
    this.toast(
      `${e.name}: ${next === 'follow' ? 'следовать' : next === 'hold' ? 'держать позицию' : 'атаковать всех'}`,
      'info',
    )
    sfx('click')
    this.syncUi()
  }

  saveGame(manual = true) {
    saveGameSys(this, manual)
  }

  private loadFrom(s: SaveData) {
    applySave(this, s)
  }

  toTitle() {
    toTitleSys(this)
  }

  // ---------------- Синхронизация UI ----------------

  toast(text: string, kind: ToastKind = 'info') {
    useGame.getState().pushToast(text, kind)
  }

  syncUi() {
    const st = useGame.getState()
    const party: PartyHud[] = [
      {
        eid: this.player.eid,
        id: 'player',
        name: 'Смотритель',
        role: this.faction === 'flame' ? 'Орден Пламени' : this.faction === 'mist' ? 'Ковен Тумана' : 'Смотритель',
        hp: Math.max(0, Math.round(this.hp)),
        maxHp: this.maxHp,
        alive: this.player.alive,
        stance: 'follow',
        abilities: [],
      },
    ]
    for (const e of this.entities) {
      if (e.kind !== 'companion') continue
      party.push({
        eid: e.eid,
        id: e.id,
        name: e.name,
        role: e.role ?? '',
        hp: Math.max(0, Math.round(e.hp)),
        maxHp: e.maxHp,
        alive: e.alive,
        stance: e.stance ?? 'follow',
        abilities:
          e.id === 'torvald'
            ? [
                { id: 'shieldbash', name: 'Удар щитом', icon: 'ShieldHalf', cd: e.cds['shieldbash'] ?? 0, cdMax: 8 },
                { id: 'warcry', name: 'Боевой клич', icon: 'Swords', cd: e.cds['warcry'] ?? 0, cdMax: 18 },
              ]
            : [
                { id: 'frostbolt', name: 'Лёд', icon: 'Snowflake', cd: e.cds['frostbolt'] ?? 0, cdMax: 4 },
                { id: 'mend', name: 'Лечение', icon: 'HeartPulse', cd: e.cds['mend'] ?? 0, cdMax: 10 },
              ],
      })
    }
    const abilities: AbilityHud[] = ABILITY_BAR_IDS.map((id) => {
      const ab = ABILITY_MAP[id]
      let unlocked = true
      if (ab.kind === 'sign') unlocked = this.signs[id as SignId]?.unlocked ?? false
      if (id === 'shout') unlocked = this.signs.shout.unlocked
      if (ab.kind === 'potion') unlocked = this.countItem(id) > 0
      const cdKey = ab.kind === 'potion' ? 'potion' : id
      return {
        id,
        name: ab.name,
        desc: ab.desc,
        icon: ab.icon,
        hotkey: ab.hotkey,
        cd: this.player.cds[cdKey] ?? 0,
        cdMax: ab.cooldown,
        unlocked,
        staminaCost: ab.staminaCost,
      }
    })
    const quests: QuestHud[] = QUESTS.map((qd) => ({
      id: qd.id,
      name: qd.name,
      stage: this.quests[qd.id].stage,
      done: this.quests[qd.id].done,
      counter: this.quests[qd.id].counter,
      summary: qd.summary,
      stageText:
        this.quests[qd.id].stage > 0 || this.quests[qd.id].done ? stageTextSys(this, qd.id) : qd.stages[0].text,
      side: qd.side ?? false,
    }))
    const mainQ = quests.find((q) => q.id === 'main')!
    const contractQ = quests.find((q) => q.id === 'contract')!
    const boss = this.entities.find((e) => e.enemyType === 'boss' && e.alive && e.aiState !== 'idle')
    const n = this.isFrozen() ? null : nearestInteractionSys(this)
    st.patch({
      party,
      abilities,
      player: {
        level: this.level,
        xp: this.xp,
        xpNext: xpNextSys(this),
        hp: Math.max(0, Math.round(this.hp)),
        maxHp: this.maxHp,
        stamina: Math.round(this.stamina),
        maxStamina: this.maxStamina,
        lp: this.lp,
        gold: this.gold,
        faction: this.faction,
        weapon: this.weapon,
        armor: this.armor,
        attributes: { ...this.attributes },
        skills: { ...this.skills },
        signs: JSON.parse(JSON.stringify(this.signs)) as Record<SignId, { unlocked: boolean; level: number }>,
        shield: this.player.shield,
      },
      inventory: this.inventory.map((i) => ({ ...i })),
      quests,
      trackerQuest: mainQ.done ? null : mainQ,
      contractQuest: contractQ.stage > 0 && !contractQ.done ? contractQ : null,
      bossBar: boss ? { name: 'Пожиратель Бурь', hp: Math.round(boss.hp), maxHp: boss.maxHp } : null,
      interactHint: n ? `${n.label} — [F]` : null,
      bestiary: [...this.bestiary],
    })
  }

  private renderMinimap() {
    if (!this.mini) return
    drawMinimap(this.mini, this.baked, this.entities, this.player.pos, questMarkerSys(this), this.mini.width, this.time)
  }

  renderFullMap(canvas: HTMLCanvasElement) {
    drawFullMap(canvas, this.baked, this.player.pos, questMarkerSys(this))
  }

  // ---------------- Рендер ----------------

  private render() {
    const ctx = this.ctx
    const w = this.canvas.clientWidth || 1
    const h = this.canvas.clientHeight || 1
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    ctx.fillStyle = '#1a2014'
    ctx.fillRect(0, 0, w, h)
    const shakeX = this.shake > 0 ? rndRange(-this.shake, this.shake) : 0
    const shakeY = this.shake > 0 ? rndRange(-this.shake, this.shake) : 0
    ctx.save()
    ctx.translate(Math.round(w / 2 - this.camera.x + shakeX), Math.round(h / 2 - this.camera.y + shakeY))
    ctx.drawImage(this.baked, 0, 0)
    for (const p of this.props) {
      if (p.id && this.removedProps.has(p.id)) continue
      drawProp(ctx, p, this.time)
    }
    // травы-интерактивы (визуал)
    for (const it of INTERACTABLES) {
      if (it.kind !== 'herb' || this.removedProps.has(it.id)) continue
      const pulse = 0.5 + 0.5 * Math.sin(this.time * 2.5 + it.pos.x)
      ctx.fillStyle = `rgba(200,230,190,${0.35 + pulse * 0.3})`
      ctx.beginPath()
      ctx.arc(it.pos.x, it.pos.y - 8, 5 + pulse * 2, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#9fb8a4'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(it.pos.x, it.pos.y)
      ctx.lineTo(it.pos.x, it.pos.y - 10)
      ctx.moveTo(it.pos.x, it.pos.y - 5)
      ctx.lineTo(it.pos.x - 5, it.pos.y - 11)
      ctx.moveTo(it.pos.x, it.pos.y - 5)
      ctx.lineTo(it.pos.x + 5, it.pos.y - 11)
      ctx.stroke()
    }
    const boss = this.entities.find((e) => e.enemyType === 'boss' && e.alive)
    if (boss && boss.slamT > 0) {
      ctx.strokeStyle = `rgba(201,79,61,${0.4 + 0.4 * Math.sin(this.time * 20)})`
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(boss.pos.x, boss.pos.y, 175, 0, Math.PI * 2)
      ctx.stroke()
      ctx.fillStyle = 'rgba(201,79,61,0.08)'
      ctx.fill()
    }
    const sorted = [...this.entities].sort((a, b) => a.pos.y - b.pos.y)
    for (const e of sorted) {
      drawEntity(ctx, e, this.time, this.targetEid === e.eid)
    }
    drawParticles(ctx, this.particles)
    drawFloaters(ctx, this.floaters)
    ctx.restore()
    const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.45, w / 2, h / 2, Math.max(w, h) * 0.75)
    vg.addColorStop(0, 'rgba(0,0,0,0)')
    vg.addColorStop(1, 'rgba(10,8,5,0.55)')
    ctx.fillStyle = vg
    ctx.fillRect(0, 0, w, h)
    if (!this.player.alive) {
      ctx.fillStyle = 'rgba(60,10,10,0.5)'
      ctx.fillRect(0, 0, w, h)
    }
  }
}
