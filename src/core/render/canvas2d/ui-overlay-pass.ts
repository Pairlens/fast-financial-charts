import { findBarIndexByTs } from '../../data/binary-search'
import { valueToYScaled, yToValueScaled } from '../../data/scales'
import type {
  ChartBar,
  ChartTheme,
  ChartViewport,
  CrosshairConfig,
  DrawingObject,
  NumericRange,
} from '../../../types'
import type { PriceScaleMode, TimeTickType } from '../../../types/viewport'

type UiOverlayPassInput = {
  ctx: CanvasRenderingContext2D
  width: number
  height: number
  bars: Array<ChartBar>
  viewport: ChartViewport
  range: NumericRange
  theme: ChartTheme
  crosshair: { x: number; y: number; visible: boolean }
  hoveredDrawing: DrawingObject | null
  priceScaleMode?: PriceScaleMode
  crosshairConfig?: CrosshairConfig
  priceFormatter?: (price: number) => string
  /** Series color used for the datapoint indicator dot */
  seriesColor?: string
  /** Time axis height in pixels (needed for time label placement) */
  timeAxisHeight?: number
  /** Price axis width in pixels */
  priceAxisWidth?: number
  /** Custom time formatter */
  tickMarkFormatter?: (time: number, tickType: TimeTickType) => string
  /** Simple time formatter from localization config */
  timeFormatter?: (time: number) => string
}

const toDash = (style?: 'solid' | 'dashed' | 'dotted'): Array<number> => {
  if (style === 'dotted') return [2, 2]
  if (style === 'solid') return []
  return [4, 4] // default: dashed
}

const getTickType = (spanMs: number): TimeTickType => {
  if (spanMs > 365 * 24 * 60 * 60 * 1000) return 'year'
  if (spanMs > 30 * 24 * 60 * 60 * 1000) return 'month'
  if (spanMs > 24 * 60 * 60 * 1000) return 'day'
  return 'time'
}

const formatCrosshairTime = (
  bar: ChartBar,
  spanMs: number,
  customFormatter?: (time: number, tickType: TimeTickType) => string,
  simpleFormatter?: (time: number) => string,
): string => {
  if (customFormatter) return customFormatter(bar.ts, getTickType(spanMs))
  if (simpleFormatter) return simpleFormatter(bar.ts)

  const date = new Date(bar.ts)

  if (spanMs > 30 * 24 * 60 * 60 * 1000) {
    return `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`
  }
  if (spanMs > 3 * 24 * 60 * 60 * 1000) {
    return `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:00`
  }
  if (spanMs > 6 * 60 * 60 * 1000) {
    const day = date.toLocaleDateString(undefined, { weekday: 'short' })
    return `${day} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
  }
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}

const formatCrosshairPrice = (
  price: number,
  mode: PriceScaleMode,
  customFormatter?: (price: number) => string,
): string => {
  if (customFormatter) return customFormatter(price)
  if (mode === 'percentage')
    return `${price >= 0 ? '+' : ''}${price.toFixed(2)}%`
  if (mode === 'indexedTo100') return price.toFixed(2)
  return price.toFixed(2)
}

export const renderUiOverlayPass = (input: UiOverlayPassInput): void => {
  input.ctx.clearRect(0, 0, input.width, input.height)

  if (!input.crosshair.visible) {
    return
  }

  const vertLine = input.crosshairConfig?.vertLine
  const horzLine = input.crosshairConfig?.horzLine

  input.ctx.save()

  // ── Vertical crosshair line ──
  if (vertLine?.visible !== false) {
    input.ctx.strokeStyle = vertLine?.color ?? `${input.theme.crosshair}66`
    input.ctx.lineWidth = vertLine?.width ?? 1
    input.ctx.setLineDash(toDash(vertLine?.style))
    input.ctx.beginPath()
    input.ctx.moveTo(input.crosshair.x, 0)
    input.ctx.lineTo(input.crosshair.x, input.height)
    input.ctx.stroke()
  }

  // ── Horizontal crosshair line ──
  if (horzLine?.visible !== false) {
    input.ctx.strokeStyle = horzLine?.color ?? `${input.theme.crosshair}66`
    input.ctx.lineWidth = horzLine?.width ?? 1
    input.ctx.setLineDash(toDash(horzLine?.style))
    input.ctx.beginPath()
    input.ctx.moveTo(0, input.crosshair.y)
    input.ctx.lineTo(input.width, input.crosshair.y)
    input.ctx.stroke()
  }

  input.ctx.setLineDash([])

  const timeAxisH = input.timeAxisHeight ?? 22
  const priceAxisW = input.priceAxisWidth ?? 74
  const chartWidth = Math.max(1, input.width - priceAxisW)
  const chartHeight = Math.max(1, input.height - timeAxisH)

  const total = Math.max(
    1,
    input.viewport.endIndex - input.viewport.startIndex + 1,
  )
  // Resolve against the plot width, not the canvas width — the series is drawn
  // in plot space, so dividing by the full canvas would report a bar to the
  // left of the one actually under the cursor.
  const ratio = Math.max(0, Math.min(1, input.crosshair.x / chartWidth))
  const index = Math.min(
    input.bars.length - 1,
    Math.max(0, input.viewport.startIndex + Math.round(ratio * total - 0.5)),
  )
  const bar = input.bars[index]

  // ── Horizontal line price label (at live crosshair Y) ──

  if (
    priceAxisW > 0 &&
    horzLine?.labelVisible !== false &&
    input.crosshair.y >= 0 &&
    input.crosshair.y <= chartHeight
  ) {
    const mode = input.priceScaleMode ?? 'normal'
    const crossPrice = yToValueScaled(
      input.crosshair.y,
      input.range,
      chartHeight,
      mode,
    )
    input.ctx.fillStyle =
      horzLine?.labelBackgroundColor ?? `${input.theme.crosshair}cc`
    input.ctx.fillRect(
      chartWidth + 1,
      input.crosshair.y - 8,
      priceAxisW - 2,
      16,
    )
    input.ctx.fillStyle = input.theme.hudText
    input.ctx.font = `${input.theme.fontSizeAxis}px ${input.theme.fontFamilyMono}`
    input.ctx.textAlign = 'right'
    input.ctx.fillText(
      formatCrosshairPrice(crossPrice, mode, input.priceFormatter),
      input.width - 6,
      input.crosshair.y + 4,
    )
  }

  // ── Datapoint indicator dot ──
  if (bar && input.crosshair.x >= 0 && input.crosshair.x <= chartWidth) {
    const mode = input.priceScaleMode ?? 'normal'
    const dotY = valueToYScaled(bar.close, input.range, chartHeight, mode)
    if (dotY >= 0 && dotY <= chartHeight) {
      const dotColor = input.seriesColor ?? '#4aa8ff'
      input.ctx.beginPath()
      input.ctx.arc(input.crosshair.x, dotY, 4, 0, Math.PI * 2)
      input.ctx.fillStyle = dotColor
      input.ctx.fill()
      input.ctx.strokeStyle = input.theme.background
      input.ctx.lineWidth = 1.5
      input.ctx.stroke()
    }
  }

  // ── X-axis time label ──
  if (bar && input.crosshair.x >= 0 && input.crosshair.x <= chartWidth) {
    const firstBar = input.bars[Math.max(0, input.viewport.startIndex)]
    const lastBarVis =
      input.bars[Math.min(input.bars.length - 1, input.viewport.endIndex)]
    const spanMs =
      firstBar && lastBarVis ? Math.abs(lastBarVis.ts - firstBar.ts) : 0

    const label = formatCrosshairTime(
      bar,
      spanMs,
      input.tickMarkFormatter,
      input.timeFormatter,
    )
    input.ctx.font = `${Math.max(8, input.theme.fontSizeAxis - 1)}px ${input.theme.fontFamilyMono}`
    const labelWidth = input.ctx.measureText(label).width + 8
    input.ctx.fillStyle = `${input.theme.crosshair}cc`
    input.ctx.fillRect(
      input.crosshair.x - labelWidth / 2,
      chartHeight + 1,
      labelWidth,
      timeAxisH - 2,
    )
    input.ctx.fillStyle = input.theme.hudText
    input.ctx.textAlign = 'center'
    input.ctx.fillText(label, input.crosshair.x, input.height - 6)
  }

  if (input.hoveredDrawing) {
    const pointAnchor =
      input.hoveredDrawing.type === 'line' ||
      input.hoveredDrawing.type === 'rectangle' ||
      input.hoveredDrawing.type === 'circle'
        ? input.hoveredDrawing.points[0]
        : null

    const anchorTs =
      input.hoveredDrawing.type === 'hline'
        ? input.bars[input.viewport.endIndex]?.ts
        : input.hoveredDrawing.type === 'vline'
          ? input.hoveredDrawing.ts
          : pointAnchor?.ts

    const anchorPrice =
      input.hoveredDrawing.type === 'hline'
        ? input.hoveredDrawing.price
        : input.hoveredDrawing.type === 'vline'
          ? input.bars[input.viewport.endIndex]?.close
          : pointAnchor?.price

    const safeTs = anchorTs ?? 0
    const safePrice = anchorPrice ?? 0
    const anchorIndex = findBarIndexByTs(input.bars, safeTs)

    const x =
      ((anchorIndex - input.viewport.startIndex + 0.5) / total) * chartWidth
    const y = valueToYScaled(
      safePrice,
      input.range,
      chartHeight,
      input.priceScaleMode ?? 'normal',
    )

    input.ctx.fillStyle = input.theme.hudBg
    input.ctx.fillRect(x + 6, y - 16, 72, 14)
    input.ctx.fillStyle = input.theme.hudText
    input.ctx.font = `${input.theme.fontSizeHud}px ${input.theme.fontFamilyMono}`
    input.ctx.textAlign = 'left'
    input.ctx.fillText(input.hoveredDrawing.type.toUpperCase(), x + 9, y - 6)
  }

  input.ctx.restore()
}
