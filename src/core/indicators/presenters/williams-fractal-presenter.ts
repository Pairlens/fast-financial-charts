import { findBarIndexByTs } from '../../data/binary-search'
import { computePriceRange, valueToY } from '../../data/scales'
import type { IndicatorPresenter } from '../../../types'
import { getVisibleBars, isIndexVisible } from '../../data/viewport-slicer'

export const williamsFractalPresenter: IndicatorPresenter = (context) => {
  const { ctx, width, height, theme } = context
  const visibleBars = getVisibleBars(context.bars, context.viewport)
  const range = computePriceRange(visibleBars)
  const total = Math.max(
    1,
    context.viewport.endIndex - context.viewport.startIndex + 1,
  )

  ctx.save()
  const size = 4

  for (const point of context.values) {
    const index = findBarIndexByTs(context.bars, point.ts)
    if (
      !isIndexVisible(context.viewport, index)
    ) {
      continue
    }

    const x = ((index - context.viewport.startIndex + 0.5) / total) * width
    const upVal = Number(point.up)
    const downVal = Number(point.down)

    // Up fractal: triangle above the high
    if (Number.isFinite(upVal)) {
      const y = valueToY(upVal, range, height) - size - 2
      ctx.fillStyle = theme.downCandle
      ctx.beginPath()
      ctx.moveTo(x, y - size)
      ctx.lineTo(x - size, y + size)
      ctx.lineTo(x + size, y + size)
      ctx.closePath()
      ctx.fill()
    }

    // Down fractal: triangle below the low
    if (Number.isFinite(downVal)) {
      const y = valueToY(downVal, range, height) + size + 2
      ctx.fillStyle = theme.upCandle
      ctx.beginPath()
      ctx.moveTo(x, y + size)
      ctx.lineTo(x - size, y - size)
      ctx.lineTo(x + size, y - size)
      ctx.closePath()
      ctx.fill()
    }
  }

  ctx.restore()
}
