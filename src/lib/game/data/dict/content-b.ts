// ============================================================
// Словарь EN — часть: контент B (мир/зоны, концовки, карьера, тренер).
// Ведёт агент 22-d. Формат: 'русский ключ': 'English line'.
// Ключ = букварь RU как в коде (все «», —, точки). Плейсхолдеры {x} сохранены.
// Канон имён/терминов — GDD 09: Кайя=Kaya, Смотритель=Watcher,
// Орден Пламени=Order of the Flame, Тишь=the Silence и т.д.
// ============================================================

export const EN_CONTENT_B: Record<string, string> = {
  // ---------------- world.ts: зоны/области ----------------
  'Хеймхолл': 'Heimhall',
  'Сумрачный лес': 'the Gloomwood',
  'Камни Древних': 'Stones of the Ancients',
  'Озеро Лун': 'Lake of Moons',
  'Лагерь разбойников': 'Bandit Camp',
  'Сердце Разлома': 'Heart of the Rift',
  'Долина': 'the Valley',
  'Лагерь': 'Camp',
  'Разлом': 'the Rift',

  // ---------------- world.ts: имена и роли NPC ----------------
  'Бьорн': 'Bjorn',
  'Старейшина': 'Elder',
  'Грим': 'Grim',
  'Торговец': 'Merchant',
  'Альра': 'Alra',
  'Алхимик': 'Alchemist',
  'Дорн': 'Dorn',
  'Наставник': 'Trainer',
  'Ирма': 'Irma',
  'Капитан Ордена': 'Captain of the Order',
  'Селена': 'Selena',
  'Архимаг Ковена': 'Archmage of the Coven',
  'Кайя': 'Kaya',
  'Магистр-странница': 'Wandering Magistra',
  'Торвальд': 'Torvald',
  'Воитель': 'Warrior',
  'Хран': 'Khran',
  'Смотритель барьера': 'Warden of the Barrier',
  'Кассия': 'Kassia',
  'Распорядительница Ямы': 'Mistress of the Pit',
  'Брок': 'Brok',
  'Кузнец Колонии': 'Blacksmith of the Colony',
  'Йорв': 'Yorv',
  'Офицер Ордена Пепла': 'Officer of the Order of Ashes',
  'Лиара': 'Liara',
  'Послушница Ковена Ветвей': 'Novice of the Coven of Boughs',
  'Финн': 'Finn',
  'Вольный стрелок Дозора': 'Free Ranger of the Watch',
  'Эйнар': 'Einar',
  'Сказитель Пределья': 'Skald of the Marches',
  'Ингрид': 'Ingrid',
  'Охотница Пределья': 'Huntress of the Marches',
  'Командор Мейра': 'Commander Meira',
  'Командор Бастиона': 'Commander of the Bastion',
  'Досент Хольт': 'Docent Holt',
  'Изучатель мора': 'Blight Scholar',
  'Ульва': 'Ulva',
  'Хранительница Рощи': 'Keeper of the Grove',
  'Пруша': 'Prusha',
  'Беженка из Колонии': 'Refugee from the Colony',
  'Тарбен': 'Tarben',
  'Следопыт пустоши': 'Pathfinder of the Wastes',
  'Гхарз Кровавый Пёс': 'Gharz the Bloodhound',
  'Вожак Пепельной Орды': 'War Chief of the Ash Horde',
  'Ашер': 'Asher',
  'Техник Внешнего Рубежа': 'Technician of the Outer Rim',

  // ---------------- интерактивные объекты (имена) ----------------
  'Древний алтарь': 'Ancient Altar',
  'Лунная трава': 'Moon Herb',
  'Пелена Разлома': 'Veil of the Rift',
  'Врата Тумана': 'the Mist Gate',
  'Доска объявлений': 'Notice Board',
  'Врата Гранита': 'the Granite Gate',
  'Осколочный барьер': 'the Shard Barrier',
  'Гранитная жила': 'Granite Vein',
  'Врата Пределья': 'the Marches Gate',
  'Рунный камень': 'Rune Stone',
  'Древняя плита': 'Ancient Slab',
  'Рунная дверь': 'the Rune Door',
  'Стена Слова': 'the Word Wall',
  'Врата Мары': 'the Blight Gate',
  'Сигнальный рог': 'Signal Horn',
  'Мор-сгусток': 'Blight Node',
  'Врата Спорных Земель': 'the Gate of the Contested Lands',
  'Узел беженцев': 'Refugee Cache',
  'Семя Разлома': 'the Rift Seed',
  'Врата Внешнего Рубежа': 'the Outer Rim Gate',
  'Стазис-капсула': 'Stasis Pod',
  'Ретранслятор': 'Relay',
  'Посадочное кольцо': 'Landing Ring',
  'Бортжурнал «Двенадцатого»': 'Ship Log of the Twelfth',

  // ---------------- интерактивные объекты (prompt) ----------------
  'Осмотреть': 'Examine',
  'Собрать': 'Gather',
  'Войти': 'Enter',
  'Читать': 'Read',
  'Прочитать': 'Read',
  'Прочесть': 'Read',
  'Коснуться': 'Touch',
  'Добыть': 'Mine',
  'Повернуть': 'Turn',
  'Бить рог': 'Sound the Horn',
  'Выжечь': 'Burn Out',
  'Откопать': 'Dig Up',
  'Прочитать табличку': 'Read the Plaque',
  'Синхронизировать': 'Synchronize',
  'Осмотреть разметку': 'Survey the Markings',

  // ---------------- врата: ярлыки затемнения (GATES/GR/FR/MA/DF/RB) ----------------
  'Долина Хеймхолл': 'Heimhall Valley',
  'Вельд': 'the Veld',
  'ГРАНИТНАЯ ДОЛИНА': 'GRANITE VALLEY',
  'Гранитная Долина': 'Granite Valley',
  'СТЫЛОЕ ПРЕДЕЛЬЕ': 'THE BLEAK MARCHES',
  'Стылое Пределье': 'the Bleak Marches',
  'БАГРОВАЯ МАРА': 'THE CRIMSON BLIGHT',
  'СПОРНЫЕ ЗЕМЛИ': 'THE CONTESTED LANDS',
  'Спорные Земли': 'the Contested Lands',
  'ВНЕШНИЙ РУБЕЖ': 'THE OUTER RIM',
  'Внешний Рубеж': 'the Outer Rim',

  // ---------------- названия зон/областей и метки карты ----------------
  'Гнилые Топи': 'the Rotting Mires',
  'Пепельный курган': 'the Ash Barrow',
  'Колония': 'the Colony',
  'Яма Колонии': 'the Colony Pit',
  'Яма': 'the Pit',
  'Рудник': 'the Mine',
  'Стылый Приют': 'Bleak Haven',
  'Пещера Рун': 'the Rune Cave',
  'Снежное плато': 'the Snowy Plateau',
  'Драконий Дол': 'Dragonhold',
  'Багровая Мара': 'the Crimson Blight',
  'Бастион Ветвей': 'Bough Bastion',
  'Логово Моры': 'the Blight Lair',
  'Роща Садовников': "Gardeners' Grove",
  'Обугленный погост': 'the Scorched Graveyard',
  'Лагерь Пепельной Орды': 'the Ash Horde Camp',
  'Кратер «Двенадцатого»': 'Crater of the Twelfth',
  'Хребет сигналов': 'the Signal Ridge',
  'Посадочные кольца': 'the Landing Rings',
  '«Двенадцатый»': 'the Twelfth',

  // ---------------- Пещера Рун: символы ----------------
  'Заяц': 'Hare',
  'Волк': 'Wolf',
  'Луна': 'Moon',

  // ---------------- Вельд: цепочка следов (clue) ----------------
  'Обглоданные кости': 'Gnawed Bones',
  'Кости болотного скота, обглоданные до белого блеска. Следы от когтей — шире ладони. Тварь шла на северо-восток.':
    'Bones of bog cattle, gnawed to a white gleam. Claw marks wider than a hand. The thing was heading northeast.',
  'Пепельный след': 'Ashen Print',
  'Отпечаток лапы, заполненный серым пеплом. Земля вокруг выжжена кругом — где ступала тварь, трава не растёт.':
    'A pawprint filled with grey ash. The ground around it is burned in a ring — where the thing stepped, no grass grows.',
  'Выжженный круг': 'Scorched Circle',
  'Круг выжженной земли, в центре — остов волка, оплетённый пепельными нитями. Логово близко: курган виден сквозь туман.':
    'A circle of scorched earth; at its center, the skeleton of a wolf laced with threads of ash. The lair is close: the barrow shows through the mist.',

  // ---------------- Стылое Пределье: следы пожара (clue) ----------------
  'Обугленная сосна': 'Charred Pine',
  'Сосна сгорела изнутри, снег вокруг растоплен и снова замёрз коркой. Огонь падал сверху — с неба.':
    'The pine burned from within; the snow around it melted and froze over again into a crust. The fire fell from above — from the sky.',
  'Волчья стая-скелет': 'Skeletal Wolf Pack',
  'Четыре скелета волков в кругу оплавленного снега. Ни клыков, ни когтей в стороне — они дрались спинами внутрь.':
    'Four wolf skeletons in a circle of melted snow. No fangs or claws facing outward — they fought with their backs turned inward.',
  'Крыло в скале': 'Wing in the Rock',
  'В скалу впечатано что-то огромное и кожистое — обрывок крыла. Верхние тёплые ветра Пределья носят того, кто его потерял.':
    'Something huge and leathery is embedded in the rock — a torn scrap of wing. The high warm winds of the Marches carry the one who lost it.',

  // ---------------- Внешний Рубеж: экипаж «Двенадцатого» (капсулы стазиса) ----------------
  'Силв, Ханна — капитан': 'Silva, Hanna — captain',
  'Крой, Дан — пилот': 'Croy, Dan — pilot',
  'Мэй, Ора — техник': 'May, Ora — technician',
  'Вант, Йель — медик': 'Vant, Yale — medic',
  'Гарс, Тэм — связист': 'Gars, Tam — signalman',
  'Ило, Кэсс — штурман': 'Ilo, Cass — navigator',
  'Рид, Март — оружейник': 'Reed, Mart — armorer',
  'Сонн, Лея — ботаник': 'Sonn, Leia — botanist',
  'Фейн, Дори — кочегар': 'Feyn, Dory — stoker',
  'Укко, Барт — грузчик': 'Ukko, Bart — loader',
  'Ясс, Нива — радист': 'Yass, Niva — radio operator',
  'Орт, Кем — кадет': 'Ort, Kem — cadet',

  // ---------------- имена врагов/боссов (ENEMY_NAME, tables.ts) ----------------
  'Лесной волк': 'Forest Wolf',
  'Лютая волчица': 'Dire She-Wolf',
  'Разбойник': 'Bandit',
  'Лучник': 'Archer',
  'Главарь разбойников': 'Bandit Chief',
  'Порождение Разлома': 'Rift Spawn',
  'Пожиратель Эха': 'the Echo Devourer',
  'Болотник': 'Bogling',
  'Пепельный мрак': 'Ash Shade',
  'Пепельная Мать': 'Ash Mother',
  'Гранитный скорпион': 'Granite Scorpion',
  'Мастер Ямы': 'the Pit Master',
  'Драугр': 'Draugr',
  'Стылый тролль': 'Frost Troll',
  'Иммолтакс': 'Immolthax',
  'Мор-упырь': 'Blight Ghoul',
  'Мор-абом': 'Blight Abomination',
  'Мор-Мать': 'the Blight Mother',
  'Пепельный мародёр': 'Ash Marauder',
  'Ордынский колдун': 'Horde Warlock',
  'Дрон-страж': 'Sentinel Drone',
  'Капитан «Двенадцатого»': 'the Captain of the Twelfth',

  // ---------------- финал: роли отряда в рейде ----------------
  'Авангард': 'Vanguard',
  'Артиллерия': 'Artillery',

  // ---------------- финал: судьбы компаньонов (эпилог) ----------------
  'Кайя легла в Сердце Разлома — её эхо ушло в Ядро вместе с чужими мирами. В Роще теперь поют и о ней.':
    'Kaya fell at the Heart of the Rift — her echo passed into the Core together with the alien worlds. In the Grove, they sing of her now, too.',
  'Кайя легла в Сердце Разлома — её эхо ушло в Ядро вместе с чужими мирами. У Врат Тумана до сих пор тепло: ты приходишь туда с её искрой, и она не гаснет.':
    'Kaya fell at the Heart of the Rift — her echo passed into the Core together with the alien worlds. By the Mist Gate it is still warm: you come there carrying her spark, and it never dies out.',
  'Торвальд принял смерть как дозорный: лицом к волне. Его щит стоит у ворот Хеймхолла — вместо надгробия.':
    'Torvald met his death like a watchman: facing the wave. His shield stands at the gates of Heimhall — in place of a tombstone.',
  'Кайя вернулась в Рощу — учитель узнал её. Теперь она учит садовников слышать лес, а её смех снова звучит как колокольчик.':
    'Kaya returned to the Grove — her teacher knew her at once. Now she teaches the gardeners to hear the forest, and her laughter rings like a little bell again.',
  'Кайя вернулась в Рощу — дом на двоих у Камней Древних. Учитель узнал её; а твоё обещание, как она и велела, не остывает.':
    'Kaya returned to the Grove — a home for two by the Stones of the Ancients. Her teacher knew her; and your promise, just as she bade you, never goes cold.',
  'Торвальд допил кружку до дна и остался: стена Бастиона держалась — значит, и он ещё держится. Лучшего щита долине не найти.':
    'Torvald drained his mug to the bottom and stayed: the wall of the Bastion held — so he holds still, too. The valley could find no better shield.',
  'Кайя выжила, но Рощу не спасла. Она улыбается реже: где-то в её голове теперь тихий шёпот паразита — и она слушает его молча.':
    'Kaya survived, but she did not save the Grove. She smiles less often: somewhere in her head a parasite now whispers softly — and she listens to it in silence.',
  'Торвальд выжил, но Бастион для него — шрам. Он пьёт молча и смотрит на восток, где стена, которую он не удержал.':
    'Torvald survived, but the Bastion is a scar to him now. He drinks in silence and stares east, toward the wall he failed to hold.',
  'Ашер вернулся на «Двенадцатый» — уже не один. Экипаж, брошенный 12 лет назад, похоронен по именам, а его дроны теперь сторожат не полосу, а людей.':
    'Asher returned to the Twelfth — no longer alone. The crew abandoned twelve years ago has been buried by name, and his drones now watch over people, not a landing strip.',
  'Ашер починил больше, чем корабль: двое у костра у трапа — это уже не лагерь, а причал. «Двенадцатый» больше не ждёт — его ждут.':
    'Asher fixed more than a ship: two people by the fire at the gangway — that is no longer a camp, but a berth. The Twelfth no longer waits — it is awaited.',
  'Ашер остался на плато: чинить корабль, который уже не взлетит, и ждать ещё одну дюжину лет. Имена экипажа он выучил сам — вслух, по ночам.':
    'Asher stayed on the plateau: mending a ship that will never fly again, waiting another dozen years. The names of the crew he learned by himself — aloud, through the nights.',

  // ---------------- финал: 5 концовок (имена и интро) ----------------
  'Раскол вечности': 'The Sundering of Eternity',
  'Ты знаешь то, чего не знает никто: как зовут каждое эхо. Ты выслушал угли, благословил Семя, держал стену и не продал ни одного имени.':
    'You know what no one else knows: the name of every echo. You listened to the embers, blessed the Seed, held the wall — and never sold a single name.',
  'Пожиратель отступает — перед ним не Эхорождённый, а весь мир сразу. Ядро рассыпается на шесть граней... и ни одна из них больше не подчиняется ему.':
    'The Devourer recoils — before it stands not a Riftborn, but the whole world at once. The Core shatters into six facets... and none of them obeys it any longer.',
  'Заря': 'Dawn',
  'Шесть осколков поют в лад — Ядро собирается, как разбитая чашка, которую склеили руками тех, кто помнит каждый скол.':
    'Six shards sing in harmony — the Core reassembles like a broken cup, glued back together by hands that remember every crack.',
  'Мир рождается заново. Отряд стоит рядом: живые, верные, услышанные.':
    'The world is born anew. The party stands beside you: alive, loyal, heard.',
  'Печать': 'The Seal',
  'Разлом затягивается швом из чужих правил. Тишь уходит глубже — но и эхо уходят вместе с ним.':
    'The Rift closes over with a seam of alien laws. The Silence retreats deeper — but the echoes depart with it.',
  'Мир жив. Память миров — под замком, ключ выброшен.':
    'The world lives. The memory of worlds lies under lock, and the key has been thrown away.',
  'Тишь': 'The Silence',
  'Ты слишком часто выбирал дешевле слов. Тишь пришла не врагом — она пришла как счёт.':
    'You chose the cheaper path over words too many times. The Silence did not come as an enemy — it came as a reckoning.',
  'Краски гаснут не вспышкой, а выдохом. Гексмарк пуст. Никто не помнит, что забыл.':
    'The colors go out not in a flash but in a breath. The Hexmark is empty. No one remembers what was forgotten.',
  'Эхо': 'The Echo',
  'Ты вливаешься в Ядро — сам, по своей воле. Пустота принимает тебя, как принимала предыдущего.':
    'You pour yourself into the Core — willingly, by your own will. The Void receives you as it received the one before you.',
  'Теперь ты — порог между мирами. Хранитель-Пожиратель: тот, кто помнит всё и не может сказать ни слова.':
    'Now you are the threshold between worlds. The Keeper-Devourer: the one who remembers everything and cannot speak a word.',

  // ---------------- финал: эпилог (фракция, Тишь, Спорные, карьера) ----------------
  'Ты ушёл из долины до рассвета, никому ничего не сказав. Долг Смотрителя исполнен — а судьба Хеймхолла теперь в руках его людей.':
    'You left the valley before dawn, telling no one anything. The Watcher\u2019s duty is done — and Heimhall\u2019s fate now rests in the hands of its people.',
  'Орден Пламени воздвиг у Разлома сторожевую башню. Капитан Ирма лично подняла твоё имя на её ворота.':
    'The Order of the Flame raised a watchtower by the Rift. Captain Irma lifted your name onto its gates with her own hands.',
  'Сталь и строй — теперь этого достаточно. Пока достаточно.':
    'Steel and discipline — for now, that is enough. For now.',
  'Ковен Тумана переписал печать, и Разлом затянулся туманом. Архимаг Селена назвала тебя «голосом между мирами».':
    'The Coven of Mist rewrote the seal, and the Rift closed over with fog. Archmage Selena called you "the voice between worlds".',
  'Туман помнит. Туман ждёт.':
    'The fog remembers. The fog waits.',
  'Но краски долины так и не вернулись: где-то в швах мира осталась Тишь — цена тех выборов, что были дешевле слов.':
    'But the colors of the valley never returned: somewhere in the seams of the world the Silence remains — the price of the choices that were cheaper than words.',
  'Небо над долиной того же цвета, что и до Разлома: человечность — редкая валюта, ты потратил её бережно.':
    'The sky above the valley is the same color it was before the Rift: humanity is a rare currency, and you spent it with care.',
  'А Смотритель? Смотритель всегда найдёт работу. Монстров много, контрактов больше.':
    'And the Watcher? A Watcher will always find work. There are plenty of monsters — and more contracts still.',
  'Спорные Земли говорят только углём: вереск выгорел, Роща — пепел, а Орда пела, пока горели чужие шатры.':
    'The Contested Lands speak only in charcoal: the heath burned away, the Grove turned to ash — and the Horde sang while other people\u2019s tents were burning.',
  'Спорные Земли вереском зацвели: Семя благословлено, фонари Рощи горят до сих пор, и беженцы называют тебя тем, кто не продался.':
    'The Contested Lands bloomed with heather: the Seed is blessed, the Grove\u2019s lanterns burn to this day, and the refugees call you the one who did not sell out.',
  'Пепельная Орда рассеялась после набега на Рощу, но Семя в сердце рощи так и не нашло покоя.':
    'The Ash Horde scattered after the raid on the Grove, but the Seed in the heart of the grove never found peace.',
  '{career} помнит, на чьей стороне ты стоял в войне за барьер — и это значит больше, чем любое золото.':
    '{career} remembers whose side you stood on in the war for the barrier — and that means more than any gold.',

  // ---------------- финал: статы (EndingHudState.stats) ----------------
  'Уровень': 'Level',
  'Убито врагов': 'Enemies Slain',
  'Золото': 'Gold',
  'Время в игре': 'Time Played',
  'Фракция': 'Faction',
  'Орден Пламени': 'Order of the Flame',
  'Ковен Тумана': 'Coven of Mist',
  'Вольный смотритель': 'Freelance Watcher',
  'нет': 'none',
  'Спутники': 'Companions',
  'Карьера Колонии': 'Colony Career',
  'Ключи-осколки': 'Shard Keys',

  // ---------------- карьера фракций (career.ts) ----------------
  'Орден Пепла': 'Order of Ashes',
  'Ковен Ветвей': 'Coven of Boughs',
  'Вольный Дозор': 'Free Watch',
  '—': '—',
  'Новобранец': 'Recruit',
  'Боец': 'Fighter',
  'Ветеран': 'Veteran',
  'Знаки сильнее на +12% за ранг': 'Signs are +12% stronger per rank',
  'Ранг 3: +2 к классу брони': 'Rank 3: +2 to armor class',
  'Масла держатся на +25% дольше за ранг': 'Oils last +25% longer per rank',
  'Зелья лечат на +6 ОЗ за ранг': 'Potions heal +6 HP per rank',
  'Ранг 2+: криты выпадают на 19–20': 'Rank 2+: critical hits trigger on 19–20',
  '+6% скорости и реген выносливости за ранг': '+6% speed and stamina regen per rank',
  'Драчун из рудников': 'Brawler from the Mines',
  'Пара головорезов': 'A Pair of Cutthroats',
  'Чемпион ямы': 'Pit Champion',

  // ---------------- прогрессия: атрибуты и тренер (progression.ts) ----------------
  'Мощь': 'Might',
  'Стойкость': 'Endurance',
  'Разум': 'Intellect',
  'Обаяние': 'Charisma',
  'Владение клинком': 'Blade Mastery',
  '+1 к атаке за ранг.': '+1 to attack per rank.',
  'Живучесть': 'Vitality',
  '+15 к макс. здоровью за ранг.': '+15 to max health per rank.',
  'Ловкость знаков': 'Sign Aptitude',
  '+15% к силе знаков за ранг.': '+15% to sign power per rank.',
  'Красноречие': 'Eloquence',
  '+1 к проверкам убеждения за ранг.': '+1 to persuasion checks per rank.',
  'Аард': 'Aard',
  'Квен': 'Quen',
  'Аксий': 'Axii',
  'Усилить знак: больше урона и длительности.': 'Empower the sign: more damage and longer duration.',
}
