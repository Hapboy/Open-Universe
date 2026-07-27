import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { CurrentUser, StoredAccount, TeamMember } from "../../types.ts";
import { readJSON, removeKey, writeJSON } from "../../core/browserStorage.ts";

const ACCOUNT_KEY = "hv_account";
const SESSION_KEY = "hv_session_active";
const LEGACY_CURRENT_USER_KEY = "hv_current_user";

const INITIAL_TEAM: TeamMember[] = [
    {
        id: "team-aram",
        name: "Арам",
        charName: "Аракс",
        side: "moct",
        role: "Разработчик",
        isMe: false,
    },
    {
        id: "team-sona",
        name: "Сона",
        charName: "Ани",
        side: "urvakan",
        role: "Стилист",
        isMe: false,
    },
    {
        id: "team-karen",
        name: "Карен",
        charName: "Давид",
        side: "rambalkoshe",
        role: "Художник",
        isMe: false,
    },
];

export type AuthResult = { ok: true } | { ok: false; error: string };

interface UserCtx {
    currentUser: CurrentUser | null;
    hasAccount: boolean;
    team: TeamMember[];
    // False until the mount effect below has read the real stored account —
    // lets consumers whose rendering meaningfully differs by auth state (e.g.
    // Topbar's login/profile buttons) wait instead of flashing "logged out"
    // for a frame before flipping to the real state.
    hydrated: boolean;
    signUp: (name: string, password: string) => AuthResult;
    logIn: (name: string, password: string) => AuthResult;
    logOut: () => void;
}

const Ctx = createContext<UserCtx>(null!);
export const useUserContext = () => useContext(Ctx);

// TODO(remove-legacy-account-migration): one-time upgrade from the old
// always-logged-in CurrentUser shape (no id, no password, no separate
// session concept — the app just had "the onboarded user" or nothing) to the
// id-keyed account + session model. Safe to delete once active users'
// localStorage is assumed to have already gone through it.
function loadAccount(): StoredAccount | null {
    const stored = readJSON<StoredAccount | null>(ACCOUNT_KEY, null);
    if (stored) return stored;

    const legacy = readJSON<CurrentUser | null>(LEGACY_CURRENT_USER_KEY, null);
    if (!legacy) return null;
    const migrated: StoredAccount = { ...legacy, id: crypto.randomUUID(), password: "" };
    writeJSON(ACCOUNT_KEY, migrated);
    writeJSON(SESSION_KEY, true);
    removeKey(LEGACY_CURRENT_USER_KEY);
    return migrated;
}

export function UserProvider({ children }: { children: React.ReactNode }) {
    // SSR-safe default (logged out, no localStorage access) — identical on the
    // server and the client's first paint. The real account/session load in
    // the mount effect below.
    const [account, setAccount] = useState<StoredAccount | null>(null);
    const [sessionActive, setSessionActive] = useState<boolean>(false);
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        // Syncing from localStorage, an external system unreadable at render
        // time on the server; this is the documented valid case for the rule.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setAccount(loadAccount());
        setSessionActive(readJSON<boolean>(SESSION_KEY, false));
        setHydrated(true);
    }, []);

    const signUp = useCallback(
        (name: string, password: string): AuthResult => {
            if (account) {
                return { ok: false, error: "На этом устройстве уже есть аккаунт — войдите." };
            }
            if (!name.trim() || !password) {
                return { ok: false, error: "Заполните имя и пароль." };
            }
            const created: StoredAccount = {
                id: crypto.randomUUID(),
                name: name.trim(),
                password,
                charName: name.trim(),
                side: "urvakan",
                role: "Режиссер",
            };
            writeJSON(ACCOUNT_KEY, created);
            writeJSON(SESSION_KEY, true);
            setAccount(created);
            setSessionActive(true);
            return { ok: true };
        },
        [account],
    );

    const logIn = useCallback((name: string, password: string): AuthResult => {
        const stored = loadAccount();
        if (!stored || stored.name !== name.trim() || stored.password !== password) {
            return { ok: false, error: "Неверное имя или пароль." };
        }
        writeJSON(SESSION_KEY, true);
        setAccount(stored);
        setSessionActive(true);
        return { ok: true };
    }, []);

    const logOut = useCallback(() => {
        writeJSON(SESSION_KEY, false);
        setSessionActive(false);
    }, []);

    const currentUser = useMemo<CurrentUser | null>(() => {
        if (!sessionActive || !account) return null;
        const { password: _password, ...rest } = account;
        return rest;
    }, [sessionActive, account]);

    const ctx: UserCtx = {
        currentUser,
        hasAccount: !!account,
        team: INITIAL_TEAM,
        hydrated,
        signUp,
        logIn,
        logOut,
    };

    return <Ctx.Provider value={ctx}>{children}</Ctx.Provider>;
}
