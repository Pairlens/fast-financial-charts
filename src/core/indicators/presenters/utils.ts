import { findBarIndexByTs } from '../../data/binary-search'
import { valueToY } from '../../data/scales'
import type {
  ChartBar,
  ChartTheme,
  IndicatorPresenterContext,
  NumericRange,
} from '../../../types'

export const toLinePoints = (
  bars: Array<ChartBar>,
  values: IndicatorPresenterContext['values'],
  viewport: IndicatorPresenterContext['viewport'],
  width: number,
  yFromValue: (value: number) => number,
): Array<{ x: number; y: number }> => {
  const total = Math.max(1, viewport.endIndex - viewport.startIndex + 1)
  const points: Array<{ x: number; y: number }> = []

  for (const value of values) {
    const numeric = Number(value.value)
    if (!Number.isFinite(numeric)) {
      continue
    }

    const index = findBarIndexByTs(bars, value.ts)
    if (index < viewport.startIndex || index > viewport.endIndex) {
      continue
    }

    const x = ((index - viewport.startIndex + 0.5) / total) * width
    const y = yFromValue(numeric)

    points.push({ x, y })
  }

  return points
}

/**
 * Convert multi-value indicator points to screen-space line arrays.
 * Returns a Map from field name → point array.
 */
export const toMultiLinePoints = (
  bars: Array<ChartBar>,
  values: IndicatorPresenterContext['values'],
  viewport: IndicatorPresenterContext['viewport'],
  width: number,
  fields: Array<string>,
  yFromValue: (value: number) => number,
): Map<string, Array<{ x: number; y: number }>> => {
  const total = Math.max(1, viewport.endIndex - viewport.startIndex + 1)
  const result = new Map<string, Array<{ x: number; y: number }>>()
  for (const field of fields) {
    result.set(field, [])
  }

  for (const value of values) {
    const index = findBarIndexByTs(bars, value.ts)
    if (index < viewport.startIndex || index > viewport.endIndex) {
      continue
    }

    const x = ((index - viewport.startIndex + 0.5) / total) * width

    for (const field of fields) {
      const numeric = Number(value[field])
      if (Number.isFinite(numeric)) {
        result.get(field)!.push({ x, y: yFromValue(numeric) })
      }
    }
  }

  return result
}

export const strokeLine = (
  ctx: CanvasRenderingContext2D,
  points: Array<{ x: number; y: number }>,
  color: string,
  lineWidth = 1.5,
): void => {
  if (points.length < 2) {
    return
  }

  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = lineWidth
  ctx.beginPath()

  for (let index = 0; index < points.length; index += 1) {
    const point = points[index]
    if (index === 0) {
      ctx.moveTo(point.x, point.y)
    } else {
      ctx.lineTo(point.x, point.y)
    }
  }

  ctx.stroke()
  ctx.restore()
}

/** Draw horizontal dashed guide lines at fixed levels (e.g., RSI 30/50/70). */
export const drawGuideLines = (
  ctx: CanvasRenderingContext2D,
  levels: Array<number>,
  range: NumericRange,
  width: number,
  height: number,
  color: string,
  theme: ChartTheme,
): void => {
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = 1
  ctx.setLineDash([4, 4])

  for (const level of levels) {
    const y = valueToY(level, range, height)
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  }

  ctx.restore()

  ctx.save()
  ctx.fillStyle = theme.axisText
  ctx.font = `10px ${theme.fontFamilyMono}`
  ctx.textAlign = 'right'
  for (const level of levels) {
    const y = valueToY(level, range, height)
    ctx.fillText(String(level), width - 4, y - 3)
  }
  ctx.restore()
}

/** Draw an indicator title label in the top-left corner of a pane. */
export const drawTitleLabel = (
  ctx: CanvasRenderingContext2D,
  text: string,
  color: string,
  theme: ChartTheme,
): void => {
  ctx.save()
  ctx.textAlign = 'left'
  ctx.fillStyle = color
  ctx.font = `bold 10px ${theme.fontFamilyMono}`
  ctx.fillText(text, 4, 12)
  ctx.restore()
}

/** Fill the area between two point arrays with a solid color. */
export const fillBetweenLines = (
  ctx: CanvasRenderingContext2D,
  lineA: Array<{ x: number; y: number }>,
  lineB: Array<{ x: number; y: number }>,
  fillColor: string,
): void => {
  if (lineA.length < 2 || lineB.length < 2) {
    return
  }

  ctx.save()
  ctx.fillStyle = fillColor
  ctx.beginPath()

  for (let index = 0; index < lineA.length; index += 1) {
    const point = lineA[index]
    if (index === 0) {
      ctx.moveTo(point.x, point.y)
    } else {
      ctx.lineTo(point.x, point.y)
    }
  }

  for (let index = lineB.length - 1; index >= 0; index -= 1) {
    ctx.lineTo(lineB[index].x, lineB[index].y)
  }

  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

/** Draw a horizontal zero/reference line across the pane. */
export const drawZeroLine = (
  ctx: CanvasRenderingContext2D,
  range: NumericRange,
  width: number,
  height: number,
  color: string,
  level = 0,
): void => {
  const y = valueToY(level, range, height)
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, y)
  ctx.lineTo(width, y)
  ctx.stroke()
  ctx.restore()
}

/** Draw dots at given points (used by Parabolic SAR). */
export const drawDots = (
  ctx: CanvasRenderingContext2D,
  points: Array<{ x: number; y: number }>,
  color: string,
  radius = 2,
): void => {
  if (points.length === 0) {
    return
  }

  ctx.save()
  ctx.fillStyle = color
  for (const point of points) {
    ctx.beginPath()
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

/** Stroke a line that switches color per-point based on a direction flag. */
export const strokeColorSwitchingLine = (
  ctx: CanvasRenderingContext2D,
  points: Array<{ x: number; y: number; color: string }>,
  lineWidth = 1.5,
): void => {
  if (points.length < 2) {
    return
  }

  ctx.save()
  ctx.lineWidth = lineWidth

  for (let index = 1; index < points.length; index += 1) {
    const prev = points[index - 1]
    const curr = points[index]
    ctx.strokeStyle = curr.color
    ctx.beginPath()
    ctx.moveTo(prev.x, prev.y)
    ctx.lineTo(curr.x, curr.y)
    ctx.stroke()
  }

  ctx.restore()
}
