import { createContext, useCallback, useContext, useState } from "react";
import type { CurrentUser, TeamMember } from "../../types.ts";
import { readJSON, removeKey, writeJSON } from "../../core/browserStorage.ts";

const CURRENT_USER_KEY = "hv_current_user";

const INITIAL_TEAM: TeamMember[] = [
    { name: "Арам", charName: "Аракс", side: "moct", role: "Разработчик", isMe: false },
    { name: "Сона", charName: "Ани", side: "urvakan", role: "Стилист", isMe: false },
    { name: "Карен", charName: "Давид", side: "rambalkoshe", role: "Художник", isMe: false },
];

interface UserCtx {
    currentUser: CurrentUser | null;
    setCurrentUser: (u: CurrentUser) => void;
    clearCurrentUser: () => void;
    team: TeamMember[];
}

const Ctx = createContext<UserCtx>(null!);
export const useUserContext = () => useContext(Ctx);

export function UserProvider({ children }: { children: React.ReactNode }) {
    const [currentUser, setCurrentUserBase] = useState<CurrentUser | null>(() =>
        readJSON<CurrentUser | null>(CURRENT_USER_KEY, null),
    );

    const setCurrentUser = useCallback((u: CurrentUser) => {
        writeJSON(CURRENT_USER_KEY, u);
        setCurrentUserBase(u);
    }, []);

    // Added for AuthContext's signOut — nothing in the app called this
    // before, since there was no concept of "logged out" once onboarded.
    const clearCurrentUser = useCallback(() => {
        removeKey(CURRENT_USER_KEY);
        setCurrentUserBase(null);
    }, []);

    const ctx: UserCtx = { currentUser, setCurrentUser, clearCurrentUser, team: INITIAL_TEAM };

    return <Ctx.Provider value={ctx}>{children}</Ctx.Provider>;
}
