import { createContext, useContext, useState } from "react";

export interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface PwaCtx {
    deferredInstallPrompt: BeforeInstallPromptEvent | null;
    setDeferredInstallPrompt: (e: BeforeInstallPromptEvent | null) => void;
}

const Ctx = createContext<PwaCtx>(null!);
export const usePwaContext = () => useContext(Ctx);

export function PwaProvider({ children }: { children: React.ReactNode }) {
    const [deferredInstallPrompt, setDeferredInstallPrompt] =
        useState<BeforeInstallPromptEvent | null>(null);

    const ctx: PwaCtx = { deferredInstallPrompt, setDeferredInstallPrompt };

    return <Ctx.Provider value={ctx}>{children}</Ctx.Provider>;
}
