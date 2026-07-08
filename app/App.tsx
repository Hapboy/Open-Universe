import { AppProviders } from './store/AppProviders.tsx'
import { useGraphContext } from './store/contexts/GraphContext.tsx'
import { Topbar } from './ui/Topbar/Topbar.tsx'
import { NodeEditor } from './ui/NodeEditor/NodeEditor.tsx'
import { Timeline } from './ui/Timeline/Timeline.tsx'
import { MontageMonitor } from './ui/MontageMonitor/MontageMonitor.tsx'
import { WorldMap } from './ui/WorldMap/WorldMap.tsx'
import { Modals } from './ui/Modals/Modals.tsx'
import { Toast } from './ui/Toast/Toast.tsx'
import styles from './App.module.css'

function AppShell() {
  return (
    <div id="app" data-theme="dark">
      <Topbar />
      <div className={styles.body}>
        <main className={styles.stage}>
          <NodeEditor />
        </main>
      </div>
      <Timeline />
      <footer className={styles.statusbar}>
        <StatusBar />
      </footer>
      <MontageMonitor />
      <WorldMap />
      <Modals />
      <Toast />
    </div>
  )
}

function StatusBar() {
  const { nodes, selectedNodeId } = useGraphContext()
  const sel = nodes.find((n) => n.id === selectedNodeId)
  const hfLive = !!(import.meta.env.VITE_HIGGSFIELD_KEY as string)
  const pinLive = !!(import.meta.env.VITE_PINTEREST_TOKEN as string)
  const geminiLive = !!(import.meta.env.VITE_GEMINI_KEY as string)
  return (
    <>
      <span id="statJobs">очередь: 0</span>
      <span className={styles.muted}>
        Higgsfield: {hfLive ? 'live' : 'mock'} · Pinterest: {pinLive ? 'live' : 'mock'} · Gemini:{' '}
        {geminiLive ? 'live' : 'mock'}
      </span>
      <span className={styles.spacer} />
      <span className={styles.muted}>{sel ? `${sel.data.label} (${sel.id})` : '—'}</span>
    </>
  )
}

export function App() {
  return (
    <AppProviders>
      <AppShell />
    </AppProviders>
  )
}
