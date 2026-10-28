#!/usr/bin/env bash
# E2E v2.4 «Мобильный комфорт» — один батч: сервер + браузер.
# Проверяет:
#   1. небо: купол масштабируется под camera.far (skyRadius ≤ far) —
#      «чёрной дыры» на горизонте больше нет (репорт Realme 13 5G);
#   2. тач-тап в реалтайме НЕ двигает героя (движение только джойстиком),
#      мышиный тап по-прежнему приказывает движение (десктоп не сломан);
#   3. тосты переехали влево, компактные, без крестиков;
#   4. интеракт-подсказка на таче: крупная иконка-кнопка, без «[F]»,
#      нажатие открывает диалог;
#   5. диалог на таче — полный экран без прозрачности (bg-[#12100c]);
#   6. панель на таче — полный экран непрозрачный, а рендер мира ЗАМРОЖЕН
#      (view3d.render не вызывается), после закрытия рендер живёт;
#   7. обучение: чип «Обучение…» появляется в новой игре и гаснет после
#      движения; EN-локаль показывает «Tutorial: …»;
#   8. озвучка: браузерный speechSynthesis доступен, speakLine не роняет игру;
#   9. зоны не сломаны (врата туда-обратно);
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

mkdir -p .ref

# 0. Чистый профиль: mobile-пресет + тач, обучение и сейв сброшены
say "PRESET: MOBILE + TOUCH (clean profile)"
agent-browser open "http://localhost:$PORT" >/dev/null
agent-browser wait --load networkidle >/dev/null 2>&1
sleep 1
agent-browser eval "localStorage.setItem('echo-rift-settings', JSON.stringify({quality:'mobile', touch:'on'})); localStorage.removeItem('echo-rift-locale'); localStorage.removeItem('echo-rift-save-v1'); localStorage.removeItem('echo-rift-tutorial'); 'set'" >/dev/null
agent-browser eval "location.reload(); 'reload'" >/dev/null
sleep 3

# 1. Новая игра
say "NEW GAME"
agent-browser eval "(async () => { for (let i=0;i<12 && !window.__echoEngine;i++) { [...document.querySelectorAll('button')].find(b=>/НОВАЯ ИГРА|ДА, НАЧАТЬ ЗАНОВО/.test(b.textContent))?.click(); [...document.querySelectorAll('button')].find(b=>b.textContent.includes('Дозорный'))?.click(); [...document.querySelectorAll('button')].find(b=>b.textContent.includes('НАЧАТЬ ПУТЬ'))?.click(); await new Promise(r=>setTimeout(r,400)); } return window.__echoEngine ? 'ENGINE_OK' : 'ENGINE_FAIL'; })()" > .ref/ng.json 2>/dev/null
check "ENGINE_OK" "$(cat .ref/ng.json)" "новая игра стартовала"
sleep 4

# 2. Небо: купол внутри far — не отсекается
say "SKY DOME FITS FAR"
agent-browser eval "(() => { const s=window.__echoEngine.view3d.getQualityStats(); return JSON.stringify(s); })()" > .ref/sky.json 2>/dev/null
cat .ref/sky.json; echo
check "SKY_OK" "$(agent-browser eval "(() => { const s=window.__echoEngine.view3d.getQualityStats(); return (s.skyRadius>0 && s.skyRadius<=s.far) ? 'SKY_OK' : 'SKY_BAD:'+s.skyRadius+'>'+s.far; })()")" "радиус неба ≤ camera.far (нет чёрного купола)"

# 3. Тач-тап в реалтайме не двигает; мышиный — двигает
say "TAP POLICY"
agent-browser eval "(() => { const e=window.__echoEngine; e.player.dest=null; const c=e.inputCanvas; const r=c.getBoundingClientRect(); c.dispatchEvent(new PointerEvent('pointerdown',{button:0,pointerType:'touch',clientX:r.left+r.width*0.5,clientY:r.top+r.height*0.5,bubbles:true})); return 'tap-touch'; })()" >/dev/null
sleep 0.5
check "TAP_TOUCH_OFF" "$(agent-browser eval "window.__echoEngine.player.dest ? 'TAP_MOVED_BAD' : 'TAP_TOUCH_OFF_OK'")" "touch-тап по миру в реалтайме игнорируется"
agent-browser eval "(() => { const e=window.__echoEngine; e.player.dest=null; const c=e.inputCanvas; const r=c.getBoundingClientRect(); c.dispatchEvent(new PointerEvent('pointerdown',{button:0,pointerType:'mouse',clientX:r.left+r.width*0.72,clientY:r.top+r.height*0.75,bubbles:true})); return 'tap-mouse'; })()" >/dev/null
sleep 0.5
check "TAP_MOUSE_OK" "$(agent-browser eval "window.__echoEngine.player.dest ? 'TAP_MOUSE_OK' : 'TAP_MOUSE_BAD'")" "мышиный тап по-прежнему приказывает движение"
agent-browser eval "window.__echoEngine.player.dest=null; 'cleared'" >/dev/null

# 4. Тосты слева, компактные, без крестиков
say "TOASTS LEFT COMPACT"
agent-browser eval "window.__echoEngine.toast('Проверка смещения логов', 'quest'); 'toasted'" >/dev/null
sleep 0.4
check "TOAST_LEFT" "$(agent-browser eval "(() => { const els=[...document.querySelectorAll('div')].filter(d=>d.textContent.trim()==='Проверка смещения логов'); if(!els.length) return 'NO_TOAST'; const r=els[0].getBoundingClientRect(); return (r.left < window.innerWidth*0.25) ? 'TOAST_LEFT' : 'TOAST_CENTER:'+Math.round(r.left); })()")" "тост у левого края"
check "TOAST_SMALL" "$(agent-browser eval "(() => { const els=[...document.querySelectorAll('div')].filter(d=>d.textContent.trim()==='Проверка смещения логов'); if(!els.length) return 'NO_TOAST'; const r=els[0].getBoundingClientRect(); return (r.width<=260) ? 'TOAST_SMALL' : 'TOAST_WIDE:'+Math.round(r.width); })()")" "тост компактный (≤260px)"
check "TOAST_NO_X" "$(agent-browser eval "(() => { const els=[...document.querySelectorAll('div')].filter(d=>d.textContent.trim()==='Проверка смещения логов'); if(!els.length) return 'NO_TOAST'; return els[0].querySelector('button') ? 'HAS_CLOSE_BAD' : 'TOAST_NO_X_OK'; })()")" "у тоста нет крестика"

# 5. Интеракт-подсказка на таче: крупная кнопка без [F]
say "INTERACT HINT (TOUCH)"
agent-browser eval "(() => { const e=window.__echoEngine; const g=e.entities.find(x=>x.name==='Грим'); e.player.pos.x=g.pos.x+30; e.player.pos.y=g.pos.y+30; e.player.dest=null; e.syncUi(); return 'near-grim'; })()" >/dev/null
sleep 0.8
check "HINT_BTN_OK" "$(agent-browser eval "(() => { const b=document.querySelector('[data-touch-interact-hint]'); if(!b) return 'NO_HINT'; if(/\[|\]|\bF\b/.test(b.textContent)) return 'KEY_IN_TEXT_BAD:'+b.textContent.trim(); return b.getBoundingClientRect().height>=40 ? 'HINT_BTN_OK' : 'HINT_SMALL'; })()")" "крупная иконка-кнопка интеракта, без [F]"
agent-browser eval "(() => { document.querySelector('[data-touch-interact-hint]').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true})); return 'pressed'; })()" >/dev/null
sleep 0.8
check "HINT_OPENS_DIALOG" "$(agent-browser eval "(() => { const ok=!!window.__echoEngine.dialogueTree; return ok ? 'HINT_OPENS_DIALOG' : 'DIALOG_BAD'; })()")" "тап по подсказке открывает диалог"

# 6. Диалог на таче — полный экран непрозрачный
say "DIALOG FULLSCREEN OPAQUE"
check "DIALOG_OPAQUE" "$(agent-browser eval "(() => { const d=document.querySelector('[data-dialogue-root]'); if(!d) return 'NO_DIALOG'; return d.className.includes('bg-[#12100c]') ? 'DIALOG_OPAQUE' : 'DIALOG_TRANSPARENT_BAD'; })()")" "фон диалога непрозрачный на таче"

# 7. Панель на таче — непрозрачная + рендер мира заморожен
say "PANEL OPAQUE + RENDER FREEZE"
agent-browser eval "(() => { window.__echoEngine.closeDialogue(); window.__echoEngine.openPanel('char'); return 'open'; })()" >/dev/null
sleep 0.8
check "PANEL_OPAQUE" "$(agent-browser eval "(() => { const p=document.querySelector('[data-game-panel-root]'); if(!p) return 'NO_PANEL'; const opaque=p.className.includes('bg-[#12100c]'); const translucent=p.className.includes('bg-black/60'); return (opaque && !translucent) ? 'PANEL_OPAQUE' : 'PANEL_BAD'; })()")" "панель персонажа без прозрачности на таче"
agent-browser eval "(() => { const v=window.__echoEngine.view3d; v.__rc=0; if(!v.__renderOrig){ v.__renderOrig=v.render.bind(v); v.render=(a)=>{ v.__rc++; v.__renderOrig(a); }; } return 'patched'; })()" >/dev/null
sleep 1
check "RENDER_FROZEN" "$(agent-browser eval "(() => { const v=window.__echoEngine.view3d; const c=v.__rc; v.render=v.__renderOrig; delete v.__renderOrig; delete v.__rc; return c===0 ? 'RENDER_FROZEN' : 'RENDER_LIVE:'+c; })()")" "при открытой панели мир не рендерится"
agent-browser eval "(() => { window.__echoEngine.closePanel(); const v=window.__echoEngine.view3d; v.__rc=0; if(!v.__renderOrig){ v.__renderOrig=v.render.bind(v); v.render=(a)=>{ v.__rc++; v.__renderOrig(a); }; } return 'resumed'; })()" >/dev/null
sleep 1
check "RENDER_RESUMED" "$(agent-browser eval "(() => { const v=window.__echoEngine.view3d; const c=v.__rc; v.render=v.__renderOrig; delete v.__renderOrig; delete v.__rc; return c>0 ? 'RENDER_RESUMED' : 'STILL_FROZEN_BAD'; })()")" "после закрытия панели рендер продолжается"

# 8. Обучение: чип появляется и гаснет после движения (детерминированно:
#     телепорты выше могли закрыть шаг — сбрасываем через хук)
say "TUTORIAL"
agent-browser eval "(() => { window.__echoTutorial.reset(); window.__echoTutorial.showMove(); return 'shown'; })()" >/dev/null
sleep 0.4
check "TUT_SHOW" "$(agent-browser eval "(() => { const c=document.querySelector('[data-tutorial]'); return c && c.textContent.includes('Обучение') ? 'TUT_SHOW' : 'TUT_BAD:'+(c?c.textContent.slice(0,40):'none'); })()")" "чип обучения показан"
agent-browser eval "(() => { const e=window.__echoEngine; e.player.dest={x:e.player.pos.x+90, y:e.player.pos.y}; return 'walking'; })()" >/dev/null
sleep 2.5
check "TUT_MOVE_DONE" "$(agent-browser eval "(() => { const c=document.querySelector('[data-tutorial]'); const d=window.__echoTutorial.done(); return !c && d.includes('move') ? 'TUT_MOVE_DONE_OK' : 'TUT_STILL_BAD:'+(c?'chip':d.join(',')); })()")" "шаг «движение» закрыт — чип погас"

# 9. Озвучка: speechSynthesis доступен и не роняет игру
say "VOICE"
check "VOICE_API_OK" "$(agent-browser eval "(() => { const v=window.__echoBrowserVoice?.(); return v && v.supported===true ? 'VOICE_API_OK' : 'VOICE_BAD:'+JSON.stringify(v); })()")" "браузерный TTS-мост существует"
check "VOICE_SPEAK_OK" "$(agent-browser eval "(() => { try { window.__echoSpeak?.('Бьорн','Проверка озвучки.'); return 'VOICE_SPEAK_OK'; } catch(e) { return 'THROW:'+e.message; } })()")" "speakLine через браузерный путь не роняет сессию"
sleep 0.5

# 10. Зоны не сломаны
say "ZONES REGRESSION"
agent-browser eval "(() => { window.__echoEngine.travelTo('veld'); return 'go'; })()" >/dev/null
sleep 3
check "VELD_OK" "$(agent-browser eval "window.__echoScene?.zone==='veld' ? 'VELD_OK' : 'VELD_BAD'")" "врата: Вельд"
agent-browser eval "(() => { window.__echoEngine.travelTo('valley'); return 'back'; })()" >/dev/null
sleep 3
check "VALLEY_OK" "$(agent-browser eval "window.__echoScene?.zone==='valley' ? 'VALLEY_OK' : 'VALLEY_BAD'")" "врата: назад в долину"

# 11. EN-локаль: обучение и словарь
say "EN DICT + TUTORIAL"
agent-browser eval "(() => { localStorage.setItem('echo-rift-locale','en'); localStorage.removeItem('echo-rift-tutorial'); location.reload(); return 'en'; })()" >/dev/null
sleep 4
agent-browser eval "(async () => { for (let i=0;i<12 && !window.__echoEngine;i++) { [...document.querySelectorAll('button')].find(b=>/NEW GAME|YES, START OVER/.test(b.textContent))?.click(); [...document.querySelectorAll('button')].find(b=>b.textContent.includes('Warden'))?.click(); [...document.querySelectorAll('button')].find(b=>b.textContent.includes('BEGIN'))?.click(); await new Promise(r=>setTimeout(r,400)); } return 'ok'; })()" >/dev/null
sleep 3
check "EN_TUT" "$(agent-browser eval "(() => { const c=document.querySelector('[data-tutorial]'); return c && c.textContent.includes('Tutorial:') ? 'EN_TUT' : 'EN_TUT_BAD:'+(c?c.textContent.slice(0,40):'none'); })()")" "EN: чип обучения на английском"

# 12. Консоль без ошибок
say "CONSOLE"
CONSOLE_LOG=$(agent-browser console 2>/dev/null | tail -30 || true)
if echo "$CONSOLE_LOG" | rg -i "error|uncaught|exception" >/dev/null 2>&1; then
  bad "в консоли есть ошибки"; echo "$CONSOLE_LOG" | rg -i "error|uncaught|exception" | head -5
else
  ok "консоль чиста"
fi

say "RESULT: PASS=$PASS FAIL=$FAIL"
[ "$FAIL" = "0" ] && echo "E2E COMFORT: ALL GREEN" || echo "E2E COMFORT: FAILURES PRESENT"
pkill -f "next dev" 2>/dev/null
exit $([ "$FAIL" = "0" ] && echo 0 || echo 1)
