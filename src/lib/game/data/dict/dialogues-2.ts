// Словарь EN — часть: диалоги, группа 2 (Гранитная Долина + барьер).
// v1.7, агент 23-b. Формат: 'русский ключ': 'English line'.
// КЛЮЧ = строка БУКВАЛЬНО из dialogues.ts (инвентарь .i18n-inv/group-2.json, байт-в-байт).
// Терминология — по glossary.json + dict v1.6: Khran/Kassia/Brok/Finn, the Pit Master,
// the Shard Barrier, Order of Ashes, Coven of Boughs, Free Watch, the Colony, the Pit,
// Core Cleaver, Fighter, renown, Persuasion (DC 14), imprint of the Core, Shard Key.
export const EN_DIALOGUES_2: Record<string, string> = {
  // ---- Барьер Разлома (маска «???») ----

  '???': '???',
  'Воздух звенит и режет, как стекло. За пеленой — пепельные поля Сердца Разлома. Барьер признает лишь тех, кого долина назвала своим. Докажи себя — и путь откроется.':
    'The air rings and cuts like glass. Beyond the veil lie the ash fields of the Heart of the Rift. The barrier acknowledges only those the valley has named its own. Prove yourself — and the way will open.',

  // ---- Суд Пожирателя Эха — вступления и выборы концовок ----

  'Я ел королей. Я ел богов вместе с их молитвами. Но ты... ты принёс мне счёт. Осколки поют, имена звучат — мир отзывается на твоё имя. Выбирай, Эхорождённый: печать или пасть. Я — просто весы.':
    'I have eaten kings. I have eaten gods along with their prayers. But you... you have brought me a reckoning. The shards sing, the names sound out — the world answers to your name. Choose, Echoborn: the seal, or the maw. I am merely the scales.',
  '«Запечатай Разлом. Ценой — эха. Пусть мир живёт тихо». (Печать/Заря)': '"Seal the Rift. The price — echoes. Let the world live quiet." (The Seal/Dawn)',
  '«Влиться в Ядро. Пусть я стану порогом». (Эхо — тёмная жертва)': '"I will pour myself into the Core. Let me become the threshold." (Echo — a dark sacrifice)',
  'Шесть осколков поют в лад. Стена стояла, Роща цветёт, Семя благословлено, и даже угли говорили с тобой на «ты». Мне нечем тебя съесть — ты собрал то, чего я не могу переварить: весь мир целиком.':
    'Six shards sing in harmony. The wall held, the Grove blooms, the Seed is blessed — and even the embers spoke with you like an old friend. I have nothing to eat you with — you have gathered the one thing I cannot digest: the whole world, entire.',
  '«Собери Гексмарк заново — без Ядра. Свободный сад из шести миров». (Раскол вечности)':
    '"Rebuild the Hexmark — without the Core. A free garden of six worlds." (The Sundering of Eternity)',
  '«Запечатай Разлом. Пусть мир живёт». (Печать/Заря)': '"Seal the Rift. Let the world live." (The Seal/Dawn)',
  'Слышишь? Тише, чем в начале разговора. Краски уже гаснут: ты платил за победу тем, что дешевле слов. Мой счёт сошёлся. Осталось только подписать — или всё же бороться?':
    'Do you hear it? Quieter than when our talk began. The colors are already fading: you paid for your victories with things cheaper than words. My reckoning balances. All that remains is to sign — or will you fight after all?',
  '«Запечатай Разлом — даже так». (Печать/Заря)': '"Seal the Rift — even like this." (The Seal/Dawn)',
  '(Опустить руки — позволить Тиши). (Тишь)': '(Lower your hands — let the Silence in). (The Silence)',

  // ---- Осколочный барьер (интеракт) ----

  'Три многогранника Ядра сплетены швом света. Воздух дрожит. Внутри тебя что-то отвечает на это гудение — осколок в твоей голове тёплый, как чужая ладонь.':
    'Three polyhedra of the Core are fused with a seam of light. The air trembles. Something inside you answers that hum — the shard in your head is warm, like a stranger’s palm.',
  '(Коснуться осколка)': '(Touch the shard)',
  '(Отдёрнуть руку)': '(Pull your hand back)',
  'Сквозь гул прорывается слово: «Хран». Осколок показывает: где-то у барьера ждёт человек с тремя лагерями за спиной и войной в глазах.':
    'One word breaks through the hum: "Khran." The shard shows: somewhere by the barrier a man is waiting, with three camps at his back and a war in his eyes.',
  '(Найти Храна)': '(Find Khran)',

  // ---- Хран — Смотритель барьера ----

  'Котловина видела тысячи таких, как ты. Но осколок барьера гудит на тебя, как на своего. Значит, судьба. Слушай: культ Осколка растёт, а голос у него — Мастер Ямы. Три лагеря грызутся за барьер, и Колония трещит по швам.':
    'The basin has seen thousands like you. But the shard of the barrier hums for you like it would for one of its own. So — fate. Listen: the Shard cult is growing, and the Pit Master is its mouthpiece. Three camps gnaw at the barrier, and the Colony is coming apart at the seams.',
  '«Что нужно Колонии?»': '"What does the Colony need?"',
  'Яма — закон Колонии: толпа признаёт только победителей. Возьми карьеру в одном из лагерей, дорастай до «Бойца» — и выиграй бой III у Кассии. Тогда Яма примет твой вызов Мастеру.':
    'The Pit is the law of the Colony: the crowd recognizes winners and no one else. Take up a career with one of the camps, rise to "Fighter" — and win a Combat III bout against Kassia. Then the Pit will accept your challenge to the Master.',
  '«Значит, начнём с Ямы.»': '"Then we start with the Pit."',
  'И запомни: мир сильнее тебя. Пока не вырастешь — не лезь к скорпионам Рудника и не суйся в яму за ставкой, которой нет.':
    'And remember: the world is stronger than you. Until you have grown — stay clear of the Mine scorpions, and don’t set foot in the pit for a stake that isn’t there.',
  '(Кивнуть)': '(Nod)',
  'Кассия ждёт у Ямы. Бой III, не меньше — толпа должна реветь твоё имя, иначе Мастер не выйдет.':
    'Kassia waits by the Pit. A Combat III bout, no less — the crowd has to roar your name, or the Master won’t come out.',
  '(Идти к Яме)': '(Go to the Pit)',
  'Заслон Ямы гремит. Мастер ждёт. Не позорь Колонию — и приходи живым.': 'The pit grate grinds. The Master is waiting. Don’t shame the Colony — and come back alive.',
  '(К арене)': '(To the arena)',
  'Мастер Ямы сгнил в собственных цепях, а барьер молчит. Возьми: это отпечаток Ядра, осколок из сердца барьера. Шесть таких — ключи, говорят старики. Твой — первый.':
    'The Pit Master has rotted in his own chains, and the barrier is silent. Take this: the imprint of the Core, a shard from the heart of the barrier. Six such shards are keys, the old-timers say. Yours is the first.',
  '(Принять Ключ-осколок)': '(Take the Shard Key)',
  'Барьер шепчет спокойнее. Колония запомнит, на чьей стороне стоял Смотритель. Война за барьер — не кончена. Но сегодня — пейте, Колония!':
    'The barrier’s whisper is calmer now. The Colony will remember whose side the Watcher stood on. The war for the barrier is not over. But tonight — drink, Colony!',
  'Ключ у тебя. Дальше — Сердце Разлома и то, что гремит за ним. Барьер будет держаться, пока держится Колония.':
    'The key is yours. Next — the Heart of the Rift, and what thunders beyond it. The barrier will hold as long as the Colony holds.',

  // ---- Кассия — ямные бои ----

  'Яма — закон Колонии. Ставка — твоё золото, слава — твоя репутация, шрамы — твоя беда. Выбирай карточку, гладиатор.':
    'The Pit is the law of the Colony. Your stake is your gold, your renown is your reputation, your scars are your trouble. Pick a card, gladiator.',
  '«Драчун из рудников» — ставка 25, выплата 60.': '"Brawler from the Mines" — stake 25, payout 60.',
  '«Пара головорезов» — ставка 60, выплата 140.': '"A Pair of Cutthroats" — stake 60, payout 140.',
  '«Чемпион ямы» — ставка 110, выплата 270.': '"Pit Champion" — stake 110, payout 270.',
  '«Что за бои?»': '"What are these fights?"',
  '(Уйти)': '(Leave)',
  'Три карточки: драчун, головорезы, чемпион. Чемпион — только для тех, кто дослужился до «Бойца» в своём лагере. Проиграешь — ставка остаётся в яме. Яма всё помнит.':
    'Three cards: brawler, cutthroats, champion. The champion bout is only for those who rose to "Fighter" in their camp. Lose, and the stake stays in the pit. The Pit remembers everything.',
  '(Назад)': '(Back)',
  'Ты выиграл чемпионский бой, и толпа ходит ходуном. Заслон гремит — Мастер Ямы ждёт на арене. Хочешь объявить вызов по правилам?':
    'You won the champion bout, and the crowd is shaking the floor. The grate grinds — the Pit Master is waiting in the arena. Want to issue the challenge by the rules?',
  'ВЫЗВАТЬ МАСТЕРА ЯМЫ': 'CHALLENGE THE PIT MASTER',
  '(Ещё не готов)': '(Not ready yet)',

  // ---- Брок — кузнец Колонии ----

  'Молот бьёт в такт пульсу Разлома. Кузнец даже не поднимает глаз: «Для чужих — лавка. Для своих — ковка. А своими не считаю, пока не принесёшь гранитной руды».':
    'The hammer beats in time with the pulse of the Rift. The smith doesn’t even look up: "For strangers — a shop. For our own — the forge. And no one counts as our own until they bring me granite ore."',
  '«Где взять руду?»': '"Where do I get ore?"',
  'Лавка кузнеца': 'Blacksmith’s shop',
  'Жилы у Рудника на северо-востоке котловины. Пять штук светятся серединой, ты не перепутаешь. Принеси четыре — и я сковал бы для тебя тесак, каких Орден не видал.':
    'The veins are by the Mine, in the northeast of the basin. Five of them glow at the center — you can’t miss them. Bring me four, and I’d forge you a cleaver the Order itself never saw.',
  '(К Руднику)': '(To the Mine)',
  'Руды мало. Жилы у Рудника, я сказал. Молот ждать не любит.': 'Not enough ore. The veins are by the Mine, I said. The hammer doesn’t like waiting.',
  'Ха! Слажено бьёшь — руда как отобранная. Ну, держи слово: горн горячий, тесак будет злой.':
    'Ha! You strike in rhythm — ore as if hand-picked. Well, keep your word: the forge is hot, and the cleaver will be mean.',
  '(Отдать 4 руды)': '(Hand over 4 ore)',
  '«Ядровой тесак». Тяжёлый, как приговор. Носи и помни: Колония кует своим.':
    '"Core Cleaver." Heavy as a verdict. Wear it and remember: the Colony forges for its own.',
  'Тесак послужит. Заходи в лавку — для своих цены честные.': 'The cleaver will serve. Come by the shop — prices are honest for our own.',

  // ---- Йорв — вербовка Ордена Пепла ----

  'Орден Пепла — порядок против Тишины. Мы держим барьер строем и молимся огню. У нас дисциплина, жалованье и лучшие знаки в котловине. Но свободных мы не жалуем.':
    'The Order of Ashes — order against the Silence. We hold the barrier in ranks and pray to fire. We offer discipline, wages, and the best signs in the basin. But the unsworn earn no favor from us.',
  'Вступить в Орден Пепла': 'Join the Order of Ashes',
  'Повысить ранг (слава 30 → 250 зол., 70 → 600 зол.)': 'Rise in rank (renown 30 → 250 gold, 70 → 600 gold)',
  '«Что даёт карьера?»': '"What does a career grant?"',
  'Добро пожаловать в строй, новобранец. Пепел на плаще — на удачу. Знаки твои отныне горят ярче с каждым рангом.':
    'Welcome to the ranks, recruit. Ash on the cloak — for luck. From now on your signs burn brighter with every rank.',
  '(К службе)': '(To duty)',
  'Ранг — это доверие строя. Слава ямы и служба Ордену считаются. Взнос — в казну барьера. Служи — расти.':
    'Rank is the formation’s trust. Pit renown and service to the Order both count. The fee goes to the barrier’s treasury. Serve, and rise.',
  'Знаки сильнее на двенадцать процентов за ранг; ветеран Ордена держит строй так, что броня дышит глубже. Орден Пепла не даёт лёгких путей — даёт надёжные.':
    'Signs grow twelve percent stronger per rank; a veteran of the Order holds the line so well your armor breathes easier. The Order of Ashes gives no easy roads — it gives reliable ones.',

  // ---- Лиара — вербовка Ковена Ветвей ----

  'Ковен Ветвей верит: эхо — это семена. Мы варим масла и зелья, читаем следы монстров и растим новое из старого. Ковен не спросит, чисты ли твои руки — но помнит каждую услугу.':
    'The Coven of Boughs believes: echoes are seeds. We brew oils and potions, read monster tracks, and grow the new out of the old. The Coven won’t ask whether your hands are clean — but it remembers every favor.',
  'Вступить в Ковен Ветвей': 'Join the Coven of Boughs',
  'Ветвь приняла тебя. Масла на твоём клинке будут держаться дольше, а зелья — глубже. Не подведи рощу.':
    'The Boughs have taken you in. Oils on your blade will last longer, and potions will reach deeper. Don’t fail the grove.',
  '(К роще)': '(To the grove)',
  'Слава ямы и услуги Ковену считаются. Взнос идёт в семенной запас. Расти — и роща вырастет с тобой.':
    'Pit renown and services to the Coven both count. The fee goes to the seed stock. Grow, and the grove will grow with you.',
  'Масла держатся на четверть дольше за ранг, зелья лечат на шесть очков за ранг. Ковен Ветвей — это терпение и химия.':
    'Oils last a quarter longer per rank, and potions heal six points more per rank. The Coven of Boughs is patience and chemistry.',

  // ---- Финн — вербовка Вольного Дозора ----

  'Вольный Дозор: никаких хозяев, только торговые пути и хорошие клинки. Мы продали бы и собственную тень — если б цена была честной. В Колонии я на заработках, но свой караван я соберу.':
    'The Free Watch: no masters, just trade roads and good blades. We would sell our own shadows — if the price were honest. In the Colony I am working my earnings, but I will raise a caravan of my own.',
  'Вступить в Вольный Дозор': 'Join the Free Watch',
  '«Клеймо из панцирей?»': '"A brand of carapaces?"',
  'Рукопожатие — и никаких бумаг. Дозор идёт быстрее прочих и никогда не устаёт. Почти.':
    'A handshake — and no paperwork. The Watch moves faster than the rest and never tires. Almost.',
  '(К путям)': '(To the roads)',
  'Караваны Дозора не возят тех, кто не держал клеймо. Пять панцирей гранитных скорпионов из котловины — и имя Финна откроет тебе лагерные ворота.':
    'The Watch caravans don’t carry those who never held a brand. Five granite scorpion carapaces from the basin — and Finn’s name will open the camp gates for you.',
  '(В котловину)': '(Into the basin)',
  'Панцири сами себя не соберут. Скорпионы рыщут у Рудника и в южной россыпи. Удачи, гладиатор.':
    'Carapaces won’t gather themselves. The scorpions prowl by the Mine and in the southern scree. Good luck, gladiator.',
  'Пять панцирей, ни одним меньше — клеймо готово! Дозор запомнит. Держи монеты — половина от первой прибыли каравана, честно.':
    'Five carapaces, not one fewer — the brand is ready! The Watch will remember. Take the coins — half of the caravan’s first profit, honest.',
  '(Отдать клеймо)': '(Hand over the brand)',
  'Слава — валюта честная. Взнос — в общий котёл. С каждым рангом ты ходишь легче и дышишь ровнее.':
    'Renown is honest currency. The fee goes into the common pot. With every rank you walk lighter and breathe steadier.',
  'Со второго ранга — «глаз Дозора»: девятнадцатка на кости тоже считается критом. Плюс лёгкая поступь и дыхание: скорость и выносливость растут с рангом.':
    'From the second rank — the "eye of the Watch": a nineteen on the die counts as a crit too. Plus a light step and steady breath: speed and stamina grow with rank.',
  'Клеймо собрано — караваны будут рады. Обращайся, Дозор помнит своих.': 'The brand is assembled — the caravans will be glad. Come to us anytime — the Watch remembers its own.',

  // ---- Мастер Ямы — интро у арены (таймер, Убеждение СЛ 14) ----

  'Значит, ты тот, кто гремит в Колонии. Я слышу Осколок сквозь барьер — он шепчет твоё имя, Смотритель. Яма сделала меня хозяином этой котловины. Она сделает из тебя удобрение. Выходи — или ползи.':
    'So you’re the one making noise in the Colony. I hear the Shard through the barrier — it whispers your name, Watcher. The Pit made me the master of this basin. It will make fertilizer of you. Come out — or crawl.',
  '(Выйти на арену)': '(Step into the arena)',
  '«Твои чемпионы шептались о тебе в темноте — они боялись не Осколка. Тебя.»':
    '"Your champions whispered about you in the dark — it wasn’t the Shard they feared. It was you."',
  'Убеждение': 'Persuasion',
  'Убеждение (СЛ 14)': 'Persuasion (DC 14)',
  '(Отступить от Ямы)': '(Back away from the Pit)',
  'Цепи дрожат в его руках: «Они... молчали. Я СЛЫШАЛ их молчание!» Толпа гудит — он вышел на арену злее и слабее обычного.':
    'The chains tremble in his hands: "They... were silent. I HEARD their silence!" The crowd hums — he steps into the arena angrier and weaker than usual.',
  '(Бой!)': '(Fight!)',
  'Слова против цепей? Толпа хохочет. Он выбирает цепь потолще — и начинает бой с настроением.':
    'Words against chains? The crowd howls with laughter. He picks a thicker chain — and starts the fight in a mood.',
}
