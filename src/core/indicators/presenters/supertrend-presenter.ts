import { findBarIndexByTs } from '../../data/binary-search'
import { computePriceRange, valueToY } from '../../data/scales'
import { drawTitleLabel, strokeColorSwitchingLine } from './utils'
import type { IndicatorPresenter } from '../../../types'
import { getVisibleBars, isIndexVisible } from '../../data/viewport-slicer'

export const supertrendPresenter: IndicatorPresenter = (context) => {
  const { ctx, width, height, theme, indicator } = context
  const visibleBars = getVisibleBars(context.bars, context.viewport)
  const range = computePriceRange(visibleBars)
  const total = Math.max(
    1,
    context.viewport.endIndex - context.viewport.startIndex + 1,
  )

  const points: Array<{ x: number; y: number; color: string }> = []

  for (const point of context.values) {
    const index = findBarIndexByTs(context.bars, point.ts)
    if (
      !isIndexVisible(context.viewport, index)
    ) {
      continue
    }

    const value = Number(point.value)
    const direction = Number(point.direction)
    if (!Number.isFinite(value)) {
      continue
    }

    const x = ((index - context.viewport.startIndex + 0.5) / total) * width
    const y = valueToY(value, range, height)
    const color =
      direction === 1
        ? theme.indicator.supertrend.up
        : theme.indicator.supertrend.down

    points.push({ x, y, color })
  }

  strokeColorSwitchingLine(ctx, points, 2)

  const period = indicator.params.period ?? 10
  const mult = indicator.params.multiplier ?? 3
  drawTitleLabel(ctx, `ST(${period},${mult})`, indicator.color, theme)
}
