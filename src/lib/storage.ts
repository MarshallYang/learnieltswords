import type { AppState, DailyStats, Settings } from '../types'
import { todayKey } from './srs'

const KEY = 'learnieltswords:v1'

const defaultSettings: Settings = {
  newPerDay: 20,
  theme: 'system',
  onboardingDone: false,
}

function emptyDaily(date = todayKey()): DailyStats {
  return { date, newLearned: 0, reviewsDone: 0, ratings: { 1: 0, 2: 0, 3: 0, 4: 0 } }
}

export function defaultState(): AppState {
  return {
    version: 1,
    cards: {},
    settings: { ...defaultSettings },
    streak: 0,
    lastStudyDate: null,
    daily: emptyDaily(),
    history: [],
  }
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return defaultState()
    const parsed = JSON.parse(raw) as AppState
    if (!parsed || parsed.version !== 1) return defaultState()
    // rollover daily
    const today = todayKey()
    if (parsed.daily?.date !== today) {
      if (parsed.daily && (parsed.daily.reviewsDone > 0 || parsed.daily.newLearned > 0)) {
        parsed.history = [
          ...(parsed.history || []),
          {
            date: parsed.daily.date,
            reviews: parsed.daily.reviewsDone,
            newCount: parsed.daily.newLearned,
          },
        ].slice(-90)
      }
      parsed.daily = emptyDaily(today)
    }
    return {
      ...defaultState(),
      ...parsed,
      settings: { ...defaultSettings, ...parsed.settings },
      cards: parsed.cards || {},
      history: parsed.history || [],
      daily: parsed.daily || emptyDaily(),
    }
  } catch {
    return defaultState()
  }
}

export function saveState(state: AppState): void {
  localStorage.setItem(KEY, JSON.stringify(state))
}

export function resetProgress(keepSettings = true): AppState {
  const prev = loadState()
  const next = defaultState()
  if (keepSettings) {
    next.settings = { ...prev.settings, onboardingDone: true }
  }
  saveState(next)
  return next
}

export function applyTheme(theme: Settings['theme']) {
  const root = document.documentElement
  const preferDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const dark = theme === 'dark' || (theme === 'system' && preferDark)
  root.classList.toggle('dark', dark)
}
