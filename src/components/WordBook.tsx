import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Pause, Play, RefreshCw } from 'lucide-react'
import type { AppStore } from '../hooks/useAppState'
import type { Tier, Word } from '../types'
import { SpeakButton } from './SpeakButton'
import { autoplayWordList } from '../lib/autoplayWordbook'
import { stopAllPlayback } from '../lib/speak'
import {
  WORDBOOK_PAGE_SIZE,
  loadSeenIds,
  saveSeenIds,
  sampleWordBatch,
} from '../lib/wordbookSample'

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
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [seen, setSeen] = useState<Set<number>>(() => loadSeenIds())
  const [batch, setBatch] = useState<Word[]>([])
  const [refreshToken, setRefreshToken] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [playIndex, setPlayIndex] = useState<number | null>(null)
  const [playStep, setPlayStep] = useState<'word' | 'meaning' | 'example' | null>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const rowRefs = useRef<Map<number, HTMLLIElement>>(new Map())
  const playRunId = useRef(0)

  const filtered = useMemo(() => {
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

  const stopPlay = useCallback(() => {
    playRunId.current += 1
    stopAllPlayback()
    setPlaying(false)
    setPlayIndex(null)
    setPlayStep(null)
  }, [])

  const reshuffle = useCallback(
    (pool: Word[], currentSeen: Set<number>) => {
      stopPlay()
      const { batch: next, nextSeen } = sampleWordBatch(pool, currentSeen, WORDBOOK_PAGE_SIZE)
      setBatch(next)
      setSeen(nextSeen)
      saveSeenIds(nextSeen)
      setExpandedId(null)
    },
    [stopPlay],
  )

  useEffect(() => {
    reshuffle(filtered, seen)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, refreshToken, reshuffle])

  // Leave wordbook tab / unmount → stop continuous play
  useEffect(() => {
    return () => {
      playRunId.current += 1
      stopAllPlayback()
    }
  }, [])

  useEffect(() => {
    if (playIndex == null) return
    const w = batch[playIndex]
    if (!w) return
    const el = rowRefs.current.get(w.id)
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [playIndex, playStep, batch])

  const onRefresh = () => {
    setRefreshToken((n) => n + 1)
  }

  const toggleAutoplay = async () => {
    if (playing) {
      stopPlay()
      return
    }
    if (batch.length === 0) return
    const runId = ++playRunId.current
    setPlaying(true)
    await autoplayWordList(batch, {
      onWordStart: (index) => {
        if (runId !== playRunId.current) return
        setPlayIndex(index)
        setExpandedId(batch[index]?.id ?? null)
      },
      onStep: (_index, step) => {
        if (runId !== playRunId.current) return
        setPlayStep(step)
      },
      onDone: () => {
        if (runId !== playRunId.current) return
        setPlaying(false)
        setPlayIndex(null)
        setPlayStep(null)
      },
      onAbort: () => {
        if (runId !== playRunId.current) return
        setPlaying(false)
        setPlayIndex(null)
        setPlayStep(null)
      },
    })
  }

  const unseenLeft = filtered.filter((w) => !seen.has(w.id)).length
  const stepLabel =
    playStep === 'word' ? '读单词' : playStep === 'meaning' ? '读释义' : playStep === 'example' ? '读例句' : ''

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="shrink-0 space-y-3 bg-slate-50 dark:bg-slate-950">
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

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-slate-500">
            显示 {batch.length} / 筛选 {filtered.length} · 未展示约 {unseenLeft}
            {playing && playIndex != null ? (
              <span className="text-brand-700 dark:text-brand-300">
                {' '}
                · 播放 {playIndex + 1}/{batch.length}
                {stepLabel ? ` · ${stepLabel}` : ''}
              </span>
            ) : null}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void toggleAutoplay()}
              disabled={batch.length === 0}
              className={`tap-active inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium ${
                playing
                  ? 'bg-brand-600 text-white'
                  : 'border border-slate-200 bg-white text-slate-700 hover:border-brand-300 hover:text-brand-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
              }`}
            >
              {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              {playing ? '停止连播' : '连续播放'}
            </button>
            <button
              type="button"
              onClick={onRefresh}
              className="tap-active inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-brand-300 hover:text-brand-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              刷新 {WORDBOOK_PAGE_SIZE} 词
            </button>
          </div>
        </div>
      </div>

      <ul
        ref={listRef}
        className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto overscroll-contain rounded-2xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900"
      >
        {batch.map((w, index) => {
          const card = store.state.cards[w.id]
          const st = card?.status ?? 'new'
          const open = expandedId === w.id
          const example = w.exampleEn?.trim()
          const active = playing && playIndex === index
          return (
            <li
              key={w.id}
              ref={(el) => {
                if (el) rowRefs.current.set(w.id, el)
                else rowRefs.current.delete(w.id)
              }}
              className={`px-3 py-2.5 ${active ? 'bg-brand-50 dark:bg-brand-950/40' : ''}`}
            >
              <div className="flex items-start justify-between gap-2">
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => setExpandedId(open ? null : w.id)}
                >
                  <p className="font-semibold">
                    {w.word}{' '}
                    {w.pos && <span className="text-xs font-normal text-slate-400">{w.pos}</span>}
                    {active && stepLabel ? (
                      <span className="ml-2 text-[10px] font-medium text-brand-700 dark:text-brand-300">
                        {stepLabel}
                      </span>
                    ) : null}
                  </p>
                  {w.phonetic && <p className="font-mono text-xs text-slate-400">{w.phonetic}</p>}
                  <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">{w.meaningZh}</p>
                </button>
                <div className="flex shrink-0 items-center gap-1.5">
                  <SpeakButton word={w.word} audioUrl={w.audioUrl} className="!p-1.5" />
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {statusLabel[st]}
                  </span>
                </div>
              </div>
              {open && example ? (
                <div className="mt-2 rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/60">
                  <p className="mb-0.5 text-[10px] font-medium text-brand-600 dark:text-brand-400">雅思例句</p>
                  <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">{example}</p>
                </div>
              ) : null}
            </li>
          )
        })}
        {batch.length === 0 && (
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
