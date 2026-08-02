import {
  computeNumericRange,
  computePriceRange,
  valueToY,
} from '../../data/scales'
import { findBarIndexByTs } from '../../data/binary-search'
import { drawTitleLabel } from './utils'
import type {
  ChartTheme,
  IndicatorPresenter,
  IndicatorPresenterContext,
  NumericRange,
} from '../../../types'

export type CustomRenderSeriesSpec = {
  key: string
  title?: string
  style: 'line' | 'histogram' | 'area'
  /**
   * Hex/CSS color, or a theme token string:
   * 'token:primary' | 'token:up' | 'token:down' | 'token:muted' | 'token:accent'
   */
  color?: string
  width?: number
  lineStyle?: 'solid' | 'dashed' | 'dotted'
  /** Histogram only: color bars by sign using the theme up/down colors */
  upDown?: boolean
}

export type CustomRenderSpec = {
  series: Array<CustomRenderSeriesSpec>
  hlines?: Array<{ value: number; color?: string; label?: string }>
}

/**
 * Default per-series palette used when a series declares no color (or an
 * unknown token). Indexed by series position within the spec.
 */
const DEFAULT_SERIES_PALETTE = [
  '#4aa8ff',
  '#f5a623',
  '#a78bfa',
  '#2dd4bf',
  '#f472b6',
  '#facc15',
]

const LINE_DASH_SOLID: Array<number> = []
const LINE_DASH_DASHED = [6, 4]
const LINE_DASH_DOTTED = [2, 3]

const AREA_FILL_ALPHA = 0.18

const dashForStyle = (
  lineStyle: CustomRenderSeriesSpec['lineStyle'],
): Array<number> => {
  if (lineStyle === 'dashed') return LINE_DASH_DASHED
  if (lineStyle === 'dotted') return LINE_DASH_DOTTED
  return LINE_DASH_SOLID
}

/**
 * Resolve a series color declaration to a concrete CSS color.
 * Theme tokens map onto the chart theme; missing/unknown colors fall back to
 * the default palette by series index. Pure — safe to unit test.
 */
export const resolveCustomSeriesColor = (
  color: string | undefined,
  seriesIndex: number,
  theme: ChartTheme,
): string => {
  const fallback =
    DEFAULT_SERIES_PALETTE[
      Math.abs(seriesIndex) % DEFAULT_SERIES_PALETTE.length
    ]

  if (!color) {
    return fallback
  }

  if (!color.startsWith('token:')) {
    return color
  }

  switch (color) {
    case 'token:up':
      return theme.upCandle || fallback
    case 'token:down':
      return theme.downCandle || fallback
    case 'token:muted':
      return theme.axisText || fallback
    // The chart theme has no dedicated primary/accent slots; the crosshair is
    // the theme's accent color and the MACD signal is its secondary accent.
    case 'token:primary':
      return theme.crosshair || fallback
    case 'token:accent':
      return theme.indicator.macd.signal || fallback
    default:
      return fallback
  }
}

type ScreenPoint = { x: number; y: number }

/**
 * Convert one value-key into screen-space polyline segments. NaN/undefined
 * values (and off-viewport gaps) terminate the current segment so lines
 * break instead of connecting across missing data.
 */
const toSegments = (
  context: IndicatorPresenterContext,
  key: string,
  yFromValue: (value: number) => number,
): Array<Array<ScreenPoint>> => {
  const { bars, values, viewport, width } = context
  const total = Math.max(1, viewport.endIndex - viewport.startIndex + 1)
  const segments: Array<Array<ScreenPoint>> = []
  let current: Array<ScreenPoint> | null = null

  for (const point of values) {
    const numeric = Number(point[key])
    if (!Number.isFinite(numeric)) {
      current = null
      continue
    }

    const index = findBarIndexByTs(bars, point.ts)
    if (index < viewport.startIndex || index > viewport.endIndex) {
      current = null
      continue
    }

    const x = ((index - viewport.startIndex + 0.5) / total) * width
    if (!current) {
      current = []
      segments.push(current)
    }
    current.push({ x, y: yFromValue(numeric) })
  }

  return segments
}

const strokeSegments = (
  ctx: CanvasRenderingContext2D,
  segments: Array<Array<ScreenPoint>>,
  color: string,
  lineWidth: number,
  dash: Array<number>,
): void => {
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = lineWidth
  ctx.setLineDash(dash)

  for (const segment of segments) {
    if (segment.length < 2) {
      continue
    }
    ctx.beginPath()
    ctx.moveTo(segment[0].x, segment[0].y)
    for (let index = 1; index < segment.length; index += 1) {
      ctx.lineTo(segment[index].x, segment[index].y)
    }
    ctx.stroke()
  }

  ctx.setLineDash(LINE_DASH_SOLID)
  ctx.restore()
}

const fillSegmentsToBase = (
  ctx: CanvasRenderingContext2D,
  segments: Array<Array<ScreenPoint>>,
  color: string,
  baseY: number,
): void => {
  ctx.save()
  ctx.fillStyle = color
  ctx.globalAlpha = AREA_FILL_ALPHA

  for (const segment of segments) {
    if (segment.length < 2) {
      continue
    }
    ctx.beginPath()
    ctx.moveTo(segment[0].x, baseY)
    for (const point of segment) {
      ctx.lineTo(point.x, point.y)
    }
    ctx.lineTo(segment[segment.length - 1].x, baseY)
    ctx.closePath()
    ctx.fill()
  }

  ctx.restore()
}

const drawHistogram = (
  context: IndicatorPresenterContext,
  spec: CustomRenderSeriesSpec,
  color: string,
  yFromValue: (value: number) => number,
): void => {
  const { ctx, bars, values, viewport, width, height, theme } = context
  const total = Math.max(1, viewport.endIndex - viewport.startIndex + 1)
  const barWidth = Math.max(1, (width / total) * 0.6)
  const baseY = Math.min(height, Math.max(0, yFromValue(0)))

  ctx.save()

  for (const point of values) {
    const numeric = Number(point[spec.key])
    if (!Number.isFinite(numeric)) {
      continue
    }

    const index = findBarIndexByTs(bars, point.ts)
    if (index < viewport.startIndex || index > viewport.endIndex) {
      continue
    }

    const x = ((index - viewport.startIndex + 0.5) / total) * width
    const y = yFromValue(numeric)
    ctx.fillStyle = spec.upDown
      ? numeric >= 0
        ? theme.upCandle
        : theme.downCandle
      : color
    ctx.fillRect(
      x - barWidth / 2,
      Math.min(y, baseY),
      barWidth,
      Math.max(1, Math.abs(baseY - y)),
    )
  }

  ctx.restore()
}

const drawHlines = (
  context: IndicatorPresenterContext,
  hlines: NonNullable<CustomRenderSpec['hlines']>,
  yFromValue: (value: number) => number,
): void => {
  const { ctx, width, theme } = context

  for (const hline of hlines) {
    const y = yFromValue(hline.value)
    const color = hline.color
      ? resolveCustomSeriesColor(hline.color, 0, theme)
      : theme.axisText

    ctx.save()
    ctx.strokeStyle = color
    ctx.lineWidth = 1
    ctx.setLineDash(LINE_DASH_DASHED)
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
    ctx.setLineDash(LINE_DASH_SOLID)

    ctx.fillStyle = theme.axisText
    ctx.font = `10px ${theme.fontFamilyMono}`
    ctx.textAlign = 'right'
    ctx.fillText(hline.label ?? String(hline.value), width - 4, y - 3)
    ctx.restore()
  }
}

/** Value range across every rendered series key (plus hlines), padded. */
const computeSpecRange = (
  context: IndicatorPresenterContext,
  spec: CustomRenderSpec,
): NumericRange => {
  const numeric: Array<number> = []

  for (const point of context.values) {
    for (const series of spec.series) {
      const value = Number(point[series.key])
      if (Number.isFinite(value)) {
        numeric.push(value)
      }
    }
  }

  for (const hline of spec.hlines ?? []) {
    if (Number.isFinite(hline.value)) {
      numeric.push(hline.value)
    }
  }

  return computeNumericRange(numeric, { min: -1, max: 1 }, 0.08)
}

/**
 * Build a presenter for a registry-defined custom indicator from a generic
 * multi-series render spec. Works on the price pane (overlay) — where values
 * scale against the visible price range like the EMA presenter — and in
 * separate/user panes, where values scale against their own numeric range
 * like the MACD presenter.
 */
export const createCustomIndicatorPresenter = (
  spec: CustomRenderSpec,
): IndicatorPresenter => {
  return (context) => {
    const { ctx, height, theme, indicator } = context
    const isOverlay = indicator.pane === 'overlay'

    const range = isOverlay
      ? computePriceRange(
          context.bars.slice(
            context.viewport.startIndex,
            context.viewport.endIndex + 1,
          ),
        )
      : computeSpecRange(context, spec)
    const yFromValue = (value: number): number => valueToY(value, range, height)

    if (spec.hlines && spec.hlines.length > 0) {
      drawHlines(context, spec.hlines, yFromValue)
    }

    for (let index = 0; index < spec.series.length; index += 1) {
      const series = spec.series[index]
      const color = resolveCustomSeriesColor(series.color, index, theme)

      if (series.style === 'histogram') {
        drawHistogram(context, series, color, yFromValue)
        continue
      }

      const segments = toSegments(context, series.key, yFromValue)

      if (series.style === 'area') {
        const baseY = Math.min(height, Math.max(0, yFromValue(0)))
        fillSegmentsToBase(ctx, segments, color, baseY)
      }

      strokeSegments(
        ctx,
        segments,
        color,
        series.width ?? 1.5,
        dashForStyle(series.lineStyle),
      )
    }

    if (!isOverlay) {
      const title =
        spec.series.find((series) => series.title)?.title ??
        indicator.type.replace(/^custom:/, '')
      drawTitleLabel(ctx, title, indicator.color, theme)
    }
  }
}
