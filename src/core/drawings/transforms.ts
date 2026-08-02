import { findBarIndexByTs } from '../data/binary-search'
import { valueToYScaled, yToValue, yToValueScaled } from '../data/scales'
import type {
  ChartBar,
  ChartViewport,
  DrawingPoint,
  NumericRange,
} from '../../types'
import type { PriceScaleMode } from '../../types/viewport'

export type DrawingTransformContext = {
  bars: Array<ChartBar>
  viewport: ChartViewport
  width: number
  height: number
  range: NumericRange
  priceScaleMode?: PriceScaleMode
}

export const toXFromTs = (
  ts: number,
  context: DrawingTransformContext,
): number => {
  const index = findBarIndexByTs(context.bars, ts)
  const total = Math.max(
    1,
    context.viewport.endIndex - context.viewport.startIndex + 1,
  )
  return ((index - context.viewport.startIndex + 0.5) / total) * context.width
}

export const toYFromPrice = (
  price: number,
  context: DrawingTransformContext,
): number => {
  if (context.priceScaleMode && context.priceScaleMode !== 'normal') {
    return valueToYScaled(
      price,
      context.range,
      context.height,
      context.priceScaleMode,
    )
  }
  const ratio =
    (price - context.range.min) /
    Math.max(1e-9, context.range.max - context.range.min)
  return context.height - Math.max(0, Math.min(1, ratio)) * context.height
}

export const toDrawingPoint = (
  x: number,
  y: number,
  context: DrawingTransformContext,
  snap = false,
): DrawingPoint => {
  const total = Math.max(
    1,
    context.viewport.endIndex - context.viewport.startIndex + 1,
  )
  const ratio = Math.max(0, Math.min(1, x / Math.max(1, context.width)))
  const index = Math.max(
    context.viewport.startIndex,
    Math.min(
      context.viewport.endIndex,
      context.viewport.startIndex + Math.round(ratio * total - 0.5),
    ),
  )
  const barIndex = Math.max(0, Math.min(context.bars.length - 1, index))
  const bar = context.bars[barIndex] ?? context.bars[context.bars.length - 1]

  let price =
    context.priceScaleMode && context.priceScaleMode !== 'normal'
      ? yToValueScaled(y, context.range, context.height, context.priceScaleMode)
      : yToValue(y, context.range, context.height)

  // Snap to nearest OHLC value when enabled
  if (snap && bar) {
    const ohlc = [bar.open, bar.high, bar.low, bar.close]
    let bestDist = Number.POSITIVE_INFINITY
    for (const candidate of ohlc) {
      const dist = Math.abs(candidate - price)
      if (dist < bestDist) {
        bestDist = dist
        price = candidate
      }
    }
  }

  return {
    ts: bar?.ts ?? 0,
    price,
  }
}
