import { useEffect, useRef, useState } from 'react'
import type { AppStore } from '../hooks/useAppState'

const newOptions = [10, 15, 20, 30, 40, 50, 60, 70] as const
const themes = [
  { id: 'light' as const, label: '浅色' },
  { id: 'dark' as const, label: '深色' },
  { id: 'system' as const, label: '跟随系统' },
]

export function SettingsPanel({ store }: { store: AppStore }) {
  const { state, updateSettings, doReset, username, users, changeUser, exportProgress, importProgress } =
    store
  const [draftUser, setDraftUser] = useState(username)
  const [msg, setMsg] = useState<string | null>(null)
  useEffect(() => {
    setDraftUser(username)
  }, [username])
  const fileRef = useRef<HTMLInputElement>(null)

  const applyUser = () => {
    const name = draftUser.trim()
    if (!name) {
      setMsg('请输入用户名')
      return
    }
    changeUser(name)
    setDraftUser(name)
    setMsg(`已切换到「${name}」的进度`)
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-1 text-sm font-semibold">用户进度</h2>
        <p className="mb-3 text-xs text-slate-500">
          不同用户名分开存进度；可导出成 JSON 文件备份，换设备再导入。
        </p>
        <div className="flex gap-2">
          <input
            value={draftUser}
            onChange={(e) => setDraftUser(e.target.value)}
            placeholder="用户名，如 Matthew"
            className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-brand-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-950"
          />
          <button
            type="button"
            onClick={applyUser}
            className="tap-active shrink-0 rounded-xl bg-brand-600 px-3 py-2 text-sm font-semibold text-white"
          >
            切换 / 创建
          </button>
        </div>
        {users.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {users.map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => {
                  changeUser(u)
                  setDraftUser(u)
                  setMsg(`已切换到「${u}」`)
                }}
                className={`rounded-full px-2.5 py-1 text-xs ${
                  u === username
                    ? 'bg-brand-600 text-white'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {u}
              </button>
            ))}
          </div>
        )}
        <p className="mt-2 text-xs text-slate-500">当前：{username}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              exportProgress()
              setMsg('已下载进度文件')
            }}
            className="tap-active rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium dark:border-slate-700 dark:bg-slate-950"
          >
            导出进度文件
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="tap-active rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium dark:border-slate-700 dark:bg-slate-950"
          >
            导入进度文件
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0]
              e.target.value = ''
              if (!f) return
              try {
                await importProgress(f)
                setMsg('导入成功')
              } catch (err) {
                setMsg(err instanceof Error ? err.message : '导入失败')
              }
            }}
          />
        </div>
        {msg && <p className="mt-2 text-xs text-brand-700 dark:text-brand-300">{msg}</p>}
      </section>

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
        <p className="mb-3 text-xs text-slate-500">
          仅清除当前用户「{username}」的学习进度（词库与设置可保留）。不可撤销。
        </p>
        <button
          type="button"
          onClick={() => {
            if (window.confirm(`确定重置「${username}」的全部进度？`)) doReset(true)
          }}
          className="tap-active rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-600"
        >
          重置进度
        </button>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
        <h2 className="mb-2 font-semibold text-slate-800 dark:text-slate-100">关于</h2>
        <p>进度按用户名存在浏览器本地，并支持 JSON 文件导出/导入。</p>
        <p className="mt-1">学习算法：简化 SM-2 间隔重复。</p>
        <p className="mt-1 text-xs text-slate-400">github.com/MarshallYang/learnieltswords</p>
      </section>
    </div>
  )
}
