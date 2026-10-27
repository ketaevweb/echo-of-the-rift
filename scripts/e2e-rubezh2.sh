#!/usr/bin/env bash
# E2E Фаза 6.5 часть 2 (компакт) — все действия синхронными eval-пакетами
set -u
cd /home/z/my-project
pkill -f "next dev" 2>/dev/null && sleep 2
nohup bun run dev > dev.log 2>&1 &
UP=0
for i in $(seq 1 60); do sleep 2; c=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 || true); [ "$c" = "200" ] && { UP=1; break; }; done
[ "$UP" != "1" ] && { echo "SERVER FAILED"; exit 1; }
echo "server up"
agent-browser set viewport 1280 800 >/dev/null
agent-browser open http://localhost:3000 >/dev/null
agent-browser wait --load networkidle >/dev/null 2>&1
sleep 2
agent-browser find role button click --name "НАЧАТЬ ПУТЬ" >/dev/null
for i in 1 2 3 4 5 6; do sleep 1; R=$(agent-browser eval "!!window.__echoEngine"); [ "$R" = "true" ] && break; done
echo "engine: $R"
E() { agent-browser eval "$1"; }

# Клавиша f синхронно: движение + интеракт + выборы в ОДНОМ eval
say() { echo "$1"; }

say "=== A. TRAVEL + QUEST + LOG (single evals) ==="
E "(() => { const e=window.__echoEngine; e.travelTo('rubezh'); return 'ok' })()" >/dev/null; sleep 3
E "(() => { const e=window.__echoEngine; e.openDialogue('rubezh_asher'); e.chooseOption(0); e.chooseOption(0); e.closeDialogue(); return 'quest ' + e.quests.rubezh_ship.stage })()"
E "(() => { const e=window.__echoEngine; e.player.pos={x:8370,y:1660}; window.dispatchEvent(new KeyboardEvent('keydown',{key:'f'})); e.chooseOption(0); e.closeDialogue(); return 'log ' + e.flags.shipLogRead + ' st ' + e.quests.rubezh_ship.stage })()"

say "=== B. CAPTAIN FIGHT ==="
E "(() => { const e=window.__echoEngine; e.player.pos={x:8430,y:1720}; for(let i=0;i<200;i++) e.update(0.016); e.player.maxHp=900; e.player.hp=900; const c=e.entities.find(x=>x.enemyType==='rb_captain'); if(c) c.hp=64; return c ? 'spawned hp '+c.hp+' php 900' : 'no spawn' })()"
for i in $(seq 1 14); do
  A=$(E "(() => { const e=window.__echoEngine; const c=e.entities.find(x=>x.enemyType==='rb_captain'); if(!c) return 0; e.player.hp=900; e.player.facing = Math.atan2(c.pos.y-e.player.pos.y, c.pos.x-e.player.pos.x); e.castAbility('igni'); for(let i=0;i<330;i++) e.update(0.016); e.player.hp=900; const c2=e.entities.find(x=>x.enemyType==='rb_captain'); return c2 ? 1 : 0 })()")
  [ "$A" = "0" ] && { echo "  captain down at iter $i"; break; }
done
sleep 0.6
E "'captainEchoDead: ' + !!window.__echoEngine.flags.captainEchoDead + ' stage: ' + window.__echoEngine.quests.rubezh_ship.stage"

say "=== C. TURN-IN K6 + VR-02 ==="
E "(() => { const e=window.__echoEngine; e.player.pos={x:8320,y:1808}; window.dispatchEvent(new KeyboardEvent('keydown',{key:'f'})); e.chooseOption(0); e.chooseOption(0); e.closeDialogue(); return 'key ' + e.flags.key_rubezh + ' ship ' + e.quests.rubezh_ship.stage + ' sig ' + e.quests.rubezh_signal.stage + ' gold ' + e.gold })()"

say "=== D. RELAYS wrong+right ==="
E "(() => { const e=window.__echoEngine; e.player.pos={x:8680,y:2828}; window.dispatchEvent(new KeyboardEvent('keydown',{key:'f'})); return 'wrong counter ' + e.quests.rubezh_signal.counter })()"
E "(() => { const e=window.__echoEngine; const hit=(x,y)=>{ e.player.pos={x,y}; window.dispatchEvent(new KeyboardEvent('keydown',{key:'f'})) }; hit(8480,2608); hit(8540,2928); hit(8680,2828); return 'ridge ' + e.flags.ridgeOnline + ' st ' + e.quests.rubezh_signal.stage })()"

say "=== E. TURN-IN VR-02 + VR-03 ==="
E "(() => { const e=window.__echoEngine; e.player.pos={x:8320,y:1808}; window.dispatchEvent(new KeyboardEvent('keydown',{key:'f'})); e.chooseOption(0); e.chooseOption(0); e.closeDialogue(); return 'sig ' + e.quests.rubezh_signal.stage + ' rings ' + e.quests.rubezh_rings.stage })()"

say "=== F. RINGS ==="
E "(() => { const e=window.__echoEngine; const hit=(x,y)=>{ e.player.pos={x,y}; window.dispatchEvent(new KeyboardEvent('keydown',{key:'f'})) }; hit(8230,708); hit(8620,488); hit(8320,2368); return 'rings st ' + e.quests.rubezh_rings.stage })()"
E "(() => { const e=window.__echoEngine; e.player.pos={x:8320,y:1808}; window.dispatchEvent(new KeyboardEvent('keydown',{key:'f'})); e.chooseOption(0); e.chooseOption(0); e.closeDialogue(); return 'rings ' + e.quests.rubezh_rings.stage + ' crew ' + e.quests.rubezh_crew.stage })()"

say "=== G. CREW x12 + asherLoyal ==="
E "(() => { const e=window.__echoEngine; const off=[[-150,120],[-90,150],[-30,168],[30,168],[90,150],[150,120],[-120,190],[-60,214],[0,222],[60,214],[120,190],[180,150]]; for (const [dx,dy] of off){ e.player.pos={x:8430+dx, y:1660+dy+10}; window.dispatchEvent(new KeyboardEvent('keydown',{key:'f'})) } return 'crew st ' + e.quests.rubezh_crew.stage + ' cnt ' + e.quests.rubezh_crew.counter })()"
E "(() => { const e=window.__echoEngine; e.player.pos={x:8320,y:1808}; window.dispatchEvent(new KeyboardEvent('keydown',{key:'f'})); e.chooseOption(0); e.chooseOption(0); e.closeDialogue(); return 'asherLoyal ' + e.flags.asherLoyal + ' crew ' + e.quests.rubezh_crew.stage })()"

say "=== H. SUMMARY FLAGS ==="
E "(() => { const f=window.__echoEngine.flags; const q=window.__echoEngine.quests; return JSON.stringify({ ship:q.rubezh_ship.stage, sig:q.rubezh_signal.stage, rings:q.rubezh_rings.stage, crew:q.rubezh_crew.stage, k6:!!f.key_rubezh, ridge:!!f.ridgeOnline, asher:!!f.asherLoyal, captDead:!!f.captainEchoDead, keys:(['key_valley','key_veld','key_granite','key_frost','key_mara','key_disputed','key_rubezh'].filter(k=>f[k]).length) }) })()"

say "=== I. SCREENSHOTS ==="
E "(() => { const e=window.__echoEngine; e.player.pos={x:8100,y:1400}; for(let i=0;i<60;i++) e.update(0.016); return 'ok' })()" >/dev/null
sleep 1.5
agent-browser screenshot /home/z/my-project/.ref/v65-01-plateau.png >/dev/null && echo "plateau saved"
E "(() => { const e=window.__echoEngine; e.player.pos={x:8330,y:1760}; for(let i=0;i<60;i++) e.update(0.016); return 'ok' })()" >/dev/null
sleep 1
agent-browser screenshot /home/z/my-project/.ref/v65-02-asher-camp.png >/dev/null && echo "asher saved"

say "=== J. ERRORS ==="
agent-browser errors | tail -5
agent-browser console 2>/dev/null | tail -25 > /tmp/ab_c3.txt
if rg -qi "error" /tmp/ab_c3.txt; then echo "CONSOLE ERRORS:"; head -8 /tmp/ab_c3.txt; else echo "console: no errors"; fi

agent-browser close >/dev/null 2>&1
pkill -f "next dev" 2>/dev/null
echo "=== DONE ==="
