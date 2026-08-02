import { computePriceRange, valueToY } from '../../data/scales'
import { strokeLine, toMultiLinePoints } from './utils'
import type { IndicatorPresenter } from '../../../types'

export const alligatorPresenter: IndicatorPresenter = (context) => {
  const { width, height } = context
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
    ['jaw', 'teeth', 'lips'],
    (value) => valueToY(value, range, height),
  )

  // Jaw = blue, Teeth = red, Lips = green (standard Alligator colors)
  strokeLine(context.ctx, lines.get('jaw') ?? [], '#2196f3', 1.3)
  strokeLine(context.ctx, lines.get('teeth') ?? [], '#e91e63', 1.3)
  strokeLine(context.ctx, lines.get('lips') ?? [], '#4caf50', 1.3)
}
