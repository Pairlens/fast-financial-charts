import { valueToY } from '../../data/scales'
import {
  drawGuideLines,
  drawTitleLabel,
  strokeLine,
  toLinePoints,
} from './utils'
import type { IndicatorPresenter } from '../../../types'

const CHOP_RANGE = { min: 0, max: 100 }

export const choppinessPresenter: IndicatorPresenter = (context) => {
  const { ctx, width, height, theme, indicator } = context

  const points = toLinePoints(
    context.bars,
    context.values,
    context.viewport,
    width,
    (value) => valueToY(value, CHOP_RANGE, height),
  )

  drawGuideLines(
    ctx,
    [38.2, 61.8],
    CHOP_RANGE,
    width,
    height,
    theme.indicator.stochastic.guide,
    theme,
  )

  const period = indicator.params.period ?? 14
  drawTitleLabel(ctx, `CHOP(${period})`, indicator.color, theme)

  strokeLine(ctx, points, indicator.color, 1.5)
}
