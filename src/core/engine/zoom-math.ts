import type { ChartViewport } from '../../types'
import type { NumericRange } from '../../types/data'
import { viewportSpan } from '../data/viewport-slicer'

/**
 * Pure zoom arithmetic shared by the wheel, pinch and axis-drag handlers.
 *
 * Everything here works in log space over the viewport SPAN (visible bars),
 * so a step in and the same step out cancel exactly, and every gesture is
 * anchored: the bar under the cursor (or between the fingers) keeps its x.
 *
 * The numbers are calibrated against TradingView's time scale: one mouse notch
 * is a 10% step, a trackpad tick is proportional to its delta, and a pinch maps
 * finger distance to scale roughly 1:1.
 */

/** Natural log of the span factor for one full mouse-wheel notch (10%). */
export const WHEEL_ZOOM_STEP = Math.log(1.1)

/** Wheel delta a mouse reports for one notch, in pixels. */
export const NOTCH_DELTA = 100

/**
 * A wheel delta at or above this magnitude is a discrete notch rather than a
 * tick of a continuous stream (trackpad, pinch). Trackpads send 1 to 10 per
 * event and rarely exceed 30 even on a fast flick; mice send 100 (Chrome,
 * Safari) or 3 in line mode (Firefox, scaled to ~96 below).
 */
export const NOTCH_THRESHOLD = 40

/**
 * Span factor per pixel of ctrl-wheel delta. Browsers synthesise ctrl-wheel
 * events for a trackpad pinch with deltas proportional to the finger distance
 * change; exp(-delta * 0.01) is the convention map and design tools use so the
 * chart scales with the fingers.
 */
export const PINCH_GAIN = 0.01

/** Span factor per pixel dragged along the time axis. */
export const AXIS_DRAG_GAIN = 0.005

/** Ease time constant for a burst of discrete notches, in ms. */
export const NOTCH_EASE_TAU_MS = 90

/**
 * Ease time constant for a continuous stream (trackpad, pinch-wheel), in ms.
 * Events arrive every 8 to 16 ms, so this adds well under a frame of lag while
 * still smoothing the quantised deltas a trackpad delivers.
 */
export const STREAM_EASE_TAU_MS = 40

/** Default floor for pixels per bar when the caller sets no `minBarSpacing`. */
export const DEFAULT_MIN_BAR_SPACING = 0.5

export type WheelDelta = { x: number; y: number }

type WheelDeltaInput = {
  deltaX: number
  deltaY: number
  /** `WheelEvent.deltaMode`: 0 pixel, 1 line, 2 page. */
  deltaMode: number
}

/**
 * Normalise a wheel event's deltas to pixels. Firefox reports lines (3 per
 * notch) and some inputs report pages; both are scaled so one notch lands near
 * `NOTCH_DELTA`, which is what the zoom curve is calibrated against.
 */
export const normalizeWheelDelta = (event: WheelDeltaInput): WheelDelta => {
  const factor = event.deltaMode === 1 ? 32 : event.deltaMode === 2 ? 120 : 1
  return { x: event.deltaX * factor, y: event.deltaY * factor }
}

export type WheelGesture =
  /** Scale the time axis. `logSpan > 0` widens the span (zooms out). */
  | { kind: 'zoom-time'; logSpan: number; discrete: boolean }
  /** Scale the price axis. `logRange > 0` widens the range (zooms out). */
  | { kind: 'zoom-price'; logRange: number }
  /** Pan along the time axis by this many pixels (positive = later bars). */
  | { kind: 'pan'; pixels: number }
  | { kind: 'none' }

export type WheelGestureInput = {
  delta: WheelDelta
  ctrlKey: boolean
  metaKey: boolean
  altKey: boolean
  shiftKey: boolean
  /** The cursor sits in the price-axis gutter rather than over the plot. */
  overPriceAxis: boolean
}

const clampUnit = (value: number): number => Math.max(-1, Math.min(1, value))

/**
 * Decide what a wheel event means.
 *
 * - Over the price axis, or with Alt/Option (or Cmd) held: price zoom.
 * - With Ctrl: time zoom. A trackpad pinch arrives as a ctrl-wheel with small
 *   fractional deltas and follows the pinch curve; a mouse notch with Ctrl held
 *   is a regular 10% step.
 * - Shift, or a mostly-horizontal delta: pan. This is a two-finger swipe.
 * - Otherwise: time zoom, proportional to the delta and capped at one notch.
 */
export const classifyWheel = (input: WheelGestureInput): WheelGesture => {
  const { x, y } = input.delta

  if (input.overPriceAxis || input.altKey || (input.metaKey && !input.ctrlKey)) {
    if (y === 0) return { kind: 'none' }
    return {
      kind: 'zoom-price',
      logRange: clampUnit(y / NOTCH_DELTA) * WHEEL_ZOOM_STEP,
    }
  }

  if (input.ctrlKey) {
    if (y === 0) return { kind: 'none' }
    const discrete = Math.abs(y) >= NOTCH_THRESHOLD
    return {
      kind: 'zoom-time',
      logSpan: discrete ? Math.sign(y) * WHEEL_ZOOM_STEP : y * PINCH_GAIN,
      discrete,
    }
  }

  if (input.shiftKey) {
    const pixels = x !== 0 ? x : y
    return pixels === 0 ? { kind: 'none' } : { kind: 'pan', pixels }
  }

  if (x !== 0 && Math.abs(x) > Math.abs(y)) {
    return { kind: 'pan', pixels: x }
  }

  if (y === 0) return { kind: 'none' }

  return {
    kind: 'zoom-time',
    logSpan: clampUnit(y / NOTCH_DELTA) * WHEEL_ZOOM_STEP,
    discrete: Math.abs(y) >= NOTCH_THRESHOLD,
  }
}

export type SpanLimits = {
  /** Fewest bars a zoom may leave on screen (`performance.viewportMinBars`). */
  minBars: number
  plotWidth: number
  /** Fewest pixels per bar; the zoom-out ceiling. Defaults to 0.5. */
  minBarSpacing?: number
  /** Most pixels per bar; the zoom-in floor. Defaults to half the plot width. */
  maxBarSpacing?: number
}

/**
 * Clamp a span to the bar-spacing limits. `maxBarSpacing` unset means "two
 * bars fill the plot", the same default as TradingView; `minBarSpacing` unset
 * means half a pixel per bar.
 */
export const clampSpan = (span: number, limits: SpanLimits): number => {
  const plotWidth = Math.max(1, limits.plotWidth)
  const maxSpacing = limits.maxBarSpacing ?? plotWidth / 2
  const minSpacing = limits.minBarSpacing ?? DEFAULT_MIN_BAR_SPACING
  const lo = Math.max(
    2,
    limits.minBars,
    plotWidth / Math.max(1e-6, maxSpacing),
  )
  const hi = Math.max(lo, plotWidth / Math.max(1e-6, minSpacing))
  if (!Number.isFinite(span)) return lo
  return Math.max(lo, Math.min(hi, span))
}

/**
 * Index-space position under a horizontal ratio of the plot. Bar `i` occupies
 * `[i, i + 1)`, so the point is `start + ratio * span` and the bar under it is
 * `floor` of that.
 */
export const anchorIndexAt = (viewport: ChartViewport, ratio: number): number =>
  viewport.startIndex + ratio * viewportSpan(viewport)

/**
 * Resize the span while keeping `anchorIndex` at `anchorRatio` of the plot.
 * This is the one formula every zoom gesture funnels through.
 */
export const spanAroundAnchor = (
  nextSpan: number,
  anchorIndex: number,
  anchorRatio: number,
): ChartViewport => {
  const startIndex = anchorIndex - anchorRatio * nextSpan
  return { startIndex, endIndex: startIndex + nextSpan - 1 }
}

/** One frame of an exponential approach; `tau` is the time constant in ms. */
export const easeTowards = (
  current: number,
  target: number,
  dtMs: number,
  tauMs: number,
): number => {
  if (dtMs <= 0) return current
  const alpha = 1 - Math.exp(-dtMs / tauMs)
  return current + (target - current) * alpha
}

export type RangeLimits = {
  minExtent: number
  maxExtent: number
}

/**
 * Scale a price range by `factor` about the value sitting at `anchorRatio`
 * (0 = bottom of the plot, 1 = top), bounded so it can neither collapse to a
 * point nor run off to infinity.
 */
export const rangeAroundAnchor = (
  range: NumericRange,
  factor: number,
  anchorRatio: number,
  limits: RangeLimits,
): NumericRange => {
  const extent = Math.max(1e-12, range.max - range.min)
  const ratio = Math.max(0, Math.min(1, anchorRatio))
  const anchor = range.min + ratio * extent
  const nextExtent = Math.max(
    limits.minExtent,
    Math.min(limits.maxExtent, extent * factor),
  )
  const min = anchor - ratio * nextExtent
  return { min, max: min + nextExtent }
}

/** Sane bounds for a price-axis zoom, derived from the range's own scale. */
export const priceRangeLimits = (range: NumericRange): RangeLimits => {
  const magnitude = Math.max(Math.abs(range.min), Math.abs(range.max), 1e-9)
  return {
    minExtent: magnitude * 1e-7,
    maxExtent: magnitude * 1e4,
  }
}
