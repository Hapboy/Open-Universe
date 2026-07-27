import { ToastProvider } from "./contexts/ToastContext.tsx";
import { PresetLibraryProvider } from "./contexts/PresetLibraryContext.tsx";
import { UserProvider } from "./contexts/UserContext.tsx";
import { AuthProvider } from "./contexts/AuthContext.tsx";
import { ModalProvider } from "./contexts/ModalContext.tsx";
import { GraphProvider } from "./contexts/GraphContext.tsx";
import { NarrativeProvider } from "./contexts/NarrativeContext.tsx";
import { PlayerProvider } from "./contexts/PlayerContext.tsx";

export function AppProviders({ children }: { children: React.ReactNode }) {
    return (
        <ToastProvider>
            <UserProvider>
                <AuthProvider>
                    <ModalProvider>
                        <NarrativeProvider>
                            <GraphProvider>
                                {/* Deliberately nested inside GraphProvider, not outside it:
                                    React fires mount effects child-before-parent, so this
                                    ordering makes PresetLibraryContext's hydration effect
                                    (loading the real preset library from localStorage) run
                                    before GraphContext's own hydration effect populates
                                    `nodes`. That matters because a legacy node's presetId-
                                    matching effect (shared.tsx's usePresetDatabase) only ever
                                    runs once and permanently locks in its decision — if it ran
                                    against a not-yet-hydrated (seeds-only) library, a legacy
                                    node would wrongly mint a fresh id instead of adopting its
                                    existing preset's id. Keep this the innermost provider
                                    relative to GraphProvider if either one's hydration logic
                                    changes. */}
                                <PresetLibraryProvider>
                                    <PlayerProvider>{children}</PlayerProvider>
                                </PresetLibraryProvider>
                            </GraphProvider>
                        </NarrativeProvider>
                    </ModalProvider>
                </AuthProvider>
            </UserProvider>
        </ToastProvider>
    );
}
