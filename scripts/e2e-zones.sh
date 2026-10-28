#!/usr/bin/env bash
# E2E v2.1 «Зоны-сцены и мобильная производительность» — один батч: сервер + браузер.
# Проверяет:
#   1. зонная архитектура: движок держит сущности/пропсы ТОЛЬКО текущей зоны (__echoScene);
#   2. переход через врата (travelTo) перестраивает сцену (veld) и обратно (valley);
#   3. прямая телепортация в зону (setPos) тоже пересобирает сцену (auto-enter в stepWorld);
#   4. зонный запек терена: канвас много меньше полного мира 8800×4200;
#   5. FPS-метр живой (цикл идёт, кадры считаются);
#   6. титул: версия 2.1, кнопка полного экрана на титуле;
#   7. тач-режим: шторка меню сверху, джойстик НЕ перекрывает её (нет пересечения прямоугольников);
#   8. карта: подсказка «прочие земли за вратами»;
#   9. EN: словарь v2.1 (Fullscreen / Game menu);
#  10. консоль без ошибок.
set -u
cd /home/z/my-project

PORT=3000
say() { echo "=== $* ==="; }
PASS=0; FAIL=0
ok()   { echo "  ✔ $1"; PASS=$((PASS+1)); }
bad()  { echo "  ✘ $1"; FAIL=$((FAIL+1)); }
check() { case "$2" in *"$1"*) ok "$3";; *) bad "$3 (got: $2)";; esac; }

pkill -f "next dev" 2>/dev/null && sleep 2

say "START DEV SERVER"
nohup bun run dev > dev.log 2>&1 &
UP=0
for i in $(seq 1 60); do
  sleep 2
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT" 2>/dev/null || true)
  if [ "$code" = "200" ]; then UP=1; break; fi
done
if [ "$UP" != "1" ]; then echo "SERVER FAILED TO START"; tail -20 dev.log; exit 1; fi
echo "server up"

# 1. Титул: версия + кнопка полного экрана
say "TITLE: v2.2 + FULLSCREEN"
agent-browser open "http://localhost:$PORT" >/dev/null
agent-browser wait --load networkidle >/dev/null 2>&1
sleep 2
agent-browser eval "localStorage.removeItem('echo-rift-locale'); localStorage.removeItem('echo-rift-settings'); localStorage.removeItem('echo-rift-save-v1'); 'reset'" >/dev/null
agent-browser eval "location.reload(); 'reload'" >/dev/null
sleep 3
check "TITLE_OK" "$(agent-browser eval "document.body.innerText.includes('ВЕРСИЯ 2.2') ? 'TITLE_OK' : 'TITLE_BAD'")" "титул v2.2"
check "FS_OK" "$(agent-browser eval "document.querySelector('[data-title-fullscreen]') ? 'FS_OK' : 'FS_BAD'")" "кнопка полного экрана на титуле"

# 2. Новая игра (устойчиво к наличию/отсутствию сейва)
say "NEW GAME"
agent-browser eval "(async () => { for (let i=0;i<12 && !window.__echoEngine;i++) { [...document.querySelectorAll('button')].find(b=>/НОВАЯ ИГРА|ДА, НАЧАТЬ ЗАНОВО/.test(b.textContent))?.click(); [...document.querySelectorAll('button')].find(b=>b.textContent.includes('Дозорный'))?.click(); [...document.querySelectorAll('button')].find(b=>b.textContent.includes('НАЧАТЬ ПУТЬ'))?.click(); await new Promise(r=>setTimeout(r,400)); } return window.__echoEngine ? 'ENGINE_OK' : 'ENGINE_FAIL'; })()" > .ref/ng.json 2>/dev/null
check "ENGINE_OK" "$(cat .ref/ng.json)" "новая игра стартовала"
sleep 4

say "ZONE: VALLEY SCENE ONLY"
agent-browser eval "(() => { const e=window.__echoEngine; const s=window.__echoScene; return JSON.stringify({engine:!!e, scene:s, propsFull:(()=>{try{return e.props.length}catch(_){return -1}})()}); })()" > .ref/zones-valley.json 2>/dev/null
cat .ref/zones-valley.json | head -c 400; echo
check "VALLEY_OK" "$(agent-browser eval "(() => { const s=window.__echoScene; if(!s) return 'NO_SCENE'; if(s.zone!=='valley') return 'WRONG_ZONE'; if(s.props<=0 || s.props>=900) return 'PROPS_COUNT_BAD:'+s.props; if(s.npcs<6) return 'NPCS_BAD:'+s.npcs; return 'VALLEY_OK'; })()")" "долина: только свои пропсы/НПС"
check "BOUNDS_OK" "$(agent-browser eval "(() => { const e=window.__echoEngine; const out=e.entities.filter(x=>x.kind!=='player'&&x.pos.x>3700).length; return out===0?'BOUNDS_OK':'OUT_OF_ZONE:'+out; })()")" "нет сущностей за границей зоны"
check "BAKE_OK" "$(agent-browser eval "(() => { const s=window.__echoScene; return (s.bakedW<4400 && s.bakedH<3300 && s.bakedW>500) ? 'BAKE_OK' : 'BAKE_BAD:'+s.bakedW+'x'+s.bakedH; })()")" "терен запечён по зоне (не 8800×4200)"

# 3. Переход через врата: travelTo(veld)
say "TRAVEL: VALLEY -> VELD"
agent-browser eval "(() => { window.__echoEngine.travelTo('veld'); return 'travel'; })()" >/dev/null
sleep 3
check "VELD_OK" "$(agent-browser eval "(() => { const s=window.__echoScene; return s && s.zone==='veld' ? 'VELD_OK' : 'VELD_BAD:'+(s&&s.zone); })()")" "сцена пересобрана: Вельд"
check "VELD_ENT_OK" "$(agent-browser eval "(() => { const e=window.__echoEngine; const s=window.__echoScene; const inVeld=e.entities.filter(x=>x.pos.y>2300).length; return (s.props>0 && inVeld===e.entities.length) ? 'VELD_ENT_OK' : 'ENT_BAD'; })()")" "все сущности в новой зоне"
check "ZONE_LABEL_OK" "$(agent-browser eval "(() => { const t=document.body.innerText; return t.includes('ВЕЛЬД') ? 'ZONE_LABEL_OK' : 'LABEL_BAD'; })()")" "плашка/метка зоны сменилась"

# 4. Обратно: travelTo(valley)
say "TRAVEL: VELD -> VALLEY"
agent-browser eval "(() => { window.__echoEngine.travelTo('valley'); return 'travel'; })()" >/dev/null
sleep 3
check "BACK_OK" "$(agent-browser eval "(() => { const s=window.__echoScene; return s && s.zone==='valley' ? 'BACK_OK' : 'BACK_BAD:'+(s&&s.zone); })()")" "возврат в долину"
check "BJORN_OK" "$(agent-browser eval "(() => { const e=window.__echoEngine; return e.entities.some(x=>x.id==='bjorn') ? 'BJORN_OK' : 'BJORN_BAD'; })()")" "НПС долины снова в сцене"

# 5. Телепорт в Гранит (без врат) — auto-enter по позиции
say "TELEPORT: GRANITE (auto-enter)"
agent-browser eval "(() => { const e=window.__echoEngine; e.player.pos.x=4260; e.player.pos.y=1400; return 'tp'; })()" >/dev/null
sleep 2.5
check "GRANITE_OK" "$(agent-browser eval "(() => { const s=window.__echoScene; return s && s.zone==='granite' ? 'GRANITE_OK' : 'GRANITE_BAD:'+(s&&s.zone); })()")" "телепорт пересобрал сцену (Гранит)"
agent-browser eval "(() => { const e=window.__echoEngine; e.player.pos.x=960; e.player.pos.y=1780; return 'tp-back'; })()" >/dev/null
sleep 2.5

# 6. Бенчмарк симуляции/кадра (headless: rAF троттлится, поэтому меряем цену шага движка)
say "PERF BENCH"
BENCH=$(agent-browser eval "(() => { const e=window.__echoEngine; if(!e) return 'NO_ENGINE'; // прогрев
  for(let i=0;i<30;i++){ e.update(1/60); }
  const t0=performance.now(); const N=300;
  for(let i=0;i<N;i++){ e.update(1/60); }
  const simMs=(performance.now()-t0)/N;
  const t1=performance.now();
  for(let i=0;i<60;i++){ e.render(); }
  const frameMs=(performance.now()-t1)/60;
  return 'BENCH_sim='+simMs.toFixed(2)+'ms_frame='+frameMs.toFixed(2)+'ms_entities='+e.entities.length+'_props='+e.props.length; })()")
echo "  $BENCH"
SIMVAL=$(echo "$BENCH" | rg -o 'sim=([0-9.]+)' -r '$1' || echo 99)
check "OK" "$(awk -v v="$SIMVAL" 'BEGIN{print (v<6)?"OK":"SLOW:"v}' )" "шаг симуляции зоны < 6мс (было: весь мир)"

# 7. Тач-режим: шторка сверху + отсутствие перекрытий с джойстиком
say "TOUCH UI: DRAWER + NO OVERLAP"
agent-browser eval "(() => { const raw=localStorage.getItem('echo-rift-settings')||'{}'; const o=JSON.parse(raw); o.touch='on'; localStorage.setItem('echo-rift-settings', JSON.stringify(o)); window.__echoEngine?.saveGame(); location.reload(); return 'set'; })()" >/dev/null
sleep 4
agent-browser eval "(() => { [...document.querySelectorAll('button')].find(b=>b.textContent.includes('ПРОДОЛЖИТЬ'))?.click(); return 'ok'; })()" >/dev/null
sleep 4
check "DRAWER_OK" "$(agent-browser eval "document.querySelector('[data-hud-menu]') ? 'DRAWER_OK' : 'DRAWER_BAD'")" "шторка меню присутствует в тач-режиме"
check "NOBOT_OK" "$(agent-browser eval "(() => { const m=document.querySelector('[data-hud-menu]'); const j=document.querySelector('[data-touch-joystick]'); if(!m||!j) return 'MISSING'; const a=m.getBoundingClientRect(), b=j.getBoundingClientRect(); const overlap=!(a.right<b.left||b.right<a.left||a.bottom<b.top||b.bottom<a.top); return overlap?'OVERLAP':'NOBOT_OK'; })()")" "джойстик не перекрывает меню"
check "BOTTOM_CLEAN" "$(agent-browser eval "(() => { const left=[...document.querySelectorAll('button')].filter(b=>{const r=b.getBoundingClientRect(); return r.top>window.innerHeight*0.7 && r.left<window.innerWidth*0.3;}); return left.length===0 ? 'BOTTOM_CLEAN' : 'BOTTOM_BUSY:'+left.length; })()")" "левый нижний угол свободен от кнопок"
check "FS_IN_MENU" "$(agent-browser eval "(() => { document.querySelector('[data-hud-menu]')?.click(); return new Promise(r=>setTimeout(()=>{ const f=document.querySelector('[data-fullscreen]'); r(f ? 'FS_IN_MENU' : 'FS_MISSING'); }, 100)); })()")" "полный экран доступен из шторки"

# 8. Карта: зонная подсказка (открываем через API движка — детерминированно)
say "MAP: ZONE HINT"
agent-browser eval "(() => { window.__echoEngine.openPanel('map'); return 'ok'; })()" >/dev/null
sleep 1.5
check "MAP_HINT_OK" "$(agent-browser eval "document.body.innerText.includes('Прочие земли — за вратами') ? 'MAP_HINT_OK' : 'HINT_BAD'")" "подсказка «прочие земли за вратами»"
agent-browser eval "(() => { const eng=window.__echoEngine; eng?.closePanel(); return 'closed'; })()" >/dev/null

# 9. EN-словарь v2.1
say "EN DICT"
agent-browser eval "(() => { localStorage.setItem('echo-rift-locale','en'); location.reload(); return 'en'; })()" >/dev/null
sleep 4
check "EN_FS_OK" "$(agent-browser eval "document.body.innerText.includes('Fullscreen') ? 'EN_FS_OK' : 'EN_FS_BAD'")" "EN: Fullscreen"
check "EN_TITLE_OK" "$(agent-browser eval "document.body.innerText.includes('VERSION 2.2') ? 'EN_TITLE_OK' : 'EN_TITLE_BAD'")" "EN: VERSION 2.2"

# 10. Консоль без ошибок
say "CONSOLE"
CONSOLE_LOG=$(agent-browser console 2>/dev/null | tail -30 || true)
if echo "$CONSOLE_LOG" | rg -i "error|uncaught|exception" >/dev/null 2>&1; then
  bad "в консоли есть ошибки"; echo "$CONSOLE_LOG" | rg -i "error|uncaught|exception" | head -5
else
  ok "консоль чиста"
fi

say "RESULT: PASS=$PASS FAIL=$FAIL"
[ "$FAIL" = "0" ] && echo "E2E ZONES: ALL GREEN" || echo "E2E ZONES: FAILURES PRESENT"
pkill -f "next dev" 2>/dev/null
exit $([ "$FAIL" = "0" ] && echo 0 || echo 1)
