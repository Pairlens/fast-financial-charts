import type { ChartTheme } from '../../../types'
import type { TimeAxisTick } from './time-ticks'

type GridPassInput = {
  ctx: CanvasRenderingContext2D
  width: number
  height: number
  theme: ChartTheme
  /**
   * Effective price-axis width (theme width, widened by `minimumWidth`, or 0
   * when the axis is hidden). Defaults to the theme value.
   */
  priceAxisWidth?: number
  /**
   * Time-axis ticks from the overlay pass. Vertical lines are drawn at these
   * bars so every gridline has a label under it; without them the pass falls
   * back to evenly-spaced columns (empty chart, standalone use).
   */
  timeTicks?: Array<TimeAxisTick>
}

/** #rgb / #rrggbb → `rgba(r,g,b,a)`; passes through anything already non-hex. */
const withAlpha = (color: string, alpha: number): string => {
  if (color[0] !== '#') return color
  let hex = color.slice(1)
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2]
  }
  if (hex.length !== 6) return color
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/**
 * Renders the background fill and grid lines on a dedicated canvas layer
 * that sits BEHIND the WebGL price data (z-index 5 vs WebGL z-index 10).
 *
 * This ensures gridlines appear behind candles/bars/lines, matching
 * the TradingView rendering order.
 */
export const renderGridPass = (input: GridPassInput): void => {
  const { ctx, width, height, theme } = input
  const priceAxisWidth = input.priceAxisWidth ?? theme.layout.priceAxisWidth
  const timeAxisHeight = theme.layout.timeAxisHeight
  const gridRows = theme.layout.gridRows
  const gridColumns = theme.layout.gridColumns

  const chartWidth = Math.max(1, width - priceAxisWidth)
  const chartHeight = Math.max(1, height - timeAxisHeight)

  ctx.clearRect(0, 0, width, height)

  // Base background (covers entire canvas including axis areas)
  ctx.fillStyle = theme.background
  ctx.fillRect(0, 0, width, height)

  // Warm Precision depth — a soft accent glow off the top-right corner and a
  // gentle bottom vignette so the tape reads as lit graphite, not a flat void.
  // Confined to the chart area (not the axis strips). Both are whisper-subtle.
  const glow = ctx.createRadialGradient(
    chartWidth * 0.86,
    chartHeight * -0.08,
    0,
    chartWidth * 0.86,
    chartHeight * -0.08,
    Math.max(chartWidth, chartHeight) * 0.9,
  )
  glow.addColorStop(0, withAlpha(theme.selection, 0.1))
  glow.addColorStop(1, withAlpha(theme.selection, 0))
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, chartWidth, chartHeight)

  const vignette = ctx.createLinearGradient(
    0,
    chartHeight * 0.72,
    0,
    chartHeight,
  )
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)')
  vignette.addColorStop(1, 'rgba(0, 0, 0, 0.07)')
  ctx.fillStyle = vignette
  ctx.fillRect(0, 0, chartWidth, chartHeight)

  // Grid lines (chart area only, not axis areas)
  ctx.strokeStyle = theme.grid
  ctx.lineWidth = 1

  for (let row = 0; row <= gridRows; row += 1) {
    const y = (row / gridRows) * chartHeight
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(chartWidth, y)
    ctx.stroke()
  }

  const ticks = input.timeTicks
  if (ticks && ticks.length > 0) {
    for (const tick of ticks) {
      // Snap to the pixel grid: a half-pixel line renders as a 2px smear.
      const x = Math.round(tick.x) + 0.5
      if (x < 0 || x > chartWidth) continue
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, chartHeight)
      ctx.stroke()
    }
    return
  }

  for (let column = 0; column <= gridColumns; column += 1) {
    const x = (column / gridColumns) * chartWidth
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, chartHeight)
    ctx.stroke()
  }
}
