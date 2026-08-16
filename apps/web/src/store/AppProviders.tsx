import type { Scene } from "@hayverse/api-client";
import { ToastProvider } from "@/store/contexts/ToastContext.tsx";
import { PresetLibraryProvider } from "@/store/contexts/PresetLibraryContext.tsx";
import { UserProvider } from "@/store/contexts/UserContext.tsx";
import { AuthProvider } from "@/store/contexts/AuthContext.tsx";
import { ModalProvider } from "@/store/contexts/ModalContext.tsx";
import { GraphProvider } from "@/store/contexts/GraphContext.tsx";
import { NarrativeProvider } from "@/store/contexts/NarrativeContext.tsx";
import { PlayerProvider } from "@/store/contexts/PlayerContext.tsx";

export function AppProviders({
    children,
    initialScenes,
}: {
    children: React.ReactNode;
    initialScenes: Scene[] | null;
}) {
    return (
        <ToastProvider>
            <UserProvider>
                <AuthProvider>
                    <ModalProvider>
                        <NarrativeProvider>
                            <GraphProvider initialScenes={initialScenes}>
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
