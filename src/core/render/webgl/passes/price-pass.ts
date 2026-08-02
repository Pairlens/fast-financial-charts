import { findBarIndexByTs } from '../../../data/binary-search'
import { normalizeSeriesForCompare } from '../../../data/compare-normalization'
import {
  isPriceTransformChartType,
  transformBarsForChartType,
} from '../../../data/price-transforms'
import {
  computePriceRangeForMode,
  expandRangeForMargins,
} from '../../../data/scales'
import { BAR_FLOATS_PER_INSTANCE } from '../programs/bar-program'
import { FLOATS_PER_INSTANCE } from '../programs/candle-program'
import { computeViewportUniforms } from '../shaders/viewport-uniforms'
import type { ScaleMargins } from '../../../data/scales'
import type { AreaProgram } from '../programs/area-program'
import type { BarProgram } from '../programs/bar-program'
import type { CandleProgram } from '../programs/candle-program'
import type { LineProgram } from '../programs/line-program'
import type { ThickLineProgram } from '../programs/thick-line-program'
import type { PriceScaleMode } from '../../../../types/viewport'
import type {
  ChartBar,
  ChartSeriesInput,
  ChartTheme,
  ChartType,
  ChartViewport,
  CompareMode,
  NumericRange,
} from '../../../../types'

type PricePassInput = {
  series: Array<ChartSeriesInput>
  viewport: ChartViewport
  compareMode: CompareMode
  chartType: ChartType
  priceScaleMode: PriceScaleMode
  theme: ChartTheme
  candleProgram: CandleProgram
  barProgram: BarProgram
  lineProgram: LineProgram
  areaProgram: AreaProgram
  thickLineProgram: ThickLineProgram
  yRangeOverride?: NumericRange | null
  scaleMargins?: ScaleMargins
  inverted?: boolean
  histogramBaseValue?: number
  /** When true, skip buffer fills and only update viewport uniforms + redraw. */
  viewportOnly?: boolean
  /**
   * When true, only the last bar of the primary series mutated (same-bucket
   * live tick). Chart types with a cheap partial path (candles, bar,
   * histogram) rewrite just the last bar's instances and upload them via
   * bufferSubData; all other cases fall back to the full rebuild.
   */
  lastBarOnly?: boolean
  /** Physical pixel width of the WebGL canvas (canvas.width after DPR scaling) */
  canvasPixelWidth: number
  /** Physical pixel height of the WebGL canvas (canvas.height after DPR scaling) */
  canvasPixelHeight: number
  /** Device pixel ratio for line width scaling */
  dpr: number
  /** Per-engine render state (scratch buffers + cached fill counts) */
  state: PricePassState
}

export type PricePassResult = {
  yRange: NumericRange
  primaryVisibleBars: Array<ChartBar>
}

// ── NDC conversion functions (kept for compare mode code paths) ──

const toNdcY = (value: number, range: NumericRange): number => {
  const spread = range.max - range.min
  if (Math.abs(spread) < 1e-10) return 0
  const ratio = (value - range.min) / spread
  return Math.max(-1, Math.min(1, ratio * 2 - 1))
}

const safeLog = (v: number): number => Math.log(Math.max(1e-10, v))

const toNdcYLog = (value: number, range: NumericRange): number => {
  const logMin = safeLog(range.min)
  const logMax = safeLog(range.max)
  const logSpread = logMax - logMin
  if (Math.abs(logSpread) < 1e-10) return 0
  const ratio = (safeLog(value) - logMin) / logSpread
  return Math.max(-1, Math.min(1, ratio * 2 - 1))
}

const toNdcYForMode = (
  value: number,
  range: NumericRange,
  mode: PriceScaleMode,
): number => {
  return mode === 'logarithmic' ? toNdcYLog(value, range) : toNdcY(value, range)
}

const toNdcX = (index: number, viewport: ChartViewport): number => {
  const total = Math.max(1, viewport.endIndex - viewport.startIndex + 1)
  return ((index - viewport.startIndex + 0.5) / total) * 2 - 1
}

// ── Per-engine render state ──

/**
 * Mutable render state owned by a single ChartEngine instance.
 *
 * Holds grow-only scratch buffers (reused across frames, zero-alloc hot path)
 * and the cached fill counts used by viewport-only redraws. This state MUST
 * be per-engine: cached counts refer to data uploaded into that engine's GPU
 * buffers, so sharing them across chart instances would draw one chart's
 * buffers with another chart's counts.
 *
 * Create once per engine via createPricePassState() — never per frame.
 */
export type PricePassState = {
  /** Scratch buffer for compare-mode line points: [x0, y0, x1, y1, ...] */
  linePointsBuf: Float32Array
  /**
   * Flat buffer for smoothed points: [index0, price0, index1, price1, ...]
   * 2 floats per point. Grows but never shrinks.
   */
  smoothedBuf: Float32Array
  // Cached fill results (for viewport-only redraws)
  cachedCandleInstanceCount: number
  cachedBarInstanceCount: number
  cachedHistogramInstanceCount: number
  /** Cached instance count for highLow/column range-body fills */
  cachedRangeInstanceCount: number
  cachedThickLineVertexCount: number
  cachedAreaVertexCount: number
  lastFillChartType: string | null
  /**
   * Cached output of the price transform (renko/lineBreak/kagi/pointFigure).
   * Valid only while lastFillChartType matches the transform chart type;
   * recomputed on every non-viewportOnly fill. Lets viewport-only redraws
   * recompute the visible y-range without re-running the O(N) transform.
   */
  transformedBars: Array<ChartBar>
}

export const createPricePassState = (): PricePassState => ({
  linePointsBuf: new Float32Array(0),
  smoothedBuf: new Float32Array(0),
  cachedCandleInstanceCount: 0,
  cachedBarInstanceCount: 0,
  cachedHistogramInstanceCount: 0,
  cachedRangeInstanceCount: 0,
  cachedThickLineVertexCount: 0,
  cachedAreaVertexCount: 0,
  lastFillChartType: null,
  transformedBars: [],
})

const ensureLineBuffer = (
  state: PricePassState,
  pointCount: number,
): Float32Array => {
  const needed = pointCount * 2
  if (state.linePointsBuf.length < needed) {
    state.linePointsBuf = new Float32Array(needed)
  }
  return state.linePointsBuf
}

// ── Catmull-Rom spline smoothing (zero-alloc, flat Float32Array output) ──

const ensureSmoothedBuffer = (
  state: PricePassState,
  pointCount: number,
): Float32Array => {
  const needed = pointCount * 2
  if (state.smoothedBuf.length < needed) {
    state.smoothedBuf = new Float32Array(needed)
  }
  return state.smoothedBuf
}

/**
 * CPU-side Catmull-Rom interpolation: takes N raw bars and produces ~(N-1)*subdivisions + 1
 * smoothed points with fractional bar indices into a flat Float32Array.
 *
 * Zero heap allocations on the hot path (reuses per-engine buffer).
 * Runs only on data change (not viewportOnly), so scrolling doesn't re-compute.
 */
const applyCatmullRomSmoothing = (
  state: PricePassState,
  bars: Array<ChartBar>,
  subdivisions = 4,
  tension = 0.5,
): number => {
  if (bars.length === 0) return 0
  if (bars.length === 1) {
    const buf = ensureSmoothedBuffer(state, 1)
    buf[0] = 0
    buf[1] = bars[0].close
    return 1
  }

  const totalPoints = (bars.length - 1) * subdivisions + 1
  const buf = ensureSmoothedBuffer(state, totalPoints)
  const alpha = tension / 3
  let offset = 0

  for (let i = 0; i < bars.length - 1; i += 1) {
    const p0 = bars[Math.max(0, i - 1)].close
    const p1 = bars[i].close
    const p2 = bars[i + 1].close
    const p3 = bars[Math.min(bars.length - 1, i + 2)].close

    // Catmull-Rom → cubic Bezier control points (in price dimension only)
    const cp1 = p1 + (p2 - p0) * alpha
    const cp2 = p2 - (p3 - p1) * alpha

    for (let s = 0; s < subdivisions; s += 1) {
      const t = s / subdivisions
      const t2 = t * t
      const t3 = t2 * t
      const mt = 1 - t
      const mt2 = mt * mt
      const mt3 = mt2 * mt

      buf[offset++] = i + t // index
      buf[offset++] = mt3 * p1 + 3 * mt2 * t * cp1 + 3 * mt * t2 * cp2 + t3 * p2 // price
    }
  }

  // Last point
  buf[offset++] = bars.length - 1
  buf[offset++] = bars[bars.length - 1].close

  return totalPoints
}

/**
 * Step-line point expansion: each close is held flat until the next bar,
 * producing right-angle steps. For bars [(0,c0), (1,c1), (2,c2)] the output
 * is [(0,c0), (1,c0), (1,c1), (2,c1), (2,c2)] — 2N-1 points.
 *
 * Writes [index, price] pairs into the per-engine smoothed buffer (same flat
 * layout the thick-line/area fillers consume). Zero-alloc on the hot path.
 * Exported for unit tests.
 */
export const fillStepLinePoints = (
  state: PricePassState,
  bars: Array<ChartBar>,
): number => {
  if (bars.length === 0) return 0

  const pointCount = bars.length * 2 - 1
  const buf = ensureSmoothedBuffer(state, pointCount)
  let offset = 0

  for (let i = 0; i < bars.length; i += 1) {
    const close = bars[i].close
    buf[offset++] = i
    buf[offset++] = close
    if (i < bars.length - 1) {
      // Hold the close flat until the next bar's x position
      buf[offset++] = i + 1
      buf[offset++] = close
    }
  }

  return pointCount
}

/**
 * Write raw [index, value] pairs for a single OHLC field into the per-engine
 * smoothed buffer (consumed by fillThickLineBuffer). Used by hlcArea lines.
 */
const fillFieldLinePoints = (
  state: PricePassState,
  bars: Array<ChartBar>,
  field: 'high' | 'low' | 'close',
): number => {
  const buf = ensureSmoothedBuffer(state, bars.length)
  let offset = 0
  for (let i = 0; i < bars.length; i += 1) {
    buf[offset++] = i
    buf[offset++] = bars[i][field]
  }
  return bars.length
}

/**
 * Fill the thick-line triangle-strip buffer directly from the flat smoothed buffer.
 * Each point produces 2 vertices (side -1 and +1) with neighbor data.
 * 7 floats per vertex: [barIndex, price, prevBarIndex, prevPrice, nextBarIndex, nextPrice, side]
 *
 * Reads from the per-engine smoothed buffer, writes into ThickLineProgram's buffer.
 */
const fillThickLineBuffer = (
  state: PricePassState,
  pointCount: number,
  thickLineProgram: ThickLineProgram,
): number => {
  if (pointCount < 2) return 0

  const vertexCount = pointCount * 2
  const dst = thickLineProgram.ensureBuffer(vertexCount)
  const src = state.smoothedBuf
  let dstOff = 0

  for (let i = 0; i < pointCount; i += 1) {
    const currOff = i * 2
    const prevOff = Math.max(0, i - 1) * 2
    const nextOff = Math.min(pointCount - 1, i + 1) * 2

    const ci = src[currOff]
    const cp = src[currOff + 1]
    const pi = src[prevOff]
    const pp = src[prevOff + 1]
    const ni = src[nextOff]
    const np = src[nextOff + 1]

    // Vertex with side = -1
    dst[dstOff++] = ci
    dst[dstOff++] = cp
    dst[dstOff++] = pi
    dst[dstOff++] = pp
    dst[dstOff++] = ni
    dst[dstOff++] = np
    dst[dstOff++] = -1.0

    // Vertex with side = +1
    dst[dstOff++] = ci
    dst[dstOff++] = cp
    dst[dstOff++] = pi
    dst[dstOff++] = pp
    dst[dstOff++] = ni
    dst[dstOff++] = np
    dst[dstOff++] = 1.0
  }

  return vertexCount
}

/**
 * Fill the gradient area triangle-strip buffer directly from the flat smoothed buffer.
 * Each point produces 2 vertices: [index, price] (line) + [index, baseline] (bottom).
 * The vertex shader uses gl_VertexID % 2 for gradient interpolation.
 *
 * Reads from the per-engine smoothed buffer, writes into AreaProgram's buffer.
 */
const fillGradientAreaBuffer = (
  state: PricePassState,
  pointCount: number,
  areaProgram: AreaProgram,
  baselinePrice: number,
): number => {
  if (pointCount < 2) return 0

  const vertexCount = pointCount * 2
  const dst = areaProgram.ensureBuffer(vertexCount)
  const src = state.smoothedBuf
  let dstOff = 0

  for (let i = 0; i < pointCount; i += 1) {
    const srcOff = i * 2
    const idx = src[srcOff]
    const price = src[srcOff + 1]

    // Even vertex: line point (top, v_gradientPos = 0.0)
    dst[dstOff++] = idx
    dst[dstOff++] = price

    // Odd vertex: baseline point (bottom, v_gradientPos = 1.0)
    dst[dstOff++] = idx
    dst[dstOff++] = baselinePrice
  }

  return vertexCount
}

/**
 * Fill the area triangle-strip buffer with a per-bar high/low band:
 * alternating [index, high] (top) and [index, low] (bottom) vertices.
 * Used by the hlcArea chart type.
 */
const fillHlcBandBuffer = (
  bars: Array<ChartBar>,
  areaProgram: AreaProgram,
): number => {
  if (bars.length < 2) return 0

  const vertexCount = bars.length * 2
  const dst = areaProgram.ensureBuffer(vertexCount)
  let dstOff = 0

  for (let i = 0; i < bars.length; i += 1) {
    // Even vertex: high (top edge)
    dst[dstOff++] = i
    dst[dstOff++] = bars[i].high

    // Odd vertex: low (bottom edge)
    dst[dstOff++] = i
    dst[dstOff++] = bars[i].low
  }

  return vertexCount
}

/**
 * Write candle instances with raw [open, high, low, close, barIndex, partType] for ALL bars.
 * 6 floats per instance, 2 instances per bar (body + wick).
 *
 * hollowCandles uses body partType 2: the shader renders up bodies as
 * border-only outlines (down bodies stay filled).
 *
 * indexOffset shifts every instance's x-index by a constant — used by the
 * price-transform chart types to right-align an N:M transformed series with
 * the source index space the viewport was computed for.
 */
const fillCandleInstances = (
  bars: Array<ChartBar>,
  chartType: 'candles' | 'heikinAshi' | 'hollowCandles',
  candleProgram: CandleProgram,
  indexOffset = 0,
): number => {
  if (bars.length === 0) {
    return 0
  }

  const instanceCount = bars.length * 2 // body + wick per bar
  const buf = candleProgram.ensureBuffer(instanceCount)
  const bodyPartType = chartType === 'hollowCandles' ? 2 : 0

  let previousHaOpen = bars[0]?.open ?? 0
  let previousHaClose = bars[0]?.close ?? 0
  let offset = 0

  for (let index = 0; index < bars.length; index += 1) {
    const source = bars[index]
    let open = source.open
    let high = source.high
    let low = source.low
    let close = source.close

    if (chartType === 'heikinAshi') {
      close = (source.open + source.high + source.low + source.close) / 4
      open = (previousHaOpen + previousHaClose) / 2
      high = Math.max(source.high, open, close)
      low = Math.min(source.low, open, close)
      previousHaOpen = open
      previousHaClose = close
    }

    // Body instance — raw prices + barIndex
    buf[offset++] = open
    buf[offset++] = high
    buf[offset++] = low
    buf[offset++] = close
    buf[offset++] = index + indexOffset
    buf[offset++] = bodyPartType // body (0) or hollow body (2)

    // Wick instance — same raw prices
    buf[offset++] = open
    buf[offset++] = high
    buf[offset++] = low
    buf[offset++] = close
    buf[offset++] = index + indexOffset
    buf[offset++] = 1 // wick
  }

  return instanceCount
}

/**
 * Write OHLC bar instances with raw data for ALL bars.
 * Each bar produces 3 instances: range line (0), open tick (1), close tick (2).
 */
const fillBarInstances = (
  bars: Array<ChartBar>,
  barProgram: BarProgram,
): number => {
  if (bars.length === 0) {
    return 0
  }

  const instanceCount = bars.length * 3
  const buf = barProgram.ensureBuffer(instanceCount)

  let offset = 0

  for (let index = 0; index < bars.length; index += 1) {
    const source = bars[index]

    // Range line instance (partType=0)
    buf[offset++] = source.open
    buf[offset++] = source.high
    buf[offset++] = source.low
    buf[offset++] = source.close
    buf[offset++] = index
    buf[offset++] = 0

    // Open tick instance (partType=1)
    buf[offset++] = source.open
    buf[offset++] = source.high
    buf[offset++] = source.low
    buf[offset++] = source.close
    buf[offset++] = index
    buf[offset++] = 1

    // Close tick instance (partType=2)
    buf[offset++] = source.open
    buf[offset++] = source.high
    buf[offset++] = source.low
    buf[offset++] = source.close
    buf[offset++] = index
    buf[offset++] = 2
  }

  return instanceCount
}

/**
 * Write histogram instances with raw data for ALL bars.
 * Each bar = 1 body instance (rectangle from base to close).
 */
const fillHistogramInstances = (
  bars: Array<ChartBar>,
  candleProgram: CandleProgram,
  histogramBase: number,
): number => {
  if (bars.length === 0) {
    return 0
  }

  const instanceCount = bars.length // 1 instance per bar (body only)
  const buf = candleProgram.ensureBuffer(instanceCount)

  let offset = 0

  for (let index = 0; index < bars.length; index += 1) {
    const close = bars[index].close
    const top = Math.max(close, histogramBase)
    const bottom = Math.min(close, histogramBase)

    // Treat as body with open=base, close=value for up/down coloring
    buf[offset++] = histogramBase // open (base)
    buf[offset++] = top // high
    buf[offset++] = bottom // low
    buf[offset++] = close // close
    buf[offset++] = index
    buf[offset++] = 0 // body (not wick)
  }

  return instanceCount
}

/**
 * Compute the [open, high, low, close] encoding for a highLow/column
 * range-body instance (partType 3).
 *
 * The shader positions partType-3 rects between high/low and colors by
 * close >= open, so:
 *   - open slot carries the previous close (up/down vs prior bar)
 *   - highLow: high/low slots carry the bar's high/low
 *   - column:  high/low slots carry max/min of (base, close)
 */
const writeRangeInstance = (
  buf: Float32Array,
  offset: number,
  bar: ChartBar,
  previousClose: number,
  index: number,
  chartType: 'highLow' | 'column',
  base: number,
): void => {
  const top = chartType === 'highLow' ? bar.high : Math.max(base, bar.close)
  const bottom = chartType === 'highLow' ? bar.low : Math.min(base, bar.close)

  buf[offset] = previousClose // open slot → drives up/down color
  buf[offset + 1] = top
  buf[offset + 2] = bottom
  buf[offset + 3] = bar.close
  buf[offset + 4] = index
  buf[offset + 5] = 3 // range body
}

/**
 * Write range-body instances (partType 3) for the highLow and column chart
 * types. 1 instance per bar; colored by close vs previous close.
 */
const fillRangeInstances = (
  bars: Array<ChartBar>,
  candleProgram: CandleProgram,
  chartType: 'highLow' | 'column',
  base: number,
): number => {
  if (bars.length === 0) {
    return 0
  }

  const instanceCount = bars.length
  const buf = candleProgram.ensureBuffer(instanceCount)

  for (let index = 0; index < bars.length; index += 1) {
    const bar = bars[index]
    // First bar has no previous close: color by its own open instead
    const previousClose = index > 0 ? bars[index - 1].close : bar.open
    writeRangeInstance(
      buf,
      index * FLOATS_PER_INSTANCE,
      bar,
      previousClose,
      index,
      chartType,
      base,
    )
  }

  return instanceCount
}

// ── Incremental last-bar instance updates (live-tick hot path) ──
//
// These write only the last bar's instances into the program's CPU mirror
// (returned by ensureBuffer — no realloc since the instance count is
// unchanged) and upload just those instances via bufferSubData. The mirror
// stays byte-identical to what a full fill would produce, so subsequent
// viewport-only redraws and full re-uploads remain correct.
//
// Zero heap allocations on this path.

/**
 * Rewrite the last bar's 2 candle instances (body + wick) and upload them.
 * Valid for plain and hollow candles — heikinAshi last-bar values depend on
 * the previous HA bar and take the full-rebuild path instead.
 */
const updateLastBarCandleInstances = (
  bars: Array<ChartBar>,
  candleProgram: CandleProgram,
  bodyPartType: 0 | 2,
): void => {
  const lastIndex = bars.length - 1
  const source = bars[lastIndex]
  const buf = candleProgram.ensureBuffer(bars.length * 2)
  const firstInstance = lastIndex * 2
  let offset = firstInstance * FLOATS_PER_INSTANCE

  // Body instance — raw prices + barIndex
  buf[offset++] = source.open
  buf[offset++] = source.high
  buf[offset++] = source.low
  buf[offset++] = source.close
  buf[offset++] = lastIndex
  buf[offset++] = bodyPartType // body (0) or hollow body (2)

  // Wick instance — same raw prices
  buf[offset++] = source.open
  buf[offset++] = source.high
  buf[offset++] = source.low
  buf[offset++] = source.close
  buf[offset++] = lastIndex
  buf[offset++] = 1 // wick

  candleProgram.updateInstances(firstInstance, 2)
}

/**
 * Rewrite the last bar's 3 OHLC-bar instances (range/open/close) and upload them.
 */
const updateLastBarBarInstances = (
  bars: Array<ChartBar>,
  barProgram: BarProgram,
): void => {
  const lastIndex = bars.length - 1
  const source = bars[lastIndex]
  const buf = barProgram.ensureBuffer(bars.length * 3)
  const firstInstance = lastIndex * 3
  let offset = firstInstance * BAR_FLOATS_PER_INSTANCE

  for (let partType = 0; partType < 3; partType += 1) {
    buf[offset++] = source.open
    buf[offset++] = source.high
    buf[offset++] = source.low
    buf[offset++] = source.close
    buf[offset++] = lastIndex
    buf[offset++] = partType
  }

  barProgram.updateInstances(firstInstance, 3)
}

/**
 * Rewrite the last bar's single histogram instance and upload it.
 */
const updateLastBarHistogramInstance = (
  bars: Array<ChartBar>,
  candleProgram: CandleProgram,
  histogramBase: number,
): void => {
  const lastIndex = bars.length - 1
  const close = bars[lastIndex].close
  const top = Math.max(close, histogramBase)
  const bottom = Math.min(close, histogramBase)
  const buf = candleProgram.ensureBuffer(bars.length)
  let offset = lastIndex * FLOATS_PER_INSTANCE

  buf[offset++] = histogramBase // open (base)
  buf[offset++] = top // high
  buf[offset++] = bottom // low
  buf[offset++] = close // close
  buf[offset++] = lastIndex
  buf[offset++] = 0 // body (not wick)

  candleProgram.updateInstances(lastIndex, 1)
}

/**
 * Rewrite the last bar's single range-body instance (highLow/column) and
 * upload it. Safe as a partial update: the previous close a live tick reads
 * belongs to the second-to-last bar, which never mutates on a tick.
 */
const updateLastBarRangeInstance = (
  bars: Array<ChartBar>,
  candleProgram: CandleProgram,
  chartType: 'highLow' | 'column',
  base: number,
): void => {
  const lastIndex = bars.length - 1
  const bar = bars[lastIndex]
  const previousClose = lastIndex > 0 ? bars[lastIndex - 1].close : bar.open
  const buf = candleProgram.ensureBuffer(bars.length)

  writeRangeInstance(
    buf,
    lastIndex * FLOATS_PER_INSTANCE,
    bar,
    previousClose,
    lastIndex,
    chartType,
    base,
  )

  candleProgram.updateInstances(lastIndex, 1)
}

// ── Cached hex→RGBA parse (avoids per-frame string parsing) ──

const hexColorCache = new Map<string, [number, number, number, number]>()

const hexToColor = (hex: string): [number, number, number, number] => {
  let cached = hexColorCache.get(hex)
  if (cached) {
    return cached
  }
  const normalized = hex.startsWith('#') ? hex.slice(1) : hex
  cached = [
    Number.parseInt(normalized.slice(0, 2), 16) / 255,
    Number.parseInt(normalized.slice(2, 4), 16) / 255,
    Number.parseInt(normalized.slice(4, 6), 16) / 255,
    1,
  ]
  hexColorCache.set(hex, cached)
  return cached
}

// ── Safe min/max without spread (avoids stack overflow on large arrays) ──

const minMaxOfValues = (values: Array<number>): NumericRange => {
  let min = Number.POSITIVE_INFINITY
  let max = Number.NEGATIVE_INFINITY
  // eslint-disable-next-line @typescript-eslint/prefer-for-of -- hot path: per-frame min/max scan over large price arrays; index loop avoids iterator overhead
  for (let i = 0; i < values.length; i += 1) {
    const v = values[i]
    if (v < min) min = v
    if (v > max) max = v
  }
  return { min, max }
}

export const renderPricePass = (input: PricePassInput): PricePassResult => {
  const state = input.state
  const visibleSeries = input.series.filter((item) => item.visible !== false)
  const primarySeries = visibleSeries[0]
  const mode = input.priceScaleMode

  if (!primarySeries) {
    return {
      yRange: { min: 0, max: 1 },
      primaryVisibleBars: [],
    }
  }

  const primaryVisibleBars = primarySeries.bars.slice(
    input.viewport.startIndex,
    input.viewport.endIndex + 1,
  )
  // For percentage/indexed modes, compute the range in the transformed space
  const computedPrimaryRange = computePriceRangeForMode(
    primaryVisibleBars,
    mode,
  )
  const marginedRange = expandRangeForMargins(
    computedPrimaryRange,
    input.scaleMargins,
    input.inverted,
  )
  const yRange = input.yRangeOverride ?? marginedRange

  // Base price for percentage/indexed transforms (first visible bar's close)
  const basePrice = primaryVisibleBars[0]?.close ?? 0

  // Compute viewport uniforms for GPU-side NDC transform
  const viewportUniforms = computeViewportUniforms(
    input.viewport,
    yRange,
    mode,
    basePrice,
    input.canvasPixelWidth,
    input.canvasPixelHeight,
  )

  // ── Compare mode: multi-series paths (still use NDC-baked data + identity uniforms) ──

  if (visibleSeries.length > 1 && input.compareMode === 'dual-axis') {
    for (
      let seriesIndex = 0;
      seriesIndex < visibleSeries.length;
      seriesIndex += 1
    ) {
      const series = visibleSeries[seriesIndex]
      const visibleBars = series.bars.slice(
        input.viewport.startIndex,
        input.viewport.endIndex + 1,
      )
      const seriesRange = computePriceRangeForMode(visibleBars, mode)

      // Compare mode: NDC-baked data with identity uniforms (no transform in shader)
      const start = Math.max(0, input.viewport.startIndex)
      const end = Math.min(series.bars.length - 1, input.viewport.endIndex)
      if (end >= start) {
        const count = end - start + 1
        const buf = ensureLineBuffer(state, count)
        let offset = 0
        for (let idx = start; idx <= end; idx += 1) {
          buf[offset++] = toNdcX(idx, input.viewport)
          buf[offset++] = toNdcYForMode(
            series.bars[idx].close,
            seriesRange,
            mode,
          )
        }
        const color =
          series.color ?? (seriesIndex === 0 ? '#4aa8ff' : '#ffb020')
        input.lineProgram.draw(buf.subarray(0, offset), hexToColor(color))
      }
    }

    return {
      yRange,
      primaryVisibleBars,
    }
  }

  if (visibleSeries.length > 1) {
    const normalized = normalizeSeriesForCompare(
      visibleSeries,
      input.compareMode,
      input.viewport,
    )
    const values = normalized.flatMap((series) =>
      series.points.map((point) => point.value),
    )
    const compareRange =
      input.yRangeOverride ??
      (values.length > 0 ? minMaxOfValues(values) : yRange)

    for (const comparable of normalized) {
      const buf = ensureLineBuffer(state, comparable.points.length)
      let offset = 0

      for (const point of comparable.points) {
        const xIndex = findBarIndexByTs(primarySeries.bars, point.ts)
        if (
          xIndex < input.viewport.startIndex ||
          xIndex > input.viewport.endIndex
        ) {
          continue
        }
        buf[offset++] = toNdcX(xIndex, input.viewport)
        buf[offset++] = toNdcY(point.value, compareRange)
      }

      if (offset >= 4) {
        input.lineProgram.draw(
          buf.subarray(0, offset),
          hexToColor(comparable.color),
        )
      }
    }

    return {
      yRange: compareRange,
      primaryVisibleBars,
    }
  }

  // ── Single-series primary rendering (uses all-bars buffer + viewport uniforms) ──

  const isViewportOnly =
    input.viewportOnly === true && state.lastFillChartType === input.chartType

  // ── Price-transform types: renko / lineBreak / kagi / pointFigure ──
  //
  // Time-independent series: source candles are transformed into synthetic
  // bricks/lines/columns (N:M — the output count differs from the input),
  // then rendered through the candle instance path. The transformed bars are
  // right-aligned to the source index space (the newest brick shares the
  // newest source bar's x-index) so the default tail viewport shows the
  // latest bricks. y-range and primaryVisibleBars are computed from the
  // transformed bars inside the viewport window, and each brick's ts is the
  // ts of the source candle that completed it.

  if (isPriceTransformChartType(input.chartType)) {
    if (!isViewportOnly) {
      state.transformedBars = transformBarsForChartType(
        primarySeries.bars,
        input.chartType,
      )
    }

    const transformedBars = state.transformedBars
    const indexOffset = primarySeries.bars.length - transformedBars.length
    const visibleStart = Math.max(0, input.viewport.startIndex - indexOffset)
    const visibleEnd = Math.min(
      transformedBars.length - 1,
      input.viewport.endIndex - indexOffset,
    )
    const transformedVisibleBars =
      visibleEnd >= visibleStart
        ? transformedBars.slice(visibleStart, visibleEnd + 1)
        : []

    const transformedRange = computePriceRangeForMode(
      transformedVisibleBars,
      mode,
    )
    const transformedYRange =
      input.yRangeOverride ??
      expandRangeForMargins(
        transformedRange,
        input.scaleMargins,
        input.inverted,
      )
    const transformedUniforms = computeViewportUniforms(
      input.viewport,
      transformedYRange,
      mode,
      transformedVisibleBars[0]?.close ?? basePrice,
      input.canvasPixelWidth,
      input.canvasPixelHeight,
    )

    if (!isViewportOnly) {
      state.cachedCandleInstanceCount = fillCandleInstances(
        transformedBars,
        'candles',
        input.candleProgram,
        indexOffset,
      )
      state.lastFillChartType = input.chartType
    }

    const drawMethod = isViewportOnly
      ? 'drawWithCachedBuffer'
      : 'drawInterleaved'
    input.candleProgram[drawMethod](
      state.cachedCandleInstanceCount,
      {
        up: hexToColor(input.theme.upCandle),
        down: hexToColor(input.theme.downCandle),
      },
      transformedUniforms,
    )

    return {
      yRange: transformedYRange,
      primaryVisibleBars: transformedVisibleBars,
    }
  }

  // ── Line, Step Line and Area charts: WebGL thick lines + gradient area ──

  if (
    input.chartType === 'line' ||
    input.chartType === 'area' ||
    input.chartType === 'stepLine'
  ) {
    if (!isViewportOnly) {
      // stepLine holds each close flat until the next bar (no smoothing)
      const pointCount =
        input.chartType === 'stepLine'
          ? fillStepLinePoints(state, primarySeries.bars)
          : applyCatmullRomSmoothing(state, primarySeries.bars)

      if (input.chartType === 'area') {
        // Fill gradient area buffer: alternating [index, price, index, baseline]
        state.cachedAreaVertexCount = fillGradientAreaBuffer(
          state,
          pointCount,
          input.areaProgram,
          0,
        )
      }

      // Fill thick line buffer for both line and area chart types
      state.cachedThickLineVertexCount = fillThickLineBuffer(
        state,
        pointCount,
        input.thickLineProgram,
      )
      state.lastFillChartType = input.chartType
    }

    const seriesColor = primarySeries.color ?? '#4aa8ff'
    const [r, g, b] = hexToColor(seriesColor)

    // Area gradient fill (render first, line draws on top)
    if (input.chartType === 'area') {
      const gradientColors = {
        top: [r, g, b, 0.55] as [number, number, number, number],
        bottom: [r, g, b, 0.04] as [number, number, number, number],
      }
      const areaDrawMethod = isViewportOnly
        ? 'drawWithCachedBuffer'
        : 'drawInterleaved'
      input.areaProgram[areaDrawMethod](
        state.cachedAreaVertexCount,
        gradientColors,
        viewportUniforms,
      )
    }

    // Thick line (on top of area for area charts, standalone for line charts)
    const lineColor: [number, number, number, number] = [r, g, b, 1.0]
    const halfLineWidth = input.dpr // 2 CSS pixels → dpr * 2 / 2 = dpr physical half-width
    const lineDrawMethod = isViewportOnly
      ? 'drawWithCachedBuffer'
      : 'drawInterleaved'
    input.thickLineProgram[lineDrawMethod](
      state.cachedThickLineVertexCount,
      lineColor,
      halfLineWidth,
      viewportUniforms,
    )

    return { yRange, primaryVisibleBars }
  }

  // ── HLC Area: high/low/close lines + translucent high-low band ──
  //
  // Draws three thick lines through one shared ThickLineProgram buffer, so
  // there is no cached-buffer redraw path: every frame refills and re-uploads.
  // lastFillChartType is still set to invalidate other types' cached counts.

  if (input.chartType === 'hlcArea') {
    const bars = primarySeries.bars
    const seriesColor = primarySeries.color ?? '#4aa8ff'
    const [r, g, b] = hexToColor(seriesColor)

    // Translucent band between high and low (render first, lines on top)
    const bandVertexCount = fillHlcBandBuffer(bars, input.areaProgram)
    if (bandVertexCount > 0) {
      input.areaProgram.drawInterleaved(
        bandVertexCount,
        {
          top: [r, g, b, 0.14],
          bottom: [r, g, b, 0.14],
        },
        viewportUniforms,
      )
    }

    const halfLineWidth = input.dpr
    const drawFieldLine = (
      field: 'high' | 'low' | 'close',
      color: [number, number, number, number],
    ): void => {
      const pointCount = fillFieldLinePoints(state, bars, field)
      const vertexCount = fillThickLineBuffer(
        state,
        pointCount,
        input.thickLineProgram,
      )
      if (vertexCount > 0) {
        input.thickLineProgram.drawInterleaved(
          vertexCount,
          color,
          halfLineWidth,
          viewportUniforms,
        )
      }
    }

    const [ur, ug, ub] = hexToColor(input.theme.upCandle)
    const [dr, dg, db] = hexToColor(input.theme.downCandle)
    drawFieldLine('high', [ur, ug, ub, 0.9])
    drawFieldLine('low', [dr, dg, db, 0.9])
    drawFieldLine('close', [r, g, b, 1.0])

    state.lastFillChartType = 'hlcArea'

    return { yRange, primaryVisibleBars }
  }

  // ── High-Low and Column: single range-body instance per bar ──

  if (input.chartType === 'highLow' || input.chartType === 'column') {
    const rangeType = input.chartType
    // highLow spans the bar's high..low; column spans base..close
    const columnBase = input.histogramBaseValue ?? 0
    const canPartialFill =
      input.lastBarOnly === true &&
      !isViewportOnly &&
      state.lastFillChartType === rangeType &&
      primarySeries.bars.length > 0 &&
      state.cachedRangeInstanceCount === primarySeries.bars.length

    if (canPartialFill) {
      updateLastBarRangeInstance(
        primarySeries.bars,
        input.candleProgram,
        rangeType,
        columnBase,
      )
    } else if (!isViewportOnly) {
      state.cachedRangeInstanceCount = fillRangeInstances(
        primarySeries.bars,
        input.candleProgram,
        rangeType,
        columnBase,
      )
      state.lastFillChartType = rangeType
    }

    const drawMethod =
      isViewportOnly || canPartialFill
        ? 'drawWithCachedBuffer'
        : 'drawInterleaved'
    input.candleProgram[drawMethod](
      state.cachedRangeInstanceCount,
      {
        up: hexToColor(input.theme.upCandle),
        down: hexToColor(input.theme.downCandle),
      },
      viewportUniforms,
    )

    return { yRange, primaryVisibleBars }
  }

  if (input.chartType === 'histogram') {
    const histogramBase = input.histogramBaseValue ?? 0
    const canPartialFill =
      input.lastBarOnly === true &&
      !isViewportOnly &&
      state.lastFillChartType === 'histogram' &&
      primarySeries.bars.length > 0 &&
      state.cachedHistogramInstanceCount === primarySeries.bars.length

    if (canPartialFill) {
      updateLastBarHistogramInstance(
        primarySeries.bars,
        input.candleProgram,
        histogramBase,
      )
    } else if (!isViewportOnly) {
      state.cachedHistogramInstanceCount = fillHistogramInstances(
        primarySeries.bars,
        input.candleProgram,
        histogramBase,
      )
      state.lastFillChartType = 'histogram'
    }

    const drawMethod =
      isViewportOnly || canPartialFill
        ? 'drawWithCachedBuffer'
        : 'drawInterleaved'
    input.candleProgram[drawMethod](
      state.cachedHistogramInstanceCount,
      {
        up: hexToColor(input.theme.upCandle),
        down: hexToColor(input.theme.downCandle),
      },
      viewportUniforms,
    )

    return { yRange, primaryVisibleBars }
  }

  if (input.chartType === 'bar') {
    const canPartialFill =
      input.lastBarOnly === true &&
      !isViewportOnly &&
      state.lastFillChartType === 'bar' &&
      primarySeries.bars.length > 0 &&
      state.cachedBarInstanceCount === primarySeries.bars.length * 3

    if (canPartialFill) {
      updateLastBarBarInstances(primarySeries.bars, input.barProgram)
    } else if (!isViewportOnly) {
      state.cachedBarInstanceCount = fillBarInstances(
        primarySeries.bars,
        input.barProgram,
      )
      state.lastFillChartType = 'bar'
    }

    const drawMethod =
      isViewportOnly || canPartialFill
        ? 'drawWithCachedBuffer'
        : 'drawInterleaved'
    input.barProgram[drawMethod](
      state.cachedBarInstanceCount,
      {
        up: hexToColor(input.theme.upCandle),
        down: hexToColor(input.theme.downCandle),
      },
      viewportUniforms,
    )

    return { yRange, primaryVisibleBars }
  }

  // Baseline: skip WebGL rendering — handled entirely by Canvas2D baseline-pass
  if (input.chartType === 'baseline') {
    return { yRange, primaryVisibleBars }
  }

  // Default: candles / heikinAshi / hollowCandles
  const candleType: 'candles' | 'heikinAshi' | 'hollowCandles' =
    input.chartType === 'heikinAshi' || input.chartType === 'hollowCandles'
      ? input.chartType
      : 'candles'

  // heikinAshi is excluded: its last bar depends on the previous HA bar's
  // derived open/close, so it always takes the full-rebuild path.
  const canPartialFill =
    input.lastBarOnly === true &&
    !isViewportOnly &&
    candleType !== 'heikinAshi' &&
    state.lastFillChartType === candleType &&
    primarySeries.bars.length > 0 &&
    state.cachedCandleInstanceCount === primarySeries.bars.length * 2

  if (canPartialFill) {
    updateLastBarCandleInstances(
      primarySeries.bars,
      input.candleProgram,
      candleType === 'hollowCandles' ? 2 : 0,
    )
  } else if (!isViewportOnly) {
    state.cachedCandleInstanceCount = fillCandleInstances(
      primarySeries.bars,
      candleType,
      input.candleProgram,
    )
    state.lastFillChartType = input.chartType
  }

  const drawMethod =
    isViewportOnly || canPartialFill
      ? 'drawWithCachedBuffer'
      : 'drawInterleaved'
  input.candleProgram[drawMethod](
    state.cachedCandleInstanceCount,
    {
      up: hexToColor(input.theme.upCandle),
      down: hexToColor(input.theme.downCandle),
    },
    viewportUniforms,
  )

  return {
    yRange,
    primaryVisibleBars,
  }
}
