#!/usr/bin/env node
/**
 * Enrich words.json: IELTS-oriented meaningZh + Academic exampleEn for all 7500 entries.
 * Optional dictionaryapi.dev (ENRICH_API=1) + solid local generator.
 * Batched checkpoints; atomic write; validates length and non-empty fields.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const WORDS_PATH = path.join(ROOT, 'src/data/words.json')
const CHECKPOINT = path.join(ROOT, 'scripts/.enrich-checkpoint.json')
const REPORT = path.join(ROOT, 'scripts/.enrich-report.json')
const BATCH = 250
const USE_API = process.env.ENRICH_API === '1'

const PHRASES = [
  'climate change mitigation',
  'higher education reform',
  'public health policy',
  'urban planning',
  'digital technology',
  'economic development',
  'cultural heritage',
  'scientific research',
  'environmental protection',
  'labour market trends',
  'renewable energy',
  'media literacy',
  'international trade',
  'mental well-being',
  'sustainable agriculture',
  'academic writing',
  'biodiversity loss',
  'infrastructure investment',
  'social inequality',
  'data privacy',
]

const POS_RE = /(n|v|vt|vi|adj|adv|prep|conj|pron|num|int|aux)\.?/i

function hash(s) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function pick(arr, seed) {
  return arr[seed % arr.length]
}

function cjkLen(s) {
  return (s.match(/[\u4e00-\u9fff]/g) || []).length
}

function esc(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function normPos(p) {
  if (!p) return ''
  let x = String(p).toLowerCase().replace(/\s+/g, '')
  if (!x.endsWith('.')) x += '.'
  if (x === 'vt.' || x === 'vi.') return 'v.'
  return x
}

function decode(s) {
  return String(s || '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

/** Exam-oriented gloss: `v. 放弃；抛弃` style, ~40 CJK cap. */
export function compressMeaningZh(raw, posHint) {
  let s = decode(raw)
    .replace(/<[^>]+>/g, '')
    .replace(/【[^】]*】/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!s) return `${posHint ? normPos(posHint) + ' ' : ''}（释义）`

  s = s.replace(/[;；]+/g, '；')
  const lead = s.match(/^((?:(?:n|v|vt|vi|adj|adv|prep|conj|pron|num|int|aux)\.?\s*(?:&|\/|,|，)?\s*)+)/i)
  let pos = ''
  let body = s
  if (lead) {
    const f = lead[1].match(POS_RE)
    pos = normPos(f ? f[0] : '')
    body = s.slice(lead[0].length).trim()
  } else if (posHint) {
    pos = normPos(posHint)
  }

  // Drop secondary POS dumps
  body = body.replace(/\s+(?:n|v|vt|vi|adj|adv|prep|conj|pron|num|int|aux)\.?\s+.*$/i, '').trim()

  let parts = body
    .split(/；/)
    .map((p) => p.trim())
    .filter(Boolean)
  if (parts.length === 1 && cjkLen(parts[0]) > 34) {
    const by = parts[0]
      .split(/，/)
      .map((p) => p.trim())
      .filter(Boolean)
    if (by.length >= 2) parts = by
  }

  const junk = /迷幻|毒品|俚语|口语|脏话|色情/
  const kept = []
  let n = 0
  for (let p of parts) {
    if (junk.test(p)) continue
    p = p
      .replace(/（[^）]*）/g, '')
      .replace(/\([^)]*\)/g, '')
      .replace(/\[[^\]]*\]/g, '')
      .replace(/[，、；：\s]+$/g, '')
      .trim()
    if (!p || cjkLen(p) < 1) continue
    if (kept.length >= 3) break
    if (kept.length > 0 && n + cjkLen(p) > 40) break
    if (cjkLen(p) > 22) p = p.split(/[，、]/)[0]
    if (cjkLen(p) > 22) {
      p = (p.match(/[\u4e00-\u9fff]/g) || []).slice(0, 22).join('')
    }
    kept.push(p)
    n += cjkLen(p)
    if (n >= 32 && kept.length >= 2) break
  }
  if (!kept.length) {
    const fb = body
      .replace(/（[^）]*）/g, '')
      .replace(/\([^)]*\)/g, '')
      .trim()
    const m = fb.match(/[\u4e00-\u9fff]{1,24}/)
    kept.push(m ? m[0] : '（释义）')
  }
  return `${pos ? pos + ' ' : ''}${kept.join('；')}`.replace(/\s+/g, ' ').trim()
}

function inferPos(entry) {
  const m = String(entry.meaningZh || '').match(POS_RE)
  const f = (entry.pos || '').toLowerCase().replace(/\./g, '')
  const mm = m ? m[1].toLowerCase() : ''
  const r =
    mm && f && mm.replace(/\./, '') !== f && ['v', 'vt', 'vi', 'adj', 'adv'].includes(mm)
      ? mm
      : f || mm || 'n'
  if (r.startsWith('vt') || r.startsWith('vi') || r === 'v') return 'v'
  if (r.startsWith('adj')) return 'adj'
  if (r.startsWith('adv')) return 'adv'
  if (r.startsWith('prep')) return 'prep'
  if (r.startsWith('conj')) return 'conj'
  return 'n'
}

function generateExample(word, pos, seed) {
  const phrase = pick(PHRASES, seed)
  const w = word
  if (w.length > 15 || /[A-Z]/.test(w.slice(1)) || !/^[a-z][a-z\-']*$/i.test(w)) {
    return pick(
      [
        `In IELTS Listening lectures, candidates may hear "${w}" in talks about ${phrase}.`,
        `Reading passages on ${phrase} sometimes include the expression "${w}".`,
        `Learners should note "${w}" as a useful phrase when writing about ${phrase}.`,
      ],
      seed,
    )
  }
  const T = {
    n: [
      `Researchers argue that ${w} plays a critical role in ${phrase}.`,
      `The lecture explained how ${w} influences ${phrase} across different societies.`,
      `A clearer understanding of ${w} strengthens essays on ${phrase}.`,
      `Policymakers often overlook ${w} when designing programmes for ${phrase}.`,
      `Empirical studies link ${w} to measurable outcomes in ${phrase}.`,
      `The essay evaluates competing definitions of ${w} in debates on ${phrase}.`,
      `Understanding ${w} is essential when assessing claims about ${phrase}.`,
      `Recent reports treat ${w} as an important factor in ${phrase}.`,
      `Discussions of ${phrase} frequently refer to ${w} as supporting evidence.`,
      `Students should analyse how ${w} relates to ${phrase} in Task 2 essays.`,
    ],
    v: [
      `Governments should ${w} resources carefully to improve ${phrase}.`,
      `Universities that ${w} student feedback often enhance ${phrase} outcomes.`,
      `It remains challenging to ${w} complex evidence concerning ${phrase}.`,
      `Experts ${w} that long-term planning is vital for ${phrase}.`,
      `Many cities ${w} innovative policies connected with ${phrase}.`,
      `Researchers ${w} alternative models when investigating ${phrase}.`,
      `Policy makers must ${w} thoroughly before reforming ${phrase}.`,
      `Communities that ${w} local knowledge can strengthen ${phrase}.`,
    ],
    adj: [
      `A more ${w} approach to ${phrase} could reduce long-term risks.`,
      `The report describes ${w} differences in access to ${phrase}.`,
      `Maintaining ${w} standards is essential for progress in ${phrase}.`,
      `Evidence suggests ${w} changes in ${phrase} over recent decades.`,
      `An overly ${w} framework may oversimplify debates about ${phrase}.`,
      `Scholars present a ${w} perspective on ${phrase} in recent journals.`,
      `The case study recorded ${w} reactions among participants discussing ${phrase}.`,
      `Developing ${w} systems remains a priority within ${phrase} research.`,
    ],
    adv: [
      `Funding for ${phrase} has ${w} declined in several major economies.`,
      `The experiment ${w} confirmed earlier conclusions about ${phrase}.`,
      `Urban lifestyles have ${w} altered patterns associated with ${phrase}.`,
      `Scholars ${w} disagree about the main causes of ${phrase}.`,
      `Guidelines on ${phrase} were ${w} revised after new findings emerged.`,
      `Results ${w} support arguments linking education quality to ${phrase}.`,
    ],
    prep: [
      `Investment ${w} ${phrase} has increased according to recent surveys.`,
      `Debate ${w} ${phrase} dominated the academic conference last year.`,
      `Collaboration ${w} universities can accelerate advances in ${phrase}.`,
    ],
    conj: [
      `Cities expand rapidly, ${w} funding for ${phrase} often remains insufficient.`,
      `Evidence is mixed, ${w} many researchers still defend this account of ${phrase}.`,
    ],
  }
  const list = T[pos] || T.n
  const fit = list.filter((t) => {
    const n = t.split(/\s+/).length
    return n >= 12 && n <= 28
  })
  return pick(fit.length ? fit : list, seed)
}

function keepExisting(ex, word) {
  if (!ex || !String(ex).trim()) return false
  const s = String(ex).trim()
  const wc = s.split(/\s+/).length
  if (wc < 12 || wc > 36) return false
  if (!new RegExp(esc(word), 'i').test(s)) return false
  if (/^(this is an example|the word |an example of)/i.test(s)) return false
  return true
}

async function fetchApi(word) {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 3500)
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
      { signal: ctrl.signal, headers: { Accept: 'application/json' } },
    )
    clearTimeout(t)
    if (!res.ok) return { example: null, audioUrl: null }
    const data = await res.json()
    if (!Array.isArray(data) || !data[0]) return { example: null, audioUrl: null }
    let example = null
    let audioUrl = null
    for (const entry of data) {
      if (!audioUrl) {
        for (const p of entry.phonetics || []) {
          if (p.audio && /^https?:/.test(p.audio)) {
            audioUrl = p.audio
            break
          }
        }
      }
      for (const m of entry.meanings || []) {
        for (const d of m.definitions || []) {
          if (!d.example) continue
          const wc = d.example.split(/\s+/).length
          if (
            wc >= 10 &&
            wc <= 28 &&
            new RegExp(`\\b${esc(word)}\\b`, 'i').test(d.example) &&
            !/\b(gonna|wanna|kids|lol)\b/i.test(d.example)
          ) {
            example = d.example
            break
          }
        }
        if (example) break
      }
      if (example) break
    }
    return { example, audioUrl }
  } catch {
    return { example: null, audioUrl: null }
  }
}

function atomicWrite(filePath, data) {
  const tmp = filePath + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n')
  fs.renameSync(tmp, filePath)
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function main() {
  const words = JSON.parse(fs.readFileSync(WORDS_PATH, 'utf8'))
  if (!Array.isArray(words) || words.length !== 7500) {
    console.error('Expected 7500 words, got', words?.length)
    process.exit(1)
  }

  const beforeExamples = words.filter((w) => w.exampleEn?.trim()).length
  console.log(`Loaded ${words.length}; examples before: ${beforeExamples}; USE_API=${USE_API}`)

  const stats = {
    meaningFixed: 0,
    localGenerated: 0,
    keptExisting: 0,
    apiExamples: 0,
    audioUrls: 0,
  }

  for (let i = 0; i < words.length; i += BATCH) {
    const end = Math.min(i + BATCH, words.length)
    for (let j = i; j < end; j++) {
      const entry = words[j]
      const before = entry.meaningZh
      entry.meaningZh = compressMeaningZh(entry.meaningZh, entry.pos)
      if (entry.meaningZh !== before) stats.meaningFixed++

      const seed = hash(entry.word + ':' + entry.id)
      const pos = inferPos(entry)

      let kept = keepExisting(entry.exampleEn, entry.word)
      if (USE_API && !kept && seed % 11 === 0) {
        const { example, audioUrl } = await fetchApi(entry.word)
        if (example) {
          entry.exampleEn = example
          kept = true
          stats.apiExamples++
        }
        if (audioUrl) {
          entry.audioUrl = audioUrl
          stats.audioUrls++
        }
        await sleep(80)
      }

      if (kept && keepExisting(entry.exampleEn, entry.word)) {
        stats.keptExisting++
      } else {
        entry.exampleEn = generateExample(entry.word, pos, seed)
        stats.localGenerated++
      }

      if (!entry.meaningZh?.trim()) entry.meaningZh = compressMeaningZh('', entry.pos)
      if (!entry.exampleEn?.trim()) entry.exampleEn = generateExample(entry.word, pos, seed)
    }

    if (end % 1000 === 0 || end === words.length) {
      atomicWrite(WORDS_PATH, words)
      fs.writeFileSync(CHECKPOINT, JSON.stringify({ nextIndex: end, ...stats }))
      console.log(`Checkpoint ${end}/${words.length}`, stats)
    } else {
      process.stdout.write(`\rProcessed ${end}/${words.length}`)
    }
  }

  const missingEx = words.filter((w) => !w.exampleEn?.trim()).length
  const missingZh = words.filter((w) => !w.meaningZh?.trim()).length
  if (words.length !== 7500 || missingEx || missingZh) {
    console.error('Validation failed', { len: words.length, missingEx, missingZh })
    process.exit(1)
  }

  atomicWrite(WORDS_PATH, words)
  try {
    fs.unlinkSync(CHECKPOINT)
  } catch {
    /* ignore */
  }

  const report = {
    beforeExamples,
    afterExamples: words.filter((w) => w.exampleEn?.trim()).length,
    ...stats,
    samples: [0, 1, 2, 100, 500, 3000, 4500, 6000, 7499].map((idx) => {
      const w = words[idx]
      return {
        id: w.id,
        word: w.word,
        pos: w.pos,
        meaningZh: w.meaningZh,
        exampleEn: w.exampleEn,
      }
    }),
  }
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2))
  console.log('\nDone.')
  console.log(JSON.stringify(report, null, 2))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
