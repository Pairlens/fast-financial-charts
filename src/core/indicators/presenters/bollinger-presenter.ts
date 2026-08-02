import { computePriceRange, valueToY } from '../../data/scales'
import { findBarIndexByTs } from '../../data/binary-search'
import { strokeLine } from './utils'
import type { IndicatorPresenter } from '../../../types'

export const bollingerPresenter: IndicatorPresenter = (context) => {
  const visibleBars = context.bars.slice(
    context.viewport.startIndex,
    context.viewport.endIndex + 1,
  )
  const range = computePriceRange(visibleBars)
  const total = Math.max(
    1,
    context.viewport.endIndex - context.viewport.startIndex + 1,
  )

  const upper: Array<{ x: number; y: number }> = []
  const middle: Array<{ x: number; y: number }> = []
  const lower: Array<{ x: number; y: number }> = []

  for (const point of context.values) {
    const index = findBarIndexByTs(context.bars, point.ts)
    if (
      index < context.viewport.startIndex ||
      index > context.viewport.endIndex
    ) {
      continue
    }

    const x =
      ((index - context.viewport.startIndex + 0.5) / total) * context.width
    const upperValue = Number(point.upper)
    const middleValue = Number(point.middle)
    const lowerValue = Number(point.lower)

    if (
      Number.isFinite(upperValue) &&
      Number.isFinite(middleValue) &&
      Number.isFinite(lowerValue)
    ) {
      upper.push({ x, y: valueToY(upperValue, range, context.height) })
      middle.push({ x, y: valueToY(middleValue, range, context.height) })
      lower.push({ x, y: valueToY(lowerValue, range, context.height) })
    }
  }

  if (upper.length > 1 && lower.length > 1) {
    context.ctx.save()
    context.ctx.fillStyle = `${context.indicator.color}22`
    context.ctx.beginPath()
    upper.forEach((point, index) => {
      if (index === 0) {
        context.ctx.moveTo(point.x, point.y)
      } else {
        context.ctx.lineTo(point.x, point.y)
      }
    })

    for (let index = lower.length - 1; index >= 0; index -= 1) {
      const point = lower[index]
      context.ctx.lineTo(point.x, point.y)
    }

    context.ctx.closePath()
    context.ctx.fill()
    context.ctx.restore()
  }

  strokeLine(context.ctx, upper, context.indicator.color, 1)
  strokeLine(context.ctx, middle, context.indicator.color, 1.5)
  strokeLine(context.ctx, lower, context.indicator.color, 1)
}
