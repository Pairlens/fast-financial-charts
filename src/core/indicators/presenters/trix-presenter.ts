import { computeNumericRange, valueToY } from '../../data/scales'
import {
  drawTitleLabel,
  drawZeroLine,
  strokeLine,
  toMultiLinePoints,
} from './utils'
import type { IndicatorPresenter } from '../../../types'

export const trixPresenter: IndicatorPresenter = (context) => {
  const { ctx, width, height, theme, indicator } = context

  const allValues = context.values
    .flatMap((p) => [Number(p.value), Number(p.signal)])
    .filter((v) => Number.isFinite(v))
  const range = computeNumericRange(allValues, { min: -1, max: 1 }, 0.08)

  const lines = toMultiLinePoints(
    context.bars,
    context.values,
    context.viewport,
    width,
    ['value', 'signal'],
    (value) => valueToY(value, range, height),
  )

  drawZeroLine(ctx, range, width, height, theme.indicator.oscillator.zeroLine)

  const period = indicator.params.period ?? 15
  drawTitleLabel(ctx, `TRIX(${period})`, indicator.color, theme)

  strokeLine(ctx, lines.get('value') ?? [], indicator.color, 1.5)
  strokeLine(ctx, lines.get('signal') ?? [], theme.indicator.macd.signal, 1.1)
}
