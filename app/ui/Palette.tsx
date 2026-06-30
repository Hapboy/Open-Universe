import { NODE_TEMPLATES, PALETTE_GROUPS } from '../data/nodes.ts';

export function Palette() {
  const handleDragStart = (e: React.DragEvent, type: string) => {
    e.dataTransfer.setData('node-template-type', type);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside className="palette" id="palette">
      {PALETTE_GROUPS.map(group => (
        <div key={group.label} className="palette-section">
          <div className="palette-h">{group.label}</div>
          {group.types.map(type => {
            const t = NODE_TEMPLATES[type];
            if (!t) return null;
            return (
              <div
                key={type}
                className="palette-item"
                draggable
                onDragStart={e => handleDragStart(e, type)}
                style={{ '--nc': t.color } as React.CSSProperties}
              >
                <i className={`ti ${t.icon}`} />
                <span>{t.label}</span>
              </div>
            );
          })}
        </div>
      ))}
    </aside>
  );
}
