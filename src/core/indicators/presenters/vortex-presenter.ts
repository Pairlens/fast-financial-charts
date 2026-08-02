import { computeNumericRange, valueToY } from '../../data/scales'
import {
  drawGuideLines,
  drawTitleLabel,
  strokeLine,
  toMultiLinePoints,
} from './utils'
import type { IndicatorPresenter } from '../../../types'

export const vortexPresenter: IndicatorPresenter = (context) => {
  const { ctx, width, height, theme, indicator } = context

  const allValues = context.values
    .flatMap((p) => [Number(p.plus), Number(p.minus)])
    .filter((v) => Number.isFinite(v))
  const range = computeNumericRange(allValues, { min: 0, max: 2 }, 0.08)

  const lines = toMultiLinePoints(
    context.bars,
    context.values,
    context.viewport,
    width,
    ['plus', 'minus'],
    (value) => valueToY(value, range, height),
  )

  drawGuideLines(
    ctx,
    [1],
    range,
    width,
    height,
    theme.indicator.adx.guide,
    theme,
  )

  const period = indicator.params.period ?? 14
  drawTitleLabel(ctx, `VI(${period})`, indicator.color, theme)

  strokeLine(ctx, lines.get('plus') ?? [], theme.indicator.adx.plusDI, 1.5)
  strokeLine(ctx, lines.get('minus') ?? [], theme.indicator.adx.minusDI, 1.5)
}
