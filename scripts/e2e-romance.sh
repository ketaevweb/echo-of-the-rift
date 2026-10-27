#!/usr/bin/env bash
# E2E v1.5 «Романсы» — один батч: сервер + браузер в одном вызове
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

# 2. Романсовые PNG должны отдаваться 200
say "CHECK 2 ROMANCE PORTRAITS HTTP"
for n in kaya-romance asher-romance; do
  c=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/images/portraits/$n.png")
  [ "$c" != "200" ] && echo "BAD $n -> $c"
done
echo "romance portraits HTTP 200"

# 3. Браузер: титул + новая игра
say "BROWSER: TITLE"
agent-browser set viewport 1280 800 >/dev/null
agent-browser open "http://localhost:$PORT" >/dev/null
agent-browser wait --load networkidle >/dev/null 2>&1
sleep 2
agent-browser eval "document.body.innerText.includes('ВЕРСИЯ 1.5') ? 'TITLE_OK' : 'TITLE_BAD'"
agent-browser find role button click --name "НАЧАТЬ ПУТЬ" >/dev/null
sleep 3
agent-browser eval "!!window.__echoEngine ? 'ENGINE_OK' : 'ENGINE_MISSING'"

# 4. Кайя: одобрение 65 → флирт → признание → флаг → романсовый портрет
say "ROMANCE: KAYA"
agent-browser eval "window.__echoEngine.companionIds.kaya = true; window.__echoEngine.approval.kaya = 65; 'set'"
agent-browser eval "window.__echoEngine.openDialogue('stones_kaya'); 'opened'"
sleep 1.5
echo -n "flirt option visible: "
agent-browser eval "document.body.innerText.includes('не просто отряд') ? 'FLIRT_VISIBLE' : 'FLIRT_HIDDEN'"
agent-browser eval "window.__echoEngine.chooseOption(0); 'picked'"
sleep 1
echo -n "confession node: "
agent-browser eval "document.body.innerText.includes('Я твоя?') ? 'OFFER_OK' : 'OFFER_MISSING'"
agent-browser eval "window.__echoEngine.chooseOption(0); 'accepted'"
sleep 1
echo -n "flag set: "
agent-browser eval "window.__echoEngine.flags.romance_kaya === true ? 'FLAG_OK' : 'FLAG_MISSING'"
agent-browser eval "window.__echoEngine.closeDialogue(); 'closed'"
sleep 0.5
agent-browser eval "window.__echoEngine.openDialogue('stones_kaya'); 'reopened'"
sleep 1.5
echo -n "romance_chat node + portrait: "
agent-browser eval "(() => { const t=document.body.innerText.includes('не заставляй его остывать'.toUpperCase()) || document.body.innerText.toLowerCase().includes('не заставляй его остывать'); const im=document.querySelector('img[alt=\"Портрет: Кайя\"]'); const src=im?im.getAttribute('src'):'none'; return JSON.stringify({node:t, src, loaded: im? im.naturalWidth>0 : false}); })()"

# 5. «Одновременно — нет»: у Ашера флирт скрыт при активном романс Кайи
say "EXCLUSIVE: ASHER OFFER HIDDEN"
agent-browser eval "(() => { const e=window.__echoEngine; for (const id of ['rubezh_ship','rubezh_signal','rubezh_rings','rubezh_crew']) { e.quests[id].stage=5; e.quests[id].done=true } e.flags.asherLoyal=true; e.closeDialogue(); e.openDialogue('rubezh_asher'); return 'opened' })()"
sleep 1.5
agent-browser eval "document.body.innerText.includes('вернулся сюда не за квестом') ? 'EXCLUSIVITY_FAIL (offer visible)' : 'EXCLUSIVITY_OK (offer hidden)'"
agent-browser eval "window.__echoEngine.closeDialogue(); 'closed'"

# 6. Ашер: флаг романс → бытовой узел + романсовый портрет
say "PORTRAIT: ASHER ROMANCE"
agent-browser eval "window.__echoEngine.flags.romance_asher = true; window.__echoEngine.openDialogue('rubezh_asher'); 'opened'"
sleep 1.5
agent-browser eval "(() => { const t=document.body.innerText.toLowerCase().includes('костёр у трапа горит'); const im=document.querySelector('img[alt=\"Портрет: Ашер\"]'); const src=im?im.getAttribute('src'):'none'; return JSON.stringify({node:t, src, loaded: im? im.naturalWidth>0 : false}); })()"

# 7. Скриншот
say "SCREENSHOT"
mkdir -p .ref
agent-browser screenshot /home/z/my-project/.ref/v15-01-romance-kaya.png >/dev/null && echo "saved"

# 8. Ошибки
say "ERRORS / CONSOLE"
agent-browser errors
agent-browser console 2>/dev/null | tail -25 > /tmp/ab_console.txt
if rg -qi "error" /tmp/ab_console.txt; then echo "CONSOLE ERRORS:"; cat /tmp/ab_console.txt | head -10; else echo "console: no errors"; fi

say "STOP DEV SERVER"
kill "$DEV_PID" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true
sleep 1
echo "E2E DONE"
