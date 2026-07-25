import { ToastProvider } from "./contexts/ToastContext.tsx";
import { PresetLibraryProvider } from "./contexts/PresetLibraryContext.tsx";
import { PwaProvider } from "./contexts/PwaContext.tsx";
import { UserProvider } from "./contexts/UserContext.tsx";
import { AuthProvider } from "./contexts/AuthContext.tsx";
import { ModalProvider } from "./contexts/ModalContext.tsx";
import { GraphProvider } from "./contexts/GraphContext.tsx";
import { NarrativeProvider } from "./contexts/NarrativeContext.tsx";
import { PlayerProvider } from "./contexts/PlayerContext.tsx";

export function AppProviders({ children }: { children: React.ReactNode }) {
    return (
        <ToastProvider>
            <PresetLibraryProvider>
                <PwaProvider>
                    <UserProvider>
                        <AuthProvider>
                            <ModalProvider>
                                <NarrativeProvider>
                                    <GraphProvider>
                                        <PlayerProvider>{children}</PlayerProvider>
                                    </GraphProvider>
                                </NarrativeProvider>
                            </ModalProvider>
                        </AuthProvider>
                    </UserProvider>
                </PwaProvider>
            </PresetLibraryProvider>
        </ToastProvider>
    );
}
