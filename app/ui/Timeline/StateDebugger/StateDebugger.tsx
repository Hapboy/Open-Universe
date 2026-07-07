import { useMemo } from 'react'
import { useGraphContext } from '../../../store/contexts/GraphContext.tsx'
import type { TimelineScene } from '../../../data/scenes.ts'
import { formatTime } from '../timelineUtils.ts'
import styles from '../Timeline.module.css'

interface StateDebuggerProps {
  isOpen: boolean
  onClose: () => void
  scenes: TimelineScene[]
  activeSceneId: string
  currentTime: number
  currentBranch: string
}

export function StateDebugger({
  isOpen,
  onClose,
  scenes,
  activeSceneId,
  currentTime,
  currentBranch,
}: StateDebuggerProps) {
  const { nodes } = useGraphContext()

  // Only recomputed when the panel is open and one of its actual inputs
  // changes — previously this JSON.stringify ran on every render, including
  // every playback animation frame, whether or not the panel was visible.
  const stateJSON = useMemo(() => {
    if (!isOpen) return ''
    const activeScene = scenes.find((s) => s.id === activeSceneId) || scenes[0]
    const charNode = nodes.find((n) => n.data.nodeType === 'character')
    const locNode = nodes.find((n) => n.data.nodeType === 'location')
    const outNode = nodes.find((n) => n.data.nodeType === 'output_scene')
    const musicNode = nodes.find((n) => n.data.nodeType === 'gemini_lyria')

    const state = {
      activeScene: `${activeScene.num} · ${activeScene.title}`,
      timestamp: formatTime(currentTime),
      branch: currentBranch,
      montageEngine: outNode?.data.params.renderingEngine || 'Hayverse Realtime Veo 3',
      universeState: {
        character: charNode
          ? {
              name: charNode.data.params.selectedItem || 'Не выбрано',
              age: charNode.data.params.age || 0,
              emotion: charNode.data.params.emotion || '—',
              stylist: charNode.data.params.stylist || '—',
              position: charNode.data.params.currentPosition || {},
            }
          : null,
        location: locNode
          ? {
              name: locNode.data.params.selectedItem || 'Не выбрано',
              weather: locNode.data.params.weather || '—',
              timeOfDay: locNode.data.params.timeOfDay || '—',
              environment: locNode.data.params.interiorExterior || 'Экстерьер',
              damage: `${locNode.data.params.damageLevel ?? 0}%`,
            }
          : null,
        audioTrack: musicNode
          ? {
              preset: musicNode.data.params.selectedItem || 'Нет музыки',
              mood: musicNode.data.params.mood || '—',
            }
          : null,
      },
    }
    return JSON.stringify(state, null, 2)
  }, [isOpen, nodes, scenes, activeSceneId, currentTime, currentBranch])

  if (!isOpen) return null

  return (
    <div className={styles.stateDebugger}>
      <div className={styles.debuggerHeader}>
        <span>
          <i className="ti ti-code" /> Запрос к Лор-Базе (JSON-State):
        </span>
        <button className={styles.closeBtn} onClick={onClose}>
          <i className="ti ti-x" />
        </button>
      </div>
      <pre className={styles.debuggerPre}>{stateJSON}</pre>
    </div>
  )
}
