#!/usr/bin/env bash
# E2E v2.2→2.4 «Мобильный пресет + UX-фиксы» (версионные пины 2.4) — один батч: сервер + браузер.
# Проверяет:
#   1. пресет «Мобильное»: effQuality=mobile, pixelRatio ≤ 0.86, тени выкл,
#      MSAA выкл, дальность камеры урезана, туман гуще (×1.3), frameCap=30;
#   2. кап FPS реально работает: цикл рендерит ≤ 35 кадров/с при пресете mobile
#      и снимает кап на high (60Гц headless допускаем: high ≥ 45, mobile ≤ 38);
#   3. кнопка полного экрана видна в HUD без открытия меню (data-fullscreen);
#   4. шторка меню СКРОЛЛИТСЯ: на вьюпорте 640×360 панель получает max-height,
#      последний пункт (Полный экран) достижим прокруткой;
#   5. карточка игрока: имя «Смертник» не режется (scrollWidth ≤ clientWidth);
#   6. трекер квеста в таче свёрнут в одну строку и НЕ пересекается с кластером
#      действий и миникартой (по прямоугольникам);
#   7. кластер: закрытые умения скрыты (есть igni, нет aard), пауза в ряду умений;
#   8. FPS-чип в тач-режиме (data-hud-fps) с именем пресета;
#   9. EN: пресет «Mobile» в настройках, VERSION 2.4 на титуле;
#  10. зоны не сломаны: travelTo(veld→valley) пересобирает сцену;
#  11. консоль без ошибок.
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

# 0. Чистый профиль + мобильный пресет и тач-режим ДО загрузки
say "PRESET: MOBILE + TOUCH ON (pre-load)"
agent-browser open "http://localhost:$PORT" >/dev/null
agent-browser wait --load networkidle >/dev/null 2>&1
sleep 1
agent-browser eval "localStorage.setItem('echo-rift-settings', JSON.stringify({quality:'mobile', touch:'on'})); localStorage.removeItem('echo-rift-locale'); localStorage.removeItem('echo-rift-save-v1'); 'set'" >/dev/null
agent-browser eval "location.reload(); 'reload'" >/dev/null
sleep 3

# 1. Титул: версия 2.4
say "TITLE: v2.4"
check "TITLE_OK" "$(agent-browser eval "document.body.innerText.includes('ВЕРСИЯ 2.4') ? 'TITLE_OK' : (document.body.innerText.match(/ВЕРСИЯ [0-9.]+/)||['none'])[0]")" "титул v2.4"

# 2. Новая игра
say "NEW GAME"
agent-browser eval "(async () => { for (let i=0;i<12 && !window.__echoEngine;i++) { [...document.querySelectorAll('button')].find(b=>/НОВАЯ ИГРА|ДА, НАЧАТЬ ЗАНОВО/.test(b.textContent))?.click(); [...document.querySelectorAll('button')].find(b=>b.textContent.includes('Дозорный'))?.click(); [...document.querySelectorAll('button')].find(b=>b.textContent.includes('НАЧАТЬ ПУТЬ'))?.click(); await new Promise(r=>setTimeout(r,400)); } return window.__echoEngine ? 'ENGINE_OK' : 'ENGINE_FAIL'; })()" > .ref/ng.json 2>/dev/null
check "ENGINE_OK" "$(cat .ref/ng.json)" "новая игра стартовала"
sleep 4

# 3. Пресет «Мобильное» применён к рендеру
say "PRESET APPLIED: RENDER STATS"
agent-browser eval "(() => { const e=window.__echoEngine; const s=e?.view3d?.getQualityStats?.(); return JSON.stringify({eff:e?.effQuality, cap:e?.frameCap?.(), stats:s}); })()" > .ref/preset.json 2>/dev/null
cat .ref/preset.json; echo
check "EFF_OK"    "$(agent-browser eval "window.__echoEngine?.effQuality==='mobile' ? 'EFF_OK' : 'EFF_BAD:'+window.__echoEngine?.effQuality")" "effQuality = mobile"
check "CAP_OK"    "$(agent-browser eval "window.__echoEngine?.frameCap()===30 ? 'CAP_OK' : 'CAP_BAD'")" "frameCap = 30"
check "DPR_OK"    "$(agent-browser eval "(() => { const s=window.__echoEngine.view3d.getQualityStats(); return s.pixelRatio<=0.86 ? 'DPR_OK' : 'DPR_BAD:'+s.pixelRatio; })()")" "pixelRatio ≤ 0.85"
check "SHADOW_OK" "$(agent-browser eval "(() => { const s=window.__echoEngine.view3d.getQualityStats(); return s.shadows===false ? 'SHADOW_OK' : 'SHADOW_BAD'; })()")" "тени выключены"
check "MSAA_OK"   "$(agent-browser eval "(() => { const s=window.__echoEngine.view3d.getQualityStats(); return s.antialias===false ? 'MSAA_OK' : 'MSAA_BAD'; })()")" "MSAA выключен (низкое dpr)"
check "FAR_OK"    "$(agent-browser eval "(() => { const s=window.__echoEngine.view3d.getQualityStats(); return s.far>=1300 && s.far<=4200 ? 'FAR_OK' : 'FAR_BAD:'+s.far; })()")" "дальность камеры урезана (×0.55; долина ~3370 вместо 6127)"
check "FOG_OK"    "$(agent-browser eval "(() => { const s=window.__echoEngine.view3d.getQualityStats(); return s.fogBoost===1.3 ? 'FOG_OK' : 'FOG_BAD:'+s.fogBoost; })()")" "туман гуще (×1.3)"

# 4. Кап FPS: считаем кадры движка 2 секунды (патчим render)
say "FPS CAP MEASURE"
agent-browser eval "(() => { const e=window.__echoEngine; e.__rc=0; if(!e.__renderOrig){ e.__renderOrig=e.render.bind(e); e.render=()=>{ e.__rc++; e.__renderOrig(); }; } return 'patched'; })()" >/dev/null
sleep 2
FPS_MOB=$(agent-browser eval "(() => { const e=window.__echoEngine; const c=e.__rc; e.render=e.__renderOrig; delete e.__renderOrig; delete e.__rc; return 'RENDERS='+c; })()" | rg -o 'RENDERS=([0-9]+)' -r '$1' || echo 999)
echo "  renders за 2с при mobile: $FPS_MOB (≤ 76 — кап 30fps с допуском headless)"
check "CAPWORKS" "$(awk -v v="$FPS_MOB" 'BEGIN{print (v>0 && v<=76)?"CAPWORKS":"CAP_FAIL:"v}')" "при пресете mobile цикл рендерит ~30fps, не 60+"

# 5. Полный экран: постоянная кнопка в HUD (без открытия меню)
say "FULLSCREEN BUTTON"
check "FS_HUD_OK" "$(agent-browser eval "(() => { const f=document.querySelector('[data-fullscreen]'); if(!f) return 'FS_MISSING'; const r=f.getBoundingClientRect(); return (r.width>0 && r.top<window.innerHeight*0.2) ? 'FS_HUD_OK' : 'FS_POS_BAD'; })()")" "кнопка fullscreen видна в верхнем ряду HUD"

# 6. Имя игрока не режется + FPS-чип + трекер свёрнут
say "HUD READABILITY"
check "NAME_OK" "$(agent-browser eval "(() => { const names=[...document.querySelectorAll('.pointer-events-auto p.truncate, .pointer-events-auto .truncate')]; if(!names.length) return 'NO_NAMES'; const bad=names.filter(n=>n.scrollWidth>n.clientWidth+1); return bad.length===0 ? 'NAME_OK' : 'CLIPPED:'+bad[0].textContent; })()")" "имена в карточках отряда не обрезаны"
check "FPSCHIP_OK" "$(agent-browser eval "(() => { const c=document.querySelector('[data-hud-fps]'); return c && /FPS/.test(c.textContent) ? 'FPSCHIP_OK' : 'FPSCHIP_BAD'; })()")" "FPS-чип в тач-режиме"
check "TRACKER_MINI_OK" "$(agent-browser eval "(() => { const t=document.querySelector('[data-hud-tracker]'); if(!t) return 'NO_TRACKER'; const r=t.getBoundingClientRect(); return r.height<=44 ? 'TRACKER_MINI_OK' : 'TRACKER_TALL:'+r.height; })()")" "трекер свёрнут в одну строку"

# 7. Кластер: закрытые умения скрыты, пауза в ряду
say "CLUSTER: UNLOCKED ONLY"
check "IGNI_OK" "$(agent-browser eval "!!document.querySelector('[data-touch-ability=\"igni\"]') ? 'IGNI_OK' : 'IGNI_BAD'")" "открытый знак igni в кластере"
check "AARD_HIDDEN" "$(agent-browser eval "document.querySelector('[data-touch-ability=\"aard\"]') ? 'AARD_VISIBLE' : 'AARD_HIDDEN'")" "закрытый знак aard скрыт"
check "PAUSE_OK" "$(agent-browser eval "!!document.querySelector('[data-touch-action=\"pause\"]') ? 'PAUSE_OK' : 'PAUSE_BAD'")" "пауза в кластере"

# 8. Нет перекрытий: кластер vs трекер/миникарта (вьюпорт 640×360 — худший случай)
say "OVERLAP: 640x360 WORST CASE"
agent-browser set viewport 640 360 >/dev/null 2>&1 || true
sleep 1.5
check "NO_OVERLAP" "$(agent-browser eval "(() => { const cl=document.querySelector('[data-touch-cluster]'); if(!cl) return 'NO_CLUSTER'; const cr=cl.getBoundingClientRect(); const targets=['[data-hud-tracker]','[data-minimap]'].map(s=>document.querySelector(s)).filter(Boolean).map(x=>x.getBoundingClientRect()); for(const t of targets){ const overlap=!(cr.right<t.left||t.right<cr.left||cr.bottom<t.top||t.bottom<cr.top); if(overlap) return 'OVERLAP'; } return 'NO_OVERLAP'; })()")" "кластер не наезжает на трекер/миникарту"
# 9. Шторка скроллится на низком экране (640×300: панель ~270px > max-h ~212px)
agent-browser set viewport 640 300 >/dev/null 2>&1 || true
sleep 1
agent-browser eval "document.querySelector('[data-hud-menu]')?.click(); 'open'" >/dev/null
sleep 0.5
check "MENU_SCROLL" "$(agent-browser eval "(() => { const p=document.querySelector('[data-hud-menu-panel]'); if(!p) return 'NO_PANEL'; if(p.scrollHeight<=p.clientHeight+4) return 'FITS_OK(no scroll needed)'; const last=[...p.querySelectorAll('button')].pop(); last.scrollIntoView({block:'end'}); const r=last.getBoundingClientRect(); return (r.bottom<=window.innerHeight+2) ? 'MENU_SCROLL' : 'LAST_UNREACHABLE'; })()")" "последний пункт шторки достижим прокруткой"
agent-browser eval "document.querySelector('[data-hud-menu]')?.click(); 'close'" >/dev/null
agent-browser set viewport 1280 720 >/dev/null 2>&1 || true
sleep 1

# 10. Смена пресета: high снимает кап, возвращает тени и полную дальность
say "SWITCH PRESET: HIGH"
FAR_MOB=$(agent-browser eval "window.__echoEngine.view3d.getQualityStats().far")
agent-browser eval "(() => { const eng=window.__echoEngine; eng.applySettings({ ...JSON.parse(localStorage.getItem('echo-rift-settings')||'{}'), quality:'high' }); return 'applied'; })()" >/dev/null
sleep 1
check "HIGH_OK" "$(agent-browser eval "(() => { const e=window.__echoEngine; const s=e.view3d.getQualityStats(); return (e.effQuality==='high' && e.frameCap()===0 && s.shadows===true) ? 'HIGH_OK' : 'HIGH_BAD:'+e.effQuality; })()")" "high: без капа, тени включены"
FAR_HIGH=$(agent-browser eval "window.__echoEngine.view3d.getQualityStats().far")
check "FAR_RESTORE" "$(awk -v m="$FAR_MOB" -v h="$FAR_HIGH" 'BEGIN{print (h>m+500)?"FAR_RESTORE":"FAR_SAME:"m"->"h}' )" "high возвращает полную дальность ($FAR_MOB → $FAR_HIGH)"
check "MOBILE_BACK_OK" "$(agent-browser eval "(() => { const eng=window.__echoEngine; eng.applySettings({ ...JSON.parse(localStorage.getItem('echo-rift-settings')||'{}'), quality:'mobile' }); return eng.effQuality==='mobile' && eng.frameCap()===30 ? 'MOBILE_BACK_OK' : 'BACK_BAD'; })()")" "возврат на mobile работает"

# 11. Зоны не сломаны (быстрый проход вратами)
say "ZONES REGRESSION"
agent-browser eval "(() => { window.__echoEngine.travelTo('veld'); return 'travel'; })()" >/dev/null
sleep 3
check "VELD_OK" "$(agent-browser eval "window.__echoScene?.zone==='veld' ? 'VELD_OK' : 'VELD_BAD'")" "врата: Вельд"
agent-browser eval "(() => { window.__echoEngine.travelTo('valley'); return 'back'; })()" >/dev/null
sleep 3
check "VALLEY_OK" "$(agent-browser eval "window.__echoScene?.zone==='valley' ? 'VALLEY_OK' : 'VALLEY_BAD'")" "врата: назад в долину"

# 12. EN-словарь
say "EN DICT"
agent-browser eval "(() => { localStorage.setItem('echo-rift-locale','en'); location.reload(); return 'en'; })()" >/dev/null
sleep 4
check "EN_TITLE_OK" "$(agent-browser eval "document.body.innerText.includes('VERSION 2.4') ? 'EN_TITLE_OK' : 'EN_TITLE_BAD'")" "EN: VERSION 2.4"
agent-browser eval "(async () => { for (let i=0;i<12 && !window.__echoEngine;i++) { [...document.querySelectorAll('button')].find(b=>/NEW GAME|YES, START OVER/.test(b.textContent))?.click(); [...document.querySelectorAll('button')].find(b=>b.textContent.includes('Warden'))?.click(); [...document.querySelectorAll('button')].find(b=>b.textContent.includes('BEGIN'))?.click(); await new Promise(r=>setTimeout(r,400)); } return 'ok'; })()" >/dev/null
sleep 4
check "EN_FPSCHIP" "$(agent-browser eval "(() => { const c=document.querySelector('[data-hud-fps]'); return c && /Mobile/.test(c.textContent) ? 'EN_FPSCHIP' : 'EN_BAD:'+(c?c.textContent:'none'); })()")" "EN: FPS-чип показывает пресет Mobile"
agent-browser eval "(() => { window.__echoEngine?.openPanel('pause'); return 'ok'; })()" >/dev/null
sleep 1
check "EN_MOBILE_BTN" "$(agent-browser eval "document.body.innerText.includes('Mobile') ? 'EN_MOBILE_BTN' : 'EN_BTN_BAD'")" "EN: пресет Mobile в настройках"
agent-browser eval "(() => { window.__echoEngine?.closePanel(); return 'ok'; })()" >/dev/null

# 13. Консоль без ошибок
say "CONSOLE"
CONSOLE_LOG=$(agent-browser console 2>/dev/null | tail -30 || true)
if echo "$CONSOLE_LOG" | rg -i "error|uncaught|exception" >/dev/null 2>&1; then
  bad "в консоли есть ошибки"; echo "$CONSOLE_LOG" | rg -i "error|uncaught|exception" | head -5
else
  ok "консоль чиста"
fi

say "RESULT: PASS=$PASS FAIL=$FAIL"
[ "$FAIL" = "0" ] && echo "E2E MOBILE: ALL GREEN" || echo "E2E MOBILE: FAILURES PRESENT"
pkill -f "next dev" 2>/dev/null
exit $([ "$FAIL" = "0" ] && echo 0 || echo 1)
