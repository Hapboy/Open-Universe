import { useEffect } from 'react'
import { useAppContext } from '../store/AppContext.tsx'
import { buildSceneSvg, fmtTime, sceneAt, SCENES, TOTAL_DURATION } from '../core/renderer.ts'

// ── Shared SVG player hook ────────────────────────────────────────────────────

function usePlayerSvg(svgId: string) {
  const { player, team, currentUser } = useAppContext()
  const customImage = (window as Window & { customRenderImage?: string | null }).customRenderImage

  useEffect(() => {
    const svg = document.getElementById(svgId)
    if (!svg) return
    svg.innerHTML = buildSceneSvg({ player, team, currentUser, customRenderImage: customImage })
  })
}

// ── Mini player (inspector sidebar) ──────────────────────────────────────────

export function MiniPlayer() {
  const { player, setPlayer } = useAppContext()
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
    <div className="insp-section" style={{ borderTop: '1px solid var(--color-border)' }}>
      <div className="insp-h">
        <i className="ti ti-video" /> Генеративный плеер
      </div>
      <div className="player-container">
        <div className="player-view">
          <svg id="inspSvg" viewBox="0 0 480 300" />
          <div className="player-overlay player-tc" id="inspTC">
            {fmtTime(player.movieTime)}
          </div>
          <div className="player-overlay player-sc" id="inspSC">
            {scene?.num} · {scene?.title}
          </div>
          {player.dlg && (
            <div className="player-overlay player-sub" id="inspSub">
              {scene?.sub}
            </div>
          )}
        </div>
        <div className="player-controls">
          <button className="play-btn" onClick={() => setPlayer({ isPlaying: !player.isPlaying })}>
            <i className={`ti ${player.isPlaying ? 'ti-player-pause' : 'ti-player-play'}`} />
          </button>
          <div className="scrub-bar" id="inspScrub" onClick={handleScrub}>
            <div className="scrub-progress" style={{ width: `${pct}%` }} />
            <div className="scrub-handle" style={{ left: `${pct}%` }} />
          </div>
        </div>
      </div>
    </div>
  )
}
