import { useEffect, useRef } from 'react';
import { AppProvider, useAppContext } from './store/AppContext.tsx';
import { Topbar }      from './ui/Topbar.tsx';
import { NodeEditor }  from './ui/NodeEditor.tsx';
import { Inspector }   from './ui/Inspector.tsx';
import { Palette }     from './ui/Palette.tsx';
import { Modals }      from './ui/Modals.tsx';
import { Toast }       from './ui/Toast.tsx';

function AppShell() {
  const { createNode } = useAppContext();

  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    createNode('pinterest_board', 60,  80);
    createNode('higgsfield_soul', 360, 80);
    createNode('output_scene',    660, 80);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div id="app" data-theme="dark">
      <Topbar />
      <div className="body">
        <Palette />
        <main className="stage">
          <NodeEditor />
        </main>
        <Inspector />
      </div>
      <footer className="statusbar">
        <StatusBar />
      </footer>
      <Modals />
      <Toast />
    </div>
  );
}

function StatusBar() {
  const { nodes, selectedNodeId } = useAppContext();
  const sel = nodes.find(n => n.id === selectedNodeId);
  const hfLive  = !!(import.meta.env.VITE_HIGGSFIELD_KEY  as string);
  const pinLive = !!(import.meta.env.VITE_PINTEREST_TOKEN as string);
  return (
    <>
      <span id="statJobs">очередь: 0</span>
      <span className="muted">
        Higgsfield: {hfLive ? 'live' : 'mock'} · Pinterest: {pinLive ? 'live' : 'mock'}
      </span>
      <span className="spacer" />
      <span className="muted">{sel ? `${sel.data.label} (${sel.id})` : '—'}</span>
    </>
  );
}

export function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
