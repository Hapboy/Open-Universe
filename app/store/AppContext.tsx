import { createContext, useCallback, useContext, useRef, useState } from 'react';
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type OnConnect,
  type OnEdgesChange,
  type OnNodesChange,
} from '@xyflow/react';
import { NODE_TEMPLATES } from '../data/nodes.ts';
import type {
  CanonMode,
  CurrentUser,
  NodeParams,
  PlayerState,
  TeamMember,
} from '../types.ts';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface AppCtx {
  nodes: Node<NodeParams>[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;

  selectedNodeId: string | null;
  selectNode: (id: string | null) => void;

  createNode: (type: string, x: number, y: number) => Node<NodeParams> | null;
  deleteNode: (id: string) => void;
  updateNodeParam: (nodeId: string, key: string, value: unknown) => void;
  executeGraph: () => Promise<void>;
  loadPinterestBoards: (node: Node<NodeParams>) => Promise<void>;
  loadPinterestPins: (node: Node<NodeParams>, boardId: string) => Promise<void>;

  canonMode: CanonMode;
  setCanonMode: (m: CanonMode) => void;

  player: PlayerState;
  setPlayer: (patch: Partial<PlayerState>) => void;

  currentUser: CurrentUser | null;
  setCurrentUser: (u: CurrentUser) => void;
  team: TeamMember[];

  toast: string | null;
  showToast: (msg: string) => void;

  deferredInstallPrompt: BeforeInstallPromptEvent | null;
  setDeferredInstallPrompt: (e: BeforeInstallPromptEvent | null) => void;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const INITIAL_PLAYER: PlayerState = {
  isPlaying: false,
  movieTime: 330,
  activeSceneIndex: 3,
  playerMode: 'film',
  cam: 'classic',
  pal: 0,
  dlg: true,
  tempo: 32,
  gameAv: { x: 225, y: 235 },
  gameSavedT: 330,
};

const INITIAL_TEAM: TeamMember[] = [
  { name: 'Арам',  charName: 'Аракс', side: 'moct',        role: 'Разработчик', isMe: false },
  { name: 'Сона',  charName: 'Ани',   side: 'urvakan',     role: 'Стилист',     isMe: false },
  { name: 'Карен', charName: 'Давид', side: 'rambalkoshe', role: 'Художник',    isMe: false },
];

// ─── Context ──────────────────────────────────────────────────────────────────

const Ctx = createContext<AppCtx>(null!);
export const useAppContext = () => useContext(Ctx);

// Imperative getter for use in vanilla TS files (game.ts)
let _snapshot: (() => Pick<AppCtx, 'player'>) | null = null;
export const getAppSnapshot = () => _snapshot?.();

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [nodes, setNodes] = useState<Node<NodeParams>[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [canonMode, setCanonMode] = useState<CanonMode>('canon');
  const [player, setPlayerBase] = useState<PlayerState>(INITIAL_PLAYER);
  const [toast, setToast] = useState<string | null>(null);
  const [currentUser, setCurrentUserBase] = useState<CurrentUser | null>(
    JSON.parse(localStorage.getItem('hv_current_user') || 'null')
  );
  const [deferredInstallPrompt, setDeferredInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── React Flow handlers ─────────────────────────────────────────────────────

  const onNodesChange: OnNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes(ns => applyNodeChanges(changes, ns));
  }, []);

  const onEdgesChange: OnEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges(es => applyEdgeChanges(changes, es));
  }, []);

  const onConnect: OnConnect = useCallback((conn: Connection) => {
    setEdges(es => addEdge(conn, es));
  }, []);

  // ── Utilities ───────────────────────────────────────────────────────────────

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  const setPlayer = useCallback((patch: Partial<PlayerState>) => {
    setPlayerBase(s => ({ ...s, ...patch }));
  }, []);

  const setCurrentUser = useCallback((u: CurrentUser) => {
    localStorage.setItem('hv_current_user', JSON.stringify(u));
    setCurrentUserBase(u);
  }, []);

  // ── Graph actions ───────────────────────────────────────────────────────────

  const selectNode = useCallback((id: string | null) => {
    setSelectedNodeId(id);
  }, []);

  const nodeCounter = useRef(0);
  const createNode = useCallback((type: string, x: number, y: number): Node<NodeParams> | null => {
    const template = NODE_TEMPLATES[type as keyof typeof NODE_TEMPLATES];
    if (!template) return null;

    const id = `node_${Date.now()}_${++nodeCounter.current}`;
    const newNode: Node<NodeParams> = {
      id,
      type: 'custom',
      position: { x: Math.max(0, x), y: Math.max(0, y) },
      data: {
        nodeType: type,
        label: template.label,
        icon: template.icon,
        color: template.color,
        inputs:  template.inputs.map((inp, i) => ({ ...inp, id: `${id}_in_${i}` })),
        outputs: template.outputs.map((out, i) => ({ ...out, id: `${id}_out_${i}` })),
        params:  JSON.parse(JSON.stringify(template.params)) as Record<string, unknown>,
      },
    };

    setNodes(ns => [...ns, newNode]);
    return newNode;
  }, []);

  const deleteNode = useCallback((id: string) => {
    setNodes(ns => ns.filter(n => n.id !== id));
    setEdges(es => es.filter(e => e.source !== id && e.target !== id));
    setSelectedNodeId(null);
  }, []);

  const updateNodeParam = useCallback((nodeId: string, key: string, value: unknown) => {
    setNodes(ns => ns.map(n =>
      n.id !== nodeId ? n
        : { ...n, data: { ...n.data, params: { ...n.data.params, [key]: value } } }
    ));
  }, []);

  const loadPinterestBoards = useCallback(async (node: Node<NodeParams>) => {
    const { PinterestService } = await import('../core/services.ts');
    const boards = await PinterestService.fetchBoards(showToast);
    setNodes(ns => ns.map(n => {
      if (n.id !== node.id) return n;
      const params = { ...n.data.params, boards };
      if (boards.length && !params.boardId) {
        params.boardId   = (boards[0] as { id: string }).id;
        params.boardName = (boards[0] as { name: string }).name;
      }
      return { ...n, data: { ...n.data, params } };
    }));
  }, [showToast]);

  const loadPinterestPins = useCallback(async (node: Node<NodeParams>, boardId: string) => {
    const { PinterestService } = await import('../core/services.ts');
    const pins = await PinterestService.fetchPins(boardId);
    const selectedPin = pins.length ? (pins[0] as { image: string }).image : node.data.params.selectedPin;
    setNodes(ns => ns.map(n =>
      n.id !== node.id ? n
        : { ...n, data: { ...n.data, params: { ...n.data.params, pins, selectedPin } } }
    ));
  }, []);

  const executeGraph = useCallback(async () => {
    const { runGraph } = await import('../core/graph.ts');
    await runGraph(nodes, edges, showToast, (img: string | null) => {
      (window as Window & { customRenderImage?: string | null }).customRenderImage = img;
    });
  }, [nodes, edges, showToast]);

  // ── Assemble and expose ─────────────────────────────────────────────────────

  const ctx: AppCtx = {
    nodes, edges, onNodesChange, onEdgesChange, onConnect,
    selectedNodeId, selectNode,
    createNode, deleteNode, updateNodeParam, executeGraph,
    loadPinterestBoards, loadPinterestPins,
    canonMode, setCanonMode,
    player, setPlayer,
    currentUser, setCurrentUser,
    team: INITIAL_TEAM,
    toast, showToast,
    deferredInstallPrompt, setDeferredInstallPrompt,
  };

  _snapshot = () => ({ player: ctx.player });

  return <Ctx.Provider value={ctx}>{children}</Ctx.Provider>;
}
