import { createContext, useCallback, useContext, useRef, useState } from "react";

interface ToastCtx {
    toast: string | null;
    showToast: (msg: string) => void;
}

const Ctx = createContext<ToastCtx>(null!);
export const useToastContext = () => useContext(Ctx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toast, setToast] = useState<string | null>(null);
    const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const showToast = useCallback((msg: string) => {
        setToast(msg);
        if (toastTimer.current) clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToast(null), 3000);
    }, []);

    const ctx: ToastCtx = { toast, showToast };

    return <Ctx.Provider value={ctx}>{children}</Ctx.Provider>;
}
