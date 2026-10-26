// ============================================================
// ЭХО РАЗЛОМА — система ввода (Phase 0.7)
// bindInput/unbindInput + обработчики клавиатуры (WASD и
// русская раскладка, хоткеи панелей/способностей) и мыши
// (выбор цели, диалоги, интеракты, приказ движения).
// Биндинги создаются на движок и снимаются при destroy.
// ============================================================

import { ABILITY_BAR_IDS } from '../data/tables'
import { Vec } from '../types'
import { PanelId, useGame } from '../store'
import { sfx } from '../sfx'
import { EngineCtx } from '../core/ctx'
import { pickEntity } from '../core/entity'
import { chooseOption, closeDialogue, doInteract, openDialogue, pickInteractable, runInteractable } from './quest'

interface InputHandlers {
  keyDown: (ev: KeyboardEvent) => void
  keyUp: (ev: KeyboardEvent) => void
  pointerDown: (ev: PointerEvent) => void
}

// Стабильные ссылки обработчиков на движок (для add/removeEventListener)
const handlers = new WeakMap<EngineCtx, InputHandlers>()

function onKeyDown(ctx: EngineCtx, ev: KeyboardEvent) {
  const store = useGame.getState()
  if (ctx.dialogueTree) {
    const n = parseInt(ev.key, 10)
    if (!isNaN(n) && n >= 1 && n <= 9) {
      chooseOption(ctx, n - 1)
      ev.preventDefault()
    } else if (ev.key === 'Escape') {
      closeDialogue(ctx)
    }
    return
  }
  if (ev.key === 'Escape') {
    if (store.panel && store.panel !== 'ending') ctx.closePanel()
    else if (!store.panel) ctx.openPanel('pause')
    return
  }
  if (store.panel) {
    const map: Record<string, PanelId> = { c: 'char', i: 'inv', j: 'journal', m: 'map' }
    const k = ev.key.toLowerCase()
    if (map[k] && store.panel === map[k]) {
      ctx.closePanel()
      ev.preventDefault()
    }
    return
  }
  const k = ev.key.toLowerCase()
  ctx.keys.add(k)
  if (k === ' ') {
    ctx.tacticalPaused = !ctx.tacticalPaused
    useGame.getState().patch({ paused: ctx.tacticalPaused })
    sfx('click')
    ev.preventDefault()
    return
  }
  if (k === 'f' || k === 'а') doInteract(ctx)
  if (k === 'c' || k === 'с') ctx.openPanel('char')
  if (k === 'i' || k === 'ш') ctx.openPanel('inv')
  if (k === 'j' || k === 'о') ctx.openPanel('journal')
  if (k === 'm' || k === 'ь') ctx.openPanel('map')
  if (k >= '1' && k <= '7') {
    const id = ABILITY_BAR_IDS[parseInt(k, 10) - 1]
    if (id) ctx.castAbility(id)
  }
  if (k === 'q' || k === 'й') ctx.castAbility('potion_heal')
  if (k === 'e' || k === 'у') ctx.castAbility('potion_stam')
}

function onKeyUp(ctx: EngineCtx, ev: KeyboardEvent) {
  ctx.keys.delete(ev.key.toLowerCase())
}

function canvasPoint(ctx: EngineCtx, ev: PointerEvent): Vec {
  const rect = ctx.inputCanvas.getBoundingClientRect()
  return {
    x: ctx.camera.x + (ev.clientX - rect.left - rect.width / 2),
    y: ctx.camera.y + (ev.clientY - rect.top - rect.height / 2),
  }
}

function onPointerDown(ctx: EngineCtx, ev: PointerEvent) {
  if (useGame.getState().panel || ctx.dialogueTree) return
  if (ev.button !== 0) return

  // --- 3D-режим: проекционный пикинг + луч в рельеф ---
  if (ctx.renderMode === '3d' && ctx.view3d) {
    const hit = ctx.view3d.pickAtScreen(ev.clientX, ev.clientY, 18)
    if (hit && hit.kind === 'enemy' && hit.alive) {
      ctx.targetEid = hit.eid
      sfx('click')
      return
    }
    if (hit && hit.kind === 'npc' && hit.alive && hit.npcDialogue) {
      openDialogue(ctx, hit.npcDialogue)
      return
    }
    const ground = ctx.view3d.screenToGround(ev.clientX, ev.clientY)
    if (ground) {
      const it = pickInteractable(ctx, ground, 30)
      if (it) {
        runInteractable(ctx, it)
        return
      }
      ctx.targetEid = null
      ctx.player.dest = ground
    }
    return
  }

  // --- 2D (легаси) ---
  const p = canvasPoint(ctx, ev)
  const enemy = pickEntity(ctx, p, (e) => e.kind === 'enemy' && e.alive, 10)
  if (enemy) {
    ctx.targetEid = enemy.eid
    sfx('click')
    return
  }
  const npc = pickEntity(ctx, p, (e) => e.kind === 'npc' && e.alive, 22)
  if (npc && npc.npc) {
    openDialogue(ctx, npc.npc.dialogue)
    return
  }
  const it = pickInteractable(ctx, p, 28)
  if (it) {
    runInteractable(ctx, it)
    return
  }
  ctx.targetEid = null
  ctx.player.dest = p
}

export function bindInput(ctx: EngineCtx) {
  const h: InputHandlers = {
    keyDown: (ev) => onKeyDown(ctx, ev),
    keyUp: (ev) => onKeyUp(ctx, ev),
    pointerDown: (ev) => onPointerDown(ctx, ev),
  }
  handlers.set(ctx, h)
  window.addEventListener('keydown', h.keyDown)
  window.addEventListener('keyup', h.keyUp)
  // Ввод мыши — на активном канвасе (при смене режима бинд переносится)
  ctx.inputCanvas.addEventListener('pointerdown', h.pointerDown)
}

export function unbindInput(ctx: EngineCtx) {
  const h = handlers.get(ctx)
  if (!h) return
  window.removeEventListener('keydown', h.keyDown)
  window.removeEventListener('keyup', h.keyUp)
  ctx.inputCanvas.removeEventListener('pointerdown', h.pointerDown)
  handlers.delete(ctx)
}
