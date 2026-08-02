import { valueToY } from '../../data/scales'
import {
  drawGuideLines,
  drawTitleLabel,
  strokeLine,
  toMultiLinePoints,
} from './utils'
import type { IndicatorPresenter } from '../../../types'

const STOCH_RANGE = { min: 0, max: 100 }

export const stochasticPresenter: IndicatorPresenter = (context) => {
  const { ctx, width, height, theme, indicator } = context

  const lines = toMultiLinePoints(
    context.bars,
    context.values,
    context.viewport,
    width,
    ['k', 'd'],
    (value) => valueToY(value, STOCH_RANGE, height),
  )

  drawGuideLines(
    ctx,
    [20, 50, 80],
    STOCH_RANGE,
    width,
    height,
    theme.indicator.stochastic.guide,
    theme,
  )

  const kPeriod = indicator.params.kPeriod ?? 14
  drawTitleLabel(ctx, `Stoch(${kPeriod})`, indicator.color, theme)

  strokeLine(ctx, lines.get('k') ?? [], indicator.color, 1.5)
  strokeLine(ctx, lines.get('d') ?? [], theme.indicator.stochastic.signal, 1.1)
}
