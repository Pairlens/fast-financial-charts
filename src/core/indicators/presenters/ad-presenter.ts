import { computeNumericRange, valueToY } from '../../data/scales'
import { drawTitleLabel, strokeLine, toLinePoints } from './utils'
import type { IndicatorPresenter } from '../../../types'

export const adPresenter: IndicatorPresenter = (context) => {
  const { ctx, width, height, theme, indicator } = context

  const numericValues = context.values
    .map((p) => Number(p.value))
    .filter((v) => Number.isFinite(v))
  const range = computeNumericRange(numericValues, { min: 0, max: 1 })

  const points = toLinePoints(
    context.bars,
    context.values,
    context.viewport,
    width,
    (value) => valueToY(value, range, height),
  )

  drawTitleLabel(ctx, 'A/D', indicator.color, theme)

  strokeLine(ctx, points, indicator.color, 1.5)
}
