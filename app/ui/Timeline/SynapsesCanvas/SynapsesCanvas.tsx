import { useEffect, useRef } from "react";
import { useGraphContext } from "../../../store/contexts/GraphContext.tsx";
import type { TimelineScene } from "../../../types.ts";
import styles from "../Timeline.module.css";

// Illustrative character-lane data for this "Synapses of Fates" view — not
// yet derived from the actual Character/Location nodes in the graph. Wiring
// it to real per-scene node data is a follow-up, not part of this pass.
const CHAR_LANES = [
    { name: "Ара Гехецик", color: "#EF9F27", slots: [2, 1, 1, 2, 3, 2, 1, 2] },
    { name: "Анаит", color: "#D4537E", slots: [0, 1, 2, 2, 1, 2, 0, 2] },
    { name: "Вардан", color: "#5DCAA5", slots: [4, 3, 1, 2, 3, 2, 4, 2] },
    { name: "Цовинар", color: "#85B7EB", slots: [3, 4, 4, 2, 0, 2, 3, 2] },
    { name: "Вреж · dev", color: "#AFA9EC", slots: [1, 0, 3, 4, 4, 2, 1, 2] },
];

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
    const { setActiveSceneId } = useGraphContext();
    const canvasRef = useRef<HTMLCanvasElement>(null);

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

        const draw = () => {
            const W = canvas.clientWidth;
            const H = canvas.clientHeight;
            ctx.clearRect(0, 0, W, H);

            // Grid/Columns geometry
            const colCount = scenes.length;
            const paddingLeft = 60;
            const paddingRight = 60;
            const colWidth = (W - paddingLeft - paddingRight) / (colCount - 1);
            const colX = scenes.map((_, i) => paddingLeft + i * colWidth);

            const lanesCount = 5;
            const paddingTop = 20;
            const paddingBottom = 20;
            const laneHeight = (H - paddingTop - paddingBottom) / (lanesCount - 1);
            const laneY = Array.from({ length: lanesCount }, (_, i) => paddingTop + i * laneHeight);

            // Draw columns and location texts
            ctx.save();
            ctx.font = "9px system-ui, sans-serif";
            ctx.fillStyle = "rgba(241, 239, 232, 0.4)";
            ctx.textAlign = "center";
            scenes.forEach((s, i) => {
                ctx.strokeStyle =
                    s.id === activeSceneId
                        ? "rgba(239, 159, 39, 0.25)"
                        : "rgba(241, 239, 232, 0.08)";
                ctx.lineWidth = s.id === activeSceneId ? 2 : 1;
                ctx.beginPath();
                ctx.moveTo(colX[i], paddingTop - 5);
                ctx.lineTo(colX[i], H - paddingBottom + 5);
                ctx.stroke();

                ctx.fillStyle =
                    s.id === activeSceneId
                        ? "var(--color-bg-accent)"
                        : "var(--color-text-secondary)";
                ctx.fillText(s.num, colX[i], paddingTop - 8);
            });
            ctx.restore();

            // Character lifepaths (Threads)
            CHAR_LANES.forEach((c) => {
                ctx.save();
                ctx.lineWidth = 2.0;
                ctx.strokeStyle = c.color;
                ctx.globalAlpha = 0.8;
                ctx.shadowColor = c.color;
                ctx.shadowBlur = 6;

                ctx.beginPath();
                let isFirst = true;
                scenes.forEach((_, idx) => {
                    const slot = c.slots[idx % c.slots.length];
                    const x = colX[idx];
                    const y = laneY[slot];
                    if (isFirst) {
                        ctx.moveTo(x, y);
                        isFirst = false;
                    } else {
                        const prevX = colX[idx - 1];
                        const prevSlot = c.slots[(idx - 1) % c.slots.length];
                        const prevY = laneY[prevSlot];
                        const mx = (prevX + x) / 2;
                        ctx.bezierCurveTo(mx, prevY, mx, y, x, y);
                    }
                });
                ctx.stroke();
                ctx.restore();
            });

            // Synapse intersections (⬤ Nodes)
            scenes.forEach((s, idx) => {
                const x = colX[idx];
                const charAtScene = CHAR_LANES.filter(
                    (c) => c.slots[idx % c.slots.length] !== undefined,
                );
                const isCurrentScene = s.id === activeSceneId;
                const pulse = Math.sin(Date.now() / 250 + idx) * 1.2;

                charAtScene.forEach((c, j) => {
                    const slot = c.slots[idx % c.slots.length];
                    const y = laneY[slot];
                    ctx.save();
                    ctx.beginPath();
                    ctx.arc(x, y, 5 + pulse + j * 1.5, 0, Math.PI * 2);
                    ctx.strokeStyle = c.color;
                    ctx.lineWidth = 1.6;
                    ctx.globalAlpha = isCurrentScene ? 1.0 : 0.35;
                    if (isCurrentScene) {
                        ctx.shadowColor = c.color;
                        ctx.shadowBlur = 8;
                    }
                    ctx.stroke();
                    ctx.restore();
                });

                // Central glowing core
                const firstSlot = CHAR_LANES[0].slots[idx % CHAR_LANES[0].slots.length];
                const centerY = laneY[firstSlot];
                ctx.save();
                ctx.beginPath();
                ctx.arc(x, centerY, 3.5, 0, Math.PI * 2);
                ctx.fillStyle = isCurrentScene ? "#ef9f27" : "#e8e4d8";
                ctx.shadowColor = "#fff";
                ctx.shadowBlur = isCurrentScene ? 12 : 3;
                ctx.fill();
                ctx.restore();
            });

            // Render vertical playback playhead line
            const maxTime = collapseEmptySpace ? totalPackedDuration : totalDuration;
            const scrubberX =
                paddingLeft + (currentTime / maxTime) * (W - paddingLeft - paddingRight);
            ctx.save();
            ctx.strokeStyle = "#ef9f27";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(scrubberX, paddingTop - 8);
            ctx.lineTo(scrubberX, H - paddingBottom + 8);
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
    ]);

    const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const W = rect.width;
        const paddingLeft = 60;
        const paddingRight = 60;
        const colWidth = (W - paddingLeft - paddingRight) / (scenes.length - 1);

        let closestIdx = 0;
        let minDiff = Infinity;
        scenes.forEach((_, idx) => {
            const colX = paddingLeft + idx * colWidth;
            const diff = Math.abs(x - colX);
            if (diff < minDiff) {
                minDiff = diff;
                closestIdx = idx;
            }
        });

        if (minDiff < 40) {
            const targetScene = scenes[closestIdx];
            setActiveSceneId(targetScene.id);
            setCurrentTime(
                collapseEmptySpace ? packedStarts[targetScene.start] : targetScene.start,
            );
        }
    };

    return (
        <div className={styles.canvasWrapper}>
            <canvas ref={canvasRef} onClick={handleCanvasClick} className={styles.synapsesCanvas} />
            <div className={styles.canvasLegend}>
                <span>
                    ⬤ синапс (пересечение линий судеб персонажей) · кликни на синапс для перехода
                </span>
            </div>
        </div>
    );
}
