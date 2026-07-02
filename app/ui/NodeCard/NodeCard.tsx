import { memo } from 'react'
import cn from 'classnames'
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import type { NodeParams, PortType } from '../../types.ts'
import { AI_MODEL_NODE_TYPES } from '../../data/nodes.ts'
import { useGraphContext } from '../../store/contexts/GraphContext.tsx'
import styles from './NodeCard.module.css'

function portColor(type: PortType): string {
  if (type === 'Image') return 'var(--color-node-scene)'
  if (type === 'Video') return 'var(--color-node-higgsfield)'
  if (type === 'Text') return 'var(--color-node-pinterest)'
  return 'var(--color-text-tertiary)'
}

function nodeDisplayValue(data: NodeParams): string {
  const p = data.params
  switch (data.nodeType) {
    case 'pinterest_board':
      return (p.boardName as string) || ''
    case 'higgsfield_soul':
      return (p.prompt as string) || ''
    case 'higgsfield_camera':
      return (p.motionPreset as string) || ''
    case 'higgsfield_speak':
      return (p.expression as string) || ''
    case 'text_prompt':
      return (p.text as string) || ''
    case 'character':
      return (p.selectedItem as string) || ''
    case 'location':
      return `${p.selectedItem} · ${p.timeOfDay}`
    case 'building':
      return (p.selectedItem as string) || ''
    case 'clothing':
      return `${p.selectedItem} ${p.season}`
    case 'artwork':
      return (p.selectedItem as string) || ''
    case 'furniture':
      return (p.selectedItem as string) || ''
    case 'music':
      return (p.selectedItem as string) || ''
    case 'script':
      return (p.selectedItem as string) || ''
    case 'storyboard':
      return (p.selectedItem as string) || ''
    case 'transport':
      return (p.selectedItem as string) || ''
    default:
      return (p.renderingEngine as string) || 'Активен'
  }
}

export const NodeCard = memo(function NodeCard({
  id,
  data,
  selected,
}: NodeProps<Node<NodeParams>>) {
  const { updateNodeParam, runNode, runningNodeIds } = useGraphContext()

  const photos = data.nodeType === 'character' ? (data.params.photos as string[]) || [] : []
  const photoIdx = (data.params.photoIdx as number) || 0
  const isAiModel = AI_MODEL_NODE_TYPES.includes(data.nodeType)
  const isRunning = runningNodeIds.has(id)

  return (
    <div
      className={cn(styles.card, selected && styles.isSelected)}
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
          title={`${port.name} (${port.type === 'any' ? 'любой тип' : port.type})`}
        />
      ))}

      <div className={styles.header}>
        <i className={`ti ${data.icon}`} />
        <span>{data.label}</span>
        {isAiModel && (
          <button
            className={styles.runBtn}
            onMouseDown={(e) => e.stopPropagation()}
            disabled={isRunning}
            title="Запустить генерацию"
            onClick={(e) => {
              e.stopPropagation()
              void runNode(id)
            }}
          >
            <i
              className={cn(
                'ti',
                isRunning ? 'ti-loader-2' : 'ti-player-play',
                isRunning && styles.spin
              )}
            />
          </button>
        )}
      </div>
      <div className={styles.body}>
        <div className={styles.titleVal}>{nodeDisplayValue(data)}</div>
      </div>

      {photos.length > 0 && (
        <div className={styles.photoSlider}>
          <img src={photos[photoIdx]} alt="" className={styles.photoImg} />
          {photos.length > 1 && (
            <>
              <button
                className={cn(styles.photoNav, styles.prev)}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation()
                  updateNodeParam(id, 'photoIdx', (photoIdx - 1 + photos.length) % photos.length)
                }}
              >
                <i className="ti ti-chevron-left" />
              </button>
              <button
                className={cn(styles.photoNav, styles.next)}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation()
                  updateNodeParam(id, 'photoIdx', (photoIdx + 1) % photos.length)
                }}
              >
                <i className="ti ti-chevron-right" />
              </button>
              <span className={styles.photoCount}>
                {photoIdx + 1}/{photos.length}
              </span>
            </>
          )}
          <button
            className={styles.photoDel}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              const next = photos.filter((_, i) => i !== photoIdx)
              updateNodeParam(id, 'photos', next)
              updateNodeParam(id, 'photoIdx', Math.max(0, Math.min(photoIdx, next.length - 1)))
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
          title={`${port.name} (${port.type === 'any' ? 'любой тип' : port.type})`}
        />
      ))}
    </div>
  )
})
