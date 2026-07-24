import { createContext, useCallback, useContext, useState } from "react";
import { useUserContext } from "./UserContext.tsx";
import type { ModalType } from "../../types/enums.ts";

interface ModalCtx {
    modalType: ModalType | null;
    openModal: (type: ModalType) => void;
    closeModal: () => void;
}

const Ctx = createContext<ModalCtx>(null!);
export const useModalContext = () => useContext(Ctx);

export function ModalProvider({ children }: { children: React.ReactNode }) {
    const { currentUser } = useUserContext();
    // Auto-open onboarding on first load, same as before — needs
    // `currentUser`, which is why this provider must nest inside UserProvider.
    const [modalType, setModalType] = useState<ModalType | null>(() =>
        currentUser ? null : "onboard",
    );

    const openModal = useCallback((type: ModalType) => setModalType(type), []);
    const closeModal = useCallback(() => setModalType(null), []);

    const ctx: ModalCtx = { modalType, openModal, closeModal };

    return <Ctx.Provider value={ctx}>{children}</Ctx.Provider>;
}
