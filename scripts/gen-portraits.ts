/**
 * Task 18 — v1.2 «Ремастер портретов».
 * Генерирует painterly-портреты NPC через z-ai-web-dev-sdk (ТОЛЬКО бэкенд),
 * ресайзит sharp'ом до 256×256 и кладёт в public/images/portraits/.
 *
 * Использование: bun scripts/gen-portraits.ts [slug1 slug2 ...]
 * Без аргументов — все недостающие. Идемпотентен: существующие файлы скипает.
 */
import ZAI from 'z-ai-web-dev-sdk'
import sharp from 'sharp'
import fs from 'fs'
import path from 'path'

const OUT_DIR = path.join(process.cwd(), 'public', 'images', 'portraits')

/** Единый стиль пакета (GDD 04: «тёмный силуэт + акцентный цвет фракции»). */
const STYLE =
  'dark fantasy game character portrait bust, oil painting style, visible painterly brushstrokes, ' +
  'muted earthy palette, dramatic warm candlelight, dark smoky background with vignette, ' +
  'head-and-shoulders framing facing viewer, AAA RPG concept art quality, ' +
  'The Witcher 3 and Dragon Age Inquisition style, highly detailed, no text, no watermark'

type Spec = { slug: string; prompt: string }

const SPECS: Spec[] = [
  // ---------- Хеймхолл (хаб) ----------
  {
    slug: 'bjorn',
    prompt:
      'weathered elder chieftain of a frontier keep, long grey beard, stern but kind eyes, ' +
      'golden circlet headband with a small sun disc, fur cloak over broad shoulders, warm amber-gold accents',
  },
  {
    slug: 'grim',
    prompt:
      'shrewd traveling merchant man, trimmed copper-red beard, dark hood pushed back, ' +
      'single gold coin earring, sly knowing grin, worn leather vest with pouches, brass-yellow accents',
  },
  {
    slug: 'dorn',
    prompt:
      'scarred veteran drill-master, iron helmet with a short crest, old scar across cheek, ' +
      'greying stubble, hard judging gaze, padded gambeson, dusty bronze-brown accents',
  },
  {
    slug: 'irma',
    prompt:
      'resolute woman captain of a flame knight order, iron helmet with flame-orange plume, ' +
      'fierce noble gaze, order collar with flame sigil, ember orange accents',
  },
  {
    slug: 'selena',
    prompt:
      'enigmatic moon priestess archmage, face half-hidden in deep hood shadow, ' +
      'glowing crescent moon mark on forehead, pale skin, violet arcane mist, muted purple accents',
  },
  {
    slug: 'kaya',
    prompt:
      'young traveling magister woman, long moss-green hair, thin silver diadem, ' +
      'curious bright eyes, sage-green traveler cloak with a faint spark mote, soft green accents',
  },
  {
    slug: 'thorvald',
    prompt:
      'grizzled veteran warrior of the bastion, grey-streaked braided beard, battered helmet band, ' +
      'weathered calm face, olive-green cloak over mail, moss-olive accents',
  },
  {
    slug: 'alra',
    prompt:
      'middle-aged herbalist alchemist woman, pointed felt hat, braid over shoulder, ' +
      'sharp practical eyes, small green glass vial earring, herb-stained apron, sage-green accents',
  },
  // ---------- Гранитная Долина ----------
  {
    slug: 'khran',
    prompt:
      'gaunt ascetic keeper of a crystalline barrier, shaved head with runic tattoos, ' +
      'pale lavender crystal glow lighting the face from below, distant obsessed stare, amethyst accents',
  },
  {
    slug: 'kassia',
    prompt:
      'flamboyant pit-fight hostess, theatrical makeup, golden dress with geometric collar, ' +
      'sly confident smile, gaudy rings, gilded gold accents',
  },
  {
    slug: 'brok',
    prompt:
      'burly colony blacksmith, soot-stained heavy apron, scorched forearm, soot smudges on face, ' +
      'blunt honest expression, burnt-orange scarf, ember rust accents',
  },
  {
    slug: 'yorv',
    prompt:
      'austere ash order officer, dark high-collar uniform with ember-red trim, short beard, ' +
      'ash dust on cheekbones, rigid disciplined stare, ash-grey and ember accents',
  },
  {
    slug: 'liara',
    prompt:
      'young grove acolyte woman, braided crown of chestnut hair, gentle hopeful face, ' +
      'leaf-green robe with vine embroidery, sap-green accents',
  },
  {
    slug: 'finn',
    prompt:
      'roguish free-ranger crossbowman, tricorn hat, stubble, cocky smirk, ' +
      'layered leather gear with brass buckles, sand-brass accents',
  },
  {
    slug: 'pit_master',
    prompt:
      'hulking arena pit master, bare scarred torso, broken nose, bronze torque collar, ' +
      'heavy chain over shoulder, predatory grin, tarnished bronze accents',
  },
  // ---------- Стылое Пределье ----------
  {
    slug: 'einar',
    prompt:
      'ancient skald storyteller, one blind milky eye, long white braided beard, ' +
      'runic staff, heavy wool robes with knotwork clasp, frosty brass accents',
  },
  {
    slug: 'ingrid',
    prompt:
      'hardy northern huntress, fur-lined hood with frost on lashes, sharp grey eyes, ' +
      'short bow over shoulder, wind-chapped cheeks, icy sage accents',
  },
  // ---------- Багровая Мара ----------
  {
    slug: 'meira',
    prompt:
      'woman commander of a besieged bastion, golden pauldron, winged helmet carried under arm, ' +
      'red-blonde braid, tired unbending resolve, gilded gold accents',
  },
  {
    slug: 'dozent_holt',
    prompt:
      'feverish plague scholar, respirator mask hanging around neck, magnifying monocle, ' +
      'violet-stained gloves, notebooks under arm, obsessed bloodshot eyes, bruise-violet accents',
  },
  // ---------- Спорные Земли ----------
  {
    slug: 'ulva',
    prompt:
      'grove keeper woman, crown of woven living branches with small blooms, warm brown skin, ' +
      'serene ancient eyes, moss-green robes, living green accents',
  },
  {
    slug: 'prusha',
    prompt:
      'plump refugee baker woman, flour-dusted apron, simple headscarf, warm tired smile, ' +
      'flour on hands, honey-gold accents',
  },
  {
    slug: 'tarben',
    prompt:
      'weathered moorland pathfinder, leathery sun-baked skin, wide-brim travel hat, ' +
      'heather sprig on bandolier, squinting cautious gaze, dry heather-bronze accents',
  },
  {
    slug: 'gharz',
    prompt:
      'brutal raider warlord of an ash horde, horned helm with fang trophy, coal-dark skin smudged with ash, ' +
      'glowing ember eyes, blood-crimson banner cloth over shoulder, crimson accents',
  },
  // ---------- Внешний Рубеж (Фаза 6.5) ----------
  {
    slug: 'asher',
    prompt:
      'worn mechanic engineer of a crashed starship, grease-stained hands, patchwork tech armor over a coat, ' +
      'scruffy beard, tired amber eyes that still hope, wrench on belt, faint teal neon glow from tools, sand-brass accents',
  },
  // ---------- Финал ----------
  {
    slug: 'devourer',
    prompt:
      'colossal floating void entity, horned storm-golem silhouette, mask-like featureless face, ' +
      'slit lightning eyes, tendrils of purple rift energy, memory-fracture shards orbiting, ' +
      'arcane violet accents, non-human',
  },
]

async function genOne(zai: Awaited<ReturnType<typeof ZAI.create>>, spec: Spec): Promise<string> {
  const out1024 = path.join(OUT_DIR, `${spec.slug}-1024.png`)
  const out256 = path.join(OUT_DIR, `${spec.slug}.png`)
  if (fs.existsSync(out256)) return 'skip'

  let lastErr = ''
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await zai.images.generations.create({
        prompt: `${spec.prompt}, ${STYLE}`,
        size: '1024x1024',
      })
      const b64 = res?.data?.[0]?.base64
      if (!b64) throw new Error('empty base64')
      const buf = Buffer.from(b64, 'base64')
      fs.writeFileSync(out1024, buf)
      // 256×256 — контейнер в UI 96×80, запас на retina
      await sharp(out1024).resize(256, 256, { fit: 'cover' }).png({ quality: 90 }).toFile(out256)
      fs.unlinkSync(out1024)
      return `ok ${(fs.statSync(out256).size / 1024).toFixed(0)}KB`
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
  const queue = only.length ? SPECS.filter((s) => only.includes(s.slug)) : SPECS
  const zai = await ZAI.create()
  let done = 0
  const failures: string[] = []
  for (const spec of queue) {
    const r = await genOne(zai, spec)
    done++
    console.log(`[${done}/${queue.length}] ${spec.slug}: ${r}`)
    if (r.startsWith('FAIL')) failures.push(spec.slug)
  }
  console.log(failures.length ? `FAILURES: ${failures.join(', ')}` : 'ALL DONE')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
