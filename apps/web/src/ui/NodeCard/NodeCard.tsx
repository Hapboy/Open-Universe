import { memo, useEffect, useState } from "react";
import cn from "classnames";
import { Handle, Position, useUpdateNodeInternals, type Node, type NodeProps } from "@xyflow/react";
import type { GenerationHistoryState, NodeParams, Port, PortType } from "@/types.ts";
import {
    AI_MODEL_NODE_TYPES,
    HISTORY_NODE_TYPES,
    NODE_TEMPLATES,
    RICH_ENTITY_NODE_TYPES,
} from "@/data/nodes.ts";
import { useGraphContext } from "@/store/contexts/GraphContext.tsx";
import { useNarrativeContext } from "@/store/contexts/NarrativeContext.tsx";
import { useGenerationHistory } from "@/ui/hooks/useGenerationHistory.ts";
import { collectConnectedEntities, composeRawPrompt } from "@/core/scenePrompt.ts";
import { CircleLoader } from "@/ui/components/CircleLoader/CircleLoader.tsx";
import { TextAreaField } from "@/ui/components/TextAreaField/TextAreaField.tsx";
import { MediaSlider } from "@/ui/NodeCard/MediaSlider/MediaSlider.tsx";
import { HistoryNav } from "@/ui/NodeCard/HistoryNav/HistoryNav.tsx";
import { filledEntityParams } from "@/schemas/entities/schemas.ts";
import { NodeParamsPanel } from "@/ui/NodeCard/params/NodeParamsPanel.tsx";
import { NodeMenu } from "@/ui/NodeCard/NodeMenu/NodeMenu.tsx";
import styles from "@/ui/NodeCard/NodeCard.module.css";

// Entity-typed pins (output_scene's dynamic "Character 1"/"Location 2"/...
// input pins, see addEntityInput in GraphContext.tsx) are all plain
// Text-typed ports — entityKind is what actually distinguishes them, so it
// takes priority and colors the pin/handle after that entity's own node
// color (NODE_TEMPLATES) instead of the generic Text color everyone else
// falls back to.
function portColor(port: Port): string {
    if (port.entityKind) return NODE_TEMPLATES[port.entityKind].color;
    if (port.type === "Image") return "var(--color-node-scene)";
    if (port.type === "Video") return "var(--color-node-higgsfield)";
    if (port.type === "Text") return "var(--color-node-pinterest)";
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
        activeSceneId,
        updateNodeParam,
        updateNodeParams,
        setNodePhotos,
        addImageInput,
        addTextInput,
        addEntityInput,
        removePinInput,
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
    const { getSceneNarrativeSettings } = useNarrativeContext();

    const [editingLabel, setEditingLabel] = useState(false);
    const [hoveredInputId, setHoveredInputId] = useState<string | null>(null);
    const templateInputCount = NODE_TEMPLATES[data.nodeType]?.inputs.length ?? data.inputs.length;

    // Pins are real flow rows now, so adding/removing one already resizes
    // the node wrapper and React Flow's own ResizeObserver should pick up
    // new/removed handles on its own. Kept as a cheap, redundant safety net
    // in case that observer-driven path ever misses an update — without it,
    // a missed update means React Flow can't route an edge to an
    // unregistered handle (error #008).
    const updateNodeInternals = useUpdateNodeInternals();
    const inputPinIds = data.inputs.map((p) => p.id).join("|");
    const outputPinIds = data.outputs.map((p) => p.id).join("|");
    useEffect(() => {
        updateNodeInternals(id);
    }, [id, inputPinIds, outputPinIds, updateNodeInternals]);

    const isAiModel = AI_MODEL_NODE_TYPES.includes(data.nodeType);
    const isRunning = runningNodeIds.has(id);
    const outputId = data.outputs[0]?.id;

    // Which of the 6 HISTORY_NODE_TYPES this is, for choosing how to render
    // its history below — image/video reuse MediaSlider's overlay chrome,
    // audio/text use the plain-flow HistoryNav bar instead (see
    // HistoryNav.tsx for why).
    const outputKind: "image" | "video" | "audio" | "text" | undefined =
        data.nodeType === "gemini_imagen" || data.nodeType === "gemini_nanobanana"
            ? "image"
            : data.nodeType === "gemini_veo"
              ? "video"
              : data.nodeType === "gemini_lyria"
                ? "audio"
                : data.nodeType === "gemini_text" || data.nodeType === "gemini_vision"
                  ? "text"
                  : undefined;
    const hasHistory = HISTORY_NODE_TYPES.has(data.nodeType);
    const liveOutput =
        hasHistory && outputId ? (resolved[outputId] as string | undefined) : undefined;
    // Flat GenerationHistoryState — only standalone HISTORY_NODE_TYPES nodes
    // reach this cast (output_scene stores its own {image,video} shape
    // instead, read separately by UtilParams.tsx's OutputParams).
    const generation = hasHistory
        ? (data.generation as GenerationHistoryState | undefined)
        : undefined;
    // Every past generation cached (R2-backed for image/video/audio kinds,
    // inline for text — see GraphContext's persistGeneratedOutputs/
    // appendGeneratedRef), browsable via the nav below. A scrubbed-to
    // snapshot restores straight into `params` (the sibling field it was
    // captured from) — no extra generation-side patch needed, unlike
    // output_scene's stages (see UtilParams.tsx's OutputParams).
    const {
        history: generatedHistory,
        idx: generatedIdx,
        resolvedUrls: resolvedGeneratedHistory,
        onIndexChange: onHistoryIndexChange,
        onDelete: onHistoryDelete,
    } = useGenerationHistory(
        generation,
        (patch) =>
            setNodeField(id, {
                generation: { ...generation, ...patch } as GenerationHistoryState,
            }),
        (snapshot) => updateNodeParams(id, snapshot),
    );
    // The freshly-generated output (this session, not yet round-tripped
    // through persistence) is shown in place of the newest slot immediately,
    // rather than waiting on the async blob write (or, for text, the store
    // update) to land.
    const generatedValues = generatedHistory.length
        ? generatedHistory.map((_, i) =>
              liveOutput && i === generatedHistory.length - 1
                  ? liveOutput
                  : resolvedGeneratedHistory[i],
          )
        : liveOutput
          ? [liveOutput]
          : [];
    // Which node types offer the "show JSON" menu toggle: rich entities show
    // their own params (computed inline below, for instant live-typing
    // feedback). output_scene no longer has one — its own "inspect internal
    // state" affordance is the prompt side-panel below (promptPanelOpen).
    const hasJsonPreview = RICH_ENTITY_NODE_TYPES.has(data.nodeType);
    const jsonPreview = !data.showJsonPreview
        ? undefined
        : RICH_ENTITY_NODE_TYPES.has(data.nodeType)
          ? JSON.stringify(
                {
                    id,
                    nodeType: data.nodeType,
                    label: data.label,
                    ...filledEntityParams(data.nodeType, data.params),
                },
                null,
                2,
            )
          : undefined;

    // output_scene's own prompt-panel content: read-only, showing whichever
    // of its two generation stages (Картинка/Видео) is currently selected
    // (data.outputSceneStage — see OutputParams). The "llm" path is a real
    // API call, so it can only show what got persisted at the last Generate
    // click (data.generation.image/.video — not params, see types.ts's
    // `generation` doc comment). The "raw" path is pure/synchronous
    // (composeRawPrompt, core/scenePrompt.ts) — recomputed live from
    // whatever's currently wired, same "pure derivation" spirit as the JSON
    // preview above, so it doesn't wait for a Generate click either.
    const outputSceneStage = data.outputSceneStage ?? "image";
    const outputScenePrompt =
        data.nodeType === "output_scene"
            ? data.params.promptComposition === "raw"
                ? composeRawPrompt(
                      collectConnectedEntities(data, edges, resolved),
                      activeSceneId ? getSceneNarrativeSettings(activeSceneId) : undefined,
                      data.params.additionalDescription as string | undefined,
                  )
                : (
                      data.generation as
                          | Partial<Record<"image" | "video", { lastComposedPrompt: string }>>
                          | undefined
                  )?.[outputSceneStage]?.lastComposedPrompt
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
                        setNodeField(id, { pinLabelsWide: !data.pinLabelsWide });
                    }}>
                    <i className="ti ti-arrows-horizontal" />
                </button>
                {(RICH_ENTITY_NODE_TYPES.has(data.nodeType) ||
                    data.nodeType === "output_scene") && (
                    <button
                        className={cn(
                            styles.promptBtn,
                            data.promptPanelOpen && styles.promptBtnActive,
                        )}
                        aria-pressed={!!data.promptPanelOpen}
                        onMouseDown={(e) => e.stopPropagation()}
                        title={
                            data.nodeType === "output_scene"
                                ? "Показать составленный промпт"
                                : "Показать доп. описание"
                        }
                        onClick={(e) => {
                            e.stopPropagation();
                            setNodeField(id, { promptPanelOpen: !data.promptPanelOpen });
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

            <div className={styles.middleRow}>
                <div className={styles.pinColLeft}>
                    {data.inputs.map((port, i) => {
                        const text = `${port.name} (${portTypeLabel(port.type)})`;
                        const removable = i >= templateInputCount;
                        return (
                            <div
                                key={port.id}
                                className={styles.pinRow}
                                onMouseEnter={() => removable && setHoveredInputId(port.id)}
                                onMouseLeave={() =>
                                    setHoveredInputId((cur) => (cur === port.id ? null : cur))
                                }>
                                <Handle
                                    type="target"
                                    position={Position.Left}
                                    id={port.id}
                                    className={cn(styles.handle, styles.handleLeft)}
                                    style={{ background: portColor(port) }}
                                    title={text}
                                />
                                {data.pinLabelsWide && (
                                    <span
                                        className={cn(styles.pinLabel, styles.pinLabelLeft)}
                                        title={text}>
                                        {port.name}
                                    </span>
                                )}
                                {removable && (
                                    <button
                                        className={cn(
                                            styles.pinRemoveBtn,
                                            hoveredInputId === port.id &&
                                                styles.pinRemoveBtnVisible,
                                        )}
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removePinInput(id, port.id);
                                        }}
                                        title="Удалить пин">
                                        <i className="ti ti-x" />
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className={styles.paramsCol}>
                    {(outputKind === "image" || outputKind === "video") &&
                        generatedValues.length > 0 && (
                            <MediaSlider
                                items={generatedValues.map((url) => ({ url, type: outputKind }))}
                                index={generatedIdx}
                                onIndexChange={onHistoryIndexChange}
                                onDelete={onHistoryDelete}
                            />
                        )}

                    {outputKind === "audio" && generatedValues.length > 0 && (
                        <>
                            <HistoryNav
                                index={generatedIdx}
                                count={generatedValues.length}
                                onIndexChange={onHistoryIndexChange}
                                onDelete={() => onHistoryDelete(generatedIdx)}
                            />
                            <audio
                                src={generatedValues[generatedIdx]}
                                controls
                                className={cn(styles.audioPlayer, "nodrag", "nowheel")}
                            />
                        </>
                    )}

                    {outputKind === "text" && generatedValues.length > 0 && (
                        <>
                            <HistoryNav
                                index={generatedIdx}
                                count={generatedValues.length}
                                onIndexChange={onHistoryIndexChange}
                                onDelete={() => onHistoryDelete(generatedIdx)}
                            />
                            <div className={styles.body}>
                                <div
                                    className={cn(
                                        styles.titleVal,
                                        styles.titleValFull,
                                        "nodrag",
                                        "nowheel",
                                    )}>
                                    {generatedValues[generatedIdx]}
                                </div>
                            </div>
                        </>
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
                                setNodeField={setNodeField}
                                addImageInput={addImageInput}
                                addTextInput={addTextInput}
                                addEntityInput={addEntityInput}
                                removePinInput={removePinInput}
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
                                    onChange={(v) =>
                                        updateNodeParam(id, "additionalDescription", v)
                                    }
                                />
                            </div>
                        )}
                        {data.nodeType === "output_scene" && data.promptPanelOpen && (
                            <div className={styles.promptCol}>
                                <TextAreaField
                                    label="Дополнительное описание"
                                    rows={4}
                                    value={(data.params.additionalDescription as string) ?? ""}
                                    onChange={(v) =>
                                        updateNodeParam(id, "additionalDescription", v)
                                    }
                                />
                                <TextAreaField
                                    label={
                                        outputSceneStage === "video"
                                            ? "Составленный промпт (Видео)"
                                            : "Составленный промпт (Картинка)"
                                    }
                                    rows={12}
                                    readOnly
                                    value={
                                        outputScenePrompt ||
                                        "Промпт появится здесь после нажатия «Сгенерировать»"
                                    }
                                />
                            </div>
                        )}
                    </div>

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

                <div className={styles.pinColRight}>
                    {data.outputs.map((port) => {
                        const text = `${port.name} (${portTypeLabel(port.type)})`;
                        return (
                            <div key={port.id} className={styles.pinRow}>
                                {data.pinLabelsWide && (
                                    <span
                                        className={cn(styles.pinLabel, styles.pinLabelRight)}
                                        title={text}>
                                        {port.name}
                                    </span>
                                )}
                                <Handle
                                    type="source"
                                    position={Position.Right}
                                    id={port.id}
                                    className={cn(styles.handle, styles.handleRight)}
                                    style={{ background: portColor(port) }}
                                    title={text}
                                />
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
});
