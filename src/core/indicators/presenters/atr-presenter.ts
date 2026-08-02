import { computeNumericRange, valueToY } from '../../data/scales'
import { strokeLine, toLinePoints } from './utils'
import type { IndicatorPresenter } from '../../../types'

export const atrPresenter: IndicatorPresenter = (context) => {
  const numericValues = context.values
    .map((point) => Number(point.value))
    .filter((value) => Number.isFinite(value))
  const range = computeNumericRange(numericValues, { min: 0, max: 1 })
  const points = toLinePoints(
    context.bars,
    context.values,
    context.viewport,
    context.width,
    (value) => valueToY(value, range, context.height),
  )

  strokeLine(context.ctx, points, context.indicator.color, 1.3)
}
