import { useEffect } from 'react'
import cn from 'classnames'
import { usePlayerContext } from '../../store/contexts/PlayerContext.tsx'
import { useUserContext } from '../../store/contexts/UserContext.tsx'
import { buildSceneSvg, fmtTime, sceneAt, SCENES, TOTAL_DURATION } from '../../core/renderer.ts'
import styles from './PlayerPanel.module.css'

// ── Shared SVG player hook ────────────────────────────────────────────────────

function usePlayerSvg(svgId: string) {
  const { player } = usePlayerContext()
  const { team, currentUser } = useUserContext()
  const customImage = (window as Window & { customRenderImage?: string | null }).customRenderImage

  useEffect(() => {
    const svg = document.getElementById(svgId)
    if (!svg) return
    svg.innerHTML = buildSceneSvg({ player, team, currentUser, customRenderImage: customImage })
  })
}

// ── Mini player (inspector sidebar) ──────────────────────────────────────────

export function MiniPlayer() {
  const { player, setPlayer } = usePlayerContext()
  const scene = SCENES[player.activeSceneIndex]

  usePlayerSvg('inspSvg')

  const handleScrub = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const t = Math.max(
      0,
      Math.min(TOTAL_DURATION, ((e.clientX - rect.left) / rect.width) * TOTAL_DURATION)
    )
    setPlayer({ movieTime: t, activeSceneIndex: sceneAt(t) })
  }

  const pct = (player.movieTime / TOTAL_DURATION) * 100

  return (
    <div className={styles.inspSection} style={{ borderTop: '1px solid var(--color-border)' }}>
      <div className={styles.inspH}>
        <i className="ti ti-video" /> Генеративный плеер
      </div>
      <div className={styles.playerContainer}>
        <div className={styles.playerView}>
          <svg id="inspSvg" viewBox="0 0 480 300" />
          <div className={cn(styles.playerOverlay, styles.playerTc)} id="inspTC">
            {fmtTime(player.movieTime)}
          </div>
          <div className={cn(styles.playerOverlay, styles.playerSc)} id="inspSC">
            {scene?.num} · {scene?.title}
          </div>
          {player.dlg && (
            <div className={cn(styles.playerOverlay, styles.playerSub)} id="inspSub">
              {scene?.sub}
            </div>
          )}
        </div>
        <div className={styles.playerControls}>
          <button
            className={styles.playBtn}
            onClick={() => setPlayer({ isPlaying: !player.isPlaying })}
          >
            <i className={`ti ${player.isPlaying ? 'ti-player-pause' : 'ti-player-play'}`} />
          </button>
          <div className={styles.scrubBar} id="inspScrub" onClick={handleScrub}>
            <div className={styles.scrubProgress} style={{ width: `${pct}%` }} />
            <div className={styles.scrubHandle} style={{ left: `${pct}%` }} />
          </div>
        </div>
      </div>
    </div>
  )
}
