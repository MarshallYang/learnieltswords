import type { AppStore } from '../hooks/useAppState'

export function Stats({ store }: { store: AppStore }) {
  const { state, words, learnedCount, masteredCount, masteryPct, dueCards } = store
  const learning = Object.values(state.cards).filter((c) => c.status === 'learning').length
  const reviewing = Object.values(state.cards).filter((c) => c.status === 'review').length

  const history = [...(state.history || [])].slice(-14).reverse()
  const ratingTotal =
    (state.daily.ratings[1] || 0) +
    (state.daily.ratings[2] || 0) +
    (state.daily.ratings[3] || 0) +
    (state.daily.ratings[4] || 0)

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-2 gap-3">
        <Metric label="词库总量" value={words.length} />
        <Metric label="已学习" value={learnedCount} />
        <Metric label="学习中" value={learning} />
        <Metric label="复习中" value={reviewing} />
        <Metric label="已掌握" value={masteredCount} />
        <Metric label="掌握度" value={`${masteryPct}%`} />
        <Metric label="待复习" value={dueCards.length} />
        <Metric label="连续打卡" value={`${state.streak} 天`} />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 text-sm font-semibold">今日评分分布</h2>
        {ratingTotal === 0 ? (
          <p className="text-sm text-slate-400">今天还没有学习记录</p>
        ) : (
          <div className="space-y-2">
            {(
              [
                [1, '忘记', 'bg-rose-500'],
                [2, '困难', 'bg-amber-500'],
                [3, '认识', 'bg-sky-500'],
                [4, '简单', 'bg-emerald-500'],
              ] as const
            ).map(([k, label, color]) => {
              const n = state.daily.ratings[k] || 0
              const pct = Math.round((n / ratingTotal) * 100)
              return (
                <div key={k}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span>{label}</span>
                    <span className="tabular-nums">
                      {n}（{pct}%）
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
        <p className="mt-3 text-xs text-slate-400">
          今日新词 {state.daily.newLearned} · 复习 {state.daily.reviewsDone}
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 text-sm font-semibold">近两周学习</h2>
        {history.length === 0 ? (
          <p className="text-sm text-slate-400">暂无历史（跨日后会自动归档）</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {history.map((h) => (
              <li key={h.date} className="flex justify-between">
                <span className="text-slate-500">{h.date}</span>
                <span>
                  新词 {h.newCount} · 复习 {h.reviews}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums">{value}</p>
    </div>
  )
}
