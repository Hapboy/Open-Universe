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
  } = useGraphContext()

  // Playback state
  const [activeCameras, setActiveCameras] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    DEFAULT_SCENES.forEach((s) => {
      initial[s.id] = s.cameraActive
    })
    return initial
  })
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

  const containerRef = useRef<HTMLDivElement>(null)
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

  return (
    <div className={styles.timelineContainer}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <i className="ti ti-timeline" />
          <span>Таймлайн фильма</span>
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

        {/* montage monitor button */}
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
