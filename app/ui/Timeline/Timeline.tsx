import React, { useState, useEffect, useMemo } from 'react'
import cn from 'classnames'
import { useGraphContext } from '../../store/contexts/GraphContext.tsx'
import { DEFAULT_SCENES } from '../../data/scenes.ts'
import { formatTime } from './timelineUtils.ts'
import { useFullscreenToggle } from '../hooks/useFullscreenToggle.ts'
import { SceneTrackView } from './SceneTrackView/SceneTrackView.tsx'
import { SynapsesCanvas } from './SynapsesCanvas/SynapsesCanvas.tsx'
import { SceneArcSettings } from './SceneArcSettings/SceneArcSettings.tsx'
import { StateDebugger } from './StateDebugger/StateDebugger.tsx'
import styles from './Timeline.module.css'

const SPEED_LIST = [0.5, 1.0, 1.5, 2.0]
const BRANCHES_LIST = ['main (канон)', 'fork-rambalkoshe', 'alt-kond-rain']

export function Timeline() {
  const {
    showMiniMap,
    setShowMiniMap,
    activeSceneId,
    setActiveSceneId,
    showMontageMonitor,
    setShowMontageMonitor,
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

  const toggleFullscreen = useFullscreenToggle(() => document.getElementById('app'))

  // Derive scenes list based on current branch and active cameras state
  const scenes = useMemo(
    () =>
      DEFAULT_SCENES.map((s) => {
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
      }),
    [currentBranch, activeCameras]
  )

  // Calculate packed segments for collapsed mode
  const { uniqueStarts, packedStarts, totalPackedDuration } = useMemo(() => {
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
    return { uniqueStarts, packedStarts, totalPackedDuration: currentPackedTime }
  }, [scenes])

  const totalDuration = 872 // 14:32 in seconds

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

  // Toggle play/pause
  const togglePlay = () => setIsPlaying(!isPlaying)

  // Stop playback and reset
  const stopPlay = () => {
    setIsPlaying(false)
    setCurrentTime(0)
  }

  // Cycle playback speed
  const cycleSpeed = (forward = true) => {
    const idx = SPEED_LIST.indexOf(playSpeed)
    let nextIdx = forward ? idx + 1 : idx - 1
    if (nextIdx >= SPEED_LIST.length) nextIdx = 0
    if (nextIdx < 0) nextIdx = SPEED_LIST.length - 1
    setPlaySpeed(SPEED_LIST[nextIdx])
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

  // Calculate current scrubber position percentage
  const maxTime = collapseEmptySpace ? totalPackedDuration : totalDuration

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
              <span>Scene Arc</span>
            </button>
          </div>

          <div className={styles.branchSelectWrapper}>
            <i className="ti ti-git-branch" />
            <select
              value={currentBranch}
              onChange={(e) => setCurrentBranch(e.target.value)}
              className={styles.branchSelect}
            >
              {BRANCHES_LIST.map((branch) => (
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
          <span>{formatTime(maxTime)}</span>
        </div>
      </div>

      <StateDebugger
        isOpen={showStateDebugger}
        onClose={() => setShowStateDebugger(false)}
        scenes={scenes}
        activeSceneId={activeSceneId}
        currentTime={currentTime}
        currentBranch={currentBranch}
      />

      {/* Main Tracks / Canvas Area depending on Active Tab */}
      <div className={styles.mainTimelineArea}>
        {activeTab === 'scenes' && (
          <SceneTrackView
            scenes={scenes}
            activeSceneId={activeSceneId}
            currentTime={currentTime}
            setCurrentTime={setCurrentTime}
            collapseEmptySpace={collapseEmptySpace}
            totalDuration={totalDuration}
            totalPackedDuration={totalPackedDuration}
            packedStarts={packedStarts}
            onToggleCamera={toggleCamera}
          />
        )}

        {activeTab === 'synapses' && (
          <SynapsesCanvas
            scenes={scenes}
            activeSceneId={activeSceneId}
            currentTime={currentTime}
            setCurrentTime={setCurrentTime}
            collapseEmptySpace={collapseEmptySpace}
            totalDuration={totalDuration}
            totalPackedDuration={totalPackedDuration}
            packedStarts={packedStarts}
          />
        )}

        {activeTab === 'settings' && <SceneArcSettings />}
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
          <span className={styles.tbBtn} title="Текущая скорость воспроизведения">
            {playSpeed.toFixed(1)}x
          </span>
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
          {formatTime(currentTime)} / {formatTime(maxTime)}
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
