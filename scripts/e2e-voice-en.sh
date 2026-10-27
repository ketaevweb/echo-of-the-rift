#!/usr/bin/env bash
# E2E v1.8 «Озвучка EN» — один батч: сервер + браузер в одном вызове.
# Проверяет: диалоговый TTS в EN-локали уходит на /api/tts с EN-текстом,
# EN-барки (WAV /audio/combat/en/) существуют и выбираются по локали,
# субтитры барок (__echoBark.last.text) локале-зависимы; консоль чиста.
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

# 0. Статика EN-барок
say "STATIC EN WAV"
echo -n "http en wav: "
curl -s -o /dev/null -w "%{http_code} %{content_type}\n" "http://localhost:$PORT/audio/combat/en/kaya-synergy-1.wav"
echo -n "en files count: "
ls public/audio/combat/en/*.wav 2>/dev/null | wc -l

# 1. RU: база — барки играют RU (канон)
say "RU: BARK CANON"
agent-browser set viewport 1280 800 >/dev/null
agent-browser open "http://localhost:$PORT" >/dev/null
agent-browser wait --load networkidle >/dev/null 2>&1
sleep 2
agent-browser eval "localStorage.removeItem('echo-rift-locale'); 'reset'" >/dev/null
agent-browser open "http://localhost:$PORT" >/dev/null
agent-browser wait --load networkidle >/dev/null 2>&1
sleep 2
echo -n "ru title v18: "
agent-browser eval "document.body.innerText.includes('ВЕРСИЯ 1.8') ? 'TITLE_RU_OK' : 'TITLE_RU_BAD'"
agent-browser eval "(() => { const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim().includes('НАЧАТЬ ПУТЬ')); b.click(); return 'clicked'; })()" >/dev/null
sleep 4
echo -n "engine: "
agent-browser eval "!!window.__echoEngine ? 'ENGINE_OK' : 'ENGINE_MISSING'"
echo -n "bark ru (canon): "
agent-browser eval "(() => { const B=window.__echoBark; B.reset(); B.bark('synergy',{companionId:'kaya'}); const l=B.last||{}; return JSON.stringify({ id: l.id, ru: l.text==='Мороз и пламя!' || l.text==='Славный взрыв, Смотритель!' }); })()"

# 2. EN: диалоговый TTS с EN-текстом + EN-барки
say "EN: DIALOGUE TTS + BARKS"
TTS_BEFORE=$(rg -c "POST /api/tts" dev.log 2>/dev/null || echo 0)
agent-browser eval "localStorage.setItem('echo-rift-locale','en'); 'set'" >/dev/null
agent-browser open "http://localhost:$PORT" >/dev/null
agent-browser wait --load networkidle >/dev/null 2>&1
sleep 2
agent-browser eval "(() => { const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim().includes('BEGIN THE PATH')); b.click(); return 'clicked'; })()" >/dev/null
sleep 4
agent-browser eval "window.__echoEngine.companionIds.kaya = true; 'kaya-set'" >/dev/null
agent-browser eval "window.__echoEngine.openDialogue('stones_kaya'); 'opened'" >/dev/null
sleep 5 # TTS-запрос уходит асинхронно
TTS_AFTER=$(rg -c "POST /api/tts" dev.log 2>/dev/null || echo 0)
echo "tts calls: before=$TTS_BEFORE after=$TTS_AFTER"
if [ "$TTS_AFTER" -gt "$TTS_BEFORE" ]; then echo "dialogue tts en: FIRED"; else echo "dialogue tts en: NOT FIRED"; fi
agent-browser eval "window.__echoEngine.closeDialogue(); 'closed'" >/dev/null
echo -n "bark en: "
agent-browser eval "(() => { const B=window.__echoBark; B.reset(); B.bark('synergy',{companionId:'kaya'}); const l=B.last||{}; return JSON.stringify({ id: l.id, en: l.text==='Frost and flame!' || l.text==='A fine blast, Watcher!' }); })()"
echo -n "bark en boss: "
agent-browser eval "(() => { const B=window.__echoBark; B.reset(); B.bossSpawnBark('horde_chief','torvald'); const l=B.last||{}; return JSON.stringify({ id: l.id, en: l.text==='The meat walked in on its own!' || l.text==='The Seed will devour your scream!' }); })()"
agent-browser eval "window.__echoBark.reset(); 'reset'" >/dev/null

# 3. Ошибки / консоль
say "ERRORS / CONSOLE"
agent-browser errors
agent-browser console 2>/dev/null | tail -25 > /tmp/ab_console.txt
if rg -qi "error" /tmp/ab_console.txt; then echo "CONSOLE ERRORS:"; head -10 /tmp/ab_console.txt; else echo "console: no errors"; fi

# 4. Возврат локали ru
agent-browser open "http://localhost:$PORT" >/dev/null
sleep 1
agent-browser eval "localStorage.setItem('echo-rift-locale','ru'); 'reset'" >/dev/null

say "STOP DEV SERVER"
kill "$DEV_PID" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true
sleep 1
echo "E2E DONE"
