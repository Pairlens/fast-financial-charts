import { computeNumericRange, valueToY } from '../../data/scales'
import {
  drawGuideLines,
  drawTitleLabel,
  strokeLine,
  toMultiLinePoints,
} from './utils'
import type { IndicatorPresenter } from '../../../types'

export const adxPresenter: IndicatorPresenter = (context) => {
  const { ctx, width, height, theme, indicator } = context

  const allValues = context.values
    .flatMap((p) => [Number(p.adx), Number(p.plusDI), Number(p.minusDI)])
    .filter((v) => Number.isFinite(v))
  const range = computeNumericRange(allValues, { min: 0, max: 100 }, 0.08)

  const lines = toMultiLinePoints(
    context.bars,
    context.values,
    context.viewport,
    width,
    ['adx', 'plusDI', 'minusDI'],
    (value) => valueToY(value, range, height),
  )

  drawGuideLines(
    ctx,
    [25],
    range,
    width,
    height,
    theme.indicator.adx.guide,
    theme,
  )

  const period = indicator.params.period ?? 14
  drawTitleLabel(ctx, `ADX(${period})`, indicator.color, theme)

  strokeLine(ctx, lines.get('adx') ?? [], indicator.color, 2)
  strokeLine(ctx, lines.get('plusDI') ?? [], theme.indicator.adx.plusDI, 1.1)
  strokeLine(ctx, lines.get('minusDI') ?? [], theme.indicator.adx.minusDI, 1.1)
}
