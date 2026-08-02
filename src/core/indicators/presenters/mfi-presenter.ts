import { valueToY } from '../../data/scales'
import {
  drawGuideLines,
  drawTitleLabel,
  strokeLine,
  toLinePoints,
} from './utils'
import type { IndicatorPresenter } from '../../../types'

const MFI_RANGE = { min: 0, max: 100 }

export const mfiPresenter: IndicatorPresenter = (context) => {
  const { ctx, width, height, theme, indicator } = context

  const points = toLinePoints(
    context.bars,
    context.values,
    context.viewport,
    width,
    (value) => valueToY(value, MFI_RANGE, height),
  )

  drawGuideLines(
    ctx,
    [20, 50, 80],
    MFI_RANGE,
    width,
    height,
    theme.indicator.stochastic.guide,
    theme,
  )

  const period = indicator.params.period ?? 14
  drawTitleLabel(ctx, `MFI(${period})`, indicator.color, theme)

  strokeLine(ctx, points, indicator.color, 1.5)
}
