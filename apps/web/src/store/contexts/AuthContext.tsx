import { createContext, useContext, useMemo } from "react";
import { useUserContext } from "./UserContext.tsx";
import { AUTH_ROLES, type AuthStatus } from "@open-universe/shared";

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

// Scaffold only: no real backend/session token yet — derives `status`/
// `session` from the existing mock UserContext identity (signup/login are
// handled directly through UserContext, since they need credential
// arguments this context doesn't carry) so a later Next.js auth-firewall
// pass can drop in a real implementation behind this same interface without
// touching call sites. `role` here is a placeholder access-control concept,
// distinct from TeamRole (the in-universe creative role like "Режиссер").
export function AuthProvider({ children }: { children: React.ReactNode }) {
    const { currentUser, logOut } = useUserContext();

    const session = useMemo<Session | null>(
        () => (currentUser ? { userId: currentUser.id, role: AUTH_ROLES[0], issuedAt: 0 } : null),
        [currentUser],
    );

    const ctx: AuthCtx = {
        status: currentUser ? "authenticated" : "anonymous",
        session,
        signOut: logOut,
    };

    return <Ctx.Provider value={ctx}>{children}</Ctx.Provider>;
}
