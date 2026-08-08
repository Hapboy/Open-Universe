import { createContext, useContext, useMemo } from "react";
import { useUserContext } from "@/store/contexts/UserContext.tsx";
import { AUTH_ROLES, type AuthStatus } from "@hayverse/shared";
import { getTokenIssuedAt } from "@/core/auth/tokenStore.ts";

export interface Session {
    userId: string;
    role: (typeof AUTH_ROLES)[number];
    issuedAt: number;
}

interface AuthCtx {
    status: AuthStatus;
    session: Session | null;
    signOut: () => void;
}

const Ctx = createContext<AuthCtx>(null!);
export const useAuthContext = () => useContext(Ctx);

// UserContext now holds a real backend-authenticated identity (JWT bearer
// token, see core/auth/tokenStore.ts); this context still just derives
// `status`/`session` from it rather than owning credentials itself
// (signup/login stay on UserContext, since they need credential arguments
// this context doesn't carry). `role` here is a placeholder access-control
// concept (member/admin) - no permissions logic exists yet - distinct from
// TeamRole (the in-universe creative role like "Режиссер").
export function AuthProvider({ children }: { children: React.ReactNode }) {
    const { currentUser, logOut } = useUserContext();

    const session = useMemo<Session | null>(
        () =>
            currentUser
                ? { userId: currentUser.id, role: AUTH_ROLES[0], issuedAt: getTokenIssuedAt() ?? 0 }
                : null,
        [currentUser],
    );

    const ctx: AuthCtx = {
        status: currentUser ? "authenticated" : "anonymous",
        session,
        signOut: logOut,
    };

    return <Ctx.Provider value={ctx}>{children}</Ctx.Provider>;
}
