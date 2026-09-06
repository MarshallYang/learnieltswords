import { useMemo, useState, type ReactNode } from 'react'
import type { AppStore } from '../hooks/useAppState'
import type { Tier } from '../types'

const tiers: { id: Tier | 'all'; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'foundation', label: '基础' },
  { id: 'core', label: '核心' },
  { id: 'advanced', label: '高阶' },
]

const statusLabel: Record<string, string> = {
  new: '未学',
  learning: '学习中',
  review: '复习中',
  mastered: '已掌握',
}

export function WordBook({ store }: { store: AppStore }) {
  const [q, setQ] = useState('')
  const [tier, setTier] = useState<Tier | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'learning' | 'review' | 'mastered'>('all')

  const list = useMemo(() => {
    const query = q.trim().toLowerCase()
    return store.words.filter((w) => {
      if (tier !== 'all' && w.tier !== tier) return false
      const card = store.state.cards[w.id]
      const st = card?.status ?? 'new'
      if (statusFilter !== 'all' && st !== statusFilter) return false
      if (!query) return true
      return (
        w.word.includes(query) ||
        w.meaningZh.toLowerCase().includes(query) ||
        (w.phonetic || '').toLowerCase().includes(query)
      )
    })
  }, [store.words, store.state.cards, q, tier, statusFilter])

  return (
    <div className="space-y-3">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="搜索单词 / 释义…"
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none ring-brand-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-900"
      />

      <div className="flex flex-wrap gap-1.5">
        {tiers.map((t) => (
          <Chip key={t.id} active={tier === t.id} onClick={() => setTier(t.id)}>
            {t.label}
          </Chip>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {(['all', 'new', 'learning', 'review', 'mastered'] as const).map((s) => (
          <Chip key={s} active={statusFilter === s} onClick={() => setStatusFilter(s)}>
            {s === 'all' ? '全部状态' : statusLabel[s]}
          </Chip>
        ))}
      </div>

      <p className="text-xs text-slate-500">共 {list.length} 词</p>

      <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
        {list.slice(0, 200).map((w) => {
          const card = store.state.cards[w.id]
          const st = card?.status ?? 'new'
          return (
            <li key={w.id} className="px-3 py-2.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">
                    {w.word}{' '}
                    {w.pos && <span className="text-xs font-normal text-slate-400">{w.pos}</span>}
                  </p>
                  {w.phonetic && <p className="font-mono text-xs text-slate-400">{w.phonetic}</p>}
                  <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">{w.meaningZh}</p>
                </div>
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {statusLabel[st]}
                </span>
              </div>
            </li>
          )
        })}
        {list.length > 200 && (
          <li className="px-3 py-3 text-center text-xs text-slate-400">仅显示前 200 条，请缩小筛选</li>
        )}
        {list.length === 0 && (
          <li className="px-3 py-8 text-center text-sm text-slate-400">无匹配单词</li>
        )}
      </ul>
    </div>
  )
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-2.5 py-1 text-xs transition ${
        active
          ? 'bg-brand-600 text-white'
          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
      }`}
    >
      {children}
    </button>
  )
}
