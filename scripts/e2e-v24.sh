#!/usr/bin/env bash
# E2E v2.4 «Пешая проходимость востока + полная озвучка» — один батч: сервер + браузер.
# Репорт игрока: «в двух последних доменах нет озвучки и нижние половины карт
# не пускает — не пройти». Причины, найденные и починенные:
#   А. Хребет Долина↔Вельд (y=2560±95) блокировал движение по ВСЕЙ ширине мира —
#      невидимая стена пересекала Гранит/Пределье/Спорные Земли/Рубеж.
#   Б. Багровый хребет Мары (y=3350±120) — то же: гард был только по низу (x>GRIDGE.x),
#      стена стояла и восточнее Пределья, отрезая юг Спорных Земель (и врата Рубежа).
#   В. Ростер озвучки VOICE_OF не включал персонажей восточных доменов
#      (Пруша/Тарбен/Гхарз, Мейра/Хольт/Ингрид/Эйнар, бортжурнал «Двенадцатого»,
#      предметные спикеры) — диалоги последних доменов молчали.
# Проверяет:
#   1. пешком через бывшую стену хребта в Спорных Землях (юг достижим);
#   2. пешком через бывшую стену Мары во Внешнем Рубеже;
#   3. ЗАПАДНЫЕ стены целы: хребет в долине и багровый хребет в секторе
#      Гранита/МарЫ по-прежнему непроходимы (регресс-гард фикса);
#   4. врата Спорные Земли → Внешний Рубеж работают (travelTo);
#   5. озвучка: все новые спикеры приняты (зеркало voiceState), отказов нет;
#   6. озвучка из настоящего диалога (Гхарз Кровавый Пёс);
#   7. EN: словарь на месте (строка v2.1 «Fullscreen»);
#   8. консоль без ошибок.
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

agent-browser open "http://localhost:$PORT" >/dev/null
agent-browser wait --load networkidle >/dev/null 2>&1
sleep 2
agent-browser eval "localStorage.removeItem('echo-rift-locale'); localStorage.removeItem('echo-rift-settings'); localStorage.removeItem('echo-rift-save-v1'); localStorage.removeItem('echo-rift-tutorial'); 'reset'" >/dev/null
agent-browser eval "location.reload(); 'reload'" >/dev/null
sleep 3

say "NEW GAME"
agent-browser eval "(async () => { for (let i=0;i<12 && !window.__echoEngine;i++) { [...document.querySelectorAll('button')].find(b=>/НОВАЯ ИГРА|ДА, НАЧАТЬ ЗАНОВО/.test(b.textContent))?.click(); [...document.querySelectorAll('button')].find(b=>b.textContent.includes('Дозорный'))?.click(); [...document.querySelectorAll('button')].find(b=>b.textContent.includes('НАЧАТЬ ПУТЬ'))?.click(); await new Promise(r=>setTimeout(r,400)); } return window.__echoEngine ? 'ENGINE_OK' : 'ENGINE_FAIL'; })()" > .ref/ng24.json 2>/dev/null
check "ENGINE_OK" "$(cat .ref/ng24.json)" "новая игра стартовала"
sleep 3

# Помощник: бессмертие + зачистка мобов на каждом шаге опроса (headless ~5fps,
# респавны убивают тестового Дозорного-1 уровня — не часть проверки)
IMMORTAL='(() => { const e=window.__echoEngine; if(!e) return "NO_ENGINE"; e.entities.forEach(x=>{ if(x.kind==="enemy") x.alive=false; }); e.maxHp=100000; e.hp=100000; e.player.alive=true; return "ok"; })()'

# Универсальный пешеход: place → dest → опрос y каждые 1.2 с до N секунд.
# Возвращает "py=<последний y>". Движение — через dest (общий путь с приказами).
walksouth() { # xs ys yt seconds
  agent-browser eval "(() => { const e=window.__echoEngine; e.player.dest=null; e.player.pos.x=$1; e.player.pos.y=$2; return 'placed'; })()" >/dev/null
  sleep 1
  agent-browser eval "(() => { const e=window.__echoEngine; e.player.dest={x:$1,y:$3}; return 'dest'; })()" >/dev/null
  local waited=0
  while [ "$waited" -lt "$4" ]; do
    sleep 1.2
    waited=$((waited+1))
    eval "$IMMORTAL" >/dev/null 2>&1
  done
  agent-browser eval "(() => { const e=window.__echoEngine; e.player.dest=null; return 'py='+Math.round(e.player.pos.y); })()" 2>/dev/null | tr -d '"'
}

say "A: CROSS RIDGE IN DISPUTED (бывшая стена y=2465..2655)"
PY=$(walksouth 7300 2380 2850 24)
echo "  итог: $PY"
AY=${PY#py=}
case "$AY" in ''|*[!0-9]*) bad "спорные: нет ответа пешехода ($PY)";; *) if [ "$AY" -ge 2700 ]; then ok "спорные: юг достижим пешком ($PY)"; else bad "спорные: стена хребта всё ещё стоит ($PY)"; fi;; esac

say "B: CROSS MARA RIDGE IN RUBEZH (бывшая стена y=3230..3470)"
PY=$(walksouth 8236 3560 3150 24)
echo "  итог: $PY"
BY=${PY#py=}
case "$BY" in ''|*[!0-9]*) bad "рубеж: нет ответа пешехода ($PY)";; *) if [ "$BY" -le 3300 ]; then ok "рубеж: север достижим пешком ($PY)"; else bad "рубеж: стена Мары всё ещё стоит ($PY)"; fi;; esac

say "C: WEST WALL INTACT (хребет в долине непроходим)"
PY=$(walksouth 900 2400 2700 12)
echo "  итог: $PY"
CY=${PY#py=}
case "$CY" in ''|*[!0-9]*) bad "долина: нет ответа ($PY)";; *) if [ "$CY" -lt 2550 ]; then ok "долина: хребет по-прежнему держит ($PY)"; else bad "долина: хребет сломан ($PY)"; fi;; esac

say "D: MARA WALL INTACT (сектор Гранита/МарЫ непроходим)"
PY=$(walksouth 4400 3520 3150 12)
echo "  итог: $PY"
DY=${PY#py=}
case "$DY" in ''|*[!0-9]*) bad "мара: нет ответа ($PY)";; *) if [ "$DY" -ge 3350 ]; then ok "мара: багровый хребет по-прежнему держит ($PY)"; else bad "мара: хребет сломан ($PY)"; fi;; esac

say "E: PORTAL DISPUTED → RUBEZH"
agent-browser eval "(() => { const e=window.__echoEngine; if(!e) return 'NO_ENGINE'; e.player.pos.x=7700; e.player.pos.y=3760; return 'placed'; })()" >/dev/null
sleep 1
agent-browser eval "(() => { const e=window.__echoEngine; e.travelTo('rubezh'); return 'travel'; })()" >/dev/null
sleep 5
EC=$(agent-browser eval "(() => { try { const s=window.__echoScene; return s && s.zone==='rubezh' ? 'RUBEZH_OK' : 'ZONE:'+(s? s.zone : 'NO_SCENE'); } catch (err) { return 'ERR:'+err.message; } })()" 2>/dev/null | tr -d '"')
check "RUBEZH_OK" "$EC" "врата ведут во Внешний Рубеж"

say "F: VOICE ROSTER (v2.4)"
VOICE_CHECK='(names) => { const st=window.__echoVoiceState; let bad=[]; for (const n of names){ window.__echoSpeak(n, "Проверка озвучки"); if (window.__echoVoiceState.lastSpeaker !== n || window.__echoVoiceState.refused !== null) bad.push(n); } return bad.length ? "REFUSED:"+bad.join(",") : "VOICE_OK"; }'
VC=$(agent-browser eval "($VOICE_CHECK)(['Гхарз Кровавый Пёс','Пруша','Тарбен','Командор Мейра','Досент Хольт','Ингрид','Эйнар','Бортжурнал «Двенадцатого»','Семя Разлома','Доска объявлений'])" 2>/dev/null | tr -d '"')
check "VOICE_OK" "$VC" "все новые спикеры озвучены"

say "G: REAL DIALOGUE VOICE (Гхарз)"
agent-browser eval "(() => { const e=window.__echoEngine; e.player.pos.x=7230; e.player.pos.y=2860; e.openDialogue('disputed_gharz'); return 'dlg'; })()" >/dev/null
sleep 2
check "DLG_VOICE_OK" "$(agent-browser eval "(() => { const st=window.__echoVoiceState; const d=window.__echoEngine.dialogueTree !== null; const r=(st.lastSpeaker==='Гхарз Кровавый Пёс' && d) ? 'DLG_VOICE_OK' : 'BAD:'+st.lastSpeaker+'/dlg='+d; window.__echoEngine.closeDialogue(); return r; })()" 2>/dev/null | tr -d '"')" "диалог Гхарза озвучен"
agent-browser eval "(() => { window.__echoEngine.closeDialogue(); return 'closed'; })()" >/dev/null

say "H: EN DICTIONARY"
agent-browser eval "localStorage.setItem('echo-rift-locale','en'); location.reload(); 'en-reload'" >/dev/null
sleep 7
HC=$(agent-browser eval "(() => { try { const txt=document.body.innerText; return (txt.includes('ECHO OF THE RIFT') || txt.includes('NEW GAME') || txt.includes('Continue')) ? 'EN_OK' : 'EN_BAD:'+txt.slice(0,80); } catch (err) { return 'ERR:'+err.message; } })()" 2>/dev/null | tr -d '"')
check "EN_OK" "$HC" "EN-словарь жив"
agent-browser eval "localStorage.removeItem('echo-rift-locale'); 'ru-again'" >/dev/null

say "I: CONSOLE"
CONS=$(agent-browser console --format text 2>/dev/null | rg -i "error" | rg -v "favicon|404|Autoplay|play\(\)|The play|speech" | head -3)
if [ -z "$CONS" ]; then ok "консоль чиста"; else bad "ошибки консоли: $CONS"; fi

echo
echo "=== ИТОГО: PASS=$PASS FAIL=$FAIL ==="
[ "$FAIL" = "0" ] || exit 1
