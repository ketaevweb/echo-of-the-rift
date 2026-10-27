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
import { AREAS, INTERACTABLES, NPCS, ASH_MOTHER, VELD_CLUES, FROST_CLUES, ROOST, RUNE_CAVE, WORD_WALL_FORCE } from '../data/world'
import { ITEMS } from '../data/items'
import { BESTIARY_INFO } from '../data/tables'
import { CareerId, Entity, Faction, InteractableDef, OriginId, Vec } from '../types'
import { useGame } from '../store'
import { sfx } from '../sfx'
import { t } from '../i18n'
import { d } from '../core/util'
import { EngineCtx } from '../core/ctx'
import { addItem, countItem, removeItem } from './inventory'
import { gainXp, openShop, openTrainer } from './progression'
import { saveGame } from './save'
import { floater, ring } from './combat'
import { resolveEnding, companionFates } from './finale'
import { ENDINGS, KEYS_ALL } from '../data/finale'
import { spawnAshMother } from './ai'
import { approvalOnQuestDone } from './party'
import { CAREER_NAME, addRep, heroRank, joinCareer, rankUp, spawnPitMaster, startPitFight } from './career'
import { cycleRune, learnWord } from './frost'
import { startSiege } from './mara'
import { applyLandscapeShift, spawnHordeChief } from './disputed'
import { activateRelay, readCrewPod, surveyRing } from './rubezh'
import { speakLine, stopVoice } from '../voice'

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
    origin: ctx.origin,
    companion: (id: string) => ctx.companionIds[id as 'kaya' | 'torvald'],
    has: (item: string, qty = 1) => countItem(ctx, item) >= qty,
    lp: ctx.lp,
    gold: ctx.gold,
    // Фаза 7: условия суда — Тишь и счёт ключей-осколков
    silence: ctx.silence,
    keys: ['key_valley', 'key_veld', 'key_granite', 'key_frost', 'key_mara', 'key_disputed'].filter(
      (k) => ctx.flags[k],
    ).length,
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
  m = s.match(/^origin:(\w+)$/)
  if (m) return ctx.origin === (m[1] as OriginId)
  // Фаза 6: карьера Гранита
  m = s.match(/^career==([\w-]+)$/)
  if (m) return ctx.career.faction === (m[1] as CareerId)
  m = s.match(/^!career$/)
  if (m) return ctx.career.faction === null
  m = s.match(/^career$/)
  if (m) return ctx.career.faction !== null
  m = s.match(/^rank>=(\d+)$/)
  if (m) return ctx.career.faction !== null && ctx.career.rank[ctx.career.faction] >= parseInt(m[1], 10)
  m = s.match(/^rep:([\w-]+)>=(\d+)$/)
  if (m) return ctx.career.rep[m[1] as CareerId] >= parseInt(m[2], 10)
  // v1.5: одобрение компаньона (ветка романса — GDD 02: «+60»)
  m = s.match(/^appr\.(kaya|torvald)>=(\d+)$/)
  if (m) return ctx.approval[m[1] as 'kaya' | 'torvald'] >= parseInt(m[2], 10)
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
  // Фаза 5: кинокамера — ищем сущность по имени спикера рядом с героем
  ctx.dialogueFocusEid = findSpeakerEntity(ctx, node.speaker)
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
        origin: !!c.origin,
      })),
      timer: node.timer,
      onTimeout: node.onTimeout,
    },
    diceRoll: null, // новый узел — старый бросок не должен висеть
  })
  // v1.1: озвучка ключевых реплик (2 голоса, GDD 04 §4.3) — только у VOICE_OF-спикеров
  speakLine(node.speaker, node.text)
}

/** Сущность спикера для кинокамеры: NPC/уникальный враг с тем же именем в 450 ед. от героя. */
function findSpeakerEntity(ctx: EngineCtx, speaker: string): number | null {
  let best: Entity | null = null
  let bd = 450
  for (const e of ctx.entities) {
    if (e.kind !== 'npc' && e.kind !== 'enemy') continue
    if (e.name !== speaker) continue
    const d = Math.hypot(e.pos.x - ctx.player.pos.x, e.pos.y - ctx.player.pos.y)
    if (d < bd) {
      bd = d
      best = e
    }
  }
  return best ? best.eid : null
}

export function chooseOption(ctx: EngineCtx, i: number) {
  const c = ctx.dlgChoices[i]
  if (!c) return
  // Фаза 5: пока кубик летит — повторный выбор игнорируем
  if (useGame.getState().diceRoll) return
  sfx('click')
  if (c.check) {
    const bonus = 1 + Math.floor(ctx.attributes.charisma / 2) + ctx.skills.speech
    const roll = d(20)
    const total = roll + bonus
    const success = roll !== 1 && (roll === 20 || total >= c.check.dc)
    ctx.toast(
      t('{label}: d20 {roll} + {bonus} = {total} — {verdict}', {
        label: t(c.check.label),
        roll,
        bonus,
        total,
        verdict: success ? t('успех!') : t('провал'),
      }),
      success ? 'quest' : 'warn',
    )
    // Фаза 5: видимый бросок (BG3) — оверлей, потом продолжение ветки
    useGame.getState().patch({ diceRoll: { label: c.check.label, roll, bonus, total, dc: c.check.dc, success } })
    sfx('dice') // Фаза 8: стук кубика
    sfx(success ? 'quest' : 'warn')
    window.setTimeout(() => {
      if (ctx.destroyed) return
      useGame.getState().patch({ diceRoll: null })
      if (success && c.action) runAction(ctx, c.action)
      const next = success ? c.goto : (c.gotoFail ?? null)
      if (next === null || next === undefined) {
        closeDialogue(ctx)
        return
      }
      setNode(ctx, next)
    }, 1700)
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
  ctx.dialogueFocusEid = null // кинокамера возвращается к герою
  useGame.getState().patch({ dialogue: null, diceRoll: null })
  stopVoice() // v1.1: реплика обрывается вместе с диалогом
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
      case 'silence':
        // Фаза 5: Тишь — дешёвые решения +=N, человечные -=N; мир выцветает
        ctx.silence = Math.max(0, Math.min(100, ctx.silence + parseInt(arg1, 10)))
        break
      case 'lp':
        ctx.lp = Math.max(0, ctx.lp + parseInt(arg1, 10))
        break
      case 'open':
        closeDialogue(ctx)
        if (arg1 === 'shop') openShop(ctx, arg2 === 'alra' ? 'alra' : arg2 === 'brock' ? 'brock' : 'grim')
        if (arg1 === 'trainer') openTrainer(ctx)
        break
      case 'bestiary':
        if (!ctx.bestiary.has(arg1)) {
          ctx.bestiary.add(arg1)
          ctx.toast(t('Бестиарий: {name}', { name: t(BESTIARY_INFO[arg1]?.name ?? arg1) }), 'quest')
          sfx('quest')
        }
        break
      case 'join':
        if (arg1 === 'kaya' || arg1 === 'torvald') {
          const wasNew = !ctx.companionIds[arg1]
          ctx.spawnCompanion(arg1)
          if (wasNew) {
            ctx.toast(t('{name} присоединяется к отряду!', { name: t(arg1 === 'kaya' ? 'Кайя' : 'Торвальд') }), 'quest')
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
      // Фаза 6: карьера Гранита — вербовка/ранг/слава, ямные бои
      case 'career':
        if (arg1 === 'join') joinCareer(ctx, arg2 as CareerId)
        if (arg1 === 'rank') rankUp(ctx, arg2 as CareerId)
        break
      case 'rep':
        addRep(ctx, arg1 as CareerId, parseInt(arg2, 10))
        break
      case 'pit':
        if (arg1 === 'start') {
          closeDialogue(ctx)
          startPitFight(ctx, parseInt(arg2, 10))
        }
        break
      case 'key':
        // Ключ-осколок домена (Фаза 6): флаг + предмет-трофей
        ctx.flags[arg1] = true
        addItem(ctx, arg1 === 'key_granite' ? 'core_key' : arg1, 1)
        break
      case 'ending':
        // Фаза 7: выбор в суде Пожирателя — резолвер 5 концовок (GDD 01 §6)
        closeDialogue(ctx)
        resolveEnding(ctx, arg1 as 'seal' | 'merge' | 'silence' | 'rift')
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
        } else if (arg1 === 'fight_pit') {
          // Фаза 6: вызвать Мастера Ямы
          const pm = ctx.entities.find((e) => e.enemyType === 'pit_master' && e.alive)
          if (pm) {
            pm.aggroR = 420
            pm.aiState = 'chase'
            floater(ctx, pm.pos, 'ЯМА ПРИНЯЛА ВЫЗОВ!', '#c9a44a', 16)
            sfx('boss')
          }
        } else if (arg1 === 'weaken_pit') {
          const pm = ctx.entities.find((e) => e.enemyType === 'pit_master' && e.alive)
          if (pm) {
            pm.hp = Math.round(pm.hp * 0.85)
            pm.dmgMod = Math.max(1, pm.dmgMod - 2)
            floater(ctx, pm.pos, 'Толпа усмехается Мастеру...', '#c9a44a', 15)
          }
        } else if (arg1 === 'weaken') {
          const boss = ctx.entities.find((e) => e.enemyType === 'boss' && e.alive)
          if (boss) {
            boss.hp = Math.round(boss.hp * 0.8)
            boss.dmgMod = 2
            boss.summonStage = 1
            floater(ctx, boss.pos, 'Слова жгут его!', '#c9a3e8', 15)
          }
        } else if (arg1 === 'fight_horde') {
          // Фаза 6.4: путь силы — Гхарз выходит на бой за Семя
          closeDialogue(ctx)
          spawnHordeChief(ctx)
          ctx.toast('Гхарз хрипит: «ПИР БУДЕТ ТВОЙ!» — босс вышел.', 'warn')
        }
        break
      case 'heal':
        if (arg1 === 'full') {
          ctx.hp = ctx.maxHp
          ctx.player.hp = ctx.hp
        }
        break
      // Фаза 6.3: оборона Бастиона — бить рог
      case 'siege':
        if (arg1 === 'start') {
          closeDialogue(ctx)
          startSiege(ctx)
        }
        break
      // Фаза 6.4: выбор, меняющий ландшафт (BG3)
      case 'shift':
        if (arg1 === 'grove_saved') applyLandscapeShift(ctx, 'grove_saved')
        if (arg1 === 'grove_burned') applyLandscapeShift(ctx, 'grove_burned')
        if (arg1 === 'horde_broken') applyLandscapeShift(ctx, 'horde_broken')
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
    // Врата Тумана / Врата Гранита / Врата Пределья / Врата Мары / Врата Спорных Земель / Врата Рубежа
    const zone = it.action.slice(7)
    if (zone === 'veld' || zone === 'valley' || zone === 'granite' || zone === 'frost' || zone === 'mara' || zone === 'disputed' || zone === 'rubezh') {
      ctx.travelTo(zone as 'veld' | 'valley' | 'granite' | 'frost' | 'mara' | 'disputed' | 'rubezh')
    }
  } else if (it.action.startsWith('relay:')) {
    // Внешний Рубеж (Фаза 6.5): синхронизация ретрансляторов Хребта — головоломка порядка
    activateRelay(ctx, it.action.slice(6), it.id)
  } else if (it.action.startsWith('crew:')) {
    // Внешний Рубеж: чтение таблички стазис-капсулы — имена экипажа (VR-04)
    readCrewPod(ctx, it.id)
  } else if (it.action.startsWith('ringmap:')) {
    // Внешний Рубеж: осмотр посадочных колец — карта Рубежа оф-тропой (VR-03)
    surveyRing(ctx, it.id)
  } else if (it.action.startsWith('purge:')) {
    // Мор-сгустки Мары (Фаза 6.3): выжечь скверну в жилах — квест Хольта
    const questId = it.action.slice(6)
    ctx.removedProps.add(it.id)
    ctx.flags['well_' + it.id] = true
    ring(ctx, it.pos, '#f5c96b', 70, 0.9)
    floater(ctx, it.pos, 'СКВЕРНА ВЫЖЕЧЕНА', '#f5c96b', 15)
    sfx('fire')
    const q = ctx.quests[questId]
    if (q && !q.done) {
      q.counter++
      if (q.stage === 1 && q.counter >= 3) {
        advanceQuest(ctx, questId, 2)
      } else {
        ctx.toast(t('Мор-сгусток: {c}/3', { c: q.counter }), 'quest')
        saveGame(ctx, false)
        ctx.syncUi()
      }
    }
  } else if (it.action.startsWith('dig:')) {
    // Узлы беженцев Спорных Земель (Фаза 6.4): откопать пожитки Пруши
    const questId = it.action.slice(4)
    ctx.removedProps.add(it.id)
    ctx.flags['dig_' + it.id] = true
    ring(ctx, it.pos, '#d9a441', 60, 0.8)
    floater(ctx, it.pos, 'УЗЕЛ ОТКОПАН', '#d9a441', 14)
    sfx('quest')
    const q = ctx.quests[questId]
    if (q && !q.done) {
      q.counter++
      if (q.stage === 1 && q.counter >= 3) {
        advanceQuest(ctx, questId, 2)
      } else {
        ctx.toast(t('Узел беженцев: {c}/3', { c: q.counter }), 'quest')
        saveGame(ctx, false)
        ctx.syncUi()
      }
    }
  } else if (it.action.startsWith('rune:')) {
    // Пещера Рун (Фаза 6.2): поворот рунного камня-кольца
    cycleRune(ctx, it.action.slice(5))
  } else if (it.action.startsWith('word:')) {
    // Стена Слова (Фаза 6.2): взять слово силы Ту'ум
    learnWord(ctx, it.action.slice(5) === 'frost' ? 'frost' : 'force')
  } else if (it.action.startsWith('fclue:')) {
    // Следы пожара Стылого Пределья (Фаза 6.2): цепочка к Драконьему Долу
    const questId = it.action.slice(6)
    ctx.removedProps.add(it.id)
    ctx.flags['clue_' + it.id] = true
    const clue = FROST_CLUES.find((c) => c.id === it.id)
    floater(ctx, it.pos, t(clue?.name ?? 'След'), '#bfe3ea', 14)
    if (clue) ctx.toast(t(clue.text), 'info')
    sfx('quest')
    const q = ctx.quests[questId]
    if (q && !q.done) {
      q.counter++
      if (q.stage === 1 && q.counter >= 3) {
        advanceQuest(ctx, questId, 2)
      } else {
        ctx.toast(t('След пожара: {c}/3', { c: q.counter }), 'quest')
        saveGame(ctx, false)
        ctx.syncUi()
      }
    }
  } else if (it.action.startsWith('ore:')) {
    // Гранитные жилы (Фаза 6): добыча руды для кузнеца
    const item = it.action.slice(4)
    addItem(ctx, item, 1)
    ctx.removedProps.add(it.id)
    ctx.flags['ore_' + it.id] = true
    sfx('coin')
    ctx.toast(t('Добыто: {name}', { name: t(ITEMS[item].name) }), 'loot')
    const q = ctx.quests.granite_ore
    if (q.stage === 1 && !q.done) {
      q.counter++
      if (q.counter >= 4) ctx.toast('Руды достаточно — к Броку в Колонию!', 'quest')
      else ctx.toast(t('Гранитная руда: {c}/4', { c: q.counter }), 'info')
    }
    ctx.syncUi()
  } else if (it.action.startsWith('clue:')) {
    // Следопытство W3 (Фаза 3): цепочка следов ведёт к логову
    const questId = it.action.slice(5)
    ctx.removedProps.add(it.id)
    ctx.flags['clue_' + it.id] = true
    const clue = VELD_CLUES.find((c) => c.id === it.id)
    floater(ctx, it.pos, t(clue?.name ?? 'След'), '#d9c04f', 14)
    if (clue) ctx.toast(t(clue.text), 'info')
    sfx('quest')
    const q = ctx.quests[questId]
    if (q && !q.done) {
      q.counter++
      if (q.stage === 1 && q.counter >= 3) {
        ctx.flags.ashMotherRevealed = true
        spawnAshMother(ctx)
        advanceQuest(ctx, questId, 2)
      } else {
        ctx.toast(t('След: {c}/3', { c: q.counter }), 'quest')
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
    ctx.toast(t('Собрано: {name}', { name: t(ITEMS[item].name) }), 'loot')
    const q = ctx.quests.mist
    if (q.stage === 1 && !q.done) {
      q.counter++
      if (q.counter >= 3) ctx.toast('Лунные травы собраны — к Селене!', 'quest')
      else ctx.toast(t('Лунная трава: {c}/3', { c: q.counter }), 'info')
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
  // Фаза 6: главный квест Гранита — стадия 3 открывает выход Мастера Ямы
  if (id === 'granite' && stage === 3 && !ctx.flags.pitMasterRevealed) {
    ctx.flags.pitMasterRevealed = true
    spawnPitMaster(ctx)
    ctx.toast('Заслон Ямы гремит: Мастер ждёт тебя на арене.', 'warn')
  }
  ctx.toast(t('{name}: {stage}', { name: t(def.name), stage: stageText(ctx, id) }), 'quest')
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
      grantKey(ctx, 'key_valley', 'Оплот') // Фаза 7: домен старта даёт ключ в конце Акта I
    }
  }
}

/** Фаза 7: ключ-осколок домена — флаг + предмет-трофей + счётчик в тосте. */
export function grantKey(ctx: EngineCtx, keyId: string, domain: string) {
  if (ctx.flags[keyId]) return
  ctx.flags[keyId] = true
  addItem(ctx, keyId, 1)
  // Фаза 6.5: 7 осколков (6 канонных K1–K6 + ключ Оплота); порог концовок — 6 (GDD 01 §6)
  const keys = ['key_valley', 'key_veld', 'key_granite', 'key_frost', 'key_mara', 'key_disputed', 'key_rubezh'].filter(
    (k) => ctx.flags[k],
  ).length
  ctx.toast(t('Ключ-осколок: {domain} — собрано {n} из 7', { domain: t(domain), n: keys }), 'quest')
  sfx('level')
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
  // Гранитная Долина (Фаза 6)
  const g = ctx.quests.granite
  if (g.stage > 0 && !g.done) {
    if (g.stage === 1) return NPCS.find((n) => n.id === 'kharan')!.pos
    if (g.stage === 2) return NPCS.find((n) => n.id === 'kassia')!.pos
    if (g.stage === 3) return { x: 4380, y: 2050 }
    if (g.stage === 4) return NPCS.find((n) => n.id === 'kharan')!.pos
  }
  const go = ctx.quests.granite_ore
  if (go.stage > 0 && !go.done) {
    if (go.stage === 1) {
      const vein = [
        { id: 'ore1', pos: { x: 4020, y: 1050 } },
        { id: 'ore2', pos: { x: 4560, y: 1020 } },
        { id: 'ore3', pos: { x: 4790, y: 1450 } },
        { id: 'ore4', pos: { x: 3950, y: 2350 } },
        { id: 'ore5', pos: { x: 4560, y: 2680 } },
      ].find((vv) => !ctx.flags['ore_' + vv.id])
      if (vein) return { ...vein.pos }
    }
    return NPCS.find((n) => n.id === 'brock')!.pos
  }
  const gs = ctx.quests.granite_scorpions
  if (gs.stage > 0 && !gs.done) {
    if (gs.stage === 1) return { x: 4020, y: 2600 }
    return NPCS.find((n) => n.id === 'finn')!.pos
  }
  // Стылое Пределье (Фаза 6.2)
  const fw = ctx.quests.frost_words
  if (fw.stage > 0 && !fw.done) {
    if (fw.stage < 3) return { ...RUNE_CAVE.pos }
    return { ...WORD_WALL_FORCE.pos }
  }
  const fd = ctx.quests.frost_dragon
  if (fd.stage > 0 && !fd.done) {
    if (fd.stage === 1) {
      const clue = FROST_CLUES.find((cl) => !ctx.flags['clue_' + cl.id])
      if (clue) return { ...clue.pos }
      return { ...ROOST.pos }
    }
    if (fd.stage === 2 || fd.stage === 3) return { ...ROOST.pos }
    return NPCS.find((n) => n.id === 'ingrid')!.pos
  }
  // Спорные Земли (Фаза 6.4)
  const dq = ctx.quests.disputed
  if (dq.stage > 0 && !dq.done) {
    const ulva = NPCS.find((n) => n.id === 'ulva')?.pos ?? { x: 7330, y: 1090 }
    const gharz = NPCS.find((n) => n.id === 'gharz')?.pos ?? { x: 7230, y: 2860 }
    if (dq.stage === 1) return { ...ulva }
    if (dq.stage === 2) return { ...gharz }
    if (dq.stage === 3) return { x: 7330, y: 1150 }
    if (dq.stage === 4) return { x: 7250, y: 2920 }
    return { ...ulva }
  }
  const dh = ctx.quests.disputed_hoard
  if (dh.stage > 0 && !dh.done) {
    if (dh.stage === 1) {
      const dig = [
        { id: 'dig1', pos: { x: 7020, y: 1080 } },
        { id: 'dig2', pos: { x: 7520, y: 1560 } },
        { id: 'dig3', pos: { x: 6980, y: 2350 } },
      ].find((dd) => !ctx.flags['dig_' + dd.id])
      if (dig) return { ...dig.pos }
    }
    return NPCS.find((n) => n.id === 'prusha')!.pos
  }
  const ds = ctx.quests.disputed_scout
  if (ds.stage > 0 && !ds.done) {
    if (ds.stage === 1) return { x: 7050, y: 1900 }
    return NPCS.find((n) => n.id === 'tarben')!.pos
  }
  return null
}

export function updateArea(ctx: EngineCtx) {
  // Фолбэк по зоне (Фаза 3/6/6.2/6.4): юг за Хребтом — Вельд, восток за Каменным Хребтом — Гранит,
  // восток за Стылым Хребтом — Стылое Пределье, восток за Рубежным Кряжем — Спорные Земли
  let name =
    ctx.zone === 'veld'
      ? t('Вельд')
      : ctx.zone === 'granite'
        ? t('Гранитная Долина')
        : ctx.zone === 'frost'
          ? t('Стылое Пределье')
          : ctx.zone === 'mara'
            ? t('Багровая Мара')
            : ctx.zone === 'disputed'
              ? t('Спорные Земли')
              : t('Долина')
  for (const a of AREAS) {
    if (a.id === 'wilds') continue
    const [x, y, w, h] = a.rect
    if (ctx.player.pos.x > x && ctx.player.pos.x < x + w && ctx.player.pos.y > y && ctx.player.pos.y < y + h) {
      name = t(a.name)
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
  // Фаза 7: 5 концовок по GDD 01 §6 (id выбран резолвером суда)
  const endingId = ctx.pendingEndingId ?? 'seal'
  const def = ENDINGS[endingId] ?? ENDINGS.seal
  const factionLine: Record<Faction, string[]> = {
    none: [
      t('Ты ушёл из долины до рассвета, никому ничего не сказав. Долг Смотрителя исполнен — а судьба Хеймхолла теперь в руках его людей.'),
    ],
    flame: [
      t('Орден Пламени воздвиг у Разлома сторожевую башню. Капитан Ирма лично подняла твоё имя на её ворота.'),
      t('Сталь и строй — теперь этого достаточно. Пока достаточно.'),
    ],
    mist: [
      t('Ковен Тумана переписал печать, и Разлом затянулся туманом. Архимаг Селена назвала тебя «голосом между мирами».'),
      t('Туман помнит. Туман ждёт.'),
    ],
  }
  const epilogue: string[] = [
    ...def.intro,
    ...factionLine[ctx.faction],
  ]
  // Фаза 5: высокая Тишь портит даже лучший финал (кроме концовки «Тишь» — там это и есть финал)
  if (endingId !== 'silence' && ctx.silence >= 60) {
    epilogue.push(
      t('Но краски долины так и не вернулись: где-то в швах мира осталась Тишь — цена тех выборов, что были дешевле слов.'),
    )
  } else if (ctx.silence <= 15) {
    epilogue.push(
      t('Небо над долиной того же цвета, что и до Разлома: человечность — редкая валюта, ты потратил её бережно.'),
    )
  }
  epilogue.push(t('А Смотритель? Смотритель всегда найдёт работу. Монстров много, контрактов больше.'))
  // Фаза 6.4: судьба Спорных Землей — след выбора в ландшафте (кроме Тиши — там уже пусто)
  if (endingId !== 'silence') {
    if (ctx.flags.groveBurned) {
      epilogue.push(t('Спорные Земли говорят только углём: вереск выгорел, Роща — пепел, а Орда пела, пока горели чужие шатры.'))
    } else if (ctx.flags.groveSaved) {
      epilogue.push(t('Спорные Земли вереском зацвели: Семя благословлено, фонари Рощи горят до сих пор, и беженцы называют тебя тем, кто не продался.'))
    } else if (ctx.flags.hordeBroken) {
      epilogue.push(t('Пепельная Орда рассеялась после набега на Рощу, но Семя в сердце рощи так и не нашло покоя.'))
    }
  }
  // Фаза 6: карьера Гранита вписана в судьбу героя
  if (ctx.career.faction) {
    epilogue.push(
      t('{name} помнит, на чьей стороне ты стоял в войне за барьер — и это значит больше, чем любое золото.', {
        name: t(CAREER_NAME[ctx.career.faction]),
      }),
    )
  }
  const mins = Math.floor(ctx.playtime / 60)
  const keys = KEYS_ALL.filter((k) => ctx.flags[k]).length
  const stats: Array<[string, string]> = [
    [t('Уровень'), String(ctx.level)],
    [t('Убито врагов'), String(ctx.kills)],
    [t('Золото'), String(ctx.gold)],
    [t('Время в игре'), `${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, '0')}`],
    [t('Фракция'), t(ctx.faction === 'flame' ? 'Орден Пламени' : ctx.faction === 'mist' ? 'Ковен Тумана' : 'Вольный смотритель')],
    [t('Спутники'), t('{n} из 2', { n: (ctx.companionIds.kaya ? 1 : 0) + (ctx.companionIds.torvald ? 1 : 0) })],
    [t('Тишь'), `${ctx.silence}/100`],
    [
      t('Карьера Колонии'),
      ctx.career.faction ? t('{name}, ранг {n}', { name: t(CAREER_NAME[ctx.career.faction]), n: heroRank(ctx) }) : t('нет'),
    ],
    [t('Ключи-осколки'), `${keys}/6`],
  ]
  // Фаза 7: судьбы компаньонов по матрице GDD 07 §7 (погиб / жив-герой / жив-сломлен)
  const fates = companionFates(ctx)
  useGame.getState().patch({ ending: { id: def.id, name: def.name, color: def.color, epilogue, fates, stats }, panel: 'ending' })
}
