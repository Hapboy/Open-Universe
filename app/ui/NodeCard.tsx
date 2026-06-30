import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { NodeParams, PortType } from '../types.ts';
import { useAppContext } from '../store/AppContext.tsx';

function portColor(type: PortType): string {
  if (type === 'Image') return 'var(--color-node-scene)';
  if (type === 'Video') return 'var(--color-node-higgsfield)';
  if (type === 'Text')  return 'var(--color-node-pinterest)';
  return 'var(--color-text-tertiary)';
}

function nodeDisplayValue(data: NodeParams): string {
  const p = data.params;
  switch (data.nodeType) {
    case 'pinterest_board':   return (p.boardName as string) || '';
    case 'higgsfield_soul':   return (p.prompt    as string) || '';
    case 'higgsfield_camera': return (p.motionPreset as string) || '';
    case 'higgsfield_speak':  return (p.expression  as string) || '';
    case 'text_prompt':       return (p.text as string) || '';
    case 'character':         return (p.selectedItem as string) || '';
    case 'location':          return `${p.selectedItem} · ${p.timeOfDay}`;
    case 'building':          return (p.selectedItem as string) || '';
    case 'clothing':          return `${p.selectedItem} ${p.season}`;
    case 'artwork':           return (p.selectedItem as string) || '';
    case 'furniture':         return (p.selectedItem as string) || '';
    case 'music':             return (p.selectedItem as string) || '';
    case 'script':            return (p.selectedItem as string) || '';
    case 'storyboard':        return (p.selectedItem as string) || '';
    case 'transport':         return (p.selectedItem as string) || '';
    default:                  return (p.renderingEngine as string) || 'Активен';
  }
}

export const NodeCard = memo(function NodeCard({ id, data, selected }: NodeProps<NodeParams>) {
  const { updateNodeParam } = useAppContext();

  const photos = data.nodeType === 'character' ? (data.params.photos as string[]) || [] : [];
  const photoIdx = (data.params.photoIdx as number) || 0;

  return (
    <div
      className={`node${selected ? ' sel' : ''}`}
      style={{ '--nc': data.color } as React.CSSProperties}
    >
      {/* Input handles */}
      {data.inputs.map((port, i) => (
        <Handle
          key={port.id}
          type="target"
          position={Position.Left}
          id={port.id}
          style={{ top: 10 + i * 20, background: portColor(port.type) }}
          title={port.name}
        />
      ))}

      <div className="node-h">
        <i className={`ti ${data.icon}`} />
        <span>{data.label}</span>
      </div>
      <div className="node-body">
        <div className="node-title-val">{nodeDisplayValue(data)}</div>
      </div>

      {photos.length > 0 && (
        <div className="node-photo-slider">
          <img src={photos[photoIdx]} alt="" className="node-photo-img" />
          {photos.length > 1 && (
            <>
              <button
                className="node-photo-nav prev"
                onMouseDown={e => e.stopPropagation()}
                onClick={e => { e.stopPropagation(); updateNodeParam(id, 'photoIdx', (photoIdx - 1 + photos.length) % photos.length); }}
              >
                <i className="ti ti-chevron-left" />
              </button>
              <button
                className="node-photo-nav next"
                onMouseDown={e => e.stopPropagation()}
                onClick={e => { e.stopPropagation(); updateNodeParam(id, 'photoIdx', (photoIdx + 1) % photos.length); }}
              >
                <i className="ti ti-chevron-right" />
              </button>
              <span className="node-photo-count">{photoIdx + 1}/{photos.length}</span>
            </>
          )}
          <button
            className="node-photo-del"
            onMouseDown={e => e.stopPropagation()}
            onClick={e => {
              e.stopPropagation();
              const next = photos.filter((_, i) => i !== photoIdx);
              updateNodeParam(id, 'photos', next);
              updateNodeParam(id, 'photoIdx', Math.max(0, Math.min(photoIdx, next.length - 1)));
            }}
          >
            <i className="ti ti-trash" />
          </button>
        </div>
      )}

      {/* Output handles */}
      {data.outputs.map((port, i) => (
        <Handle
          key={port.id}
          type="source"
          position={Position.Right}
          id={port.id}
          style={{ top: 10 + i * 20, background: portColor(port.type) }}
          title={port.name}
        />
      ))}
    </div>
  );
});
