// ============================================================
// ЭХО РАЗЛОМА — 3D-аватары сущностей (Phase 1)
// AvatarFactory: сборка героя/спутника/NPC/зверей из примитивов,
// процедурная анимация (шаг, выпад атаки, каст, оглушение,
// смерть), HP-бары-биллборды. Логика боя знает только координаты.
// ============================================================

import * as THREE from 'three'
import { Entity } from '../types'
import { heightAt } from './heightmap'

const UP = new THREE.Vector3(0, 1, 0)

function mat(color: number, opts?: Partial<THREE.MeshStandardMaterialParameters>): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0, ...opts })
}

/** Собирает все материалы подветки — для вспышки урона/смерти. */
interface MatEntry {
  m: THREE.MeshStandardMaterial
  baseEmissive: THREE.Color
  baseIntensity: number
}

function collectMats(root: THREE.Object3D): MatEntry[] {
  const out: MatEntry[] = []
  root.traverse((o) => {
    const m = (o as THREE.Mesh).material
    if (!m) return
    if (Array.isArray(m)) {
      for (const x of m) {
        if ((x as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
          const sm = x as THREE.MeshStandardMaterial
          out.push({ m: sm, baseEmissive: sm.emissive.clone(), baseIntensity: sm.emissiveIntensity })
        }
      }
    } else if ((m as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
      const sm = m as THREE.MeshStandardMaterial
      out.push({ m: sm, baseEmissive: sm.emissive.clone(), baseIntensity: sm.emissiveIntensity })
    }
  })
  return out
}

// ---------------- Человеческие аватары ----------------

interface HumanoidRefs {
  legL: THREE.Object3D
  legR: THREE.Object3D
  armR: THREE.Object3D
  torso: THREE.Object3D
  head: THREE.Object3D
}

function buildHumanoid(
  cloakColor: string,
  skinColor = 0xc9a07a,
  opts?: { hood?: boolean; staff?: boolean; sword?: boolean; scale?: number; bandana?: number; helmet?: boolean; horns?: boolean },
): { group: THREE.Group; refs: HumanoidRefs } {
  const s = 0.65 * (opts?.scale ?? 1)
  const group = new THREE.Group()
  const cloak = mat(new THREE.Color(cloakColor).getHex())
  const skin = mat(skinColor)
  const dark = mat(0x2e2620)

  // Ноги
  const legGeo = new THREE.CapsuleGeometry(2.6, 8, 3, 6)
  const legL = new THREE.Group()
  const legR = new THREE.Group()
  const legLm = new THREE.Mesh(legGeo, dark)
  const legRm = new THREE.Mesh(legGeo, dark)
  legLm.position.y = -6
  legRm.position.y = -6
  legLm.castShadow = true
  legRm.castShadow = true
  legL.add(legLm)
  legR.add(legRm)
  legL.position.set(-3.4, 14, 0)
  legR.position.set(3.4, 14, 0)

  // Торс (мантия)
  const torso = new THREE.Group()
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(6.4, 10, 4, 8), cloak)
  body.position.y = 6
  body.castShadow = true
  const belt = new THREE.Mesh(new THREE.CylinderGeometry(6.6, 6.6, 2.2, 8), mat(0x4a3626))
  belt.position.y = 0.5
  torso.add(body, belt)
  torso.position.y = 14

  // Голова
  const head = new THREE.Group()
  const skull = new THREE.Mesh(new THREE.SphereGeometry(4.6, 10, 8), skin)
  skull.castShadow = true
  head.add(skull)
  if (opts?.hood) {
    const hood = new THREE.Mesh(new THREE.ConeGeometry(6, 9.5, 7), cloak)
    hood.position.y = 2.6
    hood.rotation.x = 0.22
    head.add(hood)
  } else if (opts?.helmet) {
    const helm = new THREE.Mesh(new THREE.ConeGeometry(5.2, 6.5, 8), mat(0x8a8a80))
    helm.position.y = 3.4
    head.add(helm)
  } else if (opts?.bandana !== undefined) {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(4.8, 4.8, 2, 8), mat(opts.bandana))
    band.position.y = 1.6
    head.add(band)
  }
  head.position.y = 13.5
  torso.add(head)

  // Левая рука (простая)
  const armL = new THREE.Mesh(new THREE.CapsuleGeometry(2, 8, 3, 6), cloak)
  armL.position.set(-8, 7, 0)
  armL.rotation.z = 0.35
  torso.add(armL)

  // Правая рука + оружие
  const armR = new THREE.Group()
  const armRm = new THREE.Mesh(new THREE.CapsuleGeometry(2, 8, 3, 6), cloak)
  armRm.position.y = -4
  armR.add(armRm)
  if (opts?.sword) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(1.6, 20, 3.6), mat(0xb8b8b0, { metalness: 0.55, roughness: 0.35 }))
    blade.position.y = -16
    const guard = new THREE.Mesh(new THREE.BoxGeometry(6, 1.6, 2), mat(0x8a6a30, { metalness: 0.4 }))
    guard.position.y = -6
    armR.add(blade, guard)
  } else if (opts?.staff) {
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 26, 5), mat(0x5c4630))
    shaft.position.y = -8
    const orb = new THREE.Mesh(
      new THREE.SphereGeometry(2.6, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0x9fb8a4, emissive: 0x6a9a7a, emissiveIntensity: 1.1 }),
    )
    orb.position.y = 6
    armR.add(shaft, orb)
  }
  armR.position.set(8, 7, 0)
  torso.add(armR)

  group.add(legL, legR, torso)

  if (opts?.horns) {
    for (const side of [-1, 1]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(1.8, 9, 5), mat(0x2a1a20))
      horn.position.set(side * 4.4, 4, 0)
      horn.rotation.z = -side * 0.6
      head.add(horn)
    }
  }

  // Глобальный масштаб: рост человека ≈ 26 юнитов мира (радиус сущности 13)
  group.scale.setScalar(0.65 * (opts?.scale ?? 1))
  return { group, refs: { legL, legR, armR, torso, head } }
}

// ---------------- Звери ----------------

interface WolfRefs {
  legs: THREE.Object3D[]
  body: THREE.Object3D
}

function buildWolf(scale = 1, alpha = false): { group: THREE.Group; refs: WolfRefs } {
  const group = new THREE.Group()
  const furColor = alpha ? 0x3a3230 : 0x6a5a48
  const fur = mat(furColor)
  const dark = mat(0x26201a)

  const body = new THREE.Group()
  const trunk = new THREE.Mesh(new THREE.CapsuleGeometry(5.2, 16, 4, 8), fur)
  trunk.rotation.z = Math.PI / 2
  trunk.position.y = 11
  trunk.castShadow = true
  const neck = new THREE.Mesh(new THREE.CapsuleGeometry(3.4, 6, 3, 6), fur)
  neck.position.set(11, 13.5, 0)
  neck.rotation.z = -0.7
  const headG = new THREE.Group()
  const skull = new THREE.Mesh(new THREE.BoxGeometry(7, 5.4, 5.4), fur)
  const snout = new THREE.Mesh(new THREE.BoxGeometry(4.4, 3, 3.4), dark)
  snout.position.x = 5
  const earGeo = new THREE.ConeGeometry(1.4, 3.4, 4)
  const earL = new THREE.Mesh(earGeo, fur)
  const earR = new THREE.Mesh(earGeo, fur)
  earL.position.set(-1.6, 3.6, 1.6)
  earR.position.set(-1.6, 3.6, -1.6)
  headG.add(skull, snout, earL, earR)
  headG.position.set(15, 16, 0)
  const tail = new THREE.Mesh(new THREE.CapsuleGeometry(1.6, 8, 3, 5), fur)
  tail.position.set(-12, 13, 0)
  tail.rotation.z = 0.9
  body.add(trunk, neck, headG, tail)

  if (alpha) {
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xe05038 })
    for (const sz of [-1.4, 1.4]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.7, 6, 4), eyeMat)
      eye.position.set(17.6, 16.6, sz)
      body.add(eye)
    }
  }

  const legs: THREE.Object3D[] = []
  const legGeo = new THREE.CapsuleGeometry(1.5, 7, 3, 5)
  for (const [lx, lz] of [[9, 3.4], [9, -3.4], [-8, 3.4], [-8, -3.4]]) {
    const leg = new THREE.Group()
    const lm = new THREE.Mesh(legGeo, dark)
    lm.position.y = -5
    leg.add(lm)
    leg.position.set(lx, 9, lz)
    legs.push(leg)
    body.add(leg)
  }

  group.add(body)
  group.scale.setScalar(0.75 * scale)
  return { group, refs: { legs, body } }
}

// ---------------- Порождение Разлома ----------------

function buildHorror(scale = 1): { group: THREE.Group; refs: { body: THREE.Object3D } } {
  const group = new THREE.Group()
  const body = new THREE.Group()
  const shroud = new THREE.Mesh(
    new THREE.ConeGeometry(9, 24, 8, 1, true),
    new THREE.MeshStandardMaterial({
      color: 0x3a2a4a,
      emissive: 0x7a4ac0,
      emissiveIntensity: 0.55,
      transparent: true,
      opacity: 0.82,
      side: THREE.DoubleSide,
    }),
  )
  shroud.position.y = 13
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xd0a0ff })
  for (const sz of [-2.4, 2.4]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(1.1, 6, 4), eyeMat)
    eye.position.set(3.4, 17, sz)
    body.add(eye)
  }
  const glow = new THREE.PointLight(0x9a5fd0, 60, 90, 2)
  glow.position.y = 14
  body.add(shroud, glow)
  group.add(body)
  group.scale.setScalar(0.8 * scale)
  return { group, refs: { body } }
}

// ---------------- Аватар сущности ----------------

export class Avatar {
  group = new THREE.Group()
  private refs: Partial<HumanoidRefs & WolfRefs & { body: THREE.Object3D }> = {}
  private mats: MatEntry[] = []
  private hpBar: HpBar
  private deadTilt = 0
  private eid: number
  /** Модель собрана «мордой по +X» (звери/хоррор) — формула поворота другая. */
  private forwardX = false

  constructor(e: Entity) {
    this.eid = e.eid
    const arch = this.archetype(e)
    let built: { group: THREE.Group; refs: object }
    switch (arch) {
      case 'player':
        built = buildHumanoid(e.color, 0xc9a07a, { hood: true, sword: true })
        break
      case 'companion':
        built = e.id === 'kaya'
          ? buildHumanoid(e.color, 0xc9a07a, { hood: true, staff: true })
          : buildHumanoid(e.color, 0xc9a07a, { sword: true, scale: 1.15 })
        break
      case 'npc':
        built = buildHumanoid(e.color, 0xc9a07a, { scale: 1 })
        break
      case 'wolf':
        built = buildWolf(1)
        break
      case 'alpha':
        built = buildWolf(1.65, true)
        break
      case 'bandit':
        built = buildHumanoid(e.color, 0xbfa07a, { bandana: 0xa03a2a, sword: true })
        break
      case 'archer':
        built = buildHumanoid(e.color, 0xbfa07a, { bandana: 0x6a5a30 })
        break
      case 'captain':
        built = buildHumanoid(e.color, 0xbfa07a, { helmet: true, sword: true, scale: 1.25 })
        break
      case 'horror':
        built = buildHorror(1)
        break
      case 'boss':
        built = buildHumanoid(e.color, 0x6a5a5a, { horns: true, sword: true, scale: 2.5 })
        break
      default:
        built = buildHumanoid(e.color, 0xbfa07a)
        break
    }
    // Переносим содержимое собранной группы в свою
    while (built.group.children.length) {
      const c = built.group.children[0]
      this.group.add(c)
    }
    this.group.scale.copy(built.group.scale)
    this.refs = built.refs as Avatar['refs']
    this.forwardX = arch === 'wolf' || arch === 'alpha' || arch === 'horror'
    this.mats = collectMats(this.group)
    this.hpBar = new HpBar()
    this.group.add(this.hpBar.obj)
    this.group.userData.eid = e.eid
  }

  private archetype(e: Entity):
    | 'player'
    | 'companion'
    | 'npc'
    | 'wolf'
    | 'alpha'
    | 'bandit'
    | 'archer'
    | 'captain'
    | 'horror'
    | 'boss'
    | 'humanoid' {
    if (e.kind === 'player') return 'player'
    if (e.kind === 'companion') return 'companion'
    if (e.kind === 'npc') return 'npc'
    switch (e.enemyType) {
      case 'wolf': return 'wolf'
      case 'alpha': return 'alpha'
      case 'bandit': return 'bandit'
      case 'archer': return 'archer'
      case 'captain': return 'captain'
      case 'horror': return 'horror'
      case 'boss': return 'boss'
      default: return 'humanoid'
    }
  }

  /** Кадровое обновление: позиция, поворот, анимация. */
  update(e: Entity, time: number, camera: THREE.Camera, isTarget: boolean) {
    const h = heightAt(e.pos.x, e.pos.y)
    const speed = Math.hypot(e.vel.x, e.vel.y)
    const moving = speed > 6

    // Позиция и поворот (facing — угол в плоскости мира).
    // Humanoid смотрит по локальной +Z (поворот π/2 − facing),
    // звери/хоррор — по локальной +X (поворот −facing), иначе бегут боком.
    this.group.position.set(e.pos.x, h, e.pos.y)
    const targetRot = this.forwardX ? -e.facing : Math.PI / 2 - e.facing
    let dr = targetRot - this.group.rotation.y
    while (dr > Math.PI) dr -= Math.PI * 2
    while (dr < -Math.PI) dr += Math.PI * 2
    this.group.rotation.y += dr * Math.min(1, dt10())

    // Смерть: заваливание набок + оглушение-дёргание + наклон рывка (Фаза 2)
    const tiltTarget = e.alive ? 0 : 1.45
    this.deadTilt += (tiltTarget - this.deadTilt) * 0.08
    const stunned = e.alive && e.stunT > 0
    const dashing = e.alive && (e.dashT ?? 0) > 0
    this.group.rotation.z = this.deadTilt * 0.5 + (stunned ? Math.sin(time * 14) * 0.05 : 0)
    this.group.rotation.x = -this.deadTilt * 0.2 + (dashing ? -0.3 : 0)

    // Шаг
    const swing = moving ? Math.sin(e.walkPhase * 7) * 0.55 : Math.sin(time * 1.6) * 0.05
    if (this.refs.legs) {
      // зверь: лапы качаются вдоль корпуса (вокруг локальной Z, морда по +X)
      this.refs.legs.forEach((leg, i) => {
        leg.rotation.z = moving ? Math.sin(e.walkPhase * 9 + (i % 2 ? Math.PI : 0)) * 0.6 : 0
      })
      if (this.refs.body) {
        this.refs.body.position.y = moving ? Math.abs(Math.sin(e.walkPhase * 9)) * 1.1 : 0
        // Прыжок-выпад зверя при атаке (вперёд по локальной +X)
        this.refs.body.position.x = e.attackT > 0 ? Math.sin((1 - e.attackT / 0.28) * Math.PI) * 7 : 0
      }
    } else if (this.refs.legL && this.refs.legR) {
      this.refs.legL.rotation.x = swing
      this.refs.legR.rotation.x = -swing
      if (this.refs.torso) {
        this.refs.torso.position.y = 14 + (moving ? Math.abs(Math.sin(e.walkPhase * 7)) * 1.4 : Math.sin(time * 1.6) * 0.4)
        // Выпад атаки корпусом вперёд (humanoid смотрит по локальной +Z)
        this.refs.torso.position.z = e.attackT > 0 ? Math.sin((1 - e.attackT / 0.28) * Math.PI) * 6 : 0
        const windingSlam = e.alive && e.slamT > 0
        const windingCharge = e.alive && (e.chargeT ?? 0) > 0
        this.refs.torso.rotation.x = windingCharge ? -0.14 : windingSlam ? 0.12 : 0
      }
    }

    // Выпад атаки / каст / телеграфные позы босса (Фаза 2)
    if (this.refs.armR) {
      if (e.alive && e.slamT > 0) {
        // Замах слэма: клинок вскинут над головой и дрожит — читается издалека
        this.refs.armR.rotation.x = -2.5 + Math.sin(time * 30) * 0.06
      } else if (e.alive && (e.chargeT ?? 0) > 0) {
        // Замах рывка: занос назад, корпус сжался
        this.refs.armR.rotation.x = 1.15
      } else if (e.castT > 0) {
        this.refs.armR.rotation.x = -2.2
      } else if (e.attackT > 0) {
        this.refs.armR.rotation.x = -1.4 + (0.28 - e.attackT) * 12
      } else {
        this.refs.armR.rotation.x = moving ? Math.sin(e.walkPhase * 7 + Math.PI) * 0.4 : 0
      }
    }

    // Порождение Разлома парит
    if (this.refs.body && e.enemyType === 'horror') {
      this.refs.body.position.y = 6 + Math.sin(time * 2.2 + this.eid) * 2.4
      this.refs.body.rotation.y = Math.sin(time * 1.1) * 0.25
    }

    // Вспышка урона
    const flash = e.hitT > 0 ? 1.6 : 0
    for (const entry of this.mats) {
      if (flash > 0) {
        entry.m.emissive.setRGB(flash * 0.4, 0.02, 0.02)
        entry.m.emissiveIntensity = 1
      } else {
        entry.m.emissive.copy(entry.baseEmissive)
        entry.m.emissiveIntensity = entry.baseIntensity
      }
    }

    // HP-бар
    const show = e.kind !== 'player' && (isTarget || (e.hp < e.maxHp && e.alive) || e.kind === 'enemy')
    this.hpBar.update(camera, this.group.position, e.hp / e.maxHp, !!show, !!e.boss)
  }

  dispose() {
    this.hpBar.dispose()
    this.group.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (mesh.geometry) mesh.geometry.dispose()
      const m = mesh.material as THREE.Material | THREE.Material[] | undefined
      if (Array.isArray(m)) m.forEach((x) => x.dispose())
      else if (m) m.dispose()
    })
  }
}

/** Плавный коэффициент поворота (константа вместо dt-замыкания). */
function dt10(): number {
  return 0.18
}

// ---------------- HP-бар (биллборд) ----------------

class HpBar {
  obj = new THREE.Group()
  private fg: THREE.Mesh
  private fgMat: THREE.MeshBasicMaterial
  private canvas: HTMLCanvasElement | null = null

  constructor() {
    const bg = new THREE.Mesh(
      new THREE.PlaneGeometry(18, 2.4),
      new THREE.MeshBasicMaterial({ color: 0x14100c, transparent: true, opacity: 0.75, depthTest: false }),
    )
    this.fgMat = new THREE.MeshBasicMaterial({ color: 0x8fbf6a, depthTest: false })
    this.fg = new THREE.Mesh(new THREE.PlaneGeometry(18, 2.4), this.fgMat)
    this.fg.position.z = 0.01
    this.obj.add(bg, this.fg)
    this.obj.renderOrder = 10
    this.obj.visible = false
    this.obj.position.y = 30
  }

  update(camera: THREE.Camera, pos: THREE.Vector3, ratio: number, show: boolean, boss: boolean) {
    if (!show) {
      this.obj.visible = false
      return
    }
    this.obj.visible = true
    this.obj.position.y = boss ? 66 : 30
    // Биллборд: повернуться к камере
    this.obj.quaternion.copy(camera.quaternion)
    const r = Math.max(0, Math.min(1, ratio))
    this.fg.scale.x = Math.max(0.001, r)
    this.fg.position.x = -(18 * (1 - r)) / 2
    this.fgMat.color.setRGB(0.56 + (1 - r) * 0.44, 0.75 * r + 0.1, 0.3 * r + 0.05)
  }

  dispose() {
    this.obj.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (mesh.geometry) mesh.geometry.dispose()
      const m = mesh.material as THREE.Material | undefined
      if (m) m.dispose()
    })
  }
}

export class AvatarFactory {
  private map = new Map<number, Avatar>()
  private parent: THREE.Group

  constructor(parent: THREE.Group) {
    this.parent = parent
  }

  /** Синхронизация пула аватаров со списком сущностей. */
  sync(entities: Entity[]): Map<number, Avatar> {
    const seen = new Set<number>()
    for (const e of entities) {
      seen.add(e.eid)
      if (!this.map.has(e.eid)) {
        const av = new Avatar(e)
        this.map.set(e.eid, av)
        this.parent.add(av.group)
      }
    }
    for (const [eid, av] of this.map) {
      if (!seen.has(eid)) {
        av.dispose()
        this.parent.remove(av.group)
        this.map.delete(eid)
      }
    }
    return this.map
  }

  dispose() {
    for (const av of this.map.values()) av.dispose()
    this.map.clear()
  }
}

export { UP }
