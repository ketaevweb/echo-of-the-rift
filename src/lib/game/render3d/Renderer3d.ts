// ============================================================
// ЭХО РАЗЛОМА — 3D-рендерер (Phase 1)
// Renderer3d: WebGL-сцена (террейн/пропсы/аватары/FX), камера
// третьего лица с орбитой (ПКМ-драг + колесо), луч в землю для
// клик-движения, проекционный пикинг сущностей, тряска камеры.
// Реализует мост View3dBridge для движка (см. core/ctx).
// ============================================================

import * as THREE from 'three'
import { Entity, Vec } from '../types'
import { WORLD } from '../data/world'
import { heightAt } from './heightmap'
import { Terrain, buildSky } from './Terrain'
import { Props3d } from './Props'
import { AvatarFactory } from './Avatars'
import { Fx3d } from './Fx'

// ---------------- Снимок состояния движка ----------------

export interface SceneView3d {
  time: number
  shake: number
  player: Entity
  playerAlive: boolean
  entities: Entity[]
  particles: import('../types').Particle[]
  floaters: import('../types').Floater[]
  targetEid: number | null
  removedProps: Set<string>
}

export interface EntityPick {
  eid: number
  kind: Entity['kind']
  alive: boolean
  enemyType?: Entity['enemyType']
  npcDialogue?: string
}

// ---------------- Renderer3d ----------------

export class Renderer3d {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera: THREE.PerspectiveCamera
  private sun: THREE.DirectionalLight
  private terrain: Terrain
  private props: Props3d
  private entityGroup = new THREE.Group()
  private avatars: AvatarFactory
  private fx: Fx3d
  private camInitialized = false

  // Орбита камеры
  private yaw = 0
  private pitch = 0.62
  private dist = 120
  private camTarget = new THREE.Vector3()
  private dragging = false
  private lastX = 0
  private lastY = 0

  // Лучи/векторы (переиспользуемые, без аллокаций в кадре)
  private raycaster = new THREE.Raycaster()
  private ndc = new THREE.Vector2()
  private tmpV = new THREE.Vector3()

  private canvas: HTMLCanvasElement
  private disposed = false

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    })
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 0.88

    this.camera = new THREE.PerspectiveCamera(55, 1, 1, 9000)

    // Туман и фон — тёплые, без синевы
    this.scene.fog = new THREE.FogExp2(0xb4bc9e, 0.00092)

    // Свет
    const hemi = new THREE.HemisphereLight(0xd8dcc4, 0x55613f, 0.72)
    this.scene.add(hemi)
    const amb = new THREE.AmbientLight(0xffffff, 0.22)
    this.scene.add(amb)
    this.sun = new THREE.DirectionalLight(0xffe0b0, 1.55)
    this.sun.castShadow = true
    this.sun.shadow.mapSize.set(2048, 2048)
    const sc = this.sun.shadow.camera
    sc.near = 10
    sc.far = 700
    sc.left = -220
    sc.right = 220
    sc.top = 220
    sc.bottom = -220
    this.sun.shadow.bias = -0.0006
    this.scene.add(this.sun, this.sun.target)

    // Мир
    this.scene.add(buildSky())
    this.terrain = new Terrain()
    this.scene.add(this.terrain.group)
    this.props = new Props3d()
    this.scene.add(this.props.group)
    this.scene.add(this.entityGroup)
    this.avatars = new AvatarFactory(this.entityGroup)
    this.fx = new Fx3d()
    this.scene.add(this.fx.group)

    this.bindOrbit()
    this.resize()
  }

  // ---------------- Орбита камеры ----------------

  private bindOrbit() {
    const c = this.canvas
    c.addEventListener('pointerdown', this.onOrbitDown)
    window.addEventListener('pointermove', this.onOrbitMove)
    window.addEventListener('pointerup', this.onOrbitUp)
    c.addEventListener('wheel', this.onWheel, { passive: false })
    c.addEventListener('contextmenu', this.onCtxMenu)
  }

  private onCtxMenu = (e: Event) => e.preventDefault()

  private onOrbitDown = (e: PointerEvent) => {
    if (e.button === 2 || e.button === 1) {
      this.dragging = true
      this.lastX = e.clientX
      this.lastY = e.clientY
    }
  }

  private onOrbitMove = (e: PointerEvent) => {
    if (!this.dragging) return
    const dx = e.clientX - this.lastX
    const dy = e.clientY - this.lastY
    this.lastX = e.clientX
    this.lastY = e.clientY
    this.yaw -= dx * 0.0052
    this.pitch = Math.max(0.16, Math.min(1.25, this.pitch + dy * 0.004))
  }

  private onOrbitUp = () => {
    this.dragging = false
  }

  private onWheel = (e: WheelEvent) => {
    e.preventDefault()
    this.dist = Math.max(40, Math.min(260, this.dist + e.deltaY * 0.09))
  }

  private updateCamera(view: SceneView3d) {
    const p = view.player.pos
    const px = Math.max(40, Math.min(WORLD.w - 40, p.x))
    const pz = Math.max(40, Math.min(WORLD.h - 40, p.y))
    // Первый кадр — мгновенно ставим камеру к герою, без перелёта через полкарты
    if (!this.camInitialized) {
      this.camInitialized = true
      this.camTarget.set(px, 0, pz)
    }
    // Плавное слежение за героем
    const lerp = 1 - Math.pow(0.00002, 1 / 60)
    this.camTarget.x += (px - this.camTarget.x) * lerp
    this.camTarget.z += (pz - this.camTarget.z) * lerp
    const groundH = heightAt(this.camTarget.x, this.camTarget.z)
    const focusY = groundH + 6

    const cp = Math.cos(this.pitch)
    const cx = this.camTarget.x + Math.sin(this.yaw) * this.dist * cp
    const cz = this.camTarget.z + Math.cos(this.yaw) * this.dist * cp
    const cy = focusY + Math.sin(this.pitch) * this.dist

    // Камера не проваливается под рельеф
    const camGround = heightAt(cx, cz)
    const camY = Math.max(cy, camGround + 4)

    // Тряска (удары/слэм босса)
    let sx = 0
    let sy = 0
    if (view.shake > 0) {
      sx = (Math.random() - 0.5) * view.shake * 0.5
      sy = (Math.random() - 0.5) * view.shake * 0.5
    }

    this.camera.position.set(cx + sx, camY + sy, cz)
    this.camera.lookAt(this.camTarget.x, focusY + sy * 0.4, this.camTarget.z)

    // Солнце следует за героем (покрытие теней)
    this.sun.position.set(this.camTarget.x + 120, groundH + 190, this.camTarget.z + 70)
    this.sun.target.position.set(this.camTarget.x, groundH, this.camTarget.z)
    this.sun.target.updateMatrixWorld()
  }

  // ---------------- Пикинг и луч в землю ----------------

  private setPointer(sx: number, sy: number) {
    const rect = this.canvas.getBoundingClientRect()
    this.ndc.x = ((sx - rect.left) / rect.width) * 2 - 1
    this.ndc.y = -((sy - rect.top) / rect.height) * 2 + 1
  }

  /** Точка мира (x, y) под курсором — для приказов движения. */
  screenToGround(sx: number, sy: number): Vec | null {
    this.setPointer(sx, sy)
    this.raycaster.setFromCamera(this.ndc, this.camera)
    const origin = this.raycaster.ray.origin
    const dir = this.raycaster.ray.direction
    // Маршевый пересчёт с рельефом: шагаем по лучу, ищем пересечение heightAt
    let t = 10
    for (let i = 0; i < 220; i++) {
      const step = Math.max(1.5, t * 0.03)
      t += step
      const x = origin.x + dir.x * t
      const z = origin.z + dir.z * t
      const y = origin.y + dir.y * t
      if (x < -200 || x > WORLD.w + 200 || z < -200 || z > WORLD.h + 200) return null
      if (y - heightAt(x, z) <= 0) {
        // Бинарное уточнение
        let lo = t - step
        let hi = t
        for (let k = 0; k < 12; k++) {
          const mid = (lo + hi) / 2
          const mx = origin.x + dir.x * mid
          const mz = origin.z + dir.z * mid
          const my = origin.y + dir.y * mid
          if (my - heightAt(mx, mz) <= 0) hi = mid
          else lo = mid
        }
        const fx = origin.x + dir.x * hi
        const fz = origin.z + dir.z * hi
        return { x: Math.max(30, Math.min(WORLD.w - 30, fx)), y: Math.max(30, Math.min(WORLD.h - 30, fz)) }
      }
      if (t > 2600) return null
    }
    return null
  }

  /** Ближайшая сущность к курсору в экранных пикселях (отрезок ноги→голова). */
  pickAtScreen(sx: number, sy: number, padPx: number): EntityPick | null {
    this.setPointer(sx, sy)
    const rect = this.canvas.getBoundingClientRect()
    let best: EntityPick | null = null
    let bestD = padPx
    for (const e of this.avatarsSyncedEntities) {
      if (!e.alive && e.kind !== 'npc') continue
      const h = heightAt(e.pos.x, e.pos.y)
      const headH = e.boss ? 58 : e.enemyType === 'wolf' || e.enemyType === 'alpha' ? 18 : e.enemyType === 'horror' ? 26 : 28
      // Экранные координаты ног и головы
      this.tmpV.set(e.pos.x, h + 1, e.pos.y)
      this.tmpV.project(this.camera)
      if (this.tmpV.z > 1) continue
      const x0 = ((this.tmpV.x + 1) / 2) * rect.width + rect.left
      const y0 = ((-this.tmpV.y + 1) / 2) * rect.height + rect.top
      this.tmpV.set(e.pos.x, h + headH, e.pos.y)
      this.tmpV.project(this.camera)
      const x1 = ((this.tmpV.x + 1) / 2) * rect.width + rect.left
      const y1 = ((-this.tmpV.y + 1) / 2) * rect.height + rect.top
      // Расстояние от клика до вертикального отрезка силуэта
      const dx = x1 - x0
      const dy = y1 - y0
      const l2 = dx * dx + dy * dy
      let t = l2 > 0 ? ((sx - x0) * dx + (sy - y0) * dy) / l2 : 0
      t = Math.max(0, Math.min(1, t))
      const d = Math.hypot(sx - (x0 + t * dx), sy - (y0 + t * dy))
      if (d < bestD) {
        bestD = d
        best = {
          eid: e.eid,
          kind: e.kind,
          alive: e.alive,
          enemyType: e.enemyType,
          npcDialogue: e.npc?.dialogue,
        }
      }
    }
    return best
  }

  private avatarsSyncedEntities: Entity[] = []

  // ---------------- Кадр ----------------

  resize() {
    if (this.disposed) return
    const w = this.canvas.clientWidth || window.innerWidth
    const h = this.canvas.clientHeight || window.innerHeight
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / Math.max(1, h)
    this.camera.updateProjectionMatrix()
  }

  render(view: SceneView3d) {
    if (this.disposed) return
    this.avatarsSyncedEntities = view.entities

    const avatars = this.avatars.sync(view.entities)
    for (const e of view.entities) {
      const av = avatars.get(e.eid)
      if (!av) continue
      av.group.visible = true
      av.update(e, view.time, this.camera, view.targetEid === e.eid)
    }

    this.terrain.update(view.time)
    this.props.update(view.time, view.removedProps)
    const target = view.targetEid ? view.entities.find((x) => x.eid === view.targetEid) ?? null : null
    this.fx.update(view.particles, view.floaters, target, view.time)

    this.updateCamera(view)
    this.renderer.render(this.scene, this.camera)
  }

  dispose() {
    this.disposed = true
    const c = this.canvas
    c.removeEventListener('pointerdown', this.onOrbitDown)
    window.removeEventListener('pointermove', this.onOrbitMove)
    window.removeEventListener('pointerup', this.onOrbitUp)
    c.removeEventListener('wheel', this.onWheel)
    c.removeEventListener('contextmenu', this.onCtxMenu)
    this.terrain.dispose()
    this.props.dispose()
    this.avatars.dispose()
    this.fx.dispose()
    this.renderer.dispose()
  }
}
