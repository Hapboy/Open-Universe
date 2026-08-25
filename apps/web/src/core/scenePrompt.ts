import type { Edge } from "@xyflow/react";
import type { NodeParams } from "@/types.ts";
import type { SceneNarrativeSettings } from "@/store/contexts/NarrativeContext.tsx";
import { geminiApiClient } from "@/core/api/index.ts";
import { edgeInput } from "@/core/graph.ts";
import { resolveMediaRef } from "@/core/mediaRef.ts";
import { entityVisualPayload } from "@/schemas/entities/schemas.ts";
import { includedPhotos } from "@/schemas/entities/schemaHelpers.ts";
import type { EntityPhoto } from "@/schemas/entities/schemaHelpers.ts";

type ShowToast = (msg: string) => void;

// output_scene's first two input pins are the fixed Visual Render/Motion
// Render override pins (see data/nodes.ts) — everything after them is a
// dynamic entity pin added via addEntityInput (GraphContext.tsx).
const FIXED_PIN_COUNT = 2;

export interface ConnectedEntity {
    // The pin's own label (e.g. "Character 2") — doubles as a stand-in for
    // the entity's kind when its JSON didn't parse.
    pinLabel: string;
    // Parsed JSON output of whatever's wired into this pin (see
    // core/graph.ts's computeRichEntityExtraOutputs) — null if unwired,
    // not yet resolved, or not valid JSON.
    data: Record<string, unknown> | null;
    // This entity's own reference photos, resolved from `s3:<uuid>` refs to
    // real URLs — pulled from `data.photos` (see entityJsonPayload, which has
    // already dropped the excluded ones), ready to hand straight to
    // generateImageFromRefs.
    photoUrls: string[];
}

// Walks output_scene's entity input pins and resolves whatever's wired into
// each of them. Pure read of `resolved`/`edges` — doesn't itself trigger any
// graph computation. Takes the node's `data` directly (not a full react-flow
// `Node`), matching edgeInput's own convention and what NodeRef callers
// (e.g. OutputParams) actually have on hand.
export function collectConnectedEntities(
    nodeData: NodeParams,
    edges: Edge[],
    resolved: Record<string, unknown>,
): ConnectedEntity[] {
    const entityPins = nodeData.inputs.slice(FIXED_PIN_COUNT);
    const entities: ConnectedEntity[] = [];
    entityPins.forEach((pin, i) => {
        const input = edgeInput(nodeData, edges, resolved, i + FIXED_PIN_COUNT);
        if (!input.wired || typeof input.value !== "string") return;
        let data: Record<string, unknown> | null;
        try {
            data = JSON.parse(input.value) as Record<string, unknown>;
        } catch {
            data = null;
        }
        // The JSON pin publishes `[{ ref, caption?, role? }]`; the bare-string
        // form is only reachable from a value computed before a hot reload.
        const photos = (data?.photos as ({ ref: string } | string)[] | undefined) ?? [];
        entities.push({
            pinLabel: pin.name,
            data,
            photoUrls: photos.map((p) => resolveMediaRef(typeof p === "string" ? p : p.ref)),
        });
    });
    return entities;
}

// Every connected entity's own reference photos, flattened into one list —
// what Nano Banana's `imageUrls` gets fed for the Картинка stage.
export function collectReferenceImageUrls(entities: ConnectedEntity[]): string[] {
    return entities.flatMap((e) => e.photoUrls);
}

// Unlike entities' own filledEntityParams (schemas/entities/schemas.ts),
// this filters by whether each field's *own* value is empty, not whether it
// differs from some baseline default — arc's enum fields (curveType,
// conflictType, pacing, storyPhase, conflictTarget) never have an "empty"
// state (a dropdown/button-group always has something selected), so
// diffing against a default would wrongly hide a real, informative value
// like curveType: "linear" just because nobody changed it from the initial
// selection. Only emotionalTrend/tensionLevel (0 = neutral/unset) and
// loreRevelations (an actual list) can be meaningfully "empty".
function isEmptyArcValue(value: unknown): boolean {
    if (typeof value === "number") return value === 0;
    if (Array.isArray(value)) return value.length === 0;
    return value === "" || value == null;
}

function filledArcSettings(
    arcSettings: SceneNarrativeSettings | undefined,
): Partial<SceneNarrativeSettings> {
    if (!arcSettings) return {};
    return Object.fromEntries(
        Object.entries(arcSettings).filter(([, value]) => !isEmptyArcValue(value)),
    );
}

// The "raw" prompt-composition path: serializes the connected entities' own
// JSON plus the scene's arc settings straight through, no model call. Cheap
// and pure — safe to recompute on every keystroke if ever needed, unlike
// composeLlmPrompt below. `additionalDescription` (params.additionalDescription
// — the node's own free-text field, see UtilParams.tsx/NodeCard.tsx) is
// prepended verbatim ahead of the structured data when present. `entities`/
// `arc` keys are omitted entirely rather than shown empty/default — nothing
// connected or customized means nothing useful to tell the model.
export function composeRawPrompt(
    entities: ConnectedEntity[],
    arcSettings: SceneNarrativeSettings | undefined,
    additionalDescription?: string,
): string {
    const arc = filledArcSettings(arcSettings);
    const payload: Record<string, unknown> = {};
    if (entities.length > 0) {
        payload.entities = entities.map((e) => ({ pin: e.pinLabel, ...e.data }));
    }
    if (Object.keys(arc).length > 0) {
        payload.arc = arc;
    }
    const structured = JSON.stringify(payload, null, 2);
    return additionalDescription ? `${additionalDescription}\n\n${structured}` : structured;
}

// What kind of image the "llm" path is writing a prompt for. A whole scene
// (output_scene) and a single entity's own reference photo (an entity node's
// generate button, via entityFromNode below) want visibly different
// instructions — everything else about the two paths is identical.
const LLM_INSTRUCTIONS = {
    scene:
        "Ты — сценарист, составляющий промпт для генерации кадра сцены по " +
        "структурированным данным её персонажей, локации и обстановки. На " +
        "основе следующих данных в формате JSON напиши один связный, живой " +
        "промпт на естественном языке для модели генерации изображения — " +
        "опиши персонажей, локацию, атмосферу и настроение сцены.",
    entity:
        "Ты — художник-постановщик, составляющий промпт для генерации " +
        "референсного фото одного объекта по его структурированным данным. На " +
        "основе следующих данных в формате JSON напиши один связный промпт на " +
        "естественном языке для модели генерации изображения — опиши только " +
        "сам объект, его внешность и подачу, без сюжета и без окружения, если " +
        "оно не задано в данных.",
} as const;

const NO_MARKUP_RULE = " Не включай JSON или разметку в ответ, только готовый текст промпта.\n\n";

// The "llm" prompt-composition path: one text-model call turning the same
// structured data into a natural-language image-generation prompt — image
// models read like descriptive prose, not JSON. Falls back to the raw JSON if
// the call fails, same as every other generation call in this app degrading to
// `null`/showing a toast rather than throwing.
export async function composeLlmPrompt(
    entities: ConnectedEntity[],
    arcSettings: SceneNarrativeSettings | undefined,
    showToast: ShowToast,
    subject: keyof typeof LLM_INSTRUCTIONS = "scene",
): Promise<string> {
    const structured = composeRawPrompt(entities, arcSettings);
    const instruction = LLM_INSTRUCTIONS[subject] + NO_MARKUP_RULE + structured;
    const result = await geminiApiClient.generateText({ prompt: instruction }, showToast);
    return result ?? structured;
}

// Single entry point for either path — reads `params.promptComposition`
// ("llm" | "raw"). Anything other than an explicit "llm" takes the raw path,
// so the toggle backing this field starts off (see data/nodes.ts and
// character.schema.ts) and an unset value never spends a model call.
// `additionalDescription` is always prepended ahead of whichever path's
// output, so it reads first in the final generation prompt regardless of
// composition mode (see composeRawPrompt for the "raw" case).
export async function composeScenePrompt(
    promptComposition: unknown,
    entities: ConnectedEntity[],
    arcSettings: SceneNarrativeSettings | undefined,
    showToast: ShowToast,
    additionalDescription?: string,
    subject: "scene" | "entity" = "scene",
): Promise<string> {
    if (promptComposition !== "llm")
        return composeRawPrompt(entities, arcSettings, additionalDescription);
    const composed = await composeLlmPrompt(entities, arcSettings, showToast, subject);
    return additionalDescription ? `${additionalDescription}\n\n${composed}` : composed;
}

// One entity node described as if it were wired into itself — so an entity's
// own "generate a photo" action reuses composeScenePrompt/composeRawPrompt
// instead of hand-building a prompt string (which is what the character node
// used to do, and why it silently ignored half its own fields). Narrowed to
// the type's visual keys, since a portrait prompt wants how it looks, not its
// biography. Its own photos are the reference images, excluded ones dropped.
export function entityFromNode(nodeData: NodeParams): ConnectedEntity {
    const data = entityVisualPayload(nodeData.nodeType, nodeData.params);
    const photos = includedPhotos(nodeData.params.photos as EntityPhoto[] | undefined);
    return {
        pinLabel: nodeData.label,
        data,
        photoUrls: photos.map((p) => resolveMediaRef(p.ref)),
    };
}
