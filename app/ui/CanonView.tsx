import { useState } from 'react';
import {
  ReactFlow,
  Background,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useAppContext } from '../store/AppContext.tsx';
import { SCENES } from '../data/scenes.ts';

type ParamDef =
  | { l: string; type: 'range'; min: number; max: number; u: string; v: number }
  | { l: string; type: 'sel'; opts: string[]; v: number };

interface DemoNodeData {
  label: string;
  icon: string;
  color: string;
  isAlt?: boolean;
  db: string[];
  params: ParamDef[];
  [key: string]: unknown;
}

const DEMO_NODES: Node<DemoNodeData>[] = [
  {
    id: 'dn_char', type: 'default', position: { x: 60, y: 60 },
    data: {
      label: 'Ара Гехецик', icon: 'ti-user', color: 'var(--color-node-higgsfield)', isAlt: true,
      db: ['Ара Гехецик', 'Анаит Багратуни', 'Вардан Майриг', 'Цовинар'],
      params: [
        { l: 'Возраст', type: 'range', min: 16, max: 70, v: 34, u: '' },
        { l: 'Эмоция',  type: 'sel',   opts: ['спокойствие', 'решимость', 'тоска'], v: 1 },
        { l: 'Стилист', type: 'sel',   opts: ['Без стилиста', 'Урбанский', 'Кондский шик'], v: 2 },
      ],
    },
  },
  {
    id: 'dn_cloth', type: 'default', position: { x: 60, y: 160 },
    data: {
      label: 'Тараз', icon: 'ti-shirt', color: 'var(--color-node-clothing)',
      db: ['Тараз', 'Tigran Avetisyan FW26', 'Anna K', 'Loom Weaving'],
      params: [
        { l: 'Сезон',  type: 'sel',   opts: ['FW26', 'SS26', 'Couture'], v: 0 },
        { l: 'Износ',  type: 'range', min: 0, max: 100, v: 12, u: '%' },
      ],
    },
  },
  {
    id: 'dn_art', type: 'default', position: { x: 220, y: 80 },
    data: {
      label: 'Картина Минаса', icon: 'ti-palette', color: 'var(--color-node-artwork)',
      db: ['Картина Минаса', 'Сарьян', 'Параджанов коллаж', 'Хачкар'],
      params: [
        { l: 'Масштаб', type: 'range', min: 20, max: 300, v: 120, u: 'см' },
      ],
    },
  },
  {
    id: 'dn_loc', type: 'default', position: { x: 220, y: 180 },
    data: {
      label: 'Двор Конда', icon: 'ti-map-pin', color: 'var(--color-node-scene)', isAlt: true,
      db: ['Двор Конда', 'Каскад', 'Гарни', 'Севан'],
      params: [
        { l: 'Погода', type: 'sel',   opts: ['ясно', 'туман', 'дождь', 'снег'], v: 1 },
        { l: 'Время',  type: 'sel',   opts: ['рассвет', 'день', 'закат', 'ночь'], v: 0 },
      ],
    },
  },
  {
    id: 'dn_bld', type: 'default', position: { x: 380, y: 60 },
    data: {
      label: 'Старый дом', icon: 'ti-building-arch', color: 'var(--color-node-character)',
      db: ['Старый дом', 'Дом с эркером', 'Чайхана', 'Мастерская'],
      params: [
        { l: 'Этаж', type: 'range', min: 1, max: 5, v: 2, u: '' },
      ],
    },
  },
  {
    id: 'dn_furn', type: 'default', position: { x: 380, y: 160 },
    data: {
      label: 'Диван у окна', icon: 'ti-armchair', color: 'var(--color-node-util)',
      db: ['Диван у окна', 'Тахта + ковёр', 'Резной буфет', 'Тонет'],
      params: [
        { l: 'Плотность', type: 'range', min: 1, max: 10, v: 5, u: '' },
      ],
    },
  },
  {
    id: 'dn_scene', type: 'default', position: { x: 540, y: 110 },
    data: {
      label: 'Утро в Конде · 04', icon: 'ti-movie', color: 'var(--color-node-scene)',
      db: ['Утро в Конде · 04', 'Сцена 04b — форк @moct'],
      params: [
        { l: 'Темп',    type: 'sel', opts: ['спокойный', 'динамичный'], v: 0 },
        { l: 'Камера',  type: 'sel', opts: ['один кадр', 'классика', 'вид сверху', 'сбоку'], v: 1 },
        { l: 'Диалоги', type: 'sel', opts: ['есть', 'без слов'], v: 0 },
      ],
    },
  },
];

const DEMO_EDGES: Edge[] = [
  { id: 'e1', source: 'dn_char',  target: 'dn_scene', animated: true  },
  { id: 'e2', source: 'dn_cloth', target: 'dn_scene', animated: false },
  { id: 'e3', source: 'dn_art',   target: 'dn_scene', animated: false },
  { id: 'e4', source: 'dn_loc',   target: 'dn_scene', animated: true  },
  { id: 'e5', source: 'dn_bld',   target: 'dn_scene', animated: false },
  { id: 'e6', source: 'dn_furn',  target: 'dn_scene', animated: false },
];

const PR_QUEUE = [
  { id: 'pr1', title: 'Новый персонаж: Анаит', sub: 'Сона · urvakan · 2 мин. назад',    avatar: '🌸' },
  { id: 'pr2', title: 'Сцена во дворе v2',     sub: 'Арам · moct · 14 мин. назад',      avatar: '🏗' },
  { id: 'pr3', title: 'Тараз красный форк',    sub: 'Карен · rambalkoshe · 1 ч. назад', avatar: '🎨' },
];

const FACTIONS = [
  { side: 'moct',        color: 'var(--color-node-scene)',      label: 'Мост'       },
  { side: 'urvakan',     color: 'var(--color-node-higgsfield)', label: 'Урвакан'    },
  { side: 'rambalkoshe', color: 'var(--color-node-util)',       label: 'Рамбалкоше' },
];

// Local mutable state for demo node labels and params
function useNodeState() {
  const [labels, setLabels] = useState<Record<string, string>>(() =>
    Object.fromEntries(DEMO_NODES.map(n => [n.id, n.data.label]))
  );
  const [paramVals, setParamVals] = useState<Record<string, number[]>>(() =>
    Object.fromEntries(DEMO_NODES.map(n => [n.id, n.data.params.map(p => p.v)]))
  );
  const setLabel = (id: string, label: string) => setLabels(prev => ({ ...prev, [id]: label }));
  const setParam = (id: string, idx: number, v: number) =>
    setParamVals(prev => {
      const next = [...prev[id]];
      next[idx] = v;
      return { ...prev, [id]: next };
    });
  return { labels, paramVals, setLabel, setParam };
}

function PRQueue({ onMerge }: { onMerge: (title: string) => void }) {
  return (
    <div className="insp-section">
      <div className="insp-h"><i className="ti ti-git-pull-request" /> Pull Requests</div>
      {PR_QUEUE.map(pr => (
        <div key={pr.id} className="pr-item">
          <div className="pr-avatar" style={{ background: 'var(--color-bg-tertiary)' }}>{pr.avatar}</div>
          <div className="pr-info">
            <div className="pr-title">{pr.title}</div>
            <div className="pr-sub">{pr.sub}</div>
          </div>
          <button
            className="btn"
            style={{ width: 'auto', padding: '4px 10px', fontSize: 12 }}
            onClick={() => onMerge(pr.title)}
          >
            merge
          </button>
        </div>
      ))}
    </div>
  );
}

interface CanonInspectorProps {
  node: Node<DemoNodeData>;
  label: string;
  paramVals: number[];
  onLabelChange: (label: string) => void;
  onParamChange: (idx: number, v: number) => void;
  onFork: () => void;
}

function CanonInspector({ node, label, paramVals, onLabelChange, onParamChange, onFork }: CanonInspectorProps) {
  const { data } = node;
  return (
    <div className="insp-section">
      <div className="insp-h" style={{ '--nc': data.color } as React.CSSProperties}>
        <i className={`ti ${data.icon}`} /> {data.label.split(' · ')[0]}
      </div>

      {/* DB chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
        {data.db.map(opt => (
          <button
            key={opt}
            className={`chip${label === opt ? ' on' : ''}`}
            onClick={() => onLabelChange(opt)}
          >
            {label === opt && <i className="ti ti-check" />} {opt}
          </button>
        ))}
      </div>

      <div style={{ borderTop: '1px solid var(--color-border)', marginBottom: 8 }} />

      {/* Params */}
      {data.params.map((p, i) => (
        <div key={p.l} className="fld" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', minWidth: 70 }}>{p.l}</span>
          {p.type === 'sel' ? (
            <select
              value={paramVals[i]}
              onChange={e => onParamChange(i, +e.target.value)}
              style={{ flex: 1, fontSize: 12 }}
            >
              {p.opts.map((o, j) => <option key={o} value={j}>{o}</option>)}
            </select>
          ) : (
            <>
              <input
                type="range"
                min={p.min} max={p.max} step={1}
                value={paramVals[i]}
                onChange={e => onParamChange(i, +e.target.value)}
                style={{ flex: 1 }}
              />
              <output style={{ fontSize: 12, fontWeight: 500, minWidth: 36, textAlign: 'right' }}>
                {paramVals[i]}{p.u}
              </output>
            </>
          )}
        </div>
      ))}

      <button className="btn" onClick={onFork} style={{ marginTop: 8, width: '100%', justifyContent: 'center' }}>
        <i className="ti ti-git-fork" /> Сделать форк узла
      </button>
    </div>
  );
}

export function CanonView() {
  const { canonMode, setCanonMode, showToast } = useAppContext();
  const [selId, setSelId] = useState<string | null>(null);
  const { labels, paramVals, setLabel, setParam } = useNodeState();

  const nodeMap = Object.fromEntries(DEMO_NODES.map(n => [n.id, n]));
  const selNode = selId ? nodeMap[selId] : null;

  const styledNodes = DEMO_NODES.map(n => ({
    ...n,
    data: { ...n.data, label: labels[n.id] },
    style: {
      background: 'var(--color-bg-card)',
      border: `2px solid ${n.data.color}`,
      borderStyle: canonMode === 'mv' && n.data.isAlt ? 'dashed' : 'solid',
      borderRadius: 8,
      padding: '6px 12px',
      color: 'var(--color-text-primary)',
      fontSize: 13,
    },
  }));

  function handleRender() {
    const char  = labels['dn_char'];
    const cloth = labels['dn_cloth'];
    const loc   = labels['dn_loc'];
    const scene = labels['dn_scene'];
    const sceneNode = nodeMap['dn_scene'];
    const sp = sceneNode.data.params;
    const pv = paramVals['dn_scene'];
    const tempo  = (sp[0] as Extract<ParamDef, { type: 'sel' }>).opts[pv[0]];
    const cam    = (sp[1] as Extract<ParamDef, { type: 'sel' }>).opts[pv[1]];
    const dialog = (sp[2] as Extract<ParamDef, { type: 'sel' }>).opts[pv[2]];
    showToast(`Рендер «${scene}»: ${char} · ${cloth} · ${loc} · темп ${tempo} · камера ${cam} · ${dialog}`);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', overflow: 'hidden' }}>

      {/* Top toggle bar */}
      <div className="canon-bar">
        <div className="view-tabs">
          <button
            className={`view-tab${canonMode === 'canon' ? ' on' : ''}`}
            onClick={() => setCanonMode('canon')}
          >
            <i className="ti ti-git-merge" /> Канон
          </button>
          <button
            className={`view-tab${canonMode === 'mv' ? ' on' : ''}`}
            onClick={() => setCanonMode('mv')}
          >
            <i className="ti ti-git-fork" /> Мультивселенная
          </button>
        </div>

        <button className="btn pri" onClick={handleRender} style={{ marginLeft: 12, width: 'auto' }}>
          <i className="ti ti-player-play" /> Рендер сцены
        </button>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
          {FACTIONS.map(f => (
            <span
              key={f.side}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--color-text-secondary)' }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: f.color, flexShrink: 0, display: 'inline-block' }} />
              {f.label}
            </span>
          ))}
        </div>
      </div>

      {/* 3-column body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Left: Scene list */}
        <aside className="scene-sidebar" style={{
          width: 130,
          background: 'var(--color-bg-secondary)',
          borderRight: '1px solid var(--color-border)',
          overflowY: 'auto',
          padding: 8,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          flexShrink: 0,
        }}>
          {SCENES.map((sc, i) => (
            <div key={sc.id} className={`scene-card${i === 3 ? ' act' : ''}`}>
              <span className="scene-num">{sc.num}</span>
              <span className="scene-title">{sc.title}</span>
            </div>
          ))}
        </aside>

        {/* Center: Read-only narrative graph */}
        <div style={{ flex: 1, position: 'relative' }}>
          <ReactFlow
            nodes={styledNodes}
            edges={DEMO_EDGES}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={true}
            onNodeClick={(_, n) => setSelId(n.id)}
            onPaneClick={() => setSelId(null)}
            fitView
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={20} size={1} color="var(--color-border)" />
          </ReactFlow>
        </div>

        {/* Right: Inspector or PR Queue */}
        <aside className="inspector" style={{ flexShrink: 0 }}>
          {selNode ? (
            <CanonInspector
              node={selNode}
              label={labels[selNode.id]}
              paramVals={paramVals[selNode.id]}
              onLabelChange={label => setLabel(selNode.id, label)}
              onParamChange={(idx, v) => setParam(selNode.id, idx, v)}
              onFork={() => showToast(`Форк узла «${selNode.data.label}» (${labels[selNode.id]}) → pull request на канонизацию`)}
            />
          ) : (
            <PRQueue onMerge={title => showToast(`Слияние: ${title}`)} />
          )}
        </aside>

      </div>
    </div>
  );
}
