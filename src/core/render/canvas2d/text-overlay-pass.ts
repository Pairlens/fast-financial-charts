import { findBarIndexByTs } from '../../data/binary-search'
import {
  transformPriceForMode,
  valueToYScaled,
  yToValueScaled,
} from '../../data/scales'
import {
  computeTimeAxisTicks,
  createTextMeasurer,
  timeAxisFont,
} from './time-ticks'
import type { TimeAxisTick } from './time-ticks'
import type {
  ChartBar,
  ChartTheme,
  ChartViewport,
  NumericRange,
  PriceLine,
  WatermarkConfig,
} from '../../../types'
import type {
  PriceScaleConfig,
  PriceScaleMode,
  TimeTickType,
} from '../../../types/viewport'

type TextOverlayPassInput = {
  ctx: CanvasRenderingContext2D
  width: number
  height: number
  bars: Array<ChartBar>
  viewport: ChartViewport
  yRange: NumericRange
  theme: ChartTheme
  crosshair?: { x: number; y: number; visible: boolean }
  lastClose?: number | null
  /** Last bar for determining price direction (close vs open) */
  lastBar?: ChartBar | null
  pricePrecision?: number
  priceScaleMode?: PriceScaleMode
  priceScale?: PriceScaleConfig
  tickMarkFormatter?: (time: number, tickType: TimeTickType) => string
  priceLines?: Array<PriceLine>
  /** Best bid/ask quote lines (TradingView "Bid and Ask" style). */
  quoteLines?: { bid: number; ask: number } | null
  watermark?: WatermarkConfig
  /** Custom price formatter from localization config */
  priceFormatter?: (price: number) => string
  /** BCP 47 locale from localization config (month names on the time axis) */
  locale?: string
  /**
   * Pre-planned time-axis ticks. The engine computes these once per frame and
   * shares them with the grid pass so gridlines and labels land on the same
   * bars; passed alone, this pass plans its own.
   */
  timeTicks?: Array<TimeAxisTick>
}

/** Default layout metrics (used when no theme is available) */
export const textOverlayMetrics = {
  priceAxisWidth: 74,
  timeAxisHeight: 22,
}

export const xFromTs = (
  ts: number,
  bars: Array<ChartBar>,
  viewport: ChartViewport,
  width: number,
  priceAxisWidth = textOverlayMetrics.priceAxisWidth,
): number => {
  const index = findBarIndexByTs(bars, ts)
  const total = Math.max(1, viewport.endIndex - viewport.startIndex + 1)
  return (
    ((index - viewport.startIndex + 0.5) / total) * (width - priceAxisWidth)
  )
}

const formatPrice = (
  price: number,
  precision: number,
  mode?: PriceScaleMode,
  customFormatter?: (price: number) => string,
): string => {
  if (customFormatter) {
    return customFormatter(price)
  }
  if (mode === 'percentage') {
    return `${price >= 0 ? '+' : ''}${price.toFixed(2)}%`
  }
  if (mode === 'indexedTo100') {
    return price.toFixed(2)
  }
  return price.toFixed(precision)
}

/**
 * Resolve a quote (bid/ask) price to its display-space Y coordinate, or null
 * when it falls outside the visible price range.
 */
const quoteLineY = (
  price: number,
  bars: Array<ChartBar>,
  viewport: ChartViewport,
  yRange: NumericRange,
  chartHeight: number,
  mode: PriceScaleMode,
): { y: number; displayPrice: number } | null => {
  const visibleBars = bars.slice(
    Math.max(0, viewport.startIndex),
    viewport.endIndex + 1,
  )
  const basePrice = visibleBars[0]?.close ?? 0
  const displayPrice =
    mode === 'percentage' || mode === 'indexedTo100'
      ? transformPriceForMode(price, basePrice, mode)
      : price
  const y = valueToYScaled(displayPrice, yRange, chartHeight, mode)
  if (y < 0 || y > chartHeight) return null
  return { y, displayPrice }
}

export const renderTextOverlayPass = (input: TextOverlayPassInput): void => {
  const { ctx, width, height, bars, viewport, yRange, theme } = input
  const precision = input.pricePrecision ?? 2
  const mode = input.priceScaleMode ?? 'normal'
  const customPriceFmt = input.priceFormatter
  const ps = input.priceScale
  const priceAxisVisible = ps?.visible !== false
  const priceAxisWidth = priceAxisVisible
    ? Math.max(ps?.minimumWidth ?? 0, theme.layout.priceAxisWidth)
    : 0
  const timeAxisHeight = theme.layout.timeAxisHeight
  const gridRows = theme.layout.gridRows

  ctx.clearRect(0, 0, width, height)

  const chartWidth = Math.max(1, width - priceAxisWidth)
  const chartHeight = Math.max(1, height - timeAxisHeight)

  ctx.save()

  // ── Watermark (behind everything) ──

  if (input.watermark?.visible !== false && input.watermark?.text) {
    const wm = input.watermark
    const wmFontSize = wm.fontSize ?? 48
    const wmFontFamily = wm.fontFamily ?? theme.fontFamilyMono
    const wmFontWeight = wm.fontWeight ?? 'bold'
    ctx.fillStyle = wm.color ?? `${theme.axisText}18`
    ctx.font = `${wmFontWeight} ${wmFontSize}px ${wmFontFamily}`

    let wmX: number
    if (wm.horzAlign === 'left') {
      ctx.textAlign = 'left'
      wmX = 16
    } else if (wm.horzAlign === 'right') {
      ctx.textAlign = 'right'
      wmX = chartWidth - 16
    } else {
      ctx.textAlign = 'center'
      wmX = chartWidth / 2
    }

    let wmY: number
    if (wm.vertAlign === 'top') {
      wmY = wmFontSize + 16
    } else if (wm.vertAlign === 'bottom') {
      wmY = chartHeight - 16
    } else {
      wmY = chartHeight / 2 + wmFontSize / 3
    }

    // Split by newlines for multi-line watermarks
    const lines = (wm.text ?? '').split('\n')
    for (let i = 0; i < lines.length; i += 1) {
      ctx.fillText(lines[i], wmX, wmY + i * (wmFontSize * 1.2))
    }
  }

  // Grid lines are rendered on a dedicated grid canvas (z-index 5)
  // behind the WebGL canvas (z-index 10). See grid-pass.ts.

  // ── Last close price line ──

  // Determine direction color for the last bar (like TradingView's current price line)
  const lastBarDir = input.lastBar
    ? input.lastBar.close >= input.lastBar.open
      ? 'up'
      : 'down'
    : 'up'
  const lastCloseColor = lastBarDir === 'up' ? theme.upCandle : theme.downCandle

  if (input.lastClose != null) {
    // For percentage/indexed modes, show the last close line at its display-space value
    const visibleBars = bars.slice(
      Math.max(0, viewport.startIndex),
      viewport.endIndex + 1,
    )
    const basePrice = visibleBars[0]?.close ?? 0
    const lastCloseDisplay =
      mode === 'percentage' || mode === 'indexedTo100'
        ? transformPriceForMode(input.lastClose, basePrice, mode)
        : input.lastClose
    const lastCloseY = valueToYScaled(
      lastCloseDisplay,
      yRange,
      chartHeight,
      mode,
    )
    if (lastCloseY >= 0 && lastCloseY <= chartHeight) {
      ctx.strokeStyle = `${lastCloseColor}88`
      ctx.lineWidth = 1
      ctx.setLineDash([3, 3])
      ctx.beginPath()
      ctx.moveTo(0, lastCloseY)
      ctx.lineTo(chartWidth, lastCloseY)
      ctx.stroke()
      ctx.setLineDash([])
    }
  }

  // ── Bid/ask quote lines (TradingView "Bid and Ask" style) ──
  //
  // Thin dotted lines at the best quotes: ask in the down color, bid in the
  // up color (matching the terminal's bid/ask readout). Axis labels are drawn
  // later, after the axis background fill, so they stay visible.

  if (input.quoteLines) {
    for (const [price, color] of [
      [input.quoteLines.ask, theme.downCandle],
      [input.quoteLines.bid, theme.upCandle],
    ] as const) {
      const resolved = quoteLineY(
        price,
        bars,
        viewport,
        yRange,
        chartHeight,
        mode,
      )
      if (!resolved) continue
      ctx.strokeStyle = `${color}aa`
      ctx.lineWidth = 1
      ctx.setLineDash([2, 2])
      ctx.beginPath()
      ctx.moveTo(0, resolved.y)
      ctx.lineTo(chartWidth, resolved.y)
      ctx.stroke()
      ctx.setLineDash([])
    }
  }

  // ── Series price lines ──

  if (input.priceLines && input.priceLines.length > 0) {
    const visibleBarsForPL = bars.slice(
      Math.max(0, viewport.startIndex),
      viewport.endIndex + 1,
    )
    const basePriceForPL = visibleBarsForPL[0]?.close ?? 0

    for (const priceLine of input.priceLines) {
      const displayPrice =
        mode === 'percentage' || mode === 'indexedTo100'
          ? transformPriceForMode(priceLine.price, basePriceForPL, mode)
          : priceLine.price
      const y = valueToYScaled(displayPrice, yRange, chartHeight, mode)
      if (y < 0 || y > chartHeight) {
        continue
      }

      ctx.strokeStyle = priceLine.color
      ctx.lineWidth = priceLine.lineWidth ?? 1
      if (priceLine.lineStyle === 'dashed') {
        ctx.setLineDash([5, 3])
      } else if (priceLine.lineStyle === 'dotted') {
        ctx.setLineDash([2, 2])
      } else {
        ctx.setLineDash([])
      }
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(chartWidth, y)
      ctx.stroke()
      ctx.setLineDash([])

      // Title label
      if (priceLine.title) {
        ctx.fillStyle = priceLine.color
        ctx.font = `${Math.max(9, theme.fontSizeAxis - 1)}px ${theme.fontFamilyMono}`
        ctx.textAlign = 'left'
        ctx.fillText(priceLine.title, 4, y - 4)
      }

      // Axis label
      if (priceAxisVisible && priceLine.axisLabelVisible !== false) {
        ctx.fillStyle = priceLine.color
        ctx.fillRect(chartWidth + 1, y - 8, priceAxisWidth - 2, 16)
        ctx.fillStyle = theme.axisBackground
        ctx.font = `${theme.fontSizeAxis}px ${theme.fontFamilyMono}`
        ctx.textAlign = 'right'
        ctx.fillText(
          formatPrice(displayPrice, precision, mode, customPriceFmt),
          width - 6,
          y + 4,
        )
      }
    }
  }

  // ── Axis backgrounds ──

  ctx.fillStyle = theme.axisBackground
  if (priceAxisVisible) {
    ctx.fillRect(chartWidth, 0, priceAxisWidth, height)
  }
  ctx.fillRect(0, chartHeight, chartWidth, timeAxisHeight)

  // Price axis border (vertical separator between chart and price axis)
  if (priceAxisVisible && ps?.borderVisible !== false) {
    ctx.strokeStyle = ps?.borderColor ?? theme.grid
    ctx.beginPath()
    ctx.moveTo(chartWidth, 0)
    ctx.lineTo(chartWidth, chartHeight)
    ctx.stroke()
  }

  // Time axis border (horizontal separator between chart and time axis)
  ctx.strokeStyle = theme.grid
  ctx.beginPath()
  ctx.moveTo(0, chartHeight)
  ctx.lineTo(chartWidth, chartHeight)
  ctx.stroke()

  // ── Price axis labels ──

  if (priceAxisVisible && ps?.ticksVisible !== false) {
    ctx.fillStyle = theme.axisText
    ctx.font = `${theme.fontSizeAxis}px ${theme.fontFamilyMono}`
    ctx.textAlign = 'right'

    for (let tick = 0; tick <= gridRows; tick += 1) {
      const ratio = tick / gridRows
      const y = ratio * chartHeight
      // Compute the display-space price from the Y position
      const displayPrice = yToValueScaled(y, yRange, chartHeight, mode)
      ctx.fillText(
        formatPrice(displayPrice, precision, mode, customPriceFmt),
        width - 6,
        y + 3,
      )
    }
  }

  // ── Bid/ask labels on price axis ──
  //
  // Drawn after the axis background (which would paint over them) and before
  // the last-close label so the last-price tag wins when they overlap.

  if (priceAxisVisible && input.quoteLines) {
    for (const [price, color] of [
      [input.quoteLines.ask, theme.downCandle],
      [input.quoteLines.bid, theme.upCandle],
    ] as const) {
      const resolved = quoteLineY(
        price,
        bars,
        viewport,
        yRange,
        chartHeight,
        mode,
      )
      if (!resolved) continue
      ctx.fillStyle = color
      ctx.fillRect(chartWidth + 1, resolved.y - 8, priceAxisWidth - 2, 16)
      ctx.fillStyle = theme.axisBackground
      ctx.font = `${theme.fontSizeAxis}px ${theme.fontFamilyMono}`
      ctx.textAlign = 'right'
      ctx.fillText(
        formatPrice(resolved.displayPrice, precision, mode, customPriceFmt),
        width - 6,
        resolved.y + 4,
      )
    }
  }

  // ── Last close label on price axis ──

  if (priceAxisVisible && input.lastClose != null) {
    const visibleBarsLC = bars.slice(
      Math.max(0, viewport.startIndex),
      viewport.endIndex + 1,
    )
    const basePriceLC = visibleBarsLC[0]?.close ?? 0
    const lastCloseDisplayLC =
      mode === 'percentage' || mode === 'indexedTo100'
        ? transformPriceForMode(input.lastClose, basePriceLC, mode)
        : input.lastClose
    const lastCloseYLC = valueToYScaled(
      lastCloseDisplayLC,
      yRange,
      chartHeight,
      mode,
    )
    if (lastCloseYLC >= 0 && lastCloseYLC <= chartHeight) {
      ctx.fillStyle = lastCloseColor
      ctx.fillRect(chartWidth + 1, lastCloseYLC - 8, priceAxisWidth - 2, 16)
      ctx.fillStyle = '#ffffff'
      ctx.font = `${theme.fontSizeAxis}px ${theme.fontFamilyMono}`
      ctx.textAlign = 'right'
      ctx.fillText(
        formatPrice(lastCloseDisplayLC, precision, mode, customPriceFmt),
        width - 6,
        lastCloseYLC + 4,
      )
    }
  }

  // ── Time axis labels ──
  //
  // Ticks are planned on calendar boundaries and measured before they are
  // drawn (see time-ticks.ts), so labels never collide no matter how narrow
  // the chart gets or how long the visible range is.

  const axisFont = timeAxisFont(theme)
  const ticks =
    input.timeTicks ??
    computeTimeAxisTicks({
      bars,
      viewport,
      chartWidth,
      measureText: createTextMeasurer(ctx, axisFont),
      tickMarkFormatter: input.tickMarkFormatter,
      locale: input.locale,
    })

  ctx.fillStyle = theme.axisText
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = axisFont

  const labelY = chartHeight + timeAxisHeight / 2
  for (const tick of ticks) {
    ctx.fillText(tick.label, tick.labelX, labelY)
  }
  ctx.textBaseline = 'alphabetic'

  // Crosshair price/time labels are rendered in ui-overlay-pass because it updates
  // on DirtyFlags.UI for every pointer move (text-overlay-pass does not).

  ctx.restore()
}

export const valueToOverlayY = (
  value: number,
  range: NumericRange,
  height: number,
  timeAxisHeight = textOverlayMetrics.timeAxisHeight,
  scaleMode?: PriceScaleMode,
): number => {
  return valueToYScaled(
    value,
    range,
    Math.max(1, height - timeAxisHeight),
    scaleMode ?? 'linear',
  )
}
