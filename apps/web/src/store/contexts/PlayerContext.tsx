import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useGraphContext } from "./GraphContext.tsx";
import { findSceneAtTime } from "../../ui/Timeline/timelineUtils.ts";

const SPEED_LIST = [0.5, 1.0, 1.5, 2.0];

interface PlayerCtx {
    currentTime: number;
    setCurrentTime: (t: number) => void;
    isPlaying: boolean;
    togglePlay: () => void;
    stopPlay: () => void;
    playSpeed: number;
    cycleSpeed: (forward?: boolean) => void;
    collapseEmptySpace: boolean;
    setCollapseEmptySpace: (v: boolean) => void;

    uniqueStarts: number[];
    packedStarts: Record<number, number>;
    totalPackedDuration: number;

    // Scene under the playhead right now (or null in a gap / no scenes).
    playingSceneId: string | null;
    // Seconds into that scene the playhead currently sits at (null when
    // playingSceneId is null).
    playingSceneRelativeTime: number | null;

    // When false (default), the node-editor canvas stays on whatever scene
    // is being edited during playback — only the Monitor advances. When
    // true, the editor also switches to each scene as the playhead crosses
    // it (deliberate navigation like scrubbing/skip always switches the
    // editor regardless of this flag).
    editorFollowsPlayback: boolean;
    setEditorFollowsPlayback: (v: boolean) => void;
}

const Ctx = createContext<PlayerCtx>(null!);
export const usePlayerContext = () => useContext(Ctx);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
    const { scenes, totalDuration, activeSceneId, setActiveSceneId } = useGraphContext();

    const [currentTime, setCurrentTime] = useState<number>(0);
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const [playSpeed, setPlaySpeed] = useState<number>(1.0);
    const [collapseEmptySpace, setCollapseEmptySpace] = useState<boolean>(false);
    const [editorFollowsPlayback, setEditorFollowsPlayback] = useState<boolean>(false);

    const { uniqueStarts, packedStarts, totalPackedDuration } = useMemo(() => {
        const uniqueStarts = Array.from(new Set(scenes.map((s) => s.start))).sort((a, b) => a - b);
        const startDurations = uniqueStarts.map((start) => {
            const activeScenesAtStart = scenes.filter((s) => s.start === start);
            return Math.max(...activeScenesAtStart.map((s) => s.duration), 0);
        });

        const packedStarts: Record<number, number> = {};
        let currentPackedTime = 0;
        for (let i = 0; i < uniqueStarts.length; i++) {
            packedStarts[uniqueStarts[i]] = currentPackedTime;
            currentPackedTime += startDurations[i];
        }
        return { uniqueStarts, packedStarts, totalPackedDuration: currentPackedTime };
    }, [scenes]);

    // Playback timer loop
    useEffect(() => {
        if (!isPlaying) return;

        let lastTime = performance.now();
        let frameId: number;

        const tick = (now: number) => {
            const delta = (now - lastTime) / 1000;
            lastTime = now;

            setCurrentTime((prevTime) => {
                const nextTime = prevTime + delta * playSpeed;
                const maxTime = collapseEmptySpace ? totalPackedDuration : totalDuration;
                if (nextTime >= maxTime) {
                    setIsPlaying(false);
                    return maxTime;
                }
                return nextTime;
            });

            frameId = requestAnimationFrame(tick);
        };

        frameId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frameId);
    }, [isPlaying, playSpeed, collapseEmptySpace, totalDuration, totalPackedDuration]);

    const togglePlay = useCallback(() => setIsPlaying((p) => !p), []);
    const stopPlay = useCallback(() => {
        setIsPlaying(false);
        setCurrentTime(0);
    }, []);

    const cycleSpeed = useCallback((forward = true) => {
        setPlaySpeed((speed) => {
            const idx = SPEED_LIST.indexOf(speed);
            let nextIdx = forward ? idx + 1 : idx - 1;
            if (nextIdx >= SPEED_LIST.length) nextIdx = 0;
            if (nextIdx < 0) nextIdx = SPEED_LIST.length - 1;
            return SPEED_LIST[nextIdx];
        });
    }, []);

    const playingScene = useMemo(
        () => findSceneAtTime(scenes, currentTime, collapseEmptySpace, packedStarts),
        [scenes, currentTime, collapseEmptySpace, packedStarts],
    );
    const playingSceneId = playingScene?.id ?? null;
    const playingSceneRelativeTime = playingScene
        ? currentTime - (collapseEmptySpace ? packedStarts[playingScene.start] : playingScene.start)
        : null;

    // Space toggles play/pause globally, unless the user is typing in a field.
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.code !== "Space" || e.repeat) return;
            const tag = (document.activeElement as HTMLElement | null)?.tagName;
            if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
            e.preventDefault();
            togglePlay();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [togglePlay]);

    // Only auto-switch the editor's active scene while unlocked and actually
    // playing — scrubbing/jumping/scene-card clicks always switch it directly
    // regardless of this flag, so this effect is purely about passive autoplay.
    useEffect(() => {
        if (!editorFollowsPlayback || !isPlaying) return;
        if (playingSceneId && playingSceneId !== activeSceneId) {
            setActiveSceneId(playingSceneId);
        }
    }, [editorFollowsPlayback, isPlaying, playingSceneId, activeSceneId, setActiveSceneId]);

    const ctx: PlayerCtx = {
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
        playingSceneId,
        playingSceneRelativeTime,
        editorFollowsPlayback,
        setEditorFollowsPlayback,
    };

    return <Ctx.Provider value={ctx}>{children}</Ctx.Provider>;
}
