import type { ChartBar, ChartViewport, ChartViewportPreset } from '../../types'
import type { TimeScaleConfig } from '../../types/viewport'

export type ClampViewportOptions = {
  /** Number of extra virtual bars after the last real bar */
  rightOffset?: number
  /** Prevent scrolling before the first bar (maintains span by shifting) */
  fixLeftEdge?: boolean
  /** Prevent scrolling past the last bar + rightOffset (maintains span by shifting) */
  fixRightEdge?: boolean
}

export const clampViewport = (
  viewport: ChartViewport,
  barsLength: number,
  minBars: number,
  options?: ClampViewportOptions,
): ChartViewport => {
  if (barsLength <= 0) {
    return { startIndex: 0, endIndex: 0 }
  }

  const safeMinBars = Math.max(2, minBars)
  const rightOffset = options?.rightOffset ?? 0
  const maxIndex = barsLength - 1 + rightOffset

  let start = Math.max(0, viewport.startIndex)
  let end = Math.min(maxIndex, viewport.endIndex)

  // fixLeftEdge: if the viewport would start before 0, shift it right to keep span
  if (options?.fixLeftEdge && viewport.startIndex < 0) {
    const shift = -viewport.startIndex
    start = 0
    end = Math.min(maxIndex, viewport.endIndex + shift)
  }

  // fixRightEdge: if the viewport would end beyond maxIndex, shift it left to keep span
  if (options?.fixRightEdge && viewport.endIndex > maxIndex) {
    const shift = viewport.endIndex - maxIndex
    end = maxIndex
    start = Math.max(0, viewport.startIndex - shift)
  }

  if (end - start + 1 >= safeMinBars) {
    return {
      startIndex: start,
      endIndex: end,
    }
  }

  const center = Math.round((start + end) / 2)
  const half = Math.floor(safeMinBars / 2)
  const nextStart = Math.max(0, center - half)
  const nextEnd = Math.min(maxIndex, nextStart + safeMinBars - 1)

  return {
    startIndex: Math.max(0, nextEnd - safeMinBars + 1),
    endIndex: nextEnd,
  }
}

export const clampViewportWithTimeScale = (
  viewport: ChartViewport,
  barsLength: number,
  minBars: number,
  timeScale?: TimeScaleConfig,
): ChartViewport => {
  return clampViewport(viewport, barsLength, minBars, {
    rightOffset: timeScale?.rightOffset,
    fixLeftEdge: timeScale?.fixLeftEdge,
    fixRightEdge: timeScale?.fixRightEdge,
  })
}

export const viewportFromPreset = (
  barsLength: number,
  preset: ChartViewportPreset,
  rightOffset = 0,
): ChartViewport => {
  if (barsLength <= 0) {
    return { startIndex: 0, endIndex: 0 }
  }

  if (preset.type === 'indices') {
    return {
      startIndex: Math.max(0, preset.startIndex),
      endIndex: Math.min(barsLength - 1 + rightOffset, preset.endIndex),
    }
  }

  const bars = Math.max(2, preset.bars)
  const endIndex = barsLength - 1 + rightOffset

  return {
    startIndex: Math.max(0, endIndex - bars + 1),
    endIndex,
  }
}

export const getVisibleBars = (
  bars: Array<ChartBar>,
  viewport: ChartViewport,
): Array<ChartBar> => {
  if (bars.length === 0) {
    return []
  }

  const start = Math.max(0, viewport.startIndex)
  const end = Math.min(bars.length - 1, viewport.endIndex)

  if (end < start) {
    return []
  }

  return bars.slice(start, end + 1)
}

/**
 * Compute viewport span from bar spacing.
 * barSpacing = pixels per bar, so visibleBars = chartWidth / barSpacing.
 */
export const viewportSpanFromBarSpacing = (
  chartWidth: number,
  barSpacing: number,
  minBarSpacing = 1,
  maxBarSpacing = 50,
): number => {
  const clamped = Math.max(minBarSpacing, Math.min(maxBarSpacing, barSpacing))
  return Math.max(2, Math.round(chartWidth / clamped))
}
