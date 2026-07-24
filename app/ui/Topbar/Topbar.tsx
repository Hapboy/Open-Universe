import cn from "classnames";
import { useGraphContext } from "../../store/contexts/GraphContext.tsx";
import { usePwaContext } from "../../store/contexts/PwaContext.tsx";
import { useUserContext } from "../../store/contexts/UserContext.tsx";
import { useModalContext } from "../../store/contexts/ModalContext.tsx";
import { useFullscreenToggle } from "../hooks/useFullscreenToggle.ts";
import styles from "./Topbar.module.css";

export function Topbar() {
    const { executeGraph } = useGraphContext();
    const { deferredInstallPrompt, setDeferredInstallPrompt } = usePwaContext();
    const { openModal } = useModalContext();
    const toggleFullscreen = useFullscreenToggle(() => document.getElementById("app"));

    const handleInstall = async () => {
        if (!deferredInstallPrompt) return;
        await deferredInstallPrompt.prompt();
        const { outcome } = await deferredInstallPrompt.userChoice;
        console.log("PWA install:", outcome);
        setDeferredInstallPrompt(null);
    };

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
                    onClick={() => openModal("storage")}
                    title="Локальное хранилище">
                    <i className="ti ti-database" />
                </button>
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
            <TeamButton />
            {deferredInstallPrompt && (
                <button className={styles.tb} onClick={handleInstall}>
                    <i className="ti ti-download" />
                    <span>Установить</span>
                </button>
            )}
        </header>
    );
}

function TeamButton() {
    const { team } = useUserContext();
    const { openModal } = useModalContext();
    return (
        <button className={styles.tb} id="btnTeam" onClick={() => openModal("team")}>
            <i className="ti ti-users-group" />
            <span>Команда</span>
            <b>{team.length + 1}</b>
        </button>
    );
}
