// ============================================================
// ЭХО РАЗЛОМА — зоны-сцены (v2.1)
// Мир больше не одна огромная сцена: каждая земля — отдельная
// «сцена-локация». Рендерится и симулируется ТОЛЬКО текущая
// зона (пропсы, коллайдеры, НПС, враги, терен, миникарта).
// Переходы — через врата (порталы), как и раньше; игроку не
// нужно видеть, что за преградами, — и мобильные GPU не должны
// просчитывать мир целиком ради кадра (Realme-класс < 30 FPS).
//
// ZONE_RECTS — логические границы (совпадают с zoneOf).
// ZONE_VIEW_RECTS — расширенные границы для запекания терена
// и карт: хребты по краям зоны видны с обеих сторон, шов
// терена скрыт в полосе гор.
// ============================================================

import type { ZoneId } from '../core/ctx'
import { RIDGE, GATES, POOLS } from './veld'
import { GRIDGE, GR_GATES } from './granite'
import { FRIDGE, FR_GATES } from './frost'
import { MARA_RIDGE, MA_GATES } from './mara'
import { DF_GATES, KRAJ } from './disputed'
import { RB_EDGE, RB_GATES } from './rubezh'
import { AREA_MARKERS, INTERACTABLES, NPCS, PROPS, ROADS, SPAWN_ZONES, WORLD, zoneOf } from './world'
import { VELD_CLUES } from './veld'

/** [x, y, w, h] в мировых координатах. Границы согласованы с zoneOf(). */
export type Rect = [number, number, number, number]

export const ZONE_RECTS: Record<ZoneId, Rect> = {
  valley: [0, 0, GRIDGE.x, RIDGE.y],
  veld: [0, RIDGE.y, GRIDGE.x, WORLD.h - RIDGE.y],
  granite: [GRIDGE.x, 0, FRIDGE.x - GRIDGE.x, MARA_RIDGE.y],
  mara: [GRIDGE.x, MARA_RIDGE.y, FRIDGE.x - GRIDGE.x, WORLD.h - MARA_RIDGE.y],
  frost: [FRIDGE.x, 0, KRAJ.x - FRIDGE.x, WORLD.h],
  disputed: [KRAJ.x, 0, RB_EDGE.x - KRAJ.x, WORLD.h],
  rubezh: [RB_EDGE.x, 0, WORLD.w - RB_EDGE.x, WORLD.h],
}

/** Полоса хребта, которую добавляем к границе вида с каждой общей стороны.
 *  500 — с запасом на половину экрана у врат, чтобы шов терена не был виден. */
const VIEW_PAD = 500

function padRect([x, y, w, h]: Rect): Rect {
  const x0 = Math.max(0, x - (x > 0 ? VIEW_PAD : 0))
  const y0 = Math.max(0, y - (y > 0 ? VIEW_PAD : 0))
  const x1 = Math.min(WORLD.w, x + w + (x + w < WORLD.w ? VIEW_PAD : 0))
  const y1 = Math.min(WORLD.h, y + h + (y + h < WORLD.h ? VIEW_PAD : 0))
  return [x0, y0, x1 - x0, y1 - y0]
}

/** Границы вида (запекание терена, миникарта, карта): зона + полоса хребтов по краям. */
export const ZONE_VIEW_RECTS: Record<ZoneId, Rect> = {
  valley: padRect(ZONE_RECTS.valley),
  veld: padRect(ZONE_RECTS.veld),
  granite: padRect(ZONE_RECTS.granite),
  mara: padRect(ZONE_RECTS.mara),
  frost: padRect(ZONE_RECTS.frost),
  disputed: padRect(ZONE_RECTS.disputed),
  rubezh: padRect(ZONE_RECTS.rubezh),
}

export function zoneViewRect(zone: ZoneId): Rect {
  return ZONE_VIEW_RECTS[zone]
}

function inRect(r: Rect, x: number, y: number, pad = 0): boolean {
  return x >= r[0] - pad && x <= r[0] + r[2] + pad && y >= r[1] - pad && y <= r[1] + r[3] + pad
}

function midOf(pts: Array<{ x: number; y: number }>): { x: number; y: number } {
  const i = Math.floor(pts.length / 2)
  return pts[i]
}

/** Срез мира по зонам: строится один раз при загрузке модуля.
 *  Принадлежность — строго по zoneOf(), та же функция, что и в рантайме,
 *  поэтому срезы не расходятся с логикой переходов. */
function buildZoneData() {
  const data: Record<
    ZoneId,
    {
      props: typeof PROPS
      npcs: typeof NPCS
      spawns: typeof SPAWN_ZONES
      interactables: typeof INTERACTABLES
      roads: typeof ROADS
      markers: typeof AREA_MARKERS
      clues: typeof VELD_CLUES
    }
  > = {
    valley: { props: [], npcs: [], spawns: [], interactables: [], roads: [], markers: [], clues: [] },
    veld: { props: [], npcs: [], spawns: [], interactables: [], roads: [], markers: [], clues: [] },
    granite: { props: [], npcs: [], spawns: [], interactables: [], roads: [], markers: [], clues: [] },
    frost: { props: [], npcs: [], spawns: [], interactables: [], roads: [], markers: [], clues: [] },
    mara: { props: [], npcs: [], spawns: [], interactables: [], roads: [], markers: [], clues: [] },
    disputed: { props: [], npcs: [], spawns: [], interactables: [], roads: [], markers: [], clues: [] },
    rubezh: { props: [], npcs: [], spawns: [], interactables: [], roads: [], markers: [], clues: [] },
  }
  for (const p of PROPS) data[zoneOf(p.pos.x, p.pos.y)].props.push(p)
  for (const n of NPCS) data[zoneOf(n.pos.x, n.pos.y)].npcs.push(n)
  for (const z of SPAWN_ZONES) data[zoneOf(z.center.x, z.center.y)].spawns.push(z)
  for (const it of INTERACTABLES) data[zoneOf(it.pos.x, it.pos.y)].interactables.push(it)
  for (const m of AREA_MARKERS) data[zoneOf(m.pos.x, m.pos.y)].markers.push(m)
  for (const c of VELD_CLUES) data[zoneOf(c.pos.x, c.pos.y)].clues.push(c)
  for (const road of ROADS) data[zoneOf(midOf(road).x, midOf(road).y)].roads.push(road)

  // сортировка пропсов по y — порядок отрисовки в 2D-сцене
  for (const z of Object.keys(data) as ZoneId[]) data[z].props.sort((a, b) => a.pos.y - b.pos.y)
  return data
}

export const ZONE_DATA = buildZoneData()

/** Врата (порталы) с точкой на карте — для прорисовки карты зоны. */
export interface GateMarker {
  zone: ZoneId
  pos: { x: number; y: number }
  label: string
}

export const ZONE_GATES: GateMarker[] = [
  { zone: 'valley', pos: GATES.valley, label: GATES.valley.label },
  { zone: 'valley', pos: GR_GATES.valleySide, label: GR_GATES.valleySide.label },
  { zone: 'veld', pos: GATES.veld, label: GATES.veld.label },
  { zone: 'granite', pos: GR_GATES.granite, label: GR_GATES.granite.label },
  { zone: 'granite', pos: FR_GATES.graniteSide, label: FR_GATES.graniteSide.label },
  { zone: 'granite', pos: MA_GATES.graniteSide, label: MA_GATES.graniteSide.label },
  { zone: 'frost', pos: FR_GATES.frost, label: FR_GATES.frost.label },
  { zone: 'frost', pos: DF_GATES.frostSide, label: DF_GATES.frostSide.label },
  { zone: 'mara', pos: MA_GATES.mara, label: MA_GATES.mara.label },
  { zone: 'disputed', pos: DF_GATES.disputed, label: DF_GATES.disputed.label },
  { zone: 'disputed', pos: RB_GATES.disputedSide, label: RB_GATES.disputedSide.label },
  { zone: 'rubezh', pos: RB_GATES.rubezh, label: RB_GATES.rubezh.label },
]

export function gatesOf(zone: ZoneId): GateMarker[] {
  return ZONE_GATES.filter((g) => g.zone === zone)
}

/** Омуты Топей (визуал 3D/2D) — только Вельд. */
export function poolsOf(zone: ZoneId): Array<{ x: number; y: number; r: number }> {
  return zone === 'veld' ? POOLS : []
}

// Утилиты-экспорты для рендеров (импорты «живут» здесь, чтобы модули
// рендеров не тянули все data-файлы напрямую).
export { inRect as rectContains }
export { ZONE_DATA as zoneData }
