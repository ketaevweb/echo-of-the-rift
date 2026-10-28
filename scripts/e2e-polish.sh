#!/usr/bin/env bash
# E2E v1.9→2.1 «Полировка» (версия обновлена в v2.0) — один батч: сервер + браузер в одном вызове.
# Проверяет находки плейтеста:
#   1. dev-бейдж Next.js скрыт (devIndicators: false) — не перекрывает HUD;
#   2. единая версия: титул/настройки/титры = ВЕРСИЯ 2.4 (RU и EN);
#   3. чипы статов снаряжения: «урон N» у оружия, «КД N» у брони (RU/EN);
#   4. метка магазина динамическая («ТОВАР: ГРИМ» / «WARES: GRIM»);
#   5. тултипы описаний на строках магазина/сумки (title-атрибут);
#   6. трекер квеста кликабелен — открывает журнал;
#   7. колонка покупок прокручивается (max-h + overflow);
#   8. консоль без ошибок.
set -u
cd /home/z/my-project

PORT=3000
say() { echo "=== $* ==="; }

pkill -f "next dev" 2>/dev/null && sleep 2

say "START DEV SERVER"
nohup bun run dev > dev.log 2>&1 &
DEV_PID=$!
UP=0
for i in $(seq 1 60); do
  sleep 2
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT" 2>/dev/null || true)
  if [ "$code" = "200" ]; then UP=1; break; fi
done
if [ "$UP" != "1" ]; then echo "SERVER FAILED TO START"; tail -20 dev.log; exit 1; fi
echo "server up (pid $DEV_PID)"

mkdir -p .ref

# 1. Титул: версия 2.1, dev-бейдж скрыт
say "TITLE: VERSION + BADGE HIDDEN"
agent-browser eval "localStorage.removeItem('echo-rift-locale'); localStorage.removeItem('echo-rift-settings'); 'reset'" >/dev/null
agent-browser open "http://localhost:$PORT" >/dev/null
agent-browser wait --load networkidle >/dev/null 2>&1
sleep 2
echo -n "title ru: "
agent-browser eval "document.body.innerText.includes('ВЕРСИЯ 2.4') ? 'TITLE_OK' : 'TITLE_BAD'"
echo -n "badge hidden: "
agent-browser eval "(() => { const p=document.querySelector('nextjs-portal'); if(!p) return 'BADGE_HIDDEN'; const r=p.getBoundingClientRect(); return (r.width===0&&r.height===0) ? 'BADGE_HIDDEN' : 'BADGE_VISIBLE'; })()"

# 2. Новая игра
say "NEW GAME"
agent-browser eval "(() => { [...document.querySelectorAll('button')].find(b=>b.textContent.includes('НОВАЯ ИГРА'))?.click(); return 'ok'; })()" >/dev/null
sleep 1
agent-browser eval "(() => { [...document.querySelectorAll('button')].find(b=>/ДА, НАЧАТЬ ЗАНОВО/.test(b.textContent))?.click(); return 'ok'; })()" >/dev/null
sleep 1
agent-browser eval "(() => { [...document.querySelectorAll('button')].find(b=>b.textContent.includes('Дозорный'))?.click(); return 'ok'; })()" >/dev/null
sleep 1
agent-browser eval "(() => { [...document.querySelectorAll('button')].find(b=>b.textContent.includes('НАЧАТЬ ПУТЬ'))?.click(); return 'ok'; })()" >/dev/null
sleep 4
echo -n "engine: "
agent-browser eval "!!window.__echoEngine ? 'ENGINE_OK' : 'ENGINE_MISSING'"
echo -n "badge in game still hidden: "
agent-browser eval "(() => { const p=document.querySelector('nextjs-portal'); if(!p) return 'BADGE_HIDDEN'; const r=p.getBoundingClientRect(); return (r.width===0&&r.height===0) ? 'BADGE_HIDDEN' : 'BADGE_VISIBLE'; })()"

# 3. Чипы статов в инвентаре (экипированное оружие)
say "INVENTORY STAT CHIPS"
agent-browser eval "window.__echoEngine.openPanel('inv'); 'ok'" >/dev/null
sleep 1
echo -n "equipped weapon chip: "
agent-browser eval "document.body.innerText.includes('урон 4') ? 'CHIP_OK' : 'CHIP_BAD'"
echo -n "buy armor: "
agent-browser eval "(() => { const e=window.__echoEngine; e.gold=500; e.buyItem('armor_leather'); return 'ok'; })()" >/dev/null
sleep 0.5
echo -n "bag armor chip: "
agent-browser eval "document.body.innerText.includes('КД 2') ? 'CHIP_OK' : 'CHIP_BAD'"
echo -n "row tooltip: "
agent-browser eval "[...document.querySelectorAll('div[title]')].some(d=>d.title.includes('Простая броня следопыта')) ? 'TOOLTIP_OK' : 'TOOLTIP_BAD'"

# 4. Трекер квеста → журнал
say "TRACKER CLICK OPENS JOURNAL"
agent-browser eval "window.__echoEngine.closePanel?.(); 'ok'" >/dev/null
sleep 0.5
agent-browser eval "(() => { const tr=[...document.querySelectorAll('div[title]')].find(d=>d.title.includes('журнал')); tr?.click(); return tr ? 'clicked' : 'TRACKER_NOT_FOUND'; })()" >/dev/null
sleep 1
echo -n "journal opened: "
agent-browser eval "document.body.innerText.includes('ЖУРНАЛ') ? 'JOURNAL_OK' : 'JOURNAL_BAD'"

# 5. Магазин: динамическая метка + тултипы + скролл
say "SHOP LABEL AND TOOLTIPS"
agent-browser eval "(() => { const e=window.__echoEngine; e.closePanel?.(); const g=e.entities.find(x=>x.name==='Грим'); e.player.pos.x=g.pos.x+25; e.player.pos.y=g.pos.y+25; e.openDialogue(g.npc.dialogue); return 'ok'; })()" >/dev/null
sleep 1.5
agent-browser eval "(() => { [...document.querySelectorAll('button')].find(x=>x.textContent.includes('Покажи'))?.click(); return 'ok'; })()" >/dev/null
sleep 1
echo -n "dynamic label: "
agent-browser eval "document.body.innerText.includes('ТОВАР: ГРИМ') && !document.body.innerText.includes('ТОВАР ГРИМА') ? 'LABEL_OK' : 'LABEL_BAD'"
echo -n "shop chips: "
agent-browser eval "document.body.innerText.includes('урон 7') && document.body.innerText.includes('КД 2') && document.body.innerText.includes('урон 11') ? 'CHIPS_OK' : 'CHIPS_BAD'"
echo -n "shop tooltips: "
agent-browser eval "[...document.querySelectorAll('div[title]')].some(d=>d.title.includes('Ковка Хеймарсхолла')) ? 'TOOLTIP_OK' : 'TOOLTIP_BAD'"
echo -n "buy column scroll: "
agent-browser eval "(() => { const heads=[...document.querySelectorAll('p')].find(p=>p.textContent.trim()==='ТОВАР: ГРИМ'); const col=heads?.nextElementSibling; return col && /overflow-y-auto/.test(col.className) && /max-h-80/.test(col.className) ? 'SCROLL_OK' : 'SCROLL_BAD'; })()"

# 6. Настройки: подзаголовок v2.0, подсказка без версии
say "SETTINGS SUBTITLE"
agent-browser eval "(() => { const e=window.__echoEngine; e.closePanel?.(); e.openPanel('pause'); return 'ok'; })()" >/dev/null
sleep 0.5
agent-browser eval "(() => { [...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='Настройки')?.click(); return 'ok'; })()" >/dev/null
sleep 1
echo -n "subtitle v2.0: "
agent-browser eval "document.body.innerText.includes('Эхо Разлома · v2.4') ? 'SUB_OK' : 'SUB_BAD'"
echo -n "hint versionless: "
agent-browser eval "(() => { const t=document.body.innerText; return t.includes('озвучиваются на языке интерфейса.') && !t.includes('интерфейса (v') ? 'HINT_OK' : 'HINT_BAD'; })()"

# 7. Титры: версия 2.1 (строка v2.0)
say "CREDITS VERSION"
agent-browser eval "(() => { const e=window.__echoEngine; e.closePanel?.(); e.openPanel('pause'); return 'ok'; })()" >/dev/null
sleep 0.5
agent-browser eval "(() => { [...document.querySelectorAll('button')].find(x=>x.textContent.includes('Выйти в главное меню'))?.click(); return 'ok'; })()" >/dev/null
sleep 1.5
agent-browser eval "(() => { [...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='ТИТРЫ')?.click(); return 'ok'; })()" >/dev/null
sleep 1
echo -n "credits line: "
agent-browser eval "document.body.innerText.includes('ВЕРСИЯ 2.4 · МОБИЛЬНОЕ УПРАВЛЕНИЕ') ? 'CREDITS_OK' : 'CREDITS_BAD'"

# 8. EN: словарные записи полировки
say "EN DICTIONARY"
agent-browser eval "(() => { [...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='EN')?.click(); return 'ok'; })()" >/dev/null
sleep 1.5
echo -n "en title: "
agent-browser eval "document.body.innerText.includes('VERSION 2.4') ? 'TITLE_EN_OK' : 'TITLE_EN_BAD'"
agent-browser eval "(() => { [...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='ТИТРЫ' || x.textContent.trim()==='CREDITS')?.click(); return 'ok'; })()" >/dev/null
sleep 1
echo -n "en credits: "
agent-browser eval "document.body.innerText.includes('VERSION 2.4 · TOUCH CONTROLS') ? 'CREDITS_EN_OK' : 'CREDITS_EN_BAD'"
agent-browser screenshot /home/z/my-project/.ref/v19-30-credits-en.png >/dev/null && echo "shot saved"

# 9. Консоль
say "CONSOLE"
agent-browser errors | tail -3
echo "E2E_POLISH_DONE"
