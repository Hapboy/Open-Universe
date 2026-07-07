import type { TimelineScene } from '../../data/scenes.ts'

export function formatTime(timeInSecs: number): string {
  const m = Math.floor(timeInSecs / 60)
  const s = Math.floor(timeInSecs % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export interface ScenePositionContext {
  collapseEmptySpace: boolean
  totalDuration: number
  totalPackedDuration: number
  packedStarts: Record<number, number>
}

// Maps a scene's absolute start/duration to a left/width percentage pair,
// either along the full (uncollapsed) timeline or the packed one (empty gaps
// between scenes removed).
export function getScenePosition(
  scene: TimelineScene,
  { collapseEmptySpace, totalDuration, totalPackedDuration, packedStarts }: ScenePositionContext
): { left: string; width: string } {
  if (collapseEmptySpace) {
    const left = (packedStarts[scene.start] / totalPackedDuration) * 100
    const width = (scene.duration / totalPackedDuration) * 100
    return { left: `${left}%`, width: `${width}%` }
  }
  const left = (scene.start / totalDuration) * 100
  const width = (scene.duration / totalDuration) * 100
  return { left: `${left}%`, width: `${width}%` }
}
