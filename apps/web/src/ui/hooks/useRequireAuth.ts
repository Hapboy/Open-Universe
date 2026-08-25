import { useCallback } from "react";
import { useAuthContext } from "@/store/contexts/AuthContext.tsx";
import { useModalContext } from "@/store/contexts/ModalContext.tsx";
import { useToastContext } from "@/store/contexts/ToastContext.tsx";

// Gate in front of every generation entry point (a node's ▶, the character and
// output_scene wands, «Прогнать граф»). Generated media is stored through
// MediaModule, whose upload route is JWT-guarded — so an anonymous generation
// used to spend a real provider call and then lose the result to a 401 on the
// way to R2, leaving an empty node and no explanation. The attempt is now
// refused up front and the login modal opened instead.
//
// Returns a predicate, used as `if (!requireAuth()) return;` at the top of the
// handler — deliberately not a wrapper around the work itself, since callers
// differ in what they do next (async generate, sync runNode, ...).
export function useRequireAuth(): () => boolean {
    const { status } = useAuthContext();
    const { openModal } = useModalContext();
    const { showToast } = useToastContext();

    return useCallback(() => {
        if (status === "authenticated") return true;
        showToast("Войдите в аккаунт — результат генерации нужно где-то сохранить");
        openModal("login");
        return false;
    }, [status, openModal, showToast]);
}
