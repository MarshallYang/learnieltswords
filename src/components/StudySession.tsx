import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AppStore } from '../hooks/useAppState'
import type { Rating, Word } from '../types'

type QueueItem = { word: Word; isNew: boolean }

const ratings: { r: Rating; label: string; hint: string; color: string }[] = [
  { r: 1, label: '忘记', hint: '1', color: 'bg-rose-500 hover:bg-rose-600' },
  { r: 2, label: '困难', hint: '2', color: 'bg-amber-500 hover:bg-amber-600' },
  { r: 3, label: '认识', hint: '3', color: 'bg-sky-500 hover:bg-sky-600' },
  { r: 4, label: '简单', hint: '4', color: 'bg-emerald-500 hover:bg-emerald-600' },
]

export function StudySession({ store, onDone }: { store: AppStore; onDone: () => void }) {
  // Freeze queue for this session so rating updates do not reshuffle cards
  const queue = useMemo<QueueItem[]>(() => {
    const items: QueueItem[] = []
    for (const c of store.dueCards) {
      const w = store.wordMap.get(c.wordId)
      if (w) items.push({ word: w, isNew: false })
    }
    for (const w of store.newQueue) items.push({ word: w, isNew: true })
    return items
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [doneCount, setDoneCount] = useState(0)

  const current = queue[index]
  const total = queue.length
  const finished = !current

  const advance = useCallback(
    (rating: Rating) => {
      if (!current) return
      store.rateCard(current.word.id, rating, current.isNew)
      setDoneCount((n) => n + 1)
      setRevealed(false)
      setIndex((i) => i + 1)
    },
    [current, store],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (finished) return
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.code === 'Space') {
        e.preventDefault()
        if (!revealed) setRevealed(true)
        return
      }
      if (!revealed) return
      if (e.key === '1') advance(1)
      if (e.key === '2') advance(2)
      if (e.key === '3') advance(3)
      if (e.key === '4') advance(4)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [revealed, finished, advance])

  if (total === 0 || finished) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <div className="text-4xl">🎉</div>
        <h2 className="text-xl font-bold">今日任务完成</h2>
        <p className="text-slate-500">
          {doneCount > 0 ? `本轮完成 ${doneCount} 张卡片` : '暂无到期复习，新词额度已用完'}
        </p>
        <button
          type="button"
          onClick={onDone}
          className="tap-active rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white"
        >
          返回首页
        </button>
      </div>
    )
  }

  const { word, isNew } = current
  const progress = Math.round(((index) / total) * 100)

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>
          {index + 1} / {total}
          {isNew ? ' · 新词' : ' · 复习'}
        </span>
        <span>{progress}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${progress}%` }} />
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="min-h-[200px] text-center">
          <p className="text-3xl font-bold tracking-wide sm:text-4xl">{word.word}</p>
          {word.phonetic && (
            <p className="mt-2 font-mono text-sm text-slate-500 dark:text-slate-400">{word.phonetic}</p>
          )}
          {word.pos && (
            <span className="mt-3 inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {word.pos}
            </span>
          )}

          {!revealed ? (
            <button
              type="button"
              onClick={() => setRevealed(true)}
              className="tap-active mt-10 w-full rounded-2xl border-2 border-dashed border-brand-300 py-3 text-sm font-semibold text-brand-700 dark:border-brand-700 dark:text-brand-300"
            >
              显示释义（空格）
            </button>
          ) : (
            <div className="mt-8 space-y-3 text-left">
              <p className="text-lg leading-relaxed text-slate-800 dark:text-slate-100">{word.meaningZh}</p>
              {word.exampleEn && (
                <p className="rounded-xl bg-slate-50 p-3 text-sm italic text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
                  {word.exampleEn}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {revealed && (
        <div className="grid grid-cols-4 gap-2">
          {ratings.map(({ r, label, hint, color }) => (
            <button
              key={r}
              type="button"
              onClick={() => advance(r)}
              className={`tap-active rounded-2xl py-3 text-sm font-semibold text-white shadow-sm ${color}`}
            >
              <div>{label}</div>
              <div className="text-[10px] font-normal opacity-80">{hint}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
