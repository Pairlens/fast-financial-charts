import { valueToY } from '../../data/scales'
import {
  drawGuideLines,
  drawTitleLabel,
  strokeLine,
  toLinePoints,
} from './utils'
import type { IndicatorPresenter } from '../../../types'

const UO_RANGE = { min: 0, max: 100 }

export const ultimateOscillatorPresenter: IndicatorPresenter = (context) => {
  const { ctx, width, height, theme, indicator } = context

  const points = toLinePoints(
    context.bars,
    context.values,
    context.viewport,
    width,
    (value) => valueToY(value, UO_RANGE, height),
  )

  drawGuideLines(
    ctx,
    [30, 50, 70],
    UO_RANGE,
    width,
    height,
    theme.indicator.stochastic.guide,
    theme,
  )
  drawTitleLabel(ctx, 'UO', indicator.color, theme)

  strokeLine(ctx, points, indicator.color, 1.5)
}
