// ============================================================
// ЭХО РАЗЛОМА — 3D-пропсы (Phase 1)
// Перенос PROPS/INTERACTABLES в Three.js: деревья и камни —
// InstancedMesh, постройки — сборные меши, Разлом — портал с
// подсветкой, барьеры/травы скрываются через removedProps.
// ============================================================

import * as THREE from 'three'
import { INTERACTABLES, PROPS } from '../data/world'
import { PropDef } from '../types'
import { seedRot } from '../core/util'
import { heightAt } from './heightmap'

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)

function groundMat(color: number, rough = 0.95): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0 })
}

function place(group: THREE.Group, obj: THREE.Object3D, x: number, y: number, z = 0, rotY = 0) {
  obj.position.set(x, heightAt(x, y) + z, y)
  obj.rotation.y = rotY
  group.add(obj)
}

export class Props3d {
  group = new THREE.Group()
  /** Меши, скрываемые при removedProps (барьеры, травы). */
  private removable = new Map<string, THREE.Object3D[]>()
  private fires: Array<{ light: THREE.PointLight; flame: THREE.Mesh; base: number }> = []
  private riftSpin: THREE.Object3D | null = null
  private herbPulse: THREE.Object3D[] = []
  private disposables: Array<{ dispose(): void }> = []

  constructor() {
    this.buildInstanced()
    for (const p of PROPS) this.buildProp(p)
    this.buildHerbs()
  }

  // ---------------- Инстансинг: деревья/камни/кусты ----------------

  private buildInstanced() {
    const trees = PROPS.filter((p) => p.kind === 'tree')
    const rocks = PROPS.filter((p) => p.kind === 'rock')
    const shrubs = PROPS.filter((p) => p.kind === 'shrub' || p.kind === 'flower')

    if (trees.length) {
      // Ствол
      const trunkGeo = new THREE.CylinderGeometry(1.6, 2.6, 14, 6)
      trunkGeo.translate(0, 7, 0)
      const trunkMat = groundMat(0x4a3626)
      const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, trees.length)
      // Крона — два конуса (матрицы инстансов — МИРОВЫЕ: база дерева + локальный сдвиг * масштаб)
      const coneGeo = new THREE.ConeGeometry(8, 18, 7)
      const leafMat = groundMat(0x2e4422)
      const leaves = new THREE.InstancedMesh(coneGeo, leafMat, trees.length * 2)
      const m = new THREE.Matrix4()
      const q = new THREE.Quaternion()
      const sc = new THREE.Vector3()
      trees.forEach((p, i) => {
        const h = heightAt(p.pos.x, p.pos.y)
        const rot = seedRot(p.seed ?? i)
        const s = 0.85 + ((p.seed ?? 7) % 100) / 220
        q.setFromAxisAngle(V(0, 1, 0), rot)
        sc.set(s, s * (0.9 + ((p.seed ?? 3) % 60) / 200), s)
        m.compose(V(p.pos.x, h, p.pos.y), q, sc)
        trunks.setMatrixAt(i, m)
        m.compose(V(p.pos.x, h + 12 * s, p.pos.y), q, sc)
        leaves.setMatrixAt(i * 2, m)
        m.compose(V(p.pos.x, h + 22 * s, p.pos.y), q, sc)
        leaves.setMatrixAt(i * 2 + 1, m)
      })
      trunks.castShadow = true
      leaves.castShadow = true
      this.group.add(trunks, leaves)
      this.disposables.push(trunkGeo, trunkMat, coneGeo, leafMat)
    }

    if (rocks.length) {
      const rockGeo = new THREE.DodecahedronGeometry(1, 0)
      const rockMat = groundMat(0x6a6a64)
      const meshes = new THREE.InstancedMesh(rockGeo, rockMat, rocks.length)
      const m = new THREE.Matrix4()
      const q = new THREE.Quaternion()
      const e = new THREE.Euler()
      const sc = new THREE.Vector3()
      rocks.forEach((p, i) => {
        const h = heightAt(p.pos.x, p.pos.y)
        const r = p.r ?? 10
        e.set(seedRot(p.seed ?? i) * 0.4, seedRot((p.seed ?? 0) + 91), 0)
        q.setFromEuler(e)
        sc.set(r * 1.15, r * 0.8, r * 1.05)
        m.compose(V(p.pos.x, h + r * 0.25, p.pos.y), q, sc)
        meshes.setMatrixAt(i, m)
      })
      meshes.castShadow = true
      meshes.receiveShadow = true
      this.group.add(meshes)
      this.disposables.push(rockGeo, rockMat)
    }

    if (shrubs.length) {
      const bushGeo = new THREE.IcosahedronGeometry(1, 0)
      const bushMat = groundMat(0x3c5226)
      const flowerMat = groundMat(0xa8b86a)
      const bushes = new THREE.InstancedMesh(bushGeo, bushMat, shrubs.length)
      const m = new THREE.Matrix4()
      const q = new THREE.Quaternion()
      const sc = new THREE.Vector3()
      shrubs.forEach((p, i) => {
        const h = heightAt(p.pos.x, p.pos.y)
        q.setFromAxisAngle(V(0, 1, 0), seedRot(p.seed ?? i))
        const s = p.kind === 'flower' ? 1.5 : 2.4
        sc.set(s, s * 0.75, s)
        m.compose(V(p.pos.x, h + s * 0.5, p.pos.y), q, sc)
        bushes.setMatrixAt(i, m)
      })
      this.group.add(bushes)
      this.disposables.push(bushGeo, bushMat, flowerMat)
    }
  }

  // ---------------- Одиночные пропсы ----------------

  private buildProp(p: PropDef) {
    const { x, y } = p.pos
    const h = () => heightAt(x, y)
    switch (p.kind) {
      case 'tree':
      case 'rock':
      case 'shrub':
      case 'flower':
        return // уже в инстансах

      case 'house': {
        const g = new THREE.Group()
        const w = p.w ?? 120
        const d = p.h ?? 70
        const bodyH = 26 + w * 0.06
        const body = new THREE.Mesh(new THREE.BoxGeometry(w, bodyH, d), groundMat(0x6b543c))
        body.position.y = bodyH / 2
        body.castShadow = true
        body.receiveShadow = true
        const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.62, 20 + w * 0.08, 4), groundMat(0x3d2f22))
        roof.rotation.y = Math.PI / 4
        roof.position.y = bodyH + (10 + w * 0.04)
        roof.castShadow = true
        g.add(body, roof)
        place(this.group, g, x, y, 0, seedRot(p.seed ?? 1) * 0.2)
        break
      }

      case 'tent': {
        const g = new THREE.Group()
        const w = p.w ?? 60
        const tent = new THREE.Mesh(new THREE.ConeGeometry(w * 0.42, w * 0.62, 5), groundMat(0x7a6248))
        tent.position.y = w * 0.31
        tent.castShadow = true
        g.add(tent)
        place(this.group, g, x, y, 0, seedRot(p.seed ?? 1))
        break
      }

      case 'stall': {
        const g = new THREE.Group()
        const table = new THREE.Mesh(new THREE.BoxGeometry(70, 8, 42), groundMat(0x6b543c))
        table.position.y = 16
        const roof = new THREE.Mesh(new THREE.BoxGeometry(80, 4, 50), groundMat(0x8a3d2e))
        roof.position.y = 40
        roof.rotation.z = 0.08
        for (const [lx, lz] of [[-30, -16], [30, -16], [-30, 16], [30, 16]]) {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 32, 5), groundMat(0x4a3626))
          leg.position.set(lx, 16, lz)
          g.add(leg)
        }
        table.castShadow = true
        g.add(table, roof)
        place(this.group, g, x, y)
        break
      }

      case 'dummy': {
        const g = new THREE.Group()
        const post = new THREE.Mesh(new THREE.CylinderGeometry(3, 4, 34, 6), groundMat(0x5c4630))
        post.position.y = 17
        const cross = new THREE.Mesh(new THREE.BoxGeometry(26, 4, 4), groundMat(0x5c4630))
        cross.position.y = 26
        const head = new THREE.Mesh(new THREE.SphereGeometry(4.5, 8, 6), groundMat(0x8a7148))
        head.position.y = 37
        post.castShadow = true
        g.add(post, cross, head)
        place(this.group, g, x, y)
        break
      }

      case 'fire': {
        const g = new THREE.Group()
        for (let i = 0; i < 5; i++) {
          const log = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.8, 12, 5), groundMat(0x3d2a1a))
          log.rotation.set(Math.PI / 2.4, (i / 5) * Math.PI * 2, 0)
          log.position.y = 2.4
          g.add(log)
        }
        const flame = new THREE.Mesh(
          new THREE.ConeGeometry(5, 12, 6),
          new THREE.MeshBasicMaterial({ color: 0xe8913a, transparent: true, opacity: 0.92 }),
        )
        flame.position.y = 9
        const light = new THREE.PointLight(0xff9540, 320, 190, 2)
        light.position.y = 12
        g.add(flame, light)
        place(this.group, g, x, y)
        this.fires.push({ light, flame, base: 1 })
        break
      }

      case 'fence': {
        const g = new THREE.Group()
        const w = p.w ?? 90
        const rail = new THREE.Mesh(new THREE.BoxGeometry(w, 3, 2.4), groundMat(0x54422e))
        rail.position.y = 12
        const rail2 = rail.clone()
        rail2.position.y = 6
        g.add(rail, rail2)
        const n = Math.max(2, Math.round(w / 30))
        for (let i = 0; i <= n; i++) {
          const post = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 14, 5), groundMat(0x4a3626))
          post.position.set(-w / 2 + (w / n) * i, 7, 0)
          g.add(post)
        }
        place(this.group, g, x, y, 0, seedRot(p.seed ?? 1) * 0.1)
        break
      }

      case 'stone': {
        const g = new THREE.Group()
        const r = p.r ?? 12
        const obelisk = new THREE.Mesh(new THREE.BoxGeometry(r * 0.9, r * 3.4, r * 0.7), groundMat(0x77776f))
        obelisk.position.y = r * 1.6
        obelisk.rotation.z = (seedRot(p.seed ?? 1) - Math.PI) * 0.06
        obelisk.castShadow = true
        const cap = new THREE.Mesh(new THREE.ConeGeometry(r * 0.55, r * 0.9, 4), groundMat(0x6a6a62))
        cap.position.y = r * 3.4
        cap.rotation.y = Math.PI / 4
        g.add(obelisk, cap)
        place(this.group, g, x, y)
        break
      }

      case 'altar': {
        const g = new THREE.Group()
        const slab = new THREE.Mesh(new THREE.CylinderGeometry(16, 20, 8, 8), groundMat(0x8a8a80))
        slab.position.y = 4
        slab.castShadow = true
        const glow = new THREE.Mesh(
          new THREE.OctahedronGeometry(5, 0),
          new THREE.MeshBasicMaterial({ color: 0xd9a441, transparent: true, opacity: 0.85 }),
        )
        glow.position.y = 22
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(20, 23, 32),
          new THREE.MeshBasicMaterial({ color: 0xd9a441, transparent: true, opacity: 0.3, side: THREE.DoubleSide }),
        )
        ring.rotation.x = -Math.PI / 2
        ring.position.y = 1
        g.add(slab, glow, ring)
        place(this.group, g, x, y)
        this.riftSpin = glow // вращается вместе с руной алтаря
        this.herbPulse.push(ring)
        break
      }

      case 'carcass': {
        const g = new THREE.Group()
        const body = new THREE.Mesh(new THREE.CapsuleGeometry(p.r ?? 14, 10, 3, 8), groundMat(0x5e4438))
        body.rotation.z = Math.PI / 2
        body.position.y = 5
        g.add(body)
        place(this.group, g, x, y)
        break
      }

      case 'rift': {
        const g = new THREE.Group()
        const portal = new THREE.Mesh(
          new THREE.TorusGeometry(52, 7, 10, 40),
          new THREE.MeshStandardMaterial({ color: 0x3a2a4a, emissive: 0x9a5fd0, emissiveIntensity: 1.4, roughness: 0.5 }),
        )
        portal.position.y = 62
        const disc = new THREE.Mesh(
          new THREE.CircleGeometry(50, 32),
          new THREE.MeshBasicMaterial({ color: 0x1a0f22, transparent: true, opacity: 0.88, side: THREE.DoubleSide }),
        )
        disc.position.y = 62
        const core = new THREE.Mesh(
          new THREE.TorusGeometry(26, 4, 8, 28),
          new THREE.MeshBasicMaterial({ color: 0xc09ae8, transparent: true, opacity: 0.7 }),
        )
        core.position.y = 62
        const light = new THREE.PointLight(0xa86fe0, 900, 520, 2)
        light.position.y = 70
        g.add(portal, disc, core, light)
        place(this.group, g, x, y)
        this.riftSpin = core
        break
      }

      case 'barrier': {
        const g = new THREE.Group()
        const shroud = new THREE.Mesh(
          new THREE.CylinderGeometry(20, 26, 46, 8, 1, true),
          new THREE.MeshStandardMaterial({
            color: 0x6a4a8a,
            emissive: 0x8a5fc0,
            emissiveIntensity: 0.7,
            transparent: true,
            opacity: 0.45,
            side: THREE.DoubleSide,
          }),
        )
        shroud.position.y = 23
        g.add(shroud)
        place(this.group, g, x, y)
        if (p.id) this.removable.set(p.id, [g])
        break
      }
    }
  }

  // ---------------- Травы-интерактивы ----------------

  private buildHerbs() {
    for (const it of INTERACTABLES) {
      if (it.kind !== 'herb') continue
      const g = new THREE.Group()
      const stem = new THREE.Mesh(new THREE.ConeGeometry(1.6, 9, 5), groundMat(0x7aa06a))
      stem.position.y = 4.5
      const glow = new THREE.Mesh(
        new THREE.SphereGeometry(3.4, 8, 6),
        new THREE.MeshBasicMaterial({ color: 0xcfe8c0, transparent: true, opacity: 0.75 }),
      )
      glow.position.y = 11
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(8, 9.5, 24),
        new THREE.MeshBasicMaterial({ color: 0x9fb8a4, transparent: true, opacity: 0.4, side: THREE.DoubleSide }),
      )
      ring.rotation.x = -Math.PI / 2
      ring.position.y = 0.6
      g.add(stem, glow, ring)
      place(this.group, g, it.pos.x, it.pos.y)
      this.removable.set(it.id, [g])
      this.herbPulse.push(ring)
    }
  }

  // ---------------- Кадр ----------------

  update(time: number, removed: Set<string>) {
    // Огни костров мерцают
    for (const f of this.fires) {
      const flick = 0.82 + Math.sin(time * 11) * 0.1 + Math.sin(time * 23.7) * 0.08
      f.light.intensity = 320 * flick
      const s = 0.9 + flick * 0.25
      f.flame.scale.set(s, 1 + flick * 0.4, s)
    }
    // Пульс колец трав/алтаря
    const pulse = 0.5 + 0.5 * Math.sin(time * 2.5)
    for (const r of this.herbPulse) {
      const m = (r as THREE.Mesh).material as THREE.MeshBasicMaterial
      m.opacity = 0.22 + pulse * 0.3
    }
    // Вращение магических элементов
    if (this.riftSpin) {
      this.riftSpin.rotation.y = time * 0.9
      this.riftSpin.rotation.z = Math.sin(time * 0.6) * 0.15
    }
    // Скрытые пропсы (барьеры по квесту, собранные травы)
    for (const [id, objs] of this.removable) {
      const hidden = removed.has(id)
      for (const o of objs) o.visible = !hidden
    }
  }

  dispose() {
    this.group.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (mesh.geometry) mesh.geometry.dispose()
      const mat = mesh.material as THREE.Material | THREE.Material[] | undefined
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose())
      else if (mat) mat.dispose()
    })
    for (const d of this.disposables) d.dispose()
  }
}
