import type { CardProgress, Rating, CardStatus } from '../types'

const DAY = 24 * 60 * 60 * 1000

export function createNewCard(wordId: number): CardProgress {
  return {
    wordId,
    status: 'new',
    ease: 2.5,
    interval: 0,
    repetitions: 0,
    due: Date.now(),
    lapses: 0,
  }
}

/**
 * SM-2 style scheduling (simplified, daily-trainer friendly).
 * Ratings: 1=忘记 2=困难 3=认识 4=简单
 */
export function schedule(card: CardProgress, rating: Rating, now = Date.now()): CardProgress {
  let { ease, interval, repetitions, lapses, status } = card

  if (rating === 1) {
    // Again
    repetitions = 0
    interval = 0
    ease = Math.max(1.3, ease - 0.2)
    lapses += 1
    status = 'learning'
    return {
      ...card,
      ease,
      interval,
      repetitions,
      lapses,
      status,
      due: now + 10 * 60 * 1000, // 10 min
      lastReviewed: now,
    }
  }

  // Successful recall
  if (repetitions === 0) {
    interval = rating === 2 ? 0.5 : rating === 3 ? 1 : 2
  } else if (repetitions === 1) {
    interval = rating === 2 ? 1 : rating === 3 ? 3 : 4
  } else {
    const factor = rating === 2 ? ease - 0.15 : rating === 3 ? ease : ease + 0.15
    interval = Math.max(1, Math.round(interval * Math.max(1.3, factor) * 10) / 10)
  }

  repetitions += 1

  if (rating === 2) ease = Math.max(1.3, ease - 0.15)
  else if (rating === 3) ease = ease + 0.0
  else ease = ease + 0.15

  if (interval >= 21 && repetitions >= 5) status = 'mastered'
  else if (interval >= 1) status = 'review'
  else status = 'learning'

  return {
    ...card,
    ease,
    interval,
    repetitions,
    status: status as CardStatus,
    due: now + interval * DAY,
    lastReviewed: now,
  }
}

export function isDue(card: CardProgress, now = Date.now()): boolean {
  if (card.status === 'new') return false
  return card.due <= now
}

export function todayKey(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
