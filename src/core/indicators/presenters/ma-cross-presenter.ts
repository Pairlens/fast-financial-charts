import { computePriceRange, valueToY } from '../../data/scales'
import { drawTitleLabel, strokeLine, toMultiLinePoints } from './utils'
import type { IndicatorPresenter } from '../../../types'

export const createMaCrossPresenter = (
  labelFn: (params: Record<string, boolean | number | string>) => string,
  fields: [string, string],
): IndicatorPresenter => {
  return (context) => {
    const { ctx, width, height, theme, indicator } = context
    const visibleBars = context.bars.slice(
      context.viewport.startIndex,
      context.viewport.endIndex + 1,
    )
    const range = computePriceRange(visibleBars)

    const lines = toMultiLinePoints(
      context.bars,
      context.values,
      context.viewport,
      width,
      fields,
      (value) => valueToY(value, range, height),
    )

    drawTitleLabel(ctx, labelFn(indicator.params), indicator.color, theme)

    strokeLine(ctx, lines.get(fields[0]) ?? [], indicator.color, 1.5)
    strokeLine(ctx, lines.get(fields[1]) ?? [], indicator.color + '88', 1.5)
  }
}

export const maCrossPresenter = createMaCrossPresenter(
  (params) => `MA Cross(${params.fastPeriod ?? 9},${params.slowPeriod ?? 21})`,
  ['fast', 'slow'],
)

export const emaCrossPresenter = createMaCrossPresenter(
  (params) => `EMA Cross(${params.fastPeriod ?? 9},${params.slowPeriod ?? 21})`,
  ['fast', 'slow'],
)

export const maWithEmaCrossPresenter = createMaCrossPresenter(
  (params) => `MA/EMA(${params.smaPeriod ?? 10},${params.emaPeriod ?? 21})`,
  ['sma', 'ema'],
)
