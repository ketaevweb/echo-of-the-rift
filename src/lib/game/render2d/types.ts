// ============================================================
// ЭХО РАЗЛОМА — интерфейс рендерера (Phase 0.8)
// IRenderer — мост между движком и бэкендом отрисовки.
// Сейчас реализация — канвас-2D (render2d/renderer2d);
// в Фазе 1 появится render3d (Three.js) под тем же интерфейсом.
// ============================================================

import { Entity, Floater, Particle, PropDef, Vec } from '../types'
import type { ZoneId } from '../core/ctx'

export interface IRenderer {
  /** Запечь статичный террейн мира в offscreen-канвас (легаси; движок v2.1 использует bakeZoneTerrain). */
  bakeTerrain(): HTMLCanvasElement
  /** Отрисовать проп (дерево/дом/камень/...) с сортировкой по Y снаружи. */
  drawProp(ctx: CanvasRenderingContext2D, p: PropDef, t: number): void
  /** Отрисовать сущность; isTarget включает маркер выделения. */
  drawEntity(ctx: CanvasRenderingContext2D, e: Entity, t: number, isTarget: boolean): void
  /** Частицы (искры/кольца/огонь). */
  drawParticles(ctx: CanvasRenderingContext2D, ps: Particle[]): void
  /** Всплывающий боевой текст. */
  drawFloaters(ctx: CanvasRenderingContext2D, fs: Floater[]): void
  /** Миникарта в HUD-канвасе (v2.1: текущая зона). */
  drawMinimap(
    mini: HTMLCanvasElement,
    baked: HTMLCanvasElement,
    rect: [number, number, number, number],
    entities: Entity[],
    playerPos: Vec,
    questMarker: Vec | null,
    size: number,
    t: number,
  ): void
  /** Полная карта (панель «Карта»; v2.1: текущая зона + врата). */
  drawFullMap(
    canvas: HTMLCanvasElement,
    baked: HTMLCanvasElement,
    rect: [number, number, number, number],
    zone: ZoneId,
    playerPos: Vec,
    questMarker: Vec | null,
  ): void
}
