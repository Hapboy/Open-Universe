import { memo } from 'react'
import cn from 'classnames'
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import type { NodeParams, PortType } from '../../types.ts'
import { AI_MODEL_NODE_TYPES } from '../../data/nodes.ts'
import { useGraphContext } from '../../store/contexts/GraphContext.tsx'
import { CircleLoader } from '../CircleLoader/CircleLoader.tsx'
import { MediaSlider } from './MediaSlider/MediaSlider.tsx'
import styles from './NodeCard.module.css'

function portColor(type: PortType): string {
  if (type === 'Image') return 'var(--color-node-scene)'
  if (type === 'Video') return 'var(--color-node-higgsfield)'
  if (type === 'Text') return 'var(--color-node-pinterest)'
  return 'var(--color-text-tertiary)'
}

function nodeDisplayValue(data: NodeParams, generatedText?: string): string {
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
    case 'location': {
      const typeStr = (p.interiorExterior as string) || 'Экстерьер'
      const dmg = p.damageLevel !== undefined ? ` · ${p.damageLevel}%` : ''
      return `${p.selectedItem} (${typeStr})${dmg}`
    }
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
    case 'gemini_text':
    case 'gemini_vision':
      return generatedText || ''
    default:
      return (p.renderingEngine as string) || ''
  }
}

export const NodeCard = memo(function NodeCard({
  id,
  data,
  selected,
}: NodeProps<Node<NodeParams>>) {
  const { updateNodeParam, runNode, runningNodeIds, resolved } = useGraphContext()

  const photos = data.nodeType === 'character' ? (data.params.photos as string[]) || [] : []
  const photoIdx = (data.params.photoIdx as number) || 0
  const isAiModel = AI_MODEL_NODE_TYPES.includes(data.nodeType)
  const isRunning = runningNodeIds.has(id)
  const outputId = data.outputs[0]?.id
  const generatedText =
    (data.nodeType === 'gemini_text' || data.nodeType === 'gemini_vision') && outputId
      ? (resolved[outputId] as string | undefined)
      : undefined
  const generatedImage =
    (data.nodeType === 'gemini_imagen' || data.nodeType === 'gemini_nanobanana') && outputId
      ? (resolved[outputId] as string | undefined)
      : undefined
  const generatedVideo =
    data.nodeType === 'gemini_veo' && outputId
      ? (resolved[outputId] as string | undefined)
      : undefined
  const generatedAudio =
    data.nodeType === 'gemini_lyria' && outputId
      ? (resolved[outputId] as string | undefined)
      : undefined

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
            {isRunning ? (
              <CircleLoader className={styles.runBtnLoader} />
            ) : (
              <i className="ti ti-player-play" />
            )}
          </button>
        )}
      </div>
      <div className={styles.body}>
        <div
          className={cn(
            styles.titleVal,
            generatedText && [styles.titleValFull, 'nodrag', 'nowheel']
          )}
        >
          {nodeDisplayValue(data, generatedText)}
        </div>
      </div>

      {generatedImage && <MediaSlider items={[{ url: generatedImage, type: 'image' }]} />}

      {generatedVideo && <MediaSlider items={[{ url: generatedVideo, type: 'video' }]} />}

      {generatedAudio && (
        <audio
          src={generatedAudio}
          controls
          className={cn(styles.audioPlayer, 'nodrag', 'nowheel')}
        />
      )}

      {photos.length > 0 && (
        <MediaSlider
          items={photos.map((url) => ({ url, type: 'image' }))}
          index={photoIdx}
          onIndexChange={(i) => updateNodeParam(id, 'photoIdx', i)}
          onDelete={(i) => {
            const next = photos.filter((_, idx) => idx !== i)
            updateNodeParam(id, 'photos', next)
            updateNodeParam(id, 'photoIdx', Math.max(0, Math.min(photoIdx, next.length - 1)))
          }}
        />
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
