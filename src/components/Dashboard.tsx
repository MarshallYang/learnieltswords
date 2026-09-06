import { Flame, Clock, Sparkles, Trophy, BookMarked } from 'lucide-react'
import type { AppStore } from '../hooks/useAppState'

const tierLabel = { foundation: '基础', core: '核心', advanced: '高阶' } as const

export function Dashboard({
  store,
  onStudy,
}: {
  store: AppStore
  onStudy: () => void
}) {
  const { state, words, dueCards, newRemainingToday, learnedCount, masteredCount, masteryPct } = store
  const due = dueCards.length
  const totalNewLeft = words.length - learnedCount

  const tierCounts = { foundation: 0, core: 0, advanced: 0 }
  for (const w of words) tierCounts[w.tier]++

  return (
    <div className="space-y-5">
      <section className="rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 p-5 text-white shadow-lg shadow-brand-700/20">
        <p className="text-sm text-brand-100">今日目标</p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat icon={Flame} label="连续天数" value={`${state.streak} 天`} />
          <Stat icon={Clock} label="待复习" value={`${due}`} />
          <Stat icon={Sparkles} label="今日新词余量" value={`${newRemainingToday}`} />
          <Stat icon={Trophy} label="掌握度" value={`${masteryPct}%`} />
        </div>
        <button
          type="button"
          onClick={onStudy}
          className="tap-active mt-5 w-full rounded-xl bg-white py-3 text-sm font-semibold text-brand-800 shadow transition hover:bg-brand-50"
        >
          {due > 0 || newRemainingToday > 0 ? '开始今日学习' : '查看学习进度'}
        </button>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <InfoCard title="已学单词" value={`${learnedCount}`} sub={`/ ${words.length}`} icon={BookMarked} />
        <InfoCard title="已掌握" value={`${masteredCount}`} sub="进入长期记忆" icon={Trophy} />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">词库分层</h2>
        <div className="space-y-2">
          {(['foundation', 'core', 'advanced'] as const).map((t) => (
            <div key={t} className="flex items-center justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-300">{tierLabel[t]}</span>
              <span className="font-medium tabular-nums">{tierCounts[t]}</span>
            </div>
          ))}
          <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-sm dark:border-slate-800">
            <span className="text-slate-600 dark:text-slate-300">剩余未学</span>
            <span className="font-medium tabular-nums">{Math.max(0, totalNewLeft)}</span>
          </div>
        </div>
      </section>

      <p className="text-center text-xs text-slate-400">
        快捷键：空格显示释义 · 1–4 评分
      </p>
    </div>
  )
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Flame
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl bg-white/10 px-3 py-2 backdrop-blur-sm">
      <div className="flex items-center gap-1.5 text-xs text-brand-100">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-1 text-lg font-bold tabular-nums">{value}</p>
    </div>
  )
}

function InfoCard({
  title,
  value,
  sub,
  icon: Icon,
}: {
  title: string
  value: string
  sub: string
  icon: typeof Flame
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Icon className="h-3.5 w-3.5" />
        {title}
      </div>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-slate-400">{sub}</p>
    </div>
  )
}
