'use client'

import { useEffect, useRef, useState } from 'react'
import { Coins, Keyboard, ScrollText, X } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Slider } from '@/components/ui/slider'
import { getEngine, BESTIARY_INFO } from '@/lib/game/engine'
import { PORTRAIT_IMG, PORTRAIT_ROMANCE } from '@/lib/game/data/portraits'
import { ITEMS } from '@/lib/game/data/items'
import { isMuted, setMuted } from '@/lib/game/sfx'
import { EffQuality, GameSettings, QUALITY_NAME, QualityId, TOUCH_MODES, TOUCH_NAME } from '@/lib/game/settings'
import {
  ACTION_DEFS,
  ActionId,
  DEFAULT_BINDINGS,
  getBindings,
  isBindable,
  keyLabel,
  keyOwner,
  normKey,
  setBindings,
} from '@/lib/game/bindings'
import { boot, useGame } from '@/lib/game/store'
import { setLocale, t, useLocale } from '@/lib/game/i18n'
import { GAME_VERSION } from '@/lib/game/version'
import { GameIcon } from './GameIcon'

function Panel({
  title,
  subtitle,
  children,
  wide,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
  wide?: boolean
}) {
  return (
    <div className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className={`game-panel flex max-h-[88vh] w-full flex-col rounded-lg ${wide ? 'max-w-4xl' : 'max-w-2xl'}`}>
        <div className="flex items-center justify-between border-b border-[#5a4632] px-5 py-3">
          <div>
            <h2 className="game-title-font text-lg tracking-[0.25em] text-[#f5c96b]">{title.toUpperCase()}</h2>
            {subtitle && <p className="text-[11px] text-[#8a8068]">{subtitle}</p>}
          </div>
          <button
            onClick={() => getEngine()?.closePanel()}
            className="rounded border border-[#5a4632] p-1.5 text-[#9a8f78] transition hover:border-[#d9a441] hover:text-[#f5c96b]"
            aria-label={t('Закрыть')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="game-scroll overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  )
}

function Row({
  children,
  className = '',
  title,
}: {
  children: React.ReactNode
  className?: string
  title?: string
}) {
  return (
    <div
      title={title}
      className={`flex items-center justify-between gap-3 rounded border border-[#3a2e20] bg-[#211a12]/70 px-3 py-2 ${className}`}
    >
      {children}
    </div>
  )
}

function AttrLine({ name, value, attr, hint }: { name: string; value: number; attr: 'might' | 'vigor' | 'intellect' | 'charisma'; hint: string }) {
  const lp = useGame((s) => s.player?.lp ?? 0)
  return (
    <Row>
      <div>
        <p className="text-sm text-[#e8d5a8]">
          {name}: <span className="font-bold text-[#f5c96b]">{value}</span>
        </p>
        <p className="text-[11px] text-[#8a8068]">{hint}</p>
      </div>
      <button
        onClick={() => getEngine()?.spendLp(attr)}
        disabled={lp < 3}
        className="shrink-0 rounded border border-[#d9a441]/60 bg-[#d9a441]/10 px-3 py-1.5 text-xs text-[#f5c96b] transition hover:bg-[#d9a441]/25 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {t('+1 (3 ОН)')}
      </button>
    </Row>
  )
}

function CharPanel() {
  const player = useGame((s) => s.player)
  const career = useGame((s) => s.career)
  if (!player) return null
  const signList: Array<{ id: 'igni' | 'aard' | 'quen' | 'axii'; name: string }> = [
    { id: 'igni', name: 'Игни — огонь' },
    { id: 'aard', name: 'Аард — телекинез' },
    { id: 'quen', name: 'Квен — щит' },
    { id: 'axii', name: 'Аксий — обман' },
  ]
  return (
    <Panel title={t('Персонаж')} subtitle={t('Уровень {n} · Опыт {x}/{y}', { n: player.level, x: player.xp, y: player.xpNext })} wide>
      <div className="grid gap-5 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <p className="game-title-font text-xs tracking-[0.25em] text-[#9a8f78]">{t('АТРИБУТЫ · ОН: {n}', { n: player.lp })}</p>
          <AttrLine name={t('Мощь')} value={player.attributes.might} attr="might" hint={t('Атака и урон клинком')} />
          <AttrLine name={t('Стойкость')} value={player.attributes.vigor} attr="vigor" hint={t('Здоровье и класс брони')} />
          <AttrLine name={t('Разум')} value={player.attributes.intellect} attr="intellect" hint={t('Сила знаков')} />
          <AttrLine name={t('Обаяние')} value={player.attributes.charisma} attr="charisma" hint={t('Убеждение в диалогах')} />
          <p className="game-title-font mt-3 text-xs tracking-[0.25em] text-[#9a8f78]">{t('НАВЫКИ (НАСТАВНИК)')}</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <Row className="!justify-start">{t('Клинок:')} <b className="ml-auto text-[#f5c96b]">{player.skills.blade}/5</b></Row>
            <Row className="!justify-start">{t('Живучесть:')} <b className="ml-auto text-[#f5c96b]">{player.skills.vitality}/5</b></Row>
            <Row className="!justify-start">{t('Знаки:')} <b className="ml-auto text-[#f5c96b]">{player.skills.signs}/5</b></Row>
            <Row className="!justify-start">{t('Красноречие:')} <b className="ml-auto text-[#f5c96b]">{player.skills.speech}/5</b></Row>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <p className="game-title-font text-xs tracking-[0.25em] text-[#9a8f78]">{t('СНАРЯЖЕНИЕ')}</p>
          <Row title={player.weapon ? t(ITEMS[player.weapon].desc) : undefined}>
            <span className="flex min-w-0 items-center gap-2 text-sm text-[#e8d5a8]">
              <GameIcon name="Sword" className="h-4 w-4 shrink-0 text-[#c9b06b]" /> {t('Оружие')}
            </span>
            <span className="flex shrink-0 items-center gap-1.5">
              {player.weapon && <GearStat id={player.weapon} />}
              <span className="truncate text-sm text-[#f5c96b]">{player.weapon ? t(ITEMS[player.weapon].name) : t('— кулаки —')}</span>
            </span>
          </Row>
          <Row title={player.armor ? t(ITEMS[player.armor].desc) : undefined}>
            <span className="flex min-w-0 items-center gap-2 text-sm text-[#e8d5a8]">
              <GameIcon name="Shirt" className="h-4 w-4 shrink-0 text-[#c9b06b]" /> {t('Броня')}
            </span>
            <span className="flex shrink-0 items-center gap-1.5">
              {player.armor && <GearStat id={player.armor} />}
              <span className="truncate text-sm text-[#f5c96b]">{player.armor ? t(ITEMS[player.armor].name) : t('— нет —')}</span>
            </span>
          </Row>
          <p className="game-title-font mt-3 text-xs tracking-[0.25em] text-[#9a8f78]">{t('ЗНАКИ')}</p>
          {signList.map((s) => {
            const st = player.signs[s.id]
            return (
              <Row key={s.id}>
                <span className={`text-sm ${st.unlocked ? 'text-[#e8d5a8]' : 'text-[#6a6152]'}`}>{t(s.name)}</span>
                <span className={`text-xs ${st.unlocked ? 'text-[#f5c96b]' : 'text-[#6a6152]'}`}>
                  {st.unlocked ? t('ур. {n}', { n: st.level }) : t('не изучен')}
                </span>
              </Row>
            )
          })}
          <Row>
            <span className={`text-sm ${player.signs.shout.unlocked ? 'text-[#e8d5a8]' : 'text-[#6a6152]'}`}>
              {t('Голос Древних — крик силы')}
            </span>
            <span className={`text-xs ${player.signs.shout.unlocked ? 'text-[#f5c96b]' : 'text-[#6a6152]'}`}>
              {player.signs.shout.unlocked ? t('изучен') : t('алтарь у Камней')}
            </span>
          </Row>
          <p className="game-title-font mt-3 text-xs tracking-[0.25em] text-[#9a8f78]">{t('СОСТОЯНИЕ')}</p>
          <Row>
            <span className="text-sm text-[#e8d5a8]">{t('Золото')}</span>
            <span className="flex items-center gap-1 text-sm font-bold text-[#e8d5a8]">
              <Coins className="h-4 w-4 text-[#e8c56b]" /> {player.gold}
            </span>
          </Row>
          <Row>
            <span className="text-sm text-[#e8d5a8]">{t('Фракция')}</span>
            <span className="text-sm text-[#f5c96b]">
              {t(player.faction === 'flame' ? 'Орден Пламени' : player.faction === 'mist' ? 'Ковен Тумана' : 'Вольный')}
            </span>
          </Row>
          {career && (
            <>
              <p className="game-title-font mt-3 text-xs tracking-[0.25em] text-[#9a8f78]">{t('КАРЬЕРА КОЛОНИИ (ФАЗА 6)')}</p>
              <Row>
                <span className="text-sm text-[#e8d5a8]">{career.factionName}</span>
                <span className="text-sm text-[#f5c96b]">{career.rankName}</span>
              </Row>
              <Row>
                <span className="text-sm text-[#e8d5a8]">{t('Слава лагеря')}</span>
                <span className="text-sm text-[#f5c96b]">{career.rep}/100</span>
              </Row>
              {career.perks.map((p) => (
                <p key={p} className="rounded border border-[#3a2e20] bg-[#211a12]/70 px-3 py-1.5 text-xs text-[#b8ab8c]">
                  ✦ {p}
                </p>
              ))}
            </>
          )}
        </div>
      </div>
    </Panel>
  )
}

/** v1.9: чип стата снаряжения — урон оружия / КД брони (d20-терминология). */
function GearStat({ id }: { id: string }) {
  const def = ITEMS[id]
  if (!def) return null
  if (def.type === 'weapon' && def.damage !== undefined)
    return (
      <span className="shrink-0 rounded border border-[#d9a441]/40 px-1.5 py-0.5 text-[11px] text-[#f5c96b]">
        {t('урон {n}', { n: def.damage })}
      </span>
    )
  if (def.type === 'armor' && def.ac !== undefined)
    return (
      <span className="shrink-0 rounded border border-[#8fbf7f]/40 px-1.5 py-0.5 text-[11px] text-[#a8d89a]">
        {t('КД {n}', { n: def.ac })}
      </span>
    )
  return null
}

function InvPanel() {
  const inventory = useGame((s) => s.inventory)
  const player = useGame((s) => s.player)
  if (!player) return null
  const equipped = [
    { slot: 'weapon' as const, label: t('Оружие'), item: player.weapon },
    { slot: 'armor' as const, label: t('Броня'), item: player.armor },
  ]
  return (
    <Panel title={t('Инвентарь')} subtitle={t('Золото: {n}', { n: player.gold })}>
      <div className="flex flex-col gap-2">
        {equipped.map((eq) => (
          <Row key={eq.slot} title={eq.item ? t(ITEMS[eq.item].desc) : undefined}>
            <span className="flex min-w-0 items-center gap-2 text-sm text-[#e8d5a8]">
              {eq.label}: <span className="truncate text-[#f5c96b]">{eq.item ? t(ITEMS[eq.item].name) : t('— пусто —')}</span>
            </span>
            <span className="flex shrink-0 items-center gap-1.5">
              {eq.item && <GearStat id={eq.item} />}
              {eq.item && (
                <button
                  onClick={() => getEngine()?.unequipItem(eq.slot)}
                  className="rounded border border-[#5a4632] px-3 py-1 text-xs text-[#cfc0a0] transition hover:border-[#d9a441] hover:text-[#f5c96b]"
                >
                  {t('Снять')}
                </button>
              )}
            </span>
          </Row>
        ))}
        <p className="game-title-font mt-3 text-xs tracking-[0.25em] text-[#9a8f78]">{t('СУМКА')}</p>
        {inventory.length === 0 && <p className="text-sm text-[#8a8068]">{t('Пусто. Как в карманах после таверны.')}</p>}
        {inventory.map((inv) => {
          const def = ITEMS[inv.item]
          if (!def) return null
          return (
            <Row key={inv.item} title={t(def.desc)}>
              <div className="flex min-w-0 items-center gap-2">
                <GameIcon name={def.icon} className="h-4 w-4 shrink-0 text-[#c9b06b]" />
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-sm text-[#e8d5a8]">
                    <span className="truncate">
                      {t(def.name)} {inv.qty > 1 && <span className="text-[#c9b06b]">×{inv.qty}</span>}
                    </span>
                    {(def.type === 'weapon' || def.type === 'armor') && <GearStat id={inv.item} />}
                  </p>
                  <p className="truncate text-[11px] text-[#8a8068]">{t(def.desc)}</p>
                </div>
              </div>
              <div className="flex shrink-0 gap-1.5">
                {def.type === 'weapon' || def.type === 'armor' ? (
                  <button
                    onClick={() => getEngine()?.equipItem(inv.item)}
                    className="rounded border border-[#d9a441]/60 bg-[#d9a441]/10 px-2.5 py-1 text-xs text-[#f5c96b] transition hover:bg-[#d9a441]/25"
                  >
                    {t('Надеть')}
                  </button>
                ) : null}
                {def.type === 'potion' && (
                  <button
                    onClick={() => getEngine()?.useItem(inv.item)}
                    className="rounded border border-[#8fbf7f]/60 bg-[#8fbf7f]/10 px-2.5 py-1 text-xs text-[#a8d89a] transition hover:bg-[#8fbf7f]/25"
                  >
                    {t('Выпить')}
                  </button>
                )}
                {def.type === 'oil' && (
                  <button
                    onClick={() => getEngine()?.useItem(inv.item)}
                    className="rounded border border-[#d9a441]/60 bg-[#d9a441]/10 px-2.5 py-1 text-xs text-[#f5c96b] transition hover:bg-[#d9a441]/25"
                  >
                    {t('Нанести')}
                  </button>
                )}
                {def.type !== 'quest' && (
                  <span className="flex items-center rounded border border-[#3a2e20] px-2 py-1 text-[11px] text-[#8a8068]">
                    {t('{n} зол.', { n: Math.floor(def.price * 0.4) })}
                  </span>
                )}
              </div>
            </Row>
          )
        })}
        <p className="mt-2 text-[11px] text-[#8a8068]">{t('Продать вещи можно у торговца Грима в Хеймхолле.')}</p>
      </div>
    </Panel>
  )
}

function JournalPanel() {
  const quests = useGame((s) => s.quests)
  const bestiary = useGame((s) => s.bestiary)
  const order = ['wolf', 'alpha', 'bandit', 'archer', 'captain', 'horror', 'boss']
  return (
    <Panel title={t('Журнал')} wide>
      <Tabs defaultValue="quests">
        <TabsList className="bg-[#241c14] border border-[#5a4632]">
          <TabsTrigger value="quests" className="data-[state=active]:text-[#f5c96b]">
            {t('Квесты')}
          </TabsTrigger>
          <TabsTrigger value="bestiary" className="data-[state=active]:text-[#f5c96b]">
            {t('Бестиарий')}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="quests" className="mt-4 flex flex-col gap-3">
          {quests
            .filter((q) => q.stage > 0 || q.done)
            .map((q) => (
            <div
              key={q.id}
              className={`rounded border p-3 ${q.done ? 'border-[#3a2e20] bg-[#1c1712]/60 opacity-70' : q.side ? 'border-[#3a2e20] bg-[#211a12]/70' : 'border-[#d9a441]/40 bg-[#241c12]/80'}`}
            >
              <p className={`text-sm font-semibold ${q.done ? 'text-[#8a8068] line-through' : q.side ? 'text-[#c9b06b]' : 'text-[#f5c96b]'}`}>
                {q.name}
              </p>
              <p className="mt-1 text-[11px] italic leading-snug text-[#8a8068]">{q.summary}</p>
              {!q.done && (
                <p className="mt-2 flex items-start gap-1.5 text-sm text-[#e8d5a8]">
                  <ScrollText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#d9a441]" />
                  {q.stage === 2 && q.id === 'main' ? `${q.stageText} (${q.counter}/4)` : q.id === 'mist' && q.stage === 1 ? `${q.stageText} (${q.counter}/3)` : q.stageText}
                </p>
              )}
              {q.done && <p className="mt-1 text-sm text-[#8a8068]">{q.stageText}</p>}
            </div>
          ))}
        </TabsContent>
        <TabsContent value="bestiary" className="mt-4 flex flex-col gap-3">
          {order.map((k) => {
            const info = BESTIARY_INFO[k]
            const known = bestiary.includes(k)
            return (
              <div key={k} className={`rounded border p-3 ${known ? 'border-[#3a2e20] bg-[#211a12]/70' : 'border-[#2a2218] bg-[#1a1510]/60'}`}>
                <p className={`text-sm font-semibold ${known ? 'text-[#e8d5a8]' : 'text-[#6a6152]'}`}>{known ? t(info.name) : '???'}</p>
                {known ? (
                  <>
                    <p className="mt-1 text-[12px] leading-snug text-[#b0a488]">{t(info.text)}</p>
                    <p className="mt-1 text-[12px] text-[#d9a441]">{t('Слабость: {x}', { x: t(info.weakness) })}</p>
                  </>
                ) : (
                  <p className="mt-1 text-[12px] text-[#5a5245]">{t('Запись появится после первой победы над таким врагом.')}</p>
                )}
              </div>
            )
          })}
        </TabsContent>
      </Tabs>
    </Panel>
  )
}

function ShopPanel() {
  const shop = useGame((s) => s.shop)
  const inventory = useGame((s) => s.inventory)
  const player = useGame((s) => s.player)
  if (!shop || !player) return null
  return (
    <Panel title={t('Торговля')} subtitle={t('{merchant} · твоё золото: {n}', { merchant: t(shop.merchantName), n: player.gold })} wide>
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <p className="game-title-font mb-2 text-xs tracking-[0.25em] text-[#9a8f78]">
            {/* v1.9: было жёстко «ТОВАР ГРИМА» — у Альры и Брока заголовок врал */}
            {t('Товар: {m}', { m: shop.merchantName }).toUpperCase()}
          </p>
          <div className="game-scroll flex max-h-80 flex-col gap-2 overflow-y-auto pr-1">
            {shop.stock.map((id) => {
              const def = ITEMS[id]
              const can = player.gold >= def.price
              return (
                <Row key={id} title={t(def.desc)}>
                  <div className="flex min-w-0 items-center gap-2">
                    <GameIcon name={def.icon} className="h-4 w-4 shrink-0 text-[#c9b06b]" />
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 text-sm text-[#e8d5a8]">
                        <span className="truncate">{t(def.name)}</span>
                        {(def.type === 'weapon' || def.type === 'armor') && <GearStat id={id} />}
                      </p>
                      <p className="truncate text-[11px] text-[#8a8068]">{t(def.desc)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => getEngine()?.buyItem(id)}
                    disabled={!can}
                    className={`shrink-0 rounded border px-2.5 py-1 text-xs ${can ? 'border-[#d9a441]/60 bg-[#d9a441]/10 text-[#f5c96b] hover:bg-[#d9a441]/25' : 'border-[#3a2e20] text-[#6a6152]'}`}
                  >
                    {t('{n} зол.', { n: def.price })}
                  </button>
                </Row>
              )
            })}
          </div>
        </div>
        <div>
          <p className="game-title-font mb-2 text-xs tracking-[0.25em] text-[#9a8f78]">{t('ПРОДАТЬ (40% ЦЕНЫ)')}</p>
          <div className="game-scroll flex max-h-80 flex-col gap-2 overflow-y-auto pr-1">
            {inventory.filter((i) => ITEMS[i.item] && ITEMS[i.item].type !== 'quest').length === 0 && (
              <p className="text-sm text-[#8a8068]">{t('Торг нечем.')}</p>
            )}
            {inventory
              .filter((i) => ITEMS[i.item] && ITEMS[i.item].type !== 'quest')
              .map((i) => {
                const def = ITEMS[i.item]
                return (
                  <Row key={i.item} title={t(def.desc)}>
                    <span className="flex min-w-0 items-center gap-2 text-sm text-[#e8d5a8]">
                      <GameIcon name={def.icon} className="h-4 w-4 shrink-0 text-[#c9b06b]" />
                      <span className="truncate">
                        {t(def.name)} {i.qty > 1 && <span className="text-[#c9b06b]">×{i.qty}</span>}
                      </span>
                    </span>
                    <button
                      onClick={() => getEngine()?.sellItem(i.item)}
                      className="shrink-0 rounded border border-[#8fbf7f]/50 bg-[#8fbf7f]/10 px-2.5 py-1 text-xs text-[#a8d89a] transition hover:bg-[#8fbf7f]/25"
                    >
                      {t('+{n} зол.', { n: Math.floor(def.price * 0.4) })}
                    </button>
                  </Row>
                )
              })}
          </div>
        </div>
      </div>
    </Panel>
  )
}

function TrainerPanel() {
  const trainer = useGame((s) => s.trainer)
  const player = useGame((s) => s.player)
  if (!trainer || !player) return null
  return (
    <Panel title={t('Наставник Дорн')} subtitle={t('Твои очки обучения: {n} · золото: {m}', { n: player.lp, m: player.gold })}>
      <div className="flex flex-col gap-2">
        {trainer.options.map((o) => (
          <Row key={o.id}>
            <div className="min-w-0">
              <p className="text-sm text-[#e8d5a8]">{t(o.name)}</p>
              <p className="truncate text-[11px] text-[#8a8068]">{t(o.desc)}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="text-[11px] text-[#c9b06b]">{o.cost}</span>
              <button
                onClick={() => getEngine()?.trainOption(o.id)}
                disabled={!o.affordable || o.maxed}
                className={`rounded border px-2.5 py-1 text-xs ${o.maxed ? 'border-[#3a2e20] text-[#6a6152]' : o.affordable ? 'border-[#d9a441]/60 bg-[#d9a441]/10 text-[#f5c96b] hover:bg-[#d9a441]/25' : 'border-[#3a2e20] text-[#6a6152]'}`}
              >
                {o.maxed ? t('Предел') : t('Учить')}
              </button>
            </div>
          </Row>
        ))}
      </div>
    </Panel>
  )
}

function MapPanel() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const zoneLabel = useGame((s) => s.zoneLabel)
  useEffect(() => {
    if (canvasRef.current) getEngine()?.renderFullMap(canvasRef.current)
  }, [])
  return (
    <Panel title={t('Карта: {z}', { z: zoneLabel })} subtitle={t('Янтарь — твоя позиция, кольцо — текущая цель')} wide>
      <canvas ref={canvasRef} width={1024} height={768} className="h-auto w-full rounded border border-[#5a4632]" />
      {/* v2.1: зоны-сцены — карта показывает текущую землю; прочие земли за вратами */}
      <p className="mt-2 text-center text-[11px] italic text-[#9a8f78]">
        {t('Земля: {z}. Прочие земли — за вратами (ромбы); увидишь их, когда пройдёшь.', { z: zoneLabel })}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-[#8a8068] sm:grid-cols-3">
        <span>{t('◈ Хеймхолл — деревня и NPCs')}</span>
        <span>{t('◈ Сумрачный лес — волки, контракт')}</span>
        <span>{t('◈ Камни Древних — алтарь и спутники')}</span>
        <span>{t('◈ Озеро Лун — лунные травы')}</span>
        <span>{t('◈ Лагерь — разбойники, испытание')}</span>
        <span>{t('◈ Сердце Разлома — финал')}</span>
      </div>
    </Panel>
  )
}

function reloadContinue() {
  boot.mode = 'continue'
  useGame.getState().patch({ panel: null, screen: 'title' })
  setTimeout(() => useGame.getState().setScreen('game'), 60)
}

function PausePanel() {
  const hasSave = useGame((s) => s.hasSave)
  const renderMode = useGame((s) => s.renderMode)
  const [muted, setMutedState] = useState(isMuted())
  return (
    <Panel title={t('Пауза')} subtitle={t('Долина подождёт. Ненадолго.')}>
      <div className="flex flex-col gap-2">
        <MenuBtn onClick={() => getEngine()?.closePanel()} primary>
          {t('Продолжить')}
        </MenuBtn>
        <MenuBtn onClick={() => getEngine()?.saveGame(true)}>{t('Сохранить игру')}</MenuBtn>
        <MenuBtn onClick={reloadContinue} disabled={!hasSave}>
          {t('Загрузить последнее сохранение')}
        </MenuBtn>
        <MenuBtn onClick={() => getEngine()?.openPanel('settings')}>{t('Настройки')}</MenuBtn>
        <MenuBtn
          onClick={() => {
            const v = !muted
            setMuted(v)
            setMutedState(v)
          }}
        >
          {t('Звук: {x}', { x: muted ? t('выкл') : t('вкл') })}
        </MenuBtn>
        <div className="mt-2 rounded border border-[#3a2e20] bg-[#211a12]/70 p-3 text-[12px] leading-relaxed text-[#a89a7d]">
          <p className="mb-1 font-semibold text-[#c9b06b]">{t('Управление')}</p>
          {t(
            'WASD / ЛКМ — движение · ЛКМ по врагу — цель · 1–4 знаки · 5 — Голос Древних · Q/E — зелья · F — взаимодействие · Пробел — тактическая пауза и приказы · V — строй · Tab — цель · C/I/J/M — панели · Esc — меню',
          )}
          {renderMode === '3d' && (
            <>
              <br />
              <span className="text-[#8fbf6a]">{t('3D: ПКМ (зажать) — поворот камеры · колесо — зум')}</span>
            </>
          )}
        </div>
        <MenuBtn
          onClick={() => {
            getEngine()?.toTitle()
          }}
          danger
        >
          {t('Выйти в главное меню')}
        </MenuBtn>
      </div>
    </Panel>
  )
}

// ---------------- Фаза 8: настройки (GDD 06 §2/§7) ----------------

const QUALITY_OPTS: Array<{ id: QualityId; name: string }> = [
  { id: 'auto', name: 'Авто' },
  { id: 'high', name: 'Высокое' },
  { id: 'medium', name: 'Среднее' },
  { id: 'low', name: 'Низкое' },
  { id: 'mobile', name: 'Мобильное' },
]

function VolSlider({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="rounded border border-[#3a2e20] bg-[#211a12]/70 px-3 py-2">
      <div className="flex items-center justify-between text-sm text-[#e8d5a8]">
        <span>{label}</span>
        <span className="tabular-nums text-[#f5c96b]">{Math.round(value * 100)}%</span>
      </div>
      <Slider
        value={[value]}
        min={0}
        max={1}
        step={0.05}
        onValueChange={(v) => onChange(v[0] ?? 0)}
        className="mt-2 [&_[data-slot=slider-track]]:bg-[#3a2e20] [&_[data-slot=slider-range]]:bg-[#d9a441]"
        aria-label={label}
      />
    </div>
  )
}

// ---------------- v1.1: ремап клавиш (GDD 04 §4.3) ----------------

function KeybindRow({
  action,
  name,
  keyLabel: kl,
  listening,
  onStart,
}: {
  action: ActionId
  name: string
  keyLabel: string
  listening: boolean
  onStart: (a: ActionId) => void
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded border border-[#3a2e20] bg-[#211a12]/70 px-2.5 py-1.5">
      <span className="truncate text-xs text-[#cfc0a0]" title={name}>
        {name}
      </span>
      <button
        onClick={() => onStart(action)}
        aria-label={t('Назначить клавишу: {name}', { name })}
        className={`min-w-[92px] shrink-0 rounded border px-2 py-1 text-[11px] font-semibold transition ${
          listening
            ? 'animate-pulse border-[#d9a441] bg-[#d9a441]/20 text-[#f5c96b]'
            : 'border-[#5a4632] text-[#e8d5a8] hover:border-[#d9a441] hover:text-[#f5c96b]'
        }`}
      >
        {listening ? t('Нажмите…') : kl}
      </button>
    </div>
  )
}

function KeybindsSection() {
  const [binds, setBindsState] = useState(() => getBindings())
  const [listening, setListening] = useState<ActionId | null>(null)

  // Захват клавиши в фазе перехвата — игровой обработчик не получает событие
  useEffect(() => {
    if (!listening) return
    const h = (ev: KeyboardEvent) => {
      ev.preventDefault()
      ev.stopPropagation()
      if (ev.key === 'Escape') {
        setListening(null)
        return
      }
      if (!isBindable(ev.key)) return
      const key = normKey(ev.key)
      const nb = { ...getBindings() }
      const self = nb[listening].includes(key)
      if (!self) {
        const owner = keyOwner(key)
        if (owner && owner !== listening) {
          nb[owner] = nb[owner].filter((k) => k !== key)
          const def = ACTION_DEFS.find((d) => d.id === owner)?.name ?? owner
          useGame.getState().pushToast(t('Клавиша «{k}» освобождена: {d}', { k: keyLabel(key), d: t(def) }), 'info')
        }
        nb[listening] = [key]
      }
      setBindings(nb)
      setBindsState(getBindings())
      setListening(null)
    }
    window.addEventListener('keydown', h, true)
    return () => window.removeEventListener('keydown', h, true)
  }, [listening])

  const groups = ['Бой', 'Партия', 'Панели'] as const
  return (
    <div className="rounded border border-[#3a2e20] bg-[#211a12]/70 p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="game-title-font flex items-center gap-2 text-xs tracking-[0.25em] text-[#9a8f78]">
          <Keyboard className="h-3.5 w-3.5" /> {t('УПРАВЛЕНИЕ')}
        </p>
        <button
          onClick={() => {
            setBindings(DEFAULT_BINDINGS)
            setBindsState(getBindings())
            useGame.getState().pushToast(t('Клавиши сброшены к стандартным'), 'info')
          }}
          className="rounded border border-[#5a4632] px-2 py-1 text-[11px] text-[#cfc0a0] transition hover:border-[#d9a441] hover:text-[#f5c96b]"
        >
          {t('Сбросить')}
        </button>
      </div>
      <div className="game-scroll max-h-72 overflow-y-auto pr-1">
        <div className="grid gap-1.5 sm:grid-cols-2">
          {groups.map((g) =>
            ACTION_DEFS.filter((d) => d.group === g).map((d) => (
              <KeybindRow
                key={d.id}
                action={d.id}
                name={t(d.name)}
                keyLabel={listening === d.id ? t('Нажмите…') : keyLabel(binds[d.id][0] ?? '')}
                listening={listening === d.id}
                onStart={setListening}
              />
            )),
          )}
        </div>
      </div>
      <p className="mt-2 text-[11px] leading-snug text-[#8a8068]">
        {t(
          'Клик по действию → новая клавиша (Esc — отмена). WASD/стрелки — движение (фиксировано), Esc — меню. Русская раскладка работает автоматически.',
        )}
      </p>
    </div>
  )
}

// v1.6: кнопка выбора языка интерфейса
function LangBtn({ l }: { l: 'ru' | 'en' }) {
  const locale = useLocale()
  return (
    <button
      onClick={() => setLocale(l)}
      aria-pressed={locale === l}
      aria-label="Переключить язык / Toggle language"
      className={`rounded border px-3 py-1.5 text-xs font-semibold transition ${
        locale === l
          ? 'border-[#d9a441] bg-[#d9a441]/15 text-[#f5c96b]'
          : 'border-[#5a4632] text-[#cfc0a0] hover:border-[#8a7a5a] hover:text-[#e8d5a8]'
      }`}
    >
      {l === 'ru' ? 'Русский' : 'English'}
    </button>
  )
}

function SettingsPanel() {
  const settings = useGame((s) => s.settings)
  const effQuality = useGame((s) => s.effQuality)
  const fps = useGame((s) => s.fps)
  const renderMode = useGame((s) => s.renderMode)
  const touchUi = useGame((s) => s.touchUi)
  const apply = (partial: Partial<GameSettings>) => {
    useGame.getState().updateSettings(partial)
    getEngine()?.applySettings()
  }
  return (
    <Panel title={t('Настройки')} subtitle={t('Эхо Разлома · v{v}', { v: GAME_VERSION })}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <p className="game-title-font text-xs tracking-[0.25em] text-[#9a8f78]">{t('ГРАФИКА')}</p>
          <Row>
            <span className="text-sm text-[#e8d5a8]">{t('Режим рендера')}</span>
            <button
              onClick={() => getEngine()?.setRenderMode(renderMode === '3d' ? '2d' : '3d')}
              className="rounded border border-[#d9a441]/60 bg-[#d9a441]/10 px-3 py-1.5 text-xs text-[#f5c96b] transition hover:bg-[#d9a441]/25"
            >
              {renderMode === '3d' ? '3D (Three.js)' : 'Legacy 2D'}
            </button>
          </Row>
          <div className="rounded border border-[#3a2e20] bg-[#211a12]/70 px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#e8d5a8]">{t('Качество')}</span>
              <span className="text-[11px] text-[#8a8068]">
                {t('действует:')} <b className="text-[#c9b06b]">{t(QUALITY_NAME[effQuality as EffQuality])}</b>
              </span>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {QUALITY_OPTS.map((q) => (
                <button
                  key={q.id}
                  onClick={() => apply({ quality: q.id })}
                  aria-pressed={settings.quality === q.id}
                  className={`rounded border px-2 py-1.5 text-xs transition ${
                    settings.quality === q.id
                      ? 'border-[#d9a441] bg-[#d9a441]/15 text-[#f5c96b]'
                      : 'border-[#5a4632] text-[#cfc0a0] hover:border-[#8a7a5a]'
                  }`}
                >
                  {t(q.name)}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] leading-snug text-[#8a8068]">
              {t('«Авто» следит за FPS: при просадке пресет снижается, при стабильно высоком — повышается.')}
              {' '}
              {t('«Мобильное» — для телефонов: сниженное разрешение, без теней, дальность ×0.55 и кап 30 FPS.')}
            </p>
          </div>
          {/* v2.0: мобильное управление (GDD 06 §10) */}
          <div className="rounded border border-[#3a2e20] bg-[#211a12]/70 px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#e8d5a8]">{t('Мобильное управление')}</span>
              <span className="text-[11px] text-[#8a8068]">
                {t('сейчас:')} <b className="text-[#c9b06b]">{touchUi ? t('кнопки на экране') : t('клавиатура')}</b>
              </span>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {TOUCH_MODES.map((m) => (
                <button
                  key={m}
                  onClick={() => apply({ touch: m })}
                  aria-pressed={settings.touch === m}
                  className={`rounded border px-2 py-1.5 text-xs transition ${
                    settings.touch === m
                      ? 'border-[#d9a441] bg-[#d9a441]/15 text-[#f5c96b]'
                      : 'border-[#5a4632] text-[#cfc0a0] hover:border-[#8a7a5a]'
                  }`}
                >
                  {t(TOUCH_NAME[m])}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] leading-snug text-[#8a8068]">
              {t('«Авто» включает контролы на сенсорных устройствах. Джойстик — движение, свайп справа — камера, тап по врагу — цель.')}
            </p>
          </div>
          <Row>
            <span className="text-sm text-[#e8d5a8]">FPS</span>
            <span className={`text-sm font-bold tabular-nums ${fps >= 50 ? 'text-[#8fc98a]' : fps >= 40 ? 'text-[#e8c56b]' : 'text-[#e08a6b]'}`}>
              {fps}
            </span>
          </Row>
        </div>
        <div className="flex flex-col gap-2">
          <p className="game-title-font text-xs tracking-[0.25em] text-[#9a8f78]">{t('ЗВУК')}</p>
          <VolSlider label={t('Музыка')} value={settings.musicVol} onChange={(v) => apply({ musicVol: v })} />
          <VolSlider label={t('Эффекты')} value={settings.sfxVol} onChange={(v) => apply({ sfxVol: v })} />
          <VolSlider label={t('Эмбиент')} value={settings.ambVol} onChange={(v) => apply({ ambVol: v })} />
          <VolSlider label={t('Озвучка реплик')} value={settings.voiceVol} onChange={(v) => apply({ voiceVol: v })} />
          <Row>
            <span className="text-sm text-[#e8d5a8]">{t('Голоса реплик (TTS)')}</span>
            <button
              onClick={() => apply({ voiceOn: !settings.voiceOn })}
              className="rounded border border-[#5a4632] px-3 py-1.5 text-xs text-[#cfc0a0] transition hover:border-[#d9a441] hover:text-[#f5c96b]"
            >
              {settings.voiceOn ? t('Включены') : t('Выключены')}
            </button>
          </Row>
          <Row>
            <span className="text-sm text-[#e8d5a8]">{t('Общий звук')}</span>
            <button
              onClick={() => apply({ muted: !settings.muted })}
              className="rounded border border-[#5a4632] px-3 py-1.5 text-xs text-[#cfc0a0] transition hover:border-[#d9a441] hover:text-[#f5c96b]"
            >
              {settings.muted ? t('Выключен') : t('Включён')}
            </button>
          </Row>
        </div>
        {/* v1.6: язык интерфейса */}
        <div className="flex flex-col gap-2">
          <p className="game-title-font text-xs tracking-[0.25em] text-[#9a8f78]">{t('ЯЗЫК / LANGUAGE')}</p>
          <Row>
            <span className="text-sm text-[#e8d5a8]">{t('ЯЗЫК / LANGUAGE')}</span>
            <span className="flex gap-1.5">
              {(['ru', 'en'] as const).map((l) => (
                <LangBtn key={l} l={l} />
              ))}
            </span>
          </Row>
          <p className="text-[11px] leading-snug text-[#8a8068]">
            {t('Интерфейс переключается мгновенно. Реплики и боевые барки озвучиваются на языке интерфейса.')}
          </p>
        </div>
        <KeybindsSection />
      </div>
    </Panel>
  )
}

// ---------------- Фаза 8: титры (GDD 04 §6) ----------------

export function CreditsBody() {
  return (
    <div className="flex flex-col gap-4 text-sm">
      <div className="text-center">
        <p className="game-title-font text-2xl tracking-[0.3em] text-[#f5e6c4]">{t('ЭХО РАЗЛОМА')}</p>
        <p className="mt-1 text-xs tracking-[0.25em] text-[#c9b06b]">{t('ВЕРСИЯ {v} · МОБИЛЬНОЕ УПРАВЛЕНИЕ', { v: GAME_VERSION })}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded border border-[#3a2e20] bg-[#211a12]/70 p-3">
          <p className="game-title-font text-[11px] tracking-[0.25em] text-[#9a8f78]">{t('ВДОХНОВЕНИЯ')}</p>
          <ul className="mt-1.5 space-y-0.5 text-xs text-[#cfc0a0]">
            <li>{t('The Witcher 3 — знаки, контракты, бестиарий')}</li>
            <li>{t('Dragon Age: Origins — отряд и тактическая пауза')}</li>
            <li>{t('Skyrim — мир Севера и крики силы')}</li>
            <li>{t("Baldur's Gate 3 — d20 и броски с кубиком")}</li>
            <li>{t('Gothic 2 — наставники и очки обучения')}</li>
            <li>{t('Mass Effect 2 — диалоги, таймеры, рейд-финал')}</li>
          </ul>
        </div>
        <div className="rounded border border-[#3a2e20] bg-[#211a12]/70 p-3">
          <p className="game-title-font text-[11px] tracking-[0.25em] text-[#9a8f78]">{t('ТЕХНОЛОГИИ')}</p>
          <ul className="mt-1.5 space-y-0.5 text-xs text-[#cfc0a0]">
            <li>{t('Next.js 16 · TypeScript 5 · App Router')}</li>
            <li>{t('Three.js — 3D-мир и свет')}</li>
            <li>{t('Zustand · Tailwind CSS 4 · shadcn/ui')}</li>
            <li>{t('WebAudio — синтез звука и адаптивная музыка')}</li>
            <li>{t('canvas 2D — легаси-рендер и миникарта')}</li>
          </ul>
        </div>
        <div className="rounded border border-[#3a2e20] bg-[#211a12]/70 p-3">
          <p className="game-title-font text-[11px] tracking-[0.25em] text-[#9a8f78]">{t('СИСТЕМЫ')}</p>
          <ul className="mt-1.5 space-y-0.5 text-xs text-[#cfc0a0]">
            <li>{t('d20-ядро, диалоги с проверками и таймерами')}</li>
            <li>{t('Партия: приказы, строи, одобрение, синергии')}</li>
            <li>{t('Шесть доменов со своими правилами')}</li>
            <li>{t('Финал: рейд, суд Пожирателя, 5 концовок')}</li>
            <li>{t('Сейвы с версионированием и автосейв')}</li>
          </ul>
        </div>
        <div className="rounded border border-[#3a2e20] bg-[#211a12]/70 p-3">
          <p className="game-title-font text-[11px] tracking-[0.25em] text-[#9a8f78]">{t('ДОКУМЕНТАЦИЯ')}</p>
          <ul className="mt-1.5 space-y-0.5 text-xs text-[#cfc0a0]">
            <li>{t('GDD v2.0 — 10 документов (docs/GDD)')}</li>
            <li>{t('Видение, лор, мир, системы, роадмап')}</li>
            <li>{t('UI/UX, контент, QA-ворота G0–G8, глоссарий')}</li>
            <li>{t('PDF-книга GDD в docs/')}</li>
          </ul>
        </div>
      </div>
      <p className="text-center text-[11px] italic text-[#8a8068]">
        {t('Фанатский некоммерческий прототип. Все права на упомянутые игры принадлежат их правообладателям.')}
      </p>
    </div>
  )
}

function CreditsPanel() {
  return (
    <Panel title={t('Титры')} wide>
      <CreditsBody />
    </Panel>
  )
}

function MenuBtn({
  children,
  onClick,
  disabled,
  primary,
  danger,
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  primary?: boolean
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded border px-4 py-2.5 text-sm tracking-wider transition ${
        primary
          ? 'border-[#d9a441] bg-[#d9a441]/15 text-[#f5c96b] hover:bg-[#d9a441]/30'
          : danger
            ? 'border-[#c94f3d]/60 bg-[#c94f3d]/10 text-[#e08a6b] hover:bg-[#c94f3d]/25'
            : 'border-[#5a4632] bg-[#211a12]/70 text-[#cfc0a0] hover:border-[#d9a441] hover:text-[#f5c96b]'
      } disabled:cursor-not-allowed disabled:opacity-40`}
    >
      {children}
    </button>
  )
}

function EndingPanel() {
  const ending = useGame((s) => s.ending)
  const romance = useGame((s) => s.romance) // v1.5: тёплые мини-портреты в судьбах
  if (!ending) return null
  return (
    <Panel title={t('КОНЦОВКА: {name}', { name: ending.name })} wide>
      <div className="flex flex-col gap-3">
        <p className="game-title-font text-center text-sm tracking-[0.3em]" style={{ color: ending.color }}>
          {t(ending.name)}
        </p>
        {ending.epilogue.map((p, i) => (
          <p key={i} className={`text-sm leading-relaxed ${i === 0 ? 'text-[#f5c96b]' : 'text-[#cfc0a0]'}`}>
            {t(p)}
          </p>
        ))}
        {ending.fates.length > 0 && (
          <div className="mt-2 flex flex-col gap-2">
            <p className="game-title-font text-[11px] tracking-[0.25em] text-[#8a8068]">{t('СУДЬБЫ ОТРЯДА')}</p>
            {ending.fates.map((f) => (
              <div key={f.name} className="flex items-start gap-3 rounded border border-[#3a2e20] bg-[#211a12]/70 px-3 py-2">
                {(() => {
                  // v1.5: у романсовых судеб — романсовый вариант портрета
                  const rKey = f.name === 'Кайя' ? 'kaya' : f.name === 'Ашер' ? 'asher' : null
                  const src = (rKey && romance[rKey] ? PORTRAIT_ROMANCE[f.name] : undefined) ?? PORTRAIT_IMG[f.name]
                  return src ? (
                    <span className="h-10 w-10 shrink-0 overflow-hidden rounded border border-[#5a4632]">
                      <img src={src} alt={f.name} className="h-full w-full object-cover object-top" draggable={false} />
                    </span>
                  ) : null
                })()}
                <span className="min-w-0">
                  <p className="text-xs font-bold text-[#e8d5a8]">{t(f.name)}</p>
                  <p className="mt-1 text-xs leading-relaxed text-[#9a8f78]">{t(f.text)}</p>
                </span>
              </div>
            ))}
          </div>
        )}
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {ending.stats.map(([k, v]) => (
            <div key={k} className="rounded border border-[#3a2e20] bg-[#211a12]/70 px-3 py-2">
              <p className="text-[11px] text-[#8a8068]">{t(k)}</p>
              <p className="text-sm font-bold text-[#e8d5a8]">{t(v)}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <MenuBtn primary onClick={() => getEngine()?.closePanel()}>
            {t('Свободная игра')}
          </MenuBtn>
          <MenuBtn onClick={() => getEngine()?.openPanel('credits')}>{t('Титры')}</MenuBtn>
          <MenuBtn
            onClick={() => {
              getEngine()?.toTitle()
            }}
          >
            {t('Главное меню')}
          </MenuBtn>
        </div>
      </div>
    </Panel>
  )
}

export default function Panels() {
  useLocale() // v1.6: перерисовка панелей при переключении языка
  const panel = useGame((s) => s.panel)
  if (!panel) return null
  switch (panel) {
    case 'char':
      return <CharPanel />
    case 'inv':
      return <InvPanel />
    case 'journal':
      return <JournalPanel />
    case 'shop':
      return <ShopPanel />
    case 'trainer':
      return <TrainerPanel />
    case 'map':
      return <MapPanel />
    case 'settings':
      return <SettingsPanel />
    case 'credits':
      return <CreditsPanel />
    case 'pause':
      return <PausePanel />
    case 'ending':
      return <EndingPanel />
    default:
      return null
  }
}
