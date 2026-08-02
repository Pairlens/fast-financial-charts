import { computeNumericRange, valueToY } from '../../data/scales'
import {
  drawGuideLines,
  drawTitleLabel,
  strokeLine,
  toLinePoints,
} from './utils'
import type { IndicatorPresenter } from '../../../types'

export const massIndexPresenter: IndicatorPresenter = (context) => {
  const { ctx, width, height, theme, indicator } = context

  const numericValues = context.values
    .map((p) => Number(p.value))
    .filter((v) => Number.isFinite(v))
  const range = computeNumericRange(numericValues, { min: 20, max: 30 }, 0.08)

  const points = toLinePoints(
    context.bars,
    context.values,
    context.viewport,
    width,
    (value) => valueToY(value, range, height),
  )

  drawGuideLines(
    ctx,
    [26.5, 27],
    range,
    width,
    height,
    theme.indicator.stochastic.guide,
    theme,
  )
  drawTitleLabel(
    ctx,
    `MI(${indicator.params.sumPeriod ?? 25})`,
    indicator.color,
    theme,
  )

  strokeLine(ctx, points, indicator.color, 1.5)
}
