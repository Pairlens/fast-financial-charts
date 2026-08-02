import { transformPriceForMode, valueToYScaled } from '../../data/scales'
import type {
  BaselineConfig,
  ChartBar,
  ChartTheme,
  ChartViewport,
  NumericRange,
} from '../../../types'
import type { PriceScaleMode } from '../../../types/viewport'

export type BaselinePassInput = {
  ctx: CanvasRenderingContext2D
  width: number
  height: number
  bars: Array<ChartBar>
  viewport: ChartViewport
  yRange: NumericRange
  theme: ChartTheme
  baseline: BaselineConfig
  priceAxisWidth: number
  timeAxisHeight: number
  priceScaleMode?: PriceScaleMode
}

/**
 * Render a baseline series: two-tone area chart split at a configurable base value.
 * Green gradient above baseline, red gradient below.
 * Uses Canvas2D clip regions for the split.
 */
export const renderBaselinePass = (input: BaselinePassInput): void => {
  const {
    ctx,
    width,
    height,
    bars,
    viewport,
    yRange,
    baseline,
    priceAxisWidth,
    timeAxisHeight,
  } = input
  const mode = input.priceScaleMode ?? 'normal'

  const chartWidth = Math.max(1, width - priceAxisWidth)
  const chartHeight = Math.max(1, height - timeAxisHeight)

  const start = Math.max(0, viewport.startIndex)
  const end = Math.min(bars.length - 1, viewport.endIndex)
  if (end < start) {
    return
  }

  const total = Math.max(1, viewport.endIndex - viewport.startIndex + 1)

  // Determine first visible bar's close as basePrice for transformed modes
  const visibleBars = bars.slice(start, end + 1)
  const basePrice = visibleBars[0]?.close ?? 0
  const needsTransform = mode === 'percentage' || mode === 'indexedTo100'

  const baseDisplayValue = needsTransform
    ? transformPriceForMode(baseline.baseValue, basePrice, mode)
    : baseline.baseValue
  const baselineY = valueToYScaled(baseDisplayValue, yRange, chartHeight, mode)

  // Build points array
  const points: Array<{ x: number; y: number }> = []
  for (let index = start; index <= end; index += 1) {
    const close = bars[index].close
    const displayValue = needsTransform
      ? transformPriceForMode(close, basePrice, mode)
      : close
    const x = ((index - viewport.startIndex + 0.5) / total) * chartWidth
    const y = valueToYScaled(displayValue, yRange, chartHeight, mode)
    points.push({ x, y })
  }

  if (points.length < 2) {
    return
  }

  // Colors with defaults
  const topFill = baseline.topFillColor ?? 'rgba(76, 175, 80, 0.18)'
  const bottomFill = baseline.bottomFillColor ?? 'rgba(244, 67, 54, 0.18)'
  const topLine = baseline.topLineColor ?? '#4caf50'
  const bottomLine = baseline.bottomLineColor ?? '#f44336'
  const lineWidth = baseline.lineWidth ?? 2

  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 0, chartWidth, chartHeight)
  ctx.clip()

  // ── Top half (above baseline) ──
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 0, chartWidth, baselineY)
  ctx.clip()

  // Fill area above baseline
  ctx.fillStyle = topFill
  ctx.beginPath()
  ctx.moveTo(points[0].x, baselineY)
  for (const point of points) {
    ctx.lineTo(point.x, point.y)
  }
  ctx.lineTo(points[points.length - 1].x, baselineY)
  ctx.closePath()
  ctx.fill()

  // Line above baseline
  ctx.strokeStyle = topLine
  ctx.lineWidth = lineWidth
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(points[0].x, points[0].y)
  for (let i = 1; i < points.length; i += 1) {
    ctx.lineTo(points[i].x, points[i].y)
  }
  ctx.stroke()
  ctx.restore()

  // ── Bottom half (below baseline) ──
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, baselineY, chartWidth, chartHeight - baselineY)
  ctx.clip()

  // Fill area below baseline
  ctx.fillStyle = bottomFill
  ctx.beginPath()
  ctx.moveTo(points[0].x, baselineY)
  for (const point of points) {
    ctx.lineTo(point.x, point.y)
  }
  ctx.lineTo(points[points.length - 1].x, baselineY)
  ctx.closePath()
  ctx.fill()

  // Line below baseline
  ctx.strokeStyle = bottomLine
  ctx.lineWidth = lineWidth
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(points[0].x, points[0].y)
  for (let i = 1; i < points.length; i += 1) {
    ctx.lineTo(points[i].x, points[i].y)
  }
  ctx.stroke()
  ctx.restore()

  // ── Baseline reference line ──
  ctx.strokeStyle = `${topLine}66`
  ctx.lineWidth = 1
  ctx.setLineDash([4, 3])
  ctx.beginPath()
  ctx.moveTo(0, baselineY)
  ctx.lineTo(chartWidth, baselineY)
  ctx.stroke()
  ctx.setLineDash([])

  ctx.restore()
}
