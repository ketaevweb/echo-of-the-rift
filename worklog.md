# Worklog

---
Task ID: 1
Agent: Z.ai Code (main)
Task: Создать играбельный RPG-прототип, совмещающий механики The Witcher 3, Dragon Age: Origins, Skyrim, Baldur's Gate 3, Gothic 2 и Mass Effect 2, на Next.js 16 + TS, в одном маршруте /.

Work Log:
- Осмотрел проект (Next.js 16 App Router, shadcn/ui, zustand, Tailwind 4), dev-сервер уже работал на :3000.
- Сгенерировал титульный арт через image-generation skill (CLI, 1344x768) → public/images/title-splash.png.
- Спроектировал и написал слой данных: src/lib/game/types.ts, data/items.ts (13 предметов), data/abilities.ts (11 способностей, статы 7 типов врагов), data/quests.ts (главный квест + контракт + 2 фракционных), data/dialogues.ts (8 диалоговых деревьев с условиями, проверками d20 и строковыми действиями), data/world.ts (мир 3200×2400: деревня, лес, Камни Древних, озеро, лагерь бандитов, Сердце Разлома; ~130 деревьев через детерминированный LCG, 7 NPC, 5 зон спавна, 3 уникальных врага).
- Написал движок src/lib/game/engine.ts (~2400 строк): игровой цикл rAF, ввод (WASD+русская раскладка, мышь, хоткеи), real-time бой с тактической паузой, d20-броски (крит на 20, автопромах на 1), знаки Игни/Аард/Квен/Аксий, Голос Древних, ИИ врагов (аггро/погоня/поводок/респавн/leash), ИИ спутников (следовать/держать/агрессия, авто-касты), босс с фазами (слэм с телеграфом, призыв слуг, ослабление через убеждение), квестовые триггеры, магазины, тренер (очки обучения), фракции, смерть/респавн, localStorage-сейвы с автосохранением, синхронизация UI в zustand.
- Рендер src/lib/game/render.ts: запечённый террейн (травяной шум, дороги, озеро, пепельная зона Разлома), пропсы (сосни, дома, палатки, менгиры, портал Разлома, барьер), стилизованные спрайты-фигуры, частицы, всплывающий боевой текст, миникарта и полная карта.
- SFX src/lib/game/sfx.ts — мини-синтезатор WebAudio (14 звуков), mute.
- UI: TitleScreen (splash-арт, Новая/Продолжить, управление), Hud (фреймы отряда с приказами и способностями спутников, панель умений с откатами, миникарта, трекер квеста, босс-бар, тосты, плашки областей), DialogueOverlay (портреты, теги, проверки), Panels (Персонаж, Инвентарь, Журнал+Бестиарий на shadcn Tabs, Магазин, Наставник, Карта, Пауза, Финал с эпилогом).
- page.tsx — единственный маршрут, GameView монтирует движок с cleanup.
- Прогнал Agent Browser E2E: титул → новая игра → ходьба → диалог Бьорна → принятие квеста (+25 XP, трекер) → лес → бой с волками (Игни x2 урона, счётчик 2/4) → смерть/респавн/штраф золота → зелья (Q) → панели C/J → наставник → магазин (покупка) → Камни Древних → рекрутинг Кайи и Торвальда (отряд 3 фрейма) → алтарь → изучение Голоса Древних → босс: интро, проваленная проверка Убеждения d20 (6+2 vs СЛ15), бой, босс-бар → финальный экран с эпилогом и статистикой → свободная игра → карта → журнал (фильтр) → перезагрузка сейва после победы (босс не респавнится).

Fixes found during browser verification:
- NPC-сущностям не передавался npc-деф → клик/F-диалог падали (добавлен в makeEntity и spawnWorld).
- cds['atk'] был undefined → условие `undefined <= 0` ложно → никто не мог атаковать в ближнем бою (инициализация cds: {atk:0}).
- Камера не клампилась к границам мира (тёмная пустота по краям).
- Миникарта не подключалась из-за порядка React-эффектов (attachMinimap после createEngine в GameView + data-minimap).
- Отсутствовал поводок врагов (босс гнался через всю карту) — добавлен leashR-чек.
- Журнал показывал непринятые побочные квесты — фильтр stage>0||done.
- В engine добавлен метод toast (использовался, но не был определён).

Stage Summary:
- Играбельный прототип «Эхо Разлома» готов и проверен в браузере: полный цикл «титул → квесты → отряд → фракции → тренировки → босс → эпилог → свободная игра», сейвы, d20-бой, знаки, спутники, бестиарий.
- Ключевые артефакты: src/lib/game/* (движок/данные/рендер/звук/store), src/components/game/* (TitleScreen, Hud, DialogueOverlay, Panels, GameView, GameIcon), public/images/title-splash.png.
- Lint чистый, консоль браузера без ошибок, dev-сервер :3000 без фатальных логов.

---
Task ID: 2, 3, 4, 5
Agent: Z.ai Code (main)
Task: GDD-пакет для 3D-перехода, README, GitHub, фикс неработающих кнопок HUD слева внизу.

Work Log:
- Проанализировал проект (Explore-агент): engine.ts 2381 строк, render.ts 899 (canvas 2D), Three.js отсутствует, панель кнопок HUD (C/I/J/M/Меню/Звук) не работала.
- Найден корень бага кнопок: Hud.tsx вызывал useGame((s) => s.openPanel), но в store.ts есть только setPanel → TypeError при клике. Клавиши работали, т.к. движок имеет свой openPanel. Фикс: getEngine()?.openPanel(...) в 4 местах + иконка звука переведена на useState.
- Написал пакет GDD (docs/GDD/): 00-vision.md (High Concept, столпы, честная рамка «уровень BG3»), 01-world-story.md (Гексмарк, 6 доменов-оммажей, 3 фракции, 6 компаньонов, 3 акта, 5 концовок, silence-счётчик), 02-gameplay.md (управление 3D, d20+позиционная тактика, знаки, Слово, XP+LP, диалоги, экономика), 03-architecture.md (стек, ECS-lite, карта миграции engine.ts→модули с диапазонами строк, бюджеты перфа, план Phase 0 шаги 0.1–0.9), 04-art-audio.md (Painterly PBR, палитры доменов, Three.js-пайплайн, MusicDirector), 05-roadmap.md (Фазы 0–8 с DoD).
- Переписал README.md под новую концепцию.
- Настроил git (user ketaevweb), создал репозиторий GitHub API: ketaevweb/echo-of-the-rift, .gitignore дополнен (examples, skills, tests, download, db, *.db, dev.log, server.log).
- Коммит 7d44761 (GDD + фикс кнопок), пуш в main успешен.
- lint зелёный; tsc чист по src/ (ошибки только в служебных examples/, skills/ — вне проекта).

Stage Summary:
- Репозиторий: https://github.com/ketaevweb/echo-of-the-rift (main).
- GDD-пакет из 6 документов утверждён как база разработки; Phase 0 (рефакторинг) готов к запуску.
- Баг кнопок HUD исправлен в коде (коммит в репо).

---
Task ID: 6-a
Agent: general-purpose (subagent, шаги 0.1–0.8) + Z.ai Code (main, шаг 0.9 и верификация)
Task: Phase 0 — модульный рефакторинг engine.ts (2381 строк) / render.ts (899 строк) по плану GDD 03 §5, без изменения поведения игры.

Work Log:
- Шаги 0.1–0.7 (субагент, коммиты 766b62e..c240b4a): typecheck-скрипт; вынос констант/утилит (data/tables.ts, core/util.ts); systems/save.ts (версионирование схемы); systems/inventory.ts + progression.ts; systems/quest.ts; systems/combat.ts + systems/ai.ts + core/entity.ts; systems/movement.ts + systems/input.ts. Введён EngineCtx (core/ctx.ts) — системы мутируют состояние только через ctx.
- Шаг 0.8 (субагент): render2d/ — types.ts (IRenderer-мост для будущего render3d), renderer.ts (полная канвас-2D реализация + renderer2d), scene.ts (сборка кадра drawScene/SceneView); легаси render.ts стал 15-строчным реэкспортом.
- Шаг 0.9 (main, коммит e60d155): core/Game.ts (GameLoop: rAF, sync каждые 0.12с, автосейв 45с; stepWorld — фиксированный порядок систем), core/Clock.ts (кламп dt ≤ 50мс), core/Events.ts (типизированная шина событий для Фазы 1+), systems/uiSync.ts (syncUi вынесен из движка); engine.ts переписан в фасад.
- Верификация: lint зелёный; tsc --noEmit — 0 ошибок по src/**; dev.log без ошибок компиляции.
- Браузерная E2E (agent-browser): титул → новая игра → мир рендерится (NPC Дорн/Грим, миникарта, трекер «Шёпот Разлома», панель умений) → ВСЕ 6 кнопок слева внизу открывают панели: ПЕРСОНАЖ ✓, ИНВЕНТАРЬ ✓, ЖУРНАЛ ✓, КАРТА ДОЛИНЫ ✓, Меню (Продолжить/Сохранить/Загрузить) ✓, Звук ✓; ошибок консоли нет; скриншот .ref/game-after-refactor.png.

Stage Summary:
- engine.ts: 2381 → 393 строки (фасад). Структура: core/ (Game, Clock, Events, ctx, entity, util), systems/ (ai, combat, input, inventory, movement, progression, quest, save, uiSync), render2d/ (types, renderer, scene), data/ (таблицы+контент). Каждая система ≤ 500 строк.
- Публичный API GameEngine сохранён полностью, React-слой не тронут, геймплей не изменён.
- Phase 0 закрыта полностью (0.1–0.9). Следующий шаг по роадмапу — Фаза 1: 3D-ядро (three, render3d, третье лицо, чанковый террейн).

---
Task ID: 6-b
Agent: Z.ai Code (main)
Task: Фаза 1 — 3D-ядро на Three.js по GDD 03 §3.4 / 05 (Фаза 1): render3d, камера 3-го лица, переключатель 2D/3D.

Work Log:
- Установлены three@0.186.1 + @types/three.
- Создан модуль src/lib/game/render3d/:
  - heightmap.ts — детерминированная fBm-высота (холмы, горные кромки, плоcкие площадки деревни/лагеря/Камней, чаша озера, воронка Разлома) + vertex-color палитра (трава/сухостой/снег/пепел/дороги) + WATER_LEVEL.
  - Terrain.ts — чанковый меш 8×6×30seg с vertex colors, вода Озера Лун, шейдерное градиентное небо.
  - Props.ts — InstancedMesh для 130 деревьев (ствол+2 конуса), 42 камней, 90 кустов; сборные меши домов/шатров/лавки/манекенов/заборов/обелисков/алтаря/туш; портал Разлома с точечным светом; костры с мерцающим светом; барьеры/травы скрываются через removedProps.
  - Avatars.ts — AvatarFactory: аватары архетипов (герой в капюшоне с мечом, Кайя с посохом, NPC-мантии, волки/альфа с анимированными лапами, бандиты, лучники, капитан, порождение Разлома, босс с рогами ×2.5), процедурная анимация (шаг/выпад/каст/парение/смерть-завал), вспышка урона через базовый emissive, биллборд HP-бары.
  - Fx.ts — пул 600 частиц (Points), 28 наземных колец-телеграфов, спрайт-флоатеры с canvas-текстурами, пульсирующее кольцо цели.
  - Renderer3d.ts — WebGLRenderer (ACES 0.88, PCF-тени 2048, FogExp2), hemi+dir свет, солнце следует за героем; орбита 3-го лица (ПКМ-драг, колесо 40–260, коллизия с рельефом, тряска); screenToGround (ray-march по heightAt + бинарное уточнение); pickAtScreen — проекция отрезка «ноги→голова» (честный клик по телу движущейся цели).
- Интеграция: ctx.ts — View3dBridge + renderMode/inputCanvas; engine — createEngine(canvas, save, {canvas3d, mode}), setRenderMode с перепривязкой ввода и dispose; core/Game — кламп камеры только в 2D; input — 3D-ветка (пикинг сущностей → диалог/цель, ground → интеракты/движение); store — renderMode + localStorage (RENDER_KEY); GameView — два канваса (WebGL + легаси 2D) с синхронизацией режима; Panels — тумблер «Графика: 3D (Three.js) / Legacy 2D» в паузе.
- Багфиксы по ходу E2E: аватары не добавлялись в сцену (entityGroup); первый кадр камеры — мгновенный снап к герою; кроны деревьев инстансились в origin (мировые матрицы); пересвет (солнце 2.0→1.55, exposure 0.88); пик по точке у ног → сегмент-пикинг; PCFSoft→PCF (deprecation).
- Браузерная E2E (agent-browser): титул → новая игра → 3D-мир; ЛКМ-движение + тост «ДОЛИНА»/«СУМРАЧНЫЙ ЛЕС»; WASD; интеракт-хинт «Поговорить: Грим — [F]», диалог с выборами; цель по клику (target=9), автоатака, Игни (частицы), вспышки урона; орбита ПКМ; панель ПЕРСОНАЖ; тумблер 3D→2D→3D (view3d dispose/create, режим живёт). Ошибок консоли нет.
- Перф: render() 1.8 мс CPU, 101 draw call (бюджет 350), 44k трис (бюджет 700k), 9 текстур; headless-rAF ~4fps — артефакт SwiftShader-софтвера песочницы, не проекта.
- Коммит 70fa6ea запушен в ketaevweb/echo-of-the-rift (main).

Stage Summary:
- Фаза 1 закрыта: игра идёт в полном 3D от третьего лица, весь контент 2D-прототипа (диалоги/бой/квесты/панели/сейвы) работает в 3D-сцене; 2D остался как «Legacy 2D»-фолбэк через тумблер.
- Артефакты: src/lib/game/render3d/* (6 файлов), мост View3dBridge в core/ctx, тумблер графики.
- Следующий шаг по роадмапу — Фаза 2: 3D-бой и ИИ (телеграфы АоЕ, GLTF-аватары, фазы боссов).

---
Task ID: 7
Agent: Z.ai Code (main)
Task: Багфиксы геймплея 3D-версии по отзыву игрока: камера-относительный WASD, боковое движение/атака врагов, зависающий летающий текст, отсутствие коллизий у домов. Пуш в GitHub.

Work Log:
- Диагностика по коду: (1) updatePlayer строил вектор движения в мировых осях; (2) волк/альфа/хоррор собраны «мордой по +X», а Avatar.update вращал всех по формуле π/2−facing (верна только для humanoid «лицом по +Z»), плюс лапы зверей качались через rotation.x (вбок); (3) GameLoop при isFrozen()/tacticalPaused не вызывал update — флоатеры не тикали и висели в воздухе при открытой панели/диалоге; (4) коллайдер дома был круг r=max(w,h)*0.36 ≈ вдвое меньше футпринта (95 полширины против 68), у лавки r=10 при корпусе 70×42.
- core/util.ts: Collider расширен полями hw/hd/rot (OBB), добавлен seedRot (общий для мешей и коллайдеров).
- core/ctx.ts: в View3dBridge добавлен getCameraYaw(), в EngineCtx — хук updateCosmetics(dt).
- systems/movement.ts: WASD теперь относительно камеры (forward=(-sin yaw,-cos yaw), right=(cos yaw,-sin yaw)) — W от камеры, A/D по экрану; в 2D/без view3d yaw=0 → старое поведение. moveWithCollisions: ветка круг-vs-OBB с выталкиванием по нормали и через ближайшую грань для центра внутри бокса.
- render3d/Renderer3d.ts: getCameraYaw() возвращает азимут орбиты.
- render3d/Avatars.ts: forwardX-флаг для wolf/alpha/horror → targetRot = −facing; лапы зверей качаются rotation.z (вдоль корпуса).
- render3d/Props.ts: seedRot импортируется из core/util.
- core/Game.ts: stepCosmetics (updateParticles + затухание shake); GameLoop вызывает host.updateCosmetics(dt) при паузе/панелях — боевой текст доплывает и исчезает.
- engine.ts: buildColliders — дома/лавка прямоугольными OBB с поворотом меша, палатки r=w*0.45; метод updateCosmetics.
- Верификация agent-browser: yaw=0 → W на север (1780→1756); драг ПКМ yaw=1.56 → W двигает Δx=−24 строго по forward камеры, D — Δy=−24 (screen-right); клик в центр дома → игрок упёрся в стену: локальные координаты (0, 57.1) при полуглубине 48 + отступ 9.1, внутрь не проходит; флоатер при открытой панели исчезает (в headless rAF троттлится ~4-5fps — требуется больше wall-времени); волки в chase: rotation.y сходится к −facing (err 0.13–0.28 — сглаживание), скриншот .ref/wolf-orientation-check.png — все три волка мордой к игроку; тумблер 2D/3D работает, ошибок консоли нет.
- lint чистый, tsc --noEmit по src/ без ошибок.
- Коммит d23cad1 запушен в ketaevweb/echo-of-the-rift (main) — токен в URL одноразово, в конфиг/файлы не писался.

Stage Summary:
- Все 4 бага из отзыва игрока исправлены и проверены в браузере: WASD относительно камеры, враги лицом к цели, боевой текст не зависает при паузе, дома/лавка имеют честные OBB-коллизии.
- 2D-легаси режим не пострадал (yaw=0 → прежние оси).
- Репозиторий актуален: https://github.com/ketaevweb/echo-of-the-rift (main, d23cad1).
- Следующий шаг по роадмапу — Фаза 2: 3D-бой и ИИ (телеграфы АоЕ, GLTF-аватары, фазы боссов).

---
Task ID: 8
Agent: Z.ai Code (main)
Task: Фаза 2 — 3D-бой и ИИ по GDD 05: телеграфы АоЕ (круг/конус/коридор), высотные бонусы, фланкирование, стрейф лучников, рывок босса с фазами, анимации телеграфных поз.

Work Log:
- types.ts: Telegraph (shape circle/cone/line, followEid) + транзитные поля Entity (chargeT/chargeDir/dashT/dashDir/dashHits); Particle.kind + 'telegraph'.
- core/ctx.ts: telegraphs в EngineCtx и View3dSnapshot.
- systems/combat.ts: spawnTelegraph/updateTelegraphs (тик жизни + слежение за сущностью); heightMod — высотный бонус ±2 к броску и ×1.15 урона при dh>12 (heightAt без three.js); конусы Игни/Аарда и круг Голоса Древних подсвечиваются телеграфами на земле.
- systems/ai.ts: updateEnemy — фланкирование (каждый враг заходит на свой сектор дуги по eid*7%9 → стая окружает, как в W3), стрейф лучников в рабочем поясе (0.5×скорости поперёк луча), фикс фронта замаха (facing заперт при chargeT>0), блок движения/атак босса при замахе/рывке; bossLogic получил dt (вместо хардкода 0.016): слэм спавнит телеграф-круг r=175 (followEid), новая фаза ярости <66% HP — рывок: коридор-телеграф (длина до 520, полуширина 54, замах 0.85с) → дэш 660 u/s 0.5с с уроном d10+d10+mod каждому в радиусе r+46 один раз за рывок + отброс 420.
- core/Game.ts: updateTelegraphs в stepWorld (после separate).
- engine.ts: telegraphs в состоянии и в обоих снапшотах рендера (3D + 2D).
- render3d/Fx.ts: пул 14 телеграфов (group+mesh+mat), геометрии Circle(θ=−w..2w)/Plane, yaw=−facing, пульс 13 Гц, круг сжимается 1.06→1.0, polygonOffset −2 против z-fighting; найден и исправлен баг: изначальная геометрия слота была пустым BufferGeometry и не пересоздавалась при shape='circle' (круг был невидимым) → стартовый CircleGeometry(1,40).
- render3d/Renderer3d.ts + SceneView3d: проводка telegraphs в fx.update.
- render2d/scene.ts: хардкод слэм-круга заменён универсальными телеграфами (fill+обводка круга, конус дугой, коридор rect).
- render3d/Avatars.ts: позы — замах слэма (клинок вверх −2.5 + дрожь 30 Гц), замах рывка (занос 1.15, наклон корпуса), дэш (наклон −0.3), оглушение (дрожь rotation.z), выпады: torso.position.z у humanoid / body.position.x у зверей при attackT.
- E2E agent-browser (данные+кадры): слэм-телеграф {circle r=175 follow} пойман при slamT 0.85–0.90; рывок — {line 458×108 follow} при chargeT 0.85/0.75/0.20, дэш нанёс урон игроку; детерминированный кадр: коридор и круг визуально подтверждены (прямые края через экран); конус Игни в реальном бою {cone r150 #e08a3a}; фланкирование — 6 волков в атаке с углов 46°/134°/185°/200°/226°/357° (стая окружает); лучники держат d≈147-153 и стрейфят 94° от луча; 2D-легаси рисует круг+конус; ошибок консоли нет.
- Нюанс отладки: в headless камера-лерп отстаёт при 4fps (SwiftShader) — ранние «пустые» скриншоты были промахом кадрирования (босс за камерой), не багом.
- lint + tsc --noEmit чистые; dev.log без ошибок.

Stage Summary:
- Фаза 2 закрыта по DoD: все бои прототипа воспроизводимы в 3D, знаки и удары босса читаются визуально (телеграфы на земле), тактика обогащена (высота, окружение, кифтинг, рывок).
- Артефакты: Telegraph в types/ctx, combat (spawnTelegraph/updateTelegraphs/heightMod), ai (фланг/стрейф/рывок), Fx (пул телеграфов), Avatars (позы), 2D-паритет.
- Следующий шаг по роадмапу — Фаза 3: Вельд-биом, переходы зон, контракты W3, день/ночь.

---
Task ID: 9
Agent: Z.ai Code (main)
Task: Фаза 3 — Мир: хаб + Вельд (GDD 05): Вельд-биом, переходы зон через порталы, день/ночь, контракты W3 (доска/следопытство/масла/бестиарий), Альра-алхимик, мини-босс Пепельная Мать.

Work Log:
- Данные: data/veld.ts (RIDGE y=2560±95, GATES valley/veld + exits, 6 POOLS, 3 VELD_CLUES с лором, ASH_MOTHER курган 2500,3620, VELD_ROADS/PROPS: 72 мёртвых дерева, 150 камыша, 16 пней, арки-врата, доска объявлений; VELD_SPAWN_ZONES болотники/мраки; VELD_AREAS/MARKERS). world.ts: WORLD 3200×4200, merge всех массивов, генераторы долины клампятся к y<2380, blocked() + хребет/врата.
- types: EnemyType + bogling/ash_shade/ash_mother; PropDef/InteractableDef + board/portal/deadtree/reed/stump/clue; ItemType + oil; SaveData + dayClock/oilKind/oilT.
- heightmap: хребет (t²·(56+jag)), вельдская низина (fBm), чаши омутов ниже WATER_LEVEL, плоские пятачки врат; палитра торфа/тины/мёртвых пятен, грязь кромок омутов. Terrain: CHUNK_Z из пропорции мира (88 чанков), вода омутов. Props3d: инстансы deadtree (ствол+2 ветки) и reed (3 стебля), board (столбы+панель+3 листа), portal (арка+диск+свет), stump; спиннеры массивом, огни костров ×(0.8+darkness·1.5).
- Avatars: buildBogling (пасть/глаза, скачет), buildAshShade (тлеющий уголь, парит), buildAshMother (мантия-конус, рога, ядро-уголь, парит ×1.45); forwardX для всех трёх; headH для пикинга.
- Renderer3d: updateAtmosphere(zone, dayT) — лерп k=0.045 тумана/неба/солнца/hemi/amb по целям зоны и daylightOf(dayClock); небо следует за камерой; солнце ниже к горизонту ночью; props.update(time, removed, darkness).
- Движок: dayClock (480с = сутки, старт 0.3), zone = zoneOf(y), oilT/oilKind; travelTo(zone) — sfx portal → zoneFade out (750мс) → телепорт партии+камеры, currentArea='' → fade in → cleanup; снапшоты 3D/2D с zone/dayT. syncUi дергает setAmbient.
- systems: movement — хребет непроходим (кламп ny по стороне e.pos.y); ai — spawnAshMother (flag ashMotherRevealed, не респавнится при ashMotherDead), ashMotherLogic (пепельный взрыв: телеграф-круг r150 followEid, урон d6+d6+mod+отброс; призыв 2 болотников на <66% и <33%), summonBoglings; combat — oilBonus (+5 урона игрока по классу OIL_TARGETS), лут bog_bile/rift_shard/ash_heart +120з, flag ashMotherDead → advanceQuest veld 3; quest — runInteractable portal:/clue: (flags clue_*, счётчик, на 3/3 спавн Матери + stage 2), runAction bestiary:/open:shop:alra; questMarker veld (след→курган→Альра); updateArea фолбэк «Вельд».
- Прогрессия: openShop(merchant) grim/alra (ALRA_STOCK: зелья + 2 масла). inventory.useItem: oil → oilKind/oilT 240с. save: collectSave/applySave + новые поля c дефолтами, квесты сливаются со свежими дефолтами (старые сейвы получают quest 'veld'). uiSync: oil/дневное время/zoneLabel, bossBar по ENEMY_NAME (в т.ч. ash_mother), contractQuest = contract ?? veld.
- sfx: 'portal' (восходящий вихрь) + setAmbient — зацикленный шум через bandpass, цели по зоне (valley 850Гц/0.022, veld 260Гц/0.042), setTargetAtTime.
- render2d: запекание Вельда (хребет-градиент, торф, пятна, омуты), drawProp deadtree/reed/stump/board/portal, drawEntity bogling/ash_shade/ash_mother, scene.ts — следы-метки + тинт ночи (1-daylight)·0.5 и Вельда.
- UI: GameView zoneFade-оверлей («ВЕЛЬД» + «ТУМАН ЧАСТИТ ПУТЬ...»), Hud — Sun/Moon по daytime, zoneLabel, бейдж масла (Droplets + остаток), трекер контракта счётчиком (x/3); Panels — кнопка «Нанести» для масел.
- E2E agent-browser: новая игра → мир 544 пропса/41 сущность (board, 2 портала, 72 deadtree, 150 reed, 9 болотников, Альра) → доска: контракт принят (veld stage 1, бестиарий ash_mother) → юг: F у врат (рядом ближе лунная трава — интеракт-приоритет корректен; travelTo прямой вызов ок) → Вельд: zone/veld, плашка, мрачный туман → 3 следа: счётчик 3/3 → Мать заспавнилась у кургана → бой: chase, урон игроку, пепельный взрыв-телеграф {circle r150 follow} пойман, фаза 66%: +2 болотника (summonStage 1) → добита (stun-контроль в headless из-за 4fps SwiftShader): stage 3, ash_heart, +120 золота, +400 XP (ур.4) → врата назад → Альра: сдано (220з+260 XP+масло спектров, quest done, сердце списано) → масло применено (oilT 240, HUD-бейдж, урон 14 по мраку > 11 макс без масла) → день/ночь: полночь/полдень/вельдская ночь скриншоты (луна/солнце в HUD, атмосфера лерпится) → хребет: 3с шаг на юг упёрся в y=2456 → zoneFade-скрин «ВЕЛЬД» → Legacy 2D: вельд рисуется (топи/врата/ночь) → сейв: dayClock/oilKind/oilT/veld/flags в JSON, продолжить после перезагрузки — всё восстановлено, Мать не респавнится → perf: 117 draw calls, 111k трис (бюджеты 350/700k).
- lint + tsc --noEmit чистые; dev.log без ошибок.
- Коммит 1cb5479 запушен в ketaevweb/echo-of-the-rift (main); токен одноразово в URL push, в файлах/конфиге отсутствует (grep по префиксу токена — пусто).

Stage Summary:
- Фаза 3 закрыта по DoD: вертикальная нарезка «титул → Хеймхолл (доска/Альра) → Врата Тумана → Вельд (топи, туман, день/ночь) → следопытство → Пепельная Мать → награда/тренировка» проходима целиком; сейвы совместимы со старыми (v1 + мягкие дефолты).
- Артефакты: data/veld.ts; render3d — Вельд-рельеф/палитра/пропсы/аватары/атмосфера; systems — хребет-коллизия, следопытство, масла, ИИ Матери; UI — zoneFade/бейдж масла/световой индикатор; sfx — эмбиент и портал.
- Следующий шаг по роадмапу — Фаза 4: Партия 3D (формации, приказы, тактическая камера, синергии пар).

---
Task ID: 10
Agent: Z.ai Code (main)
Task: Фаза 4 — Партия 3D по GDD 05: формации (клин/линия), приказы в тактической паузе с изометрическим отъёмом камеры, линии приказов, одобрение компаньонов, синергии пар. Пуш в GitHub.

Work Log:
- types.ts: FormationId ('wedge'|'line'); SaveData + approval {kaya,torvald} / formation (дефолты 45/'wedge' для старых сейвов).
- systems/party.ts (новый): APPROVAL_SYNERGY=60; addApproval (кламп 0..100, тост при пересечении 60), approvalOnKill (+1 живому компаньону <420), approvalOnQuestDone (+6 всем), approvalOnDowned (−3); formationSlot(ctx, idx) — клин (Торвальд впереди-слева 46, Кайя тыл 40) / линия (фланги сзади ±0.7 рад), companionIndex; cycleFormation; синергии: trySynergyWallAndHammer (Аард+Торвальд: стан всего конуса 2.4с, доп. d6+4, КД щитбаша 8, требует одобрение ≥60 + готовый щитбаш + Торвальд <260), trySynergyFrostAndFlame (Игни+Кайя: паровой взрыв r95 — d6+d6+3, slow 3с, КД фростболта 4).
- systems/ai.ts: follow/aggressive-ветки updateCompanion используют слоты формации вместо хардкод-офсетов; hold-ветка исполняет e.dest (приказ движения из паузы, приоритет над погоней, атаки в радиусе не прерываются).
- systems/combat.ts: approvalOnKill в onEnemyKilled, approvalOnDowned при выводе компаньона; castAbility igni/aard — конус собирается один раз и передаётся в trySynergy*.
- systems/quest.ts: advanceQuest при done → approvalOnQuestDone.
- systems/input.ts: Space → setTactical + сброс selEid; Tab — цикл цели по врагам <500; V/М — смена строя; handleTacticalClick в паузе: компаньон → выбор (selEid), враг → цель отряда, земля → приказ движения выбранному (stance hold, home=dest=точка) иначе маршрут героя.
- Renderer3d: userPitch/userDist (ввод) отделены от анимируемых pitch/dist (лерп k=0.08); setTactical — изометрический отъём (pitch→≥1.08, dist→≥235), yaw свободен; снапшот + tactical/selEid; в тактике fx.updateTactical (линии приказов игрок→компаньоны цвета компаньона + кольцо выбора).
- Fx.ts: OrderLine + пул 6 линий (плоскости на земле, rotation.y=−atan2, opacity пульс), selRing золотой; dispose расширен.
- render2d/scene.ts: паритет — пунктирные линии приказов под сущностями, эллипс выбора над ними.
- engine.ts: approval/formation/selEid, cycleFormation/setTactical, снапшоты 2D/3D с tactical+selEid; travelTo сбрасывает selEid и home компаньонов (не возвращаются в прошлую зону); setStance чистит dest при уходе с hold.
- save.ts/uiSync/store/Hud: approval+formation в сейве (v1, мягкие дефолты), PartyHud.approval, GameStore.formation; во фрейме компаньона полоска доверия (сердце, золото при ≥60), оверлей паузы → «ТАКТИЧЕСКАЯ ПАУЗА» + подсказки приказов + текущий строй; управление на титуле/в меню дополнено (V, Tab).
- Багфикс по ходу E2E: партия терялась при загрузке сейва — spawnCompanion гвардился по companionIds (уже true из сейва) и молча не спавнил; гвард переведён на наличие сущности в мире (spawnWorld + spawnCompanion).
- E2E agent-browser: клин — Торвальд (994,1763) вперёд-слева, Кайя (922,1784) тыл при facing=0; V → линия, слоты разошлись по флангам; Space — dist 120→223, pitch 0.62→1.03 (изометрия), баннер+подсказки; линии приказов геометрически точны (midpoint/длина 184/rotY 0.39=−atan2); клик по Торвальду → selEid=43; клик по земле → hold+home=dest=(875,1838); клик по волку → targetEid=16 «Отряд, цель»; резюм — камера 223→184→120, Торвальд идёт на пост; синергия Аард: щитбаш 0→8.0, стан 2.40с, урон 26→16; синергия Игни: фростболт 0→4.0, slow 3.00с, паровой взрыв добил; одобрение 70→72/73 за убийства; сейв: approval/formation в JSON v1; после reload+Продолжить — одобрение/строй/партия восстановлены (после фикса гварда); 2D-легаси: пунктиры+кольцо+оверлей, ошибок нет.
- lint + tsc --noEmit чистые; dev.log без ошибок.

Stage Summary:
- Фаза 4 закрыта по DoD: бой отрядом из 3 с приказами ощущается как DAO-lite (выбор компаньона кликом, приказ точки, цель отряда, изометрическая тактическая камера с линиями приказов); пауза даёт реальное преимущество; синергии пар при одобрении ≥60 работают и читаются флоатерами.
- Найден и исправлен регресс загрузки партии из сейва (гвард по флагу вместо наличия).
- Следующий шаг по роадмапу — Фаза 5: диалоги-камера и выборы (драматическая камера, портреты, таймер-выборы, silence-визуализация).

---
Task ID: 11
Agent: Z.ai Code (main)
Task: Фаза 5 — Диалоги-камера и выборы (GDD 05): драматическая камера (наезд/rack focus), портретный арт NPC, видимый бросок d20, теги происхождения, таймер-выборы, silence-визуализация. Пуш в GitHub.

Work Log:
- types: OriginId ('exile'|'ember'|'warden'); DialogueChoice.origin; DialogueNode.timer/onTimeout; SaveData + origin/silence (дефолты 'warden'/0 для старых сейвов).
- ctx: EngineCtx + origin/silence/dialogueFocusEid; View3dSnapshot + dialogue/dialogueFocus/silence.
- systems/quest.ts: evalToken origin:(\w+); setNode — findSpeakerEntity (NPC/уник. враг по имени ≤450 ед.) → dialogueFocusEid, узел отдаёт timer/onTimeout в HUD, diceRoll сбрасывается; chooseOption — видимый бросок: diceRoll в стор + sfx quest/warn, продолжение ветки через 1700мс (guard от двойного выбора), кнопки/цифры блокируются пока кубик летит; runAction op silence:±N (кламп 0..100); closeDialogue чистит фокус+diceRoll; openEnding — абзацы Тиши (≥60 тёмный / ≤15 светлый) + строка статистики «Тишь N/100».
- Renderer3d: updateCamera — кинокадр диалога: цель между героем и спикером (62% к спикеру), камера сбоку-сзади героя (yaw = atan2(герой−спикер)+0.55 по кратчайшей дуге), dist ≤78, pitch 0.30 → over-the-shoulder (спикер крупно, герой на переднем плане); без сущности (алтарь/доска) — наезд на героя (dist 58, pitch 0.38); updateAtmosphere(zone,dayT,silenceGoal) — silenceAmt лерп, desat() по HSL для fog/неба/солнца/hemi ×0.62, свет dim ×(1−0.24s), props.update darkness + silenceAmt·0.5 (костры гаснут).
- render2d/scene.ts: паритет — Тишь через globalCompositeOperation 'saturation' (rgba gray, s·0.75) + тёмный слой s·0.18.
- store: DiceRollHudState (label/roll/bonus/total/dc/success), diceRoll в сторе; DialogueHudState + timer/onTimeout; boot.origin; ORIGINS (3 карточки: Дозорный/Изгнанник Колонии/Пепельный послушник).
- DialogueOverlay: PortraitArt — процедурный SVG-арт 11 постоянных спикеров (Бьорн-обруч+борода, Грим-колпак+монета, Дорн-шлем+шрам, Ирма-плюмаж, Селена-капюшон+луна, Кайя-диадема, Торвальд-шлем+косицы, Альра-колпак+флакон, Пожиратель-рога/молнии/пасть, Алтарь-руна, Доска-листы); TimerBar (убывающая полоса, ≤3с красная «ТИШИНА — РЕШЕЙСЯ!»), авто-выбор onTimeout; DiceRollOverlay (d20-гексагон, качение 0.8с, итог d20+бонус vs СЛ, УСПЕХ/ПРОВАЛ); бейдж «✦ ПРОИСХОЖДЕНИЕ» фиолетовый; кнопки disabled при diceRoll.
- dialogues: origin-реплики+ноды — Бьорн (warden: «четвёртая смена у Хребта», xp30, silence−2), Грим (exile: «Грим Зольный, ладонь-весы», xp30, silence−2), Ирма (ember: «пепел в домне Ордена», xp30, silence−2); таймеры — boss_intro 8с (onTimeout=0 атака), recruit_mist 8с (onTimeout=2 «Пойду»), recruit_flame 8с, stones_kaya 10с (onTimeout=2 «Справлюсь и один»); silence — босс-бой +6, убеждение босса −4, вербовка Кайи −3, отказ «Справлюсь и один» +4, «Надо подумать» +2, сдача сердца Матери −2.
- engine/save/GameView/TitleScreen: origin через opts (boot.origin), silence/dialogueFocusEid поля, снапшоты с dialogue/silence; сейв origin/silence с мягкими дефолтами; TitleScreen — 3 карточки происхождения при новой игре.
- sfx: 'warn' (низкий диссонанс для провала броска).
- input: цифры в диалоге игнорируются, пока летит кубик.
- E2E agent-browser: титул → новая игра → карточки происхождения (Дозорный подсвечен дефолтом) → Изгнанник → старт; диалог Бьорна: портрет-арт, кинокамера обошла сбоку (Бьорн в кадре, герой передним планом), реплика Дозорного корректно скрыта (origin exile); Грим: реплика «✦ ПРОИСХОЖДЕНИЕ» видна, клик → нода земляка +30 опыта; Селена: таймер-бар убывает (4.8с → истёк → авто-«Пойду», диалог закрыт); босс: таймер 8с + убеждение → оверлей d20 (кубик «1», «1+2=3 против СЛ 15», ПРОВАЛ, кнопки заблокированы) → gotoFail taunt_fail, бой стартовал (босс-бар, урон); Тишь: полдень silence 0 vs 90 — заметное выцветание 3D; сейв {origin:'exile', silence:7}; reload + Продолжить → origin/silence восстановлены; 2D-легаси: Тишь выцветает ('saturation'); консоль/ошибки/dev.log чистые.
- lint + tsc --noEmit чистые.

Stage Summary:
- Фаза 5 закрыта по DoD: диалог в 3D читается киношно (наезд, боковой кадр от спикера, портретный арт, видимый бросок); выборы пишут флаги и Тишь, Тишь видна в мире (выцветание + гаснущие костры); происхождения открывают уникальные реплики и выбираются на титуле; таймер-выборы ME2 с «молчанием = третьим вариантом».
- Сейвы совместимы (v1, дефолты warden/0); провал проверки больше не закрывает ветку молча — читается кубиком.
- Следующий шаг по роадмапу — Фаза 6: домены 2–6 (Гранитная Долина, Стылое Пределье, Багровая Мара, Спорные Земли, Внешняя Рубежа, компаньоны).

---
Task ID: 12
Agent: Z.ai Code (main)
Task: Фаза 6.1 — Домен 2 «Гранитная Долина» (Gothic) по GDD 05: новая зона за Каменным Хребтом, карьера трёх фракций, ямные бои со ставками, босс Мастер Ямы, 2 побочных. Пуш в GitHub.

Work Log:
- data/granite.ts (новый): GRIDGE (вертикальный хребет x=3520, band 170), GR_GATES (врата по обе стороны), Колония (4260,1420), Яма (4300,1980 r130), Рудник, Осколочный барьер, 5 рудных жил, 64 валуна + 90 пепельных кустов (LCG), 6 NPC (Хран/Кассия/Брок/Йорв/Лиара/Финн), 3 зоны скорпионов, интеракты врат/барьера/жил, области/маркеры/дороги.
- world.ts: WORLD 3200→5000×4200; слияние гранита; zoneOf(x,y) — granite > veld > valley; генераторы долины клампятся к GRIDGE.x−240; blocked() + хребет/врата; re-экспорты COLONY/GRIDGE/PIT/PIT_MASTER/SHARD.
- types/ctx: CareerId/CareerState; EnemyType + scorpion/pit_master; PropDef + pit/mine/obelisk/ore; InteractableDef + ore; SaveData + career; ZoneId + 'granite'; EngineCtx + career/pitTier/pitWave.
- systems/career.ts (новый): joinCareer (вербовка = ранг 1 «Новобранец», чужие лагеря −5 rep), rankUp (реп 30/70 + взнос 250/600, чужие −8), addRep, careerPerks; PIT_FIGHTS (3 карточки: ставка 25/60/110, выплата 60/140/270, тир 3 требует ранг 2 и ур.6); startPitFight (ставка, хил, телепорт партии в арену), волны (1: драчун; 2: 2 головореза → лучник+бандит; 3: 2 скорпиона → капитан), updatePit (тик из stepWorld), endPitFight (смерть/врата); spawnPitMaster + pitMasterLogic (цеп-слэм circle-телеграф r150 follow, призыв 2 скорпионов <60%).
- Перки в бою: order — знаки ×(1+0.12·ранг), ранг 3 +2 AC (progression.playerAc); coven — масла ×(1+0.25·ранг) (inventory.useItem), зелья +6·ранг ОЗ, масло +2·ранг урона (combat.oilBonus); watch — крит на 19 с ранга 2 (combat.meleeAttack), +6% скорости и +2/с реген стамины (movement.updatePlayer). Аард оглушает скорпионов/Мастера вдвое дольше (STUN2_WEAK).
- quest.ts: evalToken career==/!career/rank>=/rep:id>=; runAction career:join/rank, rep:, pit:start (tier), key:key_granite, boss:fight_pit/weaken_pit, open:shop:brock; runInteractable portal:generic + ore: (добыча, счётчик 0/4); advanceQuest hook stage 3 → pitMasterRevealed + спавн; questMarker granite/ore/scorpions; updateArea + «Гранитная Долина»; openEnding — карьера + «Ключи-осколки N/6».
- Квесты: granite «Война за барьер» (5 стадий: барьер→Хран→яма III→Мастер→награда Ключ-осколок 200з+350xp), granite_ore «Руда для кузнеца» (4 жилы → Ядровой тесак dmg10), granite_scorpions «Клеймо скорпионов» (5 панцирей → 90з+120xp+rep). uiSync: трекер включает гранитные квесты, career HUD (фракция/ранг/слава/перки), zoneLabel, bossBar pit_master.
- dialogues.ts: портреты 8 спикеров (Хран/Кассия/Брок/Йорв/Лиара/Финн/Мастер Ямы/Осколочный барьер); 9 деревьев — shard_barrier (старт квеста от осколка), granite_warden (ветвление по стадиям, награда Ключа), pit_keeper (3 карточки ямы + call_master), smith_brock (рудa→ковка→лавка), join_order/coven/watch (вербовка, ранги, перки; вербовка требует main>=3), pit_intro (таймер 8с, убеждение СЛ 14 ослабляет босса).
- Рендеры: heightmap — вертикальный Каменный Хребет (58+jag), гранитная низина с каменными кочками, чаша Ямы, площадки Колонии/Рудника/Барьера/врат, палитра пепельная (ASHGRASS/GRAYSTONE/DUST) + песок Ямы; Terrain/Props3d — pit (песок+частокол 26 брёвен+факелы-огни), mine (арка с чёрным проёмом), obelisk (парящий кристалл+свет+кольцо), ore-жилы (removable); Avatars — buildScorpion (панцирь/клешни/хвост-коса с секциями, forwardX, анимация хвоста при выпаде), buildPitMaster (humanoid ×1.9 + наплечники + цепь); Renderer3d — атмосфера гранита (пепельный туман/небо/свет ×0.82), headH скорпион/Мастер, zoneOf(x,y); render2d — bake гранита (хребет-градиент, котловина, Колония, Яма+частокол, барьер-свечение), drawProp pit/mine/obelisk/ore, drawScorpion; scene.ts — пыл гранита.
- Инфра: movement — кламп Каменного Хребта по x; engine — career/pitTier/pitWave, travelTo granite (GR_GATES + выход со стороны Гранита), endPitFight при вратах, ambient 'granite' (520Гц/1.8q); Game.stepWorld — zoneOf(x,y) + updatePit; save — career collect/apply (дефолты для старых сейвов); sfx — granite-эмбиент; Panels — блок «КАРЬЕРА КОЛОНИИ» (фракция/ранг/слава/перки).
- Багфиксы по ходу E2E: вербовка давала ранг 0 → UI показывал «Отступник» (вербовка = ранг 1); квест руды завершался на стадии 2 (не done) — сдача теперь stage 3; поводок волн ямы/призывов 9999 → 900/700 (не гоняются за игроком через карту).
- E2E agent-browser: титул → Изгнанник → старт; врата Гранита (F) → zone granite, плашка «ГРАНИТНАЯ ДОЛИНА», пепельная палитра; Колония: 6 NPC на местах; Йорв: gating (join скрыт при main<3), «Что даёт карьера?» → перки; буст → вербовка Ордена (rep 10, чужие 0), ранг-ап до «Бойца» (−250 зол); Кассия: тир I — ставка −25, партия в арене, драчун, победа (+60, слава +3); тир III — 2 волны (скорпионы→капитан), победа (+270, stage 3), Мастер заспавнен хуком; интро Мастера по приближению (таймер 8с), агр; бой: цеп-слэм circle-телеграф пойман (slamT 0.95→0), призыв скорпионов на <60% (+2), боссбар «Мастер Ямы»; смерть Мастера → stage 4; Хран: награда → key_granite + core_key ×1 +200з; рудная жила: добыча (+1, счётчик 1/4, жила скрыта); Брок: ковка «Ядрового тесака» (−4 руды, +клинок); панель персонажа: блок карьеры (Орден Пепла/Боец/Слава 41/100/перки); 2D-легаси: гранит рисуется; reload → Продолжить: карьера/квест/ключ/зона восстановлены из сейва v1; консоль/dev.log чистые (ошибка «Can't resolve ./career» — транзитная между правками, после создания файла исчезла).
- lint + tsc --noEmit чистые.

Stage Summary:
- Фаза 6.1 закрыта по правилу «домен = 1 механика + 1 босс + 2 побочных»: карьера трёх фракций с рангами/перками/славой (Gothic-напряжение: чужие лагеря теряют доверие), ямные бои со ставками и волнами, Мастер Ямы (Страж Эха Колонии) с цеп-слэмом и призывом, Ключ-осколок №1 в финальной статистике.
- Мир вырос до 5000×4200; третья зона проходима в свободном порядке; сейвы v1 обратно совместимы (career с мягкими дефолтами).
- Скриншоты: .ref/f6-granite-entry.png, f6-colony.png, f6-pitfight.png, f6-pitmaster-fight.png, f6-char-career.png, f6-granite-2d.png.
- Следующий шаг по роадмапу — Фаза 6.2: домен 3 «Стылое Пределье» (Skyrim): пещеры-головоломки, Стены Слов (Крики), дракон-событие.

---
Task ID: 13
Agent: Z.ai Code (main)
Task: Фаза 6.2 — Домен 3 «Стылое Пределье» (Skyrim) по GDD 05: новая зона за Стылым Хребтом, пещера-головоломка с рунами, Стены Слов (крики Ту'ум на R/T), дракон-событие (Иммолтакс) с душой дракона, 2 побочных квеста. Пуш в GitHub.

Work Log:
- data/frost.ts (новый): FRIDGE (Стылый Хребет x=5390, band 170), FR_GATES (врата обе стороны), Стылый Приют (хаб), Пещера Рун (RUNE_STONES rs1-3, RUNE_SOLUTION [0,1,2], RUNE_INIT перепутан [1,2,0], RUNE_DOOR 3 пелены), WORD_WALL_FORCE/FROST, ROOST (Драконий Дол r420), BARROW, FROST_CLUES (3 следа пожара), дороги, FROST_PROPS (снежные ели 92, валуны, обугленные деревья Дола), NPC Эйнар/Ингрид, спавны (волки/драугры ×2/тролль), интеракты (rune:/word:/fclue:/portal), области/маркеры.
- Мир: WORLD 5000→6360; zoneOf frost > granite > veld > valley; blocked() + хребет/врата; movement — кламп FRIDGE; heightmap — Стылый Хребет (вертикальная стена), снежная тундра (нарастает вглубь зоны — фикс falloff), чаши Дола, плоские пятачки (Приют/пещера/стены/курган/врата), палитра снега/наледи/уголь (C_SNOW2/C_SNOWDIRT/C_ICE/C_SCORCH); 2D bake — снежная база, Приют, Дол; scene.ts — метель-тинт + снежные хлопья.
- systems/frost.ts (новый): learnWord (Стена Слова: lv 0→1, квест frost_words → done), dragonSoulAbsorb (все открытые крики +1, если оба закрыты — force=1), cycleRune/checkRuneSolution (решение → rdoor1-3 в removedProps, квест → ст.3), spawnDragon (идемпотент, alt=1, airT=3), updateFrost (триггер: квест ст.2 + игрок <380 от ROOST → спавн + ст.3), dragonLogic (полный перехват ИИ: круги над Долом + огненные бомбы-телеграфы r115 c burn, стрейф через chargeT/dashT-полосу 720 скорость, посадка (groundT 17с): укусы, струя огня (конус 250, burn), взмах крыльев (круг r170), взлёт по таймеру; cds['alt'] — лерп высоты).
- Крики Ту'ум: ABILITIES shout_force (R, СИЛА: конус 190, kb 440, стан 1.3с, драугры ×1.7 — SHOUT_WEAK) / shout_frost (T, МОРОЗ: конус 180, slow 3.5+lv); mult = 1+0.45·(lv−1); castAbility — гварды shoutLv, ветки эффектов; input — R/К и T/Е.
- Враги: draugr (hp64, спектр-масло, крик-слабость), frost_troll (hp150, огонь ×2), dragon (hp560, босс); таблицы BESTIARY_INFO/ENEMY_NAME/OIL_TARGETS (troll+dragon→beast, draugr→specter).
- Рендер 3D: Avatars buildDraugr (лохмотья, ледяные глаза), buildFrostTroll (белая грива, ледяные наросты), buildDragon (корпус/шея/пасть с углями/рога/хвост-цепочка/кожистые крылья с костями/грудное свечение; forwardX, анимация: взмахи крыльев ×dragonAlt, хвост, hover 14+40·alt); archetype+headH; Renderer3d — атмосфера frost (белёсый туман/небо/свет), снегопад (THREE.Points 850, follow камеры, opacity по зоне), Props3d — snowtree (инстансы: хвоя+шапки), cave (ледяная арка), runestone (кольцо-символ перекрашивается из view.runes: заяц-мох/волк-янтарь/луна-серебро), wordwall (рунная полоса, золото/лёд), rune_door (ледяная пелена removable); update() + runes параметр.
- Рендер 2D: drawProp cave/runestone/wordwall/rune_door/snowtree; drawEntity draugr/troll (humanoid перекрас) + dragon (крылатая тень: крылья-мембраны с flap, alt-подъём); bake — хребет/тундра/Дол.
- Квесты/диалоги: frost_words «Слова на камне» (Эйнар: lore о Ту'уме, старт, прогресс), frost_dragon «Голос в буране» (Ингрид: старт, прогресс, награда 320з+плащ+500xp, silence −2), frost_slab (плита-подсказка «Заяц — Волк — Луна»); PORTRAITS ×5 (Эйнар/Ингрид/Плита/Стена/Иммолтакс); подарок Эйнара — frost_blade (dmg 9) + 150з; advanceQuest-хуки (руны → 3, слово → 4 done, следы → 2, дракон death → 4); questMarker Пределье; onEnemyKilled dragon (dragonDead, fang, 180з, душа) и draugr/troll лут.
- Инфра: engine — shoutLv/runes (дефолты RUNE_INIT), travelTo frost-врата (из гранита и обратно), снапшот runes, ambient 'frost' (свист метели 1250Гц), zoneLabel; Game.stepWorld + updateFrost(dt); save — shoutLv/runes collect+apply (кламп 0..2, дефолты); ai.spawnWorld — дракон восстанавливается при загрузке в бою (ст.3 + x>5500); uiSync — ShoutHud зеркало (R/T, lv I/II), bossBar dragon, трекер + frost-квесты; store — shouts[]; Hud — 2 слота криков слева от бара (иконки Wind/Snowflake, замок при lv 0, уровень слова, КД).
- Багфикс по ходу E2E: снег исчезал в глубине зоны — falloff(t,0,N) даёт 1 у хребта и 0 дальше; заменён на 1−falloff (нарастание вглубь).
- E2E agent-browser: врата → зона frost (плашка «СТЫЛОЕ ПРЕДЕЛЬЕ», снег/ели/снегопад/эмбиент); Эйнар → квест; руны rs1×3/rs2×2/rs3×2 → «РУНЫ ПОЮТ!», rdoor1-3 скрыты, квест ст.3; Стена Слова → «СИЛА», R слот открыт (I), квест done; R-крик: КД 13с, ОВ −26, конус+kb; Ингрид → квест; 3 следа (флоатеры+тексты) → ст.2 → дракон заспавнен у Дола (босс-бар «Иммолтакс», тосты); воздух: огненная бомба r115 → burn 12 урона; посадка (модель: шея/пасть/крылья/хвост читаются), наземная фаза: укусы+автоатака героя; смерть: dragonDead, душа force 1→2, ст.4, Клык ×1, +180з; Ингрид: награда 320з+плащ, done; вторая Стена (плато, тролль-охрана) → МОРОЗ, T-крик КД 16с; тролль chase+удары; сейв/reload/Продолжить: shoutLv 2/1, флаги, руны, квесты, предметы, позиция — восстановлены; слоты R «II»/T «I» в HUD; подарок Эйнара (Стылый клинок+150з); dev-сервер падал от частых hot-reload — перезапущен, после — console/errors чистые.
- lint + tsc --noEmit чистые.

Stage Summary:
- Фаза 6.2 закрыта по правилу «домен = 1 механика + 1 босс + 2 побочных»: Skyrim-механика — Ту'ум (2 Стены Слов, 2 крика, 2 уровня слов, душа дракона как усиление), пещера-головоломка с рунными кольцами и дверью-пеленой, дракон-событие с 3 фазами (круги с бомбами → стрейф-полоса → наземный бой) и поглощением души.
- Мир 6360×4200, 4-я зона проходима в свободном порядке; сейвы v1 обратно совместимы (shoutLv/runes с дефолтами).
- Скриншоты: .ref/f62-frost-entry.png, f62-haven3.png, f62-snowview.png, f62-runes-solved.png, f62-wordwall.png, f62-shout-force.png, f62-dragon-air.png, f62-dragon-fight.png, f62-shout-frost.png, f62-reload.png.
- Следующий шаг по роадмапу — Фаза 6.3: домен 4 «Багровая Мара» (DAO): оборона бастиона (волны + приказы), мор-погода.

---
Task ID: 6.3
Agent: Z.ai Code (main)
Task: Фаза 6.3 — Багровая Мара (домен DAO): оборона бастиона (волны + приказы партии), мор-погода, босс Мор-Мать, 2 побочных квеста.

Work Log:
- Данные: data/mara.ts — Багровый хребет (y 3350, сектор Гранита), Врата Мары (обе стороны), Бастион Ветвей (4380,3800) + ворота штурма, 2 лагеря прорыва, 3 мор-сгустка, Логово Моры; дороги, пропсы (bastion/blight/deadtree/rock), NPC (Командор Мейра, Досент Хольт), спавн-зоны (ghoul ×2, abomination), интеракты (рог, сгустки), арea/маркеры; SIEGE_WAVES 5 волн (финал — Мор-Мать).
- Мир: world.ts — zoneOf 'mara' (x>GRIDGE && y>MARA_RIDGE), интеграция PROPS/NPCS/SPAWN_ZONES/INTERACTABLES/AREAS/MARKERS/ROADS + реэкспорты; granite.ts — генерация валунов/кустов клампится к y < MARA_RIDGE−280; types.ts — EnemyType ghoul/abomination/blight_mother, PropDef blight/bastion.
- Бой: abilities.ts — статы ghoul (70hp, быстрый), abomination (150hp, таран), blight_mother (640hp босс); FIRE_WEAK +ghoul/abom, STUN_WEAK +Мать; tables.ts — бестиарий/имена, OIL_TARGETS specter + мор-твари; items.ts — ghoul_gland, bastion_blade (dmg 11), blight_heart, watch_gorget (ac 4).
- Система осады systems/mara.ts: startSiege (рог; компаньоны получают приказ hold у ворот — связка с Фазой 4), updateMara (брейк 8с → волна → грызня частокола alive*0.55/с → победа/провал), blightMotherLogic (мор-взрыв круг, мор-плевок конус с burn+slow, призыв упырей 66/33%), siegeHud зеркало. Провал: твари рассеиваются, ретрай через рог.
- Квесты/диалоги: 'mara' «Оборона Бастиона» (5 стадий), 'mara_wells' «Скверна в жилах» (3 сгустка → горжета), 'mara_glands' «Желёзы скверны» (5 желёз с упырей/абомов); диалоги mara_meira/mara_holt/mara_horn + портреты; quest.ts — action 'siege:start', интеракт 'purge:', портал 'mara'.
- Хуки: ai.ts — blightMotherLogic в updateEnemy; combat.ts — лут/счётчики ghoul/abom/blight_mother; Game.ts — updateMara в stepWorld; engine.ts — siege поле (транзитное), travelTo mara (MA_GATES обе стороны), ambient 'mara' (sfx — гул 95Гц); movement.ts — Багровый хребет непроходим (сектор Гранита).
- Рендер 3D: heightmap — хребет, пустошь с омутами, Бастион FLAT, палитра C_BLIGHT/C_VEIN/C_ROTTED + багровые жилы; Renderer3d — багровое небо/туман/солнце/полусферика, мор-искры (снегопад перекрашен, медленный дрейф); Props — bastion (частокол с башнями/знамёнами/факелами) + blight (лужа с пульсирующим ядром, removable); Avatars — buildGhoul (горб, угли-глаза), buildAbomination (коконы, брюшной мешок), buildBlightMother (bulk+корка+щупальца+ядро, forwardX); render2d — кейсы bastion/blight/упыри/Мать.
- UI: store/uiSync — siege-зеркало (волна N/5 + % частокола), boss-детект blight_mother, zoneLabel «БАГРОВАЯ МАРА», маровские квесты в трекере побочек; Hud — панель «ОБОРОНА БАСТИОНА» с полосой частокола, CONTRACT_TOTALS (N/M для всех побочек в трекере).
- Багфиксы по ходу E2E: ① ctx.time не тикал со времён рефакторинга 0.9 (ломало respawnAt/endingAt) — восстановлен тик в stepWorld; ② интро Пожирателя Бурь срабатывало на ЛЮБОМ boss:true (в т.ч. Мор-Мать) — условие ужато до enemyType==='boss'; ③ порядок действий диалога Мейры (siege:start до quest:mara:2 гвардился stage<2) — переставлен; ④ сгустки можно было жечь до взятия квеста (квест зависал) — cond quest.mara_wells==1; ⑤ well_* removedProps не восстанавливались из сейва — рестор в spawnWorld; ⑥ тинт Мары слишком узко переходил — falloff расширен.
- E2E agent-browser: Гранит → врата → «БАГРОВАЯ МАРА» (багровая дымка, мор-искры, гул); Мейра: квест → рог → осада; волна 1: 4 упыря из лагерей, частокол 100→98.8, «ВОЛНА 1!», UI-трекер; прыжок на волну 5: 2 упыря+2 абома+Мать, босс-бар, ИИ тикает (слэм/плевок/призыв), урон игроку; победа → stage 4 + bastionHeld; Мейра: награда 350з+Клинок Бастиона+stage 5; Хольт: сгустки 3/3 → горжета+140з; желёзы: реальное убийство упыря (kills=1, counter 1/5, железа в луте); провал осады (gateHp→0 → siege null, ретрай); сейв/reload/Продолжить ×4 — квесты/флаги/сгустки восстановлены; переходы mara⇄granite в обе стороны; tsc+lint чистые, консоль без ошибок.
- Скриншоты: .ref/f63-granite-side.png, f63-bastion.png, f63-siege-start.png, f63-wave1-fight.png, f63-mother.png, f63-mother-fight.png, f63-bastion-gate.png, f63-blight-well.png, f63-tint3.png, f63-fromabove.png.

Stage Summary:
- Фаза 6.3 закрыта по правилу «домен = 1 механика + 1 босс + 2 побочных»: DAO-механика — оборона Бастиона волнами с прочностью частокола и приказами партии (hold у ворот при роге + тактическая пауза Фазы 4), мор-погода (багровое небо/искры/гул) как атмосферный слой, босс Мор-Мать в финале 5-й волны, побочки Хольта (сгустки/желёзы) с наградами.
- 5-я зона мира проходима; осада транзитна (не сейвится) — после загрузки ретрай через рог; сейвы v1 обратно совместимы.
- Попутно исправлен старый баг: ctx.time (потерян при рефакторинге) — респавн врагов и финал снова работают.
- Следующий шаг по роадмапу — Фаза 6.4: домен «Спорные Земли» (BG3): диалоговые квесты, выборы, меняющие ландшафт.

---
Task ID: 6-b
Agent: Z.ai Code (subagent)
Task: Фаза 6.4 render2d — bake Спорных Земель, drawProp/drawEntity новых типов

Work Log:
- Прочитал worklog.md (стиль Фаз 6.1–6.3), проверил data/disputed.ts и types.ts: KRAJ/DF_GATES/GROVE/GROVE_HEART/HORDE_CAMP/SHRINE реэкспортированы из data/world; новые PropKind (grove_tree/burnt_tree/totem/lantern/bloom/rubble) и EnemyType (raider/hexer/horde_chief) уже объявлены; DISPUTED_ROADS влиты в ROADS (дороги дорисуются существующим циклом drawRoad).
- renderer.ts bakeTerrain (блок «Фаза 6.4» после Драконьего Дола, до рамки мира; стиль как GRIDGE/FRIDGE — градиент-полоса + пятна-шум): Рубежный Кряж — вертикальный градиент камня rgba(74,70,64) шириной KRAJ.band×2 на всю высоту; вересковая пустошь — fillRect x 6900→7760 градиентом #6a5c34 (alpha 0.5→0.85) + 420 пятен (золотистые rgba(150,126,68)/тёмные rgba(74,66,40)); вытоптанный пятачок у Врат (DF_GATES.disputed); прогалина Рощи — двойной зелёный эллипс #3c4a24 220×160 + внутренний светлее; пятно Орды — багрово-угольный эллипс #4a2418 200×150 + тёмное ядро; погост — тёмное пятно #2e2a20 ~90×68. Импорты KRAJ/DF_GATES/GROVE/HORDE_CAMP/SHRINE добавлены в строку импорта '../data/world'.
- renderer.ts drawProp — 6 кейсов после 'blight' (секция «Фаза 6.4», top-down стиль: тень-эллипс + пульс через t): grove_tree (тень, ствол-прямоугольник #4a3628, крона двумя кругами #4a5a26/#6a7a2e, золотое свечение rgba(217,184,74) с пульсом, масштаб от seed); burnt_tree (обугленный ствол #18120e с 3 рваными ветками-линиями, тлеющий уголёк rgba(217,74,48) у подножия); totem (бревно #3a2a1a + 3 черепа #c9b89a + багровые полосы rgba(201,79,61) с пульсом); lantern (столб + radialGradient-свечение #f5c96b с пульсом); bloom (3 золотых цветка #d9b84a на зелёных стеблях + мягкий ореол); rubble (2 тёмных многоугольника #2e2620 + обломок бревна). Кейсы 'shrub'/'flower' не тронуты (инстанс-фильтр сохранён).
- renderer.ts drawEntity — 3 кейса после 'frost_troll' (по образцу drawHumanoid: shadowBlob, bob от walkPhase/vel, hitT-вспышка белым, drawWeaponSwing): raider (повязка #2e2620, кожа #4a382c, рогатый шлем #5a5048 с рогами #c9b89a, два угли-глаза #e0653a, грубый клинок); hexer (худая мантия #2e2024 кривыми Безье, капюшон #241a1e с тенью лица и углями, посох с багровой головкой #c94f3d, пульс 4Гц); horde_chief (громила ×1.5: торс #3a2a22, голова #4a382c, два белых клыка-треугольника, ярко-оранжевые глаза #ff8a3a, багровое знамя #b0563a на древке за спиной). Общие пост-эффекты (стан/горение/слоу/HP-бар) работают без изменений через нижнюю часть drawEntity.
- Самопроверка: `bun run typecheck` — 0 ошибок; `bun run lint` — чисто; файл один (src/lib/game/render2d/renderer.ts), render3d/data/systems/engine.ts не тронуты.

Stage Summary:
- Легаси 2D-рендер Спорных Земель готов к E2E Фазы 6.4: bake рисует кряж-границу, золотисто-оливковую пустошь с зелёной прогалиной Рощи, багровым пятном Орды и тёмным погостом (синий/индиго не используется, палитра домена соблюдена).
- Все 6 новых пропсов и 3 новых врага Орды имеют 2D-спрайты; ландшафтные сдвиги (groveBurned/groveSaved/hordeBroken через SHIFT_PROPS/removedProps) автоматически переключают вид: живые деревья ↔ обугленные стволы, шатры ↔ обломки, цветы/фонари появляются после благословения — движок и рендер менять не потребовалось.

---
Task ID: 6-a
Agent: Z.ai Code (render3d, саб-агент фазы 6.4)
Task: Фаза 6.4 render3d — Спорные Земли: heightmap/палитра, атмосфера, пропсы, аватары врагов

Work Log:
- heightmap.ts: импорт KRAJ/DF_GATES/GROVE/HORDE_CAMP/SHRINE из '../data/world'; Рубежный Кряж — вертикальная стена t²·(61+jag) у x=6720 по образцу FRIDGE; слой поставлен ПОСЛЕ тундры Пределья и верещатника (fz=1 при x≥5750 иначе стирал стену — поймано смоук-тестом heightAt, в комментарии помечено); вересковая пустошь (fBm-гряды, нарастание вглубь зоны 1−falloff как у снега Пределья); плоские пятачки: врата обе стороны (h 1.8), Роща (эллипс 200×150, h 3.4), лагерь Орды (190×140, h 2.6), погост (r100, h 4.5); палитра C_HEATH [0.46,0.40,0.20] / C_HEATH2 [0.38,0.33,0.17] / C_SCORCHRED [0.36,0.17,0.11] / C_GROVE [0.26,0.34,0.16] / C_GROVE2 [0.20,0.28,0.13]; terrainColorAt — блок disputed поставлен ПОСЛЕ блоков Пределья и Мары (иначе снег Пределья/гниль Мары перекрывали восток): вереск пятнами через fbm, багровые проплеши к HORDE_CAMP <340 (патчность вторым шумом), зелень Рощи GROVE <260 (C_GROVE/C_GROVE2 по шуму), уголь погоста SHRINE <140 (C_SCORCH), камень Кряжа |x−KRAJ.x|<320.
- Renderer3d.ts: updateAtmosphere — ветка disputed: тёплый вересково-пыльный туман RGB(0.24+dl·0.40, 0.20+dl·0.30, 0.12+dl·0.16), density 0.0019−dl·0.0007 (как гранит); небо: тёплый сухой купол (0.20+dl·0.26, 0.17+dl·0.21, 0.12+dl·0.13), вересковый горизонт (0.38+dl·0.46, 0.31+dl·0.36, 0.19+dl·0.22); zoneDim 0.88 в тернарнике; hemi/sun — общая ветка (как у гранита); снегопад: disputed → snowGoal 0 уже давался тернарником, перекраска snowMat в маровский багровый disputed не задевает (lerp обратно к белому при opacity→0) — не тронуто; headH-цепочка: + raider 18 / hexer 26 (horde_chief — boss=true → дефолтные 58, подтверждено systems/disputed.ts:137); других switch-ей по enemyType/zone в рендерере нет.
- Props.ts: 6 кейсов buildProp (все на place()/heightAt, стиль bastion/blight): grove_tree (ствол CylinderGeometry(2.2,3.6,17) + две кроны-икосаэдра 0x4a5a26/0x6a7a2e с лёгким emissive, castShadow), burnt_tree (чёрный ствол 0x18120e с наклоном + 3 рваные ветки-цилиндра + угли emissive 0xd94a30 у подножия), totem (бревно 0x3a2a1a, 3 черепа box+челюсть, багровые emissive полосы 0xc94f3d между ними, верхний череп-сфера с рогами-конусами), lantern (столб + сфера emissive 0xf5c96b ×0.9 + PointLight(0xf5c96b,60,70,2)), bloom (4 стебля-конуса с золотыми головками-икосаэдрами emissive 0xd9b84a + мягкое свечение), rubble (груда 0x2e2620: 2 додекаэдра + бокс + рваное бревно); removable у ВСЕХ пропсов с p.id — включая существующие кейсы house/tent/portal/fire (grove_hut, ref_tent1-3, hc_tent1-4, grove_fire/grove_pyre/hc_fire1/hc_fire2 — ландшафтные сдвиги BG3; id порталов врат в SHIFT_PROPS не участвуют — регистрация безопасна); 'shrub' инстансы не тронуты.
- Avatars.ts: buildRaider (humanoid ×0.9, кожа 0x4a382c + угольные пятна-сферы 0x18120e, рваная повязка-конус 0x2e2620, рогатый шлем (2 конуса), глаза-угли 0xd96b3a под каской), buildHexer (×1.05, мантия+капюшон 0x2e2024, рваный подол, посох в refs.armR: древко + emissive головка 0xc94f3d, тлеющие глаза 0xd96b3a из-под капюшона), buildHordeChief (×1.8, нагрудная пластина + наплечники-конусы 0x3a2a22, белые бивни-клыки вверх из нижней челюсти, штандарт на спине: шест + багровое полотнище 0xb0563a, глаза 0xd94a30); свитч построения (case 'raider'/'hexer'/'horde_chief') и archetype() расширены; все три — HumanoidRefs (legL/legR/torso/armR) → анимируются общей humanoid-веткой (шаг/выпад атаки/замах слэма), forwardX не требуется; глаза новых аватаров посажены на поверхность черепа (у глаза-под-каской/капюшоном выверены, чтобы не тонуть в геометрии).
- Самопроверка: bun run typecheck (tsc --noEmit) и bun run lint — чистые; смоук heightAt: врата 1.8/1.8, Роща 3.40, лагерь 2.60, погост 4.50, гребень Кряжа ~62-64 с вырезом врат на y=1450 (1.8 по обе стороны, стена 60.8 между, спад в вереск 6960→1.2); смоук terrainColorAt: вереск (0.44,0.38,0.18), проплеши у лагеря (0.37,0.23,0.15), камень Кряжа (0.45,0.45,0.43), снег Пределья западнее Кряжа не задет (0.82,0.85,0.84); у Рощи/погоста цвет уточняется дорогой (C_ROAD) — дороги рисуются позже по общему пайплайну.

Stage Summary:
- render3d-слой Фазы 6.4 готов: Спорные Земли читаются как тёплая золотисто-оливковая пустошь без синевы за стеной Рубежного Кряжа (~61-64 ед., врата вырезают проход), с багровыми проплешами у лагеря Орды, живым зелёным пятном Рощи и углём погоста; атмосфера disputed (туман/небо/свет zoneDim 0.88) добавлена по паттерну гранита.
- Механика BG3 «ландшафт от выборов» работает в 3D: все shift-пропсы спорной зоны зарегистрированы в removable (роща выгорает/расцветает, лагерь разбирается, шатры/хижина/костры исчезают) — движок гонит это через removedProps без изменений.
- Новые враги Орды визуализированы: мародёр/колдун/Гхарз собираются по HumanoidRefs-паттерну, пикинг (headH 18/26/58-босс) и анимации унаследованы от общего гуманоидного пути.
- data/, systems/, engine.ts, render2d/ не тронуты; tsc+lint чистые.

---
Task ID: 14
Agent: Z.ai Code (main)
Task: Фаза 6.4 — E2E-верификация Спорных Земель + интеграция GDD v2.0 + пуш.

Work Log:
- Интегрирован GDD «Эхо Разлома» v2.0: docs/GDD/ обновлён с 6 до 10 документов (новые 06-ui-ux, 07-content, 08-qa, 09-glossary; 00–05 перезаписаны v2.0), добавлена PDF-книга docs/GDD-Echo-of-the-Rift-v2.0.pdf (50 стр.).
- Проверена полнота кода Фазы 6.4 (data/disputed.ts, systems/disputed.ts, dialogues, quests, Game.ts updateDisputed, uiSync assault-зеркало, Hud-панель «НАБЕГ ОРДЫ») — всё уже в репо из коммита 6.3, tsc+lint чистые.
- E2E agent-browser (золотой путь домена BG3):
  · travelTo disputed → метка «СПОРНЫЕ ЗЕМЛИ», вересковая пустошь/Роща читаются в 3D;
  · Ульва: квест «Семя Разлома» (stage 1) → Гхарз: таймер-выбор 4с (истёкшее время = путь молчания — тоже работает; повторный диалог быстрый выбор «защитить» → stage 3, defendChosen);
  · триггер близости Рощи (<430) → НАБЕГ ОРДЫ, HUD-панель «ВОЛНА 1/3», компаньоны в hold у сердца Рощи;
  · 3 волны (4 мародёра → 5 с колдунами → 2 мародёра+колдун+Гхарз) — спавн из лагеря, chase, бой (Игни-цикл + prime hp для ускорения под троттлингом фоновой вкладки; смерть через легитимный damage-пайплайн);
  · босс: рёв (конус+slow) сработал, призывы на фазах 66/33% (summonStage 2, свита-мародёры);
  · победа → assault null, horde_broken: флаг, removedProps (шатры/тотемы → обломки, цветы/фонари скрыты до groveSaved), тосты, бестиарий Гхарза, квест stage 5;
  · Ульва turn-in → stage 6 done, Ключ-осколок, 260з, 520xp (L20); grove_saved — через тот же applyLandscapeShift, что и проверенный horde_broken (ветка за flag.seedBlessed — убеждение dc14 в ветке «о Семени»);
  · побочки взяты: «Глаза Орды» (Тарбен, stage 1, трекер 0/4), «Ларец беженцев» (Пруша, stage 1);
  · сейв → reload → ПРОДОЛЖИТЬ: hordeBroken=true, removedProps=27 (сдвиг ландшафта восстановлен), квесты/золото/ключ на месте.
- Консоль браузера и dev.log — без ошибок.
- .gitignore: + /upload/ и /tool-results/ (служебные), коммит и пуш.

Stage Summary:
- Фаза 6.4 закрыта полностью: домен BG3 «выборы, меняющие ландшафт» работает end-to-end (диалог → флаг → физическая перестройка мира → персистентность), набег Орды — волновой штурм с приказами партии, Гхарз — босс с телеграфами и фазами.
- GDD v2.0 (10 документов + PDF) — канон и баланс проекта в репо.
- Условный прогресс по роадмапу: Фазы 0–5 закрыты, Фаза 6: домены 6.1 Гранит/6.2 Пределье/6.3 Мара/6.4 Спорные закрыты; осталась Фаза 7 (финал) и Фаза 8 (полировка/релиз).

---
Task ID: 15
Agent: Z.ai Code (main)
Task: Фаза 7 — Финал (ME2): рейд в Сердце Разлома, суд Пожирателя Эха, 5 концовок, судьбы отряда.

Work Log:
- data/finale.ts (новый): RAID_HEART/RAID_TRIGGER/RAID_BREAK, RAID_WAVES 4 волны (1 Авангард horrors, 2 Артиллерия shades+hexer, 3 Медик abom+ghouls, 4 Проводник draugr+horror), RAID_ROLES (Торвальд-авангард/в1, Кайя-артиллерия/в2), LOYALTY_FLAG (Торвальд=bastionHeld «пока держится сталь», Кайя=groveSaved «голос из рощи» — адаптация GDD к построенному контенту), 5 концовок ENDINGS с числами GDD 01 §6 (Раскол вечности → Тишь → Заря → Печать → Эхо; KEYS_GOAL=5 — Внешний Рубеж K6 ещё не построен), companionFates 3 варианта × 2 компаньона, endingState().
- systems/finale.ts (новый): startRaid (идемпотент, партия в hold у сердца, quest raid → 2), spawnRaidEnemy (кромка арены, zoneId 'raid'), survivalCheck — матрица GDD 07 §7 (лоялен+одобрение ≥25 — жив; лоялен+<25 — с волны 2 бросок d20+одобрение/10 против СЛ 15 с тостом; не лоялен — гибнет на волне роли), killCompanion (flags.<id>Dead), startJudgment (Пожиратель Эха как npc-интеракт + авто-диалог), resolveEnding (явный выбор: merge→Эхо/rift→Раскол/silence→Тишь; seal→цепочка приоритетов 5→4→1→2→3), updateFinale (триггер близости <400 при main stage 5 + barrierOpen, волны/паузы как в набеге), raidHud.
- Квесты: MQ-08 'raid' «Сердце Разлома» (4 стадии) и MQ-09 'judgment' «Суд Пожирателя» (2 стадии) в QUESTS; main stage 5 переписан на рейд.
- Ключи доменов (GDD 07 §1): ITEMS + key_valley/key_veld/key_frost/key_mara; grantKey() в quest.ts (флаг+предмет+тост «собрано N из 6»); гранты: checkProof→key_valley, ash_mother kill→key_veld, runeDoorOpen→key_frost, siegeVictory→key_mara.
- Суд: dialogues.ts judgment_devourer (динамический start: intro_rift при секретах+лояльностях+ключах 5+silence≤30; intro_doom при silence≥75 с выбором «Опустить руки»; базовый intro — seal/merge), action 'ending:*' в quest.ts (case 'ending' → resolveEnding); dialogueCtx расширен silence+keys (+DialogueCtx в types).
- Канон GDD 09 §3: Пожиратель Бурь → Пожиратель Эха (ENEMY_NAME.boss, BESTIARY_INFO, портырет, лор Селены); UNIQUE_SPAWNS boss убран (суд — не HP-бой), старый хук boss_intro в ai.ts удалён, kill 'boss' больше не триггерит финал.
- openEnding rework: def из ENDINGS (имя/цвет/intro), судьбы компаньонов companionFates, статы с KEYS_ALL (N/6), grove/silence-строки гейтятся для концовки Тишь; store EndingHudState {id,name,color,epilogue,fates,stats}; Panels EndingPanel — заголовок «КОНЦОВКА: ИМЯ», блок «СУДЬБЫ ОТРЯДА»; Hud — панель «РЕЙД · ВОЛНА N/4»; uiSync — raidHud + raid/judgment в трекере побочек.
- Game.ts: updateFinale(ctx, dt) после updateDisputed.
- Багфиксы по ходу E2E: ① survivalCheck вызывался только с волны 2 — смерть за нелояльность на волне роли (Торвальд/в1) не срабатывала → вызов с каждой волной, броски approval только с ≥2; ② updateCompanion авто-поднимал павших → судная смерть игнорировалась → guard по flags.<id>Dead (спутник не встаёт).
- E2E agent-browser (5 концовок + матрица выживания): рейд стартует по триггеру, HUD «РЕЙД · ВОЛНА N/4», 4 волны отбиты (Игни-цикл + pump update(0.016) под троттлингом фоновой вкладки); суд открылся сам после 4-й волны; смерть Торвальда на волне 1 при bastionHeld=false (флаг+тост, возрождение заблокировано); концовки: Печать (fallback+судьба «погиб»), Заря (5 ключей+одобрение 85+2/2 лояльности+silence 0 — «Мир рождается заново»), Раскол вечности (золотой узел при seedBlessed+emberTalk), Эхо («Хранитель-Пожиратель»), Тишь (узел рока при silence 80, «Гексмарк пуст»); консоль/линт/tsc чистые.
- Скриншоты: .ref/f7-01-ending.png (Печать), f7-02-seal-death.png (Печать+погиб), f7-03b.png (Заря), f7-04-rift.png (Раскол), f7-05-silence.png (Тишь).

Stage Summary:
- Фаза 7 закрыта: рейд ME2 (4 волны + роли + матрица выживания), суд Пожирателя Эха (не HP-бой, дилемма с золотой секретной веткой), 5 концовок по числам GDD с приоритетом 5→4→1→2→3, судьбы компаньонов в эпилоге (3 варианта), ключи всех построенных доменов (6-й — под Внешний Рубеж).
- DoD: все 5 концовок достижимы и проверены E2E; судьбы показываются; флаги персистентны (judged в сейве).
- Следующий шаг по роадмапу — Фаза 8: полировка и релиз v1.0.

---
Task ID: 16
Agent: Z.ai Code (main)
Task: Фаза 8 — Полировка и релиз v1.0: качество-пресеты с авто-даунгрейдом, музыкальный директор, звук поверхностей, UI-звуки, настройки, титры, README.

Work Log:
- settings.ts (новый): пресеты качества (low/medium/high/auto) + громкости (музыка/эффекты/эмбиент) + mute; localStorage 'echo-rift-settings', read/write/clamp, stepDown() и QUALITY_NAME.
- sfx.ts (реорганизация): шины громкости sfxBus/ambBus/musicBus → master (mute); setVolumes/getVolumes/audioCore(); новые звуки — 'dice' (кубик d20), шаги по поверхностям step_grass/step_stone/step_snow/step_ash + stepSfx(zone); хук setStingerHook для музыкальных стингеров (boss/level/quest дёргают и музыкальный слой).
- audio/MusicDirector.ts (новый): горизонтальные слои по GDD 04 §4.1 — explore (пэд-аккорды домена, 6 ладов по палитрам GDD: дорийская долина, болотный минор Вельда, фригийский Гранит, sus-лад Пределья, тритоновый гул Мары, лидийские Спорные), колокольчики, combat (пульс баса ~143bpm + квинта), кроссфейд 2 с, lowpass «под водой» (620 Гц) в тактической паузе, стингеры; планировщик с lookahead 0.35 с от rAF; musicDebug() для QA.
- Renderer3d.setQuality(): low (ratio 1, тени off) / medium (1.5, 1024) / high (dpr≤2, 2048); пересоздание shadow map + needsUpdate материалов; View3dBridge + setQuality.
- store.ts: settings/effQuality/fps в сторе; PanelId + 'settings' | 'credits'; updateSettings().
- core/Game.ts: FPS-метр в GameLoop (EMA, окно 3 с) → LoopHost.onFps.
- engine.ts: applySettings() (громкости + пресет + writeSettings), onFps() — авто-даунгрейд при <42 FPS (ступень вниз, тост) и авто-апгрейд при >55 FPS три окна подряд; syncUi — musicDomain/musicCombat (враг в 340 или siege/assault/raid)/musicPaused; render() → musicTick(); closePanel — click; setRenderMode применяет пресет к новому Renderer3d; __musicDebug на window.
- movement.ts: шаги героя по поверхностям зон (накопитель фазы по скорости).
- quest.ts: sfx('dice') при видимом броске.
- Panels.tsx: SettingsPanel (режим рендера, 4 пресета качества + «действует», живой FPS, 3 ползунка громкости на shadcn Slider, mute) + кнопка «Настройки» в паузе; CreditsPanel/CreditsBody (вдохновения, технологии, системы, документация, дисклеймер) + «Титры» в EndingPanel.
- TitleScreen.tsx: метка «ВЕРСИЯ 1.0», кнопка «ТИТРЫ» с оверлеем (реэкспорт CreditsBody).
- README.md: финализация v1.0 — статус «Фазы 0–8 закрыты», таблица доменов по факту, настройки, структура (render3d/audio/settings), бэклог после v1.0.
- E2E (agent-browser, QA-ворот G8): титул (v1.0 + оверлей титров) → новая игра 3D; Esc → Настройки; качество Низкое → тени off, Высокое → тени on, localStorage persist; музыка: started/domain valley, бой (волк рядом) → combat=true, уход из боя → combat=false, Space → paused=true/false (lowpass); шаги при 180 кадрах ходьбы — без ошибок; панели C/M и сейв/лоад — регресс чист (позиция 833,141 восстановлена); Legacy 2D вкл/выкл из настроек — мир рендерится; авто-даунгрейд в headless (FPS 20): high → medium → low по окнам 3 с, тосты, FPS-строка красная; консоль браузера и dev.log — без ошибок; tsc + lint зелёные.

Stage Summary:
- Фаза 8 закрыта, релиз v1.0 готов: все 8 фаз роадмапа (G0–G8) пройдены.
- Качество: авто-даунгрейд/апгрейд реально работает (проверено на 20 FPS headless), настройки персистентны.
- Аудио: полный директор (слои/кроссфейд/пауза/стингеры), голоса доменов, шаги по 4 поверхностям, UI-звуки, кубик.
- Титры на титуле и в концовке; README синхронизирован с GDD.
- Следующий шаг — бэклог после v1.0 (GDD 04 §4.3): TTS-озвучка, темы боссов по фазам, ремап клавиш.

---
Task ID: 17
Agent: Z.ai Code (main)
Task: v1.1 — бэклог после релиза (GDD 04 §4.3): TTS-озвучка ключевых реплик (2 голоса), адаптивные темы боссов по фазам HP, ремап клавиш.

Work Log:
- Предыстория: проверка repo показала, что Фазы 7 (460217d) и 8 (5735a98) уже закрыты и запушены — сводка сессии устарела. Актуальный бэклог после v1.0: TTS, темы боссов, ремап клавиш.
- bindings.ts (новый): 19 действий (слоты 1–7, крики R/T, зелья Q/E, interact F, пауза Space, цель Tab, строй V, панели C/I/J/M), DEFAULT_BINDINGS, localStorage 'echo-rift-keybinds' с валидацией, нормализация русской раскладки CYR2LAT (биндинг хранится латиницей, работает на обеих), keyMatches/keyOwner/keyLabel/labelFor, hotkeyLabelForAbility для HUD.
- input.ts: все действия кроме движения (WASD/стрелки фиксированы) переведены на биндинги; закрытие панелей повторным нажатием — по биндингам.
- uiSync.ts: findActiveBoss() экспортирован (bossBar + тема босса); хоткеи способностей/криков и подсказка «— [F]» берутся из биндингов.
- settings.ts: voiceOn/voiceVol в GameSettings (валидация readSettings).
- MusicDirector.ts: слой boss — дрон (2 расстроенные пилы, тоника домена/2, retune при смене зоны), «тук-тук» сердцебиение 0.84 с, фаза 1 (+остинато тритона 8-ми), фаза 2 (+хаос-кластеры); musicBoss(on)/musicBossPhase(hp01) с порогами 66/33%, стингер на входе в фазу; musicDebug → boss{on,level,hp}.
- engine.ts: syncUi — musicBoss(findActiveBoss)/musicBossPhase(hp/maxHp); applySettings — setVoiceVolume.
- voice.ts (новый): speakLine — только спикеры VOICE_OF (19 имён, male/female), POST /api/tts, blob-URL кэш в памяти, дедуп inflight, гонки через lastReq, ошибки глотаются; stopVoice на closeDialogue; setVoiceVolume из applySettings.
- app/api/tts/route.ts (новый): z-ai-web-dev-sdk ТОЛЬКО в бэкенде; male→xiaochen, female→tongtong; wav 24 кГц; дисковый кэш db/tts-cache/sha1(voice|text).wav (X-TTS-Cache: hit/miss); таймаут SDK 45 с через Promise.race; runtime nodejs. Клиентский fetch с AbortSignal.timeout(30 с).
- quest.ts: setNode → speakLine(node.speaker, node.text); closeDialogue → stopVoice().
- Panels.tsx: SettingsPanel — тумблер «Голоса реплик (TTS)» + слайдер «Озвучка реплик»; секция УПРАВЛЕНИЕ: 19 ремап-строк с захватом клавиши (capture-фаза, Esc — отмена), автосвобождение конфликтов с тостом, кнопка «Сбросить», скролл max-h-72.
- SDK-инцидент: голос tongtong разово завис в next-server (1.9 GB RAM) — добавлены таймауты (45 с сервер/30 с клиент); через CLI все 7 голосов проверены рабочими на русском тексте.
- E2E (agent-browser, 2 батча; особенностью песочницы оказалось, что dev-сервер живёт только внутри одного Bash-вызова — сервер поднимался в начале батча):
  * Ремап: Настройки → УПРАВЛЕНИЕ (19 строк) → «Персонаж»→P (метка P, localStorage ["p"]) → Escape → p открывает ПЕРСОНАЖ → p закрывает → «Сбросить» (метка C, ["c"]) → c работает.
  * TTS: ПРОДОЛЖИТЬ → диалог с Дорном (trainer_dorn) → POST /api/tts 200 → Audio(blob) создан (__ap.n=1) → WAV 1.15 MB в кэше; тумблер OFF → диалог с Гримом без нового Audio (n=1) → ON обратно.
  * Тема босса: syncUi — прямой вызов (в headless rAF лагает): hp 80% → on:true level 0; 40% → level 1; 10% → level 2; выход → on:false, сброс. Боссбар HUD отрисован (скрин).
  * Скриншоты: титул, диалог с озвучкой, настройки, боссбар; errors пусто, консоль чистая; tsc + lint зелёные.
- README.md → v1.1 (структура + статус), GDD 04 §4.3 — пометка «Реализовано в v1.1».

Stage Summary:
- Бэклог после v1.0 закрыт полностью: озвучка (2 голоса, кэш, тумблер/громкость), адаптивные босс-темы (3 фазы + стингеры), ремап клавиш (19 действий, RU-раскладка, конфликты, сброс).
- Версия проекта: v1.1. Dev-сервер песочницы не переживает Bash-вызов — для E2E поднимать внутри батча (worklog-заметка).
- Следующие кандидаты: локализация, озвучка боевых реплик, ремастер портретов.
