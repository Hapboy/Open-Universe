import type { TimelineScene } from '../../types.ts'

export function formatTime(timeInSecs: number): string {
  const m = Math.floor(timeInSecs / 60)
  const s = Math.floor(timeInSecs % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const NICE_STEPS = [
  1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600, 7200, 14400, 21600, 43200, 86400,
] // seconds

export interface RulerTick {
  time: number
  isMajor: boolean
}

// Picks a "nice" round step (from the 1/2/5-per-decade family, seconds
// through days) that gives roughly `targetMajorTicks` major ticks across
// `maxTime`, with minor sub-ticks in between — instead of naively slicing
// the duration into equal but non-round fractions.
export function computeRulerTicks(maxTime: number, targetMajorTicks = 8): RulerTick[] {
  if (!Number.isFinite(maxTime) || maxTime <= 0) return []
  const roughStep = maxTime / targetMajorTicks
  const majorStep = NICE_STEPS.find((s) => s >= roughStep) ?? NICE_STEPS[NICE_STEPS.length - 1]
  const minorPerMajor = 5
  const minorStep = majorStep / minorPerMajor

  const count = Math.floor(maxTime / minorStep)
  const ticks: RulerTick[] = []
  for (let i = 0; i <= count; i++) {
    ticks.push({ time: i * minorStep, isMajor: i % minorPerMajor === 0 })
  }
  return ticks
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
