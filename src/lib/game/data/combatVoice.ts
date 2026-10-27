// ============================================================
// ЭХО РАЗЛОМА — боевые реплики (v1.4, GDD 04 §4.3)
// Короткие «барки» в бою: реакции компаньонов (Кайя, Торвальд)
// и угрозы боссов при спавне. Аудио — статичные WAV, заранее
// сгенерированные scripts/gen-combat-voice.ts (TTS: male →
// xiaochen, female → tongtong — те же голоса, что в voice.ts).
// Пул = список вариантов; модуль combatVoice.ts выбирает
// вариант без мгновенного повтора и держит кулдауны.
// ============================================================

export type BarkEvent = 'synergy' | 'down' | 'lowhp' | 'boss' | 'kill' | 'spawn'
export type CompanionId = 'kaya' | 'torvald'

export interface CombatLine {
  /** Идентификатор = имя файла в public/audio/combat/. */
  id: string
  /** Спикер — для отладки/логов (голос зашит в сам WAV). */
  speaker: string
  /** Текст реплики (для E2E-проверок и субтитров-флоатеров). */
  text: string
  /** Путь к статичному WAV. */
  src: string
}

function line(id: string, speaker: string, text: string): CombatLine {
  return { id, speaker, text, src: `/audio/combat/${id}.wav` }
}

// ---------------- Компаньоны ----------------

/** Реплики Кайи и Торвальда по событиям (кроме спавна босса). */
export const COMPANION_LINES: Record<CompanionId, Record<Exclude<BarkEvent, 'spawn'>, CombatLine[]>> = {
  kaya: {
    // «Мороз и Пламя» (синергия с Игни)
    synergy: [
      line('kaya-synergy-1', 'Кайя', 'Мороз и пламя!'),
      line('kaya-synergy-2', 'Кайя', 'Славный взрыв, Смотритель!'),
    ],
    // Компаньон выведен из боя
    down: [line('kaya-down-1', 'Кайя', 'Я... не могу встать...')],
    // Герой при смерти (HP < 30%)
    lowhp: [
      line('kaya-lowhp-1', 'Кайя', 'Ты слишком открыт! Береги себя!'),
      line('kaya-lowhp-2', 'Кайя', 'Ты истекаешь кровью! Отступай!'),
    ],
    // Спавн босса
    boss: [line('kaya-boss-1', 'Кайя', 'Чувствуешь этот холод? Он не отсюда.')],
    // Убийство врага (редкая похвала)
    kill: [
      line('kaya-kill-1', 'Кайя', 'Быстро и чисто.'),
      line('kaya-kill-2', 'Кайя', 'Учишься, да? Неплохо.'),
    ],
  },
  torvald: {
    // «Стена и Молот» (синергия с Аардом)
    synergy: [
      line('torvald-synergy-1', 'Торвальд', 'Стена и молот!'),
      line('torvald-synergy-2', 'Торвальд', 'Вот это удар, парень!'),
    ],
    down: [line('torvald-down-1', 'Торвальд', 'Щит... треснул...')],
    lowhp: [
      line('torvald-lowhp-1', 'Торвальд', 'Ты на ладан дышишь! За мою спину!'),
      line('torvald-lowhp-2', 'Торвальд', 'Кровь льёт! Прикройся щитом!'),
    ],
    boss: [line('torvald-boss-1', 'Торвальд', 'Держи строй! За мою спину!')],
    kill: [
      line('torvald-kill-1', 'Торвальд', 'Ха! Одним махом.'),
      line('torvald-kill-2', 'Торвальд', 'Так их, парень!'),
    ],
  },
}

// ---------------- Угрозы боссов при спавне ----------------

/** Ключ = enemyType (см. findActiveBoss). */
export const BOSS_SPAWN_LINES: Record<string, CombatLine[]> = {
  // Пожиратель Эха (финал, Сердце Разлома)
  boss: [
    line('boss-devourer-1', 'Пожиратель Эха', 'Ты — эхо. А я — гул, что стирает эхо.'),
    line('boss-devourer-2', 'Пожиратель Эха', 'Твой мир уже во мне.'),
  ],
  // Пожиратель Бурь — дракон Иммолтакс (Стылое Пределье)
  dragon: [line('boss-dragon-1', 'Пожиратель Бурь', 'Кто... тревожит... гнездо...')],
  // Гхарз Кровавый Пёс (Спорные Земли)
  horde_chief: [
    line('boss-gharz-1', 'Гхарз', 'Мясо пришло само!'),
    line('boss-gharz-2', 'Гхарз', 'Семя сожрёт твой крик!'),
  ],
  // Мастер Ямы (арена Гранитной Долины)
  pit_master: [
    line('boss-pit-1', 'Мастер Ямы', 'Ещё мясо на мою арену!'),
    line('boss-pit-2', 'Мастер Ямы', 'Умри красиво, крыса!'),
  ],
  // Мор-Мать (Багровая Мара)
  blight_mother: [line('boss-blight-1', 'Мор-Мать', 'Плоть... гниёт... и служит...')],
  // Материарх Пепла (Вельд)
  ash_mother: [line('boss-ash-1', 'Материарх Пепла', 'Пепел к пеплу, мясо — к куче!')],
  // Капитан «Двенадцатого» (Внешний Рубеж)
  rb_captain: [
    line('boss-captain-1', 'Капитан', 'Чужак на плато. Открываю огонь.'),
    line('boss-captain-2', 'Капитан', 'Двенадцатый не отступает.'),
  ],
}

/** Все реплики списком (для прелоада и E2E). */
export function allCombatLines(): CombatLine[] {
  const out: CombatLine[] = []
  for (const c of Object.values(COMPANION_LINES)) {
    for (const pool of Object.values(c)) out.push(...pool)
  }
  for (const pool of Object.values(BOSS_SPAWN_LINES)) out.push(...pool)
  return out
}
