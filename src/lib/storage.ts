import type { AppState, DailyStats, Settings } from '../types'
import { todayKey } from './srs'

const LEGACY_KEY = 'learnieltswords:v1'
const ACTIVE_USER_KEY = 'learnieltswords:active-user'
const USERS_KEY = 'learnieltswords:users'
const DEFAULT_USER = 'Matthew'

function progressKey(username: string) {
  return `learnieltswords:progress:${normalizeUser(username)}`
}

export function normalizeUser(name: string): string {
  return name.trim().replace(/\s+/g, ' ').slice(0, 32) || DEFAULT_USER
}

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

function rolloverDaily(parsed: AppState): AppState {
  const today = todayKey()
  if (parsed.daily?.date === today) return parsed
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
  return parsed
}

function normalizeState(parsed: AppState | null | undefined): AppState {
  if (!parsed || parsed.version !== 1) return defaultState()
  const next = rolloverDaily({
    ...defaultState(),
    ...parsed,
    settings: { ...defaultSettings, ...parsed.settings },
    cards: parsed.cards || {},
    history: parsed.history || [],
    daily: parsed.daily || emptyDaily(),
  })
  return next
}

export function listUsers(): string[] {
  try {
    const raw = localStorage.getItem(USERS_KEY)
    const arr = raw ? (JSON.parse(raw) as string[]) : []
    const set = new Set((Array.isArray(arr) ? arr : []).map(normalizeUser).filter(Boolean))
    const active = getActiveUser()
    set.add(active)
    return [...set].sort((a, b) => a.localeCompare(b, 'zh'))
  } catch {
    return [getActiveUser()]
  }
}

function saveUsers(users: string[]) {
  const uniq = [...new Set(users.map(normalizeUser).filter(Boolean))]
  localStorage.setItem(USERS_KEY, JSON.stringify(uniq))
}

export function getActiveUser(): string {
  try {
    const u = localStorage.getItem(ACTIVE_USER_KEY)
    if (u) return normalizeUser(u)
  } catch {
    /* ignore */
  }
  return DEFAULT_USER
}

export function setActiveUser(username: string) {
  const u = normalizeUser(username)
  localStorage.setItem(ACTIVE_USER_KEY, u)
  const users = listUsers()
  if (!users.includes(u)) saveUsers([...users, u])
  else saveUsers(users)
}

/** Migrate legacy single-key progress into the default user once. */
function migrateLegacyIfNeeded(username: string) {
  const key = progressKey(username)
  if (localStorage.getItem(key)) return
  const legacy = localStorage.getItem(LEGACY_KEY)
  if (!legacy) return
  // Only migrate into default user to avoid copying into every profile
  if (normalizeUser(username) === DEFAULT_USER) {
    localStorage.setItem(key, legacy)
  }
}

export function loadState(username = getActiveUser()): AppState {
  try {
    const u = normalizeUser(username)
    migrateLegacyIfNeeded(u)
    const raw = localStorage.getItem(progressKey(u))
    if (!raw) return defaultState()
    return normalizeState(JSON.parse(raw) as AppState)
  } catch {
    return defaultState()
  }
}

export function saveState(state: AppState, username = getActiveUser()): void {
  const u = normalizeUser(username)
  setActiveUser(u)
  localStorage.setItem(progressKey(u), JSON.stringify(state))
}

export function resetProgress(keepSettings = true, username = getActiveUser()): AppState {
  const prev = loadState(username)
  const next = defaultState()
  if (keepSettings) {
    next.settings = { ...prev.settings, onboardingDone: true }
  }
  saveState(next, username)
  return next
}

export function switchUser(username: string): AppState {
  setActiveUser(username)
  return loadState(username)
}

export type ProgressFile = {
  app: 'learnieltswords'
  formatVersion: 1
  username: string
  exportedAt: string
  state: AppState
}

export function buildProgressFile(username: string, state: AppState): ProgressFile {
  return {
    app: 'learnieltswords',
    formatVersion: 1,
    username: normalizeUser(username),
    exportedAt: new Date().toISOString(),
    state,
  }
}

export function downloadProgressFile(username: string, state: AppState) {
  const file = buildProgressFile(username, state)
  const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const safe = normalizeUser(username).replace(/[^\w\u4e00-\u9fff-]+/g, '_')
  a.href = url
  a.download = `ielts-progress-${safe}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function parseProgressFile(raw: string): ProgressFile {
  const data = JSON.parse(raw) as ProgressFile
  if (!data || data.app !== 'learnieltswords' || data.formatVersion !== 1 || !data.state) {
    // allow bare AppState for convenience
    const maybe = JSON.parse(raw) as AppState
    if (maybe?.version === 1 && maybe.cards) {
      return {
        app: 'learnieltswords',
        formatVersion: 1,
        username: getActiveUser(),
        exportedAt: new Date().toISOString(),
        state: normalizeState(maybe),
      }
    }
    throw new Error('无效的进度文件')
  }
  return {
    ...data,
    username: normalizeUser(data.username || getActiveUser()),
    state: normalizeState(data.state),
  }
}

export async function importProgressFromFile(file: File): Promise<{ username: string; state: AppState }> {
  const text = await file.text()
  const parsed = parseProgressFile(text)
  saveState(parsed.state, parsed.username)
  setActiveUser(parsed.username)
  return { username: parsed.username, state: parsed.state }
}

export function applyTheme(theme: Settings['theme']) {
  const root = document.documentElement
  const preferDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const dark = theme === 'dark' || (theme === 'system' && preferDark)
  root.classList.toggle('dark', dark)
}
