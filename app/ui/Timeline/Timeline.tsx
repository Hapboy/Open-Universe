import React, { useState, useMemo } from "react";
import cn from "classnames";
import { useGraphContext } from "../../store/contexts/GraphContext.tsx";
import { usePlayerContext } from "../../store/contexts/PlayerContext.tsx";
import { formatTime } from "./timelineUtils.ts";
import { SceneTrackView } from "./SceneTrackView/SceneTrackView.tsx";
import { SynapsesCanvas } from "./SynapsesCanvas/SynapsesCanvas.tsx";
import { SceneArcSettings } from "./SceneArcSettings/SceneArcSettings.tsx";
import { DurationEditor } from "./DurationEditor/DurationEditor.tsx";
import styles from "./Timeline.module.css";

export function Timeline() {
    const {
        scenes: baseScenes,
        createScene,
        activeSceneId,
        setActiveSceneId,
        showMontageMonitor,
        setShowMontageMonitor,
        showMiniMap,
        setShowMiniMap,
        showWorldMap,
        setShowWorldMap,
        totalDuration,
        setTotalDuration,
    } = useGraphContext();

    const {
        currentTime,
        setCurrentTime,
        isPlaying,
        togglePlay,
        stopPlay,
        playSpeed,
        cycleSpeed,
        collapseEmptySpace,
        setCollapseEmptySpace,
        uniqueStarts,
        packedStarts,
        totalPackedDuration,
        editorFollowsPlayback,
        setEditorFollowsPlayback,
    } = usePlayerContext();

    // Tab State
    const [activeTab, setActiveTab] = useState<"scenes" | "synapses" | "settings">("scenes");

    const [volume, setVolume] = useState<number>(80); // 0 to 100
    const [isMuted, setIsMuted] = useState<boolean>(false);
    const [isAutoMontage, setIsAutoMontage] = useState<boolean>(false);
    const [showVolumeSlider, setShowVolumeSlider] = useState<boolean>(false);

    // Camera toggle state — ephemeral per-session UI state, not a node param.
    // Untouched scenes (including newly added ones) default to camera-active.
    const [activeCameras, setActiveCameras] = useState<Record<string, boolean>>({});

    // Derive scenes list with active-camera state applied
    const scenes = useMemo(
        () =>
            baseScenes.map((s) => ({
                ...s,
                cameraActive: activeCameras[s.id] ?? true,
            })),
        [baseScenes, activeCameras],
    );

    // Next/Prev scene jumps
    const jumpScene = (forward = true) => {
        const starts = uniqueStarts;
        if (forward) {
            const nextStart = starts.find((st) =>
                collapseEmptySpace ? packedStarts[st] > currentTime : st > currentTime,
            );
            if (nextStart !== undefined) {
                const nextId = scenes.find((s) => s.start === nextStart)?.id;
                if (nextId) setActiveSceneId(nextId);
                setCurrentTime(collapseEmptySpace ? packedStarts[nextStart] : nextStart);
            } else {
                setCurrentTime(collapseEmptySpace ? totalPackedDuration : totalDuration);
            }
        } else {
            const prevStarts = [...starts].reverse();
            const prevStart = prevStarts.find((st) =>
                collapseEmptySpace ? packedStarts[st] < currentTime - 1 : st < currentTime - 1,
            );
            if (prevStart !== undefined) {
                const prevId = scenes.find((s) => s.start === prevStart)?.id;
                if (prevId) setActiveSceneId(prevId);
                setCurrentTime(collapseEmptySpace ? packedStarts[prevStart] : prevStart);
            } else {
                setCurrentTime(0);
            }
        }
    };

    // Mute toggle
    const toggleMute = () => setIsMuted(!isMuted);

    // Toggle camera active for parallel scenes
    const toggleCamera = (sceneId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const targetScene = scenes.find((s) => s.id === sceneId);
        if (!targetScene) return;

        setActiveCameras((prev) => {
            const next = { ...prev };
            const newActive = !prev[sceneId];
            next[sceneId] = newActive;

            // If not in auto-montage and we are activating, deactivate other parallel scenes
            if (!isAutoMontage && newActive) {
                scenes.forEach((s) => {
                    if (s.start === targetScene.start && s.id !== sceneId) {
                        next[s.id] = false;
                    }
                });
            }
            return next;
        });
    };

    // Calculate current scrubber position percentage
    const maxTime = collapseEmptySpace ? totalPackedDuration : totalDuration;

    if (scenes.length === 0) {
        return (
            <div className={styles.timelineContainer}>
                <div className={styles.emptyState}>
                    <i className="ti ti-movie-off" />
                    <p>Сцен пока нет</p>
                    <button className={styles.tbBtn} onClick={createScene}>
                        <i className="ti ti-plus" />
                        <span>Добавить сцену</span>
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.timelineContainer}>
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    <i className="ti ti-timeline" />
                    <span>Таймлайн фильма</span>

                    {/* Segmented Timeline Tabs */}
                    <div className={styles.tabHeaders}>
                        <button
                            className={cn(
                                styles.tabHeaderBtn,
                                activeTab === "scenes" && styles.tabHeaderBtnActive,
                            )}
                            onClick={() => setActiveTab("scenes")}>
                            <i className="ti ti-layout-grid" />
                            <span>Сцены</span>
                        </button>
                        <button
                            className={cn(
                                styles.tabHeaderBtn,
                                activeTab === "synapses" && styles.tabHeaderBtnActive,
                            )}
                            onClick={() => setActiveTab("synapses")}>
                            <i className="ti ti-circles" />
                            <span>Сеть судеб</span>
                        </button>
                        <button
                            className={cn(
                                styles.tabHeaderBtn,
                                activeTab === "settings" && styles.tabHeaderBtnActive,
                            )}
                            onClick={() => setActiveTab("settings")}>
                            <i className="ti ti-adjustments" />
                            <span>Scene Arc</span>
                        </button>
                    </div>

                    <button className={styles.tbBtn} onClick={createScene} title="Добавить сцену">
                        <i className="ti ti-plus" />
                    </button>
                </div>
                <div className={styles.headerRight}>
                    <span>{scenes.length} сцен</span>
                    <span>·</span>
                    <DurationEditor totalDuration={totalDuration} onChange={setTotalDuration} />
                </div>
            </div>

            {/* Main Tracks / Canvas Area depending on Active Tab */}
            <div className={styles.mainTimelineArea}>
                {activeTab === "scenes" && (
                    <SceneTrackView
                        scenes={scenes}
                        activeSceneId={activeSceneId}
                        currentTime={currentTime}
                        setCurrentTime={setCurrentTime}
                        collapseEmptySpace={collapseEmptySpace}
                        totalDuration={totalDuration}
                        totalPackedDuration={totalPackedDuration}
                        packedStarts={packedStarts}
                        onToggleCamera={toggleCamera}
                    />
                )}

                {activeTab === "synapses" && (
                    <SynapsesCanvas
                        scenes={scenes}
                        activeSceneId={activeSceneId}
                        currentTime={currentTime}
                        setCurrentTime={setCurrentTime}
                        collapseEmptySpace={collapseEmptySpace}
                        totalDuration={totalDuration}
                        totalPackedDuration={totalPackedDuration}
                        packedStarts={packedStarts}
                    />
                )}

                {activeTab === "settings" && <SceneArcSettings />}
            </div>

            {/* Control panel buttons */}
            <div className={styles.controlsBar}>
                <div className={styles.btnGroup}>
                    <button
                        className={styles.tbBtn}
                        onClick={() => jumpScene(false)}
                        title="Предыдущая сцена">
                        <i className="ti ti-player-skip-back" />
                    </button>
                    <button
                        className={styles.tbBtn}
                        onClick={togglePlay}
                        title={isPlaying ? "Пауза" : "Играть"}>
                        <i className={cn(isPlaying ? "ti ti-player-pause" : "ti ti-player-play")} />
                    </button>
                    <button className={styles.tbBtn} onClick={stopPlay} title="Стоп">
                        <i className="ti ti-player-stop" />
                    </button>
                    <button
                        className={styles.tbBtn}
                        onClick={() => jumpScene(true)}
                        title="Следующая сцена">
                        <i className="ti ti-player-skip-forward" />
                    </button>
                </div>

                <div className={styles.btnGroup}>
                    <button
                        className={styles.tbBtn}
                        onClick={() => cycleSpeed(false)}
                        title="Замедлить">
                        <i className="ti ti-chevron-left" />
                    </button>
                    <span className={styles.tbBtn} title="Текущая скорость воспроизведения">
                        {playSpeed.toFixed(1)}x
                    </span>
                    <button
                        className={styles.tbBtn}
                        onClick={() => cycleSpeed(true)}
                        title="Ускорить">
                        <i className="ti ti-chevron-right" />
                    </button>
                </div>

                {/* Volume popover adjustment */}
                <div
                    className={styles.volumeWrapper}
                    onMouseEnter={() => setShowVolumeSlider(true)}
                    onMouseLeave={() => setShowVolumeSlider(false)}>
                    <button
                        className={cn(
                            styles.tbBtn,
                            (isMuted || volume === 0) && styles.tbBtnActive,
                        )}
                        onClick={toggleMute}
                        title={isMuted ? "Включить звук" : "Выключить звук"}>
                        <i
                            className={cn(
                                isMuted || volume === 0
                                    ? "ti ti-volume-off"
                                    : volume > 50
                                      ? "ti ti-volume"
                                      : "ti ti-volume-2",
                            )}
                        />
                    </button>
                    {showVolumeSlider && (
                        <div className={styles.volumePopover}>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={isMuted ? 0 : volume}
                                onChange={(e) => {
                                    setVolume(Number(e.target.value));
                                    if (isMuted) setIsMuted(false);
                                }}
                                className={styles.volumeInput}
                            />
                        </div>
                    )}
                </div>

                <button
                    className={cn(styles.tbBtn, collapseEmptySpace && styles.tbBtnActive)}
                    onClick={() => setCollapseEmptySpace(!collapseEmptySpace)}
                    title="Смотреть подряд без пустых мест">
                    <i className="ti ti-arrows-minimize" />
                    <span>Стыковка сцен</span>
                </button>

                <button
                    className={cn(styles.tbBtn, isAutoMontage && styles.tbBtnActive)}
                    onClick={() => setIsAutoMontage(!isAutoMontage)}
                    title="Автоматический монтаж при параллельных сценах">
                    <i className="ti ti-git-fork" />
                    <span>Автомонтаж</span>
                </button>

                <span className={styles.divider} />

                <button
                    className={cn(styles.tbBtn, showMiniMap && styles.tbBtnActive)}
                    onClick={() => setShowMiniMap(!showMiniMap)}
                    aria-pressed={showMiniMap}
                    title={showMiniMap ? "Скрыть миникарту холста" : "Показать миникарту холста"}>
                    <i className="ti ti-map-2" />
                </button>

                <button
                    className={cn(styles.tbBtn, showWorldMap && styles.tbBtnActive)}
                    onClick={() => setShowWorldMap(!showWorldMap)}
                    aria-pressed={showWorldMap}
                    title={showWorldMap ? "Скрыть карту мира" : "Показать карту мира"}>
                    <i className="ti ti-world" />
                </button>

                <button
                    className={cn(styles.tbBtn, showMontageMonitor && styles.tbBtnActive)}
                    onClick={() => setShowMontageMonitor(!showMontageMonitor)}
                    title="Открыть Главный Экран Монтажа">
                    <i className="ti ti-device-tv" />
                </button>

                <button
                    className={cn(styles.tbBtn, editorFollowsPlayback && styles.tbBtnActive)}
                    onClick={() => setEditorFollowsPlayback(!editorFollowsPlayback)}
                    title={
                        editorFollowsPlayback
                            ? "Редактор следует за плейхедом во время воспроизведения"
                            : "Редактор закреплён на редактируемой сцене"
                    }>
                    <i className={cn(editorFollowsPlayback ? "ti ti-lock-open" : "ti ti-lock")} />
                </button>

                <span className={styles.spacer} />

                <div className={styles.timeDisplay}>
                    {formatTime(currentTime)} / {formatTime(maxTime)}
                </div>
            </div>
        </div>
    );
}
