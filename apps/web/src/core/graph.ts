import type { Edge, Node } from "@xyflow/react";
import type { GenerationHistoryState, NodeParams } from "@/types.ts";
import type { SceneOutputType } from "@hayverse/shared";
import { geminiApiClient, higgsfieldApiClient } from "@/core/api/index.ts";
import { AI_MODEL_NODE_TYPES, ENTITY_NODE_TYPES } from "@/data/nodes.ts";
import { resolveMediaRef } from "@/core/mediaRef.ts";
import { photoPortId } from "@/core/characterPorts.ts";
import { filledEntityParams } from "@/schemas/entities/schemas.ts";
import { currentHistoryRef } from "@/core/generationHistory.ts";

type ShowToast = (msg: string) => void;
type Resolved = Record<string, unknown>;

// Mirrors the original inline lookup: if the input is wired to an edge, use
// whatever is currently resolved for its source (even if that's still
// undefined) — only fall back to the node's own param when nothing is wired
// at all. This preserves the fixed-point pass's existing convergence
// behavior in `runGraph`.
export function edgeInput(
    d: NodeParams,
    edges: Edge[],
    resolved: Resolved,
    inputIndex: number,
): { wired: boolean; value: unknown } {
    const edge = edges.find((e) => e.targetHandle === d.inputs[inputIndex]?.id);
    return edge
        ? { wired: true, value: resolved[edge.sourceHandle ?? ""] }
        : { wired: false, value: undefined };
}

// Computes a single node's output value. Returns undefined when the node
// type produces nothing yet (unmet dependency, or the underlying service call
// yielded no result) — callers should leave `resolved` untouched in that case.
//
// Deliberately not a switch/exhaustive over NodeType: entity types
// (character, building, clothing, ...) have no AI computation of their own
// and are meant to fall through to `return undefined` — their real payload
// (Description/JSON, one per photo) is filled separately by
// computeRichEntityExtraOutputs below, keyed by port name rather than by
// `outputs[0]`, so it's unaffected by this function returning nothing for
// them. That's correct behavior, not a missing case.
async function computeNodeOutput(
    node: Node<NodeParams>,
    edges: Edge[],
    resolved: Resolved,
    showToast: ShowToast,
): Promise<unknown> {
    const d = node.data;

    if (d.nodeType === "pinterest_board") {
        return d.params.selectedPin;
    } else if (d.nodeType === "text_prompt") {
        // Legacy graphs saved before this node had any pins at all — fall
        // back to the plain param, same as the node's original behavior.
        if (d.inputs.length === 0) return d.params.text;
        // Pin 0 is the node's own fixed "Text" pin, backing its own field
        // (paramKey "text", same wired-or-own pattern as gemini_text's
        // Prompt). Every pin after it is a dynamically added extra field,
        // keyed by its own pin id (see WirableTextField usage in TextParams).
        const slots = d.inputs.map((port, i) => {
            const input = edgeInput(d, edges, resolved, i);
            const ownKey = i === 0 ? "text" : port.id;
            return (input.wired ? input.value : d.params[ownKey]) as string | undefined;
        });
        return slots.filter((t) => typeof t === "string" && t !== "").join(", ");
    } else if (d.nodeType === "higgsfield_soul") {
        const face = edgeInput(d, edges, resolved, 0);
        const prompt = edgeInput(d, edges, resolved, 1);
        const faceVal = (face.wired ? face.value : null) as string | null;
        const promptVal = (prompt.wired ? prompt.value : d.params.prompt) as string;
        return await higgsfieldApiClient.runSoul(
            { prompt: promptVal, faceRefUrl: faceVal },
            showToast,
        );
    } else if (d.nodeType === "higgsfield_camera") {
        const input = edgeInput(d, edges, resolved, 0);
        const val = (input.wired ? input.value : null) as string | null;
        return await higgsfieldApiClient.runMotion(
            { frameUrl: val, preset: d.params.motionPreset as string },
            showToast,
        );
    } else if (d.nodeType === "gemini_text") {
        const prompt = edgeInput(d, edges, resolved, 0);
        const promptVal = (prompt.wired ? prompt.value : d.params.prompt) as string;
        return await geminiApiClient.generateText(
            { prompt: promptVal || "", model: d.params.model as string },
            showToast,
        );
    } else if (d.nodeType === "gemini_vision") {
        const img = edgeInput(d, edges, resolved, 0);
        const query = edgeInput(d, edges, resolved, 1);
        const imgVal = (img.wired ? img.value : null) as string | null;
        const queryVal = (query.wired ? query.value : d.params.query) as string;
        if (!imgVal) return undefined;
        return await geminiApiClient.generateVision(
            {
                imageUrl: imgVal,
                query: queryVal || "Describe this scene",
                model: d.params.model as string,
            },
            showToast,
        );
    } else if (d.nodeType === "gemini_imagen") {
        const prompt = edgeInput(d, edges, resolved, 0);
        const promptVal = (prompt.wired ? prompt.value : d.params.prompt) as string;
        const toNum = (v: unknown) => (v === "" || v == null ? undefined : Number(v));
        return await geminiApiClient.generateImage(
            {
                prompt: promptVal || "",
                aspectRatio: (d.params.aspectRatio as string) ?? "16:9",
                model: d.params.model as string,
                resolution: d.params.resolution as string,
                numberOfImages: (d.params.numberOfImages as number) || 1,
                personGeneration: d.params.personGeneration as string,
                safetyFilterLevel: d.params.safetyFilterLevel as string,
                outputMimeType: d.params.outputMimeType as string,
                outputCompressionQuality: d.params.outputCompressionQuality as number,
                guidanceScale: toNum(d.params.guidanceScale),
            },
            showToast,
        );
    } else if (d.nodeType === "gemini_veo") {
        const prompt = edgeInput(d, edges, resolved, 0);
        const promptVal = (prompt.wired ? prompt.value : d.params.prompt) as string;
        const img = edgeInput(d, edges, resolved, 1);
        const imgVal = (img.wired ? img.value : null) as string | null;
        return await geminiApiClient.generateVideo(
            {
                prompt: promptVal || "",
                imageUrl: imgVal,
                model: d.params.model as string,
                aspectRatio: (d.params.aspectRatio as string) ?? "16:9",
                resolution: (d.params.resolution as string) ?? "720p",
                durationSeconds: d.params.durationSeconds as number,
                negativePrompt: (d.params.negativePrompt as string) || undefined,
                personGeneration: d.params.personGeneration as string,
                enhancePrompt: d.params.enhancePrompt as boolean,
            },
            showToast,
        );
    } else if (d.nodeType === "gemini_nanobanana") {
        const prompt = edgeInput(d, edges, resolved, 0);
        const promptVal = (prompt.wired ? prompt.value : d.params.prompt) as string;
        const imageUrls = d.inputs
            .slice(1)
            .map((_, i) => edgeInput(d, edges, resolved, i + 1))
            .filter((img) => img.wired && img.value != null)
            .map((img) => img.value as string);
        const toNum = (v: unknown) => (v === "" || v == null ? undefined : Number(v));
        return await geminiApiClient.generateImageFromRefs(
            {
                prompt: promptVal || "",
                imageUrls,
                model: d.params.model as string,
                aspectRatio: d.params.aspectRatio as string,
                imageSize: d.params.imageSize as string,
                seed: toNum(d.params.seed),
            },
            showToast,
        );
    } else if (d.nodeType === "gemini_lyria") {
        const prompt = edgeInput(d, edges, resolved, 0);
        const promptVal = (prompt.wired ? prompt.value : d.params.prompt) as string;
        const toNum = (v: unknown) => (v === "" || v == null ? undefined : Number(v));
        return await geminiApiClient.generateAudio(
            {
                prompt: promptVal || "",
                model: d.params.model as string,
                seed: toNum(d.params.seed),
            },
            showToast,
        );
    } else if (d.nodeType === "higgsfield_speak") {
        const input = edgeInput(d, edges, resolved, 0);
        const val = (input.wired ? input.value : null) as string | null;
        return await higgsfieldApiClient.runSpeak(
            { avatarUrl: val, speechText: d.params.expression as string },
            showToast,
        );
    }

    return undefined;
}

// Fills an entity node's per-photo output pins, plus Description/JSON for the
// "rich" entity types that have those ports — pure derivations of its own
// params, independent of edges/resolution order. Photos are stored as
// media refs (`s3:<uuid>`), not raw data — resolve them to real URLs
// here so downstream AI-model nodes (e.g. Nano Banana reference images) get
// usable image data, not an id string. Each photo's pin id is derived from
// its own ref (see characterPorts.ts), not its position, so this doesn't
// need to know the pins' order.
async function computeRichEntityExtraOutputs(
    node: Node<NodeParams>,
    resolved: Resolved,
): Promise<void> {
    const d = node.data;
    if (!ENTITY_NODE_TYPES.has(d.nodeType)) return;
    const photos = (d.params.photos as string[] | undefined) ?? [];
    await Promise.all(
        photos.map(async (ref) => {
            resolved[photoPortId(node.id, ref)] = await resolveMediaRef(ref);
        }),
    );
    const descPort = d.outputs.find((p) => p.name === "Description");
    if (descPort) resolved[descPort.id] = d.params.additionalDescription;
    const jsonPort = d.outputs.find((p) => p.name === "JSON");
    if (jsonPort) {
        resolved[jsonPort.id] = JSON.stringify(
            {
                id: node.id,
                nodeType: d.nodeType,
                label: d.label,
                ...filledEntityParams(d.nodeType, d.params),
            },
            null,
            2,
        );
    }
}

export interface SceneOutput {
    url: string;
    type: SceneOutputType;
}

// The scene's actual output: whatever is wired into the `output_scene`
// node's Visual Render (Image) / Motion Render (Video) input pins, picking
// whichever the node's own `activeOutput` toggle prefers and falling back to
// the other pin if the preferred one isn't wired/resolved yet. A wired pin
// always wins (manual override); when unwired, falls back to each stage's
// own generation history (`data.generation.image`/`.video` — see types.ts's
// `generation` doc comment), via the shared `currentHistoryRef`, resolved
// from a media ref to a real URL. No separate "confirmed pick" field:
// picking a slider position (via a new generation or the media picker — see
// UtilParams.tsx's OutputParams) is the pick.
function resolveSceneOutput(
    nodes: Node<NodeParams>[],
    edges: Edge[],
    resolved: Resolved,
): SceneOutput | null {
    const outNode = nodes.find((n) => n.data.nodeType === "output_scene");
    if (!outNode) return null;
    const vEdge = edges.find((e) => e.targetHandle === outNode.data.inputs[0]?.id);
    const mEdge = edges.find((e) => e.targetHandle === outNode.data.inputs[1]?.id);
    const stageGeneration = outNode.data.generation as
        Partial<Record<"image" | "video", GenerationHistoryState>> | undefined;
    const imageSelectedRef = currentHistoryRef(stageGeneration?.image);
    const videoSelectedRef = currentHistoryRef(stageGeneration?.video);
    const imageUrl = vEdge
        ? resolved[vEdge.sourceHandle ?? ""]
        : imageSelectedRef
          ? resolveMediaRef(imageSelectedRef)
          : undefined;
    const videoUrl = mEdge
        ? resolved[mEdge.sourceHandle ?? ""]
        : videoSelectedRef
          ? resolveMediaRef(videoSelectedRef)
          : undefined;
    const wantsVideo = (outNode.data.params.activeOutput ?? "video") === "video";
    const primary: SceneOutput = wantsVideo
        ? { url: videoUrl as string, type: "video" }
        : { url: imageUrl as string, type: "image" };
    const fallback: SceneOutput = wantsVideo
        ? { url: imageUrl as string, type: "image" }
        : { url: videoUrl as string, type: "video" };
    if (typeof primary.url === "string") return primary;
    if (typeof fallback.url === "string") return fallback;
    return null;
}

// Full-graph pass: recomputes every node from scratch into `resolved`
// (mutated in place — pass an empty object to fully reset the cache).
//
// `autoMode` is for the reactive/automatic pass (GraphContext's debounced
// effect, not the manual "Прогнать граф" button): it skips AI-model node
// types entirely — never calls them, never touches their cached output —
// so a paid node only ever runs from an explicit manual action. Every other
// node is recomputed fresh on every call (bypassing the "already resolved"
// skip below) since that's the only way a changed param or rewiring ever
// takes effect without a manual click, and these nodes are pure/free local
// reads (Pinterest pin, text passthrough, entity selector) so recomputing
// them costs nothing.
export async function runGraph(
    nodes: Node<NodeParams>[],
    edges: Edge[],
    resolved: Resolved,
    showToast: ShowToast,
    opts?: { autoMode?: boolean },
): Promise<SceneOutput | null> {
    for (let pass = 0; pass < nodes.length; pass++) {
        for (const node of nodes) {
            const d = node.data;

            if (opts?.autoMode && AI_MODEL_NODE_TYPES.includes(d.nodeType)) continue;

            await computeRichEntityExtraOutputs(node, resolved);

            // Skip nodes whose output is already resolved from a previous pass
            const alreadyResolved = d.outputs[0]?.id && resolved[d.outputs[0].id] !== undefined;
            if (alreadyResolved && !opts?.autoMode) continue;

            const out = await computeNodeOutput(node, edges, resolved, showToast);
            if (out !== undefined && d.outputs[0]?.id) resolved[d.outputs[0].id] = out;
        }
    }

    return resolveSceneOutput(nodes, edges, resolved);
}

// Computes and caches a single node's output into `resolved`, first
// resolving any of its unwired-from-cache ancestors so the node never runs
// against stale/missing upstream values. `inFlight` guards against cycles.
async function resolveNode(
    id: string,
    nodes: Node<NodeParams>[],
    edges: Edge[],
    resolved: Resolved,
    showToast: ShowToast,
    onNodeStart: ((nodeId: string) => void) | undefined,
    onNodeDone: ((nodeId: string) => void) | undefined,
    inFlight: Set<string>,
): Promise<void> {
    if (inFlight.has(id)) return;
    inFlight.add(id);

    const node = nodes.find((n) => n.id === id);
    if (!node) return;

    for (const edge of edges) {
        if (edge.target !== id) continue;
        const ancestorOutputId = nodes.find((n) => n.id === edge.source)?.data.outputs[0]?.id;
        if (ancestorOutputId && resolved[ancestorOutputId] !== undefined) continue;
        await resolveNode(
            edge.source,
            nodes,
            edges,
            resolved,
            showToast,
            onNodeStart,
            onNodeDone,
            inFlight,
        );
    }

    onNodeStart?.(id);
    try {
        const out = await computeNodeOutput(node, edges, resolved, showToast);
        const outputId = node.data.outputs[0]?.id;
        if (outputId) {
            if (out !== undefined) resolved[outputId] = out;
            else delete resolved[outputId];
        }
        await computeRichEntityExtraOutputs(node, resolved);
    } finally {
        onNodeDone?.(id);
    }
}

// Recomputes a single node (after first resolving any unresolved ancestors
// feeding into it), then cascades forward through everything wired
// downstream, reusing whatever is already in `resolved` for the rest.
export async function runNodeCascade(
    startNodeId: string,
    nodes: Node<NodeParams>[],
    edges: Edge[],
    resolved: Resolved,
    showToast: ShowToast,
    onNodeStart?: (nodeId: string) => void,
    onNodeDone?: (nodeId: string) => void,
): Promise<SceneOutput | null> {
    const queue = [startNodeId];
    const visited = new Set<string>();

    while (queue.length) {
        const id = queue.shift()!;
        if (visited.has(id)) continue;
        visited.add(id);

        await resolveNode(
            id,
            nodes,
            edges,
            resolved,
            showToast,
            onNodeStart,
            onNodeDone,
            new Set(),
        );

        for (const edge of edges) {
            if (edge.source === id) queue.push(edge.target);
        }
    }

    return resolveSceneOutput(nodes, edges, resolved);
}
