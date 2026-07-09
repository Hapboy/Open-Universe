import type { Edge, Node } from "@xyflow/react";
import type { NodeParams } from "../types.ts";
import { GeminiService, HiggsfieldService } from "./services/index.ts";

type ShowToast = (msg: string) => void;
type SetRenderImage = (img: string | null) => void;
type Resolved = Record<string, unknown>;

const ENTITY_TYPES = [
    "character",
    "location",
    "building",
    "clothing",
    "artwork",
    "furniture",
    "music",
    "script",
    "storyboard",
    "transport",
];

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
        return d.params.text;
    } else if (d.nodeType === "higgsfield_soul") {
        const face = edgeInput(d, edges, resolved, 0);
        const prompt = edgeInput(d, edges, resolved, 1);
        const faceVal = (face.wired ? face.value : null) as string | null;
        const promptVal = (prompt.wired ? prompt.value : d.params.prompt) as string;
        return await HiggsfieldService.runSoul(promptVal, faceVal, showToast);
    } else if (d.nodeType === "higgsfield_camera") {
        const input = edgeInput(d, edges, resolved, 0);
        const val = (input.wired ? input.value : null) as string | null;
        return await HiggsfieldService.runMotion(val, d.params.motionPreset as string, showToast);
    } else if (ENTITY_TYPES.includes(d.nodeType) && d.nodeType !== "character") {
        return d.params.selectedItem;
    } else if (d.nodeType === "gemini_text") {
        const prompt = edgeInput(d, edges, resolved, 0);
        const promptVal = (prompt.wired ? prompt.value : d.params.prompt) as string;
        return await GeminiService.runText(promptVal || "", showToast, d.params.model as string);
    } else if (d.nodeType === "gemini_vision") {
        const img = edgeInput(d, edges, resolved, 0);
        const query = edgeInput(d, edges, resolved, 1);
        const imgVal = (img.wired ? img.value : null) as string | null;
        const queryVal = (query.wired ? query.value : d.params.query) as string;
        if (!imgVal) return undefined;
        return await GeminiService.runVision(
            imgVal,
            queryVal || "Describe this scene",
            showToast,
            d.params.model as string,
        );
    } else if (d.nodeType === "gemini_imagen") {
        const prompt = edgeInput(d, edges, resolved, 0);
        const promptVal = (prompt.wired ? prompt.value : d.params.prompt) as string;
        const toNum = (v: unknown) => (v === "" || v == null ? undefined : Number(v));
        return await GeminiService.runImagen(
            promptVal || "",
            {
                aspectRatio: (d.params.aspectRatio as string) ?? "16:9",
                model: d.params.model as string,
                resolution: d.params.resolution as string,
                numberOfImages: (d.params.numberOfImages as number) || 1,
                personGeneration: d.params.personGeneration as string,
                safetyFilterLevel: d.params.safetyFilterLevel as string,
                outputMimeType: d.params.outputMimeType as string,
                outputCompressionQuality: d.params.outputCompressionQuality as number,
                guidanceScale: toNum(d.params.guidanceScale),
                language: d.params.language as string,
            },
            showToast,
        );
    } else if (d.nodeType === "gemini_veo") {
        const prompt = edgeInput(d, edges, resolved, 0);
        const promptVal = (prompt.wired ? prompt.value : d.params.prompt) as string;
        const img = edgeInput(d, edges, resolved, 1);
        const imgVal = (img.wired ? img.value : null) as string | null;
        return await GeminiService.runVeo(
            promptVal || "",
            imgVal,
            {
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
        return await GeminiService.runNanoBanana(
            promptVal || "",
            imageUrls,
            {
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
        return await GeminiService.runLyria(
            promptVal || "",
            { model: d.params.model as string, seed: toNum(d.params.seed) },
            showToast,
        );
    } else if (d.nodeType === "higgsfield_speak") {
        const input = edgeInput(d, edges, resolved, 0);
        const val = (input.wired ? input.value : null) as string | null;
        return await HiggsfieldService.runSpeak(val, d.params.expression as string, showToast);
    }

    return undefined;
}

// Fills a character node's fixed pins (Photos/Description/JSON) — pure
// derivations of its own params, independent of edges/resolution order.
function computeCharacterExtraOutputs(node: Node<NodeParams>, resolved: Resolved): void {
    const d = node.data;
    if (d.nodeType !== "character") return;
    const [photosPort, descPort, jsonPort] = d.outputs;
    if (photosPort) resolved[photosPort.id] = d.params.photos;
    if (descPort) resolved[descPort.id] = d.params.additionalDescription;
    if (jsonPort) {
        resolved[jsonPort.id] = JSON.stringify(
            { id: node.id, nodeType: d.nodeType, label: d.label, ...d.params },
            null,
            2,
        );
    }
}

function updateOutputScene(
    nodes: Node<NodeParams>[],
    edges: Edge[],
    resolved: Resolved,
    setRenderImage: SetRenderImage,
    showToast: ShowToast,
): void {
    const outNode = nodes.find((n) => n.data.nodeType === "output_scene");
    if (!outNode) return;
    const vEdge = edges.find((e) => e.targetHandle === outNode.data.inputs[0]?.id);
    const mEdge = edges.find((e) => e.targetHandle === outNode.data.inputs[1]?.id);
    const img =
        (vEdge && resolved[vEdge.sourceHandle ?? ""]) ||
        (mEdge && resolved[mEdge.sourceHandle ?? ""]) ||
        null;
    const prev = (window as Window & { customRenderImage?: string | null }).customRenderImage;
    if (img !== prev) {
        setRenderImage(img as string | null);
        showToast("Кадр фильма обновлен на основе выходов графа!");
    }
}

// Full-graph pass: recomputes every node from scratch into `resolved`
// (mutated in place — pass an empty object to fully reset the cache).
export async function runGraph(
    nodes: Node<NodeParams>[],
    edges: Edge[],
    resolved: Resolved,
    showToast: ShowToast,
    setRenderImage: SetRenderImage,
): Promise<void> {
    for (let pass = 0; pass < nodes.length; pass++) {
        for (const node of nodes) {
            const d = node.data;

            computeCharacterExtraOutputs(node, resolved);

            // Skip nodes whose output is already resolved from a previous pass
            if (d.outputs[0]?.id && resolved[d.outputs[0].id] !== undefined) continue;

            const out = await computeNodeOutput(node, edges, resolved, showToast);
            if (out !== undefined && d.outputs[0]?.id) resolved[d.outputs[0].id] = out;
        }
    }

    updateOutputScene(nodes, edges, resolved, setRenderImage, showToast);
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
        computeCharacterExtraOutputs(node, resolved);
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
    setRenderImage: SetRenderImage,
    onNodeStart?: (nodeId: string) => void,
    onNodeDone?: (nodeId: string) => void,
): Promise<void> {
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

    updateOutputScene(nodes, edges, resolved, setRenderImage, showToast);
}
