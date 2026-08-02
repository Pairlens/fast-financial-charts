import { computePriceRange, valueToY } from '../../data/scales'
import { drawTitleLabel, strokeLine, toMultiLinePoints } from './utils'
import type { IndicatorPresenter } from '../../../types'

export const chandeKrollStopPresenter: IndicatorPresenter = (context) => {
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
    ['stopLong', 'stopShort'],
    (value) => valueToY(value, range, height),
  )

  drawTitleLabel(ctx, 'CKS', indicator.color, theme)

  strokeLine(ctx, lines.get('stopLong') ?? [], theme.upCandle, 1.2)
  strokeLine(ctx, lines.get('stopShort') ?? [], theme.downCandle, 1.2)
}
