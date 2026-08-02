import { computeNumericRange, valueToY } from '../../data/scales'
import {
  drawTitleLabel,
  drawZeroLine,
  strokeLine,
  toMultiLinePoints,
} from './utils'
import type { IndicatorPresenter } from '../../../types'

export const createSignalLinePresenter = (
  labelFn: (params: Record<string, boolean | number | string>) => string,
): IndicatorPresenter => {
  return (context) => {
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
    drawTitleLabel(ctx, labelFn(indicator.params), indicator.color, theme)

    strokeLine(ctx, lines.get('value') ?? [], indicator.color, 1.5)
    strokeLine(ctx, lines.get('signal') ?? [], theme.indicator.macd.signal, 1.1)
  }
}

export const fisherPresenter = createSignalLinePresenter(
  (params) => `Fisher(${params.period ?? 9})`,
)

export const kstPresenter = createSignalLinePresenter(
  (params) => `KST(${params.roc1 ?? 10})`,
)

export const klingerPresenter = createSignalLinePresenter(
  (params) => `KVO(${params.fast ?? 34},${params.slow ?? 55})`,
)

export const rviPresenter = createSignalLinePresenter(
  (params) => `RVI(${params.period ?? 10})`,
)

export const tsiPresenter = createSignalLinePresenter(
  (params) => `TSI(${params.longPeriod ?? 25},${params.shortPeriod ?? 13})`,
)

export const smiErgodicPresenter = createSignalLinePresenter(
  (params) => `SMI(${params.longPeriod ?? 20},${params.shortPeriod ?? 5})`,
)
