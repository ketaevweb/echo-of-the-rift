// ============================================================
// ЭХО РАЗЛОМА — Финал (Фаза 7, GDD 01 §6 / 07 §7)
// Рейд в Сердце Разлома: 4 волны + роли отряда (ME2), матрица
// выживания, суд Пожирателя Эха (не HP-бой) и 5 концовок.
// Канон имён — GDD 09 §3.
// ============================================================

/** Сердце Разлома: арена рейда (точка сбора волн и суда). */
export const RAID_HEART = { x: 2950, y: 270 }
/** Радиус триггера начала рейда от сердца. */
export const RAID_TRIGGER = 400
/** Пауза между волнами рейда, сек. */
export const RAID_BREAK = 7

/**
 * Состав волн рейда (MQ-08). Каждая волна соответствует роли
 * из GDD 07 §7: 1 Авангард · 2 Артиллерия · 3 Медик/Слово ·
 * 4 Проводник. Враги — эхо-твари из построенных доменов.
 */
export const RAID_WAVES: string[][] = [
  ['horror', 'horror', 'horror'], // 1 Авангард: вихри Разлома в упор
  ['ash_shade', 'ash_shade', 'ash_shade', 'hexer'], // 2 Артиллерия: эхо-тени и колдун
  ['abomination', 'ghoul', 'ghoul'], // 3 Медик/Слово: мор-твари жрут павших
  ['draugr', 'draugr', 'horror', 'horror'], // 4 Проводник: смешанный шторм
]

// ---------------- Роли и лояльности ----------------

/** Роль компаньона в рейде (GDD 07 §7): номер волны, за которую он отвечает. */
export const RAID_ROLES = {
  torvald: { role: 'Авангард', wave: 1 },
  kaya: { role: 'Артиллерия', wave: 2 },
} as const

export type CompanionId = keyof typeof RAID_ROLES

/**
 * Лояльность (ME2) — адаптация GDD к построенному контенту:
 * личная миссия компаньона уже лежит в флагах доменов.
 *  Торвальд — «пока держится сталь»: Бастион Ветвей удержан (Мара).
 *  Кайя — «голос из рощи»: учитель-Садовник спасён — Роща цветёт (Спорные).
 */
export const LOYALTY_FLAG: Record<CompanionId, string> = {
  torvald: 'bastionHeld',
  kaya: 'groveSaved',
}

// ---------------- Пороги концовок (числа GDD 01 §6) ----------------

/** Ключей-осколков в билде: 6 канонных K1–K6 (после Фазы 6.5) + ключ Оплота. */
export const KEYS_ALL = ['key_valley', 'key_veld', 'key_granite', 'key_frost', 'key_mara', 'key_disputed', 'key_rubezh']
/** Порог концовок (GDD 01 §6: «Ключей 6/6»). */
export const KEYS_GOAL = 6
/** Порог средней одобрения для «Зари». */
export const APPROVAL_GOAL = 40
/** Порог Тиши для катастрофы. */
export const SILENCE_DOOM = 75

// ---------------- Судьбы компаньонов (эпилог, 3 варианта × N) ----------------

export interface FateLine {
  id: string
  name: string
  text: string
}

/** Судьба компаньона в эпилоге: погиб / жив-герой / жив-сломлен. */
export function companionFates(ctx: { flags: Record<string, boolean> }): FateLine[] {
  const out: FateLine[] = []
  for (const id of ['kaya', 'torvald'] as CompanionId[]) {
    const dead = !!ctx.flags[`${id}Dead`]
    const loyal = !!ctx.flags[LOYALTY_FLAG[id]]
    if (dead) {
      out.push(
        id === 'kaya'
          ? { id: 'kaya', name: 'Кайя', text: 'Кайя легла в Сердце Разлома — её эхо ушло в Ядро вместе с чужими мирами. В Роще теперь поют и о ней.' }
          : { id: 'torvald', name: 'Торвальд', text: 'Торвальд принял смерть как дозорный: лицом к волне. Его щит стоит у ворот Хеймхолла — вместо надгробия.' },
      )
    } else if (loyal) {
      out.push(
        id === 'kaya'
          ? { id: 'kaya', name: 'Кайя', text: 'Кайя вернулась в Рощу — учитель узнал её. Теперь она учит садовников слышать лес, а её смех снова звучит как колокольчик.' }
          : { id: 'torvald', name: 'Торвальд', text: 'Торвальд допил кружку до дна и остался: стена Бастиона держалась — значит, и он ещё держится. Лучшего щита долине не найти.' },
      )
    } else {
      out.push(
        id === 'kaya'
          ? { id: 'kaya', name: 'Кайя', text: 'Кайя выжила, но Рощу не спасла. Она улыбается реже: где-то в её голове теперь тихий шёпот паразита — и она слушает его молча.' }
          : { id: 'torvald', name: 'Торвальд', text: 'Торвальд выжил, но Бастион для него — шрам. Он пьёт молча и смотрит на восток, где стена, которую он не удержал.' },
      )
    }
  }
  // Фаза 6.5: судьба Ашера (LOY-05) — третья строка судеб (ME2: подготовка решает эпилог)
  if (ctx.flags.asherLoyal) {
    out.push({
      id: 'asher',
      name: 'Ашер',
      text: 'Ашер вернулся на «Двенадцатый» — уже не один. Экипаж, брошенный 12 лет назад, похоронен по именам, а его дроны теперь сторожат не полосу, а людей.',
    })
  } else {
    out.push({
      id: 'asher',
      name: 'Ашер',
      text: 'Ашер остался на плато: чинить корабль, который уже не взлетит, и ждать ещё одну дюжину лет. Имена экипажа он выучил сам — вслух, по ночам.',
    })
  }
  return out
}

// ---------------- 5 концовок (GDD 01 §6, числа) ----------------

export interface EndingDef {
  id: string
  name: string
  color: string
  /** Условия без учёта явного выбора в суде (Эхо — всегда по выбору). */
  check?: (s: EndingState) => boolean
  intro: string[]
}

/** Снимок мира для проверки условий концовок. */
export interface EndingState {
  keys: number
  avgApproval: number
  loyalCount: number
  silence: number
  secrets: boolean
}

/** Тайны (для «Раскола вечности»): Семя благословлено + шёпот углей Гхарза выслушан. */
export function endingState(ctx: {
  flags: Record<string, boolean>
  approval: { kaya: number; torvald: number }
  silence: number
}): EndingState {
  // Фаза 6.5: Ашер (LOY-05) — третья лояльность; пороги (>=2) остались каноном билда
  const loyalCount = (['kaya', 'torvald'] as CompanionId[]).filter((id) => !!ctx.flags[LOYALTY_FLAG[id]]).length + (ctx.flags.asherLoyal ? 1 : 0)
  return {
    keys: KEYS_ALL.filter((k) => !!ctx.flags[k]).length,
    avgApproval: Math.round((ctx.approval.kaya + ctx.approval.torvald) / 2),
    loyalCount,
    silence: ctx.silence,
    secrets: !!ctx.flags.seedBlessed && !!ctx.flags.emberTalk,
  }
}

export const ENDINGS: Record<string, EndingDef> = {
  rift_of_eternity: {
    id: 'rift_of_eternity',
    name: 'Раскол вечности',
    color: '#f5e6b8',
    check: (s) => s.keys >= KEYS_GOAL && s.loyalCount >= 2 && s.secrets && s.silence <= 30,
    intro: [
      'Ты знаешь то, чего не знает никто: как зовут каждое эхо. Ты выслушал угли, благословил Семя, держал стену и не продал ни одного имени.',
      'Пожиратель отступает — перед ним не Эхорождённый, а весь мир сразу. Ядро рассыпается на шесть граней... и ни одна из них больше не подчиняется ему.',
    ],
  },
  dawn: {
    id: 'dawn',
    name: 'Заря',
    color: '#f5c96b',
    check: (s) => s.keys >= KEYS_GOAL && s.avgApproval >= APPROVAL_GOAL && s.loyalCount >= 2 && s.silence <= 40,
    intro: [
      'Шесть осколков поют в лад — Ядро собирается, как разбитая чашка, которую склеили руками тех, кто помнит каждый скол.',
      'Мир рождается заново. Отряд стоит рядом: живые, верные, услышанные.',
    ],
  },
  seal: {
    id: 'seal',
    name: 'Печать',
    color: '#d9a441',
    check: (s) => s.keys >= 4 && s.silence <= 60,
    intro: [
      'Разлом затягивается швом из чужих правил. Тишь уходит глубже — но и эхо уходят вместе с ним.',
      'Мир жив. Память миров — под замком, ключ выброшен.',
    ],
  },
  silence: {
    id: 'silence',
    name: 'Тишь',
    color: '#8a8068',
    check: (s) => s.silence >= SILENCE_DOOM,
    intro: [
      'Ты слишком часто выбирал дешевле слов. Тишь пришла не врагом — она пришла как счёт.',
      'Краски гаснут не вспышкой, а выдохом. Гексмарк пуст. Никто не помнит, что забыл.',
    ],
  },
  echo: {
    id: 'echo',
    name: 'Эхо',
    color: '#a06bd9',
    intro: [
      'Ты вливаешься в Ядро — сам, по своей воле. Пустота принимает тебя, как принимала предыдущего.',
      'Теперь ты — порог между мирами. Хранитель-Пожиратель: тот, кто помнит всё и не может сказать ни слова.',
    ],
  },
}
