import { DialogueTree, PortraitDef } from '../types'

export const PORTRAITS: Record<string, PortraitDef> = {
  Бьорн: { icon: 'Crown', color: '#d9a441', title: 'Старейшина Хеймхолла' },
  Грим: { icon: 'Coins', color: '#c9b06b', title: 'Торговец' },
  Дорн: { icon: 'GraduationCap', color: '#b08356', title: 'Наставник' },
  Ирма: { icon: 'Flame', color: '#d96b3a', title: 'Капитан Ордена Пламени' },
  Селена: { icon: 'MoonStar', color: '#9a7fc0', title: 'Архимаг Ковена Тумана' },
  Кайя: { icon: 'Sparkles', color: '#9fb8a4', title: 'Магистр-странница' },
  Торвальд: { icon: 'ShieldHalf', color: '#7a8a4a', title: 'Воитель' },
  'Древний Алтарь': { icon: 'Landmark', color: '#c9b06b', title: 'Камни Древних' },
  'Пожиратель Бурь': { icon: 'Skull', color: '#a06bd9', title: 'Голос из Разлома' },
  Альра: { icon: 'FlaskConical', color: '#7a9a6a', title: 'Алхимик Хеймхолла' },
  'Доска объявлений': { icon: 'ScrollText', color: '#c9b06b', title: 'Контракты Хеймхолла' },
}

export const DIALOGUES: Record<string, DialogueTree> = {
  // ---------------- Доска объявлений (Фаза 3: контракты W3) ----------------
  notice_board: {
    id: 'notice_board',
    start: () => 'board',
    nodes: {
      board: {
        speaker: 'Доска объявлений',
        role: 'Хеймхолл',
        text: 'Несколько листов прибито гвоздями. Свежий, на обрывке пепельной бумаги, начеркан углём: «Топы уносят скот. Дети перестали ходить к камышам. Кто положит конец — будет щедро одарён».',
        choices: [
          {
            text: '«ПЕПЕЛЬНАЯ МАТЬ»: награда за голову твари из Вельда. (Взять контракт)',
            cond: 'quest.veld<1',
            action: 'quest:veld:1;bestiary:ash_mother',
            goto: 'accepted',
          },
          { text: 'Перечитать контракт.', cond: 'quest.veld>=1,quest.veld<4', goto: 'hint' },
          { text: '(Изучить примечание бестиария на полях)', goto: 'hint' },
          { text: 'Отойти.', goto: null },
        ],
      },
      accepted: {
        speaker: 'Доска объявлений',
        text: '«Тварь зовут Пепельной Матерью. Начни от Врат Тумана на юге: по следам выйдешь к её кургану за Гнилыми Топями. Доказательство — пепельное сердце — отнеси Альре, она хранит награду». Внизу приписка: «Спектры не любят масла против спектров».',
        choices: [{ text: 'Запомнить. (Юг, Врата Тумана)', goto: null }],
      },
      hint: {
        speaker: 'Доска объявлений',
        text: '«Спектры не любят масла против спектров. Пепел взрывается — читай землю: круг на земле значит беги. Не дай окружить себя в камышах».',
        choices: [{ text: 'Полезно знать.', goto: null }],
      },
    },
  },

  // ---------------- Альра, алхимик (Фаза 3) ----------------
  alchemist_alra: {
    id: 'alchemist_alra',
    start: (ctx) => {
      const v = ctx.quest('veld')
      if (v.stage === 3 && ctx.has('ash_heart')) return 'turnin'
      if (v.stage >= 1 && v.stage < 3) return 'progress'
      if (v.done) return 'after'
      return 'greet'
    },
    nodes: {
      greet: {
        speaker: 'Альра',
        text: 'Смотритель, говорят. Хорошо. Мои настойки стоят дороже гримовых, зато от них не отваливаются пальцы. Масла, зелья — подходи.',
        choices: [
          { text: 'Показать товары.', tag: 'Торговля', action: 'open:shop:alra', goto: null },
          { text: 'Что ты знаешь о Вельде?', goto: 'veld_lore' },
          { text: 'До встречи.', goto: null },
        ],
      },
      veld_lore: {
        speaker: 'Альра',
        text: 'Юг, за Хребтом — Вельд. Топы, туман и твари, которых я не берусь называть. Если пойдёшь — возьми масло: на тварей или на спектры, смотря что у тебя на ужин. Наносится на клинок, держится четыре минуты.',
        choices: [
          { text: 'Показать товары.', tag: 'Торговля', action: 'open:shop:alra', goto: null },
          { text: 'Спасибо.', goto: null },
        ],
      },
      progress: {
        speaker: 'Альра',
        text: 'Идёшь по контракту? Следы начни искать сразу за Вратами — тварь не таится, она хозяйка там. Принесёшь пепельное сердце — награда твоя.',
        choices: [
          { text: 'Показать товары.', tag: 'Торговля', action: 'open:shop:alra', goto: null },
          { text: 'Иду.', goto: null },
        ],
      },
      turnin: {
        speaker: 'Альра',
        text: 'Ты пахнешь пеплом и... оно ещё тлеет! Пепельное сердце Матери, живьём. Деревня будет дышать спокойно. Держи обещанное — и вот, масло спектров, по-соседски.',
        choices: [
          {
            text: '(Отдать Пепельное сердце — 220 золота и опыт)',
            action: 'take:ash_heart:1;gold:220;xp:260;give:oil_specter:1;quest:veld:4;silence:-2',
            goto: 'turnin_done',
          },
          { text: 'Позже.', goto: null },
        ],
      },
      turnin_done: {
        speaker: 'Альра',
        text: 'Вельд не станет добрее, но сегодня дети дойдут до камышей и вернутся. Заходи, Смотритель — у меня всегда есть работа и всегда есть масло.',
        choices: [{ text: 'До встречи.', goto: null }],
      },
      after: {
        speaker: 'Альра',
        text: 'Легенда живая ходит по деревне. Масла, зелья — как всегда, по-соседски.',
        choices: [
          { text: 'Показать товары.', tag: 'Торговля', action: 'open:shop:alra', goto: null },
          { text: 'До встречи.', goto: null },
        ],
      },
    },
  },

  // ---------------- Старейшина Бьорн ----------------
  elder_bjorn: {
    id: 'elder_bjorn',
    start: (ctx) => {
      const q = ctx.quest('main')
      if (q.done) return 'thanks'
      if (q.stage >= 5) return 'final'
      if (q.stage === 4) return 'proof_remind'
      if (q.stage === 3) return 'stones_remind'
      if (q.stage === 2) return 'forest_remind'
      return 'greet'
    },
    nodes: {
      greet: {
        speaker: 'Бьорн',
        text: 'Ты из Смотрителей? Хорошо. Небо над Хеймхоллом треснуло три ночи назад. Из дыры лезут волки размером с медведя и твари, которых я не назову. Долине нужен тот, кто умеет убивать такое.',
        choices: [
          { text: 'Что за дыра в небе?', goto: 'lore' },
          {
            text: '(Дозорный) Смотритель Дозора, четвёртая смена у Хребта. Я видел, как рассвет над Хеймхоллом трескался один раз уже.',
            origin: 'warden',
            cond: 'origin:warden',
            tag: 'Происхождение',
            action: 'xp:30;flag:origin_told;silence:-2',
            goto: 'origin_warden',
          },
          { text: 'Я возьмусь. Что нужно делать?', action: 'quest:main:2;xp:25', goto: 'accept' },
          { text: 'До встречи.', goto: null },
        ],
      },
      origin_warden: {
        speaker: 'Бьорн',
        text: 'Четвёртая смена... Значит, ты знал старого Хаммела. Он носил тот же знак Дозора, что и мой дед. Дозор не забыл дорогу к Хеймхоллу — да поможет тебе и его память, Смотритель.',
        choices: [
          { text: 'Его память — со мной.', goto: 'lore' },
          { text: 'Я возьмусь. Что нужно делать?', action: 'quest:main:2;xp:25', goto: 'accept' },
        ],
      },
      lore: {
        speaker: 'Бьорн',
        text: 'Старики зовут это Разломом. Говорят, за ним — миры, где магия жжёт небо, а разум пожирает плоть. Мы запирали его Камнями Древних веками. Теперь печать слаба. Что-то тянет оттуда силу... и голод.',
        choices: [
          { text: 'Я возьмусь. Что нужно делать?', action: 'quest:main:2;xp:25', goto: 'accept' },
          { text: 'Хм. Надо подумать.', action: 'silence:+2', goto: null },
        ],
      },
      accept: {
        speaker: 'Бьорн',
        text: 'Начни с Сумрачного леса на северо-западе. Волки озверели — режут скот и людей. Разберись со стаей, а там я пойму, что за сила шевелится в Разломе.',
        choices: [{ text: 'Лес так лес. (Получить задание)', goto: null }],
      },
      forest_remind: {
        speaker: 'Бьорн',
        text: 'Лес на северо-западе, Смотритель. Пока волки режут овец — долина не поверит в своего героя.',
        choices: [{ text: 'Иду.', goto: null }],
      },
      stones_remind: {
        speaker: 'Бьорн',
        text: 'Хорошая работа в лесу. Теперь к Камням Древних — там видели двух странников, магов, что чтят старую печать. Найди общий язык.',
        choices: [{ text: 'Уже иду.', goto: null }],
      },
      proof_remind: {
        speaker: 'Бьорн',
        text: 'Путь к Разлому откроют только тому, кого признает долина. Вожак стаи, главарь бандитов... или лунные травы для Ковена — выбирай.',
        choices: [{ text: 'Понял.', goto: null }],
      },
      final: {
        speaker: 'Бьорн',
        text: 'Ты идёшь прямо к Разлому? Тогда возьми. Это всё, чем Хеймхолл может помочь — остальное зависит от твоего клинка.',
        choices: [
          { text: '(Взять припасы)', cond: '!flag.elderAid', action: 'give:potion_heal:2;gold:50;flag:elderAid;xp:30', goto: 'final_after' },
          { text: 'Всё, что я должен знать?', cond: 'flag.elderAid', goto: 'final_after' },
        ],
      },
      final_after: {
        speaker: 'Бьорн',
        text: 'Если увидишь Пожирателя — не слушай его голос. Он говорит чужими устами. Удачи, Смотритель.',
        choices: [{ text: 'Расскажи, что за Пожиратель.', goto: 'final_lore' }, { text: 'Уже ухожу.', goto: null }],
      },
      final_lore: {
        speaker: 'Бьорн',
        text: 'Наш прадед запирал Разлом словом силы. Голос Древних на алтаре у Камней — твоя лучшая ставка. А его слуги жгутся как солома: держи огонь наготове.',
        choices: [{ text: 'Спасибо.', goto: null }],
      },
      thanks: {
        speaker: 'Бьорн',
        text: 'Разлом затих, и сны вернулись к людям. Хеймхолл запомнит тебя, Смотритель. Возьми — клинок старой работы, он ждал хозяина вроде тебя.',
        choices: [
          { text: '(Принять Рунный клинок)', cond: '!flag.elderReward', action: 'give:sword_rune:1;gold:150;xp:300;flag:elderReward', goto: 'thanks2' },
          { text: 'Служу долине.', cond: 'flag.elderReward', goto: null },
        ],
      },
      thanks2: {
        speaker: 'Бьорн',
        text: 'Что теперь? Долина большая. Бандиты, волки, туман над озером... Смотрителю всегда найдётся работа.',
        choices: [{ text: 'Поживём — увидим.', goto: null }],
      },
    },
  },

  // ---------------- Торговец Грим ----------------
  merchant_grim: {
    id: 'merchant_grim',
    start: (ctx) => (ctx.flag('contractGiven') && !ctx.flag('contractDone') && ctx.has('alpha_pelt') ? 'turnin' : 'greet'),
    nodes: {
      greet: {
        speaker: 'Грим',
        text: 'Ага, свежее лицо! Хочешь глянуть товар? А ещё у меня висит контракт — зверь режет овец у леса. Плата честная.',
        choices: [
          {
            text: '(Изгнанник Колонии) Грим? Грим Зольный, ладонь-весы из Нижнего яруса? Меня выставили из Колонии раньше, чем тебя повысили.',
            origin: 'exile',
            cond: 'origin:exile',
            tag: 'Происхождение',
            action: 'xp:30;flag:origin_told;silence:-2',
            goto: 'origin_exile',
          },
          { text: 'Покажи, что есть.', tag: 'Торговля', action: 'open:shop', goto: null },
          { text: 'Расскажи про контракт.', cond: '!flag.contractGiven', goto: 'contract' },
          { text: 'Расскажи про контракт.', cond: 'flag.contractGiven,!flag.contractDone', goto: 'contract_wait' },
          { text: 'Есть новости?', goto: 'rumors' },
          { text: 'До встречи.', goto: null },
        ],
      },
      origin_exile: {
        speaker: 'Грим',
        text: 'Зольный... Да ты что — изгонённый из Колонии, как и я! Никто не помнит, что мы платили за выход: всё, что имело вес. Такому, как мы, Хеймхолл — второй шанс. Держи скидку по-землячески, и заходи.',
        choices: [
          { text: 'Покажи, что есть.', tag: 'Торговля', action: 'open:shop', goto: null },
          { text: 'Расскажи про контракт.', cond: '!flag.contractGiven', goto: 'contract' },
          { text: 'Есть новости?', goto: 'rumors' },
        ],
      },
      turnin: {
        speaker: 'Грим',
        text: 'Мои глаза! Это же она — лютая волчица! Овцы могут спать спокойно. Держи обещанное, Смотритель.',
        choices: [
          { text: '(Отдать шкуру — 120 золота)', action: 'take:alpha_pelt:1;gold:120;xp:150;flag:contractDone;quest:contract:3', goto: 'turnin_done' },
        ],
      },
      turnin_done: {
        speaker: 'Грим',
        text: 'Заходи ещё — свежий стальной клинок как раз по руке охотнику.',
        choices: [
          { text: 'Покажи товар.', tag: 'Торговля', action: 'open:shop', goto: null },
          { text: 'Позже.', goto: null },
        ],
      },
      contract: {
        speaker: 'Грим',
        text: 'Огромная волчица, белёсый загривок, глаз горит как уголёк. Пастухи зовут её Лютой. За шкуру — 120 золотых. В бестиарии пишут: старый зверь боится открытого огня. Игни, если у тебя ведьмачьи замашки.',
        choices: [
          { text: '(Взять контракт)', action: 'quest:contract:1;flag:contractGiven;xp:15', goto: 'contract_taken' },
          { text: 'Не мой профиль.', goto: null },
        ],
      },
      contract_taken: {
        speaker: 'Грим',
        text: 'Ищи её в глубине Сумрачного леса, у костей. И не жалей огня!',
        choices: [{ text: 'Жди вестей.', goto: null }],
      },
      contract_wait: {
        speaker: 'Грим',
        text: 'Лютая всё ещё бегает? Глубина леса, у старых костей. Огонь, друг мой, огонь.',
        choices: [{ text: 'Ясно.', goto: null }],
      },
      rumors: {
        speaker: 'Грим',
        text: 'Говорят, у бандитов на востоке новый главарь — эдакий фехтовальщик с двумя шрамами. А Ковен ищет лунные травы: платят бронёй, шитой туманом. Ходят слухи и о голосе в Разломе... но я торгую солью, а не страшилками.',
        choices: [{ text: 'К занятиям.', goto: null }],
      },
    },
  },

  // ---------------- Наставник Дорн ----------------
  trainer_dorn: {
    id: 'trainer_dorn',
    start: 'greet',
    nodes: {
      greet: {
        speaker: 'Дорн',
        text: 'Так-так. Смотритель с ржавым клинком и голыми замашками. За золото и очки обучения я сделаю из тебя воина. Знаки, клинок, дыхание — всё тренируемо, если хватит упорства.',
        choices: [
          { text: 'Учить меня.', tag: 'Тренировки', action: 'open:trainer', goto: null },
          { text: 'Что за очки обучения?', goto: 'lp_info' },
          { text: 'До встречи.', goto: null },
        ],
      },
      lp_info: {
        speaker: 'Дорн',
        text: 'Каждый новый уровень даёт очки обучения — ОН. Трать их у меня на приёмы и знаки. Атрибуты — сам, в своих мыслях. Не копи, как скупой гном: мёртвому запас не нужен.',
        choices: [{ text: 'Логично. Учить меня.', tag: 'Тренировки', action: 'open:trainer', goto: null }, { text: 'Позже.', goto: null }],
      },
    },
  },

  // ---------------- Ирма, Орден Пламени ----------------
  recruit_flame: {
    id: 'recruit_flame',
    start: (ctx) => {
      if (ctx.faction === 'flame') return 'joined'
      if (ctx.faction === 'mist') return 'rival'
      const q = ctx.quest('flame')
      if (q.stage > 0 && !q.done && ctx.flag('captainDead')) return 'reward'
      if (q.stage > 0) return 'task_wait'
      return 'intro'
    },
    nodes: {
      intro: {
        speaker: 'Ирма',
        text: 'Стой. Орден Пламени охраняет этот тракт, пока Разлом жрёт долину. Мы платим сталью и укрытием. Но лезть в наше братство без дела не советую.',
        timer: 8,
        onTimeout: 2,
        choices: [
          {
            text: '(Пепельный послушник) Я подметал пепел в домне Ордена. Вера́вки огня ещё тёплые.',
            origin: 'ember',
            cond: 'origin:ember',
            tag: 'Происхождение',
            action: 'xp:30;flag:origin_told;silence:-2',
            goto: 'origin_ember',
          },
          { text: 'Что за Орден?', goto: 'info' },
          { text: 'Я хочу служить.', action: 'quest:flame:1;flag:flameGiven', goto: 'task' },
          { text: 'Обойдусь.', goto: null },
        ],
      },
      origin_ember: {
        speaker: 'Ирма',
        text: 'Домна... третьей печи? Я сама варила сталь для мостовых кованых щитов. Послушники гасят свой огонь в голодных годах — но твой ещё дышит, вижу. Орден помнит своих, даже выброшенных. Служи — и вернёшься в братство.',
        choices: [
          { text: 'Я хочу служить.', action: 'quest:flame:1;flag:flameGiven', goto: 'task' },
          { text: 'Что за Орден?', goto: 'info' },
        ],
      },
      info: {
        speaker: 'Ирма',
        text: 'Ковен Тумана шепчет заклятия, а мы держим строй. Ковен знает — Разлом не запечатать словами. Нужна сталь, огонь и порядок. Проявишь себя — получишь доспех Ордена.',
        choices: [
          { text: 'Я хочу служить.', action: 'quest:flame:1;flag:flameGiven', goto: 'task' },
          { text: 'Ещё подумаю.', goto: null },
        ],
      },
      task: {
        speaker: 'Ирма',
        text: 'Разбойники на востоке режут беженцев с тракта. Их главарь — твой пропуск в Орден. Убей его и вернись.',
        choices: [{ text: 'Сделаю.', goto: null }],
      },
      task_wait: {
        speaker: 'Ирма',
        text: 'Лагерь на востоке всё ещё дымит кострами. Главарь жив — Орден ждёт.',
        choices: [{ text: 'Иду.', goto: null }],
      },
      reward: {
        speaker: 'Ирма',
        text: 'Главарь мёртв, лагерь разбежался. Долина будет помнить. Орден Пламени принимает тебя — носи нашу сталь.',
        choices: [
          { text: '(Присоединиться к Ордену)', action: 'faction:flame;give:armor_order:1;gold:100;xp:150;quest:flame:3;flag:flameJoined', goto: 'joined_new' },
          { text: 'Сначала подумаю.', goto: null },
        ],
      },
      joined_new: {
        speaker: 'Ирма',
        text: 'Теперь тракт под нашей защитой вдвоём. Держись, брат по стали.',
        choices: [{ text: 'Служу.', goto: null }],
      },
      joined: {
        speaker: 'Ирма',
        text: 'Рад видеть, брат по стали. Держи строй — Разлом ещё дыышит... то есть дышит. Привыкай к огню.',
        choices: [{ text: 'До встречи.', goto: null }],
      },
      rival: {
        speaker: 'Ирма',
        text: 'Ты пахнешь туманом Ковена. Не трать моё время — шептуны и сталь не смешивают. Но за долину... спасибо. Пока.',
        choices: [{ text: 'Как знаешь.', goto: null }],
      },
    },
  },

  // ---------------- Селена, Ковен Тумана ----------------
  recruit_mist: {
    id: 'recruit_mist',
    start: (ctx) => {
      if (ctx.faction === 'mist') return 'joined'
      if (ctx.faction === 'flame') return 'rival'
      const q = ctx.quest('mist')
      if (q.stage > 0 && !q.done && ctx.has('moon_herb', 3)) return 'reward'
      if (q.stage > 0) return 'task_wait'
      return 'intro'
    },
    nodes: {
      intro: {
        speaker: 'Селена',
        text: 'Ты слышишь это гудение, странник? Разлом — рана в ткани мира, и сталь её не зашьёт. Ковен Тумана переписывает печать. Нам не хватает рук... и лунной травы.',
        timer: 8,
        onTimeout: 2,
        choices: [
          { text: 'Что за Ковен?', goto: 'info' },
          { text: 'Чем я могу помочь?', action: 'quest:mist:1;flag:mistGiven', goto: 'task' },
          { text: 'Пойду.', goto: null },
        ],
      },
      info: {
        speaker: 'Селена',
        text: 'Мы — последние, кто помнит слова печати. Орден Пламени хорош в ярости, но Разлом гаснет не от мечей, а от знания. Помоги Ковену — и броня, шитая туманом, станет твоей.',
        choices: [
          { text: 'Чем я могу помочь?', action: 'quest:mist:1;flag:mistGiven', goto: 'task' },
          { text: 'Ещё подумаю.', goto: null },
        ],
      },
      task: {
        speaker: 'Селена',
        text: 'На берегу Озера Лун, южнее, растёт трава с бледным светом. Принеси три стебля — и Ковен примет тебя как своего.',
        choices: [{ text: 'Будет сделано.', goto: null }],
      },
      task_wait: {
        speaker: 'Селена',
        text: 'Три стебля лунной травы, странник. Озеро Лун — на юге. Ищи бледное свечение в сумраке.',
        choices: [{ text: 'Иду.', goto: null }],
      },
      reward: {
        speaker: 'Селена',
        text: 'Ты чувствуешь? Трава ещё поёт. С этими стеблями печать простоит ещё долгий год. Ковен Тумана зовёт тебя своим.',
        choices: [
          { text: '(Отдать травы и присоединиться)', action: 'take:moon_herb:3;faction:mist;give:armor_robe:1;xp:150;quest:mist:3;flag:mistJoined', goto: 'joined_new' },
          { text: 'Сначала подумаю.', goto: null },
        ],
      },
      joined_new: {
        speaker: 'Селена',
        text: 'Знаки станут твоими песнями, странник. Иди — и пусть туман скроет твои шаги.',
        choices: [{ text: 'Служу Ковену.', goto: null }],
      },
      joined: {
        speaker: 'Селена',
        text: 'Печать держится, странник. Ковен помнит твою службу. Кстати, лунная трава — неплохой товар, если найдёшь лишнюю.',
        choices: [{ text: 'До встречи.', goto: null }],
      },
      rival: {
        speaker: 'Селена',
        text: 'Сталь Ордена уже греет твоё плечо. Что ж. Когда огонь не справится — Ковен будет здесь. Он всегда здесь.',
        choices: [{ text: 'Как знаешь.', goto: null }],
      },
    },
  },

  // ---------------- Кайя у Камней Древних ----------------
  stones_kaya: {
    id: 'stones_kaya',
    start: (ctx) => (ctx.companion('kaya') ? 'joined_chat' : 'intro'),
    nodes: {
      intro: {
        speaker: 'Кайя',
        text: 'Смотри-ка, Смотритель. Я Кайя, магистр-странница, а это Торвальд — он молчит, зато его щит говорит за него. Мы держим печать Камней, пока Разлом расширяется. Один ты с ним не справишься.',
        timer: 10,
        onTimeout: 2,
        choices: [
          { text: 'Что вы знаете о Разломе?', goto: 'lore' },
          { text: 'Тогда пойдём вместе.', action: 'join:kaya;join:torvald;quest:main:4;xp:60;silence:-3', goto: 'joined' },
          { text: 'Справлюсь и один.', action: 'silence:+4', goto: 'lone' },
        ],
      },
      lore: {
        speaker: 'Кайя',
        text: 'Разлом тянет силу из-за грани. Там — миры, где мысль материальна, а голодные тени носят чужие лица. Пожиратель Бурь — лишь пасть чего-то большего. Убей его, и рана затянется... на время.',
        choices: [
          { text: 'Тогда пойдём вместе.', action: 'join:kaya;join:torvald;quest:main:4;xp:60;silence:-3', goto: 'joined' },
          { text: 'Позже.', goto: null },
        ],
      },
      lone: {
        speaker: 'Торвальд',
        text: 'Гордость — хорошая броня, худая обивка. Когда надумаешь — мы здесь.',
        choices: [{ text: 'Запомню.', goto: null }],
      },
      joined: {
        speaker: 'Кайя',
        text: 'Торвальд, бери алебарду — идём с Смотрителем. Кайя в деле, Разлом поплачет. Строй: я — сзади, он — перед тобой.',
        choices: [{ text: 'В путь.', goto: null }],
      },
      joined_chat: {
        speaker: 'Кайя',
        text: 'Веди, Смотритель. Лёд наготове, Торвальд щёлкает щитом — значит, всё в порядке.',
        choices: [{ text: 'В путь.', goto: null }],
      },
    },
  },

  stones_torvald: {
    id: 'stones_torvald',
    start: (ctx) => (ctx.companion('torvald') ? 'joined_chat' : 'intro'),
    nodes: {
      intro: {
        speaker: 'Торвальд',
        text: 'Хм. Смотритель, значит. В моей деревне таких хоронили с почётом. Если идёшь к дыре в небе — я с Кайей. Она болтает, я — влетаю.',
        choices: [{ text: 'Запомню.', goto: null }],
      },
      joined_chat: {
        speaker: 'Торвальд',
        text: 'Строй держу, ты кроишь. Всё как на войне, Смотритель.',
        choices: [{ text: 'В путь.', goto: null }],
      },
    },
  },

  // ---------------- Алтарь (Голос Древних) ----------------
  altar: {
    id: 'altar',
    start: (ctx) => {
      if (ctx.flag('shoutUnlocked')) return 'learned'
      const q = ctx.quest('main')
      if (q.stage >= 3) return ctx.lp >= 3 ? 'offer' : 'no_lp'
      return 'not_ready'
    },
    nodes: {
      not_ready: {
        speaker: 'Древний Алтарь',
        text: 'Руны холодны. Камни Древних отвечают лишь тем, кого долина признала своим.',
        choices: [{ text: '(Отойти)', goto: null }],
      },
      no_lp: {
        speaker: 'Древний Алтарь',
        text: 'Руны теплеют, но твоя память пуста. Чтобы удержать Голос Древних, нужно 3 очка обучения.',
        choices: [{ text: '(Отойти)', goto: null }],
      },
      offer: {
        speaker: 'Древний Алтарь',
        text: 'Руны вспыхивают янтарём. Слово, что держало Разлом веками, ждёт твоего горла. Выучить Голос Древних? (3 ОН)',
        choices: [
          { text: 'Прикоснуться к рунам (3 ОН)', action: 'sign:shout;lp:-3;flag:shoutUnlocked;xp:40', goto: 'learned2' },
          { text: '(Отойти)', goto: null },
        ],
      },
      learned2: {
        speaker: 'Древний Алтарь',
        text: 'FUS... RO... В груди отдаётся эхом чужое слово — твоё теперь. Крикни — и камень услышит.',
        choices: [{ text: '(Испытать силу)', goto: null }],
      },
      learned: {
        speaker: 'Древний Алтарь',
        text: 'Голос Древних уже в тебе. Руны гудят одобрительно.',
        choices: [{ text: '(Отойти)', goto: null }],
      },
    },
  },

  // ---------------- Барьер Разлома ----------------
  barrier: {
    id: 'barrier',
    start: 'greet',
    nodes: {
      greet: {
        speaker: '???',
        text: 'Воздух звенит и режет, как стекло. За пеленой — пепельные поля Сердца Разлома. Барьер признает лишь тех, кого долина назвала своим. Докажи себя — и путь откроется.',
        choices: [{ text: '(Отойти)', goto: null }],
      },
    },
  },

  // ---------------- Босс ----------------
  boss_intro: {
    id: 'boss_intro',
    start: 'intro',
    nodes: {
      intro: {
        speaker: 'Пожиратель Бурь',
        text: 'Ты пахнешь судьбой, крошка-убийца. Я ел королей. Я ел богов с их молитвами. Твоя долина — между зубами. Скажи мне... какой вкус у отчаяния?',
        timer: 8,
        onTimeout: 0,
        choices: [
          { text: '(Обнажить клинок) Утренний.', action: 'boss:fight;silence:+6', goto: null },
          {
            text: '«Разлом сожрёт тебя первым — и я от него не отдам».',
            tag: 'Убеждение',
            check: { dc: 15, label: 'Убеждение (СЛ 15)' },
            goto: 'weaken',
            gotoFail: 'taunt_fail',
            action: 'boss:fight;boss:weaken;silence:-4',
          },
          { text: '(Отступить)', goto: null },
        ],
      },
      weaken: {
        speaker: 'Пожиратель Бурь',
        text: 'Гррх... слова... жгут изнутри... Ты испортил мне аппетит, крошка. Придётся есть тебя первым — и с плохим настроением.',
        choices: [{ text: '(Атаковать!)', goto: null }],
      },
      taunt_fail: {
        speaker: 'Пожиратель Бурь',
        text: 'ХА! Маленький голосок для такой большой пасти. Я собирался съесть тебя первым. Теперь — медленно.',
        choices: [{ text: '(Атаковать!)', action: 'boss:fight', goto: null }],
      },
    },
  },
}
