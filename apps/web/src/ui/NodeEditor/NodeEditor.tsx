import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    ReactFlow,
    ReactFlowProvider,
    Background,
    Controls,
    MiniMap,
    useReactFlow,
    type NodeTypes,
    type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useGraphContext } from "@/store/contexts/GraphContext.tsx";
import { useToastContext } from "@/store/contexts/ToastContext.tsx";
import { NodeCard } from "@/ui/NodeCard/NodeCard.tsx";
import { NodeBrowser } from "@/ui/NodeBrowser/NodeBrowser.tsx";
import type { NodeParams } from "@/types.ts";
import type { NodeType } from "@hayverse/shared";
import styles from "@/ui/NodeEditor/NodeEditor.module.css";

const nodeTypes: NodeTypes = { custom: NodeCard as unknown as NodeTypes["custom"] };

function NodeEditorCanvas() {
    const {
        nodes,
        edges,
        onNodesChange,
        onEdgesChange,
        onConnect,
        isValidConnection,
        selectNode,
        selectedNodeId,
        createNode,
        duplicateNode,
        undo,
        redo,
        showMiniMap,
    } = useGraphContext();
    const { showToast } = useToastContext();

    const { screenToFlowPosition } = useReactFlow();

    const copiedIdRef = useRef<string | null>(null);

    const [browserAt, setBrowserAt] = useState<{
        screen: { x: number; y: number };
        flow: { x: number; y: number };
        maxY: number;
    } | null>(null);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (!(e.ctrlKey || e.metaKey)) return;
            const tag = (document.activeElement as HTMLElement | null)?.tagName;
            if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

            if (e.key === "c" || e.key === "C") {
                if (selectedNodeId) copiedIdRef.current = selectedNodeId;
            } else if (e.key === "v" || e.key === "V") {
                const id = copiedIdRef.current;
                if (id && nodes.some((n) => n.id === id)) {
                    e.preventDefault();
                    duplicateNode(id);
                }
            } else if ((e.key === "z" || e.key === "Z") && !e.shiftKey) {
                e.preventDefault();
                undo();
            } else if ((e.key === "z" || e.key === "Z") && e.shiftKey) {
                e.preventDefault();
                redo();
            }
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [selectedNodeId, nodes, duplicateNode, undo, redo]);

    const onNodeClick = useCallback(
        (_: React.MouseEvent, node: Node) => {
            selectNode(node.id);
        },
        [selectNode],
    );

    const onPaneClick = useCallback(() => {
        selectNode(null);
    }, [selectNode]);

    const onCanvasDoubleClick = useCallback(
        (e: React.MouseEvent<HTMLDivElement>) => {
            if (!(e.target as HTMLElement).classList.contains("react-flow__pane")) return;

            const flow = screenToFlowPosition({ x: e.clientX, y: e.clientY });
            // Clamp the popup to the canvas's own bottom edge, not the full
            // window — the canvas visually ends where the Timeline panel
            // begins, but window.innerHeight includes that reserved space too.
            const canvasBottom = e.currentTarget.getBoundingClientRect().bottom;
            setBrowserAt({ screen: { x: e.clientX, y: e.clientY }, flow, maxY: canvasBottom });
        },
        [screenToFlowPosition],
    );

    const onBrowserSelect = useCallback(
        (type: NodeType) => {
            if (!browserAt) return;
            const node = createNode(type, browserAt.flow.x, browserAt.flow.y);
            if (node) {
                selectNode(node.id);
                if (type === "pinterest_board") {
                    showToast("Pinterest: добавляем доску...");
                }
            }
            setBrowserAt(null);
        },
        [browserAt, createNode, selectNode, showToast],
    );

    const styledNodes = useMemo(
        () => nodes.map((n) => ({ ...n, selected: n.id === selectedNodeId })),
        [nodes, selectedNodeId],
    );

    // Edges take on their source node's own color (the same value driving
    // that node's left-border accent, see NodeCard.module.css's --nc) —
    // answers "what kind of thing is this wire carrying" at a glance,
    // entity-colored wires included, without needing per-port color logic
    // here. Inline `style` wins over xyflow's own stylesheet regardless of
    // specificity, so selection is signaled via stroke width instead of the
    // library's default color swap.
    const nodeColorById = useMemo(() => {
        const map = new Map<string, string>();
        nodes.forEach((n) => map.set(n.id, (n.data as NodeParams).color));
        return map;
    }, [nodes]);
    const styledEdges = useMemo(
        () =>
            edges.map((e) => ({
                ...e,
                style: {
                    stroke: nodeColorById.get(e.source) ?? "var(--color-border-hover)",
                    strokeWidth: e.selected ? 2.5 : 1.5,
                },
            })),
        [edges, nodeColorById],
    );

    return (
        <div
            className={styles.canvasWrap}
            id="canvasWrap"
            style={{ position: "relative", width: "100%", height: "100%" }}
            onDoubleClick={onCanvasDoubleClick}>
            <ReactFlow
                nodes={styledNodes}
                edges={styledEdges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                isValidConnection={isValidConnection}
                onNodeClick={onNodeClick}
                onPaneClick={onPaneClick}
                nodeTypes={nodeTypes}
                fitView
                deleteKeyCode="Delete"
                zoomOnDoubleClick={false}
                minZoom={0.05}
                proOptions={{ hideAttribution: true }}>
                <Background gap={20} size={1} color="var(--color-border)" />
                <Controls />
                {showMiniMap && (
                    <MiniMap
                        nodeColor={(n) => (n.data as NodeParams).color || "#888"}
                        style={{
                            background: "var(--color-bg-card)",
                            border: "1px solid var(--color-border)",
                            borderRadius: 6,
                        }}
                    />
                )}
            </ReactFlow>
            {browserAt && (
                <NodeBrowser
                    screenPos={browserAt.screen}
                    maxY={browserAt.maxY}
                    onSelect={onBrowserSelect}
                    onClose={() => setBrowserAt(null)}
                />
            )}
        </div>
    );
}

export function NodeEditor() {
    return (
        <ReactFlowProvider>
            <NodeEditorCanvas />
        </ReactFlowProvider>
    );
}
