'use client'

import { t } from '@/lib/game/i18n'

/**
 * v1.6: рендер ДОВЕРЕННОЙ словарной строки с инлайн-разметкой (<b> и т.п.).
 * Использовать ТОЛЬКО для ключей из словаря i18n (наши собственные строки),
 * никогда — для пользовательского/данных контента.
 */
export function T({ k }: { k: string }) {
  return <span dangerouslySetInnerHTML={{ __html: t(k) }} />
}
