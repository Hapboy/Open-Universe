import { createContext, useCallback, useContext, useMemo } from "react";
import { useUserContext } from "./UserContext.tsx";
import type { CurrentUser } from "../../types.ts";
import { AUTH_ROLES, type AuthRole, type AuthStatus } from "../../types/enums.ts";

export interface Session {
    userId: string;
    role: AuthRole;
    issuedAt: number;
}

interface AuthCtx {
    status: AuthStatus;
    session: Session | null;
    signIn: (user: CurrentUser) => void;
    signOut: () => void;
}

const Ctx = createContext<AuthCtx>(null!);
export const useAuthContext = () => useContext(Ctx);

// Scaffold only: no real backend/session token yet — derives `status`/
// `session` from the existing mock UserContext identity so a later Next.js
// auth-firewall pass can drop in a real implementation behind this same
// interface without touching call sites. `role` here is a placeholder
// access-control concept, distinct from TeamRole (the in-universe creative
// role like "Режиссер").
export function AuthProvider({ children }: { children: React.ReactNode }) {
    const { currentUser, setCurrentUser, clearCurrentUser } = useUserContext();

    const session = useMemo<Session | null>(
        () =>
            currentUser ? { userId: currentUser.charName, role: AUTH_ROLES[0], issuedAt: 0 } : null,
        [currentUser],
    );

    const signIn = useCallback((user: CurrentUser) => setCurrentUser(user), [setCurrentUser]);
    const signOut = useCallback(() => clearCurrentUser(), [clearCurrentUser]);

    const ctx: AuthCtx = {
        status: currentUser ? "authenticated" : "anonymous",
        session,
        signIn,
        signOut,
    };

    return <Ctx.Provider value={ctx}>{children}</Ctx.Provider>;
}
