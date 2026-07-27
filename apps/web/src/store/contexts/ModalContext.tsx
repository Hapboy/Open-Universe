import { createContext, useCallback, useContext, useState } from "react";
import type { ModalType } from "@open-universe/shared";

interface ModalCtx {
    modalType: ModalType | null;
    openModal: (type: ModalType) => void;
    closeModal: () => void;
}

const Ctx = createContext<ModalCtx>(null!);
export const useModalContext = () => useContext(Ctx);

export function ModalProvider({ children }: { children: React.ReactNode }) {
    const [modalType, setModalType] = useState<ModalType | null>(null);

    const openModal = useCallback((type: ModalType) => setModalType(type), []);
    const closeModal = useCallback(() => setModalType(null), []);

    const ctx: ModalCtx = { modalType, openModal, closeModal };

    return <Ctx.Provider value={ctx}>{children}</Ctx.Provider>;
}
