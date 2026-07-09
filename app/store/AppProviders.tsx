import { ToastProvider } from "./contexts/ToastContext.tsx";
import { PresetLibraryProvider } from "./contexts/PresetLibraryContext.tsx";
import { PwaProvider } from "./contexts/PwaContext.tsx";
import { UserProvider } from "./contexts/UserContext.tsx";
import { GraphProvider } from "./contexts/GraphContext.tsx";
import { NarrativeProvider } from "./contexts/NarrativeContext.tsx";
import { PlayerProvider } from "./contexts/PlayerContext.tsx";

export function AppProviders({ children }: { children: React.ReactNode }) {
    return (
        <ToastProvider>
            <PresetLibraryProvider>
                <PwaProvider>
                    <UserProvider>
                        <NarrativeProvider>
                            <GraphProvider>
                                <PlayerProvider>{children}</PlayerProvider>
                            </GraphProvider>
                        </NarrativeProvider>
                    </UserProvider>
                </PwaProvider>
            </PresetLibraryProvider>
        </ToastProvider>
    );
}
