import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ApiError } from "@hayverse/api-client";
import type { CurrentUser, TeamMember } from "../../types.ts";
import { hayverseApiClient } from "../../core/api/hayverse/client.ts";
import { clearToken, getToken, setToken } from "../../core/auth/tokenStore.ts";

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

export interface SignupInput {
    username: string;
    password: string;
    firstName: string;
    lastName?: string;
}

interface UserCtx {
    currentUser: CurrentUser | null;
    hasAccount: boolean;
    team: TeamMember[];
    // False until the mount effect below has resolved the stored token (or
    // found none) - lets consumers whose rendering meaningfully differs by
    // auth state (e.g. Topbar's login/profile buttons) wait instead of
    // flashing "logged out" for a frame before flipping to the real state.
    hydrated: boolean;
    signUp: (input: SignupInput) => Promise<AuthResult>;
    logIn: (username: string, password: string) => Promise<AuthResult>;
    logOut: () => void;
}

const Ctx = createContext<UserCtx>(null!);
export const useUserContext = () => useContext(Ctx);

function authErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof ApiError) {
        if (error.status === 409) return "Это имя пользователя уже занято.";
        if (error.status === 401) return "Неверное имя пользователя или пароль.";
    }
    return fallback;
}

export function UserProvider({ children }: { children: React.ReactNode }) {
    // SSR-safe default (logged out, no localStorage/network access) —
    // identical on the server and the client's first paint. The real
    // session is resolved in the mount effect below.
    const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        const token = getToken();
        if (!token) {
            // No stored session to resolve - synchronous, but this is the
            // same documented valid case UserContext has always had for this
            // rule: reading an external system (localStorage) unreadable at
            // render time on the server.
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setHydrated(true);
            return;
        }
        hayverseApiClient.auth
            .me()
            .then(({ user }) => setCurrentUser(user))
            .catch(() => {
                clearToken();
                setCurrentUser(null);
            })
            .finally(() => setHydrated(true));
    }, []);

    const signUp = useCallback(async (input: SignupInput): Promise<AuthResult> => {
        try {
            const { user, token } = await hayverseApiClient.auth.signup(input);
            setToken(token);
            setCurrentUser(user);
            return { ok: true };
        } catch (error) {
            return { ok: false, error: authErrorMessage(error, "Не удалось зарегистрироваться.") };
        }
    }, []);

    const logIn = useCallback(async (username: string, password: string): Promise<AuthResult> => {
        try {
            const { user, token } = await hayverseApiClient.auth.login({ username, password });
            setToken(token);
            setCurrentUser(user);
            return { ok: true };
        } catch (error) {
            return { ok: false, error: authErrorMessage(error, "Не удалось войти.") };
        }
    }, []);

    const logOut = useCallback(() => {
        clearToken();
        setCurrentUser(null);
        // Stateless on the server (see AuthController.logout) - fire and
        // forget, nothing to await for the UI to reflect being logged out.
        void hayverseApiClient.auth.logout().catch(() => {});
    }, []);

    const ctx: UserCtx = useMemo(
        () => ({
            currentUser,
            hasAccount: !!currentUser,
            team: INITIAL_TEAM,
            hydrated,
            signUp,
            logIn,
            logOut,
        }),
        [currentUser, hydrated, signUp, logIn, logOut],
    );

    return <Ctx.Provider value={ctx}>{children}</Ctx.Provider>;
}
