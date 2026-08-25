import { useRef, useState } from "react";
import cn from "classnames";
import {
    WirableTextField,
    useCategoryTags,
    type EEP,
    type NodeParamsProps,
} from "@/ui/NodeCard/params/shared.tsx";
import type { SceneNarrativeSettings } from "@/store/contexts/NarrativeContext.tsx";
import type { GenerationHistoryState } from "@/types.ts";
import { useGraphContext } from "@/store/contexts/GraphContext.tsx";
import { useNarrativeContext } from "@/store/contexts/NarrativeContext.tsx";
import { useToastContext } from "@/store/contexts/ToastContext.tsx";
import { edgeInput } from "@/core/graph.ts";
import { appendGenerationHistory, appendGenerationHistoryMany } from "@/core/generationHistory.ts";
import { generateSeed } from "@/core/seed.ts";
import { useGenerationHistory } from "@/ui/hooks/useGenerationHistory.ts";
import { useRequireAuth } from "@/ui/hooks/useRequireAuth.ts";
import { SelectField } from "@/ui/components/SelectField/SelectField.tsx";
import { TextField } from "@/ui/components/TextField/TextField.tsx";
import { NumberField } from "@/ui/components/NumberField/NumberField.tsx";
import { RangeField } from "@/ui/components/RangeField/RangeField.tsx";
import { CategoryTagGroup } from "@/ui/components/CategoryTagGroup/CategoryTagGroup.tsx";
import { SearchField } from "@/ui/components/SearchField/SearchField.tsx";
import { EmotionalCurvePreview } from "@/ui/components/EmotionalCurvePreview/EmotionalCurvePreview.tsx";
import { StoryPhaseBeats } from "@/ui/components/StoryPhaseBeats/StoryPhaseBeats.tsx";
import { Switch } from "@/ui/components/Switch/Switch.tsx";
import { BareButton } from "@/ui/components/BareButton/BareButton.tsx";
import {
    putBlob,
    putGeneratedBlob,
    resolveMediaRef,
    useResolvedMediaUrl,
} from "@/core/mediaRef.ts";
import { MediaPickerButton } from "@/ui/components/MediaLibrary/MediaLibrary.tsx";
import { MediaSlider } from "@/ui/NodeCard/MediaSlider/MediaSlider.tsx";
import { Button } from "@/ui/components/Button/Button.tsx";
import { IconButton } from "@/ui/components/IconButton/IconButton.tsx";
import { geminiApiClient } from "@/core/api/index.ts";
import { nanoBananaRequestFromSlice } from "@/core/api/gemini/dto.ts";
import { NanoBananaModelFields, VeoModelFields } from "@/ui/NodeCard/params/GeminiParams.tsx";
import {
    collectConnectedEntities,
    collectReferenceImageUrls,
    composeScenePrompt,
} from "@/core/scenePrompt.ts";
import styles from "@/ui/NodeCard/params/UtilParams.module.css";

// output_scene's own per-stage generation shape — the shared
// GenerationHistoryState fields plus the composed prompt (see types.ts's
// `generation` doc comment for why this doesn't live in `params`).
type OutputStageGeneration = GenerationHistoryState & { lastComposedPrompt?: string };

const OUTPUT_SCENE_CATEGORIES = [
    { key: "general", label: "Общие" },
    { key: "generation", label: "Генерация" },
    { key: "arc", label: "Арка" },
];

const curveOptions = [
    { value: "linear", label: "Линейная" },
    { value: "ease_in", label: "Ускорение" },
    { value: "ease_out", label: "Замедление" },
    { value: "ease_in_out", label: "S-образная" },
];

const pacingOptions = [
    { value: "slow", label: "Медленный" },
    { value: "moderate", label: "Умеренный" },
    { value: "fast", label: "Быстрый" },
    { value: "action", label: "Динамичный" },
];

// Tension level dynamic color indicator — mirrors the old Timeline "Scene
// Arc" tab's color-coded feedback.
const getTensionColor = (level: number) => {
    if (level < 30) return "#5DCAA5"; // Green
    if (level < 70) return "#EF9F27"; // Amber
    return "#D4537E"; // Neon Red
};

export function OutputParams({
    node,
    params,
    edges,
    resolved,
    scenes,
    updateNodeParam,
    updateNodeParams,
    setNodeField,
}: EEP & {
    scenes: NodeParamsProps["scenes"];
    updateNodeParams: NodeParamsProps["updateNodeParams"];
    setNodeField: NodeParamsProps["setNodeField"];
}) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { activeSceneId } = useGraphContext();
    const { showToast } = useToastContext();
    const requireAuth = useRequireAuth();
    // Scene-arc fields below still live in NarrativeContext, keyed by scene
    // id, separate from this node's own `params`. Only the active scene's
    // graph is ever mounted, so this node's activeSceneId is always its own
    // scene. Once this "Арка" group has settled here, consider folding
    // SceneNarrativeSettings into output_scene's params and retiring
    // NarrativeContext entirely.
    const { getSceneNarrativeSettings, updateNarrativeSettings } = useNarrativeContext();
    const {
        activeTags,
        searchQuery,
        setSearchQuery,
        isAllActive,
        toggleTag,
        toggleAll,
        shouldShow,
    } = useCategoryTags(OUTPUT_SCENE_CATEGORIES);
    const resolvedCoverUrl = useResolvedMediaUrl(params.coverUrl as string | undefined);
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);
    const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);

    const track = (params.track as number) ?? 1;
    const stage = node.data.outputSceneStage ?? "image";
    const imageParams = (params.image as Record<string, unknown>) ?? {};
    const videoParams = (params.video as Record<string, unknown>) ?? {};
    const visualRenderWired = edges.some((e) => e.targetHandle === node.data.inputs[0]?.id);
    const motionRenderWired = edges.some((e) => e.targetHandle === node.data.inputs[1]?.id);
    // node.data.generation.image/.video — this node's own two independent
    // generation-history streams, sibling to `params` (see types.ts's
    // `generation` doc comment for why this data doesn't live in params).
    const currentGeneration =
        (node.data.generation as
            Partial<Record<"image" | "video", OutputStageGeneration>> | undefined) ?? {};
    const imageGeneration = currentGeneration.image;
    const videoGeneration = currentGeneration.video;
    const isFinalImage = (params.activeOutput ?? "video") === "image";
    const isFinalVideo = (params.activeOutput ?? "video") === "video";

    const setImageGeneration = (next: Partial<OutputStageGeneration>) =>
        setNodeField(node.id, {
            generation: { ...currentGeneration, image: { ...imageGeneration, ...next } },
        });
    const setVideoGeneration = (next: Partial<OutputStageGeneration>) =>
        setNodeField(node.id, {
            generation: { ...currentGeneration, video: { ...videoGeneration, ...next } },
        });

    // Scrubbing the slider restores that generation's own params (model,
    // aspectRatio, seed, ...) into the form below — same "history nav = time
    // travel through your settings too" behavior as the standalone Gemini
    // nodes (NodeCard.tsx's onHistoryIndexChange), via useNodeParamsForm's
    // store-resync — plus the composed prompt, restored separately since it
    // lives in data.generation rather than params (see types.ts). A pick
    // with no recorded snapshot (media-library pick) just leaves both as
    // they were. Called unconditionally, above the activeSceneId early
    // return below — these are hooks (rules-of-hooks).
    const imageHist = useGenerationHistory<OutputStageGeneration>(
        imageGeneration,
        setImageGeneration,
        (snapshot) => {
            const { lastComposedPrompt, ...configSnapshot } = snapshot;
            updateNodeParams(node.id, { image: { ...imageParams, ...configSnapshot } });
            return { lastComposedPrompt: lastComposedPrompt as string | undefined };
        },
    );
    const videoHist = useGenerationHistory<OutputStageGeneration>(
        videoGeneration,
        setVideoGeneration,
        (snapshot) => {
            const { lastComposedPrompt, ...configSnapshot } = snapshot;
            updateNodeParams(node.id, { video: { ...videoParams, ...configSnapshot } });
            return { lastComposedPrompt: lastComposedPrompt as string | undefined };
        },
    );

    // Defensive: activeSceneId is nullable in GraphContext's types, but a
    // mounted output_scene node always belongs to the active scene.
    if (!activeSceneId) return null;
    const arc = getSceneNarrativeSettings(activeSceneId);

    const updateImageParam = (key: string, value: unknown) =>
        updateNodeParams(node.id, { image: { ...imageParams, [key]: value } });
    const updateVideoParam = (key: string, value: unknown) =>
        updateNodeParams(node.id, { video: { ...videoParams, [key]: value } });

    // `seedOverride` lets the reroll button (SeedField) supply an exact
    // seed+10000 value rather than whatever's currently in imageParams —
    // computed locally by the caller and passed straight through, since a
    // separate updateImageParam-then-generate would hit the same
    // stale-closure gap core/seed.ts's withNodeOverrides doc comment
    // describes. Absent a seedOverride, an empty seed field self-generates
    // one here rather than leaving it undefined — the Gemini Developer API
    // never echoes back a randomly-picked seed, so leaving it unset would
    // make it unrecoverable after the fact (see core/seed.ts).
    const handleGenerateImage = async (seedOverride?: number) => {
        if (!requireAuth()) return;
        setIsGeneratingImage(true);
        try {
            const entities = collectConnectedEntities(node.data, edges, resolved);
            const prompt = await composeScenePrompt(
                params.promptComposition,
                entities,
                arc,
                showToast,
                params.additionalDescription as string | undefined,
            );
            setImageGeneration({ lastComposedPrompt: prompt });
            const imageUrls = collectReferenceImageUrls(entities);
            const seed =
                seedOverride ?? (imageParams.seed ? Number(imageParams.seed) : generateSeed());
            const seedStr = String(seed);
            if (imageParams.seed !== seedStr) updateImageParam("seed", seedStr);
            const dataUrls = await geminiApiClient.generateImageFromRefs(
                nanoBananaRequestFromSlice(imageParams, { prompt, imageUrls, seed }),
                showToast,
            );
            if (!dataUrls) return;
            // Nano Banana can answer one prompt with several images — all of
            // them join this stage's history under the same snapshot, with the
            // slider parked on the newest (see appendGenerationHistoryMany).
            const refs = await Promise.all(
                dataUrls.map(async (dataUrl) =>
                    putGeneratedBlob(await (await fetch(dataUrl)).blob()),
                ),
            );
            setImageGeneration({
                ...appendGenerationHistoryMany(imageGeneration, refs, {
                    ...imageParams,
                    seed: seedStr,
                    lastComposedPrompt: prompt,
                }),
                lastComposedPrompt: prompt,
            });
        } finally {
            setIsGeneratingImage(false);
        }
    };

    const handleRerollImageSeed = () => {
        const current = imageParams.seed ? Number(imageParams.seed) : undefined;
        const next =
            current !== undefined && !Number.isNaN(current) ? current + 10000 : generateSeed();
        void handleGenerateImage(next);
    };

    const handleGenerateVideo = async () => {
        if (!requireAuth()) return;
        const refImage = imageHist.currentRef;
        if (!refImage) {
            showToast("Сначала выберите или сгенерируйте кадр во вкладке «Картинка»");
            return;
        }
        setIsGeneratingVideo(true);
        try {
            const entities = collectConnectedEntities(node.data, edges, resolved);
            const prompt = await composeScenePrompt(
                params.promptComposition,
                entities,
                arc,
                showToast,
                params.additionalDescription as string | undefined,
            );
            setVideoGeneration({ lastComposedPrompt: prompt });
            const dataUrl = await geminiApiClient.generateVideo(
                {
                    prompt,
                    imageUrl: resolveMediaRef(refImage),
                    model: videoParams.model as string,
                    aspectRatio: videoParams.aspectRatio as string,
                    resolution: videoParams.resolution as string,
                    durationSeconds: videoParams.durationSeconds as number,
                    negativePrompt: (videoParams.negativePrompt as string) || undefined,
                    personGeneration: videoParams.personGeneration as string,
                    enhancePrompt: videoParams.enhancePrompt as boolean,
                },
                showToast,
            );
            if (!dataUrl) return;
            const blob = await (await fetch(dataUrl)).blob();
            const ref = await putGeneratedBlob(blob);
            setVideoGeneration({
                ...appendGenerationHistory(videoGeneration, ref, {
                    ...videoParams,
                    lastComposedPrompt: prompt,
                }),
                lastComposedPrompt: prompt,
            });
        } finally {
            setIsGeneratingVideo(false);
        }
    };

    // Switching track snaps this scene's start to align with whatever scene is
    // currently last on the target track — recreates the old "parallel scene"
    // pattern (two scenes sharing a start on different tracks). Re-applied on
    // every toggle, in either direction; if the target track is empty, start
    // is left untouched.
    const handleTrackChange = (t: number) => {
        if (t === track) return;
        const targetTrackScenes = scenes.filter((s) => s.track === t && s.id !== node.id);
        const lastOnTarget = targetTrackScenes.reduce<(typeof targetTrackScenes)[number] | null>(
            (max, s) => (!max || s.start > max.start ? s : max),
            null,
        );
        updateNodeParam(node.id, "track", t);
        if (lastOnTarget) updateNodeParam(node.id, "start", lastOnTarget.start);
    };

    const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        putBlob(file)
            .then((ref) => updateNodeParam(node.id, "coverUrl", ref))
            .catch(console.error);
        e.target.value = "";
    };

    const handleCoverPick = (ref: string) => updateNodeParam(node.id, "coverUrl", ref);

    return (
        <>
            <div className={styles.searchContainer}>
                <SearchField value={searchQuery} onChange={setSearchQuery} />
                <CategoryTagGroup
                    options={OUTPUT_SCENE_CATEGORIES}
                    active={activeTags}
                    onToggle={toggleTag}
                    onToggleAll={toggleAll}
                    isAllActive={isAllActive}
                />
            </div>

            {shouldShow("general", "Название сцены") && (
                <TextField
                    label="Название сцены"
                    defaultValue={params.title as string}
                    onBlur={(v) => updateNodeParam(node.id, "title", v)}
                />
            )}

            {(shouldShow("general", "Начало (сек)") ||
                shouldShow("general", "Длительность (сек)")) && (
                <div className={styles.row2}>
                    {shouldShow("general", "Начало (сек)") && (
                        <NumberField
                            label="Начало (сек)"
                            value={params.start as number}
                            min={0}
                            onChange={(v) => updateNodeParam(node.id, "start", v)}
                        />
                    )}
                    {shouldShow("general", "Длительность (сек)") && (
                        <NumberField
                            label="Длительность (сек)"
                            value={params.duration as number}
                            min={1}
                            onChange={(v) => updateNodeParam(node.id, "duration", v)}
                        />
                    )}
                </div>
            )}

            {shouldShow("general", "Дорожка") && (
                <div className={styles.fld}>
                    <span>Дорожка</span>
                    <div className={styles.segBtn}>
                        {[1, 2].map((t) => (
                            <BareButton
                                key={t}
                                className={cn(track === t && styles.isOn)}
                                onClick={() => handleTrackChange(t)}>
                                {t}
                            </BareButton>
                        ))}
                    </div>
                </div>
            )}

            {shouldShow("general", "Обложка сцены") && (
                <div className={styles.fld}>
                    <span>Обложка сцены</span>
                    {params.coverUrl ? (
                        <div className={styles.coverPreviewWrapper}>
                            <img
                                src={resolvedCoverUrl}
                                className={styles.coverPreviewImg}
                                alt="Обложка"
                            />
                        </div>
                    ) : null}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={handleCoverUpload}
                    />
                    <div className={styles.presetRow}>
                        <IconButton
                            icon="upload"
                            onClick={() => fileInputRef.current?.click()}
                            title="Загрузить обложку"
                        />
                        <MediaPickerButton
                            onPick={handleCoverPick}
                            title="Выбрать обложку из медиатеки"
                        />
                    </div>
                </div>
            )}

            {(shouldShow("arc", "Угол тренда") || shouldShow("arc", "Форма кривой")) && (
                <>
                    <EmotionalCurvePreview
                        emotionalTrend={arc.emotionalTrend}
                        curveType={arc.curveType}
                    />
                    <div className={styles.row2}>
                        {shouldShow("arc", "Угол тренда") && (
                            <RangeField
                                label={`Угол тренда: ${arc.emotionalTrend}%`}
                                value={arc.emotionalTrend}
                                min={-100}
                                max={100}
                                onChange={(v) =>
                                    updateNarrativeSettings(activeSceneId, { emotionalTrend: v })
                                }
                            />
                        )}
                        {shouldShow("arc", "Форма кривой") && (
                            <SelectField
                                label="Форма кривой"
                                value={arc.curveType}
                                onChange={(v) =>
                                    updateNarrativeSettings(activeSceneId, {
                                        curveType: v as SceneNarrativeSettings["curveType"],
                                    })
                                }
                                options={curveOptions}
                            />
                        )}
                    </div>
                </>
            )}

            {shouldShow("arc", "Напряжение") && (
                <RangeField
                    label={
                        <>
                            Напряжение:{" "}
                            <span
                                style={{
                                    color: getTensionColor(arc.tensionLevel),
                                    fontWeight: "bold",
                                }}>
                                {arc.tensionLevel}%
                            </span>
                        </>
                    }
                    value={arc.tensionLevel}
                    min={0}
                    max={100}
                    onChange={(v) => updateNarrativeSettings(activeSceneId, { tensionLevel: v })}
                    color={getTensionColor(arc.tensionLevel)}
                />
            )}

            {shouldShow("arc", "Фаза сюжета") && (
                <div className={styles.fld}>
                    <span>Фаза сюжета</span>
                    <StoryPhaseBeats
                        value={arc.storyPhase}
                        onChange={(phase) =>
                            updateNarrativeSettings(activeSceneId, { storyPhase: phase })
                        }
                    />
                </div>
            )}

            {shouldShow("arc", "Ритм сцены") && (
                <SelectField
                    label="Ритм сцены"
                    value={arc.pacing}
                    onChange={(v) =>
                        updateNarrativeSettings(activeSceneId, {
                            pacing: v as SceneNarrativeSettings["pacing"],
                        })
                    }
                    options={pacingOptions}
                />
            )}

            {activeTags.generation && (
                <>
                    <Switch
                        label="Составлять промпт через LLM"
                        value={params.promptComposition === "llm"}
                        onChange={(v) =>
                            updateNodeParam(node.id, "promptComposition", v ? "llm" : "raw")
                        }
                    />

                    <hr className={styles.divider} />
                    <div className={styles.fld}>
                        <div className={styles.segBtn}>
                            <BareButton
                                className={cn(stage === "image" && styles.isOn)}
                                onClick={() =>
                                    setNodeField(node.id, { outputSceneStage: "image" })
                                }>
                                <i className="ti ti-photo" /> Картинка
                            </BareButton>
                            <BareButton
                                className={cn(stage === "video" && styles.isOn)}
                                onClick={() =>
                                    setNodeField(node.id, { outputSceneStage: "video" })
                                }>
                                <i className="ti ti-video" /> Видео
                            </BareButton>
                        </div>
                    </div>

                    {stage === "image" && (
                        <>
                            {visualRenderWired ? (
                                <p className={styles.hint}>
                                    <i className="ti ti-info-circle" />
                                    Visual Render подключён вручную — внутренняя генерация
                                    отключена.
                                </p>
                            ) : (
                                <>
                                    <NanoBananaModelFields
                                        paramsSlice={imageParams}
                                        onFieldChange={updateImageParam}
                                        onReroll={handleRerollImageSeed}
                                    />
                                    <div className={styles.generateRow}>
                                        <IconButton
                                            icon="wand"
                                            loading={isGeneratingImage}
                                            onClick={() => void handleGenerateImage()}
                                            title="Сгенерировать"
                                        />
                                        <MediaPickerButton
                                            onPick={(ref) => imageHist.append(ref)}
                                            title="Выбрать кадр из медиатеки"
                                        />
                                    </div>
                                    {imageHist.resolvedUrls.length > 0 && (
                                        <div className={styles.previewWrap}>
                                            <MediaSlider
                                                items={imageHist.resolvedUrls.map((url) => ({
                                                    url,
                                                    type: "image",
                                                }))}
                                                index={imageHist.idx}
                                                onIndexChange={imageHist.onIndexChange}
                                                onDelete={imageHist.onDelete}
                                            />
                                        </div>
                                    )}
                                </>
                            )}
                            <Button
                                icon={isFinalImage ? "flag-filled" : "flag"}
                                variant={isFinalImage ? "primary" : "default"}
                                disabled={!visualRenderWired && !imageHist.currentRef}
                                onClick={() => updateNodeParam(node.id, "activeOutput", "image")}>
                                {isFinalImage
                                    ? "Финальный вывод сцены"
                                    : "Сделать финальным выводом сцены"}
                            </Button>
                        </>
                    )}

                    {stage === "video" && (
                        <>
                            {motionRenderWired ? (
                                <p className={styles.hint}>
                                    <i className="ti ti-info-circle" />
                                    Motion Render подключён вручную — внутренняя генерация
                                    отключена.
                                </p>
                            ) : (
                                <>
                                    <p className={styles.hint}>
                                        <i className="ti ti-info-circle" />
                                        {imageHist.currentRef
                                            ? "Референс-кадр выбран на вкладке «Картинка»."
                                            : "Сначала сгенерируйте или выберите кадр на вкладке «Картинка»."}
                                    </p>
                                    <VeoModelFields
                                        paramsSlice={videoParams}
                                        onFieldChange={updateVideoParam}
                                    />
                                    <div className={styles.generateRow}>
                                        <IconButton
                                            icon="wand"
                                            loading={isGeneratingVideo}
                                            disabled={!imageHist.currentRef}
                                            onClick={handleGenerateVideo}
                                            title="Сгенерировать"
                                        />
                                        <MediaPickerButton
                                            onPick={(ref) => videoHist.append(ref)}
                                            title="Выбрать видео из медиатеки"
                                        />
                                    </div>
                                    {videoHist.resolvedUrls.length > 0 && (
                                        <div className={styles.previewWrap}>
                                            <MediaSlider
                                                items={videoHist.resolvedUrls.map((url) => ({
                                                    url,
                                                    type: "video",
                                                }))}
                                                index={videoHist.idx}
                                                onIndexChange={videoHist.onIndexChange}
                                                onDelete={videoHist.onDelete}
                                            />
                                        </div>
                                    )}
                                </>
                            )}
                            <Button
                                icon={isFinalVideo ? "flag-filled" : "flag"}
                                variant={isFinalVideo ? "primary" : "default"}
                                disabled={!motionRenderWired && !videoHist.currentRef}
                                onClick={() => updateNodeParam(node.id, "activeOutput", "video")}>
                                {isFinalVideo
                                    ? "Финальный вывод сцены"
                                    : "Сделать финальным выводом сцены"}
                            </Button>
                        </>
                    )}
                </>
            )}
        </>
    );
}

const MAX_TEXT_INPUTS = 8; // mirrors GraphContext's own dynamic-field cap

export function TextParams({
    node,
    params,
    edges,
    resolved,
    updateNodeParam,
    addTextInput,
}: EEP & { addTextInput: (id: string) => void }) {
    // Pin 0 is the node's own fixed, non-removable "Text" pin (see nodes.ts)
    // backing this field — legacy graphs saved before that pin existed have
    // none yet, so fall back to a plain unwired field in that case.
    const basePin = node.data.inputs[0];
    const baseInput = basePin
        ? edgeInput(node.data, edges, resolved, 0)
        : { wired: false, value: undefined };
    const extraPins = node.data.inputs.slice(1);
    const atLimit = extraPins.length >= MAX_TEXT_INPUTS;
    return (
        <>
            <WirableTextField
                label={basePin?.name ?? "Text 1"}
                node={node}
                paramKey="text"
                params={params}
                wired={baseInput.wired}
                liveValue={baseInput.value}
                updateNodeParam={updateNodeParam}
            />
            {extraPins.map((port, idx) => {
                const input = edgeInput(node.data, edges, resolved, idx + 1);
                return (
                    <WirableTextField
                        key={port.id}
                        label={port.name}
                        node={node}
                        paramKey={port.id}
                        params={params}
                        wired={input.wired}
                        liveValue={input.value}
                        updateNodeParam={updateNodeParam}
                    />
                );
            })}
            <Button
                icon="plus"
                disabled={atLimit}
                onClick={() => addTextInput(node.id)}
                title={
                    atLimit
                        ? `Достигнут лимит — ${MAX_TEXT_INPUTS} полей`
                        : "Добавить текстовое поле"
                }>
                Добавить текстовое поле
            </Button>
        </>
    );
}
