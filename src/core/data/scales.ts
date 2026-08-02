import type { ChartBar, NumericRange } from '../../types'
import type { PriceScaleMode } from '../../types/viewport'

export const toSafeRange = (range: NumericRange): NumericRange => {
  if (
    Number.isFinite(range.min) &&
    Number.isFinite(range.max) &&
    Math.abs(range.max - range.min) > 1e-10
  ) {
    return range
  }

  return {
    min: 0,
    max: 1,
  }
}

export const computePriceRange = (
  bars: Array<ChartBar>,
  paddingRatio = 0.05,
): NumericRange => {
  if (bars.length === 0) {
    return { min: 0, max: 1 }
  }

  let min = Number.POSITIVE_INFINITY
  let max = Number.NEGATIVE_INFINITY

  for (const bar of bars) {
    min = Math.min(min, bar.low)
    max = Math.max(max, bar.high)
  }

  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return { min: 0, max: 1 }
  }

  const spread = Math.max(1e-9, max - min)

  return {
    min: min - spread * paddingRatio,
    max: max + spread * paddingRatio,
  }
}

/**
 * Compute price range adjusted for the active price scale mode.
 * For percentage/indexed modes, transforms bars into the target space
 * before computing min/max.
 */
export const computePriceRangeForMode = (
  bars: Array<ChartBar>,
  mode: PriceScaleMode,
  paddingRatio = 0.05,
): NumericRange => {
  if (mode === 'normal' || mode === 'logarithmic') {
    return computePriceRange(bars, paddingRatio)
  }

  if (bars.length === 0) {
    return mode === 'percentage' ? { min: -1, max: 1 } : { min: 99, max: 101 }
  }

  const basePrice = bars[0].close
  if (basePrice === 0) {
    return mode === 'percentage' ? { min: -1, max: 1 } : { min: 99, max: 101 }
  }

  let min = Number.POSITIVE_INFINITY
  let max = Number.NEGATIVE_INFINITY

  for (const bar of bars) {
    const highTransformed =
      mode === 'percentage'
        ? ((bar.high - basePrice) / basePrice) * 100
        : (bar.high / basePrice) * 100
    const lowTransformed =
      mode === 'percentage'
        ? ((bar.low - basePrice) / basePrice) * 100
        : (bar.low / basePrice) * 100

    min = Math.min(min, lowTransformed)
    max = Math.max(max, highTransformed)
  }

  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return mode === 'percentage' ? { min: -1, max: 1 } : { min: 99, max: 101 }
  }

  const spread = Math.max(1e-9, max - min)

  return {
    min: min - spread * paddingRatio,
    max: max + spread * paddingRatio,
  }
}

/**
 * Transform a raw price value to the target price scale mode's coordinate space.
 * For normal/log: identity (returns the raw price).
 * For percentage: returns the percentage change from basePrice.
 * For indexedTo100: returns the indexed value (basePrice = 100).
 */
export const transformPriceForMode = (
  price: number,
  basePrice: number,
  mode: PriceScaleMode,
): number => {
  if (mode === 'normal' || mode === 'logarithmic') {
    return price
  }

  if (basePrice === 0) {
    return mode === 'percentage' ? 0 : 100
  }

  if (mode === 'percentage') {
    return ((price - basePrice) / basePrice) * 100
  }

  // indexedTo100
  return (price / basePrice) * 100
}

export const computeNumericRange = (
  values: Array<number>,
  fallback: NumericRange,
  paddingRatio = 0.08,
): NumericRange => {
  if (values.length === 0) {
    return fallback
  }

  let min = Number.POSITIVE_INFINITY
  let max = Number.NEGATIVE_INFINITY

  for (const value of values) {
    if (!Number.isFinite(value)) {
      continue
    }

    min = Math.min(min, value)
    max = Math.max(max, value)
  }

  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return fallback
  }

  if (max <= min) {
    return {
      min: min - 1,
      max: max + 1,
    }
  }

  const spread = max - min

  return {
    min: min - spread * paddingRatio,
    max: max + spread * paddingRatio,
  }
}

export const valueToY = (
  value: number,
  range: NumericRange,
  height: number,
): number => {
  const safe = toSafeRange(range)
  const ratio = (value - safe.min) / (safe.max - safe.min)
  const clamped = Math.max(0, Math.min(1, ratio))
  return height - clamped * height
}

export const yToValue = (
  y: number,
  range: NumericRange,
  height: number,
): number => {
  const safe = toSafeRange(range)
  const ratio = 1 - y / Math.max(1, height)
  return safe.min + ratio * (safe.max - safe.min)
}

// ── Logarithmic scale support ──

export type PriceScale = 'linear' | 'log'

const safeLog = (value: number): number => Math.log(Math.max(1e-10, value))

export const valueToYLog = (
  value: number,
  range: NumericRange,
  height: number,
): number => {
  const safe = toSafeRange(range)
  const logMin = safeLog(safe.min)
  const logMax = safeLog(safe.max)
  const logSpread = logMax - logMin
  if (Math.abs(logSpread) < 1e-10) return height / 2
  const ratio = (safeLog(value) - logMin) / logSpread
  const clamped = Math.max(0, Math.min(1, ratio))
  return height - clamped * height
}

export const yToValueLog = (
  y: number,
  range: NumericRange,
  height: number,
): number => {
  const safe = toSafeRange(range)
  const logMin = safeLog(safe.min)
  const logMax = safeLog(safe.max)
  const ratio = 1 - y / Math.max(1, height)
  return Math.exp(logMin + ratio * (logMax - logMin))
}

/** Unified value→Y converter that handles all price scale modes. */
export const valueToYScaled = (
  value: number,
  range: NumericRange,
  height: number,
  scale: PriceScale | PriceScaleMode = 'linear',
): number => {
  if (scale === 'log' || scale === 'logarithmic') {
    return valueToYLog(value, range, height)
  }
  return valueToY(value, range, height)
}

/** Unified Y→value converter that handles all price scale modes. */
export const yToValueScaled = (
  y: number,
  range: NumericRange,
  height: number,
  scale: PriceScale | PriceScaleMode = 'linear',
): number => {
  if (scale === 'log' || scale === 'logarithmic') {
    return yToValueLog(y, range, height)
  }
  return yToValue(y, range, height)
}

// ── Scale margins & inversion support ──

export type ScaleMargins = { top: number; bottom: number }

/**
 * Apply scale margins and optional inversion to a Y coordinate.
 * Margins shrink the usable area: top margin pushes the top down,
 * bottom margin pushes the bottom up.
 * Inverted flips the Y coordinate within the (possibly margined) area.
 */
export const applyScaleTransform = (
  y: number,
  height: number,
  margins?: ScaleMargins,
  inverted?: boolean,
): number => {
  const marginTop = margins
    ? Math.max(0, Math.min(0.5, margins.top)) * height
    : 0
  const marginBottom = margins
    ? Math.max(0, Math.min(0.5, margins.bottom)) * height
    : 0
  const usableHeight = Math.max(1, height - marginTop - marginBottom)

  // Map from [0, height] to [marginTop, marginTop + usableHeight]
  const ratio = Math.max(0, Math.min(1, y / Math.max(1, height)))
  let mapped = marginTop + ratio * usableHeight

  if (inverted) {
    mapped = height - mapped
  }

  return mapped
}

/**
 * Inverse of applyScaleTransform — map from screen Y back to logical Y.
 */
export const inverseScaleTransform = (
  screenY: number,
  height: number,
  margins?: ScaleMargins,
  inverted?: boolean,
): number => {
  let y = screenY

  if (inverted) {
    y = height - y
  }

  const marginTop = margins
    ? Math.max(0, Math.min(0.5, margins.top)) * height
    : 0
  const marginBottom = margins
    ? Math.max(0, Math.min(0.5, margins.bottom)) * height
    : 0
  const usableHeight = Math.max(1, height - marginTop - marginBottom)

  const ratio = Math.max(0, Math.min(1, (y - marginTop) / usableHeight))
  return ratio * height
}

/**
 * Expand a price range to account for scale margins, and optionally invert.
 * Margins are ratios (0–0.5) of chart height reserved at top/bottom.
 * This makes the data occupy only the middle portion of the chart.
 * When inverted, the range is flipped (min > max) so higher prices appear at the bottom.
 */
export const expandRangeForMargins = (
  range: NumericRange,
  margins?: ScaleMargins,
  inverted?: boolean,
): NumericRange => {
  let result = range

  if (margins) {
    const topRatio = Math.max(0, Math.min(0.5, margins.top))
    const bottomRatio = Math.max(0, Math.min(0.5, margins.bottom))

    if (topRatio !== 0 || bottomRatio !== 0) {
      const spread = range.max - range.min
      const usable = Math.max(0.1, 1 - topRatio - bottomRatio)

      result = {
        min: range.min - spread * (bottomRatio / usable),
        max: range.max + spread * (topRatio / usable),
      }
    }
  }

  if (inverted) {
    return { min: result.max, max: result.min }
  }

  return result
}

/**
 * Inverse-transform a display value back to raw price.
 * For normal/log: identity.
 * For percentage: converts back from % change.
 * For indexedTo100: converts back from indexed value.
 */
export const inversePriceForMode = (
  displayValue: number,
  basePrice: number,
  mode: PriceScaleMode,
): number => {
  if (mode === 'normal' || mode === 'logarithmic') {
    return displayValue
  }

  if (basePrice === 0) {
    return 0
  }

  if (mode === 'percentage') {
    return basePrice * (1 + displayValue / 100)
  }

  // indexedTo100
  return (displayValue / 100) * basePrice
}
