import React, { useState, useEffect, useRef } from 'react'
import cn from 'classnames'
import { useGraphContext } from '../../store/contexts/GraphContext.tsx'
import { DEFAULT_SCENES, TimelineScene } from '../../data/scenes.ts'
import styles from './Timeline.module.css'

export function Timeline() {
  const {
    nodes,
    showMiniMap,
    setShowMiniMap,
    activeSceneId,
    setActiveSceneId,
    showMontageMonitor,
    setShowMontageMonitor,
    narrativeSettings,
    updateNarrativeSettings,
  } = useGraphContext()

  // Tab State
  const [activeTab, setActiveTab] = useState<'scenes' | 'synapses' | 'settings'>('scenes')

  // Playback state
  const [currentTime, setCurrentTime] = useState<number>(0)
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [playSpeed, setPlaySpeed] = useState<number>(1.0)
  const [volume, setVolume] = useState<number>(80) // 0 to 100
  const [isMuted, setIsMuted] = useState<boolean>(false)
  const [collapseEmptySpace, setCollapseEmptySpace] = useState<boolean>(false)
  const [isAutoMontage, setIsAutoMontage] = useState<boolean>(false)
  const [currentBranch, setCurrentBranch] = useState<string>('main (канон)')
  const [showStateDebugger, setShowStateDebugger] = useState<boolean>(false)
  const [showVolumeSlider, setShowVolumeSlider] = useState<boolean>(false)

  // Camera toggle state
  const [activeCameras, setActiveCameras] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    DEFAULT_SCENES.forEach((s) => {
      initial[s.id] = s.cameraActive
    })
    return initial
  })

  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDragging = useRef<boolean>(false)

  // Speeds cycle list
  const speedList = [0.5, 1.0, 1.5, 2.0]

  // Branches list
  const branchesList = ['main (канон)', 'fork-rambalkoshe', 'alt-kond-rain']

  // Derive scenes list based on current branch and active cameras state
  const scenes = DEFAULT_SCENES.map((s) => {
    let title = s.title
    let sub = s.sub
    if (currentBranch === 'alt-kond-rain' && s.id.includes('sc4')) {
      title = s.id === 'sc4a' ? 'Дождь в Конде' : 'Гроза в Конде'
      sub = 'Армянская гроза смывает пыль времен.'
    } else if (currentBranch === 'fork-rambalkoshe') {
      sub = `[Альт-линия @rambalkoshe] ${s.sub || ''}`
    }
    return {
      ...s,
      title,
      sub,
      cameraActive: activeCameras[s.id] ?? false,
    }
  })

  // Calculate packed segments for collapsed mode
  const uniqueStarts = Array.from(new Set(scenes.map((s) => s.start))).sort((a, b) => a - b)
  const startDurations = uniqueStarts.map((start) => {
    const activeScenesAtStart = scenes.filter((s) => s.start === start)
    return Math.max(...activeScenesAtStart.map((s) => s.duration), 0)
  })

  const packedStarts: Record<number, number> = {}
  let currentPackedTime = 0
  for (let i = 0; i < uniqueStarts.length; i++) {
    packedStarts[uniqueStarts[i]] = currentPackedTime
    currentPackedTime += startDurations[i]
  }

  const totalDuration = 872 // 14:32 in seconds
  const totalPackedDuration = currentPackedTime // Sum of all active segments

  // Playback timer loop
  useEffect(() => {
    if (!isPlaying) return

    let lastTime = performance.now()
    let frameId: number

    const tick = (now: number) => {
      const delta = (now - lastTime) / 1000
      lastTime = now

      setCurrentTime((prevTime) => {
        const nextTime = prevTime + delta * playSpeed
        const maxTime = collapseEmptySpace ? totalPackedDuration : totalDuration
        if (nextTime >= maxTime) {
          setIsPlaying(false)
          return maxTime
        }
        return nextTime
      })

      frameId = requestAnimationFrame(tick)
    }

    frameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameId)
  }, [isPlaying, playSpeed, collapseEmptySpace, totalDuration, totalPackedDuration])

  // Canvas drawing for Tab 2: Synapses of Fates
  useEffect(() => {
    if (activeTab !== 'synapses' || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationId: number

    const handleResize = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    handleResize()
    window.addEventListener('resize', handleResize)

    const draw = () => {
      const W = canvas.clientWidth
      const H = canvas.clientHeight
      ctx.clearRect(0, 0, W, H)

      // Grid/Columns geometry
      const colCount = scenes.length
      const paddingLeft = 60
      const paddingRight = 60
      const colWidth = (W - paddingLeft - paddingRight) / (colCount - 1)
      const colX = scenes.map((_, i) => paddingLeft + i * colWidth)

      const lanesCount = 5
      const paddingTop = 20
      const paddingBottom = 20
      const laneHeight = (H - paddingTop - paddingBottom) / (lanesCount - 1)
      const laneY = Array.from({ length: lanesCount }, (_, i) => paddingTop + i * laneHeight)

      // Draw columns and location texts
      ctx.save()
      ctx.font = '9px system-ui, sans-serif'
      ctx.fillStyle = 'rgba(241, 239, 232, 0.4)'
      ctx.textAlign = 'center'
      scenes.forEach((s, i) => {
        ctx.strokeStyle =
          s.id === activeSceneId ? 'rgba(239, 159, 39, 0.25)' : 'rgba(241, 239, 232, 0.08)'
        ctx.lineWidth = s.id === activeSceneId ? 2 : 1
        ctx.beginPath()
        ctx.moveTo(colX[i], paddingTop - 5)
        ctx.lineTo(colX[i], H - paddingBottom + 5)
        ctx.stroke()

        ctx.fillStyle =
          s.id === activeSceneId ? 'var(--color-bg-accent)' : 'var(--color-text-secondary)'
        ctx.fillText(s.num, colX[i], paddingTop - 8)
      })
      ctx.restore()

      // Character lifepaths (Threads)
      const CHAR_LANES = [
        { name: 'Ара Гехецик', color: '#EF9F27', slots: [2, 1, 1, 2, 3, 2, 1, 2] },
        { name: 'Анаит', color: '#D4537E', slots: [0, 1, 2, 2, 1, 2, 0, 2] },
        { name: 'Вардан', color: '#5DCAA5', slots: [4, 3, 1, 2, 3, 2, 4, 2] },
        { name: 'Цовинар', color: '#85B7EB', slots: [3, 4, 4, 2, 0, 2, 3, 2] },
        { name: 'Вреж · dev', color: '#AFA9EC', slots: [1, 0, 3, 4, 4, 2, 1, 2] },
      ]

      CHAR_LANES.forEach((c) => {
        ctx.save()
        ctx.lineWidth = 2.0
        ctx.strokeStyle = c.color
        ctx.globalAlpha = 0.8
        ctx.shadowColor = c.color
        ctx.shadowBlur = 6

        ctx.beginPath()
        let isFirst = true
        scenes.forEach((s, idx) => {
          const slot = c.slots[idx % c.slots.length]
          const x = colX[idx]
          const y = laneY[slot]
          if (isFirst) {
            ctx.moveTo(x, y)
            isFirst = false
          } else {
            const prevX = colX[idx - 1]
            const prevSlot = c.slots[(idx - 1) % c.slots.length]
            const prevY = laneY[prevSlot]
            const mx = (prevX + x) / 2
            ctx.bezierCurveTo(mx, prevY, mx, y, x, y)
          }
        })
        ctx.stroke()
        ctx.restore()
      })

      // Synapse intersections (⬤ Nodes)
      scenes.forEach((s, idx) => {
        const x = colX[idx]
        const charAtScene = CHAR_LANES.filter((c) => c.slots[idx % c.slots.length] !== undefined)
        const isCurrentScene = s.id === activeSceneId
        const pulse = Math.sin(Date.now() / 250 + idx) * 1.2

        charAtScene.forEach((c, j) => {
          const slot = c.slots[idx % c.slots.length]
          const y = laneY[slot]
          ctx.save()
          ctx.beginPath()
          ctx.arc(x, y, 5 + pulse + j * 1.5, 0, Math.PI * 2)
          ctx.strokeStyle = c.color
          ctx.lineWidth = 1.6
          ctx.globalAlpha = isCurrentScene ? 1.0 : 0.35
          if (isCurrentScene) {
            ctx.shadowColor = c.color
            ctx.shadowBlur = 8
          }
          ctx.stroke()
          ctx.restore()
        })

        // Central glowing core
        const firstSlot = CHAR_LANES[0].slots[idx % CHAR_LANES[0].slots.length]
        const centerY = laneY[firstSlot]
        ctx.save()
        ctx.beginPath()
        ctx.arc(x, centerY, 3.5, 0, Math.PI * 2)
        ctx.fillStyle = isCurrentScene ? '#ef9f27' : '#e8e4d8'
        ctx.shadowColor = '#fff'
        ctx.shadowBlur = isCurrentScene ? 12 : 3
        ctx.fill()
        ctx.restore()
      })

      // Render vertical playback playhead line
      const maxTime = collapseEmptySpace ? totalPackedDuration : totalDuration
      const scrubberX = paddingLeft + (currentTime / maxTime) * (W - paddingLeft - paddingRight)
      ctx.save()
      ctx.strokeStyle = '#ef9f27'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(scrubberX, paddingTop - 8)
      ctx.lineTo(scrubberX, H - paddingBottom + 8)
      ctx.stroke()
      ctx.restore()

      animationId = requestAnimationFrame(draw)
    }

    animationId = requestAnimationFrame(draw)

    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animationId)
    }
  }, [
    activeTab,
    currentTime,
    collapseEmptySpace,
    totalDuration,
    totalPackedDuration,
    activeSceneId,
    scenes,
  ])

  // Canvas click to select scene
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const W = rect.width
    const paddingLeft = 60
    const paddingRight = 60
    const colWidth = (W - paddingLeft - paddingRight) / (scenes.length - 1)

    let closestIdx = 0
    let minDiff = Infinity
    scenes.forEach((_, idx) => {
      const colX = paddingLeft + idx * colWidth
      const diff = Math.abs(x - colX)
      if (diff < minDiff) {
        minDiff = diff
        closestIdx = idx
      }
    })

    if (minDiff < 40) {
      const targetScene = scenes[closestIdx]
      handleSceneTabClick(targetScene.id, targetScene.start)
    }
  }

  // Map absolute time of a scene to packed time
  const getScenePosition = (scene: TimelineScene) => {
    if (collapseEmptySpace) {
      const left = (packedStarts[scene.start] / totalPackedDuration) * 100
      const width = (scene.duration / totalPackedDuration) * 100
      return { left: `${left}%`, width: `${width}%` }
    } else {
      const left = (scene.start / totalDuration) * 100
      const width = (scene.duration / totalDuration) * 100
      return { left: `${left}%`, width: `${width}%` }
    }
  }

  // Format time (s) to MM:SS
  const formatTime = (timeInSecs: number) => {
    const m = Math.floor(timeInSecs / 60)
    const s = Math.floor(timeInSecs % 60)
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  // Toggle play/pause
  const togglePlay = () => setIsPlaying(!isPlaying)

  // Stop playback and reset
  const stopPlay = () => {
    setIsPlaying(false)
    setCurrentTime(0)
  }

  // Cycle playback speed
  const cycleSpeed = (forward = true) => {
    const idx = speedList.indexOf(playSpeed)
    let nextIdx = forward ? idx + 1 : idx - 1
    if (nextIdx >= speedList.length) nextIdx = 0
    if (nextIdx < 0) nextIdx = speedList.length - 1
    setPlaySpeed(speedList[nextIdx])
  }

  // Next/Prev scene jumps
  const jumpScene = (forward = true) => {
    const starts = uniqueStarts
    if (forward) {
      const nextStart = starts.find((st) =>
        collapseEmptySpace ? packedStarts[st] > currentTime : st > currentTime
      )
      if (nextStart !== undefined) {
        const nextId = scenes.find((s) => s.start === nextStart)?.id
        if (nextId) setActiveSceneId(nextId)
        setCurrentTime(collapseEmptySpace ? packedStarts[nextStart] : nextStart)
      } else {
        setCurrentTime(collapseEmptySpace ? totalPackedDuration : totalDuration)
      }
    } else {
      const prevStarts = [...starts].reverse()
      const prevStart = prevStarts.find((st) =>
        collapseEmptySpace ? packedStarts[st] < currentTime - 1 : st < currentTime - 1
      )
      if (prevStart !== undefined) {
        const prevId = scenes.find((s) => s.start === prevStart)?.id
        if (prevId) setActiveSceneId(prevId)
        setCurrentTime(collapseEmptySpace ? packedStarts[prevStart] : prevStart)
      } else {
        setCurrentTime(0)
      }
    }
  }

  // Mute toggle
  const toggleMute = () => setIsMuted(!isMuted)

  // Minimap toggle
  const toggleMiniMap = () => setShowMiniMap(!showMiniMap)

  // Fullscreen toggle
  const toggleFullscreen = () => {
    const appEl = document.getElementById('app')
    if (!appEl) return
    if (!document.fullscreenElement) {
      appEl.requestFullscreen().catch((err) => console.error(err))
    } else {
      document.exitFullscreen().catch((err) => console.error(err))
    }
  }

  // Toggle camera active for parallel scenes
  const toggleCamera = (sceneId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const targetScene = scenes.find((s) => s.id === sceneId)
    if (!targetScene) return

    setActiveCameras((prev) => {
      const next = { ...prev }
      const newActive = !prev[sceneId]
      next[sceneId] = newActive

      // If not in auto-montage and we are activating, deactivate other parallel scenes
      if (!isAutoMontage && newActive) {
        scenes.forEach((s) => {
          if (s.start === targetScene.start && s.id !== sceneId) {
            next[s.id] = false
          }
        })
      }
      return next
    })
  }

  // Scrubbing logic
  const handleScrubStart = (e: React.MouseEvent<HTMLDivElement>) => {
    isDragging.current = true
    handleScrub(e)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging.current || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percent = Math.max(0, Math.min(1, x / rect.width))
    const targetTime = percent * (collapseEmptySpace ? totalPackedDuration : totalDuration)
    setCurrentTime(targetTime)

    // Sync active scene tab with scrubber time
    const active = scenes.find((s) => {
      if (collapseEmptySpace) {
        const seg = packedStarts[s.start]
        return targetTime >= seg && targetTime < seg + s.duration
      } else {
        return targetTime >= s.start && targetTime < s.start + s.duration
      }
    })
    if (active && active.id !== activeSceneId) {
      setActiveSceneId(active.id)
    }
  }

  const handleMouseUp = () => {
    isDragging.current = false
    window.removeEventListener('mousemove', handleMouseMove)
    window.removeEventListener('mouseup', handleMouseUp)
  }

  const handleScrub = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percent = Math.max(0, Math.min(1, x / rect.width))
    const targetTime = percent * (collapseEmptySpace ? totalPackedDuration : totalDuration)
    setCurrentTime(targetTime)

    // Sync active scene tab
    const active = scenes.find((s) => {
      if (collapseEmptySpace) {
        const seg = packedStarts[s.start]
        return targetTime >= seg && targetTime < seg + s.duration
      } else {
        return targetTime >= s.start && targetTime < s.start + s.duration
      }
    })
    if (active && active.id !== activeSceneId) {
      setActiveSceneId(active.id)
    }
  }

  // Handle scene card tab click
  const handleSceneTabClick = (sceneId: string, sceneStart: number) => {
    setActiveSceneId(sceneId)
    setCurrentTime(collapseEmptySpace ? packedStarts[sceneStart] : sceneStart)
  }

  // Check if a scene is active based on playhead time
  const isSceneActive = (scene: TimelineScene) => {
    if (collapseEmptySpace) {
      const segmentStart = packedStarts[scene.start]
      return currentTime >= segmentStart && currentTime < segmentStart + scene.duration
    } else {
      return currentTime >= scene.start && currentTime < scene.start + scene.duration
    }
  }

  // Calculate current scrubber position percentage
  const scrubberPercent =
    (currentTime / (collapseEmptySpace ? totalPackedDuration : totalDuration)) * 100

  // Track rows definition
  const track1Scenes = scenes.filter((s) => s.track === 1)
  const track2Scenes = scenes.filter((s) => s.track === 2)

  // Construct current universe JSON state based on nodes on canvas
  const getUniverseStateJSON = () => {
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
  }

  // Draw ruler ticks
  const renderRulerTicks = () => {
    const maxTime = collapseEmptySpace ? totalPackedDuration : totalDuration
    const ticksCount = 10
    const ticks = []
    for (let i = 0; i <= ticksCount; i++) {
      const timeVal = (i / ticksCount) * maxTime
      ticks.push(
        <div key={i} className={styles.rulerTick} style={{ left: `${(i / ticksCount) * 100}%` }}>
          <span className={styles.tickLabel}>{formatTime(timeVal)}</span>
        </div>
      )
    }
    return ticks
  }

  // Active scene narrative settings
  const activeSettings = narrativeSettings[activeSceneId] || {
    emotionalTrend: 0,
    conflictType: 'physical',
    conflictTarget: 'man_vs_man',
  }

  // Calculate SVG arrow parameters
  // Start is bottom-left (50, 95)
  // End is top-right (350, y2) where y2 goes from 95 (flat) to 20 (steep)
  const arrowY2 = 95 - 75 * ((activeSettings.emotionalTrend + 100) / 200)

  return (
    <div className={styles.timelineContainer}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <i className="ti ti-timeline" />
          <span>Таймлайн фильма</span>

          {/* Segmented Timeline Tabs */}
          <div className={styles.tabHeaders}>
            <button
              className={cn(
                styles.tabHeaderBtn,
                activeTab === 'scenes' && styles.tabHeaderBtnActive
              )}
              onClick={() => setActiveTab('scenes')}
            >
              <i className="ti ti-layout-grid" />
              <span>Сцены</span>
            </button>
            <button
              className={cn(
                styles.tabHeaderBtn,
                activeTab === 'synapses' && styles.tabHeaderBtnActive
              )}
              onClick={() => setActiveTab('synapses')}
            >
              <i className="ti ti-circles" />
              <span>Сеть судеб</span>
            </button>
            <button
              className={cn(
                styles.tabHeaderBtn,
                activeTab === 'settings' && styles.tabHeaderBtnActive
              )}
              onClick={() => setActiveTab('settings')}
            >
              <i className="ti ti-adjustments" />
              <span>Настройки сцены</span>
            </button>
          </div>

          <div className={styles.branchSelectWrapper}>
            <i className="ti ti-git-branch" />
            <select
              value={currentBranch}
              onChange={(e) => setCurrentBranch(e.target.value)}
              className={styles.branchSelect}
            >
              {branchesList.map((branch) => (
                <option key={branch} value={branch}>
                  {branch}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className={styles.headerRight}>
          <button
            className={cn(styles.tbBtn, showStateDebugger && styles.tbBtnActive)}
            onClick={() => setShowStateDebugger(!showStateDebugger)}
            title="Показать JSON состояние Вселенной"
          >
            <i className="ti ti-database" />
            <span>База Данных (JSON)</span>
          </button>
          <span>{scenes.length} сцен</span>
          <span>·</span>
          <span>{formatTime(collapseEmptySpace ? totalPackedDuration : totalDuration)}</span>
        </div>
      </div>

      {/* Collapsible JSON State Debugger Panel */}
      {showStateDebugger && (
        <div className={styles.stateDebugger}>
          <div className={styles.debuggerHeader}>
            <span>
              <i className="ti ti-code" /> Запрос к Лор-Базе (JSON-State):
            </span>
            <button className={styles.closeBtn} onClick={() => setShowStateDebugger(false)}>
              <i className="ti ti-x" />
            </button>
          </div>
          <pre className={styles.debuggerPre}>{getUniverseStateJSON()}</pre>
        </div>
      )}

      {/* Main Tracks / Canvas Area depending on Active Tab */}
      <div className={styles.mainTimelineArea}>
        {activeTab === 'scenes' && (
          <>
            {/* Timeline Ruler */}
            <div className={styles.rulerContainer}>{renderRulerTicks()}</div>

            <div className={styles.tracksWrapper} ref={containerRef} onMouseDown={handleScrubStart}>
              {/* Playhead vertical line */}
              <div className={styles.playhead} style={{ left: `${scrubberPercent}%` }}>
                <div className={styles.playheadHandle} />
              </div>

              {/* Track Row 1 */}
              <div className={styles.trackRow}>
                {track1Scenes.map((scene) => (
                  <div
                    key={scene.id}
                    className={cn(
                      styles.sceneCard,
                      isSceneActive(scene) && styles.sceneCardActive,
                      scene.id === activeSceneId && styles.sceneCardSelected,
                      scene.cameraActive && styles.sceneCardCameraSelected
                    )}
                    style={{
                      ...getScenePosition(scene),
                      backgroundImage: `url(${scene.coverUrl})`,
                    }}
                    onClick={() => handleSceneTabClick(scene.id, scene.start)}
                  >
                    <div className={styles.cardOverlay}>
                      <span className={styles.sceneNum}>Scene {scene.num}</span>
                      <span className={styles.sceneTitle}>{scene.title}</span>
                    </div>
                    <button
                      className={cn(styles.camBtn, scene.cameraActive && styles.camBtnActive)}
                      onClick={(e) => toggleCamera(scene.id, e)}
                      title="Активировать камеру для рендера"
                    >
                      <i className="ti ti-video" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Track Row 2 */}
              <div className={styles.trackRow}>
                {track2Scenes.map((scene) => (
                  <div
                    key={scene.id}
                    className={cn(
                      styles.sceneCard,
                      isSceneActive(scene) && styles.sceneCardActive,
                      scene.id === activeSceneId && styles.sceneCardSelected,
                      scene.cameraActive && styles.sceneCardCameraSelected
                    )}
                    style={{
                      ...getScenePosition(scene),
                      backgroundImage: `url(${scene.coverUrl})`,
                    }}
                    onClick={() => handleSceneTabClick(scene.id, scene.start)}
                  >
                    <div className={styles.cardOverlay}>
                      <span className={styles.sceneNum}>Scene {scene.num}</span>
                      <span className={styles.sceneTitle}>{scene.title}</span>
                    </div>
                    <button
                      className={cn(styles.camBtn, scene.cameraActive && styles.camBtnActive)}
                      onClick={(e) => toggleCamera(scene.id, e)}
                      title="Активировать камеру для рендера"
                    >
                      <i className="ti ti-video" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {activeTab === 'synapses' && (
          <div className={styles.canvasWrapper}>
            <canvas ref={canvasRef} onClick={handleCanvasClick} className={styles.synapsesCanvas} />
            <div className={styles.canvasLegend}>
              <span>
                ⬤ синапс (пересечение линий судеб персонажей) · кликни на синапс для перехода
              </span>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className={styles.settingsWrapper}>
            <div className={styles.settingsGrid}>
              {/* Left Column: Emotional Line (Эмоциональная линия) */}
              <div className={styles.settingsCol}>
                <div className={styles.columnHeader}>
                  <i className="ti ti-trending-up" />
                  <span>
                    Эмоциональная линия сцены ({scenes.find((s) => s.id === activeSceneId)?.title})
                  </span>
                </div>

                <div className={styles.emotionalBox}>
                  <svg className={styles.emotionalSvg} viewBox="0 0 400 120">
                    <defs>
                      <marker
                        id="arrow"
                        viewBox="0 0 10 10"
                        refX="5"
                        refY="5"
                        markerWidth="6"
                        markerHeight="6"
                        orient="auto-start-reverse"
                      >
                        <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--color-text-primary)" />
                      </marker>
                      <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                        <path
                          d="M 20 0 L 0 0 0 20"
                          fill="none"
                          stroke="rgba(241, 239, 232, 0.03)"
                          strokeWidth="1"
                        />
                      </pattern>
                    </defs>

                    {/* Grid Background */}
                    <rect width="400" height="120" fill="url(#grid)" />

                    {/* Diagonal slope emotional line */}
                    <line
                      x1="50"
                      y1="95"
                      x2="350"
                      y2={arrowY2}
                      stroke="var(--color-text-primary)"
                      strokeWidth="2"
                      markerEnd="url(#arrow)"
                    />

                    {/* Labels */}
                    <text x="50" y="112" className={styles.svgText} textAnchor="start">
                      Положительные
                    </text>
                    <text x="350" y="18" className={styles.svgText} textAnchor="end">
                      Негативные
                    </text>
                    <text x="200" y="70" className={styles.svgLabelText} textAnchor="middle">
                      Эмоциональная линия
                    </text>
                  </svg>
                </div>

                <div className={styles.sliderControl}>
                  <span className={styles.sliderLabel}>
                    Уровень тренда: {activeSettings.emotionalTrend}%
                  </span>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    value={activeSettings.emotionalTrend}
                    onChange={(e) =>
                      updateNarrativeSettings(activeSceneId, {
                        emotionalTrend: Number(e.target.value),
                      })
                    }
                    className={styles.settingsSlider}
                  />
                </div>
              </div>

              {/* Right Column: Conflict selector (Конфликт) */}
              <div className={styles.settingsCol}>
                <div className={styles.columnHeader}>
                  <i className="ti ti-swords" />
                  <span>Тип и характер конфликта в сцене</span>
                </div>

                <div className={styles.conflictContainer}>
                  <span className={styles.conflictTitle}>Конфликт</span>

                  <div className={styles.conflictMatrix}>
                    {/* Left side: Physical vs Psychological */}
                    <div className={styles.conflictLeft}>
                      <button
                        className={cn(
                          styles.conflictTypeBtn,
                          activeSettings.conflictType === 'physical' && styles.conflictTypeBtnActive
                        )}
                        onClick={() =>
                          updateNarrativeSettings(activeSceneId, { conflictType: 'physical' })
                        }
                      >
                        <span className={styles.btnContent}>
                          {activeSettings.conflictType === 'physical' && (
                            <i className="ti ti-arrow-right" />
                          )}
                          Физический
                        </span>
                      </button>
                      <button
                        className={cn(
                          styles.conflictTypeBtn,
                          activeSettings.conflictType === 'psychological' &&
                            styles.conflictTypeBtnActive
                        )}
                        onClick={() =>
                          updateNarrativeSettings(activeSceneId, { conflictType: 'psychological' })
                        }
                      >
                        <span className={styles.btnContent}>
                          {activeSettings.conflictType === 'psychological' && (
                            <i className="ti ti-arrow-right" />
                          )}
                          Психологический
                        </span>
                      </button>
                    </div>

                    {/* Right side: Targets */}
                    <div className={styles.conflictRight}>
                      <button
                        className={cn(
                          styles.conflictTargetBtn,
                          activeSettings.conflictTarget === 'man_vs_man' &&
                            styles.conflictTargetBtnActive
                        )}
                        onClick={() =>
                          updateNarrativeSettings(activeSceneId, { conflictTarget: 'man_vs_man' })
                        }
                      >
                        человек против человека
                      </button>
                      <button
                        className={cn(
                          styles.conflictTargetBtn,
                          activeSettings.conflictTarget === 'man_vs_nature' &&
                            styles.conflictTargetBtnActive
                        )}
                        onClick={() =>
                          updateNarrativeSettings(activeSceneId, {
                            conflictTarget: 'man_vs_nature',
                          })
                        }
                      >
                        человек против природы
                      </button>
                      <button
                        className={cn(
                          styles.conflictTargetBtn,
                          activeSettings.conflictTarget === 'man_vs_society' &&
                            styles.conflictTargetBtnActive
                        )}
                        onClick={() =>
                          updateNarrativeSettings(activeSceneId, {
                            conflictTarget: 'man_vs_society',
                          })
                        }
                      >
                        человек против общества
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Control panel buttons */}
      <div className={styles.controlsBar}>
        <div className={styles.btnGroup}>
          <button
            className={styles.tbBtn}
            onClick={() => jumpScene(false)}
            title="Предыдущая сцена"
          >
            <i className="ti ti-player-skip-back" />
          </button>
          <button
            className={styles.tbBtn}
            onClick={togglePlay}
            title={isPlaying ? 'Пауза' : 'Играть'}
          >
            <i className={cn(isPlaying ? 'ti ti-player-pause' : 'ti ti-player-play')} />
          </button>
          <button className={styles.tbBtn} onClick={stopPlay} title="Стоп">
            <i className="ti ti-player-stop" />
          </button>
          <button className={styles.tbBtn} onClick={() => jumpScene(true)} title="Следующая сцена">
            <i className="ti ti-player-skip-forward" />
          </button>
        </div>

        <div className={styles.btnGroup}>
          <button className={styles.tbBtn} onClick={() => cycleSpeed(false)} title="Замедлить">
            <i className="ti ti-chevron-left" />
          </button>
          <button className={styles.tbBtn} onClick={() => cycleSpeed(true)} title="Скорость">
            <span>{playSpeed.toFixed(1)}x</span>
          </button>
          <button className={styles.tbBtn} onClick={() => cycleSpeed(true)} title="Ускорить">
            <i className="ti ti-chevron-right" />
          </button>
        </div>

        {/* Volume popover adjustment */}
        <div
          className={styles.volumeWrapper}
          onMouseEnter={() => setShowVolumeSlider(true)}
          onMouseLeave={() => setShowVolumeSlider(false)}
        >
          <button
            className={cn(styles.tbBtn, (isMuted || volume === 0) && styles.tbBtnActive)}
            onClick={toggleMute}
            title={isMuted ? 'Включить звук' : 'Выключить звук'}
          >
            <i
              className={cn(
                isMuted || volume === 0
                  ? 'ti ti-volume-off'
                  : volume > 50
                    ? 'ti ti-volume'
                    : 'ti ti-volume-2'
              )}
            />
          </button>
          {showVolumeSlider && (
            <div className={styles.volumePopover}>
              <input
                type="range"
                min="0"
                max="100"
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  setVolume(Number(e.target.value))
                  if (isMuted) setIsMuted(false)
                }}
                className={styles.volumeInput}
              />
            </div>
          )}
        </div>

        <button
          className={cn(styles.tbBtn, collapseEmptySpace && styles.tbBtnActive)}
          onClick={() => setCollapseEmptySpace(!collapseEmptySpace)}
          title="Смотреть подряд без пустых мест"
        >
          <i className="ti ti-arrows-minimize" />
          <span>Стыковка сцен</span>
        </button>

        <button
          className={cn(styles.tbBtn, isAutoMontage && styles.tbBtnActive)}
          onClick={() => setIsAutoMontage(!isAutoMontage)}
          title="Автоматический монтаж при параллельных сценах"
        >
          <i className="ti ti-git-fork" />
          <span>Автомонтаж</span>
        </button>

        <button
          className={cn(styles.tbBtn, showMontageMonitor && styles.tbBtnActive)}
          onClick={() => setShowMontageMonitor(!showMontageMonitor)}
          title="Открыть Главный Экран Монтажа"
        >
          <i className="ti ti-device-tv" />
          <span>Монитор Монтажа</span>
        </button>

        <span className={styles.spacer} />

        <div className={styles.timeDisplay}>
          {formatTime(currentTime)} /{' '}
          {formatTime(collapseEmptySpace ? totalPackedDuration : totalDuration)}
        </div>

        <div className={styles.btnGroup}>
          <button
            className={cn(styles.tbBtn, showMiniMap && styles.tbBtnActive)}
            onClick={toggleMiniMap}
            title="Показать/скрыть миникарту холста"
          >
            <i className="ti ti-map-2" />
            <span>Миникарта</span>
          </button>
          <button className={styles.tbBtn} onClick={toggleFullscreen} title="Полноэкранный режим">
            <i className="ti ti-arrows-maximize" />
          </button>
        </div>
      </div>
    </div>
  )
}
