/**
 * v1.7 «Локализация II» — инвентаризация переводимых строк диалогов.
 * Извлекает ВСЕ строки из data/dialogues.ts (тексты узлов, варианты,
 * теги, метки проверок, спикеры, роли) и сверяет со словарём EN.
 * Пропуски пишет в .i18n-inv/group-{1..4}.json для агентов-переводчиков.
 *
 * Запуск: bun scripts/i18n-inv-dialogues.ts
 */
import { writeFileSync, mkdirSync } from 'fs'
import { DIALOGUES, PORTRAITS } from '../src/lib/game/data/dialogues'
import { EN } from '../src/lib/game/data/i18n-en'

type Entry = { key: string; ctx: string }

// Группы по доменам (диапазоны деревьев)
const GROUPS: Record<string, string[]> = {
  '1': ['notice_board', 'alchemist_alra', 'elder_bjorn', 'merchant_grim', 'trainer_dorn', 'recruit_flame', 'recruit_mist', 'stones_kaya', 'stones_torvald', 'altar'],
  '2': ['barrier', 'judgment_devourer', 'shard_barrier', 'granite_warden', 'pit_keeper', 'smith_brock', 'join_order', 'join_coven', 'join_watch', 'pit_intro'],
  '3': ['frost_einar', 'frost_ingrid', 'frost_slab', 'mara_meira', 'mara_holt', 'mara_horn'],
  '4': ['disputed_ulva', 'disputed_gharz', 'disputed_prusha', 'disputed_tarben', 'disputed_seed', 'rubezh_asher', 'rubezh_log'],
}

const out: Record<string, Entry[]> = { '1': [], '2': [], '3': [], '4': [] }
const seen = new Set<string>()

function groupOf(treeId: string): string {
  for (const [g, ids] of Object.entries(GROUPS)) if (ids.includes(treeId)) return g
  return '1'
}

function push(group: string, key: string, ctx: string) {
  if (!key || typeof key !== 'string') return
  if (seen.has(key)) return
  seen.add(key)
  // есть запись в словаре (включая identity «???»: '???') — не переводим повторно
  if (EN[key] !== undefined) return
  out[group].push({ key, ctx })
}

for (const [treeId, tree] of Object.entries(DIALOGUES)) {
  const g = groupOf(treeId)
  for (const [nodeId, node] of Object.entries(tree.nodes)) {
    push(g, node.speaker, `${treeId}.${nodeId}.speaker`)
    if (node.role) push(g, node.role, `${treeId}.${nodeId}.role`)
    push(g, node.text, `${treeId}.${nodeId}.text`)
    for (const c of node.choices) {
      push(g, c.text, `${treeId}.${nodeId}.choice`)
      if (c.tag) push(g, c.tag, `${treeId}.${nodeId}.tag`)
      if (c.check?.label) push(g, c.check.label, `${treeId}.${nodeId}.check`)
    }
  }
}

// Спикеры + титулы портретов (отображаются в оверлее)
for (const [name, p] of Object.entries(PORTRAITS)) {
  push('1', name, 'PORTRAITS.speaker')
  push('1', p.title, 'PORTRAITS.title')
}

mkdirSync('.i18n-inv', { recursive: true })
let total = 0
for (const g of ['1', '2', '3', '4']) {
  writeFileSync(`.i18n-inv/group-${g}.json`, JSON.stringify(out[g], null, 2))
  console.log(`group-${g}: ${out[g].length} строк`)
  total += out[g].length
}
console.log(`Итого НЕ в словаре: ${total}`)
