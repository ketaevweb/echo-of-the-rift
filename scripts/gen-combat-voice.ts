/**
 * Task 20 — v1.4 «Озвучка боя».
 * Генерирует боевые реплики (барки) через z-ai-web-dev-sdk (ТОЛЬКО бэкенд)
 * и кладёт WAV в public/audio/combat/. Источник текстов — data/combatVoice.ts
 * (единый источник: UI и генератор читают одни и те же строки).
 *
 * Использование: bun scripts/gen-combat-voice.ts [id1 id2 ...]
 * Без аргументов — все недостающие. Идемпотентен: существующие файлы скипает.
 */
import ZAI from 'z-ai-web-dev-sdk'
import fs from 'fs'
import path from 'path'

const OUT_DIR = path.join(process.cwd(), 'public', 'audio', 'combat')

const VOICES = { male: 'xiaochen', female: 'tongtong' } as const

/** Барки — короткие, эмоциональные, «в темпе боя» (GDD 04 §4.3). */
type Spec = { id: string; voice: keyof typeof VOICES; text: string }

const SPECS: Spec[] = [
  // ---------- Кайя (женский голос) ----------
  { id: 'kaya-synergy-1', voice: 'female', text: 'Мороз и пламя!' },
  { id: 'kaya-synergy-2', voice: 'female', text: 'Славный взрыв, Смотритель!' },
  { id: 'kaya-down-1', voice: 'female', text: 'Я... не могу встать...' },
  { id: 'kaya-lowhp-1', voice: 'female', text: 'Ты слишком открыт! Береги себя!' },
  { id: 'kaya-lowhp-2', voice: 'female', text: 'Ты истекаешь кровью! Отступай!' },
  { id: 'kaya-boss-1', voice: 'female', text: 'Чувствуешь этот холод? Он не отсюда.' },
  { id: 'kaya-kill-1', voice: 'female', text: 'Быстро и чисто.' },
  { id: 'kaya-kill-2', voice: 'female', text: 'Учишься, да? Неплохо.' },
  // ---------- Торвальд (мужской голос) ----------
  { id: 'torvald-synergy-1', voice: 'male', text: 'Стена и молот!' },
  { id: 'torvald-synergy-2', voice: 'male', text: 'Вот это удар, парень!' },
  { id: 'torvald-down-1', voice: 'male', text: 'Щит... треснул...' },
  { id: 'torvald-lowhp-1', voice: 'male', text: 'Ты на ладан дышишь! За мою спину!' },
  { id: 'torvald-lowhp-2', voice: 'male', text: 'Кровь льёт! Прикройся щитом!' },
  { id: 'torvald-boss-1', voice: 'male', text: 'Держи строй! За мою спину!' },
  { id: 'torvald-kill-1', voice: 'male', text: 'Ха! Одним махом.' },
  { id: 'torvald-kill-2', voice: 'male', text: 'Так их, парень!' },
  // ---------- Боссы (угрозы при спавне) ----------
  { id: 'boss-devourer-1', voice: 'male', text: 'Ты — эхо. А я — гул, что стирает эхо.' },
  { id: 'boss-devourer-2', voice: 'male', text: 'Твой мир уже во мне.' },
  { id: 'boss-dragon-1', voice: 'male', text: 'Кто... тревожит... гнездо...' },
  { id: 'boss-gharz-1', voice: 'male', text: 'Мясо пришло само!' },
  { id: 'boss-gharz-2', voice: 'male', text: 'Семя сожрёт твой крик!' },
  { id: 'boss-pit-1', voice: 'male', text: 'Ещё мясо на мою арену!' },
  { id: 'boss-pit-2', voice: 'male', text: 'Умри красиво, крыса!' },
  { id: 'boss-blight-1', voice: 'female', text: 'Плоть... гниёт... и служит...' },
  { id: 'boss-ash-1', voice: 'female', text: 'Пепел к пеплу, мясо — к куче!' },
  { id: 'boss-captain-1', voice: 'male', text: 'Чужак на плато. Открываю огонь.' },
  { id: 'boss-captain-2', voice: 'male', text: 'Двенадцатый не отступает.' },
]

async function genOne(zai: Awaited<ReturnType<typeof ZAI.create>>, spec: Spec): Promise<string> {
  const out = path.join(OUT_DIR, `${spec.id}.wav`)
  if (fs.existsSync(out)) return 'skip'

  let lastErr = ''
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await zai.audio.tts.create({
        input: spec.text,
        voice: VOICES[spec.voice],
        speed: 1.0,
        response_format: 'wav',
        stream: false,
      })
      const arrayBuffer = await res.arrayBuffer()
      const buf = Buffer.from(new Uint8Array(arrayBuffer))
      if (buf.length < 512) throw new Error('пустой аудиофайл от SDK')
      fs.writeFileSync(out, buf)
      return `ok ${(buf.length / 1024).toFixed(0)}KB`
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e)
      if (attempt < 3) await new Promise((r) => setTimeout(r, 1500 * attempt))
    }
  }
  return `FAIL: ${lastErr}`
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  const only = process.argv.slice(2)
  const queue = only.length ? SPECS.filter((s) => only.includes(s.id)) : SPECS
  if (queue.length === 0) {
    console.error('Нет совпадений по id:', only.join(', '))
    process.exit(1)
  }
  const zai = await ZAI.create()
  let done = 0
  const failures: string[] = []
  for (const spec of queue) {
    const r = await genOne(zai, spec)
    done++
    console.log(`[${done}/${queue.length}] ${spec.id}: ${r}`)
    if (r.startsWith('FAIL')) failures.push(spec.id)
  }
  console.log(failures.length ? `FAILURES: ${failures.join(', ')}` : 'ALL DONE')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
