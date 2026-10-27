#!/usr/bin/env bash
set -u
cd /home/z/my-project
pkill -f "next dev" 2>/dev/null && sleep 2
nohup bun run dev > dev.log 2>&1 &
for i in $(seq 1 60); do sleep 2; c=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 || true); [ "$c" = "200" ] && break; done
echo "server up"
agent-browser set viewport 1280 800 >/dev/null
agent-browser open http://localhost:3000 >/dev/null
agent-browser wait --load networkidle >/dev/null 2>&1
sleep 2
agent-browser find role button click --name "НАЧАТЬ ПУТЬ" >/dev/null
for i in 1 2 3 4 5; do sleep 1; R=$(agent-browser eval "!!window.__echoEngine"); [ "$R" = "true" ] && break; done
echo "engine: $R"
agent-browser eval "window.__echoEngine.openDialogue('elder_bjorn'); 'ok'" >/dev/null
sleep 1.5
agent-browser screenshot /home/z/my-project/.ref/v12-01-dialogue-bjorn.png
agent-browser eval "window.__echoEngine.closeDialogue(); 'ok'" >/dev/null
agent-browser eval "window.__echoEngine.openDialogue('judgment_devourer'); 'ok'" >/dev/null
sleep 1.5
agent-browser screenshot /home/z/my-project/.ref/v12-02-dialogue-devourer.png
agent-browser eval "window.__echoEngine.closeDialogue(); 'ok'" >/dev/null
ls -la /home/z/my-project/.ref/v12-*.png
agent-browser close >/dev/null 2>&1
pkill -f "next dev" 2>/dev/null
echo done
