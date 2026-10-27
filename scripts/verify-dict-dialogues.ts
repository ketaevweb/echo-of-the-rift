/**
 * v1.7 — верификатор словарной части диалогов.
 * Сверяет dict/dialogues-{g}.ts с инвентарём .i18n-inv/group-{g}.json:
 *  • 0 пропусков (каждый ключ инвентаря переведён);
 *  • 0 лишних (нет ключей вне инвентаря);
 *  • плейсхолдеры {x} сохранены;
 *  • предупреждения о коллизиях со словарём v1.6.
 * Запуск: bun scripts/verify-dict-dialogues.ts <1|2|3|4>
 */
export {} // модуль для tsc (top-level await допустим)

const g = process.argv[2]
if (!['1', '2', '3', '4'].includes(g)) {
  console.error('Usage: bun scripts/verify-dict-dialogues.ts <1|2|3|4>')
  process.exit(1)
}

const inv = (await import(`../.i18n-inv/group-${g}.json`)).default as { key: string; ctx: string }[]
const mod = await import(`../src/lib/game/data/dict/dialogues-${g}.ts`)
const dictName = `EN_DIALOGUES_${g}`
const dict = mod[dictName] as Record<string, string> | undefined
if (!dict) {
  console.error(`FAIL: экспорт ${dictName} не найден`)
  process.exit(1)
}

const invKeys = new Set(inv.map((e) => e.key))
const dictKeys = new Set(Object.keys(dict))
const missing = inv.filter((e) => !dictKeys.has(e.key))
const extra = [...dictKeys].filter((k) => !invKeys.has(k))
const empty = [...dictKeys].filter((k) => !dict[k].trim())

const ph = (s: string) => (s.match(/\{[^}]+\}/g) ?? []).sort().join(',')
const phBroken = inv.filter((e) => dictKeys.has(e.key) && ph(e.key) !== ph(dict[e.key]))

// Коллизии со словарём v1.6 (информационно)
const { EN } = await import('../src/lib/game/data/i18n-en')
const collisions = inv.filter((e) => {
  const old = EN[e.key]
  return old && old !== e.key && dict[e.key] !== old
})

console.log(`group-${g}: инвентарь ${inv.length}, словарь ${dictKeys.size}`)
console.log(`missing: ${missing.length}${missing.length ? ' → ' + missing.slice(0, 5).map((e) => e.key.slice(0, 40)).join(' | ') : ''}`)
console.log(`extra: ${extra.length}${extra.length ? ' → ' + extra.slice(0, 5).join(' | ') : ''}`)
console.log(`empty: ${empty.length}`)
console.log(`placeholder-broken: ${phBroken.length}`)
console.log(`collisions-with-v1.6: ${collisions.length}${collisions.length ? ' → ' + collisions.slice(0, 5).map((e) => e.key.slice(0, 30)).join(' | ') : ''}`)
const ok = missing.length === 0 && extra.length === 0 && empty.length === 0 && phBroken.length === 0
console.log(ok ? 'VERIFY_OK' : 'VERIFY_FAIL')
process.exit(ok ? 0 : 1)
