import cn from "classnames";
import dynamic from "next/dynamic";
import { AppProviders } from "@/store/AppProviders.tsx";
import { useGraphContext } from "@/store/contexts/GraphContext.tsx";
import { isProviderConfigured } from "@/core/api/env.ts";
import { Topbar } from "@/ui/Topbar/Topbar.tsx";
import { NodeEditor } from "@/ui/NodeEditor/NodeEditor.tsx";
import { Timeline } from "@/ui/Timeline/Timeline.tsx";
import { MontageMonitor } from "@/ui/MontageMonitor/MontageMonitor.tsx";
import { Modals } from "@/ui/Modals/Modals.tsx";
import { Toast } from "@/ui/Toast/Toast.tsx";
import styles from "@/App.module.css";

// globe.gl/three touch `window` at module load — must never run during Next's
// server prerender pass, unlike the rest of this client-only app.
const WorldMap = dynamic(() => import("@/ui/WorldMap/WorldMap.tsx").then((mod) => mod.WorldMap), {
    ssr: false,
});

function AppShell() {
    const { showWorldMap, worldMapFullscreen, showTimeline } = useGraphContext();
    return (
        <div id="app" data-theme="dark">
            <Topbar />
            <div className={styles.body}>
                <main className={styles.stage}>
                    <div
                        className={cn(
                            styles.editorPane,
                            showWorldMap &&
                                (worldMapFullscreen
                                    ? styles.editorPaneCollapsed
                                    : styles.editorPaneSplit),
                        )}>
                        <NodeEditor />
                    </div>
                    <WorldMap />
                </main>
            </div>
            <div
                className={cn(
                    styles.timelineCollapse,
                    !showTimeline && styles.timelineCollapseHidden,
                )}>
                <div className={styles.timelineCollapseInner}>
                    <Timeline />
                </div>
            </div>
            <footer className={styles.statusbar}>
                <StatusBar />
            </footer>
            <MontageMonitor />
            <Modals />
            <Toast />
        </div>
    );
}

function StatusBar() {
    const { nodes, selectedNodeId } = useGraphContext();
    const sel = nodes.find((n) => n.id === selectedNodeId);
    const hfLive = isProviderConfigured("higgsfield");
    return (
        <>
            <span id="statJobs">очередь: 0</span>
            <span className={styles.muted}>Higgsfield: {hfLive ? "live" : "mock"}</span>
            <span className={styles.spacer} />
            <span className={styles.muted}>
                {sel ? `${sel.data.label} (${sel.id.slice(0, 8)})` : "—"}
            </span>
            <span className={styles.muted}>
                {process.env.NODE_ENV !== "production" ? "local" : process.env.NEXT_PUBLIC_GIT_HASH}
            </span>
        </>
    );
}

export function App() {
    return (
        <AppProviders>
            <AppShell />
        </AppProviders>
    );
}
