import { memo, useEffect, useState } from "react";
import cn from "classnames";
import { Handle, Position, useUpdateNodeInternals, type Node, type NodeProps } from "@xyflow/react";
import type { NodeType } from "@hayverse/shared";
import type { GenerationHistoryState, NodeParams, Port, PortType } from "@/types.ts";
import {
    AI_MODEL_NODE_TYPES,
    ENTITY_GENERATION_NODE_TYPES,
    ENTITY_KIND_OPTIONS,
    HISTORY_NODE_TYPES,
    NODE_TEMPLATES,
    RICH_ENTITY_NODE_TYPES,
} from "@/data/nodes.ts";
import { useGraphContext } from "@/store/contexts/GraphContext.tsx";
import { useNarrativeContext } from "@/store/contexts/NarrativeContext.tsx";
import { useGenerationHistory } from "@/ui/hooks/useGenerationHistory.ts";
import { useRequireAuth } from "@/ui/hooks/useRequireAuth.ts";
import { collectConnectedEntities, composeRawPrompt, entityFromNode } from "@/core/scenePrompt.ts";
import { currentHistoryRef } from "@/core/generationHistory.ts";
import { generateSeed } from "@/core/seed.ts";
import { CircleLoader } from "@/ui/components/CircleLoader/CircleLoader.tsx";
import { TextAreaField } from "@/ui/components/TextAreaField/TextAreaField.tsx";
import { MediaSlider } from "@/ui/NodeCard/MediaSlider/MediaSlider.tsx";
import { HistoryNav } from "@/ui/NodeCard/HistoryNav/HistoryNav.tsx";
import { entityJsonPayload } from "@/schemas/entities/schemas.ts";
import { NodeParamsPanel } from "@/ui/NodeCard/params/NodeParamsPanel.tsx";
import { NodeMenu } from "@/ui/NodeCard/NodeMenu/NodeMenu.tsx";
import { Popover } from "@/ui/components/Popover/Popover.tsx";
import { PopoverList } from "@/ui/components/Popover/PopoverList.tsx";
import styles from "@/ui/NodeCard/NodeCard.module.css";

// entityKind takes priority over the plain-type colors below — it's set on
// output_scene's dynamic "Character 1"/"Location 2"/... input pins
// (addEntityInput, GraphContext.tsx) and on each entity type's own "JSON"
// output port (data/nodes.ts; deliberately not "Description", which stays
// the generic Text color) since both are otherwise indistinguishable
// Text-typed ports. Everything else colors by its plain PortType.
function portColor(port: Port): string {
    if (port.entityKind) return NODE_TEMPLATES[port.entityKind].color;
    if (port.type === "Image") return "var(--color-node-scene)";
    if (port.type === "Video") return "var(--color-node-higgsfield)";
    if (port.type === "Audio") return "var(--color-node-audio)";
    if (port.type === "Text") return "var(--color-node-pinterest)";
    return "var(--color-text-tertiary)";
}

function portTypeLabel(type: PortType): string {
    return type;
}

// Imagen's guidanceScale has no documented range on the Gemini Developer API
// (a Google forum thread never got a straight answer, and testing showed no
// clear visual effect) — these are placeholder numbers, not a sourced
// default/step, picked only so the Imagen reroll button does something
// deterministic. Easy to retune in one place once real behavior is known.
const GUIDANCE_BASE = 7;
const GUIDANCE_NUDGE = 1;

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
    const requireAuth = useRequireAuth();

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
    // Regenerate a close variant of whichever slide the slider is currently
    // parked on — seed+10000 for Nano Banana/Lyria (the only two providers
    // that actually forward seed, see core/seed.ts's SEED_CAPABLE_NODE_TYPES),
    // a guidanceScale nudge for Imagen (the only provider with a real,
    // documented-as-wired guidance param — see gemini.service.ts). No default
    // value is ever written for guidanceScale outside of this handler: a
    // plain run passes no overrides, so withNodeOverrides never touches it —
    // it only ever appears in a request because reroll was clicked.
    // Undefined (no button rendered) for gemini_veo/text/vision, which are
    // neither seed- nor guidance-capable.
    const handleReroll =
        data.nodeType === "gemini_nanobanana" || data.nodeType === "gemini_lyria"
            ? () => {
                  const current = data.params.seed ? Number(data.params.seed) : undefined;
                  const next =
                      current !== undefined && !Number.isNaN(current)
                          ? current + 10000
                          : generateSeed();
                  void runNode(id, { seed: String(next) });
              }
            : data.nodeType === "gemini_imagen"
              ? () => {
                    const current = data.params.guidanceScale
                        ? Number(data.params.guidanceScale)
                        : undefined;
                    const next =
                        current !== undefined && !Number.isNaN(current)
                            ? current + GUIDANCE_NUDGE
                            : GUIDANCE_BASE;
                    void runNode(id, { guidanceScale: String(next) });
                }
              : undefined;
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
                    ...entityJsonPayload(data.nodeType, data.params),
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
    // An entity node that can generate its own photo (character today) shows
    // the prompt that generation uses, same two modes as output_scene below:
    // "raw" is pure and recomputed live from current params, while "llm" can
    // only show what the last Generate click actually sent — captured in that
    // variant's own params snapshot (see CharacterParams' appendMany), so
    // scrubbing the variant slider also scrubs the prompt.
    const generatesOwnPhoto = ENTITY_GENERATION_NODE_TYPES.has(data.nodeType);
    const entityGeneration = generatesOwnPhoto
        ? (data.generation as GenerationHistoryState | undefined)
        : undefined;
    const entityPrompt = !generatesOwnPhoto
        ? undefined
        : data.params.promptComposition === "raw"
          ? composeRawPrompt(
                [entityFromNode(data)],
                undefined,
                data.params.additionalDescription as string | undefined,
            )
          : (entityGeneration?.paramsHistory?.[currentHistoryRef(entityGeneration) ?? ""]
                ?.lastComposedPrompt as string | undefined);

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
                            if (!requireAuth()) return;
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
                {data.nodeType !== "output_scene" && (
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
                )}
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
                    {data.nodeType === "output_scene" && (
                        <div className={styles.pinRow}>
                            <Popover
                                side="left"
                                align="center"
                                gap={20}
                                arrow
                                trigger={({ toggle }) => (
                                    <button
                                        className={cn(
                                            "react-flow__handle react-flow__handle-left nodrag",
                                            styles.handle,
                                            styles.handleLeft,
                                            styles.addEntityPin,
                                        )}
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggle();
                                        }}
                                        title="Добавить сущность"
                                    />
                                )}>
                                {(close) => (
                                    <PopoverList
                                        items={ENTITY_KIND_OPTIONS.map((opt) => ({
                                            id: opt.type,
                                            label: opt.label,
                                            icon: opt.icon.replace(/^ti-/, ""),
                                        }))}
                                        value={null}
                                        onChange={(type) =>
                                            addEntityInput(
                                                id,
                                                type as NodeType,
                                                NODE_TEMPLATES[type as NodeType].label,
                                            )
                                        }
                                        onRequestClose={close}
                                    />
                                )}
                            </Popover>
                        </div>
                    )}
                </div>

                <div className={styles.paramsCol}>
                    {(outputKind === "image" || outputKind === "video") &&
                        generatedValues.length > 0 && (
                            <MediaSlider
                                items={generatedValues.map((url) => ({ url, type: outputKind }))}
                                index={generatedIdx}
                                onIndexChange={onHistoryIndexChange}
                                onDelete={onHistoryDelete}
                                onReroll={handleReroll}
                            />
                        )}

                    {outputKind === "audio" && generatedValues.length > 0 && (
                        <>
                            <HistoryNav
                                index={generatedIdx}
                                count={generatedValues.length}
                                onIndexChange={onHistoryIndexChange}
                                onDelete={() => onHistoryDelete(generatedIdx)}
                                onReroll={handleReroll}
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

                    <div className={styles.paramsWrap}>
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
                                    rows={generatesOwnPhoto ? 4 : 12}
                                    value={(data.params.additionalDescription as string) ?? ""}
                                    onChange={(v) =>
                                        updateNodeParam(id, "additionalDescription", v)
                                    }
                                />
                                {generatesOwnPhoto && (
                                    <TextAreaField
                                        label="Промпт генерации фото"
                                        rows={12}
                                        readOnly
                                        value={
                                            entityPrompt || "Промпт появится здесь после генерации"
                                        }
                                    />
                                )}
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
