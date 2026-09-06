export function Onboarding({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex min-h-full flex-col justify-center px-6 py-10">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600 text-xl font-bold text-white shadow-lg shadow-brand-600/30">
            IELTS
          </div>
          <h1 className="text-2xl font-bold tracking-tight">雅思词汇训练</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">冲刺 Band 7–8 · 约 7500 核心词</p>
        </div>

        <ul className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <li className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700 dark:bg-brand-900/50 dark:text-brand-300">
              1
            </span>
            <div>
              <p className="font-medium">先复习，再学新词</p>
              <p className="text-sm text-slate-500">到期卡片优先，避免遗忘曲线。</p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700 dark:bg-brand-900/50 dark:text-brand-300">
              2
            </span>
            <div>
              <p className="font-medium">诚实自评四档</p>
              <p className="text-sm text-slate-500">忘记 / 困难 / 认识 / 简单，系统按 SM-2 排程。</p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700 dark:bg-brand-900/50 dark:text-brand-300">
              3
            </span>
            <div>
              <p className="font-medium">每天坚持一小会儿</p>
              <p className="text-sm text-slate-500">默认每天 20 个新词，可在设置中调整。</p>
            </div>
          </li>
        </ul>

        <button
          type="button"
          onClick={onStart}
          className="tap-active mt-8 w-full rounded-2xl bg-brand-600 py-3.5 text-base font-semibold text-white shadow-lg shadow-brand-600/25 transition hover:bg-brand-700"
        >
          开始背单词
        </button>
      </div>
    </div>
  )
}
