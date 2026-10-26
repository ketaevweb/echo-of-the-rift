import {
  DialogueChoice,
  Entity,
  Faction,
  Floater,
  InteractableDef,
  Particle,
  QuestState,
  SaveData,
  SignId,
  Stance,
  Vec,
} from './types'
import { ABILITY_MAP, ENEMY_STATS, FIRE_WEAK, STUN_WEAK } from './data/abilities'
import { ITEMS, MERCHANT_STOCK, SELL_RATE } from './data/items'
import { QUESTS, QUEST_MAP } from './data/quests'
import { DIALOGUES, PORTRAITS } from './data/dialogues'
import {
  AREAS,
  INTERACTABLES,
  LAKE,
  NPCS,
  PLAYER_SPAWN,
  PROPS,
  SPAWN_ZONES,
  UNIQUE_SPAWNS,
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
  TrainerHudState,
  useGame,
  writeSave,
} from './store'

interface Collider {
  x: number
  y: number
  r: number
  propId?: string
}

const ABILITY_BAR_IDS = ['igni', 'aard', 'quen', 'axii', 'shout', 'potion_heal', 'potion_stam']

export const BESTIARY_INFO: Record<string, { name: string; text: string; weakness: string }> = {
  wolf: {
    name: 'Лесной волк',
    text: 'Озверевшая стая Сумрачного леса. Кусает быстро, но шкура тонкая.',
    weakness: 'Уязвим к огню (Игни).',
  },
  alpha: {
    name: 'Лютая волчица',
    text: 'Старая, умная и злая. Шрамы говорят: охотилась на людей не раз.',
    weakness: 'Уязвима к огню. Двойной урон от Игни.',
  },
  bandit: {
    name: 'Разбойник',
    text: 'Дезертиры с трактов. Дерутся грязно, зато предсказуемо.',
    weakness: 'Особых нет. Аард ломает строй.',
  },
  archer: {
    name: 'Разбойник-лучник',
    text: 'Стреляет издалека и норовит держать дистанцию.',
    weakness: 'Сближение. Аксий даёт фору.',
  },
  captain: {
    name: 'Главарь разбойников',
    text: 'Два шрама поперёк лица — и два подхода к фехтованию.',
    weakness: 'Квен против натиска. Боевой клич Торвальда помогает.',
  },
  horror: {
    name: 'Порождение Разлома',
    text: 'Сгусток чужой голодной мысли. Полупрозрачный, шипит на свет.',
    weakness: 'Аксий держит его вдвое дольше.',
  },
  boss: {
    name: 'Пожиратель Бурь',
    text: 'Пасть Разлома. Ел королей и богов с их молитвами. Славит отчаяние.',
    weakness: 'Сильные удержания. Убеждение (СЛ 15) ослабляет его ещё до боя.',
  },
}

const ENEMY_NAME: Record<string, string> = {
  wolf: 'Лесной волк',
  alpha: 'Лютая волчица',
  bandit: 'Разбойник',
  archer: 'Лучник',
  captain: 'Главарь разбойников',
  horror: 'Порождение Разлома',
  boss: 'Пожиратель Бурь',
}

const ATTR_NAMES: Record<string, string> = {
  might: 'Мощь',
  vigor: 'Стойкость',
  intellect: 'Разум',
  charisma: 'Обаяние',
}

function rndRange(a: number, b: number) {
  return a + Math.random() * (b - a)
}
function d(sides: number) {
  return 1 + Math.floor(Math.random() * sides)
}
function angleDiff(a: number, b: number) {
  let x = Math.abs(a - b) % (Math.PI * 2)
  if (x > Math.PI) x = Math.PI * 2 - x
  return x
}

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

export class GameEngine {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private mini: HTMLCanvasElement | null = null
  private baked: HTMLCanvasElement
  private colliders: Collider[] = []
  private props = [...PROPS].sort((a, b) => a.pos.y - b.pos.y)

  private eidSeq = 1
  private entities: Entity[] = []
  private particles: Particle[] = []
  private floaters: Floater[] = []
  private kb = new Map<number, Vec>()

  private player!: Entity
  private companionIds = { kaya: false, torvald: false }

  private level = 1
  private xp = 0
  private lp = 0
  private gold = 60
  private hp = 100
  private maxHp = 100
  private stamina = 80
  private maxStamina = 80
  private attributes = { might: 3, vigor: 3, intellect: 3, charisma: 3 }
  private skills = { blade: 0, vitality: 0, signs: 0, speech: 0 }
  private signs: Record<SignId, { unlocked: boolean; level: number }> = {
    igni: { unlocked: true, level: 1 },
    aard: { unlocked: false, level: 0 },
    quen: { unlocked: false, level: 0 },
    axii: { unlocked: false, level: 0 },
    shout: { unlocked: false, level: 1 },
  }
  private weapon: string | null = 'sword_rusty'
  private armor: string | null = null
  private inventory: Array<{ item: string; qty: number }> = []
  private faction: Faction = 'none'

  private quests: Record<string, QuestState> = {}
  private flags: Record<string, boolean> = {}
  private bestiary = new Set<string>()
  private removedProps = new Set<string>()
  private kills = 0
  private playtime = 0

  private keys = new Set<string>()
  private camera: Vec = { ...PLAYER_SPAWN }
  private shake = 0
  private tacticalPaused = false
  private dialogueTree: string | null = null
  private dlgChoices: DialogueChoice[] = []
  private targetEid: number | null = null
  private time = 0
  private raf = 0
  private lastT = 0
  private syncT = 0
  private autosaveT = 0
  private endingAt: number | null = null
  private currentArea = ''
  private destroyed = false
  private buffT = 0
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

  private initQuests() {
    for (const q of QUESTS) {
      this.quests[q.id] = { stage: 0, counter: 0, done: false }
    }
  }

  private newGame() {
    this.inventory = [
      { item: 'potion_heal', qty: 3 },
      { item: 'potion_stam', qty: 2 },
    ]
    this.recalcStats(true)
    this.hp = this.maxHp
    this.stamina = this.maxStamina
    this.createPlayer({ ...PLAYER_SPAWN })
    this.spawnWorld()
  }

  private recalcStats(full = false) {
    const newMaxHp = 80 + this.attributes.vigor * 8 + this.skills.vitality * 15 + (this.level - 1) * 8
    if (full) this.maxHp = newMaxHp
    else if (newMaxHp !== this.maxHp) {
      const ratio = this.hp / this.maxHp
      this.maxHp = newMaxHp
      this.hp = Math.min(this.maxHp, Math.max(1, Math.round(ratio * this.maxHp)))
    }
    this.maxStamina = 70 + this.attributes.vigor * 3 + (this.level - 1) * 4
    this.stamina = Math.min(this.stamina, this.maxStamina)
    this.refreshPlayerStats()
  }

  private refreshPlayerStats() {
    if (!this.player) return
    this.player.maxHp = this.maxHp
    this.player.hp = Math.max(0, Math.min(this.player.hp, this.maxHp))
    this.player.atkBonus = this.playerAtk().atkBonus
    this.player.ac = this.playerAc()
    this.player.dmgMod = this.playerAtk().mod
  }

  private playerAtk() {
    const w = this.weapon ? ITEMS[this.weapon] : null
    return {
      atkBonus: 2 + Math.floor(this.level / 2) + Math.floor(this.attributes.might / 2) + this.skills.blade,
      mod: (w?.damage ?? 2) + Math.floor(this.attributes.might / 2),
    }
  }

  private playerAc() {
    const a = this.armor ? ITEMS[this.armor] : null
    return 10 + (a?.ac ?? 0) + Math.floor(this.attributes.vigor / 2)
  }

  private signPower() {
    const robe = this.armor === 'armor_robe' ? 0.1 : 0
    return 1 + this.skills.signs * 0.15 + (this.attributes.intellect - 3) * 0.08 + robe
  }

  private xpNext() {
    return 100 + (this.level - 1) * 60
  }

  private makeEntity(base: Partial<Entity>): Entity {
    return {
      id: base.id ?? 'e',
      eid: this.eidSeq++,
      kind: base.kind ?? 'enemy',
      name: base.name ?? '',
      role: base.role,
      pos: base.pos ?? { x: 0, y: 0 },
      vel: { x: 0, y: 0 },
      radius: base.radius ?? 14,
      facing: base.facing ?? 0,
      color: base.color ?? '#8a7a54',
      hp: base.hp ?? 30,
      maxHp: base.maxHp ?? base.hp ?? 30,
      alive: base.alive ?? true,
      team: base.team ?? 'hostile',
      speed: base.speed ?? 110,
      atkBonus: base.atkBonus ?? 3,
      ac: base.ac ?? 11,
      dmgDice: base.dmgDice ?? 1,
      dmgSides: base.dmgSides ?? 6,
      dmgMod: base.dmgMod ?? 0,
      attackCd: base.attackCd ?? 1.3,
      attackRange: base.attackRange ?? 44,
      ranged: base.ranged,
      enemyType: base.enemyType,
      boss: base.boss,
      aiState: base.aiState ?? 'idle',
      home: base.home ? { ...base.home } : { ...(base.pos ?? { x: 0, y: 0 }) },
      aggroR: base.aggroR ?? 200,
      leashR: base.leashR ?? 600,
      wanderT: 0,
      stunT: 0,
      burnT: 0,
      burnTick: 0,
      slowT: 0,
      shield: 0,
      targetEid: null,
      attackT: 0,
      hitT: 0,
      castT: 0,
      cds: { atk: 0 },
      respawnAt: undefined,
      summonStage: 0,
      slamT: 0,
      walkPhase: 0,
      downT: 0,
      dest: null,
      stance: base.stance,
      zoneId: base.zoneId,
      npc: base.npc,
    }
  }

  private createPlayer(pos: Vec) {
    this.player = this.makeEntity({
      id: 'player',
      kind: 'player',
      name: 'Смотритель',
      pos: { ...pos },
      color: '#c46a2b',
      radius: 13,
      hp: this.hp,
      maxHp: this.maxHp,
      team: 'party',
      speed: 160,
      atkBonus: this.playerAtk().atkBonus,
      ac: this.playerAc(),
      dmgDice: 1,
      dmgSides: 6,
      dmgMod: this.playerAtk().mod,
      attackCd: 0.9,
      attackRange: 52,
      aggroR: 0,
      leashR: 99999,
    })
    this.entities.push(this.player)
  }

  private spawnWorld() {
    for (const n of NPCS) {
      if (n.id === 'kaya' && this.companionIds.kaya) continue
      if (n.id === 'torvald_npc' && this.companionIds.torvald) continue
      this.entities.push(
        this.makeEntity({
          id: n.id,
          kind: 'npc',
          name: n.name,
          role: n.role,
          pos: { ...n.pos },
          color: n.color,
          radius: 13,
          hp: 1,
          maxHp: 1,
          team: 'village',
          speed: 0,
          npc: n,
        }),
      )
    }
    for (const z of SPAWN_ZONES) {
      for (let i = 0; i < z.max; i++) this.spawnZoneEnemy(z)
    }
    for (const u of UNIQUE_SPAWNS) {
      if (u.enemy === 'alpha' && this.flags.alphaDead) continue
      if (u.enemy === 'captain' && this.flags.captainDead) continue
      if (u.enemy === 'boss' && this.flags.bossDead) continue
      this.spawnUnique(u.enemy, u.pos)
    }
    if (this.companionIds.kaya) this.spawnCompanion('kaya')
    if (this.companionIds.torvald) this.spawnCompanion('torvald')
    if (this.flags.gateOpen) {
      this.removedProps.add('barrier')
      this.removedProps.add('barrier2')
      this.removedProps.add('barrier3')
    }
    for (let i = 1; i <= 4; i++) {
      if (this.flags['herb_herb' + i]) this.removedProps.add('herb' + i)
    }
  }

  private spawnZoneEnemy(z: (typeof SPAWN_ZONES)[number]) {
    const st = ENEMY_STATS[z.enemy]
    const a = Math.random() * Math.PI * 2
    const rr = Math.random() * z.radius
    const pos = { x: z.center.x + Math.cos(a) * rr, y: z.center.y + Math.sin(a) * rr }
    const e = this.makeEntity({
      id: z.enemy,
      name: ENEMY_NAME[z.enemy],
      pos,
      radius: st.radius,
      hp: st.hp,
      maxHp: st.hp,
      speed: st.speed,
      atkBonus: st.atk,
      ac: st.ac,
      dmgDice: st.dmgDice,
      dmgSides: st.dmgSides,
      dmgMod: st.dmgMod,
      attackCd: st.attackCd,
      attackRange: st.attackRange,
      ranged: st.ranged,
      enemyType: z.enemy,
      aggroR: st.aggroR,
      leashR: st.leashR,
    })
    e.zoneId = z.id
    e.home = { ...pos }
    this.entities.push(e)
  }

  private spawnUnique(type: 'alpha' | 'captain' | 'boss', pos: Vec) {
    const st = ENEMY_STATS[type]
    const e = this.makeEntity({
      id: type,
      name: ENEMY_NAME[type],
      pos: { ...pos },
      radius: st.radius,
      hp: st.hp,
      maxHp: st.hp,
      speed: st.speed,
      atkBonus: st.atk,
      ac: st.ac,
      dmgDice: st.dmgDice,
      dmgSides: st.dmgSides,
      dmgMod: st.dmgMod,
      attackCd: st.attackCd,
      attackRange: st.attackRange,
      ranged: st.ranged,
      enemyType: type,
      boss: type === 'boss',
      aggroR: type === 'boss' ? 0 : st.aggroR,
      leashR: st.leashR,
    })
    this.entities.push(e)
  }

  private spawnCompanion(id: 'kaya' | 'torvald') {
    if (this.companionIds[id]) return
    this.companionIds[id] = true
    const npcDef = NPCS.find((n) => n.id === (id === 'torvald' ? 'torvald_npc' : id))
    const isKaya = id === 'kaya'
    const e = this.makeEntity({
      id,
      kind: 'companion',
      name: npcDef?.name ?? id,
      role: npcDef?.role ?? '',
      pos: { x: this.player.pos.x - 26, y: this.player.pos.y + 18 },
      color: isKaya ? '#9fb8a4' : '#7a8a4a',
      radius: 13,
      hp: (isKaya ? 70 : 110) + (this.level - 1) * 10,
      maxHp: (isKaya ? 70 : 110) + (this.level - 1) * 10,
      team: 'party',
      speed: 158,
      atkBonus: isKaya ? 4 : 5,
      ac: isKaya ? 12 : 13,
      dmgDice: 1,
      dmgSides: isKaya ? 6 : 8,
      dmgMod: isKaya ? 2 : 3,
      attackCd: isKaya ? 1.8 : 1.1,
      attackRange: isKaya ? 220 : 46,
      ranged: isKaya ? 240 : undefined,
      aggroR: 0,
      leashR: 99999,
      stance: 'follow',
    })
    this.entities.push(e)
    this.entities = this.entities.filter(
      (x) => !(x.kind === 'npc' && x.id === (id === 'torvald' ? 'torvald_npc' : id)),
    )
  }

  // ---------------- Ввод ----------------

  private onKeyDown = (ev: KeyboardEvent) => {
    const store = useGame.getState()
    if (this.dialogueTree) {
      const n = parseInt(ev.key, 10)
      if (!isNaN(n) && n >= 1 && n <= 9) {
        this.chooseOption(n - 1)
        ev.preventDefault()
      } else if (ev.key === 'Escape') {
        this.closeDialogue()
      }
      return
    }
    if (ev.key === 'Escape') {
      if (store.panel && store.panel !== 'ending') this.closePanel()
      else if (!store.panel) this.openPanel('pause')
      return
    }
    if (store.panel) {
      const map: Record<string, PanelId> = { c: 'char', i: 'inv', j: 'journal', m: 'map' }
      const k = ev.key.toLowerCase()
      if (map[k] && store.panel === map[k]) {
        this.closePanel()
        ev.preventDefault()
      }
      return
    }
    const k = ev.key.toLowerCase()
    this.keys.add(k)
    if (k === ' ') {
      this.tacticalPaused = !this.tacticalPaused
      useGame.getState().patch({ paused: this.tacticalPaused })
      sfx('click')
      ev.preventDefault()
      return
    }
    if (k === 'f' || k === 'а') this.doInteract()
    if (k === 'c' || k === 'с') this.openPanel('char')
    if (k === 'i' || k === 'ш') this.openPanel('inv')
    if (k === 'j' || k === 'о') this.openPanel('journal')
    if (k === 'm' || k === 'ь') this.openPanel('map')
    if (k >= '1' && k <= '7') {
      const id = ABILITY_BAR_IDS[parseInt(k, 10) - 1]
      if (id) this.castAbility(id)
    }
    if (k === 'q' || k === 'й') this.castAbility('potion_heal')
    if (k === 'e' || k === 'у') this.castAbility('potion_stam')
  }

  private onKeyUp = (ev: KeyboardEvent) => {
    this.keys.delete(ev.key.toLowerCase())
  }

  private canvasPoint(ev: PointerEvent): Vec {
    const rect = this.canvas.getBoundingClientRect()
    return {
      x: this.camera.x + (ev.clientX - rect.left - rect.width / 2),
      y: this.camera.y + (ev.clientY - rect.top - rect.height / 2),
    }
  }

  private onPointerDown = (ev: PointerEvent) => {
    if (useGame.getState().panel || this.dialogueTree) return
    if (ev.button !== 0) return
    const p = this.canvasPoint(ev)
    const enemy = this.pickEntity(p, (e) => e.kind === 'enemy' && e.alive, 10)
    if (enemy) {
      this.targetEid = enemy.eid
      sfx('click')
      return
    }
    const npc = this.pickEntity(p, (e) => e.kind === 'npc' && e.alive, 22)
    if (npc && npc.npc) {
      this.openDialogue(npc.npc.dialogue)
      return
    }
    const it = this.pickInteractable(p, 28)
    if (it) {
      this.runInteractable(it)
      return
    }
    this.targetEid = null
    this.player.dest = p
  }

  private pickEntity(p: Vec, filter: (e: Entity) => boolean, extra = 0): Entity | null {
    let best: Entity | null = null
    let bd = 1e9
    for (const e of this.entities) {
      if (!filter(e)) continue
      const dist = Math.hypot(e.pos.x - p.x, e.pos.y - p.y)
      if (dist < e.radius + extra && dist < bd) {
        bd = dist
        best = e
      }
    }
    return best
  }

  private bindInput() {
    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
    this.canvas.addEventListener('pointerdown', this.onPointerDown)
  }

  private unbindInput() {
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    this.canvas.removeEventListener('pointerdown', this.onPointerDown)
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

  private isFrozen() {
    return useGame.getState().panel !== null || this.dialogueTree !== null
  }

  // ---------------- Обновление ----------------

  private update(dt: number) {
    this.updatePlayer(dt)
    for (const e of this.entities) {
      if (e.kind === 'companion') this.updateCompanion(e, dt)
      else if (e.kind === 'enemy') this.updateEnemy(e, dt)
      else if (e.kind === 'npc') e.walkPhase += dt * 0.5
      this.updateStatuses(e, dt)
      this.tickCds(e, dt)
    }
    this.separate()
    this.updateParticles(dt)
    this.buffT = Math.max(0, this.buffT - dt)
    this.shake = Math.max(0, this.shake - dt * 26)
    this.updateArea()
    this.updateEnding()
    const lerp = 1 - Math.pow(0.0001, dt)
    this.camera.x += (this.player.pos.x - this.camera.x) * lerp
    this.camera.y += (this.player.pos.y - this.camera.y) * lerp
    // не показываем зоны за пределами мира
    const vw = this.canvas.clientWidth || 1
    const vh = this.canvas.clientHeight || 1
    this.camera.x = Math.max(Math.min(vw / 2, WORLD.w / 2), Math.min(this.camera.x, WORLD.w - vw / 2))
    this.camera.y = Math.max(Math.min(vh / 2, WORLD.h / 2), Math.min(this.camera.y, WORLD.h - vh / 2))
  }

  private tickCds(e: Entity, dt: number) {
    for (const k of Object.keys(e.cds)) {
      if (e.cds[k] > 0) e.cds[k] = Math.max(0, e.cds[k] - dt)
    }
    e.attackT = Math.max(0, e.attackT - dt)
    e.hitT = Math.max(0, e.hitT - dt)
    e.castT = Math.max(0, e.castT - dt)
  }

  private updateStatuses(e: Entity, dt: number) {
    if (!e.alive) return
    if (e.stunT > 0) e.stunT -= dt
    if (e.slowT > 0) e.slowT -= dt
    if (e.burnT > 0) {
      e.burnT -= dt
      e.burnTick -= dt
      if (e.burnTick <= 0) {
        e.burnTick = 0.5
        this.damage(e, Math.max(1, Math.round(2 * this.signPower())), {
          silent: true,
          color: '#e08a3a',
        })
      }
    }
  }

  private moveWithCollisions(e: Entity, vx: number, vy: number, dt: number) {
    const kbi = this.kb.get(e.eid)
    let nx = e.pos.x + (vx + (kbi?.x ?? 0)) * dt
    let ny = e.pos.y + (vy + (kbi?.y ?? 0)) * dt
    if (kbi) {
      const decay = Math.pow(0.002, dt)
      kbi.x *= decay
      kbi.y *= decay
      if (Math.hypot(kbi.x, kbi.y) < 8) this.kb.delete(e.eid)
    }
    nx = Math.max(30, Math.min(WORLD.w - 30, nx))
    ny = Math.max(30, Math.min(WORLD.h - 30, ny))
    for (const c of this.colliders) {
      if (c.propId && this.removedProps.has(c.propId)) continue
      const dx = nx - c.x
      const dy = ny - c.y
      const dist = Math.hypot(dx, dy)
      const min = c.r + e.radius * 0.7
      if (dist < min && dist > 0.001) {
        nx = c.x + (dx / dist) * min
        ny = c.y + (dy / dist) * min
      }
    }
    e.pos.x = nx
    e.pos.y = ny
  }

  private separate() {
    const alive = this.entities.filter((e) => e.alive && e.kind !== 'npc')
    for (let i = 0; i < alive.length; i++) {
      for (let j = i + 1; j < alive.length; j++) {
        const a = alive[i]
        const b = alive[j]
        const dx = b.pos.x - a.pos.x
        const dy = b.pos.y - a.pos.y
        const dist = Math.hypot(dx, dy)
        const min = a.radius + b.radius
        if (dist < min && dist > 0.01) {
          const push = ((min - dist) / 2) * 0.6
          const ux = dx / dist
          const uy = dy / dist
          if (a.kind !== 'player') {
            a.pos.x -= ux * push
            a.pos.y -= uy * push
          }
          if (b.kind !== 'player') {
            b.pos.x += ux * push
            b.pos.y += uy * push
          }
        }
      }
    }
  }

  private nearestParty(from: Vec, maxDist = 1e9): Entity | null {
    let best: Entity | null = null
    let bd = maxDist
    for (const e of this.entities) {
      if ((e.kind !== 'player' && e.kind !== 'companion') || !e.alive) continue
      const dist = Math.hypot(e.pos.x - from.x, e.pos.y - from.y)
      if (dist < bd) {
        bd = dist
        best = e
      }
    }
    return best
  }

  private nearestEnemyOf(from: Entity, maxDist: number): Entity | null {
    let best: Entity | null = null
    let bd = maxDist
    for (const e of this.entities) {
      if (e.kind !== 'enemy' || !e.alive) continue
      const dist = Math.hypot(e.pos.x - from.pos.x, e.pos.y - from.pos.y)
      if (dist < bd) {
        bd = dist
        best = e
      }
    }
    return best
  }

  private updatePlayer(dt: number) {
    const p = this.player
    if (!p.alive) return
    let mx = 0
    let my = 0
    if (this.keys.has('w') || this.keys.has('arrowup') || this.keys.has('ц')) my -= 1
    if (this.keys.has('s') || this.keys.has('arrowdown') || this.keys.has('ы')) my += 1
    if (this.keys.has('a') || this.keys.has('arrowleft') || this.keys.has('ф')) mx -= 1
    if (this.keys.has('d') || this.keys.has('arrowright') || this.keys.has('в')) mx += 1
    const moving = mx !== 0 || my !== 0
    if (moving) {
      const l = Math.hypot(mx, my)
      p.vel = { x: (mx / l) * p.speed, y: (my / l) * p.speed }
      p.dest = null
    } else if (p.dest) {
      const dx = p.dest.x - p.pos.x
      const dy = p.dest.y - p.pos.y
      const dist = Math.hypot(dx, dy)
      if (dist < 8) p.dest = null
      else p.vel = { x: (dx / dist) * p.speed, y: (dy / dist) * p.speed }
    } else {
      p.vel = { x: 0, y: 0 }
    }
    const target = this.targetEid ? this.entities.find((e) => e.eid === this.targetEid) : null
    if (target && target.alive) {
      p.facing = Math.atan2(target.pos.y - p.pos.y, target.pos.x - p.pos.x)
      const dist = Math.hypot(target.pos.x - p.pos.x, target.pos.y - p.pos.y)
      if (dist > p.attackRange + target.radius * 0.6 && !moving) {
        p.dest = { ...target.pos }
      } else if (dist <= p.attackRange + target.radius * 0.6) {
        p.dest = null
        if (p.cds['atk'] <= 0) this.meleeAttack(p, target)
      }
    } else if (moving) {
      p.facing = Math.atan2(p.vel.y, p.vel.x)
    }
    this.moveWithCollisions(p, p.vel.x, p.vel.y, dt)
    p.walkPhase += dt * (Math.hypot(p.vel.x, p.vel.y) > 4 ? 1 : 0.2)
    const inCombat = this.nearestEnemyOf(p, 320) !== null
    this.stamina = Math.min(this.maxStamina, this.stamina + (inCombat ? 6 : 14) * dt)
  }

  private updateCompanion(e: Entity, dt: number) {
    if (!e.alive) {
      e.downT -= dt
      if (e.downT <= 0) {
        e.alive = true
        e.hp = Math.round(e.maxHp * 0.45)
        this.floater(e.pos, 'На ноги!', '#8fbf7f', 14)
      }
      return
    }
    const stance: Stance = e.stance ?? 'follow'
    const player = this.player
    let desired: Vec | null = null
    let target: Entity | null = null

    if (stance === 'hold') {
      if (Math.hypot(e.home.x - e.pos.x, e.home.y - e.pos.y) > 14) desired = { ...e.home }
      target = this.nearestEnemyOf(e, 260)
    } else if (stance === 'aggressive') {
      target = this.nearestEnemyOf(e, 460)
      if (!target) desired = { x: player.pos.x - 20, y: player.pos.y + 16 }
    } else {
      const t = this.targetEid ? this.entities.find((x) => x.eid === this.targetEid) : null
      if (t && t.alive && Math.hypot(t.pos.x - e.pos.x, t.pos.y - e.pos.y) < 400) target = t
      else target = this.nearestEnemyOf(e, 240)
      const off = e.id === 'torvald' ? { x: -30, y: 22 } : { x: -26, y: -26 }
      desired = { x: player.pos.x + off.x, y: player.pos.y + off.y }
    }
    if (target) {
      const dist = Math.hypot(target.pos.x - e.pos.x, target.pos.y - e.pos.y)
      const stopAt = e.ranged ? e.ranged * 0.75 : e.attackRange + target.radius * 0.6
      desired = dist > stopAt ? { ...target.pos } : null
      e.facing = Math.atan2(target.pos.y - e.pos.y, target.pos.x - e.pos.x)
      if (dist <= (e.ranged ?? e.attackRange) + target.radius * 0.6 && e.cds['atk'] <= 0) {
        if (e.ranged) this.rangedAttack(e, target)
        else this.meleeAttack(e, target)
      }
      if (e.id === 'torvald') {
        if (e.cds['shieldbash'] <= 0 && dist < 70) this.castCompanionAbility(e.eid, 'shieldbash', target.eid)
        if (e.cds['warcry'] <= 0 && dist < 300) this.castCompanionAbility(e.eid, 'warcry', target.eid)
      }
      if (e.id === 'kaya' && e.cds['frostbolt'] <= 0 && dist < 260) {
        this.castCompanionAbility(e.eid, 'frostbolt', target.eid)
      }
    }
    if (e.id === 'kaya' && e.cds['mend'] <= 0) this.castCompanionAbility(e.eid, 'mend', null)

    if (desired) {
      const dx = desired.x - e.pos.x
      const dy = desired.y - e.pos.y
      const dist = Math.hypot(dx, dy)
      if (dist > 10) {
        const sp = e.speed * (e.slowT > 0 ? 0.5 : 1)
        e.vel = { x: (dx / dist) * sp, y: (dy / dist) * sp }
      } else e.vel = { x: 0, y: 0 }
    } else {
      e.vel = { x: 0, y: 0 }
    }
    if (!target && Math.hypot(e.vel.x, e.vel.y) > 4) {
      e.facing = Math.atan2(e.vel.y, e.vel.x)
    }
    this.moveWithCollisions(e, e.vel.x, e.vel.y, dt)
    e.walkPhase += dt * (Math.hypot(e.vel.x, e.vel.y) > 4 ? 1 : 0.2)
  }

  castCompanionAbility(eid: number, abilityId: string, targetEid: number | null) {
    const e = this.entities.find((x) => x.eid === eid)
    if (!e || !e.alive) return
    if ((e.cds[abilityId] ?? 0) > 0) return
    const target = targetEid ? this.entities.find((x) => x.eid === targetEid) : null
    switch (abilityId) {
      case 'shieldbash': {
        const t = target ?? this.nearestEnemyOf(e, 70)
        if (!t) return
        e.cds['shieldbash'] = ABILITY_MAP['shieldbash'].cooldown
        t.stunT = Math.max(t.stunT, 1.3)
        this.damage(t, d(6) + 2, { color: '#c9c4bc' })
        this.floater(t.pos, 'Оглушён!', '#c9c4bc', 12)
        sfx('hit')
        break
      }
      case 'warcry': {
        e.cds['warcry'] = ABILITY_MAP['warcry'].cooldown
        this.buffT = 6
        this.ring(e.pos, '#d9a441', 60, 0.6)
        this.floater(e.pos, 'Клич!', '#d9a441', 14)
        sfx('shield')
        break
      }
      case 'frostbolt': {
        const t = target ?? this.nearestEnemyOf(e, 260)
        if (!t) return
        e.cds['frostbolt'] = ABILITY_MAP['frostbolt'].cooldown
        this.damage(t, d(4) + d(4) + 2, { color: '#bfe3ea' })
        t.slowT = 2.5
        this.beam(e.pos, t.pos, '#bfe3ea')
        sfx('frost')
        break
      }
      case 'mend': {
        let lowAlly: Entity | null = null
        let lowRatio = 0.6
        for (const a of this.entities) {
          if (a.team !== 'party' || !a.alive) continue
          const r = a.hp / a.maxHp
          if (r < lowRatio && Math.hypot(a.pos.x - e.pos.x, a.pos.y - e.pos.y) < 280) {
            lowRatio = r
            lowAlly = a
          }
        }
        if (!lowAlly) return
        e.cds['mend'] = ABILITY_MAP['mend'].cooldown
        const amount = Math.round(lowAlly.maxHp * 0.3)
        lowAlly.hp = Math.min(lowAlly.maxHp, lowAlly.hp + amount)
        if (lowAlly.kind === 'player') this.hp = lowAlly.hp
        this.floater(lowAlly.pos, '+' + amount, '#8fbf7f', 14)
        this.ring(lowAlly.pos, '#8fbf7f', 30, 0.5)
        sfx('heal')
        break
      }
    }
    this.syncUi()
  }

  private updateEnemy(e: Entity, dt: number) {
    if (!e.alive) {
      if (e.respawnAt !== undefined && this.time >= e.respawnAt) {
        if (Math.hypot(this.player.pos.x - e.home.x, this.player.pos.y - e.home.y) > 500) {
          e.alive = true
          e.hp = e.maxHp
          e.aiState = 'idle'
          e.burnT = 0
          e.stunT = 0
          const zone = SPAWN_ZONES.find((z) => z.id === e.zoneId)
          if (zone) {
            const a = Math.random() * Math.PI * 2
            const rr = Math.random() * zone.radius
            e.pos = { x: zone.center.x + Math.cos(a) * rr, y: zone.center.y + Math.sin(a) * rr }
            e.home = { ...e.pos }
          }
          e.respawnAt = undefined
        }
      }
      return
    }
    // Интро босса
    if (e.boss && !this.flags.bossIntroDone) {
      if (Math.hypot(this.player.pos.x - e.pos.x, this.player.pos.y - e.pos.y) < 340) {
        this.flags.bossIntroDone = true
        e.aggroR = 400
        this.openDialogue('boss_intro')
        return
      }
    }
    if (e.stunT > 0) {
      e.vel = { x: 0, y: 0 }
      this.moveWithCollisions(e, 0, 0, dt)
      return
    }
    const prey = this.nearestParty(e.pos, e.aiState === 'idle' || e.aiState === 'wander' ? e.aggroR : 1e9)
    const homeDist = Math.hypot(e.pos.x - e.home.x, e.pos.y - e.home.y)

    // поводок: слишком далеко от дома — возвращаемся
    if (e.aiState === 'chase' && homeDist > e.leashR) {
      e.aiState = 'return'
    }

    if (e.aiState === 'return') {
      if (homeDist < 20) {
        e.aiState = 'idle'
        e.hp = e.maxHp
      } else {
        const dx = e.home.x - e.pos.x
        const dy = e.home.y - e.pos.y
        const l = Math.hypot(dx, dy)
        e.vel = { x: (dx / l) * e.speed, y: (dy / l) * e.speed }
        e.facing = Math.atan2(dy, dx)
        this.moveWithCollisions(e, e.vel.x, e.vel.y, dt)
        e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.12 * dt)
        e.walkPhase += dt
      }
      return
    }

    if (!prey) {
      if (e.aiState === 'chase' || e.aiState === 'attack') {
        e.aiState = 'return'
      } else {
        e.wanderT -= dt
        if (e.wanderT <= 0) {
          e.wanderT = rndRange(1.5, 4)
          const a = Math.random() * Math.PI * 2
          const rr = rndRange(0, 60)
          e.dest = { x: e.home.x + Math.cos(a) * rr, y: e.home.y + Math.sin(a) * rr }
        }
        if (e.dest) {
          const dx = e.dest.x - e.pos.x
          const dy = e.dest.y - e.pos.y
          const l = Math.hypot(dx, dy)
          if (l < 6) e.dest = null
          else {
            e.vel = { x: (dx / l) * e.speed * 0.35, y: (dy / l) * e.speed * 0.35 }
            e.facing = Math.atan2(e.vel.y, e.vel.x)
            this.moveWithCollisions(e, e.vel.x, e.vel.y, dt)
            e.walkPhase += dt
            return
          }
        }
        e.vel = { x: 0, y: 0 }
      }
      return
    }

    e.aiState = 'chase'
    const dist = Math.hypot(prey.pos.x - e.pos.x, prey.pos.y - e.pos.y)
    e.facing = Math.atan2(prey.pos.y - e.pos.y, prey.pos.x - e.pos.x)

    if (e.boss) this.bossLogic(e, dist)

    const isRanged = !!e.ranged
    const wantRange = isRanged ? e.ranged! * 0.85 : e.attackRange + prey.radius * 0.6
    let vx = 0
    let vy = 0
    if (isRanged && dist < wantRange * 0.6) {
      vx = -Math.cos(e.facing) * e.speed
      vy = -Math.sin(e.facing) * e.speed
    } else if (dist > wantRange) {
      vx = Math.cos(e.facing) * e.speed
      vy = Math.sin(e.facing) * e.speed
    }
    const spd = e.slowT > 0 ? 0.5 : 1
    this.moveWithCollisions(e, vx * spd, vy * spd, dt)
    e.walkPhase += dt * (Math.hypot(vx, vy) > 4 ? 1 : 0.2)

    if (e.cds['atk'] <= 0) {
      if (isRanged && dist < e.ranged!) this.rangedAttack(e, prey)
      else if (!isRanged && dist <= e.attackRange + prey.radius * 0.6) this.meleeAttack(e, prey)
    }
  }

  private bossLogic(e: Entity, dist: number) {
    if (e.slamT > 0) {
      e.slamT -= 0.016
      if (e.slamT <= 0) {
        this.ring(e.pos, '#c94f3d', 170, 0.7, 'slam')
        this.shake = 10
        sfx('boss')
        for (const a of this.entities) {
          if (a.team !== 'party' || !a.alive) continue
          if (Math.hypot(a.pos.x - e.pos.x, a.pos.y - e.pos.y) < 175) {
            this.damage(a, d(8) + d(8) + e.dmgMod, { color: '#e0653a' })
            this.kb.set(a.eid, { x: (a.pos.x - e.pos.x) * 4, y: (a.pos.y - e.pos.y) * 4 })
          }
        }
      }
      return
    }
    if (e.cds['slam'] === undefined) e.cds['slam'] = 4
    if (e.cds['slam'] <= 0 && dist < 200) {
      e.cds['slam'] = 7
      e.slamT = 0.9
      this.floater(e.pos, 'Буря близко!', '#a06bd9', 16)
      return
    }
    const ratio = e.hp / e.maxHp
    if (ratio < 0.66 && e.summonStage < 1) {
      e.summonStage = 1
      this.summonHorrors(e)
    }
    if (ratio < 0.33 && e.summonStage < 2) {
      e.summonStage = 2
      this.summonHorrors(e)
    }
  }

  private summonHorrors(e: Entity) {
    for (let i = 0; i < 2; i++) {
      const st = ENEMY_STATS.horror
      const a = Math.random() * Math.PI * 2
      const h = this.makeEntity({
        id: 'horror',
        name: ENEMY_NAME.horror,
        pos: { x: e.pos.x + Math.cos(a) * 60, y: e.pos.y + Math.sin(a) * 60 },
        radius: st.radius,
        hp: st.hp,
        maxHp: st.hp,
        speed: st.speed,
        atkBonus: st.atk,
        ac: st.ac,
        dmgDice: st.dmgDice,
        dmgSides: st.dmgSides,
        dmgMod: st.dmgMod,
        attackCd: st.attackCd,
        attackRange: st.attackRange,
        enemyType: 'horror',
        aggroR: st.aggroR,
        leashR: 9999,
        aiState: 'chase',
      })
      this.entities.push(h)
      this.ring(h.pos, '#a06bd9', 40, 0.6)
    }
    this.floater(e.pos, 'Разлом извергает слуг!', '#a06bd9', 15)
    sfx('boss')
  }

  // ---------------- Бой ----------------

  private meleeAttack(a: Entity, t: Entity) {
    a.cds['atk'] = a.attackCd
    a.attackT = 0.28
    sfx('swing')
    const buff = a.team === 'party' && this.buffT > 0 ? 2 : 0
    const roll = d(20)
    const total = roll + a.atkBonus + buff
    if (roll === 20 || (roll !== 1 && total >= t.ac)) {
      const crit = roll === 20
      const dmg = Math.max(1, d(a.dmgSides) * a.dmgDice * (crit ? 2 : 1) + a.dmgMod)
      this.damage(t, dmg, { crit, color: a.team === 'party' ? '#f5c96b' : '#e0653a' })
      if (t.kind !== 'player' && t.team !== 'party') sfx('hit')
    } else {
      this.floater(t.pos, 'Промах', '#9a9a90', 12)
    }
  }

  private rangedAttack(a: Entity, t: Entity) {
    a.cds['atk'] = a.attackCd
    a.attackT = 0.25
    const buff = a.team === 'party' && this.buffT > 0 ? 2 : 0
    const roll = d(20)
    const total = roll + a.atkBonus + buff
    if (roll === 20 || (roll !== 1 && total >= t.ac)) {
      const crit = roll === 20
      const dmg = Math.max(1, d(a.dmgSides) * a.dmgDice * (crit ? 2 : 1) + a.dmgMod)
      this.damage(t, dmg, { crit, color: a.team === 'party' ? '#f5c96b' : '#e0653a' })
      this.beam(a.pos, t.pos, a.team === 'party' ? '#bfe3ea' : '#d9c04f')
      if (t.kind !== 'player' && t.team !== 'party') sfx('hit')
    } else {
      this.floater(t.pos, 'Промах', '#9a9a90', 12)
      this.beam(a.pos, t.pos, 'rgba(200,200,190,0.4)')
    }
  }

  private damage(t: Entity, amount: number, opts: { crit?: boolean; silent?: boolean; color?: string } = {}) {
    if (!t.alive) return
    let amt = amount
    if (t.shield > 0) {
      const absorbed = Math.min(t.shield, amt)
      t.shield -= absorbed
      amt -= absorbed
      if (absorbed > 0) this.floater(t.pos, 'Квен −' + absorbed, '#d9a441', 12)
    }
    if (amt > 0) {
      t.hp -= amt
      t.hitT = 0.15
      if (!opts.silent) {
        this.floater(
          t.pos,
          opts.crit ? 'КРИТ ' + amt : String(amt),
          opts.color ?? (t.team === 'party' ? '#e0653a' : '#f5c96b'),
          opts.crit ? 20 : 15,
        )
      }
      if (t.kind === 'player') this.hp = t.hp
      if (t.kind === 'player' || t.kind === 'companion') sfx('hit')
    }
    if (t.team === 'hostile' && t.aiState === 'idle') t.aiState = 'chase'
    if (t.hp <= 0) {
      t.hp = 0
      t.alive = false
      if (t.kind === 'enemy') this.onEnemyKilled(t)
      else if (t.kind === 'companion') {
        t.downT = 12
        this.floater(t.pos, t.name + ' выведен из боя!', '#e0653a', 14)
      } else if (t.kind === 'player') this.onPlayerDeath()
    }
  }

  private onEnemyKilled(e: Entity) {
    const type = e.enemyType!
    this.kills++
    sfx('death')
    if (e.zoneId) {
      const z = SPAWN_ZONES.find((zz) => zz.id === e.zoneId)
      if (z) e.respawnAt = this.time + z.respawnSec
    }
    const st = ENEMY_STATS[type]
    this.gainXp(st.xp)
    let goldLoot = 0
    if (type === 'wolf') {
      if (Math.random() < 0.6) this.addItem('wolf_pelt', 1)
      if (Math.random() < 0.4) this.addItem('wolf_fang', 1)
    } else if (type === 'bandit' || type === 'archer') {
      goldLoot = 8 + Math.floor(Math.random() * 14)
    } else if (type === 'alpha') {
      this.addItem('alpha_pelt', 1)
      goldLoot = 40
    } else if (type === 'horror') {
      if (Math.random() < 0.5) this.addItem('rift_shard', 1)
    } else if (type === 'captain') {
      goldLoot = 60
    } else if (type === 'boss') {
      goldLoot = 150
      this.addItem('rift_shard', 3)
    }
    if (goldLoot > 0) {
      this.gold += goldLoot
      this.floater(e.pos, '+' + goldLoot + ' золота', '#e8d5a8', 13)
    }
    if (!this.bestiary.has(type)) {
      this.bestiary.add(type)
      this.toast('Бестиарий: ' + BESTIARY_INFO[type].name, 'quest')
    }
    if (type === 'wolf' && this.quests.main.stage === 2 && !this.quests.main.done) {
      this.quests.main.counter++
      if (this.quests.main.counter >= 4) this.advanceQuest('main', 3)
      else this.toast(`Волки: ${this.quests.main.counter}/4`, 'info')
    }
    if (type === 'alpha') {
      this.flags.alphaDead = true
      if (this.quests.contract.stage === 1) this.advanceQuest('contract', 2)
      this.checkProof()
    }
    if (type === 'captain') {
      this.flags.captainDead = true
      if (this.quests.flame.stage === 1) this.advanceQuest('flame', 2)
      this.checkProof()
    }
    if (type === 'boss') {
      this.flags.bossDead = true
      this.advanceQuest('main', 6)
      useGame.getState().patch({ bossBar: null })
      this.endingAt = this.time + 1.8
    }
    if (this.targetEid === e.eid) this.targetEid = null
  }

  private onPlayerDeath() {
    this.player.alive = false
    this.toast('Ты пал... Но Смотрители не умирают так просто.', 'warn')
    sfx('death')
    setTimeout(() => {
      if (this.destroyed) return
      this.player.alive = true
      this.player.pos = { ...PLAYER_SPAWN }
      this.player.dest = null
      this.hp = Math.round(this.maxHp * 0.6)
      this.player.hp = this.hp
      this.stamina = this.maxStamina
      this.gold = Math.max(0, this.gold - 30)
      for (const e of this.entities) {
        if (e.kind === 'companion' && !e.alive) {
          e.alive = true
          e.downT = 0
          e.hp = Math.round(e.maxHp * 0.5)
          e.pos = { x: this.player.pos.x - 26, y: this.player.pos.y + 18 }
        }
        if (e.kind === 'enemy' && e.alive) e.aiState = 'return'
      }
      this.targetEid = null
      this.camera.x = this.player.pos.x
      this.camera.y = this.player.pos.y
      this.toast('Ты очнулся в Хеймхолле. −30 золота на лечение.', 'info')
      this.syncUi()
    }, 1800)
  }

  private gainXp(n: number) {
    this.xp += n
    this.floater(this.player.pos, '+' + n + ' опыта', '#c9b06b', 12)
    let next = this.xpNext()
    while (this.xp >= next) {
      this.xp -= next
      this.level++
      this.lp += 5
      this.recalcStats()
      this.hp = this.maxHp
      this.player.hp = this.maxHp
      this.stamina = this.maxStamina
      this.toast(`Уровень ${this.level}! +5 очков обучения`, 'level')
      sfx('level')
      this.ring(this.player.pos, '#f5c96b', 60, 0.9)
      next = this.xpNext()
    }
  }

  // ---------------- Способности игрока ----------------

  castAbility(id: string) {
    if (this.isFrozen() || this.tacticalPaused || !this.player.alive) return
    const ab = ABILITY_MAP[id]
    if (!ab) return
    if (ab.kind === 'potion') {
      if (this.player.cds['potion'] > 0) return
      const inv = this.inventory.find((i) => i.item === id)
      if (!inv || inv.qty <= 0) {
        this.toast('Ничего выпить нет.', 'warn')
        return
      }
      const def = ITEMS[id]
      if (def.heal) {
        this.hp = Math.min(this.maxHp, this.hp + def.heal)
        this.player.hp = this.hp
        this.floater(this.player.pos, '+' + def.heal, '#8fbf7f', 15)
      }
      if (def.stamina) {
        this.stamina = Math.min(this.maxStamina, this.stamina + def.stamina)
        this.floater(this.player.pos, '+' + def.stamina + ' ОВ', '#bfe3ea', 13)
      }
      this.removeItem(id, 1)
      this.player.cds['potion'] = ab.cooldown
      sfx('potion')
      this.syncUi()
      return
    }
    if (id === 'shout' && !this.signs.shout.unlocked) return
    if (ab.kind === 'sign' && !this.signs[id as SignId]?.unlocked) return
    if (this.player.cds[id] > 0) return
    if (this.stamina < ab.staminaCost) {
      this.floater(this.player.pos, 'Нет сил!', '#9a9a90', 12)
      return
    }
    this.stamina -= ab.staminaCost
    this.player.cds[id] = ab.cooldown
    this.player.castT = 0.25
    const signLevel = this.signs[id as SignId]?.level ?? 1
    const power = this.signPower()
    const target = this.targetEid ? this.entities.find((e) => e.eid === this.targetEid) : null

    if (id === 'igni') {
      if (target?.alive) this.player.facing = Math.atan2(target.pos.y - this.player.pos.y, target.pos.x - this.player.pos.x)
      sfx('fire')
      this.coneParticles(this.player.pos, this.player.facing, 150, '#e08a3a')
      for (const e of this.enemiesInCone(150, 0.62)) {
        const weak = FIRE_WEAK.has(e.enemyType ?? 'wolf') ? 2 : 1
        this.damage(e, Math.round(d(6) * 2 * power * weak), { color: '#e08a3a' })
        e.burnT = 4
        e.burnTick = 0.5
      }
    } else if (id === 'aard') {
      if (target?.alive) this.player.facing = Math.atan2(target.pos.y - this.player.pos.y, target.pos.x - this.player.pos.x)
      sfx('shield')
      this.coneParticles(this.player.pos, this.player.facing, 160, '#d9e3ea')
      for (const e of this.enemiesInCone(160, 0.95)) {
        this.damage(e, Math.round(d(4) * power), { color: '#d9e3ea' })
        e.stunT = Math.max(e.stunT, 1.1 + signLevel * 0.15)
        const a = Math.atan2(e.pos.y - this.player.pos.y, e.pos.x - this.player.pos.x)
        this.kb.set(e.eid, { x: Math.cos(a) * 300, y: Math.sin(a) * 300 })
      }
    } else if (id === 'quen') {
      const sh = Math.round((25 + 12 * this.level) * power)
      this.player.shield = sh
      this.floater(this.player.pos, 'Квен: ' + sh, '#d9a441', 14)
      this.ring(this.player.pos, '#d9a441', 40, 0.6)
      sfx('shield')
    } else if (id === 'axii') {
      const t =
        target && target.alive && Math.hypot(target.pos.x - this.player.pos.x, target.pos.y - this.player.pos.y) < 240
          ? target
          : this.nearestEnemyOf(this.player, 240)
      sfx('mind')
      if (t) {
        const dur = (2.4 + signLevel * 0.5) * (STUN_WEAK.has(t.enemyType ?? 'wolf') ? 1.6 : 1)
        t.stunT = Math.max(t.stunT, dur)
        this.floater(t.pos, 'Аксий!', '#c9a3e8', 14)
        this.ring(t.pos, '#c9a3e8', 24, 0.5)
      } else {
        this.floater(this.player.pos, 'Никого рядом', '#9a9a90', 12)
      }
    } else if (id === 'shout') {
      sfx('shout')
      this.shake = 12
      this.ring(this.player.pos, '#f5c96b', 210, 0.8)
      for (const e of this.entities) {
        if (e.kind !== 'enemy' || !e.alive) continue
        if (Math.hypot(e.pos.x - this.player.pos.x, e.pos.y - this.player.pos.y) < 210) {
          this.damage(e, d(6) * 3 * power, { color: '#f5c96b' })
          e.stunT = Math.max(e.stunT, 1.2)
          const a = Math.atan2(e.pos.y - this.player.pos.y, e.pos.x - this.player.pos.x)
          this.kb.set(e.eid, { x: Math.cos(a) * 360, y: Math.sin(a) * 360 })
        }
      }
    }
    this.syncUi()
  }

  private enemiesInCone(range: number, halfAngle: number): Entity[] {
    return this.entities.filter((e) => {
      if (e.kind !== 'enemy' || !e.alive) return false
      const dist = Math.hypot(e.pos.x - this.player.pos.x, e.pos.y - this.player.pos.y)
      if (dist > range + e.radius) return false
      const a = Math.atan2(e.pos.y - this.player.pos.y, e.pos.x - this.player.pos.x)
      return angleDiff(a, this.player.facing) < halfAngle
    })
  }

  // ---------------- Эффекты ----------------

  private floater(pos: Vec, text: string, color: string, size: number) {
    this.floaters.push({
      x: pos.x + rndRange(-6, 6),
      y: pos.y - 18,
      text,
      color,
      life: 1.1,
      maxLife: 1.1,
      size,
      vy: -34,
    })
    if (this.floaters.length > 40) this.floaters.shift()
  }

  private ring(pos: Vec, color: string, size: number, life: number, kind: Particle['kind'] = 'ring') {
    this.particles.push({ x: pos.x, y: pos.y, vx: 0, vy: 0, life, maxLife: life, size, color, kind })
  }

  private beam(a: Vec, b: Vec, color: string) {
    for (let i = 0; i <= 8; i++) {
      const t = i / 8
      this.particles.push({
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
        vx: rndRange(-10, 10),
        vy: rndRange(-10, 10),
        life: 0.25,
        maxLife: 0.25,
        size: 2.4,
        color,
        kind: 'spark',
      })
    }
  }

  private coneParticles(pos: Vec, facing: number, range: number, color: string) {
    for (let i = 0; i < 26; i++) {
      const a = facing + rndRange(-0.55, 0.55)
      const dist = rndRange(20, range)
      this.particles.push({
        x: pos.x + Math.cos(a) * dist * 0.3,
        y: pos.y + Math.sin(a) * dist * 0.3 - 6,
        vx: Math.cos(a) * dist * 2.4,
        vy: Math.sin(a) * dist * 2.4,
        life: rndRange(0.2, 0.42),
        maxLife: 0.42,
        size: rndRange(2.5, 5),
        color,
        kind: 'fire',
      })
    }
  }

  private updateParticles(dt: number) {
    for (const p of this.particles) {
      p.life -= dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      if (p.kind === 'fire' || p.kind === 'spark') {
        p.vx *= 0.92
        p.vy *= 0.92
      }
    }
    this.particles = this.particles.filter((p) => p.life > 0)
    for (const f of this.floaters) {
      f.life -= dt
      f.y += f.vy * dt
      f.vy *= 0.95
    }
    this.floaters = this.floaters.filter((f) => f.life > 0)
  }

  // ---------------- Диалоги ----------------

  private dialogueCtx() {
    return {
      quest: (id: string) => this.quests[id],
      flag: (name: string) => !!this.flags[name],
      faction: this.faction,
      companion: (id: string) => this.companionIds[id as 'kaya' | 'torvald'],
      has: (item: string, qty = 1) => this.countItem(item) >= qty,
      lp: this.lp,
      gold: this.gold,
    }
  }

  private evalCond(cond: string): boolean {
    if (!cond) return true
    for (const tok of cond.split(',')) {
      const s = tok.trim()
      if (s && !this.evalToken(s)) return false
    }
    return true
  }

  private evalToken(s: string): boolean {
    let m = s.match(/^quest\.(\w+)==(\d+)$/)
    if (m) return this.quests[m[1]].stage === parseInt(m[2], 10)
    m = s.match(/^quest\.(\w+)>=(\d+)$/)
    if (m) return this.quests[m[1]].stage >= parseInt(m[2], 10)
    m = s.match(/^quest\.(\w+)<(\d+)$/)
    if (m) return this.quests[m[1]].stage < parseInt(m[2], 10)
    m = s.match(/^flag\.(\w+)$/)
    if (m) return !!this.flags[m[1]]
    m = s.match(/^!flag\.(\w+)$/)
    if (m) return !this.flags[m[1]]
    m = s.match(/^faction==(\w+)$/)
    if (m) return this.faction === (m[1] as Faction)
    m = s.match(/^comp\.(\w+)$/)
    if (m) return !!this.companionIds[m[1] as 'kaya' | 'torvald']
    m = s.match(/^!comp\.(\w+)$/)
    if (m) return !this.companionIds[m[1] as 'kaya' | 'torvald']
    m = s.match(/^has\.(\w+)(?::(\d+))?$/)
    if (m) return this.countItem(m[1]) >= (m[2] ? parseInt(m[2], 10) : 1)
    m = s.match(/^lp>=(\d+)$/)
    if (m) return this.lp >= parseInt(m[1], 10)
    m = s.match(/^gold>=(\d+)$/)
    if (m) return this.gold >= parseInt(m[1], 10)
    return true
  }

  openDialogue(treeId: string) {
    const tree = DIALOGUES[treeId]
    if (!tree) return
    this.dialogueTree = treeId
    const start = typeof tree.start === 'function' ? tree.start(this.dialogueCtx()) : tree.start
    this.setNode(start)
  }

  private setNode(nodeId: string) {
    const tree = DIALOGUES[this.dialogueTree!]
    const node = tree.nodes[nodeId]
    if (!node) {
      this.closeDialogue()
      return
    }
    const choices = node.choices.filter((c) => this.evalCond(c.cond ?? ''))
    this.dlgChoices = choices
    const p = PORTRAITS[node.speaker] ?? { icon: 'User', color: '#b08356', title: node.role ?? '' }
    useGame.getState().patch({
      dialogue: {
        speaker: node.speaker,
        role: p.title,
        portraitIcon: p.icon,
        portraitColor: p.color,
        text: node.text,
        choices: choices.map((c) => ({
          text: c.text,
          tag: c.tag,
          checkLabel: c.check ? c.check.label : undefined,
        })),
      },
    })
  }

  chooseOption(i: number) {
    const c = this.dlgChoices[i]
    if (!c) return
    sfx('click')
    if (c.check) {
      const bonus = 1 + Math.floor(this.attributes.charisma / 2) + this.skills.speech
      const roll = d(20)
      const total = roll + bonus
      const success = roll !== 1 && (roll === 20 || total >= c.check.dc)
      this.toast(
        `${c.check.label}: d20 ${roll} + ${bonus} = ${total} — ${success ? 'успех!' : 'провал'}`,
        success ? 'quest' : 'warn',
      )
      if (success && c.action) this.runAction(c.action)
      const next = success ? c.goto : (c.gotoFail ?? null)
      if (next === null || next === undefined) {
        this.closeDialogue()
        return
      }
      this.setNode(next)
      return
    }
    if (c.action) this.runAction(c.action)
    if (c.goto === null || c.goto === undefined) {
      this.closeDialogue()
      return
    }
    this.setNode(c.goto)
  }

  closeDialogue() {
    this.dialogueTree = null
    this.dlgChoices = []
    useGame.getState().patch({ dialogue: null })
  }

  private runAction(action: string) {
    for (const cmdRaw of action.split(';')) {
      const cmd = cmdRaw.trim()
      if (!cmd || cmd === 'end') continue
      const [op, arg1, arg2] = cmd.split(':')
      switch (op) {
        case 'quest':
          this.advanceQuest(arg1, parseInt(arg2, 10))
          break
        case 'flag':
          this.flags[arg1] = true
          break
        case 'give':
          this.addItem(arg1, parseInt(arg2 ?? '1', 10))
          break
        case 'take':
          this.removeItem(arg1, parseInt(arg2 ?? '1', 10))
          break
        case 'gold': {
          this.gold = Math.max(0, this.gold + parseInt(arg1, 10))
          sfx('coin')
          break
        }
        case 'xp':
          this.gainXp(parseInt(arg1, 10))
          break
        case 'lp':
          this.lp = Math.max(0, this.lp + parseInt(arg1, 10))
          break
        case 'open':
          this.closeDialogue()
          if (arg1 === 'shop') this.openShop()
          if (arg1 === 'trainer') this.openTrainer()
          break
        case 'join':
          if (arg1 === 'kaya' || arg1 === 'torvald') {
            const wasNew = !this.companionIds[arg1]
            this.spawnCompanion(arg1)
            if (wasNew) {
              this.toast(`${arg1 === 'kaya' ? 'Кайя' : 'Торвальд'} присоединяется к отряду!`, 'quest')
              sfx('quest')
            }
          }
          break
        case 'faction':
          this.faction = arg1 as Faction
          this.toast(arg1 === 'flame' ? 'Ты вступил в Орден Пламени!' : 'Ты вступил в Ковен Тумана!', 'quest')
          if (arg1 === 'mist') this.checkProof()
          sfx('quest')
          break
        case 'sign':
          if (arg1 === 'shout' && !this.signs.shout.unlocked) {
            this.signs.shout.unlocked = true
            this.toast('Голос Древних изучен! Клавиша 5.', 'level')
            sfx('level')
          }
          break
        case 'boss':
          if (arg1 === 'fight') {
            const boss = this.entities.find((e) => e.enemyType === 'boss' && e.alive)
            if (boss) boss.aiState = 'chase'
          } else if (arg1 === 'weaken') {
            const boss = this.entities.find((e) => e.enemyType === 'boss' && e.alive)
            if (boss) {
              boss.hp = Math.round(boss.hp * 0.8)
              boss.dmgMod = 2
              boss.summonStage = 1
              this.floater(boss.pos, 'Слова жгут его!', '#c9a3e8', 15)
            }
          }
          break
        case 'heal':
          if (arg1 === 'full') {
            this.hp = this.maxHp
            this.player.hp = this.hp
          }
          break
      }
    }
    this.syncUi()
  }

  private runInteractable(it: InteractableDef) {
    if (it.action.startsWith('dialogue:')) {
      this.openDialogue(it.action.slice(9))
    } else if (it.action.startsWith('gather:')) {
      const item = it.action.slice(7)
      this.addItem(item, 1)
      this.removedProps.add(it.id)
      this.flags['herb_' + it.id] = true
      sfx('coin')
      this.toast('Собрано: ' + ITEMS[item].name, 'loot')
      const q = this.quests.mist
      if (q.stage === 1 && !q.done) {
        q.counter++
        if (q.counter >= 3) this.toast('Лунные травы собраны — к Селене!', 'quest')
        else this.toast(`Лунная трава: ${q.counter}/3`, 'info')
      }
      this.syncUi()
    }
  }

  private pickInteractable(p: Vec, extra = 0): InteractableDef | null {
    let best: InteractableDef | null = null
    let bd = 1e9
    for (const it of INTERACTABLES) {
      if (this.removedProps.has(it.id)) continue
      if (!this.evalCond(it.cond ?? '')) continue
      const dist = Math.hypot(it.pos.x - p.x, it.pos.y - p.y)
      if (dist < it.r + extra && dist < bd) {
        bd = dist
        best = it
      }
    }
    return best
  }

  private nearestInteraction(): { label: string; npc?: Entity; it?: InteractableDef } | null {
    let best: { label: string; npc?: Entity; it?: InteractableDef } | null = null
    let bd = 1e9
    for (const e of this.entities) {
      if (e.kind !== 'npc' || !e.alive) continue
      const dist = Math.hypot(e.pos.x - this.player.pos.x, e.pos.y - this.player.pos.y)
      if (dist < 58 && dist < bd) {
        bd = dist
        best = { label: `Поговорить: ${e.name}`, npc: e }
      }
    }
    for (const it of INTERACTABLES) {
      if (this.removedProps.has(it.id)) continue
      if (!this.evalCond(it.cond ?? '')) continue
      const dist = Math.hypot(it.pos.x - this.player.pos.x, it.pos.y - this.player.pos.y)
      if (dist < it.r + 14 && dist < bd) {
        bd = dist
        best = { label: `${it.prompt}: ${it.name}`, it }
      }
    }
    return best
  }

  private doInteract() {
    if (this.isFrozen() || this.tacticalPaused) return
    const n = this.nearestInteraction()
    if (!n) return
    if (n.npc) this.openDialogue(n.npc.npc!.dialogue)
    else if (n.it) this.runInteractable(n.it)
  }

  // ---------------- Квесты ----------------

  private advanceQuest(id: string, stage: number) {
    const q = this.quests[id]
    if (!q || q.done) return
    q.stage = stage
    const def = QUEST_MAP[id]
    if (stage >= def.stages.length) q.done = true
    if (id === 'main' && stage === 5 && !this.flags.gateOpen) {
      this.flags.gateOpen = true
      this.removedProps.add('barrier')
      this.removedProps.add('barrier2')
      this.removedProps.add('barrier3')
      this.toast('Пелена перед Разломом опала!', 'quest')
    }
    this.toast(`${def.name}: ${this.stageText(id)}`, 'quest')
    sfx('quest')
    this.saveGame(false)
    this.syncUi()
  }

  private stageText(id: string) {
    const def = QUEST_MAP[id]
    const q = this.quests[id]
    if (q.done) return def.stages[def.stages.length - 1].text
    const st = def.stages[Math.max(0, Math.min(def.stages.length - 1, q.stage - 1))]
    return st ? st.text : ''
  }

  private checkProof() {
    const q = this.quests.main
    if (q.stage === 4 && !q.done) {
      if (this.flags.alphaDead || this.flags.captainDead || this.flags.mistJoined) {
        this.advanceQuest('main', 5)
      }
    }
  }

  private questMarker(): Vec | null {
    const q = this.quests.main
    if (!q.done) {
      if (q.stage <= 1) return NPCS.find((n) => n.id === 'bjorn')!.pos
      if (q.stage === 2) return { x: 900, y: 720 }
      if (q.stage === 3) return { x: 2200, y: 660 }
      if (q.stage === 4) {
        if (!this.flags.alphaDead) return { x: 720, y: 450 }
        if (!this.flags.captainDead) return { x: 2590, y: 1690 }
        return { x: 1600, y: 2160 }
      }
      if (q.stage === 5) return { x: 2935, y: 470 }
    }
    const c = this.quests.contract
    if (c.stage > 0 && !c.done) {
      if (c.stage === 1) return { x: 720, y: 450 }
      return NPCS.find((n) => n.id === 'grim')!.pos
    }
    return null
  }

  private updateArea() {
    let name = 'Долина'
    for (const a of AREAS) {
      if (a.id === 'wilds') continue
      const [x, y, w, h] = a.rect
      if (this.player.pos.x > x && this.player.pos.x < x + w && this.player.pos.y > y && this.player.pos.y < y + h) {
        name = a.name
        break
      }
    }
    if (name !== this.currentArea) {
      this.currentArea = name
      useGame.getState().patch({ areaToast: { id: Date.now(), name } })
    }
  }

  private updateEnding() {
    if (this.endingAt !== null && this.time >= this.endingAt) {
      this.endingAt = null
      this.openEnding()
    }
  }

  private openEnding() {
    const factionLine: Record<Faction, string[]> = {
      none: [
        'Ты ушёл из долины до рассвета, никому ничего не сказав. Долг Смотрителя исполнен — а судьба Хеймхолла теперь в руках его людей.',
      ],
      flame: [
        'Орден Пламени воздвиг у Разлома сторожевую башню. Капитан Ирма лично подняла твоё имя на её ворота.',
        'Сталь и строй — теперь этого достаточно. Пока достаточно.',
      ],
      mist: [
        'Ковен Тумана переписал печать, и Разлом затянулся туманом. Архимаг Селена назвала тебя «голосом между мирами».',
        'Туман помнит. Туман ждёт.',
      ],
    }
    const epilogue: string[] = [
      'Пожиратель Бурь рассыпался пеплом, и небо над Хеймхоллом срослось швом из первых лучей солнца.',
      ...factionLine[this.faction],
    ]
    if (this.companionIds.kaya && this.companionIds.torvald) {
      epilogue.push(
        'Кайя ушла дальше на север — искать истоки Разлома. Торвальд остался: сказал, что в деревне наконец появилось приличное пиво.',
      )
    }
    epilogue.push('А Смотритель? Смотритель всегда найдёт работу. Монстров много, контрактов больше.')
    const mins = Math.floor(this.playtime / 60)
    const stats: Array<[string, string]> = [
      ['Уровень', String(this.level)],
      ['Убито врагов', String(this.kills)],
      ['Золото', String(this.gold)],
      ['Время в игре', `${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, '0')}`],
      ['Фракция', this.faction === 'flame' ? 'Орден Пламени' : this.faction === 'mist' ? 'Ковен Тумана' : 'Вольный смотритель'],
      ['Спутники', `${(this.companionIds.kaya ? 1 : 0) + (this.companionIds.torvald ? 1 : 0)} из 2`],
    ]
    useGame.getState().patch({ ending: { epilogue, stats }, panel: 'ending' })
  }

  // ---------------- Предметы ----------------

  private addItem(id: string, qty: number) {
    const def = ITEMS[id]
    if (!def) return
    const ex = this.inventory.find((i) => i.item === id)
    if (ex) ex.qty += qty
    else this.inventory.push({ item: id, qty })
    this.toast('Получено: ' + def.name + (qty > 1 ? ` ×${qty}` : ''), 'loot')
    this.syncUi()
  }

  private removeItem(id: string, qty: number) {
    const ex = this.inventory.find((i) => i.item === id)
    if (!ex) return
    ex.qty -= qty
    if (ex.qty <= 0) this.inventory = this.inventory.filter((i) => i !== ex)
    this.syncUi()
  }

  private countItem(id: string) {
    return this.inventory.find((i) => i.item === id)?.qty ?? 0
  }

  buyItem(id: string) {
    const def = ITEMS[id]
    if (!def) return
    if (this.gold < def.price) {
      this.toast('Не хватает золота.', 'warn')
      return
    }
    this.gold -= def.price
    this.addItem(id, 1)
    sfx('coin')
  }

  sellItem(id: string) {
    const def = ITEMS[id]
    if (!def || def.type === 'quest') return
    if (this.countItem(id) <= 0) return
    const val = Math.floor(def.price * SELL_RATE)
    this.removeItem(id, 1)
    this.gold += val
    this.toast(`Продано: ${def.name} (+${val} зол.)`, 'info')
    sfx('coin')
  }

  equipItem(id: string) {
    const def = ITEMS[id]
    if (!def) return
    if (def.type === 'weapon') {
      if (this.weapon) this.addItem(this.weapon, 1)
      this.weapon = id
      this.removeItem(id, 1)
    } else if (def.type === 'armor') {
      if (this.armor) this.addItem(this.armor, 1)
      this.armor = id
      this.removeItem(id, 1)
    } else return
    this.recalcStats()
    sfx('click')
    this.syncUi()
  }

  unequipItem(slot: 'weapon' | 'armor') {
    const cur = slot === 'weapon' ? this.weapon : this.armor
    if (!cur) return
    if (slot === 'weapon') this.weapon = null
    else this.armor = null
    this.addItem(cur, 1)
    this.recalcStats()
    sfx('click')
  }

  useItem(id: string) {
    const def = ITEMS[id]
    if (def?.type === 'potion') this.castAbility(id)
  }

  spendLp(attr: 'might' | 'vigor' | 'intellect' | 'charisma') {
    if (this.lp < 3) {
      this.toast('Нужно 3 очка обучения.', 'warn')
      return
    }
    this.lp -= 3
    this.attributes[attr]++
    this.recalcStats()
    this.toast(`${ATTR_NAMES[attr]} повышена!`, 'level')
    sfx('level')
    this.syncUi()
  }

  // ---------------- Магазин и тренер ----------------

  private openShop() {
    useGame.getState().patch({ shop: { merchantName: 'Грим', stock: [...MERCHANT_STOCK] }, panel: 'shop' })
  }

  private buildTrainerOptions(): TrainerHudState {
    const opts: TrainerHudState['options'] = []
    const skillDefs: Array<{ key: 'blade' | 'vitality' | 'signs' | 'speech'; name: string; desc: string }> = [
      { key: 'blade', name: 'Владение клинком', desc: '+1 к атаке за ранг.' },
      { key: 'vitality', name: 'Живучесть', desc: '+15 к макс. здоровью за ранг.' },
      { key: 'signs', name: 'Ловкость знаков', desc: '+15% к силе знаков за ранг.' },
      { key: 'speech', name: 'Красноречие', desc: '+1 к проверкам убеждения за ранг.' },
    ]
    for (const sd of skillDefs) {
      const r = this.skills[sd.key]
      const maxed = r >= 5
      const lpCost = sd.key === 'speech' ? 3 : 2
      const goldCost = sd.key === 'speech' ? 60 : 40 + r * 20
      opts.push({
        id: 'skill:' + sd.key,
        name: `${sd.name} (${r}/5)`,
        desc: sd.desc,
        kind: 'skill',
        cost: `${lpCost} ОН + ${goldCost} зол.`,
        maxed,
        affordable: !maxed && this.lp >= lpCost && this.gold >= goldCost,
      })
    }
    const signDefs: Array<{ id: SignId; name: string }> = [
      { id: 'aard', name: 'Аард' },
      { id: 'quen', name: 'Квен' },
      { id: 'axii', name: 'Аксий' },
    ]
    for (const sd of signDefs) {
      const st = this.signs[sd.id]
      if (!st.unlocked) {
        const lpCost = sd.id === 'axii' ? 3 : 2
        const goldCost = sd.id === 'axii' ? 90 : 60
        opts.push({
          id: 'sign:' + sd.id,
          name: `Изучить знак: ${sd.name}`,
          desc: ABILITY_MAP[sd.id].desc,
          kind: 'sign',
          cost: `${lpCost} ОН + ${goldCost} зол.`,
          maxed: false,
          affordable: this.lp >= lpCost && this.gold >= goldCost,
        })
      } else if (st.level < 3) {
        opts.push({
          id: 'signup:' + sd.id,
          name: `${sd.name} → уровень ${st.level + 1}`,
          desc: 'Усилить знак: больше урона и длительности.',
          kind: 'sign',
          cost: '2 ОН + 80 зол.',
          maxed: false,
          affordable: this.lp >= 2 && this.gold >= 80,
        })
      }
    }
    return { options: opts }
  }

  private openTrainer() {
    useGame.getState().patch({ trainer: this.buildTrainerOptions(), panel: 'trainer' })
  }

  trainOption(id: string) {
    const [kind, key] = id.split(':')
    if (kind === 'skill') {
      const sk = key as 'blade' | 'vitality' | 'signs' | 'speech'
      if (this.skills[sk] >= 5) return
      const lpCost = sk === 'speech' ? 3 : 2
      const goldCost = sk === 'speech' ? 60 : 40 + this.skills[sk] * 20
      if (this.lp < lpCost || this.gold < goldCost) {
        this.toast('Не хватает ОН или золота.', 'warn')
        return
      }
      this.lp -= lpCost
      this.gold -= goldCost
      this.skills[sk]++
      this.recalcStats()
      this.toast('Тренировка завершена!', 'level')
      sfx('level')
    } else if (kind === 'sign') {
      const signId = key as SignId
      const st = this.signs[signId]
      if (!st.unlocked) {
        const lpCost = signId === 'axii' ? 3 : 2
        const goldCost = signId === 'axii' ? 90 : 60
        if (this.lp < lpCost || this.gold < goldCost) {
          this.toast('Не хватает ОН или золота.', 'warn')
          return
        }
        this.lp -= lpCost
        this.gold -= goldCost
        st.unlocked = true
        st.level = 1
        this.toast(`Знак изучен: ${ABILITY_MAP[signId].name}!`, 'level')
        sfx('level')
      } else if (st.level < 3) {
        if (this.lp < 2 || this.gold < 80) {
          this.toast('Не хватает ОН или золота.', 'warn')
          return
        }
        this.lp -= 2
        this.gold -= 80
        st.level++
        this.toast(`${ABILITY_MAP[signId].name} усилен до уровня ${st.level}!`, 'level')
        sfx('level')
      }
    }
    useGame.getState().patch({ trainer: this.buildTrainerOptions() })
    this.syncUi()
  }

  // ---------------- Панели / приказы / сейвы ----------------

  openPanel(p: PanelId) {
    if (p === 'trainer') this.openTrainer()
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
    const data: SaveData = {
      version: 1,
      savedAt: Date.now(),
      playtime: this.playtime,
      kills: this.kills,
      level: this.level,
      xp: this.xp,
      lp: this.lp,
      gold: this.gold,
      hp: this.hp,
      maxHp: this.maxHp,
      stamina: this.stamina,
      maxStamina: this.maxStamina,
      attributes: { ...this.attributes },
      skills: { ...this.skills },
      signs: JSON.parse(JSON.stringify(this.signs)) as Record<SignId, { unlocked: boolean; level: number }>,
      weapon: this.weapon,
      armor: this.armor,
      inventory: this.inventory.map((i) => ({ ...i })),
      faction: this.faction,
      quests: JSON.parse(JSON.stringify(this.quests)) as Record<string, QuestState>,
      flags: { ...this.flags },
      companions: { ...this.companionIds },
      bestiary: [...this.bestiary],
      pos: { ...this.player.pos },
    }
    writeSave(data)
    useGame.getState().setHasSave(true)
    if (manual) this.toast('Игра сохранена.', 'info')
  }

  private loadFrom(s: SaveData) {
    this.playtime = s.playtime
    this.kills = s.kills
    this.level = s.level
    this.xp = s.xp
    this.lp = s.lp
    this.gold = s.gold
    this.hp = s.hp
    this.maxHp = s.maxHp
    this.stamina = s.stamina
    this.maxStamina = s.maxStamina
    this.attributes = { ...s.attributes }
    this.skills = { ...s.skills }
    this.signs = JSON.parse(JSON.stringify(s.signs)) as Record<SignId, { unlocked: boolean; level: number }>
    this.weapon = s.weapon
    this.armor = s.armor
    this.inventory = s.inventory.map((i) => ({ ...i }))
    this.faction = s.faction
    this.quests = JSON.parse(JSON.stringify(s.quests)) as Record<string, QuestState>
    this.flags = { ...s.flags }
    this.companionIds = { ...s.companions }
    this.bestiary = new Set(s.bestiary)
    this.createPlayer({ ...s.pos })
    this.spawnWorld()
  }

  toTitle() {
    this.saveGame(false)
    useGame.getState().setScreen('title')
  }

  // ---------------- Синхронизация UI ----------------

  private toast(text: string, kind: 'info' | 'quest' | 'level' | 'warn' | 'loot' = 'info') {
    useGame.getState().pushToast(text, kind)
  }

  private syncUi() {
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
        this.quests[qd.id].stage > 0 || this.quests[qd.id].done ? this.stageText(qd.id) : qd.stages[0].text,
      side: qd.side ?? false,
    }))
    const mainQ = quests.find((q) => q.id === 'main')!
    const contractQ = quests.find((q) => q.id === 'contract')!
    const boss = this.entities.find((e) => e.enemyType === 'boss' && e.alive && e.aiState !== 'idle')
    const n = this.isFrozen() ? null : this.nearestInteraction()
    st.patch({
      party,
      abilities,
      player: {
        level: this.level,
        xp: this.xp,
        xpNext: this.xpNext(),
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
    drawMinimap(this.mini, this.baked, this.entities, this.player.pos, this.questMarker(), this.mini.width, this.time)
  }

  renderFullMap(canvas: HTMLCanvasElement) {
    drawFullMap(canvas, this.baked, this.player.pos, this.questMarker())
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
