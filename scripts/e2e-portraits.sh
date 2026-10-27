#!/usr/bin/env bash
# E2E v1.2 «Ремастер портретов» — один батч: сервер + браузер в одном вызове
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

# 2. Все 24 PNG должны отдаваться 200
say "CHECK 24 PORTRAITS HTTP"
FAIL=0
for f in public/images/portraits/*.png; do
  n=$(basename "$f")
  c=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/images/portraits/$n")
  [ "$c" != "200" ] && { echo "BAD $n -> $c"; FAIL=1; }
done
[ "$FAIL" = "0" ] && echo "all portraits HTTP 200"

# 3. Браузер: титул
say "BROWSER: TITLE"
agent-browser set viewport 1280 800 >/dev/null
agent-browser open "http://localhost:$PORT" >/dev/null
agent-browser wait --load networkidle >/dev/null 2>&1
sleep 2
agent-browser eval "document.body.innerText.includes('ВЕРСИЯ 1.2') ? 'TITLE_OK' : 'TITLE_BAD'"

# 4. Новая игра
say "BROWSER: NEW GAME"
agent-browser find role button click --name "НАЧАТЬ ПУТЬ" >/dev/null
sleep 3
agent-browser eval "!!window.__echoEngine ? 'ENGINE_OK' : 'ENGINE_MISSING'"

# 5. Диалоги: портрет-<img> должен иметь naturalWidth > 0
IMGCHK='(() => { const im=document.querySelector("img[alt^=\"Портрет\"]"); if(!im) return "NO_IMG"; return im.naturalWidth>0 ? ("IMG_OK "+im.getAttribute("alt")+" "+im.currentSrc.split("/").pop()) : "IMG_NOT_LOADED"; })()'
dlg() { # $1 treeId, $2 label
  agent-browser eval "window.__echoEngine.openDialogue('$1'); 'opened'" >/dev/null
  sleep 1.2
  echo -n "$2: "
  agent-browser eval "$IMGCHK"
  agent-browser eval "window.__echoEngine.closeDialogue(); 'closed'" >/dev/null
  sleep 0.4
}
say "BROWSER: DIALOGUE PORTRAITS"
dlg elder_bjorn      "Бьорн"
dlg trainer_dorn     "Дорн"
dlg alchemist_alra   "Альра"
dlg stones_kaya      "Кайя"
dlg mara_meira       "Мейра"
dlg judgment_devourer "Пожиратель Эха"

# 6. SVG-фолбэк: объектный спикер (Доска объявлений) — img быть НЕ должно
say "BROWSER: SVG FALLBACK (notice board)"
agent-browser eval "window.__echoEngine.openDialogue('notice_board'); 'opened'" >/dev/null
sleep 1
agent-browser eval 'document.querySelector("img[alt^=\"Портрет\"]") ? "FALLBACK_BAD (img found)" : "FALLBACK_OK (svg)"'
agent-browser eval "window.__echoEngine.closeDialogue(); 'closed'" >/dev/null

# 7. Скриншоты
say "SCREENSHOTS"
agent-browser eval "window.__echoEngine.openDialogue('elder_bjorn'); 'opened'" >/dev/null
sleep 1.5
agent-browser screenshot .ref/v12-01-dialogue-bjorn.png >/dev/null && echo "bjorn saved"
agent-browser eval "window.__echoEngine.closeDialogue(); 'closed'" >/dev/null
agent-browser eval "window.__echoEngine.openDialogue('judgment_devourer'); 'opened'" >/dev/null
sleep 1.5
agent-browser screenshot .ref/v12-02-dialogue-devourer.png >/dev/null && echo "devourer saved"
agent-browser eval "window.__echoEngine.closeDialogue(); 'closed'" >/dev/null

# 8. Ошибки страницы и консоли
say "ERRORS / CONSOLE"
agent-browser errors
agent-browser console 2>/dev/null | tail -20 > /tmp/ab_console.txt
if rg -qi "error" /tmp/ab_console.txt; then echo "CONSOLE ERRORS:"; cat /tmp/ab_console.txt | head -8; else echo "console: no errors"; fi

say "DONE"
kill $DEV_PID 2>/dev/null
agent-browser close >/dev/null 2>&1
echo "cleanup ok"
