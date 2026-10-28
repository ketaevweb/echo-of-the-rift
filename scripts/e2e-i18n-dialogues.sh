#!/usr/bin/env bash
# E2E v1.7 «Локализация II» — диалоги EN. Один батч: сервер + браузер в одном вызове.
# Проверяет: RU-диалог по умолчанию → EN-диалог после переключения (текст/спикер/вариант),
# портретный арт НЕ сломан ключами арта (сырые RU-имена), консоль чиста.
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

# 1. RU: титул v1.7 → новая игра → диалог доски объявлений на русском
say "RU: TITLE + GAME + DIALOGUE"
agent-browser set viewport 1280 800 >/dev/null
agent-browser open "http://localhost:$PORT" >/dev/null
agent-browser wait --load networkidle >/dev/null 2>&1
sleep 2
agent-browser eval "localStorage.removeItem('echo-rift-locale'); 'reset'" >/dev/null
agent-browser open "http://localhost:$PORT" >/dev/null
agent-browser wait --load networkidle >/dev/null 2>&1
sleep 2
echo -n "ru title: "
agent-browser eval "document.body.innerText.includes('ВЕРСИЯ 1.9') ? 'TITLE_RU_OK' : 'TITLE_RU_BAD'"
agent-browser eval "(() => { const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim().includes('НАЧАТЬ ПУТЬ')); b.click(); return 'clicked'; })()" >/dev/null
sleep 4
echo -n "engine: "
agent-browser eval "!!window.__echoEngine ? 'ENGINE_OK' : 'ENGINE_MISSING'"
agent-browser eval "window.__echoEngine.openDialogue('notice_board'); 'opened'" >/dev/null
sleep 1.5
echo -n "dialogue ru: "
agent-browser eval "(() => { const t=document.body.innerText; return JSON.stringify({ text: t.includes('Топы уносят скот'), speaker: t.includes('Доска объявлений'), choice: t.includes('Отойти.') }); })()"
agent-browser screenshot /home/z/my-project/.ref/v17-01-dialogue-ru.png >/dev/null && echo "shot ru saved"
agent-browser eval "window.__echoEngine.closeDialogue(); 'closed'" >/dev/null

# 2. EN: перезагрузка с locale=en → тот же диалог на английском
say "EN: RELOAD + DIALOGUE"
agent-browser eval "localStorage.setItem('echo-rift-locale','en'); 'set'" >/dev/null
agent-browser open "http://localhost:$PORT" >/dev/null
agent-browser wait --load networkidle >/dev/null 2>&1
sleep 2
echo -n "en title: "
agent-browser eval "document.body.innerText.includes('VERSION 1.9') ? 'TITLE_EN_OK' : 'TITLE_EN_BAD'"
echo -n "hydration (no issue badge): "
agent-browser eval "(() => { const p=document.querySelector('nextjs-portal'); const sr=p&&p.shadowRoot; if(!sr) return 'HYDRATION_OK'; /* v1.9: портал может отсутствовать */ const badge=[...sr.querySelectorAll('button')].some(b=>((b.getAttribute('aria-label')||'')+(b.textContent||'')).toLowerCase().includes('issue')); return badge ? 'ISSUE_BADGE' : 'HYDRATION_OK'; })()"
agent-browser eval "(() => { const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim().includes('BEGIN THE PATH')); b.click(); return 'clicked'; })()" >/dev/null
sleep 4
echo -n "engine en: "
agent-browser eval "!!window.__echoEngine ? 'ENGINE_OK' : 'ENGINE_MISSING'"
agent-browser eval "window.__echoEngine.openDialogue('notice_board'); 'opened'" >/dev/null
sleep 1.5
echo -n "dialogue en: "
agent-browser eval "(() => { const t=document.body.innerText; return JSON.stringify({ text: t.includes('The brood carries off livestock'), speaker: t.includes('Notice Board'), choice: t.includes('Step away.') }); })()"
agent-browser screenshot /home/z/my-project/.ref/v17-02-dialogue-en.png >/dev/null && echo "shot en saved"

# 3. Портрет в EN: ключ арта — сырое RU-имя, PNG грузится, имя спикера переведено
say "PORTRAIT IN EN (raw-key regression guard)"
agent-browser eval "window.__echoEngine.closeDialogue(); window.__echoEngine.companionIds.kaya = true; window.__echoEngine.openDialogue('stones_kaya'); 'opened'" >/dev/null
sleep 2
echo -n "portrait en (joined_chat branch): "
agent-browser eval "(() => { const t=document.body.innerText; const im=document.querySelector('img[src=\"/images/portraits/kaya.png\"]'); return JSON.stringify({ speaker: t.includes('Kaya'), text: t.includes('Lead on, Watcher'), choice: t.includes(\"Let's move.\"), imgLoaded: !!im && im.naturalWidth > 0 }); })()"
agent-browser eval "window.__echoEngine.closeDialogue(); 'closed'" >/dev/null

# 4. Ошибки / консоль
say "ERRORS / CONSOLE"
agent-browser errors
agent-browser console 2>/dev/null | tail -25 > /tmp/ab_console.txt
if rg -qi "error" /tmp/ab_console.txt; then echo "CONSOLE ERRORS:"; head -10 /tmp/ab_console.txt; else echo "console: no errors"; fi

# 5. Возврат локали ru для чистоты следующих прогонов
agent-browser open "http://localhost:$PORT" >/dev/null
sleep 1
agent-browser eval "localStorage.setItem('echo-rift-locale','ru'); 'reset'" >/dev/null

say "STOP DEV SERVER"
kill "$DEV_PID" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true
sleep 1
echo "E2E DONE"
