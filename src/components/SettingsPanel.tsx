import type { AppStore } from '../hooks/useAppState'

const newOptions = [10, 15, 20, 30, 40, 50, 60, 70] as const
const themes = [
  { id: 'light' as const, label: '浅色' },
  { id: 'dark' as const, label: '深色' },
  { id: 'system' as const, label: '跟随系统' },
]

export function SettingsPanel({ store }: { store: AppStore }) {
  const { state, updateSettings, doReset } = store

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 text-sm font-semibold">每日新词数量</h2>
        <div className="flex flex-wrap gap-2">
          {newOptions.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => updateSettings({ newPerDay: n })}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                state.settings.newPerDay === n
                  ? 'bg-brand-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 text-sm font-semibold">主题</h2>
        <div className="flex flex-wrap gap-2">
          {themes.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => updateSettings({ theme: t.id })}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                state.settings.theme === t.id
                  ? 'bg-brand-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-rose-200 bg-white p-4 dark:border-rose-900/50 dark:bg-slate-900">
        <h2 className="mb-2 text-sm font-semibold text-rose-600 dark:text-rose-400">危险操作</h2>
        <p className="mb-3 text-xs text-slate-500">清除全部学习进度（词库与设置可保留）。不可撤销。</p>
        <button
          type="button"
          onClick={() => {
            if (window.confirm('确定重置全部进度？')) doReset(true)
          }}
          className="tap-active rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-600"
        >
          重置进度
        </button>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
        <h2 className="mb-2 font-semibold text-slate-800 dark:text-slate-100">关于</h2>
        <p>本地 Web 应用，进度保存在浏览器 localStorage。</p>
        <p className="mt-1">学习算法：简化 SM-2 间隔重复。</p>
        <p className="mt-1 text-xs text-slate-400">目标仓库：github.com/MarshallYang/learnieltswords</p>
      </section>
    </div>
  )
}
