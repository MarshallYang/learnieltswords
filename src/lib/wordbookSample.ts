import type { Word } from '../types'

const SEEN_KEY = 'learnieltswords:wordbook-seen'
export const WORDBOOK_PAGE_SIZE = 200

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function loadSeenIds(): Set<number> {
  try {
    const raw = localStorage.getItem(SEEN_KEY)
    if (!raw) return new Set()
    const arr = JSON.parse(raw) as number[]
    return new Set(Array.isArray(arr) ? arr.filter((n) => typeof n === 'number') : [])
  } catch {
    return new Set()
  }
}

export function saveSeenIds(ids: Set<number>) {
  localStorage.setItem(SEEN_KEY, JSON.stringify([...ids]))
}

/** Prefer unseen words; if not enough, fill from already-seen. When pool exhausted, reset cycle. */
export function sampleWordBatch(
  pool: Word[],
  seen: Set<number>,
  size = WORDBOOK_PAGE_SIZE,
): { batch: Word[]; nextSeen: Set<number>; resetCycle: boolean } {
  if (pool.length === 0) {
    return { batch: [], nextSeen: seen, resetCycle: false }
  }

  const n = Math.min(size, pool.length)
  let workingSeen = new Set(seen)
  const poolIds = new Set(pool.map((w) => w.id))

  // Drop seen ids that are outside current filter pool (keeps set smaller)
  // but keep global history of shown words within pool
  let unseen = pool.filter((w) => !workingSeen.has(w.id))
  let resetCycle = false

  if (unseen.length === 0) {
    // All filtered words already shown — start a new cycle
    workingSeen = new Set([...workingSeen].filter((id) => !poolIds.has(id)))
    unseen = [...pool]
    resetCycle = true
  }

  const seenInPool = pool.filter((w) => workingSeen.has(w.id))
  const pickUnseen = shuffle(unseen)
  const batch: Word[] = []

  for (const w of pickUnseen) {
    if (batch.length >= n) break
    batch.push(w)
  }
  if (batch.length < n) {
    for (const w of shuffle(seenInPool)) {
      if (batch.length >= n) break
      if (batch.some((b) => b.id === w.id)) continue
      batch.push(w)
    }
  }

  const nextSeen = new Set(workingSeen)
  for (const w of batch) nextSeen.add(w.id)

  return { batch: shuffle(batch), nextSeen, resetCycle }
}
