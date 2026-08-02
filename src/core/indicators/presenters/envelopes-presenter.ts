import { computePriceRange, valueToY } from '../../data/scales'
import {
  drawTitleLabel,
  fillBetweenLines,
  strokeLine,
  toMultiLinePoints,
} from './utils'
import type { IndicatorPresenter } from '../../../types'

export const envelopesPresenter: IndicatorPresenter = (context) => {
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
    ['upper', 'lower', 'basis'],
    (value) => valueToY(value, range, height),
  )

  const upper = lines.get('upper') ?? []
  const lower = lines.get('lower') ?? []
  const basis = lines.get('basis') ?? []

  fillBetweenLines(ctx, upper, lower, indicator.color + '18')

  drawTitleLabel(
    ctx,
    `Env(${indicator.params.period ?? 20})`,
    indicator.color,
    theme,
  )

  strokeLine(ctx, upper, indicator.color, 1)
  strokeLine(ctx, lower, indicator.color, 1)
  strokeLine(ctx, basis, indicator.color + '88', 0.8)
}
