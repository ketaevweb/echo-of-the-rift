// ============================================================
// ЭХО РАЗЛОМА — 3D-террен (Phase 1, v2.1 зоны-сцены)
// Чанковый heightmap-меш с vertex colors, вода Озера Лун,
// градиентное небо. v2.1: строится ТОЛЬКО для текущей зоны
// (сцены-локации) и пересобирается при входе в новую землю.
// ============================================================

import * as THREE from 'three'
import { LAKE, POOLS } from '../data/world'
import type { ZoneId } from '../core/ctx'
import { zoneViewRect } from '../data/zones'
import { heightAt, terrainColorAt, WATER_LEVEL } from './heightmap'

const CHUNK = 440 // размер чанка по оси (мировых юнитов)
const SEG = 30 // сегментов на чанк по оси

export class Terrain {
  group = new THREE.Group()
  private chunks: THREE.Mesh[] = []
  private water: THREE.Mesh | null = null
  private waterMat: THREE.MeshStandardMaterial | null = null
  private poolMats: THREE.MeshStandardMaterial[] = []
  private rect: [number, number, number, number]

  constructor(zone: ZoneId) {
    this.rect = zoneViewRect(zone)
    this.buildChunks()
    this.buildWater()
    this.buildPools()
  }

  /** v2.1: перестроить чанки/воду под зону (вызывается Renderer3d.rebuildZone). */
  rebuild(zone: ZoneId) {
    const rect = zoneViewRect(zone)
    if (rect === this.rect) return
    this.dispose()
    this.rect = rect
    this.buildChunks()
    this.buildWater()
    this.buildPools()
  }

  private buildChunks() {
    const [rx, ry, rw, rh] = this.rect
    const nx = Math.max(1, Math.ceil(rw / CHUNK))
    const nz = Math.max(1, Math.ceil(rh / CHUNK))
    const cw = rw / nx
    const ch = rh / nz
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96, metalness: 0 })
    const color: [number, number, number] = [0, 0, 0]

    for (let cx = 0; cx < nx; cx++) {
      for (let cz = 0; cz < nz; cz++) {
        const geo = new THREE.PlaneGeometry(cw, ch, SEG, SEG)
        geo.rotateX(-Math.PI / 2)
        const pos = geo.attributes.position as THREE.BufferAttribute
        const colors = new Float32Array(pos.count * 3)
        const ox = rx + cx * cw
        const oz = ry + cz * ch
        for (let i = 0; i < pos.count; i++) {
          const lx = pos.getX(i)
          const lz = pos.getZ(i)
          const wx = ox + lx + cw / 2
          const wz = oz + lz + ch / 2
          const h = heightAt(wx, wz)
          pos.setY(i, h)
          terrainColorAt(wx, wz, h, color)
          colors[i * 3] = color[0]
          colors[i * 3 + 1] = color[1]
          colors[i * 3 + 2] = color[2]
        }
        geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
        geo.computeVertexNormals()
        const mesh = new THREE.Mesh(geo, mat)
        mesh.position.set(ox + cw / 2, 0, oz + ch / 2)
        mesh.receiveShadow = true
        mesh.matrixAutoUpdate = false
        mesh.updateMatrix()
        this.chunks.push(mesh)
        this.group.add(mesh)
      }
    }
  }

  private buildWater() {
    // Озеро Лун — только там, где оно попадает в зону (долина)
    const [rx, ry, rw, rh] = this.rect
    if (LAKE.x < rx || LAKE.x > rx + rw || LAKE.y < ry || LAKE.y > ry + rh) return
    const geo = new THREE.CircleGeometry(LAKE.r + 26, 48)
    geo.rotateX(-Math.PI / 2)
    this.waterMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0.11, 0.22, 0.23),
      transparent: true,
      opacity: 0.86,
      roughness: 0.15,
      metalness: 0.1,
    })
    this.water = new THREE.Mesh(geo, this.waterMat)
    this.water.position.set(LAKE.x, WATER_LEVEL, LAKE.y)
    this.group.add(this.water)
  }

  /** Тинистые омуты Гнилых Топей (Фаза 3) — только в зоне Вельда. */
  private buildPools() {
    const [rx, ry, rw, rh] = this.rect
    for (const p of POOLS) {
      if (p.x < rx || p.x > rx + rw || p.y < ry || p.y > ry + rh) continue
      const geo = new THREE.CircleGeometry(p.r + 6, 28)
      geo.rotateX(-Math.PI / 2)
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(0.13, 0.16, 0.1),
        transparent: true,
        opacity: 0.92,
        roughness: 0.32,
        metalness: 0.05,
      })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.set(p.x, WATER_LEVEL - 0.3, p.y)
      this.group.add(mesh)
      this.poolMats.push(mat)
    }
  }

  /** Лёгкая анимация воды (вызывается каждый кадр). */
  update(time: number) {
    if (!this.waterMat) return
    this.waterMat.roughness = 0.8 + Math.sin(time * 1.7) * 0.08
    if (this.water) this.water.position.y = WATER_LEVEL + Math.sin(time * 0.8) * 0.07
    for (let i = 0; i < this.poolMats.length; i++) {
      this.poolMats[i].roughness = 0.3 + Math.sin(time * 1.1 + i * 1.7) * 0.1
    }
  }

  dispose() {
    // общий материал чанков не храним отдельно — пересоздаётся в buildChunks
    const mats = new Set<THREE.Material>()
    for (const c of this.chunks) {
      c.geometry.dispose()
      if (c.material) mats.add(c.material as THREE.Material)
    }
    for (const m of mats) m.dispose()
    this.chunks = []
    this.water?.geometry.dispose()
    this.waterMat?.dispose()
    this.water = null
    this.waterMat = null
    for (const m of this.poolMats) m.dispose()
    this.poolMats = []
    // сцена могла накапливать старых детей — чистим группу
    while (this.group.children.length) this.group.remove(this.group.children[0])
  }
}

/** Градиентное небо-сфера (без текстур). */
export function buildSky(): THREE.Mesh {
  const geo = new THREE.SphereGeometry(4200, 24, 16)
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      top: { value: new THREE.Color(0.42, 0.5, 0.56) },
      horizon: { value: new THREE.Color(0.82, 0.8, 0.7) },
    },
    vertexShader: /* glsl */ `
      varying vec3 vPos;
      void main() {
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 top;
      uniform vec3 horizon;
      varying vec3 vPos;
      void main() {
        float t = clamp(normalize(vPos).y * 1.4 + 0.12, 0.0, 1.0);
        gl_FragColor = vec4(mix(horizon, top, t), 1.0);
      }
    `,
  })
  const sky = new THREE.Mesh(geo, mat)
  sky.frustumCulled = false
  return sky
}
