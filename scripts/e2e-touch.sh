#!/usr/bin/env bash
# E2E v2.0 «Мобильное управление» — один батч: сервер + браузер в одном вызове.
# На десктопе сенсорный режим форсируется настройкой touch:'on' (localStorage ДО загрузки).
# Проверяет:
#   1. режим «Вкл» показывает контролы: джойстик-зона, look-зона, кластер действий;
#      центральный HUD-бар умений скрыт (заменён кластером), меню-кнопки ≥44px;
#   2. джойстик: свайп-драг двигает героя (аналоговая скорость);
#   3. look-зона: свайп вращает камеру (yaw), короткий тап ставит приказ движения;
#   4. «Взаимодействовать»: активна у НПС, открывает диалог;
#   5. кнопка знака (igni): тратит стамину; «Тактическая пауза»: тугглится;
#   6. настройки: строка «Мобильное управление», «Выкл» прячет контролы и возвращает бар;
#   7. персистентность: после reload+continue контролы на месте;
#   8. EN-словарь: строка/индикатор/подсказка переведены;
#   9. консоль без ошибок.
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

mkdir -p .ref

# 1. Форс тач-режима до загрузки
say "FORCE TOUCH MODE"
agent-browser eval "localStorage.setItem('echo-rift-settings', JSON.stringify({touch:'on'})); localStorage.removeItem('echo-rift-locale'); 'set'" >/dev/null
agent-browser open "http://localhost:$PORT" >/dev/null
agent-browser wait --load networkidle >/dev/null 2>&1
sleep 2
echo -n "title ru: "
agent-browser eval "document.body.innerText.includes('ВЕРСИЯ 2.0') ? 'TITLE_OK' : 'TITLE_BAD'"

# 2. Новая игра
say "NEW GAME"
agent-browser eval "(() => { [...document.querySelectorAll('button')].find(b=>b.textContent.includes('НОВАЯ ИГРА'))?.click(); return 'ok'; })()" >/dev/null
sleep 1
agent-browser eval "(() => { [...document.querySelectorAll('button')].find(b=>/ДА, НАЧАТЬ ЗАНОВО/.test(b.textContent))?.click(); return 'ok'; })()" >/dev/null
sleep 1
agent-browser eval "(() => { [...document.querySelectorAll('button')].find(b=>b.textContent.includes('Дозорный'))?.click(); return 'ok'; })()" >/dev/null
sleep 1
agent-browser eval "(() => { [...document.querySelectorAll('button')].find(b=>b.textContent.includes('НАЧАТЬ ПУТЬ'))?.click(); return 'ok'; })()" >/dev/null
sleep 4
echo -n "engine: "
agent-browser eval "!!window.__echoEngine ? 'ENGINE_OK' : 'ENGINE_MISSING'"
echo -n "touch controls: "
agent-browser eval "(() => { const q=(s)=>!!document.querySelector(s); return JSON.stringify({root:q('[data-touch-root]'), joy:q('[data-touch-joystick]'), look:q('[data-touch-look]'), target:q('[data-touch-action=\"target\"]'), interact:q('[data-touch-action=\"interact\"]'), pause:q('[data-touch-action=\"pause\"]'), igni:q('[data-touch-ability=\"igni\"]')}); })()"
echo -n "ability bar hidden: "
agent-browser eval "document.querySelector('.ability-slot') ? 'BAR_BAD' : 'BAR_HIDDEN'"
echo -n "menu buttons 44px: "
agent-browser eval "(() => { const b=[...document.querySelectorAll('button')].find(x=>x.title && x.title.includes('Персонаж')); return b && b.className.includes('h-11') ? 'BTN44_OK' : 'BTN44_BAD'; })()"

# 3. Джойстик двигает героя
say "JOYSTICK MOVES"
agent-browser eval "(() => { const j=document.querySelector('[data-touch-joystick]'); const r=j.getBoundingClientRect(); const x0=r.left+r.width*0.5, y0=r.top+r.height*0.6; window.__p0={x:window.__echoEngine.player.pos.x, y:window.__echoEngine.player.pos.y}; j.dispatchEvent(new PointerEvent('pointerdown',{pointerId:21,clientX:x0,clientY:y0,bubbles:true})); window.dispatchEvent(new PointerEvent('pointermove',{pointerId:21,clientX:x0,clientY:y0-90,bubbles:true})); return 'drag-on'; })()" >/dev/null
sleep 1.3
echo -n "player moved: "
agent-browser eval "(() => { const p=window.__echoEngine.player.pos; const d=Math.hypot(p.x-window.__p0.x, p.y-window.__p0.y); window.dispatchEvent(new PointerEvent('pointerup',{pointerId:21,bubbles:true})); return d>12 ? 'JOY_OK('+Math.round(d)+')' : 'JOY_BAD('+Math.round(d)+')'; })()"

# 4. Look-зона: камера + тап
say "LOOK ZONE"
agent-browser eval "(() => { const l=document.querySelector('[data-touch-look]'); const r=l.getBoundingClientRect(); const cx=r.left+r.width*0.5, cy=r.top+r.height*0.5; window.__yaw0=window.__echoEngine.view3d.getCameraYaw(); l.dispatchEvent(new PointerEvent('pointerdown',{pointerId:22,clientX:cx,clientY:cy,bubbles:true})); for (let i=1;i<=8;i++) window.dispatchEvent(new PointerEvent('pointermove',{pointerId:22,clientX:cx+i*20,clientY:cy,bubbles:true})); window.dispatchEvent(new PointerEvent('pointerup',{pointerId:22,bubbles:true})); return 'ok'; })()" >/dev/null
echo -n "camera yaw changed: "
agent-browser eval "(() => { const d=Math.abs(window.__echoEngine.view3d.getCameraYaw()-window.__yaw0); return d>0.05 ? 'LOOK_OK' : 'LOOK_BAD'; })()"
agent-browser eval "(() => { const l=document.querySelector('[data-touch-look]'); const r=l.getBoundingClientRect(); const tx=r.left+r.width*0.5, ty=r.top+r.height*0.35; l.dispatchEvent(new PointerEvent('pointerdown',{pointerId:23,clientX:tx,clientY:ty,bubbles:true})); window.dispatchEvent(new PointerEvent('pointerup',{pointerId:23,clientX:tx,clientY:ty,bubbles:true})); return 'ok'; })()" >/dev/null
echo -n "tap sets move order: "
agent-browser eval "window.__echoEngine.player.dest ? 'TAP_OK' : 'TAP_BAD'"

# 5. Интеракт у Грима
say "INTERACT BUTTON"
agent-browser eval "(() => { const e=window.__echoEngine; const g=e.entities.find(x=>x.name==='Грим'); e.player.pos.x=g.pos.x+30; e.player.pos.y=g.pos.y+30; e.syncUi(); return 'ok'; })()" >/dev/null
sleep 0.6
echo -n "interact enabled+dialogue: "
agent-browser eval "(() => { const b=document.querySelector('[data-touch-action=\"interact\"]'); if (b.disabled) return 'BTN_DISABLED'; b.dispatchEvent(new PointerEvent('pointerdown',{pointerId:24,bubbles:true})); return 'PRESSED'; })()" >/dev/null
sleep 0.8
agent-browser eval "(() => { const ok=!!window.__echoEngine.dialogueTree; window.__echoEngine.closeDialogue(); return ok ? 'DIALOG_OK' : 'DIALOG_BAD'; })()"

# 6. Знак + пауза
say "ABILITY AND PAUSE"
echo -n "igni spends stamina: "
agent-browser eval "(() => { const e=window.__echoEngine; const s0=e.stamina; document.querySelector('[data-touch-ability=\"igni\"]').dispatchEvent(new PointerEvent('pointerdown',{pointerId:25,bubbles:true})); return (s0-e.stamina)>0 ? 'CAST_OK' : 'CAST_BAD'; })()"
echo -n "pause toggles: "
agent-browser eval "(() => { const e=window.__echoEngine; const b=document.querySelector('[data-touch-action=\"pause\"]'); b.dispatchEvent(new PointerEvent('pointerdown',{pointerId:26,bubbles:true})); const p1=e.tacticalPaused; b.dispatchEvent(new PointerEvent('pointerdown',{pointerId:27,bubbles:true})); return (p1 && !e.tacticalPaused) ? 'PAUSE_OK' : 'PAUSE_BAD'; })()"

# 7. Настройки: строка + режимы
say "SETTINGS ROW"
agent-browser eval "(() => { window.__echoEngine.openPanel('pause'); return 'ok'; })()" >/dev/null
sleep 0.6
agent-browser eval "(() => { [...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Настройки')?.click(); return 'ok'; })()" >/dev/null
sleep 0.8
echo -n "row present: "
agent-browser eval "document.body.innerText.includes('Мобильное управление') ? 'ROW_OK' : 'ROW_BAD'"
echo -n "mode off hides: "
agent-browser eval "(() => { [...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Выкл')?.click(); return 'ok'; })()" >/dev/null
sleep 1
agent-browser eval "(() => { const gone=!document.querySelector('[data-touch-root]'); const bar=!!document.querySelector('.ability-slot'); return (gone && bar) ? 'OFF_OK' : 'OFF_BAD'; })()"
echo -n "mode on restores (после закрытия панели): "
agent-browser eval "(() => { [...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Вкл')?.click(); return 'ok'; })()" >/dev/null
sleep 0.6
agent-browser eval "(() => { window.__echoEngine.closePanel(); return 'ok'; })()" >/dev/null
sleep 0.8
agent-browser eval "(() => { return document.querySelector('[data-touch-root]') ? 'ON_OK' : 'ON_BAD'; })()"

# 8. Персистентность: reload + продолжить
say "PERSISTENCE"
agent-browser eval "window.location.reload(); 'reloading'" >/dev/null
sleep 4
agent-browser eval "(() => { [...document.querySelectorAll('button')].find(b=>/ПРОДОЛЖИТЬ/i.test(b.textContent))?.click(); return 'ok'; })()" >/dev/null
sleep 4
echo -n "controls after reload: "
agent-browser eval "document.querySelector('[data-touch-root]') && window.__echoEngine ? 'PERSIST_OK' : 'PERSIST_BAD'"
agent-browser screenshot /home/z/my-project/.ref/v20-01-touch-hud.png >/dev/null && echo "shot saved"

# 9. EN-словарь
say "EN DICTIONARY"
agent-browser eval "(() => { window.__echoEngine.openPanel('pause'); return 'ok'; })()" >/dev/null
sleep 0.6
agent-browser eval "(() => { [...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Настройки' || b.textContent.trim()==='Settings')?.click(); return 'ok'; })()" >/dev/null
sleep 0.8
agent-browser eval "(() => { [...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='English')?.click(); return 'ok'; })()" >/dev/null
sleep 1.2
echo -n "en settings: "
agent-browser eval "(() => { const t=document.body.innerText; return (t.includes('Touch controls') && t.includes('on-screen buttons') && t.includes('Joystick — move')) ? 'EN_OK' : 'EN_BAD'; })()"
agent-browser screenshot /home/z/my-project/.ref/v20-02-touch-en.png >/dev/null && echo "shot saved"

# 10. Консоль
say "CONSOLE"
agent-browser errors | tail -3
echo "E2E_TOUCH_DONE"
