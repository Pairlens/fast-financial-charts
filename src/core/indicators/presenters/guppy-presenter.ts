import { computePriceRange, valueToY } from '../../data/scales'
import { drawTitleLabel, strokeLine, toMultiLinePoints } from './utils'
import type { IndicatorPresenter } from '../../../types'

const SHORT_KEYS = [
  'short_3',
  'short_5',
  'short_8',
  'short_10',
  'short_12',
  'short_15',
]
const LONG_KEYS = [
  'long_30',
  'long_35',
  'long_40',
  'long_45',
  'long_50',
  'long_60',
]
const ALL_KEYS = [...SHORT_KEYS, ...LONG_KEYS]

export const guppyPresenter: IndicatorPresenter = (context) => {
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
    ALL_KEYS,
    (value) => valueToY(value, range, height),
  )

  drawTitleLabel(ctx, 'Guppy MMA', indicator.color, theme)

  const shortColor = indicator.color
  const longColor = indicator.color + '88'

  for (const key of SHORT_KEYS) {
    strokeLine(ctx, lines.get(key) ?? [], shortColor, 1)
  }
  for (const key of LONG_KEYS) {
    strokeLine(ctx, lines.get(key) ?? [], longColor, 1)
  }
}
