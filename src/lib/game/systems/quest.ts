// ============================================================
// ЭХО РАЗЛОМА — система квестов и диалогов (Phase 0.5)
// initQuests, диалоги (dialogueCtx/evalCond/openDialogue/
// setNode/chooseOption/closeDialogue/runAction), интеракты
// (runInteractable/pickInteractable/nearestInteraction/doInteract),
// квесты (advanceQuest/stageText/checkProof/questMarker),
// области и финал (updateArea/updateEnding/openEnding).
// ============================================================

import { DIALOGUES, PORTRAITS } from '../data/dialogues'
import { QUESTS, QUEST_MAP } from '../data/quests'
import { AREAS, INTERACTABLES, NPCS, ASH_MOTHER, VELD_CLUES } from '../data/world'
import { ITEMS } from '../data/items'
import { BESTIARY_INFO } from '../data/tables'
import { Entity, Faction, InteractableDef, Vec } from '../types'
import { useGame } from '../store'
import { sfx } from '../sfx'
import { d } from '../core/util'
import { EngineCtx } from '../core/ctx'
import { addItem, countItem, removeItem } from './inventory'
import { gainXp, openShop, openTrainer } from './progression'
import { saveGame } from './save'
import { floater } from './combat'
import { spawnAshMother } from './ai'
import { approvalOnQuestDone } from './party'

export function initQuests(ctx: EngineCtx) {
  for (const q of QUESTS) {
    ctx.quests[q.id] = { stage: 0, counter: 0, done: false }
  }
}

// ---------------- Диалоги ----------------

export function dialogueCtx(ctx: EngineCtx) {
  return {
    quest: (id: string) => ctx.quests[id],
    flag: (name: string) => !!ctx.flags[name],
    faction: ctx.faction,
    companion: (id: string) => ctx.companionIds[id as 'kaya' | 'torvald'],
    has: (item: string, qty = 1) => countItem(ctx, item) >= qty,
    lp: ctx.lp,
    gold: ctx.gold,
  }
}

export function evalCond(ctx: EngineCtx, cond: string): boolean {
  if (!cond) return true
  for (const tok of cond.split(',')) {
    const s = tok.trim()
    if (s && !evalToken(ctx, s)) return false
  }
  return true
}

function evalToken(ctx: EngineCtx, s: string): boolean {
  let m = s.match(/^quest\.(\w+)==(\d+)$/)
  if (m) return ctx.quests[m[1]].stage === parseInt(m[2], 10)
  m = s.match(/^quest\.(\w+)>=(\d+)$/)
  if (m) return ctx.quests[m[1]].stage >= parseInt(m[2], 10)
  m = s.match(/^quest\.(\w+)<(\d+)$/)
  if (m) return ctx.quests[m[1]].stage < parseInt(m[2], 10)
  m = s.match(/^flag\.(\w+)$/)
  if (m) return !!ctx.flags[m[1]]
  m = s.match(/^!flag\.(\w+)$/)
  if (m) return !ctx.flags[m[1]]
  m = s.match(/^faction==(\w+)$/)
  if (m) return ctx.faction === (m[1] as Faction)
  m = s.match(/^comp\.(\w+)$/)
  if (m) return !!ctx.companionIds[m[1] as 'kaya' | 'torvald']
  m = s.match(/^!comp\.(\w+)$/)
  if (m) return !ctx.companionIds[m[1] as 'kaya' | 'torvald']
  m = s.match(/^has\.(\w+)(?::(\d+))?$/)
  if (m) return countItem(ctx, m[1]) >= (m[2] ? parseInt(m[2], 10) : 1)
  m = s.match(/^lp>=(\d+)$/)
  if (m) return ctx.lp >= parseInt(m[1], 10)
  m = s.match(/^gold>=(\d+)$/)
  if (m) return ctx.gold >= parseInt(m[1], 10)
  return true
}

export function openDialogue(ctx: EngineCtx, treeId: string) {
  const tree = DIALOGUES[treeId]
  if (!tree) return
  ctx.dialogueTree = treeId
  const start = typeof tree.start === 'function' ? tree.start(dialogueCtx(ctx)) : tree.start
  setNode(ctx, start)
}

export function setNode(ctx: EngineCtx, nodeId: string) {
  const tree = DIALOGUES[ctx.dialogueTree!]
  const node = tree.nodes[nodeId]
  if (!node) {
    closeDialogue(ctx)
    return
  }
  const choices = node.choices.filter((c) => evalCond(ctx, c.cond ?? ''))
  ctx.dlgChoices = choices
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

export function chooseOption(ctx: EngineCtx, i: number) {
  const c = ctx.dlgChoices[i]
  if (!c) return
  sfx('click')
  if (c.check) {
    const bonus = 1 + Math.floor(ctx.attributes.charisma / 2) + ctx.skills.speech
    const roll = d(20)
    const total = roll + bonus
    const success = roll !== 1 && (roll === 20 || total >= c.check.dc)
    ctx.toast(
      `${c.check.label}: d20 ${roll} + ${bonus} = ${total} — ${success ? 'успех!' : 'провал'}`,
      success ? 'quest' : 'warn',
    )
    if (success && c.action) runAction(ctx, c.action)
    const next = success ? c.goto : (c.gotoFail ?? null)
    if (next === null || next === undefined) {
      closeDialogue(ctx)
      return
    }
    setNode(ctx, next)
    return
  }
  if (c.action) runAction(ctx, c.action)
  if (c.goto === null || c.goto === undefined) {
    closeDialogue(ctx)
    return
  }
  setNode(ctx, c.goto)
}

export function closeDialogue(ctx: EngineCtx) {
  ctx.dialogueTree = null
  ctx.dlgChoices = []
  useGame.getState().patch({ dialogue: null })
}

export function runAction(ctx: EngineCtx, action: string) {
  for (const cmdRaw of action.split(';')) {
    const cmd = cmdRaw.trim()
    if (!cmd || cmd === 'end') continue
    const [op, arg1, arg2] = cmd.split(':')
    switch (op) {
      case 'quest':
        advanceQuest(ctx, arg1, parseInt(arg2, 10))
        break
      case 'flag':
        ctx.flags[arg1] = true
        break
      case 'give':
        addItem(ctx, arg1, parseInt(arg2 ?? '1', 10))
        break
      case 'take':
        removeItem(ctx, arg1, parseInt(arg2 ?? '1', 10))
        break
      case 'gold': {
        ctx.gold = Math.max(0, ctx.gold + parseInt(arg1, 10))
        sfx('coin')
        break
      }
      case 'xp':
        gainXp(ctx, parseInt(arg1, 10))
        break
      case 'lp':
        ctx.lp = Math.max(0, ctx.lp + parseInt(arg1, 10))
        break
      case 'open':
        closeDialogue(ctx)
        if (arg1 === 'shop') openShop(ctx, arg2 === 'alra' ? 'alra' : 'grim')
        if (arg1 === 'trainer') openTrainer(ctx)
        break
      case 'bestiary':
        if (!ctx.bestiary.has(arg1)) {
          ctx.bestiary.add(arg1)
          ctx.toast('Бестиарий: ' + (BESTIARY_INFO[arg1]?.name ?? arg1), 'quest')
          sfx('quest')
        }
        break
      case 'join':
        if (arg1 === 'kaya' || arg1 === 'torvald') {
          const wasNew = !ctx.companionIds[arg1]
          ctx.spawnCompanion(arg1)
          if (wasNew) {
            ctx.toast(`${arg1 === 'kaya' ? 'Кайя' : 'Торвальд'} присоединяется к отряду!`, 'quest')
            sfx('quest')
          }
        }
        break
      case 'faction':
        ctx.faction = arg1 as Faction
        ctx.toast(arg1 === 'flame' ? 'Ты вступил в Орден Пламени!' : 'Ты вступил в Ковен Тумана!', 'quest')
        if (arg1 === 'mist') checkProof(ctx)
        sfx('quest')
        break
      case 'sign':
        if (arg1 === 'shout' && !ctx.signs.shout.unlocked) {
          ctx.signs.shout.unlocked = true
          ctx.toast('Голос Древних изучен! Клавиша 5.', 'level')
          sfx('level')
        }
        break
      case 'boss':
        if (arg1 === 'fight') {
          const boss = ctx.entities.find((e) => e.enemyType === 'boss' && e.alive)
          if (boss) boss.aiState = 'chase'
        } else if (arg1 === 'weaken') {
          const boss = ctx.entities.find((e) => e.enemyType === 'boss' && e.alive)
          if (boss) {
            boss.hp = Math.round(boss.hp * 0.8)
            boss.dmgMod = 2
            boss.summonStage = 1
            floater(ctx, boss.pos, 'Слова жгут его!', '#c9a3e8', 15)
          }
        }
        break
      case 'heal':
        if (arg1 === 'full') {
          ctx.hp = ctx.maxHp
          ctx.player.hp = ctx.hp
        }
        break
    }
  }
  ctx.syncUi()
}

// ---------------- Интеракты ----------------

export function runInteractable(ctx: EngineCtx, it: InteractableDef) {
  if (it.action.startsWith('dialogue:')) {
    openDialogue(ctx, it.action.slice(9))
  } else if (it.action.startsWith('portal:')) {
    // Врата Тумана (Фаза 3): затемнение + телепорт через Хребет
    const zone = it.action.slice(7) === 'veld' ? 'veld' : 'valley'
    ctx.travelTo(zone)
  } else if (it.action.startsWith('clue:')) {
    // Следопытство W3 (Фаза 3): цепочка следов ведёт к логову
    const questId = it.action.slice(5)
    ctx.removedProps.add(it.id)
    ctx.flags['clue_' + it.id] = true
    const clue = VELD_CLUES.find((c) => c.id === it.id)
    floater(ctx, it.pos, clue?.name ?? 'След', '#d9c04f', 14)
    if (clue) ctx.toast(clue.text, 'info')
    sfx('quest')
    const q = ctx.quests[questId]
    if (q && !q.done) {
      q.counter++
      if (q.stage === 1 && q.counter >= 3) {
        ctx.flags.ashMotherRevealed = true
        spawnAshMother(ctx)
        advanceQuest(ctx, questId, 2)
      } else {
        ctx.toast(`След: ${q.counter}/3`, 'quest')
        saveGame(ctx, false)
        ctx.syncUi()
      }
    }
  } else if (it.action.startsWith('gather:')) {
    const item = it.action.slice(7)
    addItem(ctx, item, 1)
    ctx.removedProps.add(it.id)
    ctx.flags['herb_' + it.id] = true
    sfx('coin')
    ctx.toast('Собрано: ' + ITEMS[item].name, 'loot')
    const q = ctx.quests.mist
    if (q.stage === 1 && !q.done) {
      q.counter++
      if (q.counter >= 3) ctx.toast('Лунные травы собраны — к Селене!', 'quest')
      else ctx.toast(`Лунная трава: ${q.counter}/3`, 'info')
    }
    ctx.syncUi()
  }
}

export function pickInteractable(ctx: EngineCtx, p: Vec, extra = 0): InteractableDef | null {
  let best: InteractableDef | null = null
  let bd = 1e9
  for (const it of INTERACTABLES) {
    if (ctx.removedProps.has(it.id)) continue
    if (!evalCond(ctx, it.cond ?? '')) continue
    const dist = Math.hypot(it.pos.x - p.x, it.pos.y - p.y)
    if (dist < it.r + extra && dist < bd) {
      bd = dist
      best = it
    }
  }
  return best
}

export function nearestInteraction(ctx: EngineCtx): { label: string; npc?: Entity; it?: InteractableDef } | null {
  let best: { label: string; npc?: Entity; it?: InteractableDef } | null = null
  let bd = 1e9
  for (const e of ctx.entities) {
    if (e.kind !== 'npc' || !e.alive) continue
    const dist = Math.hypot(e.pos.x - ctx.player.pos.x, e.pos.y - ctx.player.pos.y)
    if (dist < 58 && dist < bd) {
      bd = dist
      best = { label: `Поговорить: ${e.name}`, npc: e }
    }
  }
  for (const it of INTERACTABLES) {
    if (ctx.removedProps.has(it.id)) continue
    if (!evalCond(ctx, it.cond ?? '')) continue
    const dist = Math.hypot(it.pos.x - ctx.player.pos.x, it.pos.y - ctx.player.pos.y)
    if (dist < it.r + 14 && dist < bd) {
      bd = dist
      best = { label: `${it.prompt}: ${it.name}`, it }
    }
  }
  return best
}

export function doInteract(ctx: EngineCtx) {
  if (ctx.isFrozen() || ctx.tacticalPaused) return
  const n = nearestInteraction(ctx)
  if (!n) return
  if (n.npc) openDialogue(ctx, n.npc.npc!.dialogue)
  else if (n.it) runInteractable(ctx, n.it)
}

// ---------------- Квесты ----------------

export function advanceQuest(ctx: EngineCtx, id: string, stage: number) {
  const q = ctx.quests[id]
  if (!q || q.done) return
  q.stage = stage
  const def = QUEST_MAP[id]
  if (stage >= def.stages.length) {
    q.done = true
    approvalOnQuestDone(ctx) // Фаза 4: завершение квеста — доверие компаньонов +6
  }
  if (id === 'main' && stage === 5 && !ctx.flags.gateOpen) {
    ctx.flags.gateOpen = true
    ctx.removedProps.add('barrier')
    ctx.removedProps.add('barrier2')
    ctx.removedProps.add('barrier3')
    ctx.toast('Пелена перед Разломом опала!', 'quest')
  }
  ctx.toast(`${def.name}: ${stageText(ctx, id)}`, 'quest')
  sfx('quest')
  saveGame(ctx, false)
  ctx.syncUi()
}

export function stageText(ctx: EngineCtx, id: string) {
  const def = QUEST_MAP[id]
  const q = ctx.quests[id]
  if (q.done) return def.stages[def.stages.length - 1].text
  const st = def.stages[Math.max(0, Math.min(def.stages.length - 1, q.stage - 1))]
  return st ? st.text : ''
}

export function checkProof(ctx: EngineCtx) {
  const q = ctx.quests.main
  if (q.stage === 4 && !q.done) {
    if (ctx.flags.alphaDead || ctx.flags.captainDead || ctx.flags.mistJoined) {
      advanceQuest(ctx, 'main', 5)
    }
  }
}

export function questMarker(ctx: EngineCtx): Vec | null {
  const q = ctx.quests.main
  if (!q.done) {
    if (q.stage <= 1) return NPCS.find((n) => n.id === 'bjorn')!.pos
    if (q.stage === 2) return { x: 900, y: 720 }
    if (q.stage === 3) return { x: 2200, y: 660 }
    if (q.stage === 4) {
      if (!ctx.flags.alphaDead) return { x: 720, y: 450 }
      if (!ctx.flags.captainDead) return { x: 2590, y: 1690 }
      return { x: 1600, y: 2160 }
    }
    if (q.stage === 5) return { x: 2935, y: 470 }
  }
  const c = ctx.quests.contract
  if (c.stage > 0 && !c.done) {
    if (c.stage === 1) return { x: 720, y: 450 }
    return NPCS.find((n) => n.id === 'grim')!.pos
  }
  // Контракт Вельда (Фаза 3)
  const v = ctx.quests.veld
  if (v.stage > 0 && !v.done) {
    if (v.stage === 1) {
      const clue = VELD_CLUES.find((cl) => !ctx.flags['clue_' + cl.id])
      if (clue) return { ...clue.pos }
      return { ...ASH_MOTHER.pos }
    }
    if (v.stage === 2) return { ...ASH_MOTHER.pos }
    if (v.stage === 3) return NPCS.find((n) => n.id === 'alra')!.pos
  }
  return null
}

export function updateArea(ctx: EngineCtx) {
  // Фолбэк по зоне (Фаза 3): юг за Хребтом — Вельд
  let name = ctx.zone === 'veld' ? 'Вельд' : 'Долина'
  for (const a of AREAS) {
    if (a.id === 'wilds') continue
    const [x, y, w, h] = a.rect
    if (ctx.player.pos.x > x && ctx.player.pos.x < x + w && ctx.player.pos.y > y && ctx.player.pos.y < y + h) {
      name = a.name
      break
    }
  }
  if (name !== ctx.currentArea) {
    ctx.currentArea = name
    useGame.getState().patch({ areaToast: { id: Date.now(), name } })
  }
}

export function updateEnding(ctx: EngineCtx) {
  if (ctx.endingAt !== null && ctx.time >= ctx.endingAt) {
    ctx.endingAt = null
    openEnding(ctx)
  }
}

export function openEnding(ctx: EngineCtx) {
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
    ...factionLine[ctx.faction],
  ]
  if (ctx.companionIds.kaya && ctx.companionIds.torvald) {
    epilogue.push(
      'Кайя ушла дальше на север — искать истоки Разлома. Торвальд остался: сказал, что в деревне наконец появилось приличное пиво.',
    )
  }
  epilogue.push('А Смотритель? Смотритель всегда найдёт работу. Монстров много, контрактов больше.')
  const mins = Math.floor(ctx.playtime / 60)
  const stats: Array<[string, string]> = [
    ['Уровень', String(ctx.level)],
    ['Убито врагов', String(ctx.kills)],
    ['Золото', String(ctx.gold)],
    ['Время в игре', `${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, '0')}`],
    ['Фракция', ctx.faction === 'flame' ? 'Орден Пламени' : ctx.faction === 'mist' ? 'Ковен Тумана' : 'Вольный смотритель'],
    ['Спутники', `${(ctx.companionIds.kaya ? 1 : 0) + (ctx.companionIds.torvald ? 1 : 0)} из 2`],
  ]
  useGame.getState().patch({ ending: { epilogue, stats }, panel: 'ending' })
}
