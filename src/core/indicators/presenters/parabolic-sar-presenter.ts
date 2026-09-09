import { findBarIndexByTs } from '../../data/binary-search'
import { computePriceRange, valueToY } from '../../data/scales'
import { drawDots } from './utils'
import type { IndicatorPresenter } from '../../../types'
import { getVisibleBars, isIndexVisible } from '../../data/viewport-slicer'

export const parabolicSarPresenter: IndicatorPresenter = (context) => {
  const { ctx, height, width, theme } = context
  const visibleBars = getVisibleBars(context.bars, context.viewport)
  const range = computePriceRange(visibleBars)
  const total = Math.max(
    1,
    context.viewport.endIndex - context.viewport.startIndex + 1,
  )

  const bullPoints: Array<{ x: number; y: number }> = []
  const bearPoints: Array<{ x: number; y: number }> = []

  for (const point of context.values) {
    const index = findBarIndexByTs(context.bars, point.ts)
    if (
      !isIndexVisible(context.viewport, index)
    ) {
      continue
    }

    const value = Number(point.value)
    if (!Number.isFinite(value)) {
      continue
    }

    const x = ((index - context.viewport.startIndex + 0.5) / total) * width
    const y = valueToY(value, range, height)

    if (Number(point.direction) === 1) {
      bullPoints.push({ x, y })
    } else {
      bearPoints.push({ x, y })
    }
  }

  drawDots(ctx, bullPoints, theme.indicator.supertrend.up, 2)
  drawDots(ctx, bearPoints, theme.indicator.supertrend.down, 2)
}
