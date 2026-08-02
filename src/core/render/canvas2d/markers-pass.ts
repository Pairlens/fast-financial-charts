import { findBarIndexByTs } from '../../data/binary-search'
import { transformPriceForMode, valueToYScaled } from '../../data/scales'
import type {
  ChartBar,
  ChartTheme,
  ChartViewport,
  NumericRange,
  SeriesMarker,
} from '../../../types'
import type { PriceScaleMode } from '../../../types/viewport'

export type MarkersPassInput = {
  ctx: CanvasRenderingContext2D
  width: number
  height: number
  bars: Array<ChartBar>
  viewport: ChartViewport
  yRange: NumericRange
  theme: ChartTheme
  markers: Array<SeriesMarker>
  priceAxisWidth: number
  timeAxisHeight: number
  priceScaleMode?: PriceScaleMode
}

const DEFAULT_MARKER_SIZE = 12
const MARKER_OFFSET = 8

/**
 * Render series markers (buy/sell signals, pattern markers, etc.)
 * on specific bars with configurable shape, color, and position.
 */
export const renderMarkersPass = (input: MarkersPassInput): void => {
  const {
    ctx,
    bars,
    viewport,
    yRange,
    theme,
    markers,
    priceAxisWidth,
    timeAxisHeight,
    width,
    height,
  } = input
  const mode = input.priceScaleMode ?? 'normal'

  if (markers.length === 0 || bars.length === 0) {
    return
  }

  const chartWidth = Math.max(1, width - priceAxisWidth)
  const chartHeight = Math.max(1, height - timeAxisHeight)
  const total = Math.max(1, viewport.endIndex - viewport.startIndex + 1)

  const visibleBars = bars.slice(
    Math.max(0, viewport.startIndex),
    viewport.endIndex + 1,
  )
  const basePrice = visibleBars[0]?.close ?? 0
  const needsTransform = mode === 'percentage' || mode === 'indexedTo100'

  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 0, chartWidth, chartHeight)
  ctx.clip()

  for (const marker of markers) {
    const barIndex = findBarIndexByTs(bars, marker.time)
    if (barIndex < viewport.startIndex || barIndex > viewport.endIndex) {
      continue
    }

    const bar = bars[barIndex]
    if (!bar) {
      continue
    }

    const x = ((barIndex - viewport.startIndex + 0.5) / total) * chartWidth
    const size = marker.size ?? DEFAULT_MARKER_SIZE

    // Compute Y position based on marker.position
    let y: number
    if (marker.position === 'aboveBar') {
      const highVal = needsTransform
        ? transformPriceForMode(bar.high, basePrice, mode)
        : bar.high
      y =
        valueToYScaled(highVal, yRange, chartHeight, mode) -
        MARKER_OFFSET -
        size / 2
    } else if (marker.position === 'belowBar') {
      const lowVal = needsTransform
        ? transformPriceForMode(bar.low, basePrice, mode)
        : bar.low
      y =
        valueToYScaled(lowVal, yRange, chartHeight, mode) +
        MARKER_OFFSET +
        size / 2
    } else {
      // inBar - use close price
      const closeVal = needsTransform
        ? transformPriceForMode(bar.close, basePrice, mode)
        : bar.close
      y = valueToYScaled(closeVal, yRange, chartHeight, mode)
    }

    ctx.fillStyle = marker.color

    switch (marker.shape) {
      case 'circle':
        ctx.beginPath()
        ctx.arc(x, y, size / 2, 0, Math.PI * 2)
        ctx.fill()
        break

      case 'square':
        ctx.fillRect(x - size / 2, y - size / 2, size, size)
        break

      case 'arrowUp': {
        const half = size / 2
        ctx.beginPath()
        ctx.moveTo(x, y - half)
        ctx.lineTo(x + half, y + half)
        ctx.lineTo(x - half, y + half)
        ctx.closePath()
        ctx.fill()
        break
      }

      case 'arrowDown': {
        const half = size / 2
        ctx.beginPath()
        ctx.moveTo(x, y + half)
        ctx.lineTo(x + half, y - half)
        ctx.lineTo(x - half, y - half)
        ctx.closePath()
        ctx.fill()
        break
      }
    }

    // Text label below/above the shape
    if (marker.text) {
      ctx.fillStyle = marker.color
      ctx.font = `${Math.max(8, theme.fontSizeAxis - 2)}px ${theme.fontFamilyMono}`
      ctx.textAlign = 'center'
      const textY =
        marker.position === 'belowBar' ? y + size / 2 + 12 : y - size / 2 - 4
      ctx.fillText(marker.text, x, textY)
    }
  }

  ctx.restore()
}
