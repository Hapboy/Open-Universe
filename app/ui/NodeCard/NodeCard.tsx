import { Fragment, memo, useState } from "react";
import cn from "classnames";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import type { NodeParams, PortType } from "../../types.ts";
import { AI_MODEL_NODE_TYPES, NODE_TEMPLATES, RICH_ENTITY_NODE_TYPES } from "../../data/nodes.ts";
import { useGraphContext } from "../../store/contexts/GraphContext.tsx";
import { deleteBlobs, useResolvedMediaUrls } from "../../core/blobStore.ts";
import { CircleLoader } from "../components/CircleLoader/CircleLoader.tsx";
import { TextAreaField } from "../components/TextAreaField/TextAreaField.tsx";
import { MediaSlider } from "./MediaSlider/MediaSlider.tsx";
import { NodeParamsPanel } from "./params/NodeParamsPanel.tsx";
import { NodeMenu } from "./NodeMenu/NodeMenu.tsx";
import styles from "./NodeCard.module.css";

function portColor(type: PortType): string {
    if (type === "Image") return "var(--color-node-scene)";
    if (type === "Video") return "var(--color-node-higgsfield)";
    if (type === "Text") return "var(--color-node-pinterest)";
    return "var(--color-text-tertiary)";
}

function portTypeLabel(type: PortType): string {
    return type;
}

export const NodeCard = memo(function NodeCard({
    id,
    data,
    selected,
}: NodeProps<Node<NodeParams>>) {
    const {
        edges,
        resolved,
        scenes,
        updateNodeParam,
        updateNodeParams,
        setNodePhotos,
        addImageInput,
        removeImageInput,
        loadPinterestBoards,
        loadPinterestPins,
        executeGraph,
        runNode,
        runningNodeIds,
        duplicateNode,
        deleteNode,
        renameNode,
        setNodeField,
        selectNode,
    } = useGraphContext();

    const [editingLabel, setEditingLabel] = useState(false);
    const [hoveredInputId, setHoveredInputId] = useState<string | null>(null);
    const templateInputCount = NODE_TEMPLATES[data.nodeType]?.inputs.length ?? data.inputs.length;

    const isAiModel = AI_MODEL_NODE_TYPES.includes(data.nodeType);
    const isRunning = runningNodeIds.has(id);
    const outputId = data.outputs[0]?.id;
    const generatedText =
        (data.nodeType === "gemini_text" || data.nodeType === "gemini_vision") && outputId
            ? (resolved[outputId] as string | undefined)
            : undefined;
    const isImageGenNode =
        data.nodeType === "gemini_imagen" || data.nodeType === "gemini_nanobanana";
    const liveGeneratedImage =
        isImageGenNode && outputId ? (resolved[outputId] as string | undefined) : undefined;
    // Every past generation cached in IndexedDB (see GraphContext's
    // persistGeneratedImages/appendGeneratedRef), browsable via the photo
    // slider below. Falls back to the legacy single `lastGeneratedRef` for
    // nodes generated before this history array existed.
    const generatedHistory = isImageGenNode
        ? Array.isArray(data.params.generatedHistory)
            ? (data.params.generatedHistory as string[])
            : data.params.lastGeneratedRef
              ? [data.params.lastGeneratedRef as string]
              : []
        : [];
    const resolvedGeneratedHistory = useResolvedMediaUrls(generatedHistory);
    // The freshly-generated image (this session, not yet round-tripped
    // through IndexedDB) is shown in place of the newest slot immediately,
    // rather than waiting on the async blob write to land.
    const generatedItems = generatedHistory.length
        ? generatedHistory.map((_, i) => ({
              url:
                  liveGeneratedImage && i === generatedHistory.length - 1
                      ? liveGeneratedImage
                      : resolvedGeneratedHistory[i],
              type: "image" as const,
          }))
        : liveGeneratedImage
          ? [{ url: liveGeneratedImage, type: "image" as const }]
          : [];
    const generatedIdx = Math.max(
        0,
        Math.min(
            (data.params.generatedIdx as number) ?? generatedItems.length - 1,
            generatedItems.length - 1,
        ),
    );
    const generatedVideo =
        data.nodeType === "gemini_veo" && outputId
            ? (resolved[outputId] as string | undefined)
            : undefined;
    const generatedAudio =
        data.nodeType === "gemini_lyria" && outputId
            ? (resolved[outputId] as string | undefined)
            : undefined;
    // Which node types offer the "show JSON" menu toggle: rich entities show
    // their own params (computed inline below, for instant live-typing
    // feedback); output_scene instead mirrors its "Arc JSON" output pin
    // as-is (that value comes from NarrativeContext, not this node's own
    // `params`, so it's read from `resolved` rather than recomputed here).
    const hasJsonPreview =
        RICH_ENTITY_NODE_TYPES.has(data.nodeType) || data.nodeType === "output_scene";
    const jsonPreview = !data.showJsonPreview
        ? undefined
        : RICH_ENTITY_NODE_TYPES.has(data.nodeType)
          ? JSON.stringify(
                { id, nodeType: data.nodeType, label: data.label, ...data.params },
                null,
                2,
            )
          : data.nodeType === "output_scene"
            ? (resolved[data.outputs.find((p) => p.name === "Arc JSON")?.id ?? ""] as
                  string | undefined)
            : undefined;

    return (
        <div
            className={cn(
                styles.card,
                selected && styles.isSelected,
                data.pinLabelsWide && styles.cardWide,
                data.promptPanelOpen && styles.promptOpen,
            )}
            style={{ "--nc": data.color } as React.CSSProperties}>
            {/* Input handles */}
            {data.inputs.map((port, i) => {
                const top = 68 + i * 28;
                const text = `${port.name} (${portTypeLabel(port.type)})`;
                const removable = i >= templateInputCount;
                return (
                    <Fragment key={port.id}>
                        <div
                            className={styles.pinSlot}
                            style={{ top: top - 11 }}
                            onMouseEnter={() => removable && setHoveredInputId(port.id)}
                            onMouseLeave={() =>
                                setHoveredInputId((cur) => (cur === port.id ? null : cur))
                            }>
                            <Handle
                                type="target"
                                position={Position.Left}
                                id={port.id}
                                className={styles.handle}
                                style={{ left: 28, background: portColor(port.type) }}
                                title={text}
                            />
                            {removable && (
                                <button
                                    className={cn(
                                        styles.pinRemoveBtn,
                                        hoveredInputId === port.id && styles.pinRemoveBtnVisible,
                                    )}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        removeImageInput(id, port.id);
                                    }}
                                    title="Удалить пин">
                                    <i className="ti ti-x" />
                                </button>
                            )}
                        </div>
                        {data.pinLabelsWide && (
                            <span
                                className={cn(styles.pinLabel, styles.pinLabelLeft)}
                                style={{ top }}
                                title={text}>
                                {port.name}
                            </span>
                        )}
                    </Fragment>
                );
            })}

            <div className={styles.header}>
                <i className={`ti ${data.icon}`} />
                {editingLabel ? (
                    <input
                        type="text"
                        autoFocus
                        defaultValue={data.label}
                        onBlur={(e) => {
                            renameNode(id, e.target.value);
                            setEditingLabel(false);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") e.currentTarget.blur();
                            if (e.key === "Escape") setEditingLabel(false);
                        }}
                        className={cn(styles.labelInput, "nodrag")}
                    />
                ) : (
                    <span
                        onDoubleClick={() => setEditingLabel(true)}
                        title="Двойной клик — переименовать">
                        {data.label}
                    </span>
                )}
                {isAiModel && (
                    <button
                        className={styles.runBtn}
                        onMouseDown={(e) => e.stopPropagation()}
                        disabled={isRunning}
                        title="Запустить генерацию"
                        onClick={(e) => {
                            e.stopPropagation();
                            void runNode(id);
                        }}>
                        {isRunning ? (
                            <CircleLoader className={styles.runBtnLoader} />
                        ) : (
                            <i className="ti ti-player-play" />
                        )}
                    </button>
                )}
                <button
                    className={cn(styles.wideBtn, data.pinLabelsWide && styles.wideBtnActive)}
                    aria-pressed={!!data.pinLabelsWide}
                    onMouseDown={(e) => e.stopPropagation()}
                    title="Показать подписи пинов"
                    onClick={(e) => {
                        e.stopPropagation();
                        const next = !data.pinLabelsWide;
                        setNodeField(id, {
                            pinLabelsWide: next,
                            ...(next ? { promptPanelOpen: false } : {}),
                        });
                    }}>
                    <i className="ti ti-arrows-horizontal" />
                </button>
                {RICH_ENTITY_NODE_TYPES.has(data.nodeType) && (
                    <button
                        className={cn(
                            styles.promptBtn,
                            data.promptPanelOpen && styles.promptBtnActive,
                        )}
                        aria-pressed={!!data.promptPanelOpen}
                        onMouseDown={(e) => e.stopPropagation()}
                        title="Показать доп. описание"
                        onClick={(e) => {
                            e.stopPropagation();
                            const next = !data.promptPanelOpen;
                            setNodeField(id, {
                                promptPanelOpen: next,
                                ...(next ? { pinLabelsWide: false } : {}),
                            });
                        }}>
                        <i className="ti ti-notes" />
                    </button>
                )}
                <NodeMenu
                    onDuplicate={() => duplicateNode(id)}
                    onDelete={() => {
                        deleteNode(id);
                        selectNode(null);
                    }}
                    {...(hasJsonPreview
                        ? {
                              jsonPreviewVisible: !!data.showJsonPreview,
                              onToggleJsonPreview: () =>
                                  setNodeField(id, { showJsonPreview: !data.showJsonPreview }),
                          }
                        : {})}
                />
            </div>

            <div className={styles.paramsCol}>
                {generatedText && (
                    <div className={styles.body}>
                        <div
                            className={cn(
                                styles.titleVal,
                                styles.titleValFull,
                                "nodrag",
                                "nowheel",
                            )}>
                            {generatedText}
                        </div>
                    </div>
                )}

                <div className={cn(styles.paramsWrap, "nodrag", "nowheel")}>
                    <div className={styles.paramsMain}>
                        <NodeParamsPanel
                            node={{ id, data }}
                            edges={edges}
                            resolved={resolved}
                            scenes={scenes}
                            updateNodeParam={updateNodeParam}
                            updateNodeParams={updateNodeParams}
                            setNodePhotos={setNodePhotos}
                            addImageInput={addImageInput}
                            loadPinterestBoards={loadPinterestBoards}
                            loadPinterestPins={loadPinterestPins}
                            executeGraph={executeGraph}
                        />
                    </div>
                    {RICH_ENTITY_NODE_TYPES.has(data.nodeType) && data.promptPanelOpen && (
                        <div className={styles.promptCol}>
                            <TextAreaField
                                label="Дополнительное описание"
                                rows={12}
                                value={(data.params.additionalDescription as string) ?? ""}
                                onChange={(v) => updateNodeParam(id, "additionalDescription", v)}
                            />
                        </div>
                    )}
                </div>

                {generatedItems.length > 0 && (
                    <MediaSlider
                        items={generatedItems}
                        index={generatedIdx}
                        onIndexChange={(i) => updateNodeParam(id, "generatedIdx", i)}
                        onDelete={(i) => {
                            const ref = generatedHistory[i];
                            const nextHistory = generatedHistory.filter((_, idx) => idx !== i);
                            if (ref) void deleteBlobs([ref]).catch(console.error);
                            updateNodeParams(id, {
                                generatedHistory: nextHistory,
                                generatedIdx: Math.max(
                                    0,
                                    Math.min(generatedIdx, nextHistory.length - 1),
                                ),
                            });
                        }}
                    />
                )}

                {generatedVideo && <MediaSlider items={[{ url: generatedVideo, type: "video" }]} />}

                {generatedAudio && (
                    <audio
                        src={generatedAudio}
                        controls
                        className={cn(styles.audioPlayer, "nodrag", "nowheel")}
                    />
                )}

                {jsonPreview && (
                    <div className={styles.body}>
                        <pre
                            className={cn(
                                styles.titleVal,
                                styles.titleValFull,
                                "nodrag",
                                "nowheel",
                            )}
                            style={{ whiteSpace: "pre-wrap" }}>
                            {jsonPreview}
                        </pre>
                    </div>
                )}
            </div>

            {/* Output handles */}
            {data.outputs.map((port, i) => {
                const top = 68 + i * 28;
                const text = `${port.name} (${portTypeLabel(port.type)})`;
                return (
                    <Fragment key={port.id}>
                        <Handle
                            type="source"
                            position={Position.Right}
                            id={port.id}
                            className={styles.handle}
                            style={{ top, background: portColor(port.type) }}
                            title={text}
                        />
                        {data.pinLabelsWide && (
                            <span
                                className={cn(styles.pinLabel, styles.pinLabelRight)}
                                style={{ top }}
                                title={text}>
                                {port.name}
                            </span>
                        )}
                    </Fragment>
                );
            })}
        </div>
    );
});
