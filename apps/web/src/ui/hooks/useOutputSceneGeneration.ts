import { useState } from "react";
import type { Edge } from "@xyflow/react";
import type { GenerationHistoryState, NodeParams, NodeRef } from "@/types.ts";
import { useNarrativeContext } from "@/store/contexts/NarrativeContext.tsx";
import { useToastContext } from "@/store/contexts/ToastContext.tsx";
import { useGenerationHistory } from "@/ui/hooks/useGenerationHistory.ts";
import { useRequireAuth } from "@/ui/hooks/useRequireAuth.ts";
import { generateSeed } from "@/core/seed.ts";
import { putGeneratedBlob, resolveMediaRef } from "@/core/mediaRef.ts";
import { appendGenerationHistory, appendGenerationHistoryMany } from "@/core/generationHistory.ts";
import { geminiApiClient } from "@/core/api/index.ts";
import { nanoBananaRequestFromSlice } from "@/core/api/gemini/dto.ts";
import {
    collectConnectedEntities,
    collectReferenceImageUrls,
    composeScenePrompt,
} from "@/core/scenePrompt.ts";

// output_scene's own per-stage generation shape — the shared
// GenerationHistoryState fields plus the composed prompt (see types.ts's
// `generation` doc comment for why this doesn't live in `params`).
export type OutputStageGeneration = GenerationHistoryState & { lastComposedPrompt?: string };

// output_scene's two independent generation streams (Картинка/Видео), lifted
// out of OutputParams so NodeCard can drive them from the node header's run
// button — the same split the standalone Gemini nodes already have, where
// NodeCard owns the history + run button and the params component owns the
// model fields. Called unconditionally for every node type (rules-of-hooks);
// inert for anything that isn't an output_scene, exactly like NodeCard's
// existing useGenerationHistory call with an undefined generation.
export function useOutputSceneGeneration({
    node,
    edges,
    resolved,
    activeSceneId,
    updateNodeParams,
    setNodeField,
}: {
    node: NodeRef;
    edges: Edge[];
    resolved: Record<string, unknown>;
    activeSceneId: string | null;
    updateNodeParams: (id: string, patch: Record<string, unknown>) => void;
    setNodeField: (id: string, patch: Partial<NodeParams>) => void;
}) {
    const { getSceneNarrativeSettings } = useNarrativeContext();
    const { showToast } = useToastContext();
    const requireAuth = useRequireAuth();
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);
    const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);

    const params = node.data.params;
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
    // they were.
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
    const generateImage = async (seedOverride?: number) => {
        if (!requireAuth()) return;
        if (!activeSceneId) return;
        setIsGeneratingImage(true);
        try {
            const entities = collectConnectedEntities(node.data, edges, resolved);
            const prompt = await composeScenePrompt(
                params.promptComposition,
                entities,
                getSceneNarrativeSettings(activeSceneId),
                showToast,
                params.additionalDescription as string | undefined,
            );
            setImageGeneration({ lastComposedPrompt: prompt });
            const imageUrls = collectReferenceImageUrls(entities);
            // "Случайный" (imageParams.randomizeSeed, default true/missing):
            // off means reuse the stored seed, matching resolvedSeedPatch's
            // logic in core/seed.ts for the standalone node.
            const seed =
                seedOverride ??
                (imageParams.randomizeSeed === false && imageParams.seed
                    ? Number(imageParams.seed)
                    : generateSeed());
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

    const rerollImage = () => {
        const current = imageParams.seed ? Number(imageParams.seed) : undefined;
        const next =
            current !== undefined && !Number.isNaN(current) ? current + 10000 : generateSeed();
        void generateImage(next);
    };

    const generateVideo = async () => {
        if (!requireAuth()) return;
        if (!activeSceneId) return;
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
                getSceneNarrativeSettings(activeSceneId),
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

    // What the node header's run button acts on: whichever stage the
    // Картинка/Видео toggle is parked on.
    const isGenerating = stage === "image" ? isGeneratingImage : isGeneratingVideo;
    const generateDisabled =
        stage === "image" ? visualRenderWired : motionRenderWired || !imageHist.currentRef;

    return {
        stage,
        imageParams,
        videoParams,
        imageHist,
        videoHist,
        updateImageParam,
        updateVideoParam,
        visualRenderWired,
        motionRenderWired,
        isGenerating,
        generateDisabled,
        generateImage,
        generateVideo,
        rerollImage,
    };
}
