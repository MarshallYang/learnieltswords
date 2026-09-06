import { useCallback, useEffect, useMemo, useState } from 'react'
import wordsData from '../data/words.json'
import type { AppState, Rating, Word, CardProgress } from '../types'
import {
  applyTheme,
  downloadProgressFile,
  getActiveUser,
  importProgressFromFile,
  listUsers,
  loadState,
  resetProgress,
  saveState,
  switchUser,
} from '../lib/storage'
import { createNewCard, isDue, schedule, todayKey } from '../lib/srs'

const words = wordsData as Word[]

export function useAppState() {
  const [username, setUsername] = useState(() => getActiveUser())
  const [state, setState] = useState<AppState>(() => loadState(getActiveUser()))
  const [users, setUsers] = useState<string[]>(() => listUsers())
  const [ready, setReady] = useState(false)

  useEffect(() => {
    applyTheme(state.settings.theme)
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready) return
    saveState(state, username)
    applyTheme(state.settings.theme)
  }, [state, ready, username])

  const wordMap = useMemo(() => {
    const m = new Map<number, Word>()
    for (const w of words) m.set(w.id, w)
    return m
  }, [])

  const persist = useCallback((updater: (s: AppState) => AppState) => {
    setState((prev) => updater(prev))
  }, [])

  const getCard = useCallback(
    (wordId: number): CardProgress => {
      return state.cards[wordId] ?? createNewCard(wordId)
    },
    [state.cards],
  )

  const dueCards = useMemo(() => {
    const now = Date.now()
    return Object.values(state.cards)
      .filter((c) => isDue(c, now))
      .sort((a, b) => a.due - b.due)
  }, [state.cards])

  const learnedIds = useMemo(() => new Set(Object.keys(state.cards).map(Number)), [state.cards])

  const newRemainingToday = Math.max(0, state.settings.newPerDay - state.daily.newLearned)

  const newQueue = useMemo(() => {
    const out: Word[] = []
    for (const w of words) {
      if (out.length >= newRemainingToday) break
      if (!learnedIds.has(w.id)) out.push(w)
    }
    return out
  }, [learnedIds, newRemainingToday])

  const masteredCount = useMemo(
    () => Object.values(state.cards).filter((c) => c.status === 'mastered').length,
    [state.cards],
  )

  const learnedCount = Object.keys(state.cards).length
  const masteryPct = words.length ? Math.round((masteredCount / words.length) * 1000) / 10 : 0

  const touchStreak = useCallback((s: AppState): AppState => {
    const today = todayKey()
    if (s.lastStudyDate === today) return s
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yKey = todayKey(yesterday)
    const streak = s.lastStudyDate === yKey ? s.streak + 1 : 1
    return { ...s, streak, lastStudyDate: today }
  }, [])

  const rateCard = useCallback(
    (wordId: number, rating: Rating, isNew: boolean) => {
      persist((s) => {
        let next = touchStreak(s)
        const prev = next.cards[wordId] ?? createNewCard(wordId)
        const updated = schedule(prev, rating)
        const cards = { ...next.cards, [wordId]: updated }
        const daily = { ...next.daily }
        daily.ratings = { ...daily.ratings, [rating]: (daily.ratings[rating] || 0) + 1 }
        if (isNew && prev.status === 'new') daily.newLearned += 1
        else daily.reviewsDone += 1
        return { ...next, cards, daily }
      })
    },
    [persist, touchStreak],
  )

  const updateSettings = useCallback(
    (partial: Partial<AppState['settings']>) => {
      persist((s) => ({ ...s, settings: { ...s.settings, ...partial } }))
    },
    [persist],
  )

  const finishOnboarding = useCallback(() => {
    updateSettings({ onboardingDone: true })
  }, [updateSettings])

  const doReset = useCallback(
    (keepSettings = true) => {
      setState(resetProgress(keepSettings, username))
    },
    [username],
  )

  const changeUser = useCallback((name: string) => {
    const next = switchUser(name)
    setUsername(getActiveUser())
    setState(next)
    setUsers(listUsers())
  }, [])

  const exportProgress = useCallback(() => {
    downloadProgressFile(username, state)
  }, [username, state])

  const importProgress = useCallback(async (file: File) => {
    const { username: u, state: s } = await importProgressFromFile(file)
    setUsername(u)
    setState(s)
    setUsers(listUsers())
  }, [])

  return {
    ready,
    username,
    users,
    state,
    words,
    wordMap,
    dueCards,
    newQueue,
    newRemainingToday,
    learnedCount,
    masteredCount,
    masteryPct,
    rateCard,
    getCard,
    updateSettings,
    finishOnboarding,
    doReset,
    changeUser,
    exportProgress,
    importProgress,
  }
}

export type AppStore = ReturnType<typeof useAppState>
