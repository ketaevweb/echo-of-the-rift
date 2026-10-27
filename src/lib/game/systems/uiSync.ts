// ============================================================
// ЭХО РАЗЛОМА — синхронизация UI (Phase 0.9)
// syncUi: движок → zustand-стор (зеркало HUD). Вызывается
// циклом каждые 0.12 с и точечно после значимых событий.
// Правило: стор — только зеркало, обратной логики нет.
// ============================================================

import { ABILITY_MAP } from '../data/abilities'
import { QUESTS } from '../data/quests'
import { ITEMS } from '../data/items'
import { ABILITY_BAR_IDS, ENEMY_NAME } from '../data/tables'
import { AbilityHud, CareerHud, PartyHud, QuestHud, ShoutHud, useGame } from '../store'
import { SignId } from '../types'
import type { EngineCtx } from '../core/ctx'
import { countItem } from './inventory'
import { xpNext } from './progression'
import { nearestInteraction, stageText } from './quest'
import { CAREER_NAME, CAREER_PERKS, heroRank, RANK_NAME } from './career'
import { siegeHud } from './mara'
import { assaultHud } from './disputed'
import { raidHud } from './finale'
import { Entity } from '../types'
import { hotkeyLabelForAbility, labelFor } from '../bindings'
import { bossSpawnBark } from '../combatVoice'
import { CompanionId } from '../data/combatVoice'
import { t } from '../i18n'

/** Активный босс (жив, в бою) — для bossBar и темы босса (v1.1). */
export function findActiveBoss(ctx: EngineCtx): Entity | null {
  return (
    ctx.entities.find(
      (e) =>
        (e.enemyType === 'boss' ||
          e.enemyType === 'ash_mother' ||
          e.enemyType === 'pit_master' ||
          e.enemyType === 'dragon' ||
          e.enemyType === 'blight_mother' ||
          e.enemyType === 'horde_chief' ||
          e.enemyType === 'rb_captain') && // v1.4: капитан — полноценный босс (бар/тема/угроза)
        e.alive &&
        e.aiState !== 'idle',
    ) ?? null
  )
}

export function syncUi(ctx: EngineCtx): void {
  const st = useGame.getState()
  const party: PartyHud[] = [
    {
      eid: ctx.player.eid,
      id: 'player',
      name: t('Смотритель'),
      role: t(ctx.faction === 'flame' ? 'Орден Пламени' : ctx.faction === 'mist' ? 'Ковен Тумана' : 'Смотритель'),
      hp: Math.max(0, Math.round(ctx.hp)),
      maxHp: ctx.maxHp,
      alive: ctx.player.alive,
      stance: 'follow',
      approval: 100,
      abilities: [],
    },
  ]
  for (const e of ctx.entities) {
    if (e.kind !== 'companion') continue
    party.push({
      eid: e.eid,
      id: e.id,
      name: t(e.name),
      role: t(e.role ?? ''),
      hp: Math.max(0, Math.round(e.hp)),
      maxHp: e.maxHp,
      alive: e.alive,
      stance: e.stance ?? 'follow',
      approval: ctx.approval[e.id as 'kaya' | 'torvald'] ?? 0,
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
      name: t(ab.name),
      desc: t(ab.desc),
      icon: ab.icon,
      hotkey: hotkeyLabelForAbility(ab.id) ?? ab.hotkey,
      cd: ctx.player.cds[cdKey] ?? 0,
      cdMax: ab.cooldown,
      unlocked,
      staminaCost: ab.staminaCost,
    }
  })
  const quests: QuestHud[] = QUESTS.map((qd) => ({
    id: qd.id,
    name: t(qd.name),
    stage: ctx.quests[qd.id].stage,
    done: ctx.quests[qd.id].done,
    counter: ctx.quests[qd.id].counter,
    summary: t(qd.summary),
    stageText:
      ctx.quests[qd.id].stage > 0 || ctx.quests[qd.id].done
        ? t(stageText(ctx, qd.id))
        : t(qd.stages[0].text),
    side: qd.side ?? false,
  }))
  const mainQ = quests.find((q) => q.id === 'main')!
  const contractQ = quests.find((q) => q.id === 'contract')!
  const veldQ = quests.find((q) => q.id === 'veld')!
  // Фаза 6: гранитные квесты тоже попадают в трекер побочек
  const graniteQ = quests.find((q) => q.id === 'granite')!
  const oreQ = quests.find((q) => q.id === 'granite_ore')!
  const scorpQ = quests.find((q) => q.id === 'granite_scorpions')!
  // Фаза 6.2: предельные квесты тоже попадают в трекер побочек
  const frostWQ = quests.find((q) => q.id === 'frost_words')!
  const frostDQ = quests.find((q) => q.id === 'frost_dragon')!
  // Фаза 6.3: маровские квесты тоже попадают в трекер побочек
  const maraQ = quests.find((q) => q.id === 'mara')!
  const maraWQ = quests.find((q) => q.id === 'mara_wells')!
  const maraGQ = quests.find((q) => q.id === 'mara_glands')!
  // Фаза 6.4: квесты Спорных Земель тоже попадают в трекер побочек
  const dispQ = quests.find((q) => q.id === 'disputed')!
  const dispHQ = quests.find((q) => q.id === 'disputed_hoard')!
  const dispSQ = quests.find((q) => q.id === 'disputed_scout')!
  // Фаза 6.5: квесты Внешнего Рубежа — в трекере побочек
  const rbShipQ = quests.find((q) => q.id === 'rubezh_ship')!
  const rbSigQ = quests.find((q) => q.id === 'rubezh_signal')!
  const rbRingQ = quests.find((q) => q.id === 'rubezh_rings')!
  const rbCrewQ = quests.find((q) => q.id === 'rubezh_crew')!
  // Фаза 7: рейд и суд — в трекере как побочные до момента старта
  const raidQ = quests.find((q) => q.id === 'raid')!
  const judgQ = quests.find((q) => q.id === 'judgment')!
  const sideQ = [
    contractQ,
    veldQ,
    graniteQ,
    oreQ,
    scorpQ,
    frostWQ,
    frostDQ,
    maraQ,
    maraWQ,
    maraGQ,
    dispQ,
    dispHQ,
    dispSQ,
    rbShipQ,
    rbSigQ,
    rbRingQ,
    rbCrewQ,
    raidQ,
    judgQ,
  ].find((q) => q.stage > 0 && !q.done) ?? null
  const boss = findActiveBoss(ctx)
  // v1.4: спавн босса — угроза босса + реплика живого компаньона (трекинг внутри модуля)
  const barkBuddy = ctx.entities.find(
    (e) => e.kind === 'companion' && e.alive && (e.id === 'kaya' || e.id === 'torvald'),
  )
  bossSpawnBark(boss ? boss.enemyType! : null, (barkBuddy?.id as CompanionId) ?? null)
  // Фаза 6.2: крики Ту'ум — зеркало HUD
  const shouts: ShoutHud[] = [
    {
      id: 'shout_force',
      name: t('Крик: Сила'),
      icon: 'Wind',
      hotkey: labelFor('shout_force'),
      word: 'ФУС',
      lv: ctx.shoutLv?.force ?? 0,
      cd: ctx.player.cds['shout_force'] ?? 0,
      cdMax: ABILITY_MAP['shout_force']?.cooldown ?? 13,
    },
    {
      id: 'shout_frost',
      name: t('Крик: Мороз'),
      icon: 'Snowflake',
      hotkey: labelFor('shout_frost'),
      word: 'ЛОК',
      lv: ctx.shoutLv?.frost ?? 0,
      cd: ctx.player.cds['shout_frost'] ?? 0,
      cdMax: ABILITY_MAP['shout_frost']?.cooldown ?? 16,
    },
  ]
  // Фаза 6: карьера — зеркало HUD
  const career: CareerHud | null = ctx.career.faction
    ? {
        faction: ctx.career.faction,
        factionName: t(CAREER_NAME[ctx.career.faction]),
        rank: heroRank(ctx),
        rankName: t(RANK_NAME[heroRank(ctx)]),
        rep: ctx.career.rep[ctx.career.faction],
        perks: CAREER_PERKS[ctx.career.faction].map((p) => t(p)),
      }
    : null
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
    contractQuest: sideQ,
    bossBar: boss ? { name: t(ENEMY_NAME[boss.enemyType!] ?? 'Хозяин'), hp: Math.round(boss.hp), maxHp: boss.maxHp } : null,
    interactHint: n
      ? n.npc
        ? t('Поговорить: {x} — [{key}]', { x: t(n.npc.name), key: labelFor('interact') })
        : n.it
          ? t('{prompt}: {x} — [{key}]', { prompt: t(n.it.prompt), x: t(n.it.name), key: labelFor('interact') })
          : t('{label} — [{key}]', { label: t(n.label), key: labelFor('interact') })
      : null,
    bestiary: [...ctx.bestiary],
    // Фаза 3: масло, сутки, зона
    oil: ctx.oilT > 0 && ctx.oilKind ? { name: t(ITEMS[ctx.oilKind]?.name ?? 'Масло'), remain: Math.ceil(ctx.oilT) } : null,
    daytime: ctx.dayClock,
    zoneLabel:
      ctx.zone === 'veld'
        ? t('ВЕЛЬД')
        : ctx.zone === 'granite'
          ? t('ГРАНИТНАЯ ДОЛИНА')
          : ctx.zone === 'frost'
            ? t('СТЫЛОЕ ПРЕДЕЛЬЕ')
            : ctx.zone === 'mara'
              ? t('БАГРОВАЯ МАРА')
              : ctx.zone === 'disputed'
                ? t('СПОРНЫЕ ЗЕМЛИ')
                : ctx.zone === 'rubezh'
                  ? t('ВНЕШНИЙ РУБЕЖ')
                  : t('ХЕЙМХОЛЛ И ОКРЕСТНОСТИ'),
    formation: ctx.formation,
    career,
    shouts,
    // Фаза 6.3: оборона Бастиона — зеркало HUD
    siege: siegeHud(ctx),
    // Фаза 6.4: набег Орды — зеркало HUD
    assault: assaultHud(ctx),
    // Фаза 7: рейд в Сердце Разлома — зеркало HUD
    raid: raidHud(ctx),
    // v1.5: романсы — зеркало флагов (портретные варианты + эпилог)
    romance: { kaya: !!ctx.flags.romance_kaya, asher: !!ctx.flags.romance_asher },
  })
}
