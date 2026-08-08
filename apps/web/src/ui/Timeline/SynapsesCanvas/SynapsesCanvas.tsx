import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import cn from "classnames";
import { useGraphContext } from "@/store/contexts/GraphContext.tsx";
import type { TimelineScene } from "@/types.ts";
import {
    deriveCharacterPresence,
    groupScenesByStart,
} from "@/ui/Timeline/SynapsesCanvas/synapseData.ts";
import styles from "@/ui/Timeline/Timeline.module.css";

const PADDING_LEFT = 60;
const PADDING_RIGHT = 60;
const PADDING_TOP = 20;
const PADDING_BOTTOM = 20;
// Distance of the track-1/track-2 rows from the padded top/bottom edges —
// fixed regardless of how many characters exist, since position is now
// purely a function of (column, track), not of character identity.
const ROW_INSET = 18;

// A pure function of H only, so it can live outside the component.
const rowY = (H: number) => ({
    1: PADDING_TOP + ROW_INSET,
    2: H - PADDING_BOTTOM - ROW_INSET,
});

interface SynapsesCanvasProps {
    scenes: TimelineScene[];
    activeSceneId: string | null;
    currentTime: number;
    setCurrentTime: (t: number) => void;
    collapseEmptySpace: boolean;
    totalDuration: number;
    totalPackedDuration: number;
    packedStarts: Record<number, number>;
}

export function SynapsesCanvas({
    scenes,
    activeSceneId,
    currentTime,
    setCurrentTime,
    collapseEmptySpace,
    totalDuration,
    totalPackedDuration,
    packedStarts,
}: SynapsesCanvasProps) {
    const { setActiveSceneId, allSceneGraphs } = useGraphContext();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [followKey, setFollowKey] = useState<string | null>(null);

    const columns = useMemo(() => groupScenesByStart(scenes), [scenes]);
    const { characters, presenceByScene } = useMemo(
        () => deriveCharacterPresence(scenes, allSceneGraphs),
        [scenes, allSceneGraphs],
    );

    const colX = useCallback(
        (W: number) => {
            const width =
                columns.length > 1 ? (W - PADDING_LEFT - PADDING_RIGHT) / (columns.length - 1) : 0;
            return columns.map((_, i) => PADDING_LEFT + i * width);
        },
        [columns],
    );

    useEffect(() => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let animationId: number;

        const handleResize = () => {
            const rect = canvas.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };

        handleResize();
        window.addEventListener("resize", handleResize);

        const byKey = new Map(characters.map((c) => [c.key, c]));

        const draw = () => {
            const W = canvas.clientWidth;
            const H = canvas.clientHeight;
            ctx.clearRect(0, 0, W, H);

            const xs = colX(W);
            const ys = rowY(H);
            // sceneId -> merge point on the canvas — every character present
            // in that scene shares this exact coordinate, which is what
            // makes their threads visually converge there.
            const points: Record<string, { x: number; y: number }> = {};
            columns.forEach((col, i) => {
                if (col.byTrack[1]) points[col.byTrack[1].id] = { x: xs[i], y: ys[1] };
                if (col.byTrack[2]) points[col.byTrack[2].id] = { x: xs[i], y: ys[2] };
            });

            // Draw columns and scene-number labels — a column holds up to 2
            // scenes (track 1 + track 2, sharing a start time); label joins
            // both when it's a parallel pair.
            ctx.save();
            ctx.font = "9px system-ui, sans-serif";
            ctx.textAlign = "center";
            columns.forEach((col, i) => {
                const isActiveCol =
                    !!activeSceneId &&
                    (col.byTrack[1]?.id === activeSceneId || col.byTrack[2]?.id === activeSceneId);
                ctx.strokeStyle = isActiveCol
                    ? "rgba(239, 159, 39, 0.25)"
                    : "rgba(241, 239, 232, 0.08)";
                ctx.lineWidth = isActiveCol ? 2 : 1;
                ctx.beginPath();
                ctx.moveTo(xs[i], PADDING_TOP - 5);
                ctx.lineTo(xs[i], H - PADDING_BOTTOM + 5);
                ctx.stroke();

                ctx.fillStyle = isActiveCol
                    ? "var(--color-bg-accent)"
                    : "var(--color-text-secondary)";
                const label = [col.byTrack[1]?.num, col.byTrack[2]?.num].filter(Boolean).join("·");
                ctx.fillText(label, xs[i], PADDING_TOP - 8);
            });
            ctx.restore();

            // Character lifepaths (Threads) — only through scenes they
            // actually appear in, via each scene's shared merge point; the
            // bezier naturally skips over absences and converges wherever
            // characters share a scene.
            characters.forEach((c) => {
                const cxs: number[] = [];
                const cys: number[] = [];
                scenes.forEach((s) => {
                    if (!presenceByScene[s.id]?.includes(c.key)) return;
                    const p = points[s.id];
                    if (!p) return;
                    cxs.push(p.x);
                    cys.push(p.y);
                });
                if (cxs.length < 2) return;

                const followed = !followKey || followKey === c.key;
                ctx.save();
                ctx.lineWidth = followed ? 2.4 : 1.2;
                ctx.strokeStyle = c.color;
                ctx.globalAlpha = followed ? 0.85 : 0.15;
                ctx.shadowColor = c.color;
                ctx.shadowBlur = followed ? 8 : 0;

                ctx.beginPath();
                ctx.moveTo(cxs[0], cys[0]);
                for (let i = 1; i < cxs.length; i++) {
                    const mx = (cxs[i - 1] + cxs[i]) / 2;
                    ctx.bezierCurveTo(mx, cys[i - 1], mx, cys[i], cxs[i], cys[i]);
                }
                ctx.stroke();
                ctx.restore();
            });

            // Synapse merge points (⬤) — one ring per character actually
            // present in that scene, concentric around the scene's shared
            // point, plus a center dot sized by how many characters meet
            // there.
            scenes.forEach((s, idx) => {
                const p = points[s.id];
                if (!p) return;
                const { x, y } = p;
                const keysHere = presenceByScene[s.id] ?? [];
                const isCurrentScene = s.id === activeSceneId;
                const pulse = Math.sin(Date.now() / 250 + idx) * 1.2;

                keysHere.forEach((key, j) => {
                    const c = byKey.get(key);
                    if (!c) return;
                    const followed = !followKey || followKey === key;
                    ctx.save();
                    ctx.beginPath();
                    ctx.arc(x, y, 5 + pulse + j * 1.5, 0, Math.PI * 2);
                    ctx.strokeStyle = c.color;
                    ctx.lineWidth = 1.6;
                    ctx.globalAlpha = followed ? (isCurrentScene ? 1.0 : 0.35) : 0.1;
                    if (isCurrentScene && followed) {
                        ctx.shadowColor = c.color;
                        ctx.shadowBlur = 8;
                    }
                    ctx.stroke();
                    ctx.restore();
                });

                if (keysHere.length === 0) return;
                const anyFollowed = !followKey || keysHere.includes(followKey);
                ctx.save();
                ctx.beginPath();
                ctx.arc(x, y, 2.5 + keysHere.length * 0.8, 0, Math.PI * 2);
                ctx.fillStyle = isCurrentScene ? "#ef9f27" : "#e8e4d8";
                ctx.globalAlpha = anyFollowed ? 1 : 0.15;
                ctx.shadowColor = "#fff";
                ctx.shadowBlur = isCurrentScene ? 12 : 3;
                ctx.fill();
                ctx.restore();
            });

            // Render vertical playback playhead line
            const maxTime = collapseEmptySpace ? totalPackedDuration : totalDuration;
            const scrubberX =
                PADDING_LEFT + (currentTime / maxTime) * (W - PADDING_LEFT - PADDING_RIGHT);
            ctx.save();
            ctx.strokeStyle = "#ef9f27";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(scrubberX, PADDING_TOP - 8);
            ctx.lineTo(scrubberX, H - PADDING_BOTTOM + 8);
            ctx.stroke();
            ctx.restore();

            animationId = requestAnimationFrame(draw);
        };

        animationId = requestAnimationFrame(draw);

        return () => {
            window.removeEventListener("resize", handleResize);
            cancelAnimationFrame(animationId);
        };
    }, [
        currentTime,
        collapseEmptySpace,
        totalDuration,
        totalPackedDuration,
        activeSceneId,
        scenes,
        columns,
        characters,
        presenceByScene,
        followKey,
        colX,
    ]);

    const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const xs = colX(rect.width);
        const ys = rowY(rect.height);

        let closestIdx = 0;
        let minDiff = Infinity;
        xs.forEach((cx, idx) => {
            const diff = Math.abs(x - cx);
            if (diff < minDiff) {
                minDiff = diff;
                closestIdx = idx;
            }
        });
        if (minDiff >= 40) return;

        const col = columns[closestIdx];
        const candidates = [col.byTrack[1], col.byTrack[2]].filter((s): s is TimelineScene => !!s);
        if (candidates.length === 0) return;

        const target =
            candidates.length === 1
                ? candidates[0]
                : Math.abs(y - ys[1]) <= Math.abs(y - ys[2])
                  ? col.byTrack[1]!
                  : col.byTrack[2]!;

        setActiveSceneId(target.id);
        setCurrentTime(collapseEmptySpace ? packedStarts[target.start] : target.start);
    };

    return (
        <div className={styles.canvasWrapper}>
            <canvas ref={canvasRef} onClick={handleCanvasClick} className={styles.synapsesCanvas} />

            {characters.length > 0 && (
                <div className={styles.synapseChips}>
                    <button
                        type="button"
                        className={cn(styles.synapseChip, !followKey && styles.synapseChipActive)}
                        onClick={() => setFollowKey(null)}>
                        Все линии
                    </button>
                    {characters.map((c) => (
                        <button
                            key={c.key}
                            type="button"
                            className={cn(
                                styles.synapseChip,
                                followKey === c.key && styles.synapseChipActive,
                            )}
                            onClick={() => setFollowKey(followKey === c.key ? null : c.key)}>
                            <span
                                className={styles.synapseChipDot}
                                style={{ background: c.color }}
                            />
                            {c.name}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
