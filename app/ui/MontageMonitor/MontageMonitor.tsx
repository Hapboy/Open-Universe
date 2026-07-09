import React, { useCallback, useEffect, useRef, useState } from "react";
import { useGraphContext } from "../../store/contexts/GraphContext.tsx";
import styles from "./MontageMonitor.module.css";

function readResolvedUrl(
    resolved: Record<string, unknown>,
    outId: string | undefined,
): string | null {
    if (!outId) return null;
    const value = resolved[outId];
    return typeof value === "string" ? value : null;
}

export function MontageMonitor() {
    const { nodes, resolved, activeSceneId, scenes, showMontageMonitor, setShowMontageMonitor } =
        useGraphContext();

    const [position, setPosition] = useState({ x: window.innerWidth - 460, y: 80 });
    const [size] = useState({ width: 420, height: 280 });
    const dragRef = useRef({ isDragging: false, startX: 0, startY: 0, startPos: { x: 0, y: 0 } });
    const dragAbortRef = useRef<AbortController | null>(null);

    const monitorRef = useRef<HTMLDivElement>(null);

    const activeScene = scenes.find((s) => s.id === activeSceneId);

    // Dragging event handlers
    const handleMouseMove = useCallback(
        (e: MouseEvent) => {
            if (!dragRef.current.isDragging) return;
            const dx = e.clientX - dragRef.current.startX;
            const dy = e.clientY - dragRef.current.startY;
            setPosition({
                x: Math.max(
                    0,
                    Math.min(window.innerWidth - size.width, dragRef.current.startPos.x + dx),
                ),
                y: Math.max(
                    0,
                    Math.min(window.innerHeight - size.height, dragRef.current.startPos.y + dy),
                ),
            });
        },
        [size.width, size.height],
    );

    // A single AbortController per drag removes both listeners together via
    // one .abort() call, instead of pairing addEventListener/removeEventListener
    // by function identity (which breaks easily once handlers are memoized).
    const stopDragging = useCallback(() => {
        dragRef.current.isDragging = false;
        dragAbortRef.current?.abort();
        dragAbortRef.current = null;
    }, []);

    // This component is always mounted (App.tsx renders it unconditionally;
    // `showMontageMonitor` only toggles it between rendering its window and
    // returning null), so closing it mid-drag doesn't unmount it — but the
    // drag listeners still need to come off, otherwise they keep calling
    // setPosition on a component that's no longer showing anything. Also
    // clean up on a genuine unmount, in case rendering ever becomes
    // conditional (e.g. behind a portal) later.
    useEffect(() => {
        if (!showMontageMonitor) stopDragging();
    }, [showMontageMonitor, stopDragging]);

    useEffect(() => {
        return () => stopDragging();
    }, [stopDragging]);

    const handleMouseDown = (e: React.MouseEvent) => {
        // Don't drag if clicking buttons
        if ((e.target as HTMLElement).closest("button")) return;
        dragRef.current = {
            isDragging: true,
            startX: e.clientX,
            startY: e.clientY,
            startPos: { ...position },
        };
        const controller = new AbortController();
        dragAbortRef.current = controller;
        window.addEventListener("mousemove", handleMouseMove, { signal: controller.signal });
        window.addEventListener("mouseup", stopDragging, { signal: controller.signal });
    };

    // Toggle fullscreen on the monitor element itself
    const toggleFullscreen = () => {
        if (!monitorRef.current) return;
        if (!document.fullscreenElement) {
            monitorRef.current.requestFullscreen().catch((err) => console.error(err));
        } else {
            document.exitFullscreen().catch((err) => console.error(err));
        }
    };

    if (!showMontageMonitor || !activeScene) return null;

    // Find generated image/video outputs from nodes in the active graph,
    // falling back to the scene's own cover image.
    const imagenNode = nodes.find(
        (n) => n.data.nodeType === "gemini_imagen" || n.data.nodeType === "gemini_nanobanana",
    );
    const veoNode = nodes.find((n) => n.data.nodeType === "gemini_veo");
    const veoUrl = veoNode ? readResolvedUrl(resolved, veoNode.data.outputs[0]?.id) : null;
    const imagenUrl = imagenNode ? readResolvedUrl(resolved, imagenNode.data.outputs[0]?.id) : null;
    const media = veoUrl
        ? { url: veoUrl, type: "video" as const }
        : imagenUrl
          ? { url: imagenUrl, type: "image" as const }
          : { url: activeScene.coverUrl, type: "image" as const };

    return (
        <div
            className={styles.monitorWindow}
            ref={monitorRef}
            style={{
                left: position.x,
                top: position.y,
                width: size.width,
                height: size.height,
            }}>
            <div className={styles.header} onMouseDown={handleMouseDown}>
                <div className={styles.headerTitle}>
                    <i className="ti ti-device-tv" />
                    <span>Монитор Монтажа: {activeScene.title}</span>
                </div>
                <div className={styles.headerActions}>
                    <button onClick={toggleFullscreen} title="На весь экран">
                        <i className="ti ti-arrows-maximize" />
                    </button>
                    <button onClick={() => setShowMontageMonitor(false)} title="Закрыть">
                        <i className="ti ti-x" />
                    </button>
                </div>
            </div>

            <div className={styles.screenArea}>
                {media.type === "video" ? (
                    <video
                        src={media.url}
                        className={styles.mediaOutput}
                        autoPlay
                        loop
                        muted
                        playsInline
                    />
                ) : (
                    <img src={media.url} alt="Scene Frame" className={styles.mediaOutput} />
                )}

                {/* Tech Details Badge Overlay */}
                <div className={styles.techBadge}>
                    <span>
                        Scene {activeScene.num} ·{" "}
                        {media.type === "video" ? "Motion (Veo)" : "Stills (Imagen)"}
                    </span>
                </div>
            </div>
        </div>
    );
}
