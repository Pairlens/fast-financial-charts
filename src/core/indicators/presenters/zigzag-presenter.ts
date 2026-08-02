import { computePriceRange, valueToY } from '../../data/scales'
import { strokeLine, toLinePoints } from './utils'
import type { IndicatorPresenter } from '../../../types'

export const zigzagPresenter: IndicatorPresenter = (context) => {
  const visibleBars = context.bars.slice(
    context.viewport.startIndex,
    context.viewport.endIndex + 1,
  )
  const range = computePriceRange(visibleBars)

  const points = toLinePoints(
    context.bars,
    context.values,
    context.viewport,
    context.width,
    (value) => valueToY(value, range, context.height),
  )

  strokeLine(context.ctx, points, context.indicator.color, 1.5)
}
