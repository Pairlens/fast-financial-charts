import { valueToY } from '../../data/scales'
import {
  drawGuideLines,
  drawTitleLabel,
  strokeLine,
  toMultiLinePoints,
} from './utils'
import type { IndicatorPresenter } from '../../../types'

const DM_RANGE = { min: 0, max: 100 }

export const directionalMovementPresenter: IndicatorPresenter = (context) => {
  const { ctx, width, height, theme, indicator } = context

  const lines = toMultiLinePoints(
    context.bars,
    context.values,
    context.viewport,
    width,
    ['plusDI', 'minusDI'],
    (value) => valueToY(value, DM_RANGE, height),
  )

  drawGuideLines(
    ctx,
    [25, 50, 75],
    DM_RANGE,
    width,
    height,
    theme.indicator.adx.guide,
    theme,
  )

  const period = indicator.params.period ?? 14
  drawTitleLabel(ctx, `DM(${period})`, indicator.color, theme)

  strokeLine(ctx, lines.get('plusDI') ?? [], theme.indicator.adx.plusDI, 1.5)
  strokeLine(ctx, lines.get('minusDI') ?? [], theme.indicator.adx.minusDI, 1.5)
}
