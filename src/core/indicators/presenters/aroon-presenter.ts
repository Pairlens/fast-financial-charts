import { valueToY } from '../../data/scales'
import {
  drawGuideLines,
  drawTitleLabel,
  strokeLine,
  toMultiLinePoints,
} from './utils'
import type { IndicatorPresenter } from '../../../types'

const AROON_RANGE = { min: 0, max: 100 }

export const aroonPresenter: IndicatorPresenter = (context) => {
  const { ctx, width, height, theme, indicator } = context

  const lines = toMultiLinePoints(
    context.bars,
    context.values,
    context.viewport,
    width,
    ['aroonUp', 'aroonDown'],
    (value) => valueToY(value, AROON_RANGE, height),
  )

  drawGuideLines(
    ctx,
    [30, 50, 70],
    AROON_RANGE,
    width,
    height,
    theme.indicator.adx.guide,
    theme,
  )

  const period = indicator.params.period ?? 25
  drawTitleLabel(ctx, `Aroon(${period})`, indicator.color, theme)

  strokeLine(ctx, lines.get('aroonUp') ?? [], theme.indicator.adx.plusDI, 1.5)
  strokeLine(
    ctx,
    lines.get('aroonDown') ?? [],
    theme.indicator.adx.minusDI,
    1.5,
  )
}
