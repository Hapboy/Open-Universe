import { useRef } from "react";
import cn from "classnames";
import { useGraphContext } from "../../../store/contexts/GraphContext.tsx";
import type { TimelineScene } from "../../../types.ts";
import {
    computeRulerTicks,
    findSceneAtTime,
    formatTime,
    getScenePosition,
} from "../timelineUtils.ts";
import styles from "../Timeline.module.css";

interface SceneTrackViewProps {
    scenes: TimelineScene[];
    activeSceneId: string | null;
    currentTime: number;
    setCurrentTime: (t: number) => void;
    collapseEmptySpace: boolean;
    totalDuration: number;
    totalPackedDuration: number;
    packedStarts: Record<number, number>;
    onToggleCamera: (sceneId: string, e: React.MouseEvent) => void;
}

export function SceneTrackView({
    scenes,
    activeSceneId,
    currentTime,
    setCurrentTime,
    collapseEmptySpace,
    totalDuration,
    totalPackedDuration,
    packedStarts,
    onToggleCamera,
}: SceneTrackViewProps) {
    const { setActiveSceneId } = useGraphContext();
    const containerRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef<boolean>(false);

    const maxTime = collapseEmptySpace ? totalPackedDuration : totalDuration;

    const handleScrub = (clientX: number) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        const targetTime = percent * maxTime;
        setCurrentTime(targetTime);

        const active = findSceneAtTime(scenes, targetTime, collapseEmptySpace, packedStarts);
        if (active && active.id !== activeSceneId) setActiveSceneId(active.id);
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging.current) return;
        handleScrub(e.clientX);
    };

    const handleMouseUp = () => {
        isDragging.current = false;
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
    };

    const handleScrubStart = (e: React.MouseEvent<HTMLDivElement>) => {
        isDragging.current = true;
        handleScrub(e.clientX);
        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);
    };

    const handleSceneTabClick = (sceneId: string, sceneStart: number) => {
        setActiveSceneId(sceneId);
        setCurrentTime(collapseEmptySpace ? packedStarts[sceneStart] : sceneStart);
    };

    const isSceneActive = (scene: TimelineScene) =>
        findSceneAtTime(scenes, currentTime, collapseEmptySpace, packedStarts)?.id === scene.id;

    const scrubberPercent = (currentTime / maxTime) * 100;

    const renderRulerTicks = () =>
        computeRulerTicks(maxTime).map((tick) => (
            <div
                key={tick.time}
                className={tick.isMajor ? styles.rulerTick : styles.rulerTickMinor}
                style={{ left: `${(tick.time / maxTime) * 100}%` }}>
                {tick.isMajor && <span className={styles.tickLabel}>{formatTime(tick.time)}</span>}
            </div>
        ));

    const renderTrack = (trackScenes: TimelineScene[]) => (
        <div className={styles.trackRow}>
            {trackScenes.map((scene) => (
                <div
                    key={scene.id}
                    className={cn(
                        styles.sceneCard,
                        isSceneActive(scene) && styles.sceneCardActive,
                        scene.id === activeSceneId && styles.sceneCardSelected,
                    )}
                    style={{
                        ...getScenePosition(scene, {
                            collapseEmptySpace,
                            totalDuration,
                            totalPackedDuration,
                            packedStarts,
                        }),
                        backgroundImage: `url(${scene.coverUrl})`,
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={() => handleSceneTabClick(scene.id, scene.start)}>
                    <div className={styles.cardOverlay}>
                        <span className={styles.sceneNum}>Scene {scene.num}</span>
                        <span className={styles.sceneTitle}>{scene.title}</span>
                    </div>
                    <button
                        className={cn(styles.camBtn, scene.cameraActive && styles.camBtnActive)}
                        onClick={(e) => onToggleCamera(scene.id, e)}
                        title="Активировать камеру для рендера">
                        <i className="ti ti-video" />
                    </button>
                </div>
            ))}
        </div>
    );

    return (
        <>
            <div className={styles.rulerContainer} onMouseDown={handleScrubStart}>
                {renderRulerTicks()}
            </div>

            <div className={styles.tracksWrapper} ref={containerRef} onMouseDown={handleScrubStart}>
                <div className={styles.playhead} style={{ left: `${scrubberPercent}%` }}>
                    <div className={styles.playheadHandle} />
                </div>

                {renderTrack(scenes.filter((s) => s.track === 1))}
                {renderTrack(scenes.filter((s) => s.track === 2))}
            </div>
        </>
    );
}
