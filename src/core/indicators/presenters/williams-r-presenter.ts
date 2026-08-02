import { valueToY } from '../../data/scales'
import {
  drawGuideLines,
  drawTitleLabel,
  strokeLine,
  toLinePoints,
} from './utils'
import type { IndicatorPresenter } from '../../../types'

const WILLIAMS_RANGE = { min: -100, max: 0 }

export const williamsRPresenter: IndicatorPresenter = (context) => {
  const { ctx, width, height, theme, indicator } = context

  const points = toLinePoints(
    context.bars,
    context.values,
    context.viewport,
    width,
    (value) => valueToY(value, WILLIAMS_RANGE, height),
  )

  drawGuideLines(
    ctx,
    [-80, -50, -20],
    WILLIAMS_RANGE,
    width,
    height,
    theme.indicator.stochastic.guide,
    theme,
  )

  const period = indicator.params.period ?? 14
  drawTitleLabel(ctx, `W%R(${period})`, indicator.color, theme)

  strokeLine(ctx, points, indicator.color, 1.5)
}
