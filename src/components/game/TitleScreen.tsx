'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ChevronDown, ChevronUp, Play, RotateCcw, ScrollText, Swords, X } from 'lucide-react'
import { boot, ORIGINS, useGame } from '@/lib/game/store'
import { setLocale, t, useLocale } from '@/lib/game/i18n'
import { CreditsBody } from './Panels'
import { GameIcon } from './GameIcon'
import { T } from './T'

const INSPIRED = ['The Witcher 3', 'Dragon Age: Origins', 'Skyrim', "Baldur's Gate 3", 'Gothic 2', 'Mass Effect 2']

const FEATURES = [
  'Бой в реальном времени с тактической паузой',
  'Отряд из двух спутников с приказами',
  'Знаки ведьмака: Игни, Аард, Квен, Аксий',
  'Система d20: броски атаки, криты, проверка убеждения',
  'Наставники и очки обучения — как в Готике',
  'Фракции: Орден Пламени или Ковен Тумана',
  'Контракт на монстра, бестиарий и боссфайт с диалогом',
  'Происхождения, таймер-выборы и Тишь (выборы видны в мире)',
]

export default function TitleScreen() {
  const hasSave = useGame((s) => s.hasSave)
  const locale = useLocale()
  const [confirmNew, setConfirmNew] = useState(false)
  const [showControls, setShowControls] = useState(false)
  const [showCredits, setShowCredits] = useState(false)
  const [origin, setOrigin] = useState(boot.origin)

  const start = (mode: 'new' | 'continue') => {
    boot.mode = mode
    boot.origin = origin
    useGame.getState().setScreen('game')
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#12100c] text-[#e8d5a8]">
      {/* Фон */}
      <div className="absolute inset-0">
        <Image
          src="/images/title-splash.png"
          alt={t('Смотритель с серебряным клинком над северной долиной')}
          fill
          priority
          className="object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#12100c] via-[#12100c]/40 to-[#12100c]/70" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#12100c]/80 via-transparent to-transparent" />
      </div>

      {/* Контент */}
      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-6 py-10 sm:px-10">
        <div className="max-w-2xl">
          <p className="game-title-font text-sm tracking-[0.4em] text-[#c9b06b]">{t('ХРОНИКИ СЕВЕРНОЙ ДОЛИНЫ')}</p>
          <h1 className="game-title-font mt-3 text-5xl font-bold leading-none text-[#f5e6c4] drop-shadow-[0_4px_24px_rgba(0,0,0,0.9)] sm:text-7xl">
            {t('ЭХО РАЗЛОМА')}
          </h1>
          <p className="mt-1.5 text-xs tracking-[0.3em] text-[#9a8f78]">{t('ВЕРСИЯ 1.8')}</p>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#cfc0a0] sm:text-base">
            {t(
              "РПГ-прототип, сотканный из шести великих игр: ведьмачьи знаки и контракты, тактический отряд Dragon Age, северный мир и крики силы, кубики d20 Baldur's Gate, наставники Готики и диалоги в духе Mass Effect.",
            )}
          </p>

          {/* Происхождение (Фаза 5): выбор героя для новой игры */}
          {(!hasSave || confirmNew) && (
            <div className="mt-6 max-w-xl">
              <p className="game-title-font text-xs tracking-[0.35em] text-[#c9b06b]">{t('ПРОИСХОЖДЕНИЕ СМОТРИТЕЛЯ')}</p>
              <p className="mt-1 text-[11px] text-[#8a8068]">{t('Открывает уникальные реплики в диалогах. Выбор — только для новой игры.')}</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {ORIGINS.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => setOrigin(o.id)}
                    aria-pressed={origin === o.id}
                    className={`rounded border p-3 text-left transition ${
                      origin === o.id
                        ? 'border-[#d9a441] bg-[#d9a441]/15 shadow-[0_0_18px_rgba(217,164,65,0.15)]'
                        : 'border-[#5a4632] bg-[#181410]/85 hover:border-[#8a7a5a]'
                    }`}
                  >
                    <span className={`flex items-center gap-1.5 text-sm font-semibold ${origin === o.id ? 'text-[#f5c96b]' : 'text-[#e8d5a8]'}`}>
                      <GameIcon
                        name={o.id === 'warden' ? 'Shield' : o.id === 'exile' ? 'Footprints' : 'Flame'}
                        className={`h-3.5 w-3.5 ${origin === o.id ? 'text-[#d9a441]' : 'text-[#8a8068]'}`}
                      />
                      {t(o.name)}
                    </span>
                    <span className="mt-1 block text-[11px] leading-snug text-[#a89a7d]">{t(o.desc)}</span>
                    <span className="mt-1.5 block text-[10px] italic text-[#8a8068]">{t(o.tag)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Кнопки */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            {hasSave && !confirmNew ? (
              <>
                <button
                  onClick={() => start('continue')}
                  className="group flex items-center justify-center gap-2 rounded border border-[#d9a441] bg-[#d9a441]/15 px-6 py-3 text-sm font-semibold tracking-wider text-[#f5c96b] transition hover:bg-[#d9a441]/30"
                >
                  <Play className="h-4 w-4" /> {t('ПРОДОЛЖИТЬ')}
                </button>
                <button
                  onClick={() => setConfirmNew(true)}
                  className="flex items-center justify-center gap-2 rounded border border-[#5a4632] bg-[#241c14]/80 px-6 py-3 text-sm font-semibold tracking-wider text-[#cfc0a0] transition hover:border-[#d9a441] hover:text-[#f5c96b]"
                >
                  <RotateCcw className="h-4 w-4" /> {t('НОВАЯ ИГРА')}
                </button>
              </>
            ) : confirmNew ? (
              <>
                <span className="text-sm text-[#e0a878]">{t('Старое сохранение будет перезаписано.')}</span>
                <button
                  onClick={() => start('new')}
                  className="rounded border border-[#c94f3d] bg-[#c94f3d]/15 px-6 py-3 text-sm font-semibold tracking-wider text-[#e08a6b] transition hover:bg-[#c94f3d]/30"
                >
                  {t('ДА, НАЧАТЬ ЗАНОВО')}
                </button>
                <button
                  onClick={() => setConfirmNew(false)}
                  className="rounded border border-[#5a4632] px-4 py-3 text-sm text-[#9a8f78] hover:text-[#e8d5a8]"
                >
                  {t('Отмена')}
                </button>
              </>
            ) : (
              <button
                onClick={() => start('new')}
                className="group flex items-center justify-center gap-2 rounded border border-[#d9a441] bg-[#d9a441]/15 px-8 py-3 text-base font-semibold tracking-[0.2em] text-[#f5c96b] transition hover:bg-[#d9a441]/30"
              >
                <Swords className="h-5 w-5" /> {t('НАЧАТЬ ПУТЬ')}
              </button>
            )}
          </div>

          {/* Управление и титры (Фаза 8) */}
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <button
              onClick={() => setShowControls((v) => !v)}
              className="flex items-center gap-2 text-xs tracking-widest text-[#9a8f78] transition hover:text-[#d9a441]"
            >
              {showControls ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {t('УПРАВЛЕНИЕ И ОСОБЕННОСТИ')}
            </button>
            <button
              onClick={() => setShowCredits(true)}
              className="flex items-center gap-2 text-xs tracking-widest text-[#9a8f78] transition hover:text-[#d9a441]"
            >
              <ScrollText className="h-4 w-4" />
              {t('ТИТРЫ')}
            </button>
          </div>
          {showControls && (
            <div className="mt-3 grid max-w-xl gap-4 rounded border border-[#5a4632]/70 bg-[#181410]/90 p-4 text-xs text-[#cfc0a0] sm:grid-cols-2">
              <div>
                <p className="mb-2 font-semibold text-[#d9a441]">{t('Клавиши')}</p>
                <ul className="space-y-1">
                  <li><T k="WASD / ЛКМ — движение" /></li>
                  <li><T k="ЛКМ по врагу — выбрать цель" /></li>
                  <li><T k="1–4 — знаки, 5 — Голос Древних" /></li>
                  <li><T k="Q / E — зелья, F — говорить/осмотреть" /></li>
                  <li><T k="Пробел — тактическая пауза и приказы" /></li>
                  <li><T k="V — строй отряда (клин/линия), Tab — цель" /></li>
                  <li><T k="C / I / J / M — персонаж, инвентарь, журнал, карта" /></li>
                  <li><T k="Esc — меню" /></li>
                </ul>
              </div>
              <div>
                <p className="mb-2 font-semibold text-[#d9a441]">{t('Что внутри')}</p>
                <ul className="space-y-1">
                  {FEATURES.map((f) => (
                    <li key={f}>• {t(f)}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Титры (Фаза 8) */}
      {showCredits && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="game-panel game-scroll max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-lg p-5">
            <div className="mb-3 flex items-center justify-between border-b border-[#5a4632] pb-3">
              <h2 className="game-title-font text-lg tracking-[0.25em] text-[#f5c96b]">{t('ТИТРЫ')}</h2>
              <button
                onClick={() => setShowCredits(false)}
                className="rounded border border-[#5a4632] p-1.5 text-[#9a8f78] transition hover:border-[#d9a441] hover:text-[#f5c96b]"
                aria-label={t('Закрыть титры')}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <CreditsBody />
          </div>
        </div>
      )}

      {/* Нижняя строка */}
      <footer className="absolute inset-x-0 bottom-0 z-10 border-t border-[#5a4632]/50 bg-[#12100c]/80 px-6 py-3 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#8a8068]">
          {/* v1.6: переключатель языка интерфейса */}
          <span className="flex items-center gap-1">
            {(['ru', 'en'] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLocale(l)}
                aria-pressed={locale === l}
                aria-label="Переключить язык / Toggle language"
                className={`rounded border px-2 py-0.5 font-semibold tracking-widest transition ${
                  locale === l
                    ? 'border-[#d9a441] bg-[#d9a441]/15 text-[#f5c96b]'
                    : 'border-[#5a4632] text-[#8a8068] hover:border-[#8a7a5a] hover:text-[#cfc0a0]'
                }`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </span>
          <span className="flex items-center gap-1 text-[#b09a6a]">
            <GameIcon name="Flame" className="h-3.5 w-3.5" /> {t('Фанатский прототип, вдохновлённый:')}
          </span>
          {INSPIRED.map((i) => (
            <span key={i} className="rounded bg-[#241c14] px-2 py-0.5">
              {i}
            </span>
          ))}
        </div>
      </footer>
    </div>
  )
}
