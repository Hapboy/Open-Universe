import { useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import cn from "classnames";
import { useGraphContext } from "@/store/contexts/GraphContext.tsx";
import type { TimelineScene } from "@/types.ts";
import { useResolvedMediaUrls } from "@/core/mediaRef.ts";
import { ConfirmDialog } from "@/ui/components/ConfirmDialog/ConfirmDialog.tsx";
import {
    computeRulerTicks,
    findSceneAtTime,
    formatTime,
    getScenePosition,
} from "@/ui/Timeline/timelineUtils.ts";
import styles from "@/ui/Timeline/Timeline.module.css";

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
    const { setActiveSceneId, deleteScene } = useGraphContext();
    const containerRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef<boolean>(false);
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
    const pendingDeleteScene = scenes.find((s) => s.id === pendingDeleteId);

    const resolvedCovers = useResolvedMediaUrls(scenes.map((s) => s.coverUrl));
    const coverBySceneId = useMemo(
        () => new Map(scenes.map((s, i) => [s.id, resolvedCovers[i]])),
        [scenes, resolvedCovers],
    );

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
                        backgroundImage: coverBySceneId.get(scene.id)
                            ? `url(${coverBySceneId.get(scene.id)})`
                            : undefined,
                    }}
                    tabIndex={0}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={() => handleSceneTabClick(scene.id, scene.start)}
                    onKeyDown={(e) => {
                        // The only way to delete a scene now — output_scene
                        // itself is no longer deletable/duplicable directly
                        // on the canvas (see NodeCard.tsx/NodeEditor.tsx).
                        // Confirmed via the dialog below, not immediate —
                        // there's no undo for a scene delete (it fires a
                        // real backend remove).
                        if (e.key !== "Delete") return;
                        e.preventDefault();
                        setPendingDeleteId(scene.id);
                    }}>
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
        <div className={styles.timelineTrackArea} ref={containerRef} onMouseDown={handleScrubStart}>
            <div className={styles.rulerContainer}>{renderRulerTicks()}</div>

            <div className={styles.tracksWrapper}>
                {renderTrack(scenes.filter((s) => s.track === 1))}
                {renderTrack(scenes.filter((s) => s.track === 2))}
            </div>

            <div className={styles.playhead} style={{ left: `${scrubberPercent}%` }}>
                <div className={styles.playheadHandle} />
            </div>

            {pendingDeleteScene &&
                createPortal(
                    <ConfirmDialog
                        title="Удалить сцену?"
                        message={`Сцена «${pendingDeleteScene.title || `Сцена ${pendingDeleteScene.num}`}» будет удалена без возможности отменить.`}
                        confirmLabel="Удалить"
                        onConfirm={() => {
                            deleteScene(pendingDeleteScene.id);
                            setPendingDeleteId(null);
                        }}
                        onCancel={() => setPendingDeleteId(null)}
                    />,
                    document.body,
                )}
        </div>
    );
}
