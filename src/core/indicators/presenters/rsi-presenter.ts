import { valueToY } from '../../data/scales'
import {
  drawGuideLines,
  drawTitleLabel,
  strokeLine,
  toLinePoints,
} from './utils'
import type { IndicatorPresenter } from '../../../types'

const RSI_RANGE = { min: 0, max: 100 }

export const rsiPresenter: IndicatorPresenter = (context) => {
  const { ctx, width, height, theme, indicator } = context

  const points = toLinePoints(
    context.bars,
    context.values,
    context.viewport,
    width,
    (value) => valueToY(value, RSI_RANGE, height),
  )

  drawGuideLines(
    ctx,
    [30, 50, 70],
    RSI_RANGE,
    width,
    height,
    theme.indicator.rsi.guide,
    theme,
  )

  const period = indicator.params.period ?? 14
  drawTitleLabel(ctx, `RSI(${period})`, indicator.color, theme)

  strokeLine(ctx, points, indicator.color, 1.5)
}
