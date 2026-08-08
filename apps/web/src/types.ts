import type { NodeType, PortType, TeamSide, TeamRole, TimelineTrack } from "@hayverse/shared";

export type { PortType };

export interface Port {
    id: string;
    name: string;
    type: PortType;
    // Input pins accept only one incoming edge by default (connecting a new
    // wire replaces whatever was already plugged in) — set true to opt an
    // input pin out of that. Meaningless on output pins, which always allow
    // fanning out to multiple targets.
    allowMultiple?: boolean;
}

// Shape stored in React Flow node `data` field
export interface NodeParams {
    nodeType: NodeType;
    label: string;
    color: string;
    icon: string;
    inputs: Port[];
    outputs: Port[];
    params: Record<string, unknown>;
    // UI-only display flags — deliberately kept outside `params` so they
    // never leak into a character's JSON output pin or get swept into
    // preset snapshots (which only ever look at `params`).
    showJsonPreview?: boolean;
    pinLabelsWide?: boolean;
    promptPanelOpen?: boolean;
    // Runtime bookkeeping for HISTORY_NODE_TYPES (data/nodes.ts) — written by
    // graphExecution.ts's appendGeneratedRef, read by NodeCard.tsx's history
    // nav and GeminiParams.tsx's wiredFieldDisplayValue. Sibling to `params`
    // for the same reason as the UI flags above: it's never something the
    // user typed, so it must never leak into a JSON output pin or a preset
    // snapshot. Absent until a node's first generation.
    generation?: {
        history: string[];
        idx: number;
        paramsHistory: Record<string, Record<string, unknown>>;
    };
    // Deliberately loose (defeats excess-property checking): `params` is a
    // polymorphic bag shaped per `nodeType`, with no per-type schema yet —
    // revisit once real backend param schemas exist.
    [key: string]: unknown;
}

// Minimal node reference for param-editing code that only ever needs id/data
// (e.g. NodeCard, a custom React Flow node renderer, only receives these two
// as separate props — never a full `Node<NodeParams>` with position/type/etc).
export interface NodeRef {
    id: string;
    data: NodeParams;
}

// A scene as shown in the Timeline — derived from each scene's `output_scene`
// node params, not stored separately (see GraphContext's `deriveScenes`).
export interface TimelineScene {
    id: string;
    num: string;
    title: string;
    start: number; // in seconds
    duration: number; // in seconds
    track: TimelineTrack; // for parallel scenes
    coverUrl: string;
    cameraActive: boolean;
}

export interface PinItem {
    id: string;
    title: string;
    image: string;
}

export interface BoardItem {
    id: string;
    name: string;
}

export interface TeamMember {
    id: string;
    name: string;
    charName: string;
    side: TeamSide;
    role: TeamRole;
    isMe: boolean;
}

// Mirrors apps/api's AuthUser (see @hayverse/api-client) — the real,
// backend-authenticated identity. Distinct from TeamMember, which is the
// hardcoded in-universe team roster shown in ProfileModal's "Команда" tab.
export interface CurrentUser {
    id: string;
    username: string;
    firstName: string;
    lastName: string | null;
    role: TeamRole;
}

export interface Palette {
    sky: string;
    orb: string;
    ground: string;
    wall: string;
    brick: string;
    frame: string;
    fig: string;
    art: string;
    sofa: string;
}

// An entity node's saved presets: key -> a snapshot of that entity's own
// params (everything except selectedItem), loaded onto the node when it's
// selected again. Keyed by the preset's stable `presetId`, not its
// (possibly non-unique, renameable) display `name`.
export type EntityPresets = Record<string, Record<string, unknown>>;

export interface WGS84Coordinates {
    lat: number | null;
    lon: number | null;
}

// CharacterNodeParams/LocationNodeParams/MiseEnSceneNodeParams/
// BuildingNodeParams/ClothingNodeParams/ArtworkNodeParams/
// FurnitureNodeParams/MusicNodeParams/ScriptNodeParams/
// StoryboardNodeParams/TransportNodeParams now live as z.infer types next to
// their zod schemas — see ui/NodeCard/params/EntityParams/*.schema.ts.
