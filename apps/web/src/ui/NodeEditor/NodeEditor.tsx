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
import { useGraphContext } from "../../store/contexts/GraphContext.tsx";
import { useToastContext } from "../../store/contexts/ToastContext.tsx";
import { NodeCard } from "../NodeCard/NodeCard.tsx";
import { NodeBrowser } from "../NodeBrowser/NodeBrowser.tsx";
import type { NodeParams } from "../../types.ts";
import type { NodeType } from "@open-universe/shared";
import styles from "./NodeEditor.module.css";

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
        showMiniMap,
    } = useGraphContext();
    const { showToast } = useToastContext();

    const { screenToFlowPosition } = useReactFlow();

    const copiedIdRef = useRef<string | null>(null);

    const [browserAt, setBrowserAt] = useState<{
        screen: { x: number; y: number };
        flow: { x: number; y: number };
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
            }
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [selectedNodeId, nodes, duplicateNode]);

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
            setBrowserAt({ screen: { x: e.clientX, y: e.clientY }, flow });
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

    return (
        <div
            className={styles.canvasWrap}
            id="canvasWrap"
            style={{ position: "relative", width: "100%", height: "100%" }}
            onDoubleClick={onCanvasDoubleClick}>
            <ReactFlow
                nodes={styledNodes}
                edges={edges}
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
