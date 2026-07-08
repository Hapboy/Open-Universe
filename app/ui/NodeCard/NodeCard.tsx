import { memo, useState } from 'react'
import cn from 'classnames'
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import type { NodeParams, PortType } from '../../types.ts'
import { AI_MODEL_NODE_TYPES } from '../../data/nodes.ts'
import { useGraphContext } from '../../store/contexts/GraphContext.tsx'
import { CircleLoader } from '../components/CircleLoader/CircleLoader.tsx'
import { MediaSlider } from './MediaSlider/MediaSlider.tsx'
import { NodeParamsPanel } from './params/NodeParamsPanel.tsx'
import { NodeMenu } from './NodeMenu/NodeMenu.tsx'
import styles from './NodeCard.module.css'

function portColor(type: PortType): string {
  if (type === 'Image') return 'var(--color-node-scene)'
  if (type === 'Video') return 'var(--color-node-higgsfield)'
  if (type === 'Text') return 'var(--color-node-pinterest)'
  return 'var(--color-text-tertiary)'
}

export const NodeCard = memo(function NodeCard({
  id,
  data,
  selected,
}: NodeProps<Node<NodeParams>>) {
  const {
    edges,
    resolved,
    scenes,
    updateNodeParam,
    updateNodeParams,
    loadPinterestBoards,
    loadPinterestPins,
    executeGraph,
    runNode,
    runningNodeIds,
    duplicateNode,
    deleteNode,
    renameNode,
    selectNode,
  } = useGraphContext()

  const [editingLabel, setEditingLabel] = useState(false)

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
        {editingLabel ? (
          <input
            type="text"
            autoFocus
            defaultValue={data.label}
            onBlur={(e) => {
              renameNode(id, e.target.value)
              setEditingLabel(false)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur()
              if (e.key === 'Escape') setEditingLabel(false)
            }}
            className={cn(styles.labelInput, 'nodrag')}
          />
        ) : (
          <span onDoubleClick={() => setEditingLabel(true)} title="Двойной клик — переименовать">
            {data.label}
          </span>
        )}
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
        <NodeMenu
          onDuplicate={() => duplicateNode(id)}
          onDelete={() => {
            deleteNode(id)
            selectNode(null)
          }}
        />
      </div>

      {generatedText && (
        <div className={styles.body}>
          <div className={cn(styles.titleVal, styles.titleValFull, 'nodrag', 'nowheel')}>
            {generatedText}
          </div>
        </div>
      )}

      <div className={cn(styles.paramsWrap, 'nodrag', 'nowheel')}>
        <NodeParamsPanel
          node={{ id, data }}
          edges={edges}
          resolved={resolved}
          scenes={scenes}
          updateNodeParam={updateNodeParam}
          updateNodeParams={updateNodeParams}
          loadPinterestBoards={loadPinterestBoards}
          loadPinterestPins={loadPinterestPins}
          executeGraph={executeGraph}
        />
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
