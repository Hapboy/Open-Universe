import type { CharacterNodeParams } from "@/schemas/entities/character.schema.ts";
import { characterPhotoGenDefaults } from "@/schemas/entities/character.schema.ts";
import type { EntityPhoto } from "@/schemas/entities/schemaHelpers.ts";
import { MAX_ENTITY_PHOTOS } from "@/schemas/entities/schemaHelpers.ts";
import type { GenerationHistoryState, NodeParams, NodeRef } from "@/types.ts";
import { useToastContext } from "@/store/contexts/ToastContext.tsx";
import { useGenerationHistory } from "@/ui/hooks/useGenerationHistory.ts";
import { useImageGeneration } from "@/ui/hooks/useImageGeneration.ts";
import { useRequireAuth } from "@/ui/hooks/useRequireAuth.ts";
import { geminiApiClient } from "@/core/api/index.ts";
import { nanoBananaRequestFromSlice } from "@/core/api/gemini/dto.ts";
import { composeScenePrompt, entityFromNode } from "@/core/scenePrompt.ts";
import { generateSeed } from "@/core/seed.ts";
import { newPhotoEntry } from "@/ui/components/PhotoPreview/PhotoPreview.tsx";

// An entity's own photo-generation stream (character today — see
// ENTITY_GENERATION_NODE_TYPES), lifted out of CharacterParams so NodeCard can
// drive it from the node header's run button, matching the standalone Gemini
// nodes' split. Called unconditionally for every node type (rules-of-hooks);
// inert for anything without a generation stream.
export function useEntityPhotoGeneration({
    node,
    updateNodeParams,
    setNodePhotos,
    setNodeField,
}: {
    node: NodeRef;
    updateNodeParams: (id: string, patch: Record<string, unknown>) => void;
    setNodePhotos: (id: string, photos: EntityPhoto[], coverPhotoIndex: number) => void;
    setNodeField: (id: string, patch: Partial<NodeParams>) => void;
}) {
    const params = node.data.params as CharacterNodeParams;
    const { generate, isGenerating } = useImageGeneration();
    const { showToast } = useToastContext();
    const requireAuth = useRequireAuth();

    const photos = params.photos || [];
    // Absent on characters created before the generation block existed (the
    // field is `.optional()` for exactly that reason, see character.schema.ts).
    const photoGen = { ...characterPhotoGenDefaults, ...(params.photoGen ?? {}) };
    const updatePhotoGen = (key: string, value: unknown) =>
        updateNodeParams(node.id, { photoGen: { ...photoGen, [key]: value } });

    // Generated variants live in their own history stream rather than going
    // straight into `photos`: one prompt can return several images, and a
    // gallery capped at MAX_ENTITY_PHOTOS shouldn't fill up with rejects. The
    // user promotes the one they want with «Принять в фото». Flat
    // GenerationHistoryState (not output_scene's per-stage shape) — a character
    // has exactly one stream.
    const photoHist = useGenerationHistory(
        node.data.generation as GenerationHistoryState | undefined,
        (patch) =>
            setNodeField(node.id, {
                generation: {
                    ...(node.data.generation as GenerationHistoryState | undefined),
                    ...patch,
                } as GenerationHistoryState,
            }),
        // Scrubbing back to a variant restores the config that produced it.
        // `lastComposedPrompt` rides along in the same snapshot but isn't
        // config — it's read straight from paramsHistory where the prompt panel
        // needs it (see NodeCard.tsx), so it's dropped here rather than written
        // into photoGen.
        (snapshot) => {
            const { lastComposedPrompt: _prompt, ...configSnapshot } = snapshot;
            updateNodeParams(node.id, { photoGen: { ...photoGen, ...configSnapshot } });
        },
    );

    // `seedOverride` comes from the reroll button, which computes seed+10000
    // itself — a separate updateNodeParams-then-generate would read the stale
    // value (see core/seed.ts's withNodeOverrides). An empty seed field
    // self-generates one here so it stays recoverable afterwards: the Gemini
    // Developer API never echoes back a seed it picked itself.
    const generatePhoto = async (seedOverride?: number) => {
        if (!requireAuth()) return;
        const self = entityFromNode(node.data);
        const prompt = await composeScenePrompt(
            params.promptComposition,
            [self],
            undefined,
            showToast,
            params.additionalDescription,
            "entity",
        );
        // "Случайный" (photoGen.randomizeSeed, default true/missing): off
        // means reuse the stored seed, matching resolvedSeedPatch's logic in
        // core/seed.ts for the standalone node.
        const seed =
            seedOverride ??
            (photoGen.randomizeSeed === false && photoGen.seed
                ? Number(photoGen.seed)
                : generateSeed());
        const seedStr = String(seed);
        if (photoGen.seed !== seedStr) updatePhotoGen("seed", seedStr);
        const refs = await generate((toast) =>
            geminiApiClient.generateImageFromRefs(
                nanoBananaRequestFromSlice(photoGen, {
                    prompt,
                    imageUrls: self.photoUrls,
                    seed,
                }),
                toast,
            ),
        );
        if (refs.length > 0)
            photoHist.appendMany(refs, { ...photoGen, seed: seedStr, lastComposedPrompt: prompt });
    };

    const rerollPhoto = () => {
        const current = photoGen.seed ? Number(photoGen.seed) : undefined;
        const next =
            current !== undefined && !Number.isNaN(current) ? current + 10000 : generateSeed();
        void generatePhoto(next);
    };

    // Promotes the variant the slider is parked on into the real gallery. The
    // cover is left alone unless there was nothing to cover yet — a generated
    // variant shouldn't silently replace the photo representing this character.
    const acceptGeneratedPhoto = () => {
        const ref = photoHist.currentRef;
        if (!ref) return;
        setNodePhotos(
            node.id,
            [...photos, newPhotoEntry(ref)],
            photos.length === 0 ? 0 : (params.coverPhotoIndex ?? 0),
        );
    };
    const acceptedAlready =
        !!photoHist.currentRef && photos.some((p) => p.ref === photoHist.currentRef);
    const galleryFull = photos.length >= MAX_ENTITY_PHOTOS;

    return {
        photoGen,
        updatePhotoGen,
        photoHist,
        isGenerating,
        generatePhoto,
        rerollPhoto,
        acceptGeneratedPhoto,
        acceptedAlready,
        galleryFull,
    };
}
