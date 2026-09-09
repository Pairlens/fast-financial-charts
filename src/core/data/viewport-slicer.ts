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

  const center = (start + end) / 2
  const nextStart = Math.max(0, center - safeMinBars / 2)
  const nextEnd = Math.min(maxIndex, nextStart + safeMinBars - 1)

  return {
    startIndex: Math.max(0, nextEnd - safeMinBars + 1),
    endIndex: nextEnd,
  }
}

/** Visible bar count. Fractional: the viewport is continuous, not a bar count. */
export const viewportSpan = (viewport: ChartViewport): number =>
  Math.max(1, viewport.endIndex - viewport.startIndex + 1)

/**
 * The integer bar range a viewport shows, clamped to the data.
 *
 * Bar `i` occupies index space `[i, i + 1)` and the viewport shows
 * `[startIndex, endIndex + 1)`, so a fractional edge on either side pulls in
 * the bar it cuts through: `floor` on the left, `ceil` on the right. Slicing
 * with the raw floats would drop the partially visible last bar and, for any
 * `bars[viewport.endIndex]` lookup, read `undefined`.
 */
export const visibleBarRange = (
  viewport: ChartViewport,
  barsLength: number,
): { start: number; end: number } => {
  if (barsLength <= 0) return { start: 0, end: -1 }
  const start = Math.max(0, Math.floor(viewport.startIndex))
  const end = Math.min(barsLength - 1, Math.ceil(viewport.endIndex))
  return { start, end }
}

/** Whether bar `index` has any pixel inside the viewport. */
export const isIndexVisible = (
  viewport: ChartViewport,
  index: number,
): boolean =>
  index >= Math.floor(viewport.startIndex) &&
  index <= Math.ceil(viewport.endIndex)

/**
 * The bar under a horizontal ratio of the plot (0 = left edge, 1 = right),
 * clamped to the data. The inverse of `x = (index - startIndex + 0.5) / span`.
 */
export const barIndexAtRatio = (
  viewport: ChartViewport,
  ratio: number,
  barsLength: number,
): number => {
  const clamped = Math.max(0, Math.min(1, ratio))
  const index = Math.floor(viewport.startIndex + clamped * viewportSpan(viewport))
  return Math.max(0, Math.min(barsLength - 1, index))
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

export const getVisibleBars = <T = ChartBar>(
  bars: ReadonlyArray<T>,
  viewport: ChartViewport,
): Array<T> => {
  if (bars.length === 0) {
    return []
  }

  const { start, end } = visibleBarRange(viewport, bars.length)

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

/**
 * Re-anchor a right-anchored viewport onto a replaced series. Used when a full
 * series payload swaps in under a window that was sitting at the right edge.
 *
 * Two things it does that shifting both indices by the bar-count delta did not.
 *
 * A window that covered the WHOLE old series keeps covering the whole series.
 * Its span was never a zoom the user picked, it was whatever the old data
 * allowed: `viewportFromPreset` clamps a 200-bar request down to [0, 21] over a
 * 2-bar series with rightOffset 20. Carrying that 22-wide span onto 302 bars
 * lands on [300, 321], the end of the data, one candle and empty space, until
 * the user hits Fit Content.
 *
 * And it anchors to the new right edge rather than to the old end plus the
 * delta, so a window whose end overshot the old edge (a rightOffset change
 * landing between the last clamp and the replacement) comes back onto the data
 * instead of hanging past it.
 */
export const reanchorViewportToRight = (
  viewport: ChartViewport,
  barsLength: number,
  oldBarsLength: number,
  rightOffset = 0,
): ChartViewport => {
  const endIndex = barsLength - 1 + rightOffset
  const oldMaxIndex = oldBarsLength - 1 + rightOffset

  if (viewport.startIndex <= 0 && viewport.endIndex >= oldMaxIndex) {
    return { startIndex: 0, endIndex }
  }

  const span = viewport.endIndex - viewport.startIndex

  return {
    startIndex: Math.max(0, endIndex - span),
    endIndex,
  }
}
