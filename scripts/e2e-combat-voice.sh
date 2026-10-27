#!/usr/bin/env bash
# E2E v1.4 «Озвучка боя» — один батч: сервер + браузер в одном вызове
# (в песочнице dev-сервер не переживает завершение Bash-вызова).
set -u
cd /home/z/my-project

PORT=3000
say() { echo "=== $* ==="; }

# 0. Убрать возможные старые процессы dev-сервера этого проекта
pkill -f "next dev" 2>/dev/null && sleep 2

# 1. Старт dev-сервера
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

# 2. Все 27 WAV должны отдаваться 200 + audio/wav
say "CHECK 27 COMBAT WAV HTTP"
FAIL=0
for f in public/audio/combat/*.wav; do
  n=$(basename "$f")
  c=$(curl -s -o /dev/null -w "%{http_code} %{content_type}" "http://localhost:$PORT/audio/combat/$n")
  case "$c" in "200 audio/"*) ;; *) echo "BAD $n -> $c"; FAIL=1;; esac
done
[ "$FAIL" = "0" ] && echo "all 27 combat wav HTTP 200 (audio/*)"

# 3. Браузер: титул
say "BROWSER: TITLE"
agent-browser set viewport 1280 800 >/dev/null
agent-browser open "http://localhost:$PORT" >/dev/null
agent-browser wait --load networkidle >/dev/null 2>&1
sleep 2
agent-browser eval "document.body.innerText.includes('ВЕРСИЯ 1.4') ? 'TITLE_OK' : 'TITLE_BAD'"

# 4. Новая игра
say "BROWSER: NEW GAME"
agent-browser find role button click --name "НАЧАТЬ ПУТЬ" >/dev/null
sleep 3
agent-browser eval "!!window.__echoEngine ? 'ENGINE_OK' : 'ENGINE_MISSING'"
agent-browser eval "!!window.__echoBark ? 'BARK_HOOK_OK' : 'BARK_HOOK_MISSING'"

# 5. Барки: пулы + кулдауны + идемпотентность спавна — ВСЁ в одном синхронном eval
# (каждый agent-browser eval — новый процесс ~2-3 c: межвызовные чеки врут)
say "BARKS: POOLS"
agent-browser eval "window.__echoBark.reset(); window.__echoBark.bark('synergy',{companionId:'kaya'}); JSON.stringify(window.__echoBark.last)"
agent-browser eval "window.__echoBark.reset(); window.__echoBark.bark('down',{companionId:'torvald'}); JSON.stringify(window.__echoBark.last)"
agent-browser eval "window.__echoBark.reset(); window.__echoBark.bark('lowhp',{companionId:'kaya'}); JSON.stringify(window.__echoBark.last)"
say "KILL (25% chance, до 15 попыток)"
agent-browser eval "(() => { for (let i=0;i<15;i++){ window.__echoBark.reset(); window.__echoBark.bark('kill',{companionId:'kaya'}); if (window.__echoBark.last && window.__echoBark.last.event==='kill') return 'KILL_OK after '+i; } return 'KILL_NEVER (p~3%)'; })()"
say "CD + SPAWN IDEMPOTENCY (один тик, syncUi не вмешается)"
agent-browser eval "(() => { const B=window.__echoBark; B.reset(); B.bark('synergy',{companionId:'kaya'}); const e1=B.last&&B.last.event; B.bark('lowhp',{companionId:'kaya'}); const e2=B.last&&B.last.event; const cdOk=(e1==='synergy'&&e2==='synergy'); B.bark('down',{companionId:'torvald'}); const dOk=B.last&&B.last.event==='down'; B.reset(); B.bossSpawnBark('horde_chief','torvald'); const s1=B.last&&B.last.id; B.bossSpawnBark('horde_chief','torvald'); const s2=B.last&&B.last.id; const spOk=(s1==='boss-gharz-1'&&s2===s1); return JSON.stringify({cdOk,downBypassOk:dOk,spawnIdempotentOk:spOk,s1,s2}); })()"
sleep 3
echo -n "playing flag: "; agent-browser eval "window.__echoBark.playing ? 'PLAYING' : 'not-playing (headless autoplay may block — info only)'"

# 6. Скриншот игрового мира
say "SCREENSHOT"
mkdir -p .ref
agent-browser screenshot /home/z/my-project/.ref/v14-01-combat-voice.png >/dev/null && echo "saved"

# 7. Ошибки страницы и консоли
say "ERRORS / CONSOLE"
agent-browser errors
agent-browser console 2>/dev/null | tail -25 > /tmp/ab_console.txt
if rg -qi "error" /tmp/ab_console.txt; then echo "CONSOLE ERRORS:"; cat /tmp/ab_console.txt | head -10; else echo "console: no errors"; fi

# 8. Останов сервера
say "STOP DEV SERVER"
kill "$DEV_PID" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true
sleep 1
echo "E2E DONE"
