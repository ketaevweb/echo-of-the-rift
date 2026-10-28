#!/usr/bin/env bash
# E2E v1.6 «Локализация I» — один батч: сервер + браузер в одном вызове
# (в песочнице dev-сервер не переживает завершение Bash-вызова).
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

# 2. Титул: RU по умолчанию, v1.6
say "BROWSER: TITLE RU DEFAULT"
agent-browser set viewport 1280 800 >/dev/null
agent-browser open "http://localhost:$PORT" >/dev/null
agent-browser wait --load networkidle >/dev/null 2>&1
sleep 2
# сброс локали — чистый прогон (прошлые сессии могли оставить en)
agent-browser eval "localStorage.removeItem('echo-rift-locale'); localStorage.removeItem('echo-rift-settings'); 'reset'" >/dev/null
agent-browser open "http://localhost:$PORT" >/dev/null
agent-browser wait --load networkidle >/dev/null 2>&1
sleep 2
echo -n "ru title: "
agent-browser eval "document.body.innerText.includes('ВЕРСИЯ 2.0') && document.body.innerText.includes('НАЧАТЬ ПУТЬ') ? 'RU_OK' : 'RU_BAD'"

# 3. Переключение EN на титуле
say "SWITCH TO EN (title footer)"
agent-browser eval "(() => { const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='EN'); b.click(); return 'clicked'; })()" >/dev/null
sleep 1.5
echo -n "en title: "
agent-browser eval "document.body.innerText.includes('ECHO OF THE RIFT') && document.body.innerText.includes('BEGIN THE PATH') && document.body.innerText.includes('WATCHER ORIGIN') ? 'EN_OK' : 'EN_BAD'"
echo -n "persisted: "
agent-browser eval "localStorage.getItem('echo-rift-locale')"
mkdir -p .ref
agent-browser screenshot /home/z/my-project/.ref/v16-01-title-en.png >/dev/null && echo "shot saved"

# 4. Персистентность: перезагрузка сохраняет EN
say "RELOAD: LOCALE PERSISTS"
agent-browser open "http://localhost:$PORT" >/dev/null
agent-browser wait --load networkidle >/dev/null 2>&1
sleep 2
echo -n "after reload: "
agent-browser eval "document.body.innerText.includes('ECHO OF THE RIFT') ? 'PERSIST_OK' : 'PERSIST_BAD'"

# 5. Новая игра в EN: HUD, отряд, зоны
say "NEW GAME IN EN"
agent-browser eval "(() => { const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim().includes('BEGIN THE PATH')); b.click(); return 'clicked'; })()" >/dev/null
sleep 4
echo -n "engine: "
agent-browser eval "!!window.__echoEngine ? 'ENGINE_OK' : 'ENGINE_MISSING'"
echo -n "hud en (zone + watcher + tracker): "
agent-browser eval "(() => { const t=document.body.innerText; return JSON.stringify({ zone: t.includes('HEIMHALL AND OUTSKIRTS'), watcher: t.includes('Watcher'), main: t.includes('Whisper of the Rift') }); })()"
echo -n "party en (spawn companions): "
agent-browser eval "(() => { const e=window.__echoEngine; e.spawnCompanion('kaya'); e.spawnCompanion('torvald'); return 'spawned'; })()" >/dev/null
sleep 2
agent-browser eval "(() => { const t=document.body.innerText; return JSON.stringify({ kaya: t.includes('Kaya'), torvald: t.includes('Torvald'), follow: t.includes('Follow') }); })()"

# 6. Панели в EN
say "PANELS IN EN"
agent-browser eval "window.__echoEngine.openPanel('char'); 'opened'"
sleep 1
echo -n "char panel: "
agent-browser eval "(() => { const t=document.body.innerText; return JSON.stringify({ title: t.includes('CHARACTER'), attrs: t.includes('ATTRIBUTES'), might: t.includes('Might'), equip: t.includes('EQUIPMENT') }); })()"
agent-browser eval "window.__echoEngine.closePanel(); window.__echoEngine.openPanel('inv'); 'opened'"
sleep 1
echo -n "inv panel: "
agent-browser eval "(() => { const t=document.body.innerText; return JSON.stringify({ title: t.includes('INVENTORY'), bag: t.includes('BAG'), potion: t.includes('Healing potion') }); })()"
agent-browser eval "window.__echoEngine.closePanel(); window.__echoEngine.openPanel('journal'); 'opened'"
sleep 1
echo -n "journal: "
agent-browser eval "(() => { const t=document.body.innerText; return JSON.stringify({ quests: t.includes('Quests'), bestiary: t.includes('Bestiary'), main: t.includes('Whisper of the Rift'), stage: t.includes('Talk to Elder Bjorn in Heimhall') }); })()"
agent-browser screenshot /home/z/my-project/.ref/v16-02-journal-en.png >/dev/null && echo "shot saved"
agent-browser eval "window.__echoEngine.closePanel(); window.__echoEngine.openPanel('settings'); 'opened'"
sleep 1
echo -n "settings + lang row: "
agent-browser eval "(() => { const t=document.body.innerText; return JSON.stringify({ title: t.includes('SETTINGS'), lang: t.includes('ЯЗЫК / LANGUAGE'), ru: t.includes('Русский'), kb: t.includes('CONTROLS') }); })()"

# 7. Обратное переключение EN→RU в живой игре
say "SWITCH BACK TO RU IN GAME"
agent-browser eval "(() => { const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='Русский'); b.click(); return 'clicked'; })()" >/dev/null
sleep 1.5
echo -n "settings ru: "
agent-browser eval "(() => { const t=document.body.innerText; return JSON.stringify({ title: t.includes('НАСТРОЙКИ'), gfx: t.includes('ГРАФИКА'), hint: t.includes('озвучиваются на языке интерфейса') }); })()"
agent-browser eval "window.__echoEngine.closePanel(); 'closed'"
sleep 1.5
echo -n "hud ru: "
agent-browser eval "(() => { const t=document.body.innerText; return JSON.stringify({ zone: t.includes('ХЕЙМХОЛЛ И ОКРЕСТНОСТИ'), watcher: t.includes('Смотритель'), main: t.includes('Шёпот Разлома') }); })()"

# 8. Ошибки
say "ERRORS / CONSOLE"
agent-browser errors
agent-browser console 2>/dev/null | tail -25 > /tmp/ab_console.txt
if rg -qi "error" /tmp/ab_console.txt; then echo "CONSOLE ERRORS:"; head -10 /tmp/ab_console.txt; else echo "console: no errors"; fi

say "STOP DEV SERVER"
kill "$DEV_PID" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true
sleep 1
echo "E2E DONE"
