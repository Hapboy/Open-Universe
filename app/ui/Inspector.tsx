import { useEffect, useRef } from 'react';
import { useAppContext } from '../store/AppContext.tsx';
import { HIGGSFIELD_PRESETS } from '../data/presets.ts';
import { MiniPlayer } from './PlayerPanel.tsx';
import type { Node } from '@xyflow/react';
import type { NodeParams, PinItem, BoardItem } from '../types.ts';

export function Inspector() {
  const { nodes, selectedNodeId, selectNode, deleteNode, updateNodeParam,
          loadPinterestBoards, loadPinterestPins, executeGraph, showToast } = useAppContext();

  const node = nodes.find(n => n.id === selectedNodeId) ?? null;

  if (!node) {
    return (
      <aside className="inspector" id="inspector">
        <div className="insp-empty">Выбери ноду на холсте, чтобы настроить её свойства и API параметры.</div>
        <MiniPlayer />
      </aside>
    );
  }

  return (
    <aside className="inspector" id="inspector">
      <NodeHeader node={node} onDelete={() => { deleteNode(node.id); selectNode(null); }} />
      <NodeParams
        node={node}
        updateNodeParam={updateNodeParam}
        loadPinterestBoards={loadPinterestBoards}
        loadPinterestPins={loadPinterestPins}
        executeGraph={executeGraph}
        showToast={showToast}
      />
      <MiniPlayer />
    </aside>
  );
}

function NodeHeader({ node, onDelete }: { node: Node<NodeParams>; onDelete: () => void }) {
  const { updateNodeParam } = useAppContext();
  return (
    <div className="insp-section">
      <div className="insp-h" style={{ '--nc': node.data.color } as React.CSSProperties}>
        <i className={`ti ${node.data.icon}`} />
        <span>Свойства: {node.data.label}</span>
      </div>
      <div className="fld">
        <span>Имя ноды</span>
        <input
          type="text"
          defaultValue={node.data.label}
          onChange={e => updateNodeParam(node.id, 'label', e.target.value)}
        />
      </div>
      <button
        className="btn"
        onClick={onDelete}
        style={{ color: 'var(--color-text-danger)', borderColor: 'var(--color-text-danger)', marginTop: 6 }}
      >
        <i className="ti ti-trash" /> Удалить ноду
      </button>
    </div>
  );
}

interface NodeParamsProps {
  node: Node<NodeParams>;
  updateNodeParam: (id: string, key: string, value: unknown) => void;
  loadPinterestBoards: (node: Node<NodeParams>) => Promise<void>;
  loadPinterestPins: (node: Node<NodeParams>, boardId: string) => Promise<void>;
  executeGraph: () => Promise<void>;
  showToast: (msg: string) => void;
}

function NodeParams({ node, updateNodeParam, loadPinterestBoards, loadPinterestPins, executeGraph }: NodeParamsProps) {
  const { nodeType, params } = node.data;
  const loadedRef = useRef(false);

  useEffect(() => {
    if (nodeType === 'pinterest_board' && !loadedRef.current) {
      loadedRef.current = true;
      void loadPinterestBoards(node);
    }
  }, [node.id]);

  return (
    <div className="insp-section">
      <h5>Параметры ноды</h5>
      <br />
      {nodeType === 'pinterest_board' && (
        <PinterestParams
          node={node}
          params={params}
          updateNodeParam={updateNodeParam}
          loadPinterestPins={loadPinterestPins}
          executeGraph={executeGraph}
        />
      )}
      {nodeType === 'higgsfield_soul' && (
        <SoulParams node={node} params={params} updateNodeParam={updateNodeParam} executeGraph={executeGraph} />
      )}
      {nodeType === 'higgsfield_camera' && (
        <CameraParams node={node} params={params} updateNodeParam={updateNodeParam} executeGraph={executeGraph} />
      )}
      {nodeType === 'higgsfield_speak' && (
        <SpeakParams node={node} params={params} updateNodeParam={updateNodeParam} executeGraph={executeGraph} />
      )}
      {nodeType === 'output_scene' && (
        <OutputParams node={node} params={params} updateNodeParam={updateNodeParam} executeGraph={executeGraph} />
      )}
      {nodeType === 'text_prompt' && (
        <TextParams node={node} params={params} updateNodeParam={updateNodeParam} executeGraph={executeGraph} />
      )}
      {nodeType === 'character' && (
        <CharacterParams node={node} params={params} updateNodeParam={updateNodeParam} />
      )}
      {nodeType === 'location' && (
        <LocationParams node={node} params={params} updateNodeParam={updateNodeParam} />
      )}
      {nodeType === 'building' && (
        <BuildingParams node={node} params={params} updateNodeParam={updateNodeParam} />
      )}
      {nodeType === 'clothing' && (
        <ClothingParams node={node} params={params} updateNodeParam={updateNodeParam} />
      )}
      {nodeType === 'artwork' && (
        <ArtworkParams node={node} params={params} updateNodeParam={updateNodeParam} />
      )}
      {nodeType === 'furniture' && (
        <FurnitureParams node={node} params={params} updateNodeParam={updateNodeParam} />
      )}
      {nodeType === 'music' && (
        <MusicParams node={node} params={params} updateNodeParam={updateNodeParam} />
      )}
      {nodeType === 'script' && (
        <ScriptParams node={node} params={params} updateNodeParam={updateNodeParam} />
      )}
      {nodeType === 'storyboard' && (
        <StoryboardParams node={node} params={params} updateNodeParam={updateNodeParam} />
      )}
      {nodeType === 'transport' && (
        <TransportParams node={node} params={params} updateNodeParam={updateNodeParam} />
      )}
    </div>
  );
}

function PinterestParams({ node, params, updateNodeParam, loadPinterestPins, executeGraph }:
  { node: Node<NodeParams>; params: Record<string, unknown>; updateNodeParam: NodeParamsProps['updateNodeParam'];
    loadPinterestPins: NodeParamsProps['loadPinterestPins']; executeGraph: NodeParamsProps['executeGraph'] }) {
  const boards = (params.boards as BoardItem[]) || [];
  const pins   = (params.pins   as PinItem[])   || [];

  const handleBoardChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    const name = e.target.options[e.target.selectedIndex].text;
    updateNodeParam(node.id, 'boardId',   id);
    updateNodeParam(node.id, 'boardName', name);
    await loadPinterestPins(node, id);
  };

  return (
    <>
      <div className="fld">
        <span>Pinterest Доска</span>
        <select value={(params.boardId as string) || ''} onChange={handleBoardChange}>
          {boards.length === 0
            ? <option value="">Сначала введите API Pinterest в настройках...</option>
            : boards.map(b => <option key={b.id} value={b.id}>{b.name}</option>)
          }
        </select>
      </div>
      <div className="fld">
        <span>Выберите изображение (Pin)</span>
        <div className="pinterest-pins-grid">
          {pins.map(p => (
            <div
              key={p.id}
              className={`pinterest-pin-item${params.selectedPin === p.image ? ' sel' : ''}`}
              style={{ backgroundImage: `url('${p.image}')` }}
              title={p.title}
              onClick={() => { updateNodeParam(node.id, 'selectedPin', p.image); void executeGraph(); }}
            />
          ))}
        </div>
      </div>
    </>
  );
}

function SoulParams({ node, params, updateNodeParam, executeGraph }:
  { node: Node<NodeParams>; params: Record<string, unknown>; updateNodeParam: NodeParamsProps['updateNodeParam']; executeGraph: NodeParamsProps['executeGraph'] }) {
  return (
    <>
      <div className="fld">
        <span>Промпт стилизации</span>
        <input
          type="text"
          defaultValue={params.prompt as string}
          onBlur={e => { updateNodeParam(node.id, 'prompt', e.target.value); void executeGraph(); }}
        />
      </div>
      <div className="fld">
        <span>Влияние лица (Face Weight)</span>
        <input
          type="range" min="0" max="1" step="0.1"
          defaultValue={params.faceWeight as number}
          onChange={e => updateNodeParam(node.id, 'faceWeight', parseFloat(e.target.value))}
        />
      </div>
    </>
  );
}

function CameraParams({ node, params, updateNodeParam, executeGraph }:
  { node: Node<NodeParams>; params: Record<string, unknown>; updateNodeParam: NodeParamsProps['updateNodeParam']; executeGraph: NodeParamsProps['executeGraph'] }) {
  return (
    <div className="fld">
      <span>Движение камеры (Пресет)</span>
      <select
        value={params.motionPreset as string}
        onChange={e => { updateNodeParam(node.id, 'motionPreset', e.target.value); void executeGraph(); }}
      >
        {HIGGSFIELD_PRESETS.map(p => <option key={p} value={p}>{p}</option>)}
      </select>
    </div>
  );
}

function SpeakParams({ node, params, updateNodeParam, executeGraph }:
  { node: Node<NodeParams>; params: Record<string, unknown>; updateNodeParam: NodeParamsProps['updateNodeParam']; executeGraph: NodeParamsProps['executeGraph'] }) {
  return (
    <div className="fld">
      <span>Мимика / Липсинк Текст</span>
      <input
        type="text"
        defaultValue={params.expression as string}
        onBlur={e => { updateNodeParam(node.id, 'expression', e.target.value); void executeGraph(); }}
      />
    </div>
  );
}

function OutputParams({ node, params, updateNodeParam, executeGraph }:
  { node: Node<NodeParams>; params: Record<string, unknown>; updateNodeParam: NodeParamsProps['updateNodeParam']; executeGraph: NodeParamsProps['executeGraph'] }) {
  const ENGINES = ['Hayverse Realtime Veo 3', 'Hayverse Draft', 'Hayverse Cinema 4K'];
  return (
    <>
      <div className="fld">
        <span>Рендер-движок</span>
        <select
          value={params.renderingEngine as string}
          onChange={e => { updateNodeParam(node.id, 'renderingEngine', e.target.value); void executeGraph(); }}
        >
          {ENGINES.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
      </div>
    </>
  );
}

function TextParams({ node, params, updateNodeParam, executeGraph }:
  { node: Node<NodeParams>; params: Record<string, unknown>; updateNodeParam: NodeParamsProps['updateNodeParam']; executeGraph: NodeParamsProps['executeGraph'] }) {
  return (
    <div className="fld">
      <span>Текстовое значение</span>
      <input
        type="text"
        defaultValue={params.text as string}
        onBlur={e => { updateNodeParam(node.id, 'text', e.target.value); void executeGraph(); }}
      />
    </div>
  );
}

/* ─── Reusable entity UI helpers ───────────────────────── */

function DatabaseChips({ label, items, selected, onSelect }: {
  label: string;
  items: string[];
  selected: string;
  onSelect: (v: string) => void;
}) {
  return (
    <div className="fld">
      <span>{label}</span>
      <div className="chip-group">
        {items.map(item => (
          <button
            key={item}
            className={`chip${selected === item ? ' on' : ''}`}
            onClick={() => onSelect(item)}
          >
            {selected === item && <i className="ti ti-check" style={{ fontSize: 11 }} />} {item}
          </button>
        ))}
      </div>
    </div>
  );
}

function InFrameToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="fld" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ minWidth: 60, margin: 0 }}>в кадре</span>
      <div className="seg-btn" style={{ width: 'auto' }}>
        <button className={value ? 'on' : ''}  onClick={() => onChange(true)}>да</button>
        <button className={!value ? 'on' : ''} onClick={() => onChange(false)}>нет</button>
      </div>
    </div>
  );
}

type EP = { node: Node<NodeParams>; params: Record<string, unknown>; updateNodeParam: NodeParamsProps['updateNodeParam'] };

function CharacterParams({ node, params, updateNodeParam }: EP) {
  const db = params._db as string[];
  const photos = (params.photos as string[]) || [];
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    Promise.all(
      files.map(file => new Promise<string>(resolve => {
        const reader = new FileReader();
        reader.onload = ev => resolve(ev.target!.result as string);
        reader.readAsDataURL(file);
      }))
    ).then(newPhotos => {
      const next = [...photos, ...newPhotos];
      updateNodeParam(node.id, 'photos', next);
      updateNodeParam(node.id, 'photoIdx', next.length - 1);
    });
    e.target.value = '';
  };

  return (
    <>
      <DatabaseChips label="Персонаж" items={db} selected={params.selectedItem as string}
        onSelect={v => updateNodeParam(node.id, 'selectedItem', v)} />
      <div className="fld">
        <span>Возраст ({params.age})</span>
        <input type="range" min="10" max="90" step="1" defaultValue={params.age as number}
          onChange={e => updateNodeParam(node.id, 'age', parseInt(e.target.value))} />
      </div>
      <div className="fld">
        <span>Эмоция</span>
        <select value={params.emotion as string}
          onChange={e => updateNodeParam(node.id, 'emotion', e.target.value)}>
          {['спокойствие', 'грусть', 'радость', 'тревога', 'задумчивость'].map(v =>
            <option key={v} value={v}>{v}</option>)}
        </select>
      </div>
      <div className="fld">
        <span>Стилист</span>
        <select value={params.stylist as string}
          onChange={e => updateNodeParam(node.id, 'stylist', e.target.value)}>
          {['Без стилиста', 'Tigran Avetisyan', 'Anna K', 'Народный'].map(v =>
            <option key={v} value={v}>{v}</option>)}
        </select>
      </div>
      <InFrameToggle value={params.inFrame as boolean}
        onChange={v => updateNodeParam(node.id, 'inFrame', v)} />

      <div className="fld">
        <span>Фото персонажа ({photos.length})</span>
        <div className="char-photo-actions">
          <input ref={fileInputRef} type="file" accept="image/*" multiple
            style={{ display: 'none' }} onChange={handleUpload} />
          <button className="btn" onClick={() => fileInputRef.current?.click()}>
            <i className="ti ti-upload" /> Загрузить
          </button>
        </div>
        <input
          type="text"
          placeholder="Pinterest board URL"
          defaultValue={(params.pinterestUrl as string) || ''}
          onBlur={e => updateNodeParam(node.id, 'pinterestUrl', e.target.value)}
          style={{ marginTop: 4 }}
        />
      </div>
    </>
  );
}

function LocationParams({ node, params, updateNodeParam }: EP) {
  const db = params._db as string[];
  return (
    <>
      <DatabaseChips label="Локация" items={db} selected={params.selectedItem as string}
        onSelect={v => updateNodeParam(node.id, 'selectedItem', v)} />
      <div className="fld">
        <span>Погода</span>
        <select value={params.weather as string}
          onChange={e => updateNodeParam(node.id, 'weather', e.target.value)}>
          {['туман', 'солнце', 'дождь', 'снег', 'пасмурно'].map(v =>
            <option key={v} value={v}>{v}</option>)}
        </select>
      </div>
      <div className="fld">
        <span>Время суток</span>
        <select value={params.timeOfDay as string}
          onChange={e => updateNodeParam(node.id, 'timeOfDay', e.target.value)}>
          {['рассвет', 'утро', 'день', 'закат', 'ночь'].map(v =>
            <option key={v} value={v}>{v}</option>)}
        </select>
      </div>
    </>
  );
}

function BuildingParams({ node, params, updateNodeParam }: EP) {
  const db = params._db as string[];
  return (
    <>
      <DatabaseChips label="Здание" items={db} selected={params.selectedItem as string}
        onSelect={v => updateNodeParam(node.id, 'selectedItem', v)} />
      <div className="fld">
        <span>Этаж ({params.floor})</span>
        <input type="range" min="1" max="10" step="1" defaultValue={params.floor as number}
          onChange={e => updateNodeParam(node.id, 'floor', parseInt(e.target.value))} />
      </div>
      <InFrameToggle value={params.inFrame as boolean}
        onChange={v => updateNodeParam(node.id, 'inFrame', v)} />
    </>
  );
}

function ClothingParams({ node, params, updateNodeParam }: EP) {
  const db = params._db as string[];
  return (
    <>
      <DatabaseChips label="Дизайнер" items={db} selected={params.selectedItem as string}
        onSelect={v => updateNodeParam(node.id, 'selectedItem', v)} />
      <div className="fld">
        <span>Сезон</span>
        <select value={params.season as string}
          onChange={e => updateNodeParam(node.id, 'season', e.target.value)}>
          {['FW26', 'SS26', 'FW25', 'SS25'].map(v =>
            <option key={v} value={v}>{v}</option>)}
        </select>
      </div>
      <div className="fld">
        <span>Износ ({params.wear}%)</span>
        <input type="range" min="0" max="100" step="1" defaultValue={params.wear as number}
          onChange={e => updateNodeParam(node.id, 'wear', parseInt(e.target.value))} />
      </div>
    </>
  );
}

function ArtworkParams({ node, params, updateNodeParam }: EP) {
  const db = params._db as string[];
  return (
    <>
      <DatabaseChips label="Произведение" items={db} selected={params.selectedItem as string}
        onSelect={v => updateNodeParam(node.id, 'selectedItem', v)} />
      <div className="fld">
        <span>Масштаб ({params.scale}%)</span>
        <input type="range" min="20" max="300" step="10" defaultValue={params.scale as number}
          onChange={e => updateNodeParam(node.id, 'scale', parseInt(e.target.value))} />
      </div>
      <InFrameToggle value={params.inFrame as boolean}
        onChange={v => updateNodeParam(node.id, 'inFrame', v)} />
    </>
  );
}

function FurnitureParams({ node, params, updateNodeParam }: EP) {
  const db = params._db as string[];
  return (
    <>
      <DatabaseChips label="Мебель" items={db} selected={params.selectedItem as string}
        onSelect={v => updateNodeParam(node.id, 'selectedItem', v)} />
      <div className="fld">
        <span>Плотность ({params.density})</span>
        <input type="range" min="1" max="10" step="1" defaultValue={params.density as number}
          onChange={e => updateNodeParam(node.id, 'density', parseInt(e.target.value))} />
      </div>
      <InFrameToggle value={params.inFrame as boolean}
        onChange={v => updateNodeParam(node.id, 'inFrame', v)} />
    </>
  );
}

function MusicParams({ node, params, updateNodeParam }: EP) {
  const db = params._db as string[];
  return (
    <>
      <DatabaseChips label="Трек" items={db} selected={params.selectedItem as string}
        onSelect={v => updateNodeParam(node.id, 'selectedItem', v)} />
      <div className="fld">
        <span>Настроение</span>
        <select value={params.mood as string}
          onChange={e => updateNodeParam(node.id, 'mood', e.target.value)}>
          {['элегия', 'торжество', 'тоска', 'медитация', 'танец'].map(v =>
            <option key={v} value={v}>{v}</option>)}
        </select>
      </div>
    </>
  );
}

function ScriptParams({ node, params, updateNodeParam }: EP) {
  const db = params._db as string[];
  return (
    <>
      <DatabaseChips label="Сцена" items={db} selected={params.selectedItem as string}
        onSelect={v => updateNodeParam(node.id, 'selectedItem', v)} />
      <div className="fld">
        <span>Тон</span>
        <select value={params.tone as string}
          onChange={e => updateNodeParam(node.id, 'tone', e.target.value)}>
          {['драма', 'комедия', 'лирика', 'хоррор', 'документ'].map(v =>
            <option key={v} value={v}>{v}</option>)}
        </select>
      </div>
    </>
  );
}

function StoryboardParams({ node, params, updateNodeParam }: EP) {
  const db = params._db as string[];
  return (
    <>
      <DatabaseChips label="Версия" items={db} selected={params.selectedItem as string}
        onSelect={v => updateNodeParam(node.id, 'selectedItem', v)} />
      <div className="fld">
        <span>Кадров ({params.shots})</span>
        <input type="range" min="1" max="12" step="1" defaultValue={params.shots as number}
          onChange={e => updateNodeParam(node.id, 'shots', parseInt(e.target.value))} />
      </div>
    </>
  );
}

function TransportParams({ node, params, updateNodeParam }: EP) {
  const db = params._db as string[];
  return (
    <>
      <DatabaseChips label="Транспорт" items={db} selected={params.selectedItem as string}
        onSelect={v => updateNodeParam(node.id, 'selectedItem', v)} />
      <InFrameToggle value={params.inFrame as boolean}
        onChange={v => updateNodeParam(node.id, 'inFrame', v)} />
    </>
  );
}
