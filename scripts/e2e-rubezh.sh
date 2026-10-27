#!/usr/bin/env bash
# E2E Фаза 6.5 «Внешний Рубеж» (ME2) — один батч: сервер + браузер
set -u
cd /home/z/my-project
pkill -f "next dev" 2>/dev/null && sleep 2
nohup bun run dev > dev.log 2>&1 &
UP=0
for i in $(seq 1 60); do sleep 2; c=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 || true); [ "$c" = "200" ] && { UP=1; break; }; done
[ "$UP" != "1" ] && { echo "SERVER FAILED"; tail -20 dev.log; exit 1; }
echo "server up"

agent-browser set viewport 1280 800 >/dev/null
agent-browser open http://localhost:3000 >/dev/null
agent-browser wait --load networkidle >/dev/null 2>&1
sleep 2
agent-browser eval "localStorage.setItem('echo-rift-settings', JSON.stringify({ voiceOn: false, voiceVol: 0 }))" >/dev/null
agent-browser find role button click --name "НАЧАТЬ ПУТЬ" >/dev/null
for i in 1 2 3 4 5 6; do sleep 1; R=$(agent-browser eval "!!window.__echoEngine"); [ "$R" = "true" ] && break; done
echo "engine: $R"

E() { agent-browser eval "$1"; }

echo "=== 1. TRAVEL TO RUBEZH ==="
E "window.__echoEngine.travelTo('rubezh'); 'travel'" >/dev/null
sleep 3
E "document.body.innerText.includes('ВНЕШНИЙ РУБЕЖ') ? 'ZONE_OK' : 'ZONE_BAD: '+document.body.innerText.slice(0,80)"

echo "=== 2. ASHER DIALOGUE + PORTRAIT ==="
E "window.__echoEngine.openDialogue('rubezh_asher'); 'ok'" >/dev/null
sleep 1.2
E '(() => { const im=document.querySelector("img[alt=\"Портрет: Ашер\"]"); return im && im.naturalWidth>0 ? "PORTRAIT_OK" : "PORTRAIT_BAD" })()'

echo "=== 3. TAKE VR-01 (choice 0) ==="
E "window.__echoEngine.chooseOption(0); 'ok'" >/dev/null
sleep 0.5
E "window.__echoEngine.chooseOption(0); 'ok'" >/dev/null
sleep 0.5
E "window.__echoEngine.closeDialogue(); 'ok'" >/dev/null
sleep 0.3
E "window.__echoEngine.quests.rubezh_ship.stage"

echo "=== 4. SHIP LOG (interact f) ==="
E "window.__echoEngine.player.pos = { x: 8430-60, y: 1500+150+10 }; 'moved'" >/dev/null
sleep 0.8
agent-browser press f >/dev/null
sleep 0.8
E "window.__echoEngine.chooseOption(0); 'ok'" >/dev/null
sleep 0.5
E "window.__echoEngine.closeDialogue(); 'ok'" >/dev/null
E "window.__echoEngine.quests.rubezh_ship.stage + ' log:' + !!window.__echoEngine.flags.shipLogRead"

echo "=== 5. CAPTAIN SPAWNS (stasis hall) ==="
E "window.__echoEngine.player.pos = { x: 8430, y: 1660+180 }; 'moved'" >/dev/null
agent-browser eval "(() => { const e=window.__echoEngine; for (let i=0;i<150;i++) e.update(0.016); return 'pumped' })()" >/dev/null
sleep 1
E "window.__echoEngine.entities.some(x => x.enemyType === 'rb_captain' && x.alive) ? 'CAPTAIN_OK' : 'CAPTAIN_MISSING'"
E "window.__echoEngine.entities.some(x => x.enemyType === 'rb_captain' && x.alive) ? 'BOSSBAR ' + (document.querySelector('[class*=boss],[data-boss]') ? 'hud' : 'check') : 'skip'" >/dev/null

echo "=== 6. FIGHT: prime hp + Igni pump ==="
E "(() => { const e=window.__echoEngine; const c=e.entities.find(x => x.enemyType==='rb_captain'); if(c){ c.hp=70; } return 'primed' })()" >/dev/null
for i in 1 2 3 4 5 6 7 8; do
  agent-browser press 1 >/dev/null
  agent-browser eval "(() => { const e=window.__echoEngine; for (let i=0;i<220;i++) e.update(0.016); return e.entities.find(x => x.enemyType==='rb_captain')?.alive ?? 'dead' })()" >/dev/null
done
sleep 1
E "window.__echoEngine.flags.captainEchoDead ? 'CAPTAIN_DEAD_OK' : 'CAPTAIN_ALIVE'"
E "window.__echoEngine.quests.rubezh_ship.stage"

echo "=== 7. SUMMONS CHECK (drones were called) ==="
E "(() => { const e=window.__echoEngine; const drones=e.entities.filter(x=>x.enemyType==='drone'); return 'drones_total_seen: '+drones.length })()"

echo "=== 8. TURN-IN VR-01 -> KEY K6 ==="
E "window.__echoEngine.player.pos = { x: 8320, y: 1800+8 }; 'moved'" >/dev/null
sleep 0.6
agent-browser press f >/dev/null
sleep 0.8
E "window.__echoEngine.chooseOption(0); 'ok'" >/dev/null
sleep 0.5
E "window.__echoEngine.chooseOption(0); 'ok'" >/dev/null
sleep 0.4
E "window.__echoEngine.closeDialogue(); 'ok'" >/dev/null
E "'key_rubezh: ' + !!window.__echoEngine.flags.key_rubezh + ' stage: ' + window.__echoEngine.quests.rubezh_ship.stage + ' gold: ' + window.__echoEngine.gold"

echo "=== 9. VR-02 RELAYS: wrong order then right (1-3-2) ==="
E "window.__echoEngine.player.pos = { x: 8320, y: 1800+8 }; 'near asher'" >/dev/null
agent-browser press f >/dev/null; sleep 0.6
E "window.__echoEngine.chooseOption(0); 'ok'" >/dev/null; sleep 0.4
E "window.__echoEngine.closeDialogue(); 'ok'" >/dev/null
E "'signal stage: ' + window.__echoEngine.quests.rubezh_signal.stage"
# неверный порядок: relay2 первым
E "window.__echoEngine.player.pos = { x: 8680, y: 2820+8 }; 'moved'" >/dev/null; sleep 0.5
agent-browser press f >/dev/null; sleep 0.5
E "'wrong-order counter: ' + window.__echoEngine.quests.rubezh_signal.counter"
# верный: relay1, relay3, relay2
for POS in "8480 2600" "8540 2920" "8680 2820"; do
  set -- $POS
  E "window.__echoEngine.player.pos = { x: $1, y: $2+8 }; 'moved'" >/dev/null
  sleep 0.4
  agent-browser press f >/dev/null
  sleep 0.4
done
E "'ridgeOnline: ' + !!window.__echoEngine.flags.ridgeOnline + ' stage: ' + window.__echoEngine.quests.rubezh_signal.stage"

echo "=== 10. VR-03 RINGS ==="
for POS in "8230 700" "8620 480" "8320 2360"; do
  set -- $POS
  E "window.__echoEngine.player.pos = { x: $1, y: $2+8 }; 'moved'" >/dev/null
  sleep 0.4
  agent-browser press f >/dev/null
  sleep 0.4
done
E "'rings stage: ' + window.__echoEngine.quests.rubezh_rings.stage"

echo "=== 11. VR-04 CREW PODS (12) ==="
PUMP=0
for OFF in "-150 120" "-90 150" "-30 168" "30 168" "90 150" "150 120" "-120 190" "-60 214" "0 222" "60 214" "120 190" "180 150"; do
  set -- $OFF
  E "window.__echoEngine.player.pos = { x: 8430+($1), y: 1660+($2)+10 }; 'moved'" >/dev/null
  sleep 0.3
  agent-browser press f >/dev/null
  sleep 0.3
done
E "'crew stage: ' + window.__echoEngine.quests.rubezh_crew.stage + ' counter: ' + window.__echoEngine.quests.rubezh_crew.counter"

echo "=== 12. TURN-IN ALL -> asherLoyal ==="
E "window.__echoEngine.player.pos = { x: 8320, y: 1808 }; 'moved'" >/dev/null
sleep 0.5
agent-browser press f >/dev/null; sleep 0.6
E "window.__echoEngine.chooseOption(0); 'ok'" >/dev/null; sleep 0.4
E "window.__echoEngine.chooseOption(0); 'ok'" >/dev/null; sleep 0.4
E "window.__echoEngine.closeDialogue(); 'ok'" >/dev/null
E "'signal_done stage: ' + window.__echoEngine.quests.rubezh_signal.stage"
agent-browser press f >/dev/null; sleep 0.6
E "window.__echoEngine.chooseOption(0); 'ok'" >/dev/null; sleep 0.4
E "window.__echoEngine.chooseOption(0); 'ok'" >/dev/null; sleep 0.4
E "window.__echoEngine.closeDialogue(); 'ok'" >/dev/null
agent-browser press f >/dev/null; sleep 0.6
E "window.__echoEngine.chooseOption(0); 'ok'" >/dev/null; sleep 0.4
E "window.__echoEngine.chooseOption(0); 'ok'" >/dev/null; sleep 0.4
E "window.__echoEngine.closeDialogue(); 'ok'" >/dev/null
E "'asherLoyal: ' + !!window.__echoEngine.flags.asherLoyal + ' crew stage: ' + window.__echoEngine.quests.rubezh_crew.stage"

echo "=== 13. SCREENSHOTS ==="
E "window.__echoEngine.player.pos = { x: 8100, y: 1400 }; 'moved'" >/dev/null
agent-browser eval "(() => { const e=window.__echoEngine; for (let i=0;i<60;i++) e.update(0.016); return 'ok' })()" >/dev/null
sleep 1.5
agent-browser screenshot /home/z/my-project/.ref/v65-01-plateau.png >/dev/null && echo "plateau saved"
E "window.__echoEngine.player.pos = { x: 8360, y: 1750 }; 'moved'" >/dev/null
agent-browser eval "(() => { const e=window.__echoEngine; for (let i=0;i<60;i++) e.update(0.016); return 'ok' })()" >/dev/null
sleep 1
agent-browser screenshot /home/z/my-project/.ref/v65-02-asher-camp.png >/dev/null && echo "asher saved"

echo "=== 14. ERRORS / CONSOLE ==="
agent-browser errors | tail -6
agent-browser console 2>/dev/null | tail -25 > /tmp/ab_c.txt
if rg -qi "error" /tmp/ab_c.txt; then echo "CONSOLE ERRORS:"; head -8 /tmp/ab_c.txt; else echo "console: no errors"; fi

agent-browser close >/dev/null 2>&1
pkill -f "next dev" 2>/dev/null
echo "=== DONE ==="
