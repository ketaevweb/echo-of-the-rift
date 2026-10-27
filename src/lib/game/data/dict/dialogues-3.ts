// Словарь EN — часть: диалоги, группа 3 (Стылое Пределье + Багровая Мара:
// Эйнар, Ингрид, Древняя плита, Стена Слова, Командор Мейра, Досент Хольт, Сигнальный рог).
// Ведёт агент 23-c. Формат: 'русский ключ': 'English line'.
// КЛЮЧ = строка БУКВАЛЬНО как в исходнике (инвентарь .i18n-inv/group-3.json).
// Термины — по en-dict v1.6 / glossary: Thu'um, the Word Wall, the Rune Cave,
// Bleak Haven, the Bleak Marches, Frostreach, Dragon Hollow, draugr,
// the Watcher, the Blight, the Blight Mother, the Lair, the Bastion of the Boughs,
// the Colony, palisade, ghouls, abominations, blight glands, XP, gold.
export const EN_DIALOGUES_3: Record<string, string> = {
  // ============================================================
  // ЭЙНАР — сказитель Стылого Приюта (frost_einar)
  // ============================================================
  'Присядь, путник, к огню. Я — Эйнар, и я помню песни, что старше этого Разлома. Древние говорили с миром голосом — Ту\'умом. Снег перед их словами вспыхивал. Ты — не такой, как прочие: в твоём горле я слышу отголосок.':
    'Sit by the fire, traveler. I am Einar, and I remember songs older than this Rift. The ancients spoke to the world with a voice — the Thu\'um. Snow would burst into flame before their words. You are not like the rest: in your throat I hear an echo.',
  '«Что за голос?»':
    '"What voice is that?"',
  '(Спросить о Стенах Слов — взять путь)':
    '(Ask about the Walls of Words — take the path)',
  'Ту\'ум — это не крик. Это язык, на котором мир был сложен. Стены Слов — камни, где голос древних застыл: прикоснись — и слово уйдёт в тебя. В Пещере Рун к северу отсюда такая стена стоит. Но дверь там рунная, а руны эти старше меня.':
    'The Thu\'um is not a shout. It is the tongue the world was put together with. Word Walls are stones where the voices of the ancients froze in place: touch one, and the word passes into you. A wall like that stands in the Rune Cave north of here. But the door is rune-locked, and those runes are older than I am.',
  '(Спросить о Стене Слова — взять путь)':
    '(Ask about the Word Wall — take the path)',
  'Спасибо за историю.':
    'Thank you for the story.',
  'Стена ждёт того, кто умеет читать камень. На плите у пещеры — подсказка старины: «Заяц бежит от Волка, Волк воет на Луну». Порядок — начало песни. И остерегайся мёртвых стражей — драугров. Они не любят гостей.':
    'The wall waits for one who knows how to read stone. On the slab by the cave there is a saying from the old days: "The Hare runs from the Wolf, the Wolf howls at the Moon." The order is where the song begins. And beware the dead guardians — the draugr. They do not care for guests.',
  'Иду к пещере.':
    'I\'m heading for the cave.',
  'Пещера — на север, за елями. Помни песню: Заяц — первым, Волк — вторым, Луна — третьей. Так стояли предки.':
    'The cave lies north, beyond the firs. Remember the song: the Hare first, the Wolf second, the Moon third. That is how the ancestors stood.',
  'Помню.':
    'I remember.',
  'Слышишь? Ветер сегодня поёт иначе. Слово Силы теперь в твоём горле — говори им по делу, герой. И возвращайся: у меня есть песни, которых ты ещё не слышал.':
    'You hear it? The wind sings a different song today. The Word of Force is in your throat now — spend it only when it matters, hero. And come back: I have songs you have not heard yet.',
  '(Подарок сказителя за пройденный путь — Стылый клинок)':
    '(The skald\'s gift for the road traveled — a Bleak Blade)',
  '(Послушать песню о Ту\'уме)':
    '(Listen to a song of the Thu\'um)',
  'Этот клинок лежал у меня со времён отца — сталь Пределья не ржавеет. Пусть служит тому, кто говорит с миром голосом. 150 монет — на дорожные хлеба.':
    'This blade has been with me since my father\'s days — Marches steel does not rust. Let it serve the one who speaks to the world with a voice. And 150 gold for bread on the road.',
  '(Принять)':
    '(Accept)',

  // ============================================================
  // ИНГРИД — охотница (frost_ingrid)
  // ============================================================
  'Стой. Здесь охотится я — а дичь нынче странная. В прошлом буране я видела тень: шире дома, крылья — как паруса. Где она пролетает, снег вспыхивает и остаётся дымить. Мой отец звал такое «драконом», но драконы — сказки.':
    'Stop. I hunt here — and the game has gone strange. In the last blizzard I saw a shadow: wider than a house, wings like sails. Wherever it passes, the snow bursts into flame and keeps on smoking. My father called such a thing a "dragon," but dragons are fairy tales.',
  '«Сказки иногда жгут небо.» (Взяться за охоту)':
    '"Fairy tales sometimes burn the sky." (Take up the hunt)',
  'Что ты знаешь о Пределье?':
    'What do you know of Frostreach?',
  'Пределье — последнее место, куда не сунулся ни Разлом, ни Орден. Снег здесь вечный, а старики говорят: под ним спят герои, которые однажды встанут. Драугры в пещерах и курганах — их стража. Не трогай их могилы без нужды.':
    'Frostreach is the last place neither the Rift nor the Order has dared to touch. The snow here is eternal, and the old folk say heroes sleep beneath it — heroes who will rise one day. The draugr in the caves and barrows are their guard. Leave their graves be unless you must.',
  '(Вернуться к разговору о тени)':
    '(Back to the shadow)',
  'Тень ходит над южной дорогой, за курганом — то место зовут Драконьим Долом. Осмотри выжженные следы по пути: я хочу знать, с чем имею дело, прежде чем ставить капканы.':
    'The shadow ranges over the south road, past the barrow — the place is called Dragon Hollow. Examine the burn traces along the way: I want to know what I am dealing with before I set my traps.',
  'Осмотрю следы.':
    'I\'ll examine the traces.',
  'Следы — вдоль южной дороги. Когда поймёшь, что это — возвращайся. И, Смотритель: не лезь под огонь. Я видела, как тень садится. Она не уходит голодной.':
    'The traces run along the south road. Once you know what this thing is, come back. And, Watcher: do not walk into the fire. I have seen the shadow stoop. It does not leave hungry.',
  'Буду начеку.':
    'I\'ll keep my eyes open.',
  'Небо над Приютом чистое впервые за зиму. Ты... убил сказку. Держи плащ — сшит из шкур, что ты же и добыл, — и золото: Приют скинулся всем миром.':
    'The sky over Bleak Haven is clear for the first time this winter. You... killed a fairy tale. Take the cloak — sewn from the very hides you brought down — and the gold: all of Haven chipped in.',
  '(Принять награду — 320 золота, плащ, опыт)':
    '(Accept the reward — 320 gold, cloak, XP)',
  'Плащ держит мороз лучше любого огня. И — спасибо. Отец бы не поверил, что драконью сказку кончит Смотритель из долины.':
    'The cloak holds off frost better than any fire. And — thank you. My father would never have believed a Watcher out of the valley would be the one to end a dragon tale.',
  'Клык его забери себе — сказителям дороже золота. А я присмотрю за Долом: вдруг там была не одна тень.':
    'Keep its fang — skalds prize it above gold. And I will keep watch on the Hollow: there may have been more than one shadow.',

  // ============================================================
  // ДРЕВНЯЯ ПЛИТА (frost_slab)
  // ============================================================
  'Ледяная корка стёрла полтекста, но начало читается: «Первая песня старины: Заяц бежит — Волк воет — Луна глядит. Так стояли камни, так стояли предки, так мир будет стоять...»':
    'A crust of ice has scraped away half the text, but the beginning still reads: "The first song of the old days: the Hare runs — the Wolf howls — the Moon watches. So stood the stones, so stood the ancestors, so will the world stand..."',
  '(Запомнить порядок: Заяц — Волк — Луна)':
    '(Remember the order: Hare — Wolf — Moon)',
  'Три камня перед пещерой дремлют с перепутанными кольцами. Поверни их — пусть песня встанет в свой порядок.':
    'Three stones before the cave slumber with their rings out of order. Turn them — let the song fall into its place.',

  // ============================================================
  // КОМАНДОР МЕЙРА — Бастион Ветвей (mara_meira)
  // ============================================================
  'Смотритель? Хуже некогда: мор вышел из Логова и точит песок под частоколом. Третий день хороню своих — а похоронок больше, чем стрел. Мне нужны клинки, а не отговорки. Ты выглядишь так, будто смерть — твой напарник.':
    'The Watcher? You could not have picked a worse time: the blight has crawled out of the Lair and is gnawing the sand out from under the palisade. Three days now I have buried my own — and there are more dirges than arrows. I need blades, not excuses. You look like a man who keeps death for a partner.',
  '«Бастион простоит, пока я стою.» (Взяться за оборону)':
    '"The Bastion will stand as long as I do." (Take up the defense)',
  'Что такое Мара?':
    'What is the Blight?',
  'Мара — юг Гранита, где земля прогнила до багрового цвета. Скверна там точит жилы, из жил лезут упыри, а над всем этим стоит Мать. Мы — Бастион Ветвей: пока мы держим, мор не пойдёт в Колонию и в долину.':
    'The Blight is the south of Granite, where the land has rotted to a crimson hue. Corruption gnaws at the veins there, ghouls crawl up out of them, and above it all stands the Mother. We are the Bastion of the Boughs: while we hold, the blight does not reach the Colony or the valley.',
  '(Вернуться к разговору об обороне)':
    '(Back to the defense)',
  'Вот и славно. Осмотрись: рог на воротах, ворот грызут первыми. Мои стрелки уйдут за вал — остальное держишь ты и твоя партия. Приказывай им, Смотритель: у частокола нет лишних людей.':
    'Good. Look around: the horn hangs on the gates, and the gates get chewed first. My archers will fall back behind the rampart — the rest you and your party hold. Give them their orders, Watcher: the palisade has no one to spare.',
  'Рог услышу.':
    'I\'ll listen for the horn.',
  'Земля под частоколом поёт скверной — сегодня или завтра, мор пойдёт. Рог у ворот: удар — и полосу пустоши оголят. Встань между воротами и мором. Партия — твой строй: держи их по клину или в линию, как сочтёшь.':
    'The ground beneath the palisade hums with blight — today or tomorrow, it comes. The horn is by the gates: one blow, and the strip of waste will be cleared. Stand between the gates and the blight. Your party is your line: hold them in a wedge or in rank, as you see fit.',
  '(Бить рог — начать оборону бастиона)':
    '(Sound the horn — begin the defense of the bastion)',
  'ВОЛНА! Стрелки — за вал! Смотритель, частокол — на тебе: как упыри жрут ворота — руби их быстрее, чем они грызут!':
    'WAVE! Archers — behind the rampart! Watcher, the palisade is on you: when the ghouls feast on the gates, cut them down faster than they chew!',
  'Держать строй!':
    'Hold the line!',
  'Мор отступил отлёживаться — но Мать где-то там, в Логове, и она запомнила дорогу. Хочешь ещё штурм — бей рог у ворот. Частокол починят к новому визиту.':
    'The blight has pulled back to lick its wounds — but the Mother is out there, in the Lair, and she remembers the road. If you want another assault, sound the horn by the gates. The palisade will be mended in time for the next visit.',
  '(Бить рог — отбить ещё один штурм)':
    '(Sound the horn — repel one more assault)',
  'Ветер с юга снова чистый. Мор-Мать сдохла — ты хоть понимаешь, что сделал? Бастион обязан тебе словами, которые не выговоришь. Держи: клинок из нашей стали и всё золото, что есть в казне.':
    'The wind from the south is clean again. The Blight Mother is dead — do you even grasp what you have done? The Bastion owes you words it cannot pronounce. Take this: a blade of our steel, and every last piece of gold in the treasury.',
  '(Принять награду — 350 золота, Клинок Бастиона, опыт)':
    '(Accept the reward — 350 gold, the Bastion Blade, XP)',
  'Клеймо Ветвей на клинке — это клятва: где мор — там Бастион, а где Бастион — ты. Возвращайся, если южный ветер снова станет красным.':
    'The brand of the Boughs on that blade is an oath: where the blight walks, the Bastion walks — and where the Bastion walks, so do you. Come back if the south wind ever turns red again.',
  'Скверна в жилах убывает — Хольт небось до сих пор не верит своему счастью. Пока Мора молчит, мы куем и строим. Это и есть победа, Смотритель.':
    'The blight in the veins is ebbing — I\'d wager Holt still cannot believe his luck. While the blight lies quiet, we forge and we build. That is what victory is, Watcher.',

  // ============================================================
  // ДОСЕНТ ХОЛЬТ — учёный Бастиона (mara_holt)
  // ============================================================
  'Не стой над душой — банки живые!.. А, Смотритель. Мор — не голод, не болезнь и не гнев. Мор — метаболизм. Земля Мары проглотила что-то живое и теперь переваривает всё вокруг. Хотите вернуть землю? Кормите её наоборот.':
    'Quit hovering — the jars are alive!.. Ah, the Watcher. The blight is not hunger, not disease, not rage. The blight is a metabolism. The land of the Blight swallowed something living, and now it is digesting everything around it. Want the land back? Feed it in reverse.',
  '«Скажи, что жечь.» (Скверна в жилах)':
    '"Tell me what to burn." (Blight in the Veins)',
  '«Нужны образцы?» (Желёзы скверны)':
    '"Need samples?" (Glands of the Blight)',
  'Расскажи о мора.':
    'Tell me about the blight.',
  'Упыри — органы передвижения. Абомы — осадные. Мать — репродуктивная. А сгустки — это рты: мор ест ими землю и выхаркивает себя же. Логично? Логично. Бронзовый порошок из кузни сбивает метаболизм с толку — жги сгустки в жилах.':
    'Ghouls are the organs of locomotion. Abominations are the siege engines. The Mother is the reproductive one. And the clots are mouths: the blight eats the land with them and coughs itself back up. Logical? Logical. The bronze powder from the smithy scrambles the metabolism — burn the clots in the veins.',
  '(Вернуться к делам)':
    '(Back to business)',
  'Три сгустка: один на юго-западе пустоши, второй — на северо-востоке у дороги, третий — на юге, почти у самого Логова. Подойди и выжги. И не наступай в лужу — лужа тоже голодная.':
    'Three clots: one in the southwest of the waste, one in the northeast by the road, one in the south, almost at the Lair itself. Walk up and burn them out. And do not step in the puddles — the puddles are hungry too.',
  'Жду золы.':
    'I\'ll be waiting for ash.',
  'Жилы остыли, цвет уходит! Земля помнит здоровый цвет — я это докажу. Держи: горжету Ветвей — плевки Моры скользят по ней, — и золото из фонда науки. Наука платит, когда может.':
    'The veins are cooling, the color is receding! The land remembers its healthy color — and I will prove it. Take this: a gorget of the Boughs — blight spittle slides right off it — and gold from the science fund. Science pays when it can.',
  '(Принять награду — 140 золота, Горжета, опыт)':
    '(Accept the reward — 140 gold, the Gorget, XP)',
  'Первая жила чиста за триста лет. Смотришь? Земля вздохнула. Остальное — вопрос порошка и терпения.':
    'The first clean vein in three hundred years. You see? The land just drew breath. The rest is a matter of powder and patience.',
  'Мор-желёзы: пульсирующий узел под кожей упыря, у абома — целый гроздь. Три штуки с упырей — или с абомов, что добудешь. Аккуратнее: железки кусаются даже отрезанные.':
    'Blight glands: a pulsing node under a ghoul\'s skin; on an abomination — a whole cluster. Three off the ghouls — or off the abominations, whichever you bring down. Careful: the things bite even after they are cut free.',
  'Принесу гроздь.':
    'I\'ll bring the cluster.',
  'Пять штук, целые, не гнилые! Смотритель, вы — кладезь биоматериала. Вот золото из фонда — и спасибо. Теперь я покажу колонии, чем мор кончается.':
    'Five of them, whole, not rotten! Watcher, you are a treasure trove of biomaterial. Here is the gold from the fund — and thank you. Now I will show the colony how the blight ends.',
  '(Отдать 5 мор-желёз — 160 золота, опыт)':
    '(Hand over 5 blight glands — 160 gold, XP)',
  'Желёз пока не хватает.':
    'Not enough glands yet.',
  'В банке щёлкает — слышите? Это первый мор-образец, который умер сам. Метаболизм — машина, а машину можно остановить.':
    'Something in the jar just clicked — do you hear? That is the first blight sample to die of its own accord. A metabolism is a machine, and a machine can be stopped.',
  'Записи, банки, свежая зола... Смотритель, приходите через месяц — я покажу вам первую в истории карту выздоровления Мары.':
    'Notes, jars, fresh ash... Watcher, come back in a month — I will show you the first recovery map of the Blight ever drawn.',

  // ============================================================
  // СИГНАЛЬНЫЙ РОГ (mara_horn)
  // ============================================================
  'Бронзовый рог на воротах, изогнут как клык. Мейра велела бить в него, когда будешь готов принять штурм: стрелки уйдут за вал, и пустошь оголят.':
    'A bronze horn on the gates, curved like a fang. Meira ordered it sounded when you are ready to take the assault: the archers will fall back behind the rampart, and the waste will be cleared.',
  '(Бить рог — принять штурм Моры)':
    '(Sound the horn — take the Blight\'s assault)',
  'Пока не время.':
    'Not yet.',
};
