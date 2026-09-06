import type { ReactNode } from 'react'
import { BookOpen, BarChart3, Settings, Home, Library } from 'lucide-react'

export type Tab = 'home' | 'study' | 'book' | 'stats' | 'settings'

const tabs: { id: Tab; label: string; icon: typeof Home }[] = [
  { id: 'home', label: '首页', icon: Home },
  { id: 'study', label: '学习', icon: BookOpen },
  { id: 'book', label: '单词本', icon: Library },
  { id: 'stats', label: '统计', icon: BarChart3 },
  { id: 'settings', label: '设置', icon: Settings },
]

export function Layout({
  tab,
  onTab,
  children,
}: {
  tab: Tab
  onTab: (t: Tab) => void
  children: ReactNode
}) {
  return (
    <div className="mx-auto flex min-h-full max-w-lg flex-col">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-slate-50/90 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-sm font-bold text-white shadow-sm">
            IELTS
          </div>
          <div>
            <h1 className="text-base font-semibold leading-tight">雅思词汇训练</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Band 7–8 · 间隔重复</p>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 pb-24 pt-4">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
        <div className="mx-auto flex max-w-lg justify-around px-2 py-2">
          {tabs.map(({ id, label, icon: Icon }) => {
            const active = tab === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => onTab(id)}
                className={`tap-active flex min-w-[3.5rem] flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-xs transition ${
                  active
                    ? 'text-brand-700 dark:text-brand-300'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? 'stroke-[2.5]' : ''}`} />
                <span className={active ? 'font-semibold' : ''}>{label}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
