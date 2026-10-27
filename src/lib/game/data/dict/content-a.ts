// Словарь EN — часть: контент A (квесты, предметы, умения, таблицы).
// Ведёт агент 22-c. Формат: 'русский ключ': 'English line'.
// КЛЮЧ = строка БУКВАЛЬНО как в исходнике (quests/items/abilities/tables).
export const EN_CONTENT_A: Record<string, string> = {
  // ============================================================
  // QUESTS — названия, summaries, тексты стадий
  // ============================================================

  // --- main ---
  'Шёпот Разлома': 'Whisper of the Rift',
  'Над долиной Хеймхолл разорвано небо. Монстры лезут из дыры между мирами, а старейшина деревни ищет того, кто разберётся с бедой.':
    'The sky above the Heimhall valley is torn open. Monsters crawl out of the wound between worlds, and the village elder is looking for someone to deal with the trouble.',
  'Поговорить со старейшиной Бьорном в Хеймхолле.': 'Talk to Elder Bjorn in Heimhall.',
  'Разведать Сумрачный лес: истребить волков (0/4).': 'Scout the Gloomwood: cull the wolves (0/4).',
  'Отправиться к Камням Древних на северо-востоке.': 'Head to the Stones of the Ancients in the northeast.',
  'Доказать свою ценность: убить вожака стаи, главаря бандитов или собрать 3 лунные травы для Ковена.':
    'Prove your worth: kill the pack leader, the bandit chief, or gather 3 moon herbs for the Coven.',
  'Войти в Сердце Разлома и провести рейд (см. «Сердце Разлома»).':
    'Enter the Heart of the Rift and run the raid (see Heart of the Rift).',
  'Разлом затих. Долина спасена.': 'The Rift has gone quiet. The valley is saved.',

  // --- raid ---
  'Сердце Разлома': 'Heart of the Rift',
  'Пожиратель Эха ждёт в сердце раны мира. Отряд рейдует: Торвальд — авангард (волна 1), Кайя — артиллерия (волна 2). Лояльность и одобрение решают, кто вернётся.':
    'The Echo Devourer waits at the heart of the world\u2019s wound. The party raids: Torvald holds the vanguard (wave 1), Kaya provides the artillery (wave 2). Loyalty and approval decide who comes back.',
  'Войти в Сердце Разлома (восток за барьером).': 'Enter the Heart of the Rift (east, past the barrier).',
  'Выдержать 4 волны эха (0/4). Роли: Торвальд — авангард, Кайя — артиллерия.':
    'Survive 4 waves of echo (0/4). Roles: Torvald — vanguard, Kaya — artillery.',
  'Суд Пожирателя Эха.': 'The judgment of the Echo Devourer.',
  'Суд окончен.': 'The judgment is done.',

  // --- judgment ---
  'Суд Пожирателя': 'Judgment of the Devourer',
  'Не бой — счёт. Мир предъявляет флаги: ключи, лояльности, тайны, Тишь. Выбор в суде решает, чем станет Гексмарк.':
    'Not a fight — a reckoning. The world presents its tally: keys, loyalties, secrets, the Silence. Your choice in the judgment decides what Hexmark becomes.',
  'Выслушать Пожирателя Эха и выбрать судьбу мира.':
    'Hear the Echo Devourer out and choose the fate of the world.',

  // --- contract ---
  'Контракт: Лютая волчица': 'Contract: Fierce She-Wolf',
  'Торговец Грим передал заказ: огромная волчица с белёсым загривком режет овец у леса. В бестиарии сказано: зверь стар, а значит, боится огня.':
    'Trader Grim passed along a contract: a huge she-wolf with a pale grizzled mane is slaughtering sheep by the forest. The bestiary says: the beast is old — and old beasts fear fire.',
  'Убить лютую волчицу в Сумрачном лесу.': 'Kill the fierce she-wolf in the Gloomwood.',
  'Вернуться к Гриму за наградой.': 'Return to Grim for your reward.',
  'Контракт выполнен.': 'Contract fulfilled.',

  // --- flame ---
  'Испытание Ордена Пламени': 'Trial of the Order of Flame',
  'Капитан Ирма не примет тебя в Орден, пока лагерь разбойников на востоке не затихнет навсегда.':
    'Captain Irma will not take you into the Order until the bandit camp to the east falls silent for good.',
  'Уничтожить главаря разбойников в лагере на востоке.': 'Destroy the bandit chief in the camp to the east.',
  'Вернуться к капитану Ирме.': 'Return to Captain Irma.',
  'Ты в Ордене Пламени.': 'You are in the Order of Flame.',

  // --- mist ---
  'Услуга Ковена Тумана': 'A Favor for the Mist Coven',
  'Архимаг Селена просит собрать 3 лунные травы на берегу Озера Лун — они светятся в сумерках.':
    'Archmage Selena asks you to gather 3 moon herbs on the shore of the Lake of Moons — they glow at dusk.',
  'Собрать 3 лунные травы у Озера Лун (0/3).': 'Gather 3 moon herbs by the Lake of Moons (0/3).',
  'Вернуться к архимагу Селене.': 'Return to Archmage Selena.',
  'Ты принят в Ковен Тумана.': 'You have been accepted into the Mist Coven.',

  // --- veld ---
  'Контракт: Пепельная Мать': 'Contract: Ash Mother',
  'Доска объявлений Хеймхолла: тварь из Вельда уносит скот и детей. Следопытство приведёт к её логову в Пепельном кургане. Альра ждёт доказательство — пепельное сердце.':
    'Heimhall notice board: a beast out of the Veld is carrying off livestock and children. Tracking will lead you to its lair in the Ash Barrow. Alra expects proof — an ash heart.',
  'Войти в Вельд через Врата Тумана (юг долины) и осмотреть следы (0/3).':
    'Enter the Veld through the Mist Gate (south of the valley) and examine the tracks (0/3).',
  'Убить Пепельную Мать в Пепельном кургане.': 'Kill the Ash Mother in the Ash Barrow.',
  'Вернуться к алхимику Альре в Хеймхолл за наградой.': 'Return to the alchemist Alra in Heimhall for your reward.',

  // --- granite ---
  'Война за барьер': 'War for the Barrier',
  'В Гранитной Долине, за Каменным Хребтом, три лагеря Колонии грызутся за Ядровой барьер, а культ Осколка растёт. Смотритель барьера Хран видит в тебе шанс: победить в Яме и снять Мастера Ямы — голоса культа.':
    'In Granite Valley, beyond the Stone Ridge, three Colony camps squabble over the Core Barrier while the Shard cult grows. Khran, the Watcher of the barrier, sees a chance in you: win in the Pit and take down the Pit Master — the cult\u2019s mouthpiece.',
  'Найти Храна у Осколочного барьера в Гранитной Долине (восток, через Врата Гранита).':
    'Find Khran by the Shard Barrier in Granite Valley (east, through the Granite Gate).',
  'Заслужить право на яму: победить в бою III у Кассии (нужен ранг 2 в карьере).':
    'Earn the right to the Pit: win a Combat III bout against Kassia (Career rank 2 required).',
  'Вызвать и победить Мастера Ямы на арене.': 'Call out and defeat the Pit Master in the arena.',
  'Вернуться к Храну за наградой.': 'Return to Khran for your reward.',
  'Ключ-осколок Колонии твой. Барьер молчит — пока.':
    'The Colony\u2019s shard key is yours. The barrier is silent — for now.',

  // --- granite_ore ---
  'Руда для кузнеца': 'Ore for the Smith',
  'Кузнец Брок не станет ковать для первого встречного: принеси 4 куска гранитной руды из жил у Рудника — покажешь, что Колония тебе не чужая.':
    'Smith Brok does not forge for just anyone: bring him 4 chunks of granite ore from the veins by the Mine, and the Colony will be strangers to you no more.',
  'Добыть гранитную руду в жилах у Рудника (0/4).': 'Mine granite ore from the veins by the Mine (0/4).',
  'Вернуться к кузнецу Броку в Колонию.': 'Return to Smith Brok in the Colony.',
  'Брок сковал для тебя Ядровой тесак.': 'Brok has forged you a Core Cleaver.',

  // --- granite_scorpions ---
  'Клеймо скорпионов': 'Brand of the Scorpions',
  'Вольный стрелок Финн мечтает выбиться из Колонии: клеймо из 5 панцирей гранитных скорпионов — его пропуск в караваны Дозора.':
    'Freeblade Finn dreams of getting out of the Colony: a brand of 5 granite scorpion shells is his ticket into the Watch caravans.',
  'Убить гранитных скорпионов в котловине (0/5).': 'Kill granite scorpions in the basin (0/5).',
  'Вернуться к Финну в Колонию.': 'Return to Finn in the Colony.',
  'Клеймо собрано — караваны Дозора будут рады.':
    'The brand is assembled — the Watch caravans will be glad.',

  // --- frost_words ---
  'Слова на камне': 'Words on Stone',
  "Сказитель Эйнар из Стылого Приюта верит, что герои древности говорят с миром голосом — Ту'умом. Он укажет Пещеру Рун, где Стена Слова ждёт достойного.":
    "Skald Einar of Bleak Haven believes the heroes of old spoke to the world with their voice — the Thu'um. He will point you to the Rune Cave, where a Word Wall waits for one worthy.",
  'Найти Пещеру Рун к северу от Стылого Приюта.': 'Find the Rune Cave north of Bleak Haven.',
  'Разгадать рунные камни (Заяц, Волк, Луна) и открыть дверь.':
    'Solve the rune stones (Hare, Wolf, Moon) and open the door.',
  'Коснуться Стены Слова в глубине пещеры.': 'Touch the Word Wall deep in the cave.',
  'Слово Силы звучит в твоём горле.': 'A Word of Power rings in your throat.',

  // --- frost_dragon ---
  'Голос в буране': 'A Voice in the Blizzard',
  'Охотница Ингрид видела крылатую тень над Стылым Предельем: снег вспыхивает там, где она пролетает. Следы пожара ведут к Драконьему Долу.':
    'The huntress Ingrid saw a winged shadow over the Bleak Marches: the snow bursts into flame wherever it passes. Burn traces lead to Dragon Hollow.',
  'Осмотреть следы пожара по дороге на юг (0/3).': 'Examine the burn traces along the road south (0/3).',
  'Дождаться крылатую тень в Драконьем Долу.': 'Wait out the winged shadow in Dragon Hollow.',
  'Убить дракона Иммолтакса.': 'Slay the dragon Immoltax.',
  'Вернуться к Ингрид в Стылый Приют.': 'Return to Ingrid in Bleak Haven.',
  'Иммолтакс пал. Небо над Предельем чище.': 'Immoltax has fallen. The sky over the Marches is cleaner.',

  // --- mara ---
  'Оборона Бастиона': 'Defense of the Bastion',
  'Командор Мейра из Бастиона Ветвей бьёт тревогу: мор ползёт с юга Гранитной Долины. Частокол не выдержит без мечей — держи строй, приказывай партии и не подпускай упырей к воротам.':
    'Commander Meira of the Bastion of the Boughs raises the alarm: the blight is crawling up from the south of Granite Valley. The palisade will not hold without blades — keep the line, command your party, and let no ghoul reach the gates.',
  'Найти Командора Мейру в Бастионе Ветвей (юг Гранита, через Врата Мары).':
    'Find Commander Meira in the Bastion of the Boughs (south of Granite, through the Blight Gate).',
  'Удержать Бастион: отбить волны штурма у частокола.':
    'Hold the Bastion: repel the assault waves at the palisade.',
  'Убить Мор-Мать, когда она вылезет из логова.': 'Kill the Blight Mother when she crawls out of her lair.',
  'Вернуться к Командору Мейре за наградой.': 'Return to Commander Meira for your reward.',
  'Бастион стоит. Мора отступила — пока.': 'The Bastion stands. The blight has pulled back — for now.',

  // --- mara_wells ---
  'Скверна в жилах': 'Blight in the Veins',
  'Досент Хольт уверен: мор питается багровыми сгустками в жилах Мары. Выжги три сгустка — и земля выдохнет, а наука сделает шаг.':
    'Docent Holt is certain: the blight feeds on crimson clots in the veins of the Blight. Burn out three clots — the land will exhale, and science will take a step.',
  'Выжечь мор-сгустки в пустоши Мары (0/3).': 'Burn out the blight clots in the Blight wastes (0/3).',
  'Вернуться к досенту Хольту в Бастион.': 'Return to Docent Holt at the Bastion.',
  'Жилы чисты — земля Мары вздохнула.': 'The veins are clean — the land of the Blight has drawn breath.',

  // --- mara_glands ---
  'Желёзы скверны': 'Glands of the Blight',
  'Хольту нужны образцы: пять мор-желёз с упырей и абомов. «Мор начинается с железки, Смотритель. Принеси — и я покажу, где он кончается».':
    'Holt needs samples: five blight glands off ghouls and abominations. "The blight starts with a gland, Watcher. Bring them, and I will show you where it ends."',
  'Добыть мор-желёзы у упырей и абомов (0/5).': 'Harvest blight glands from ghouls and abominations (0/5).',
  'Образцы в банках — наука шагает вперёд.': 'Samples in jars — science marches on.',

  // --- disputed ---
  'Семя Разлома': 'Seed of the Rift',
  'Спорные Земли грызут себя изнутри: Роща Садовников приютила беженцев и хранит Семя Разлома, а Пепельная Орда идёт за ним. Ульва и Гхарз ждут Смотрителя — и мир изменится так, как решит он.':
    'The Contested Lands are tearing themselves apart: the Gardeners\u2019 Grove has sheltered refugees and keeps the Seed of the Rift, and the Ash Horde is coming for it. Ulva and Gharz are waiting for the Watcher — and the world will change as he decides.',
  'Найти Хранительницу Ульву в Роще Садовников (восток, через Врата Спорных Земель).':
    'Find Keeper Ulva in the Gardeners\u2019 Grove (east, through the Contested Lands Gate).',
  'Поговорить с Гхарзом Кровавым Псом в лагере Пепельной Орды.':
    'Talk to Gharz the Bloodhound in the Ash Horde camp.',
  'Отбить штурм Орды у Рощи.': 'Fight off the Horde assault at the Grove.',
  'Забрать Семя у Гхарза силой.': 'Take the Seed from Gharz by force.',
  'Вернуться к Ульве в сердце Рощи.': 'Return to Ulva at the heart of the Grove.',
  'Спор решён. Судьба Семени определена.': 'The dispute is settled. The fate of the Seed is decided.',

  // --- disputed_hoard ---
  'Ларец беженцев': 'The Refugee\u2019s Cache',
  'Беженка Пруша закопала пожитки в трёх узлах по пустоши, пока Орда не выжгла тропы. «Откопай — и половина твоя. Вересковая туника сшита на двоих».':
    'The refugee Prusha buried her belongings in three stashes across the wastes before the Horde burned the trails. "Dig it up and half is yours. The heather tunic was sewn for two."',
  'Откопать узлы беженцев в пустоши (0/3).': 'Dig up the refugee stashes in the wastes (0/3).',
  'Вернуться к Пруше в Рощу.': 'Return to Prusha at the Grove.',
  'Пожитки выкопаны — Пруша отдала вересковую тунику.':
    'The belongings are dug up — Prusha has given you the heather tunic.',

  // --- disputed_scout ---
  'Глаза Орды': 'Eyes of the Horde',
  'Следопыт Тарбен считает глаза Орды хуже ножей: «Мародёры-разведчики метят тропы углём. Четыре метки сотри — по ним придёт весь пир».':
    'The tracker Tarben reckons the eyes of the Horde are worse than knives: "Raider scouts mark the trails with charcoal. Rub out four marks — or the whole feast will come down those trails."',
  'Перебить пепельных мародёров в пустоши (0/4).': 'Cut down the ash marauders in the wastes (0/4).',
  'Вернуться к следопыту Тарбену.': 'Return to the tracker Tarben.',
  'Метки стёрты — Орда ослепла.': 'The marks are gone — the Horde has gone blind.',

  // --- rubezh_ship ---
  'Двенадцатый': 'The Twelfth',
  'Техник Ашер 12 лет чинит корабль-призрак «Двенадцатый», упавший на плато Внешнего Рубежа. Экипаж в стазисе, а капитан всё исполняет последний приказ. Корабль надо разбудить.':
    'The technician Asher has spent 12 years repairing the Twelfth, a ghost ship downed on the plateau of the Outer Rim. The crew lies in stasis while the captain still carries out her last order. The ship must be woken.',
  'Найти «Двенадцатый» на плато и прочитать бортжурнал у трапа.':
    'Find the Twelfth on the plateau and read the logbook by the ramp.',
  'Войти в стазис-зал: эхо капитана ждёт пробуждения.':
    'Enter the stasis hall: the echo of the captain awaits awakening.',
  'Одолеть Капитана «Двенадцатого».': 'Defeat the Captain of the Twelfth.',
  'Вернуться к Ашеру у корабля.': 'Return to Asher by the ship.',
  '«Двенадцатый» разбужен. Экипаж будет похоронен по именам.':
    'The Twelfth is awake. The crew will be buried by name.',

  // --- rubezh_signal ---
  'Хребет сигналов': 'Signal Ridge',
  'Ашер: «Ретрансляторы Хребта 12 лет молчат. Синхронизируй цепь — первый, третий, второй, они так шепчут с посадки. Перепутаешь — вся цепь гаснет».':
    'Asher: "The Ridge relays have been silent for 12 years. Sync the chain — first, third, second; the order they have whispered since the landing. Get it wrong and the whole chain goes dark."',
  'Синхронизировать ретрансляторы Хребта в правильном порядке (0/3).':
    'Sync the Ridge relays in the right order (0/3).',
  'Вернуться к Ашеру — дроны выйдут на плато.': 'Return to Asher — the drones will deploy onto the plateau.',
  'Хребет сигналов поёт — дроны-разведчики в небе.':
    'Signal Ridge is singing — scout drones fill the sky.',

  // --- rubezh_rings ---
  'Посадочные кольца': 'Landing Rings',
  'Ашер хочет восстановить карту аварийной полосы: «Три посадочных кольца. Осмотри разметку — по ним найдёшь всё, что мы потеряли при посадке».':
    'Asher wants to rebuild the map of the emergency strip: "Three landing rings. Survey the markings — they will lead you to everything we lost in the crash."',
  'Осмотреть разметку трёх посадочных колец плато (0/3).':
    'Survey the markings of the three landing rings on the plateau (0/3).',
  'Вернуться к Ашеру с картой полосы.': 'Return to Asher with the strip map.',
  'Аварийная полоса восстановлена оф-тропой.': 'The emergency strip is charted, off the beaten trail.',

  // --- rubezh_crew ---
  'Список экипажа': 'Crew Manifest',
  '«Двенадцать капсул в стазис-зале — двенадцать табличек с именами. Прочти каждую: экипаж, брошенный 12 лет назад, заслуживает того, чтобы их помнили по именам».':
    '"Twelve pods in the stasis hall — twelve name plaques. Read every one: a crew abandoned 12 years ago deserves to be remembered by name."',
  'Прочитать таблички всех стазис-капсул в зале «Двенадцатого» (0/12).':
    'Read the plaques of every stasis pod in the hall of the Twelfth (0/12).',
  'Вернуться к Ашеру с именами.': 'Return to Asher with the names.',
  'Имена возвращены. Ашер больше не один.': 'The names are returned. Asher is no longer alone.',

  // ============================================================
  // ITEMS — name + desc
  // ============================================================

  'Зелье лечения': 'Healing Potion',
  'Глоток шипящей жидкости залечивает раны (+45 ОЗ).': 'A gulp of hissing liquid knits wounds shut (+45 HP).',
  'Эликсир выносливости': 'Elixir of Stamina',
  'Восстанавливает силы (+60 ОВ). Пары жгут ноздри.':
    'Restores your strength (+60 Stamina). The fumes scorch the nostrils.',
  'Ржавый клинок': 'Rusty Blade',
  'Затупился ещё при твоём деде. Но лучше, чем кулаки.':
    'Went dull back in your grandfather\u2019s day. Still better than fists.',
  'Стальной меч': 'Steel Sword',
  'Ковка Хеймарсхолла. Надёжен, как молот кузнеца.': 'Heimarshall forge. Dependable as a smith\u2019s hammer.',
  'Рунный клинок': 'Rune Blade',
  'Руны тлеют при виде порождений Разлома.': 'The runes smolder at the sight of Rift spawn.',
  'Кожаный доспех': 'Leather Armor',
  'Простая броня следопыта. Лучше, чем рубаха.': 'A tracker\u2019s simple armor. Better than a shirt.',
  'Доспех Ордена Пламени': 'Armor of the Order of Flame',
  'Закалённая сталь с клеймами Ордена. Выдаётся избранным.':
    'Tempered steel bearing the brand of the Order. Issued to the chosen few.',
  'Мантия Ковена Тумана': 'Robe of the Mist Coven',
  'Ткань помнит шёпот древних заклятий (+10% к силе знаков).':
    'The fabric remembers the whisper of ancient spells (+10% sign power).',
  'Волчья шкура': 'Wolf Pelt',
  'Торговцы платят за неё хорошие деньги.': 'Traders pay good coin for it.',
  'Волчий клык': 'Wolf Fang',
  'Сувенир из Сумрачного леса.': 'A souvenir from the Gloomwood.',
  'Шкура лютой волчицы': 'Fierce She-Wolf Pelt',
  'Шрамы и проплешины говорят: зверь видел слишком многое.':
    'Scars and bald patches tell the tale: this beast has seen too much.',
  'Осколок Разлома': 'Rift Shard',
  'Тёплый на ощупь и гудит, если поднести к уху. Дорого.':
    'Warm to the touch, and it hums if you hold it to your ear. Costly.',
  'Лунная трава': 'Moon Herb',
  'Светится бледным светом у берегов Озера Лун. Нужна Ковену.':
    'It glows pale along the shores of the Lake of Moons. The Coven needs it.',
  'Масло против тварей': 'Beast Oil',
  'Наносится на клинок: +5 урона зверям (волки, болотники) на 4 минуты.':
    'Applied to a blade: +5 damage against beasts (wolves, boglings) for 4 minutes.',
  'Масло против спектров': 'Specter Oil',
  'Наносится на клинок: +5 урона спектрам (порожденья, мраки) на 4 минуты.':
    'Applied to a blade: +5 damage against specters (spawn, shades) for 4 minutes.',
  'Болотная желчь': 'Bog Bile',
  'Едкая тина из кишок болотника. Альра платит за неё.': 'Caustic sludge from the guts of a bogling. Alra pays for it.',
  'Пепельное сердце': 'Ash Heart',
  'Доказательство: сердце Матери ещё тлеет. Отнести Альре (или тому, кто заплатит).':
    'Proof that the Mother\u2019s heart still smolders. Bring it to Alra (or to whoever pays).',
  'Гранитная руда': 'Granite Ore',
  'Тяжёлый камень с сединой жил. Брок платит за неё, а для клинка — тем более.':
    'Heavy stone streaked with gray veins. Brok pays for it — and pays all the more for a blade.',
  'Хитин скорпиона': 'Scorpion Chitin',
  'Серый панцирь, звенит как котёл. Кузнецы и продавцы панцирей любят его.':
    'A gray shell that rings like a cauldron. Smiths and shell-traders love it.',
  'Ядровой тесак': 'Core Cleaver',
  'Ковка Брока из ядровой руды: тяжёл, груб и не знает жалости. Клеймо Колонии на клинке.':
    'Brok\u2019s forging from core ore: heavy, crude, and it knows no mercy. The brand of the Colony is on the blade.',
  'Ключ-осколок: Гранит': 'Shard Key: Granite',
  'Тёплый многогранник — отпечаток Ядра из барьера Колонии. Один из шести.':
    'A warm polyhedron — the imprint of the Core from the Colony\u2019s barrier. One of six.',
  'Стылый клинок': 'Bleak Blade',
  'Сталь, закалённая в вечных снегах Пределья. Руна мороза тлеет на лезвии даже в драку.':
    'Steel tempered in the eternal snows of the Marches. A frost rune smolders on the edge even mid-fight.',
  'Плащ Стылого Пределья': 'Cloak of the Bleak Marches',
  'Сшит Ингрид из шкур снежных волков. Метель за спиной — не повод отступать.':
    'Sewn by Ingrid from the hides of snow wolves. A blizzard at your back is no reason to retreat.',
  'Клык Иммолтакса': 'Fang of Immoltax',
  'Огромный зуб длиной с предплечье. Грим даст за него цену, а сказители — славу.':
    'An enormous tooth as long as a forearm. Grim will pay coin for it, and skalds will pay in glory.',
  'Мор-железа': 'Blight Gland',
  'Пульсирующий узел под кожей упыря. Досент Хольт платит за них и ведёт счёт.':
    'A pulsing node beneath the skin of a ghoul. Docent Holt pays for them and keeps count.',
  'Клинок Бастиона': 'Bastion Blade',
  'Сталь Ветвей, перекованная в дни штурма. Пахнет гарью и мор-кровью — и не ржавеет.':
    'Steel of the Boughs, reforged in the days of the assault. It smells of soot and blight-blood — and it never rusts.',
  'Сердце Мор-Матери': 'Heart of the Blight Mother',
  'До сих пор бьётся. Доказательство для Мейры — и предупреждение для всех остальных.':
    'It still beats. Proof for Meira — and a warning for everyone else.',
  'Горжета Дозора Мары': 'Gorget of the Blight Watch',
  'Пластина на шею с клеймом Ветвей: мор-плевки скользят по отполированной стали.':
    'A neck plate bearing the brand of the Boughs: blight spittle slides off the polished steel.',
  'Ключ-осколок: Спорные Земли': 'Shard Key: the Contested Lands',
  'Тёплый многогранник — отпечаток Семени Разлома. Один из шести. Пахнет вереском и пеплом.':
    'A warm polyhedron — the imprint of the Seed of the Rift. One of six. It smells of heather and ash.',
  'Ключ-осколок: Внешний Рубеж': 'Shard Key: the Outer Rim',
  'Гранёная пластина из обшивки «Двенадцатого», выкованная Ашером. Шестой канонический осколок K6. Гудит на чужие созвездия.':
    'A faceted plate cut from the hull of the Twelfth, forged by Asher. The sixth canonical shard, K6. It hums at alien constellations.',
  'Ключ-осколок: Оплот': 'Shard Key: Stronghold',
  'Тёплый многогранник — отпечаток долины Хеймхолл. Один из шести. Тёплый, как дом, которого почти нет.':
    'A warm polyhedron — the imprint of the Heimhall valley. One of six. As warm as a home that is almost gone.',
  'Ключ-осколок: Вельд': 'Shard Key: the Veld',
  'Тёплый многогранник — отпечаток Пепельной Материарх. Один из шести. Дымится даже под дождём.':
    'A warm polyhedron — the imprint of the Ash Matriarch. One of six. It smokes even in the rain.',
  'Ключ-осколок: Пределье': 'Shard Key: the Marches',
  'Тёплый многогранник — отпечаток рун ледника. Один из шести. Не тает в ладони.':
    'A warm polyhedron — the imprint of the glacier runes. One of six. It never melts in your palm.',
  'Ключ-осколок: Мара': 'Shard Key: the Blight',
  'Тёплый многогранник — отпечаток оборванного Мора. Один из шести. Пульсирует, как больное сердце.':
    'A warm polyhedron — the imprint of the blight, torn short. One of six. It pulses like a sick heart.',
  'Вересковый тарч-туника': 'Heather Targe-Tunic',
  'Сшита Прушей из пожитков беженцев: вереск в швах заглушает чужой шёпот (+4 КД).':
    'Sewn by Prusha from refugee belongings: heather in the seams drowns out the alien whisper (+4 AC).',
  'Клык Гхарза': 'Tusk of Gharz',
  'Огромный клык вожака Орды. Грим даст за него цену, а пепельные мародёры больше не соберутся.':
    'An enormous tusk of the Horde\u2019s chief. Grim will pay for it — and the ash marauders will never gather again.',

  // ============================================================
  // ABILITIES — name + desc
  // ============================================================

  'Игни': 'Igni',
  'Знак огня. Конус пламени перед вами, поджигает врагов. Уязвимые к огню получают двойной урон.':
    'The sign of fire. A cone of flame in front of you that sets enemies alight. Fire-vulnerable foes take double damage.',
  'Аард': 'Aard',
  'Знак телекинеза. Волна сбивает врагов с ног и оглушает.':
    'The sign of telekinesis. A blast knocks enemies off their feet and stuns them.',
  'Квен': 'Quen',
  'Знак защиты. Щит поглощает урон.': 'The sign of protection. A shield that soaks up damage.',
  'Аксий': 'Axii',
  'Знак обмана. Оглушает врага на долгие секунды. Порождений Разлома держит крепче.':
    'The sign of deception. Stuns an enemy for long seconds. It holds Rift spawn even tighter.',
  'Голос Древних': 'Voice of the Ancients',
  'Крик, раскалывающий камень. Радиальный взрыв: отбрасывает, оглушает и жжёт.':
    'A shout that cracks stone. A radial burst: it throws back, stuns, and sears.',
  'Крик: Сила': 'Shout: Force',
  "Ту'ум. Слово СИЛЫ — волна голоса сбивает врагов с ног перед тобой. Слово можно взять у Стены Слова в Пещере Рун.":
    "Thu'um. The Word of FORCE — a wave of voice hurls the enemies before you off their feet. The Word can be taken from the Word Wall in the Rune Cave.",
  'Крик: Мороз': 'Shout: Frost',
  "Ту'ум. Ледяное дыхание: конус стужи замедляет и жжёт холодом. Слово — на Стене Слова на снежном плато Пределья.":
    "Thu'um. Icy breath: a cone of cold that slows and burns with frost. The Word waits on the Word Wall on the snowy plateau of the Marches.",
  'Выпить зелье лечения (+45 ОЗ). Общий откат с эликсиром.':
    'Drink the healing potion (+45 HP). Shares its cooldown with the elixir.',
  'Выпить эликсир (+60 ОВ). Общий откат с зельем.':
    'Drink the elixir (+60 Stamina). Shares its cooldown with the potion.',
  'Удар щитом': 'Shield Bash',
  'Торвальд оглушает врага щитом.': 'Torvald stuns an enemy with his shield.',
  'Боевой клич': 'Battle Cry',
  'Торвальд воодушевляет отряд: +к атаке на 6 секунд.': 'Torvald rallies the party: +attack for 6 seconds.',
  'Ледяная стрела': 'Frost Bolt',
  'Кайя метляет льдом: урон и замедление.': 'Kaya marks a target with ice: damage and a slow.',
  'Исцеление': 'Heal',
  'Кайя лечит раненого союзника.': 'Kaya heals a wounded ally.',

  // ============================================================
  // TABLES — ENEMY_NAME
  // ============================================================

  'Лесной волк': 'Forest Wolf',
  'Лютая волчица': 'Fierce She-Wolf',
  'Разбойник': 'Bandit',
  'Лучник': 'Archer',
  'Главарь разбойников': 'Bandit Chief',
  'Порождение Разлома': 'Rift Spawn',
  'Пожиратель Эха': 'Echo Devourer',
  'Болотник': 'Bogling',
  'Пепельный мрак': 'Ash Shade',
  'Пепельная Мать': 'Ash Mother',
  'Гранитный скорпион': 'Granite Scorpion',
  'Мастер Ямы': 'Pit Master',
  'Драугр': 'Draugr',
  'Стылый тролль': 'Bleak Troll',
  'Иммолтакс': 'Immoltax',
  'Мор-упырь': 'Blight Ghoul',
  'Мор-абом': 'Blight Abomination',
  'Мор-Мать': 'Blight Mother',
  'Пепельный мародёр': 'Ash Marauder',
  'Ордынский колдун': 'Horde Warlock',
  'Гхарз Кровавый Пёс': 'Gharz the Bloodhound',
  'Дрон-страж': 'Guard Drone',
  'Капитан «Двенадцатого»': 'Captain of the Twelfth',

  // ============================================================
  // TABLES — BESTIARY_INFO (name / text / weakness)
  // ============================================================

  'Разбойник-лучник': 'Bandit Archer',
  'Озверевшая стая Сумрачного леса. Кусает быстро, но шкура тонкая.':
    'A feral pack out of the Gloomwood. It bites fast, but the hide is thin.',
  'Уязвим к огню (Игни).': 'Vulnerable to fire (Igni).',
  'Старая, умная и злая. Шрамы говорят: охотилась на людей не раз.':
    'Old, cunning, and cruel. The scars say she has hunted people more than once.',
  'Уязвима к огню. Двойной урон от Игни.': 'Vulnerable to fire. Igni deals double damage.',
  'Дезертиры с трактов. Дерутся грязно, зато предсказуемо.':
    'Deserters off the high roads. They fight dirty, but predictably.',
  'Особых нет. Аард ломает строй.': 'None in particular. Aard breaks their formation.',
  'Стреляет издалека и норовит держать дистанцию.': 'Shoots from afar and tries to keep the distance.',
  'Сближение. Аксий даёт фору.': 'Close the distance. Axii buys you a head start.',
  'Два шрама поперёк лица — и два подхода к фехтованию.':
    'Two scars across the face — and two schools of fencing.',
  'Квен против натиска. Боевой клич Торвальда помогает.':
    'Quen against the onslaught. Torvald\u2019s Battle Cry helps.',
  'Сгусток чужой голодной мысли. Полупрозрачный, шипит на свет.':
    'A clot of someone else\u2019s hungry thought. Half-transparent, it hisses at the light.',
  'Аксий держит его вдвое дольше.': 'Axii holds it twice as long.',
  'Пасть Разлома — судья, а не зверь. Ел королей и богов с их молитвами. По сути — то, что осталось от предыдущего Эхорождённого.':
    'The maw of the Rift — a judge, not a beast. It has eaten kings and gods along with their prayers. In essence — what is left of the previous Echoborn.',
  'Не HP-бой: суд решают ключи, лояльности и Тишь (GDD 01 §6).':
    'Not an HP fight: the judgment is decided by keys, loyalties, and the Silence (GDD 01 §6).',
  'Мелкая прожорливая тварь Топей. Нападает стаей, кусает за пятки. В кишках — тина и желчь.':
    'A small, ravenous vermin of the Bogs. It attacks in packs and snaps at your heels. Its guts are full of sludge and bile.',
  'Уязвим к огню (Игни). Масло против тварей усиливает удары.':
    'Vulnerable to fire (Igni). Beast Oil strengthens your strikes.',
  'Отголосок существ, сгоревших при первом дыхании Разлома. Бродит по Вельду, оставляя пепельные следы.':
    'An echo of the creatures that burned in the first breath of the Rift. It wanders the Veld, leaving ashen footprints.',
  'Спектр. Аксий держит крепче. Масло против спектров — обязательно.':
    'A specter. Axii holds it tighter. Specter Oil is a must.',
  'Матриарх пепельных мраков, гнездится в кургане за Топями. Отмечена Доской объявлений Хеймхолла: топы уносят скот и детей.':
    'Matriarch of the ash shades, nesting in a barrow beyond the Bogs. Posted on the Heimhall notice board: her brood carries off livestock and children.',
  'Спектр. Взрывается пеплом — уходи из круга-телеграфа. Масло против спектров и Аксий решают бой.':
    'A specter. It bursts into ash — step out of the telegraphed circle. Specter Oil and Axii win the fight.',
  'Тварь пепельной котловины: панцирь как скала, хвост как коса. Живёт у Рудника и в каменных россыпях.':
    'A creature of the ash basin: a shell like rock, a tail like a scythe. It lives by the Mine and among the stone screes.',
  'Панцирь трескается от Аарда — стан держит вдвое дольше. Масло против тварей работает.':
    'The shell cracks under Aard — the stun lasts twice as long. Beast Oil works.',
  'Хозяин арены Колонии и голос культа Осколка. Говорит, что слышит Ядро сквозь барьер. В днищах цепей — имена бывших чемпионов.':
    'Master of the Colony\u2019s arena and voice of the Shard cult. He claims to hear the Core through the barrier. The names of former champions hang from his chains.',
  'Цеп-слэм читается по кругу-телеграфу. На 60% здоровья зовёт скорпионов — прибереги АоЕ.':
    'The chain slam is telegraphed by a circle on the ground. At 60% health he calls scorpions — save your AoE.',
  'Мёртвый воин древних, что жили до Разлома. Не гниёт, не спит, не отступает. Стережёт пещеры и курганы Пределья уже тысячи лет.':
    'A dead warrior of the ancients who lived before the Rift. It does not rot, does not sleep, does not retreat. It has guarded the caves and barrows of the Marches for thousands of years.',
  "Крики Ту'ум расшатывают мёртвую волю — Аксий и Сила держат его дольше. Масло против спектров берёт.":
    "Thu'um shouts loosen its dead will — Axii and Force hold it longer. Specter Oil works on it.",
  'Гора белой шерсти и мышц. Регенерирует на глазах, если не добить. Стережёт Стены Слов, будто понимает их ценность.':
    'A mountain of white fur and muscle. It regenerates before your eyes unless you finish it. It guards the Word Walls as if it understood their worth.',
  'Морозный зверь боится огня — Игни наносит двойной урон и мешает регенерации.':
    'A frost beast that fears fire — Igni deals double damage and hampers its regeneration.',
  'Крылатая тень Стылого Пределья. Говорит на древнем языке, и от его слов вспыхивает снег. Душа его — лоно слов силы.':
    'The winged shadow of the Bleak Marches. It speaks a tongue of the ancients, and the snow ignites at its words. Its soul is a womb of Words of Power.',
  'На земле уязвим как зверь; в воздухе достают только знаки, лук Кайи и крики. Читай огненные бомбы по кругам на снегу.':
    'On the ground it is vulnerable like any beast; in the air only signs, the bow of Kaya, and shouts reach it. Read the firebombs by the circles on the snow.',
  'Бывший путник: мор добрался до нутра и переделал под себя. Бежит быстрее человека и не чувствует боли. Кожа — багровая корка.':
    'Once a traveler, until the blight reached the innards and remade them. It runs faster than a man and feels no pain. The skin is a crimson crust.',
  'Плоть скверны горит — Игни бьёт вдвое. Масло против спектров берёт.':
    'Blighted flesh burns — Igni hits twice as hard. Specter Oil works.',
  'Сплетение тел, которого не должно было быть. Мор сросся в гору мяса, что идёт на бастион, как осадный таран.':
    'A weaving of bodies that should never have been. The blight has fused into a mountain of meat that marches on the bastion like a siege ram.',
  'Медлителен. Огонь (Игни) выжигает сросшуюся плоть, Аард роняет его с ног.':
    'Slow. Fire (Igni) burns away the fused flesh, and Aard brings it crashing down.',
  'Матка Мары: из её брющного мешка выходят упыри, её плевки роятся скверной. Штурмует бастион последней волной, когда частокол уже дрожит.':
    'The broodmother of the Blight: ghouls crawl out of her belly-sac, her spittle swarms with corruption. She storms the bastion with the last wave, when the palisade is already trembling.',
  'Читай круги мор-взрыва и конусы плевка. Аксий и Аард держат её надолго — прибереги к финалу волны.':
    'Read the circles of the blight-burst and the cones of spittle. Axii and Aard hold her for a long while — save them for the finale of the wave.',
  'Дезертир Гранитной Колонии, присягнувший Пепельной Орде. Кожа — в угольных узорах, в глазах — восторг от чужого горя.':
    'A deserter of the Granite Colony who swore himself to the Ash Horde. The skin is etched with charcoal patterns, the eyes gleam with delight at another\u2019s grief.',
  'Пепельная плоть горит — Игни бьёт вдвое. Аард ломает набег.':
    'Ashen flesh burns — Igni hits twice as hard. Aard breaks the raid.',
  'Колдун Орды: пепельный гекс летит из-под капюшона. Кричит про «пепельный суд», пока за спиной горят чужие дома.':
    'A warlock of the Horde: an ashen hex flies from beneath the hood. He shrieks of the "ash judgment" while other homes burn behind him.',
  'Хрупок и труслив — держится в тылу. Игни выжигает гекс-плетение.':
    'Fragile and cowardly — it keeps to the rear. Igni burns out the hex-weave.',
  'Вожак Пепельной Орды. Говорит, что Разлом шепчет ему про «великий пир». Рывок с плеча сбивает как таран, рёв сеет панику.':
    'Chief of the Ash Horde. He says the Rift whispers to him of a "great feast." His shoulder charge hits like a battering ram, and his roar sows panic.',
  'Рывок читается по полосе на земле. Рёв — конус: выходи вбок. Аксий держит его надолго.':
    'The charge is telegraphed by a stripe on the ground. The roar is a cone: sidestep it. Axii holds him for a long while.',
  'Боевой дрон «Двенадцатого»: 12 лет на поле аварийной посадки, магазин заряжается от солнца. Жужжит на подходе — значит, лазер уже наведён.':
    'A combat drone of the Twelfth: 12 years on the crash field, its magazine charges on sunlight. If it buzzes on approach, the laser is already aimed.',
  'Хрупкий корпус: Аард роняет на землю, Аксий сбивает наведение. Быстр, но бьёт только с дистанции.':
    'A frail frame: Aard knocks it to the ground, Axii breaks its targeting. Fast, but it only strikes from range.',
  'Эхо Ханны Силв, капитана корабля-призрака. Всё ещё исполняет приказ «держать посадочную полосу», отданный 12 лет назад. Залп орудия и EMP-волна роняют отряд целиком.':
    'The echo of Hannah Silv, captain of the ghost ship. She still carries out the order to "hold the landing strip," given 12 years ago. Her gun salvo and EMP wave drop the whole party at once.',
  'Слаб к Аксию (GDD 07 §3): знак разума гасит эхо надолго. Залп — линия, EMP — круг: читай телеграфы; дроны-подкрепления выходят на износе.':
    'Weak to Axii (GDD 07 §3): the sign of mind snuffs the echo out for a long time. The salvo is a line, the EMP a circle: read the telegraphs; reinforcement drones deploy as her hull wears down.',

  // ============================================================
  // TABLES — ATTR_NAMES
  // ============================================================

  'Мощь': 'Might',
  'Стойкость': 'Vigor',
  'Разум': 'Intellect',
  'Обаяние': 'Charisma',
}
