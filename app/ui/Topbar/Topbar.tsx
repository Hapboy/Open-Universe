import cn from "classnames";
import { useGraphContext } from "../../store/contexts/GraphContext.tsx";
import { usePwaContext } from "../../store/contexts/PwaContext.tsx";
import { useUserContext } from "../../store/contexts/UserContext.tsx";
import { useFullscreenToggle } from "../hooks/useFullscreenToggle.ts";
import styles from "./Topbar.module.css";

export function Topbar() {
    const { executeGraph, showMiniMap, setShowMiniMap, showWorldMap, setShowWorldMap } =
        useGraphContext();
    const { deferredInstallPrompt, setDeferredInstallPrompt } = usePwaContext();
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
                    className={cn(styles.iconBtn, showMiniMap && styles.iconBtnActive)}
                    onClick={() => setShowMiniMap(!showMiniMap)}
                    aria-pressed={showMiniMap}
                    title={showMiniMap ? "Скрыть миникарту холста" : "Показать миникарту холста"}>
                    <i className="ti ti-map-2" />
                </button>
                <button
                    className={cn(styles.iconBtn, showWorldMap && styles.iconBtnActive)}
                    onClick={() => setShowWorldMap(!showWorldMap)}
                    aria-pressed={showWorldMap}
                    title={showWorldMap ? "Скрыть карту мира" : "Показать карту мира"}>
                    <i className="ti ti-world" />
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
    return (
        <button className={styles.tb} id="btnTeam" data-open-modal="team">
            <i className="ti ti-users-group" />
            <span>Команда</span>
            <b>{team.length + 1}</b>
        </button>
    );
}
