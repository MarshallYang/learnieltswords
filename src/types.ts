export type Tier = 'foundation' | 'core' | 'advanced'
export type CardStatus = 'new' | 'learning' | 'review' | 'mastered'
export type Rating = 1 | 2 | 3 | 4 // 忘记 / 困难 / 认识 / 简单

export interface Word {
  id: number
  word: string
  phonetic?: string
  meaningZh: string
  pos?: string
  exampleEn?: string
  /** Optional remote pronunciation URL from dictionary API */
  audioUrl?: string
  tier: Tier
}

export interface CardProgress {
  wordId: number
  status: CardStatus
  ease: number
  interval: number // days
  repetitions: number
  due: number // timestamp ms
  lastReviewed?: number
  lapses: number
}

export interface Settings {
  newPerDay: 10 | 15 | 20 | 30 | 40 | 50 | 60 | 70
  theme: 'light' | 'dark' | 'system'
  onboardingDone: boolean
}

export interface DailyStats {
  date: string // YYYY-MM-DD local
  newLearned: number
  reviewsDone: number
  ratings: Record<Rating, number>
}

export interface AppState {
  version: 1
  cards: Record<number, CardProgress>
  settings: Settings
  streak: number
  lastStudyDate: string | null
  daily: DailyStats
  history: { date: string; reviews: number; newCount: number }[]
}
