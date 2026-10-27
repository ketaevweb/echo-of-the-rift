// ============================================================
// ЭХО РАЗЛОМА — словарь EN (v1.6 «Локализация I»)
// Точка сборки: 4 доменных части. Русский текст — ключ.
// Диалоговые деревья НЕ входят (v1.7 — «Локализация II»).
// ============================================================
import { EN_UI } from './dict/ui'
import { EN_SYSTEMS } from './dict/systems'
import { EN_CONTENT_A } from './dict/content-a'
import { EN_CONTENT_B } from './dict/content-b'

export const EN: Record<string, string> = {
  ...EN_CONTENT_A,
  ...EN_CONTENT_B,
  ...EN_SYSTEMS,
  ...EN_UI, // ui — с наивысшим приоритетом
}
