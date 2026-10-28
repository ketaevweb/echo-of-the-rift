// ============================================================
// ЭХО РАЗЛОМА — игровой цикл (Phase 0.9)
// GameLoop: владеет rAF-циклом, порядком «симуляция → рендер →
// sync UI → автосейв». Хост (GameEngine) реализует LoopHost
// структурно и не знает о requestAnimationFrame.
// stepWorld — фиксированный порядок систем симуляции.
// ============================================================

import { WORLD, zoneOf } from '../data/world'
import { DAY_LENGTH } from '../data/tables'
import { tickCds, updateTelegraphs } from '../systems/combat'
import { updateCompanion, updateEnemy } from '../systems/ai'
import { updateStatuses } from '../systems/combat'
import { separate, updatePlayer } from '../systems/movement'
import { updateParticles } from '../systems/combat'
import { updateArea, updateEnding } from '../systems/quest'
import { updatePit } from '../systems/career'
import { updateFrost } from '../systems/frost'
import { updateMara } from '../systems/mara'
import { updateDisputed } from '../systems/disputed'
import { updateRubezh } from '../systems/rubezh'
import { updateFinale } from '../systems/finale'
import type { EngineCtx } from './ctx'
import { Clock } from './Clock'

// ---------------- Шаг симуляции мира ----------------

/** Фиксированный порядок систем. НЕ менять произвольно: ввод → партия → ИИ → статусы → разделение → эффекты → мир. */
export function stepWorld(ctx: EngineCtx, dt: number): void {
  // Игровое время (respawnAt врагов, endingAt финала) — тик потерялся при рефакторинге 0.9
  ctx.time += dt
  updatePlayer(ctx, dt)
  for (const e of ctx.entities) {
    if (e.kind === 'companion') updateCompanion(ctx, e, dt)
    else if (e.kind === 'enemy') updateEnemy(ctx, e, dt)
    else if (e.kind === 'npc') e.walkPhase += dt * 0.5
    updateStatuses(ctx, e, dt)
    tickCds(e, dt)
  }
  separate(ctx)
  updateTelegraphs(ctx, dt)
  updateParticles(ctx, dt)
  updatePit(ctx) // Фаза 6: волны/победа ямы
  updateFrost(ctx, dt) // Фаза 6.2: дракон Стылого Пределья
  updateMara(ctx, dt) // Фаза 6.3: оборона Бастиона (волны штурма)
  updateDisputed(ctx, dt) // Фаза 6.4: набег Орды на Рощу (волны + триггер близости)
  updateRubezh(ctx, dt) // Фаза 6.5: будим Капитана «Двенадцатого» у стазис-зала
  updateFinale(ctx, dt) // Фаза 7: рейд в Сердце Разлома (4 волны + суд)
  ctx.buffT = Math.max(0, ctx.buffT - dt)
  ctx.shake = Math.max(0, ctx.shake - dt * 26)
  // Фаза 3: сутки, масло, зона
  ctx.dayClock = (ctx.dayClock + dt / DAY_LENGTH) % 1
  if (ctx.oilT > 0) ctx.oilT = Math.max(0, ctx.oilT - dt)
  // v2.1: зоны-сцены — при смене земли (врата или телепорт) перестраиваем сцену
  const z = zoneOf(ctx.player.pos.x, ctx.player.pos.y)
  if (z !== ctx.zone) ctx.enterZone(z)
  ctx.zone = z
  updateArea(ctx)
  updateEnding(ctx)
  // камера следует за игроком (в 3D кламп не нужен — там своя орбита)
  const lerp = 1 - Math.pow(0.0001, dt)
  ctx.camera.x += (ctx.player.pos.x - ctx.camera.x) * lerp
  ctx.camera.y += (ctx.player.pos.y - ctx.camera.y) * lerp
  if (ctx.renderMode === '3d') return
  const vw = ctx.canvas.clientWidth || 1
  const vh = ctx.canvas.clientHeight || 1
  ctx.camera.x = Math.max(Math.min(vw / 2, WORLD.w / 2), Math.min(ctx.camera.x, WORLD.w - vw / 2))
  ctx.camera.y = Math.max(Math.min(vh / 2, WORLD.h / 2), Math.min(ctx.camera.y, WORLD.h - vh / 2))
}

// ---------------- Косметика (идёт даже при паузе) ----------------

/** Частицы, флоатеры и тряска затухают даже при открытой панели/диалоге/такт-паузе —
 * иначе боевой текст зависает в воздухе до закрытия панели. */
export function stepCosmetics(ctx: EngineCtx, dt: number): void {
  updateParticles(ctx, dt)
  ctx.shake = Math.max(0, ctx.shake - dt * 26)
}

// ---------------- Цикл кадров ----------------

/** Хост цикла: минимальный набор, необходимый rAF-обвязке. */
export interface LoopHost {
  destroyed: boolean
  playtime: number
  tacticalPaused: boolean
  isFrozen(): boolean
  update(dt: number): void
  /** Косметика (частицы/флоатеры/тряска) — тикает и во время паузы/панелей. */
  updateCosmetics(dt: number): void
  render(): void
  syncUi(): void
  renderMinimap(): void
  /** Автосохранение (обычно saveGame(false)). */
  autosave(): void
  /** Фаза 8: FPS-метр цикла — движок ведёт авто-даунгрейд качества (GDD 06 §7). */
  onFps?(fps: number): void
  /** v2.2: кап частоты кадров (пресет «Мобильное» — 30 FPS), 0/undefined — без капа.
   *  Скипается ЦЕЛЫЙ кадр (сим+рендер), clock не тикает — dt копится корректно. */
  frameCap?(): number
}

const SYNC_PERIOD = 0.12 // сек между syncUi/миникартой
const AUTOSAVE_PERIOD = 45 // сек между автосейвами

export class GameLoop {
  private clock = new Clock()
  private raf = 0
  private syncT = 0
  private autosaveT = 0
  // Фаза 8: скользящее среднее FPS (экспоненциальное) + окно оценки 3 с
  private fpsEma = 60
  private fpsWindow = 0
  // v2.2: время последнего НЕСКИПНУТОГО кадра (для капа частоты кадров)
  private lastFull = 0

  constructor(private host: LoopHost) {}

  start() {
    const step = (t: number) => {
      if (this.host.destroyed) return
      // v2.2: кап FPS (пресет «Мобильное») — рендерим не чаще 1000/кап мс.
      // Скипнутый кадр не тикает clock — dt копится до следующего полного кадра.
      const cap = this.host.frameCap?.() ?? 0
      if (cap > 0 && t - this.lastFull < 1000 / cap - 0.75) {
        this.raf = requestAnimationFrame(step)
        return
      }
      this.lastFull = t
      const dt = this.clock.tick(t)
      if (dt > 0) {
        this.fpsEma = this.fpsEma * 0.92 + (1 / Math.max(dt, 0.0001)) * 0.08
        this.fpsWindow += dt
        if (this.fpsWindow >= 3) {
          this.fpsWindow = 0
          this.host.onFps?.(Math.round(this.fpsEma))
        }
      }
      if (!this.host.isFrozen() && !this.host.tacticalPaused) {
        this.host.playtime += dt
        this.host.update(dt)
      } else {
        this.host.updateCosmetics(dt)
      }
      this.host.render()
      this.syncT -= dt
      if (this.syncT <= 0) {
        this.syncT = SYNC_PERIOD
        this.host.syncUi()
        this.host.renderMinimap()
      }
      if (this.host.playtime > 0) {
        this.autosaveT += dt
        if (this.autosaveT > AUTOSAVE_PERIOD) {
          this.autosaveT = 0
          this.host.autosave()
        }
      }
      this.raf = requestAnimationFrame(step)
    }
    this.raf = requestAnimationFrame(step)
  }

  stop() {
    cancelAnimationFrame(this.raf)
  }
}
