// ============================================================
// ЭХО РАЗЛОМА — синхронизация UI (Phase 0.9)
// syncUi: движок → zustand-стор (зеркало HUD). Вызывается
// циклом каждые 0.12 с и точечно после значимых событий.
// Правило: стор — только зеркало, обратной логики нет.
// ============================================================

import { ABILITY_MAP } from '../data/abilities'
import { QUESTS } from '../data/quests'
import { ABILITY_BAR_IDS } from '../data/tables'
import { AbilityHud, PartyHud, QuestHud, useGame } from '../store'
import { SignId } from '../types'
import type { EngineCtx } from '../core/ctx'
import { countItem } from './inventory'
import { xpNext } from './progression'
import { nearestInteraction, stageText } from './quest'

export function syncUi(ctx: EngineCtx): void {
  const st = useGame.getState()
  const party: PartyHud[] = [
    {
      eid: ctx.player.eid,
      id: 'player',
      name: 'Смотритель',
      role: ctx.faction === 'flame' ? 'Орден Пламени' : ctx.faction === 'mist' ? 'Ковен Тумана' : 'Смотритель',
      hp: Math.max(0, Math.round(ctx.hp)),
      maxHp: ctx.maxHp,
      alive: ctx.player.alive,
      stance: 'follow',
      abilities: [],
    },
  ]
  for (const e of ctx.entities) {
    if (e.kind !== 'companion') continue
    party.push({
      eid: e.eid,
      id: e.id,
      name: e.name,
      role: e.role ?? '',
      hp: Math.max(0, Math.round(e.hp)),
      maxHp: e.maxHp,
      alive: e.alive,
      stance: e.stance ?? 'follow',
      abilities:
        e.id === 'torvald'
          ? [
              { id: 'shieldbash', name: 'Удар щитом', icon: 'ShieldHalf', cd: e.cds['shieldbash'] ?? 0, cdMax: 8 },
              { id: 'warcry', name: 'Боевой клич', icon: 'Swords', cd: e.cds['warcry'] ?? 0, cdMax: 18 },
            ]
          : [
              { id: 'frostbolt', name: 'Лёд', icon: 'Snowflake', cd: e.cds['frostbolt'] ?? 0, cdMax: 4 },
              { id: 'mend', name: 'Лечение', icon: 'HeartPulse', cd: e.cds['mend'] ?? 0, cdMax: 10 },
            ],
    })
  }
  const abilities: AbilityHud[] = ABILITY_BAR_IDS.map((id) => {
    const ab = ABILITY_MAP[id]
    let unlocked = true
    if (ab.kind === 'sign') unlocked = ctx.signs[id as SignId]?.unlocked ?? false
    if (id === 'shout') unlocked = ctx.signs.shout.unlocked
    if (ab.kind === 'potion') unlocked = countItem(ctx, id) > 0
    const cdKey = ab.kind === 'potion' ? 'potion' : id
    return {
      id,
      name: ab.name,
      desc: ab.desc,
      icon: ab.icon,
      hotkey: ab.hotkey,
      cd: ctx.player.cds[cdKey] ?? 0,
      cdMax: ab.cooldown,
      unlocked,
      staminaCost: ab.staminaCost,
    }
  })
  const quests: QuestHud[] = QUESTS.map((qd) => ({
    id: qd.id,
    name: qd.name,
    stage: ctx.quests[qd.id].stage,
    done: ctx.quests[qd.id].done,
    counter: ctx.quests[qd.id].counter,
    summary: qd.summary,
    stageText:
      ctx.quests[qd.id].stage > 0 || ctx.quests[qd.id].done ? stageText(ctx, qd.id) : qd.stages[0].text,
    side: qd.side ?? false,
  }))
  const mainQ = quests.find((q) => q.id === 'main')!
  const contractQ = quests.find((q) => q.id === 'contract')!
  const boss = ctx.entities.find((e) => e.enemyType === 'boss' && e.alive && e.aiState !== 'idle')
  const n = ctx.isFrozen() ? null : nearestInteraction(ctx)
  st.patch({
    party,
    abilities,
    player: {
      level: ctx.level,
      xp: ctx.xp,
      xpNext: xpNext(ctx),
      hp: Math.max(0, Math.round(ctx.hp)),
      maxHp: ctx.maxHp,
      stamina: Math.round(ctx.stamina),
      maxStamina: ctx.maxStamina,
      lp: ctx.lp,
      gold: ctx.gold,
      faction: ctx.faction,
      weapon: ctx.weapon,
      armor: ctx.armor,
      attributes: { ...ctx.attributes },
      skills: { ...ctx.skills },
      signs: JSON.parse(JSON.stringify(ctx.signs)) as Record<SignId, { unlocked: boolean; level: number }>,
      shield: ctx.player.shield,
    },
    inventory: ctx.inventory.map((i) => ({ ...i })),
    quests,
    trackerQuest: mainQ.done ? null : mainQ,
    contractQuest: contractQ.stage > 0 && !contractQ.done ? contractQ : null,
    bossBar: boss ? { name: 'Пожиратель Бурь', hp: Math.round(boss.hp), maxHp: boss.maxHp } : null,
    interactHint: n ? `${n.label} — [F]` : null,
    bestiary: [...ctx.bestiary],
  })
}
