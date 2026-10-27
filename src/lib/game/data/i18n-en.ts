// ============================================================
// ЭХО РАЗЛОМА — словарь EN (v1.6 «Локализация I» + v1.7 «Локализация II»)
// Точка сборки: доменные части. Русский текст — ключ.
// v1.7: добавлены диалоговые деревья (dict/dialogues-1..4).
// ============================================================
import { EN_UI } from './dict/ui'
import { EN_SYSTEMS } from './dict/systems'
import { EN_CONTENT_A } from './dict/content-a'
import { EN_CONTENT_B } from './dict/content-b'
import { EN_DIALOGUES_1 } from './dict/dialogues-1'
import { EN_DIALOGUES_2 } from './dict/dialogues-2'
import { EN_DIALOGUES_3 } from './dict/dialogues-3'
import { EN_DIALOGUES_4 } from './dict/dialogues-4'

export const EN: Record<string, string> = {
  ...EN_CONTENT_A,
  ...EN_CONTENT_B,
  ...EN_SYSTEMS,
  // v1.7: диалоги — выше систем/контента (контекст диалога приоритетнее),
  // ниже ui (общие слова вроде «Далее» остаются за интерфейсом)
  ...EN_DIALOGUES_1,
  ...EN_DIALOGUES_2,
  ...EN_DIALOGUES_3,
  ...EN_DIALOGUES_4,
  ...EN_UI, // ui — с наивысшим приоритетом
}
