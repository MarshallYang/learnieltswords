import { useState } from 'react'
import { useAppState } from './hooks/useAppState'
import { Layout, type Tab } from './components/Layout'
import { Onboarding } from './components/Onboarding'
import { Dashboard } from './components/Dashboard'
import { StudySession } from './components/StudySession'
import { WordBook } from './components/WordBook'
import { Stats } from './components/Stats'
import { SettingsPanel } from './components/SettingsPanel'

export default function App() {
  const store = useAppState()
  const [tab, setTab] = useState<Tab>('home')

  if (!store.ready) {
    return (
      <div className="flex min-h-full items-center justify-center text-sm text-slate-500">加载中…</div>
    )
  }

  if (!store.state.settings.onboardingDone) {
    return <Onboarding onStart={store.finishOnboarding} />
  }

  return (
    <Layout
      tab={tab}
      onTab={(t) => setTab(t)}
    >
      {tab === 'home' && <Dashboard store={store} onStudy={() => setTab('study')} />}
      {tab === 'study' && <StudySession store={store} onDone={() => setTab('home')} />}
      {tab === 'book' && <WordBook store={store} />}
      {tab === 'stats' && <Stats store={store} />}
      {tab === 'settings' && <SettingsPanel store={store} />}
    </Layout>
  )
}
