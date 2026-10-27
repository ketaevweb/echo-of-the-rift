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
for i in 1 2 3 4 5 6; do sleep 1; R=$(agent-browser eval "!!window.__echoEngine"); [ "$R" = "true" ] && break; done
E() { agent-browser eval "$1"; }
E "(() => { const e=window.__echoEngine; e.travelTo('rubezh'); return 'ok' })()" >/dev/null; sleep 3
E "(() => { const e=window.__echoEngine; e.openDialogue('rubezh_asher'); e.chooseOption(0); e.chooseOption(0); e.closeDialogue(); return 'q'+e.quests.rubezh_ship.stage })()" >/dev/null
E "(() => { const e=window.__echoEngine; e.player.pos={x:8370,y:1660}; window.dispatchEvent(new KeyboardEvent('keydown',{key:'f'})); e.chooseOption(0); e.closeDialogue(); return 'log ' + e.flags.shipLogRead })()" >/dev/null
echo "=== SPAWN + DIAG ==="
E "(() => { const e=window.__echoEngine; e.player.pos={x:8430,y:1720}; for(let i=0;i<200;i++) e.update(0.016); const c=e.entities.find(x=>x.enemyType==='rb_captain'); if(c) c.hp=200; return c ? 'spawn hp '+c.hp : 'none' })()"
echo "=== CAST DIAG ==="
E "(() => { const e=window.__echoEngine; const c=e.entities.find(x=>x.enemyType==='rb_captain'); if(!c) return 'no cap'; e.player.facing=Math.atan2(c.pos.y-e.player.pos.y, c.pos.x-e.player.pos.x); const d0=Math.hypot(c.pos.x-e.player.pos.x,c.pos.y-e.player.pos.y); e.castAbility('igni'); const c2=e.entities.find(x=>x.enemyType==='rb_captain'); return 'dist '+Math.round(d0)+' facing '+Math.round(e.player.facing*57)+' hp '+Math.round(c2.hp)+' playerAlive '+e.player.alive })()"
E "(() => { const e=window.__echoEngine; const c=e.entities.find(x=>x.enemyType==='rb_captain'); if(!c) return 'dead'; e.player.facing=Math.atan2(c.pos.y-e.player.pos.y, c.pos.x-e.player.pos.x); e.castAbility('igni'); for(let i=0;i<60;i++) e.update(0.016); const c2=e.entities.find(x=>x.enemyType==='rb_captain'); return 'after1s hp '+ (c2?Math.round(c2.hp):'DEAD') + ' php ' + JSON.stringify(e.entities.filter(x=>x.kind==='enemy'&&x.alive).map(x=>x.enemyType).slice(0,6)) })()"
E "(() => { const e=window.__echoEngine; return 'player hp ' + Math.round(e.player.hp) + ' of ' + e.player.maxHp })()"
agent-browser errors | tail -4
agent-browser close >/dev/null 2>&1
pkill -f "next dev" 2>/dev/null
echo done
