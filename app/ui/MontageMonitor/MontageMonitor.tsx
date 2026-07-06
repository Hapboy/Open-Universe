import React, { useState, useRef } from 'react'
import { useGraphContext } from '../../store/contexts/GraphContext.tsx'
import { DEFAULT_SCENES } from '../../data/scenes.ts'
import styles from './MontageMonitor.module.css'

export function MontageMonitor() {
  const { nodes, resolved, activeSceneId, showMontageMonitor, setShowMontageMonitor } =
    useGraphContext()

  const [position, setPosition] = useState({ x: window.innerWidth - 460, y: 80 })
  const [size] = useState({ width: 420, height: 280 })
  const dragRef = useRef({ isDragging: false, startX: 0, startY: 0, startPos: { x: 0, y: 0 } })

  const monitorRef = useRef<HTMLDivElement>(null)

  const activeScene = DEFAULT_SCENES.find((s) => s.id === activeSceneId) || DEFAULT_SCENES[0]

  // Find generated image/video outputs from nodes in the active graph
  const getMontageMedia = () => {
    // Look for any gemini image/video node resolved outputs
    const imagenNode = nodes.find(
      (n) => n.data.nodeType === 'gemini_imagen' || n.data.nodeType === 'gemini_nanobanana'
    )
    const veoNode = nodes.find((n) => n.data.nodeType === 'gemini_veo')

    if (veoNode) {
      const outId = veoNode.data.outputs[0]?.id
      if (outId && resolved[outId]) {
        return { url: resolved[outId] as string, type: 'video' }
      }
    }
    if (imagenNode) {
      const outId = imagenNode.data.outputs[0]?.id
      if (outId && resolved[outId]) {
        return { url: resolved[outId] as string, type: 'image' }
      }
    }
    // Fallback to default scene cover
    return { url: activeScene.coverUrl, type: 'image' }
  }

  const media = getMontageMedia()

  // Dragging event handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    // Don't drag if clicking buttons
    if ((e.target as HTMLElement).closest('button')) return
    dragRef.current = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      startPos: { ...position },
    }
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!dragRef.current.isDragging) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    setPosition({
      x: Math.max(0, Math.min(window.innerWidth - size.width, dragRef.current.startPos.x + dx)),
      y: Math.max(0, Math.min(window.innerHeight - size.height, dragRef.current.startPos.y + dy)),
    })
  }

  const handleMouseUp = () => {
    dragRef.current.isDragging = false
    window.removeEventListener('mousemove', handleMouseMove)
    window.removeEventListener('mouseup', handleMouseUp)
  }

  // Toggle fullscreen on the monitor element itself
  const toggleFullscreen = () => {
    if (!monitorRef.current) return
    if (!document.fullscreenElement) {
      monitorRef.current.requestFullscreen().catch((err) => console.error(err))
    } else {
      document.exitFullscreen().catch((err) => console.error(err))
    }
  }

  if (!showMontageMonitor) return null

  return (
    <div
      className={styles.monitorWindow}
      ref={monitorRef}
      style={{
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
      }}
    >
      <div className={styles.header} onMouseDown={handleMouseDown}>
        <div className={styles.headerTitle}>
          <i className="ti ti-device-tv" />
          <span>Монитор Монтажа: {activeScene.title}</span>
        </div>
        <div className={styles.headerActions}>
          <button onClick={toggleFullscreen} title="На весь экран">
            <i className="ti ti-arrows-maximize" />
          </button>
          <button onClick={() => setShowMontageMonitor(false)} title="Закрыть">
            <i className="ti ti-x" />
          </button>
        </div>
      </div>

      <div className={styles.screenArea}>
        {media.type === 'video' ? (
          <video src={media.url} className={styles.mediaOutput} autoPlay loop muted playsInline />
        ) : (
          <img src={media.url} alt="Scene Frame" className={styles.mediaOutput} />
        )}

        {/* Subtitle Overlay */}
        {activeScene.sub && (
          <div className={styles.subtitleOverlay}>
            <p className={styles.subtitleText}>{activeScene.sub}</p>
          </div>
        )}

        {/* Tech Details Badge Overlay */}
        <div className={styles.techBadge}>
          <span>
            Scene {activeScene.num} · {media.type === 'video' ? 'Motion (Veo)' : 'Stills (Imagen)'}
          </span>
        </div>
      </div>
    </div>
  )
}
