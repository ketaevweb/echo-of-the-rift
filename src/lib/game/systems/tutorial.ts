// ============================================================
// ЭХО РАЗЛОМА — обучение (v2.3)
// Контекстные подсказки для новичка: движение → интеракт → диалог →
// журнал/задания → бой → тактические приказы → меню. Показывается один
// раз (прогресс в localStorage), гаснет по выполнению шага или крестику.
// Тексты — канонические RU-ключи (t() на точке отображения в Hud).
// ============================================================

import { useGame } from '../store'
import { t } from '../i18n'

export type TutorialId = 'move' | 'interact' | 'dialogue' | 'quest' | 'combat' | 'tactical' | 'menu'

const STORAGE_KEY = 'echo-rift-tutorial'

/** Подсказки шагов. touch-варианты — для сенсорного управления. */
const TEXT_OF: Record<TutorialId, { touch: string; desktop: string }> = {
  move: {
    touch: 'Обучение: джойстик слева — движение · свайп справа — камера · пинч — зум',
    desktop: 'Обучение: WASD — движение · зажми ПКМ (или стрелки) — камера · колесо — зум',
  },
  interact: {
    touch: 'Обучение: рядом точка интереса — жми жёлтую кнопку с рукой справа',
    desktop: 'Обучение: рядом точка интереса — нажми F (подсказка внизу)',
  },
  dialogue: {
    touch: 'Обучение: выбирай реплики тапом — ответы меняют награды, доверие и концовку',
    desktop: 'Обучение: реплики — цифры 1–9 или клик; ответы меняют награды, доверие и концовку',
  },
  quest: {
    touch: 'Обучение: задание в Журнале — иконка свитка в шторке сверху · трекер справа ведёт по цели',
    desktop: 'Обучение: задание в Журнале [J] · трекер справа ведёт по цели (клик по нему открывает журнал)',
  },
  combat: {
    touch: 'Обучение: прицел — выбрать врага · знак Огня — поджечь · жёлтая колба — лечит',
    desktop: 'Обучение: Tab/прицел — выбрать врага · 1 (Игни) — поджечь · зелье [Q] лечит',
  },
  tactical: {
    touch: 'Обучение: пауза — тап по компаньону: выбрать, по земле: идти, по врагу: цель отряда',
    desktop: 'Обучение: в паузе ЛКМ — приказы отряду (компаньон/земля/враг), Space — отпустить мир',
  },
  menu: {
    touch: 'Обучение: шторка сверху — персонаж, инвентарь, журнал, карта, меню и звук',
    desktop: 'Обучение: кнопки слева внизу — персонаж [C], инвентарь [I], журнал [J], карта [M]',
  },
}

let done: Set<TutorialId> = new Set()
let shown: TutorialId | null = null
let watchBound = false
let movedDist = 0
let menuTimer = 0

/** Текст шага на точке отображения (Hud) — реактивно к локали и тач-режиму:
 *  раньше запекался в стор в конструкторе движка, до включения touchUi,
 *  и новичок на телефоне видел десктопную подсказку про WASD. */
export function tutorialText(id: TutorialId, touch: boolean): string {
  return t(touch ? TEXT_OF[id].touch : TEXT_OF[id].desktop)
}

function loadDone() {
  if (typeof window === 'undefined') return
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) done = new Set(JSON.parse(raw) as TutorialId[])
  } catch {
    done = new Set()
  }
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...done]))
  } catch {
    /* приватный режим */
  }
}

/** Инициализация (клиент) — загрузка прогресса + подписки на стор. */
export function initTutorial() {
  if (typeof window === 'undefined') return
  loadDone()
  bindWatch()
}

/** Сброс обучения (только для E2E-тестов). */
export function resetTutorial() {
  done = new Set()
  shown = null
  persist()
  useGame.getState().patch({ tutorial: null })
}

// E2E/отладочный хук: детерминированная проверка шагов обучения
if (typeof window !== 'undefined') {
  ;(window as unknown as { __echoTutorial?: object }).__echoTutorial = {
    reset: resetTutorial,
    showMove: () => showTutorial('move'),
    done: () => [...done],
  }
}

/** Пройден ли шаг. */
export function isTutorialDone(id: TutorialId): boolean {
  return done.has(id)
}

/** Показать подсказку шага (если ещё не пройден и не показан другой).
 *  В стор кладём только id — текст считает Hud (см. tutorialText). */
export function showTutorial(id: TutorialId) {
  const st = useGame.getState()
  if (st.screen !== 'game') return
  if (done.has(id) || st.tutorial) return
  if (st.panel || st.dialogue) return
  shown = id
  st.patch({ tutorial: { id } })
}

/** Скрыть подсказку при выходе из игры (титул) — без пометки пройденности. */
export function hideTutorial() {
  shown = null
  useGame.getState().patch({ tutorial: null })
}

/** Пометить шаг пройденным (или крестик — игрок сам закрыл). */
export function completeTutorial(id: TutorialId) {
  if (!done.has(id)) {
    done.add(id)
    persist()
  }
  if (shown === id) {
    shown = null
    useGame.getState().patch({ tutorial: null })
  }
}

/** Тик от движка (idёт только в незамороженном мире): движение + «про меню». */
export function tickTutorial(moved: number, dt: number) {
  if (shown === 'move') {
    movedDist += moved
    if (movedDist > 90) completeTutorial('move')
  }
  // меню: если за 70 с игры ни одна панель не открывалась — намекнуть
  if (!done.has('menu') && shown === null) {
    menuTimer += dt
    if (menuTimer > 70) showTutorial('menu')
  }
}

/** Подписки на стор: шаги, выводимые из состояния UI. */
function bindWatch() {
  if (watchBound) return
  watchBound = true
  let prevInteract: string | null = null
  let prevDialogue = false
  let prevPaused = false
  useGame.subscribe((st) => {
    // интеракт: подсказка появилась впервые
    if (st.interactHint && !prevInteract && !done.has('interact')) showTutorial('interact')
    prevInteract = st.interactHint
    // диалог открыт/выбор сделан
    if (st.dialogue && !prevDialogue && !done.has('dialogue')) showTutorial('dialogue')
    if (prevDialogue && !st.dialogue && shown === 'dialogue') completeTutorial('dialogue')
    prevDialogue = !!st.dialogue
    // задание: главный квест вышел на стадию 1+ (диалог с Бьорном дан)
    if (st.trackerQuest && st.trackerQuest.stage >= 1 && !done.has('quest')) showTutorial('quest')
    // панель открыта — шаг «меню» пройден
    if (st.panel && !done.has('menu')) completeTutorial('menu')
    // тактическая пауза: включили — подсказка, выключили — шаг пройден
    if (st.paused && !prevPaused && !done.has('tactical')) showTutorial('tactical')
    if (prevPaused && !st.paused && shown === 'tactical') completeTutorial('tactical')
    prevPaused = st.paused
  })
}
