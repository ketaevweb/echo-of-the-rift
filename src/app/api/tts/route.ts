// ============================================================
// ЭХО РАЗЛОМА — TTS-роут (v1.1, GDD 04 §4.3)
// Озвучка ключевых реплик: z-ai-web-dev-sdk ТОЛЬКО здесь
// (бэкенд). 2 голоса: male → xiaochen, female → tongtong.
// Кэш WAV на диске db/tts-cache (sha1 от voice|text) —
// повторные реплики отдаются мгновенно без запроса к SDK.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { mkdir, readFile, writeFile } from 'fs/promises'
import path from 'path'

export const runtime = 'nodejs'

const CACHE_DIR = path.join(process.cwd(), 'db', 'tts-cache')
const MAX_LEN = 500
const VOICES = { male: 'xiaochen', female: 'tongtong' } as const

type VoiceKey = keyof typeof VOICES

export async function POST(req: NextRequest) {
  let body: { text?: unknown; voice?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 })
  }
  const text = typeof body.text === 'string' ? body.text.replace(/\s+/g, ' ').trim().slice(0, MAX_LEN) : ''
  const voice = body.voice === 'female' ? 'female' : body.voice === 'male' ? 'male' : null
  if (!text || text.length < 2 || !voice) {
    return NextResponse.json({ error: 'text (2..500) и voice (male|female) обязательны' }, { status: 400 })
  }

  const key = createHash('sha1').update(`${voice}|${text}`).digest('hex')
  const file = path.join(CACHE_DIR, `${key}.wav`)

  // 1) Дисковый кэш
  try {
    const hit = await readFile(file)
    return new NextResponse(new Uint8Array(hit), {
      status: 200,
      headers: { 'Content-Type': 'audio/wav', 'Content-Length': String(hit.length), 'X-TTS-Cache': 'hit' },
    })
  } catch {
    /* нет в кэше — генерируем */
  }

  // 2) Генерация через SDK (singleton) + страховочный таймаут 45 с
  try {
    const ZAI = (await import('z-ai-web-dev-sdk')).default
    const zai = await ZAI.create()
    const gen = zai.audio.tts.create({
      input: text,
      voice: VOICES[voice as VoiceKey],
      speed: 1.0,
      response_format: 'wav',
      stream: false,
    })
    const response = await Promise.race([
      gen,
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error('TTS timeout 45s')), 45000)),
    ])
    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(new Uint8Array(arrayBuffer))
    if (buffer.length < 512) {
      return NextResponse.json({ error: 'пустой аудиофайл от SDK' }, { status: 502 })
    }
    // Кэш на диск (не критично, если не удалось — приватный режим/RO)
    try {
      await mkdir(CACHE_DIR, { recursive: true })
      await writeFile(file, buffer)
    } catch {
      /* игнорируем */
    }
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: { 'Content-Type': 'audio/wav', 'Content-Length': String(buffer.length), 'X-TTS-Cache': 'miss' },
    })
  } catch (err) {
    console.error('TTS API Error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'TTS failed' }, { status: 502 })
  }
}
