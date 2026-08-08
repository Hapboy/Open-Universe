import cn from "classnames";
import { useGraphContext } from "@/store/contexts/GraphContext.tsx";
import { useUserContext } from "@/store/contexts/UserContext.tsx";
import { useModalContext } from "@/store/contexts/ModalContext.tsx";
import { useFullscreenToggle } from "@/ui/hooks/useFullscreenToggle.ts";
import styles from "@/ui/Topbar/Topbar.module.css";

export function Topbar() {
    const { executeGraph } = useGraphContext();
    const { openModal } = useModalContext();
    const toggleFullscreen = useFullscreenToggle(() => document.getElementById("app"));

    return (
        <header className={styles.topbar}>
            <div className={styles.brand}>
                <i className="ti ti-affiliate" />
                <span>Open Universe</span>
            </div>

            <div className={styles.spacer} />

            <div className={styles.iconGroup}>
                <button
                    className={styles.iconBtn}
                    onClick={toggleFullscreen}
                    title="Полноэкранный режим">
                    <i className="ti ti-arrows-maximize" />
                </button>
            </div>

            <button
                className={cn(styles.tb, styles.runBtn)}
                id="btnRun"
                onClick={() => void executeGraph()}>
                <i className="ti ti-player-play" />
                <span>Прогнать граф</span>
            </button>
            <ProfileButton />
            <AuthButton />
        </header>
    );
}

function ProfileButton() {
    const { currentUser, hydrated } = useUserContext();
    const { openModal } = useModalContext();

    if (!hydrated || !currentUser) return null;

    return (
        <button className={styles.tb} id="btnProfile" onClick={() => openModal("profile")}>
            <i className="ti ti-user-circle" />
            <span>Профиль</span>
        </button>
    );
}

// Signing up isn't required to use the app locally — only to save graphs to
// a backend and collaborate with the rest of the team, once that exists.
// This button is the opt-in entry point instead of a forced onboarding modal.
function AuthButton() {
    const { currentUser, hydrated, logOut } = useUserContext();
    const { openModal } = useModalContext();

    if (!hydrated) return null;

    if (currentUser) {
        return (
            <button className={styles.tb} id="btnLogout" onClick={logOut}>
                <i className="ti ti-logout" />
                <span>Выйти</span>
            </button>
        );
    }

    return (
        <button className={styles.tb} id="btnSignup" onClick={() => openModal("signup")}>
            <i className="ti ti-login" />
            <span>Войти</span>
        </button>
    );
}
