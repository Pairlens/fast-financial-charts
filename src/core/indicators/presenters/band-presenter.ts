import { findBarIndexByTs } from '../../data/binary-search'
import { computePriceRange, valueToY } from '../../data/scales'
import { fillBetweenLines, strokeLine } from './utils'
import type { IndicatorPresenter } from '../../../types'
import { getVisibleBars, isIndexVisible } from '../../data/viewport-slicer'

export const createBandPresenter = (_label: string): IndicatorPresenter => {
  return (context) => {
    const visibleBars = getVisibleBars(context.bars, context.viewport)
    const range = computePriceRange(visibleBars)
    const total = Math.max(
      1,
      context.viewport.endIndex - context.viewport.startIndex + 1,
    )

    const upper: Array<{ x: number; y: number }> = []
    const middle: Array<{ x: number; y: number }> = []
    const lower: Array<{ x: number; y: number }> = []

    for (const point of context.values) {
      const index = findBarIndexByTs(context.bars, point.ts)
      if (
        !isIndexVisible(context.viewport, index)
      ) {
        continue
      }

      const x =
        ((index - context.viewport.startIndex + 0.5) / total) * context.width
      const upperVal = Number(point.upper)
      const middleVal = Number(point.middle)
      const lowerVal = Number(point.lower)

      if (
        Number.isFinite(upperVal) &&
        Number.isFinite(middleVal) &&
        Number.isFinite(lowerVal)
      ) {
        upper.push({ x, y: valueToY(upperVal, range, context.height) })
        middle.push({ x, y: valueToY(middleVal, range, context.height) })
        lower.push({ x, y: valueToY(lowerVal, range, context.height) })
      }
    }

    fillBetweenLines(context.ctx, upper, lower, `${context.indicator.color}22`)
    strokeLine(context.ctx, upper, context.indicator.color, 1)
    strokeLine(context.ctx, middle, context.indicator.color, 1.5)
    strokeLine(context.ctx, lower, context.indicator.color, 1)
  }
}

export const donchianPresenter = createBandPresenter('DC')
export const keltnerPresenter = createBandPresenter('KC')
export const priceChannelPresenter = createBandPresenter('PC')
export const fiftyTwoWeekPresenter = createBandPresenter('52W')
