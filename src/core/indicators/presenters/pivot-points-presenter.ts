import { computePriceRange, valueToY } from '../../data/scales'
import type { IndicatorPresenter } from '../../../types'

export const pivotPointsPresenter: IndicatorPresenter = (context) => {
  const { ctx, width, height, theme } = context
  const visibleBars = context.bars.slice(
    context.viewport.startIndex,
    context.viewport.endIndex + 1,
  )
  const range = computePriceRange(visibleBars)

  // Use the last visible value to draw horizontal lines
  const lastPoint = context.values[context.values.length - 1]
  if (!lastPoint) {
    return
  }

  const levels = [
    { key: 'r3', color: '#ef444488', label: 'R3' },
    { key: 'r2', color: '#ef444466', label: 'R2' },
    { key: 'r1', color: '#ef444444', label: 'R1' },
    { key: 'pp', color: '#8b7dff88', label: 'PP' },
    { key: 's1', color: '#22c55e44', label: 'S1' },
    { key: 's2', color: '#22c55e66', label: 'S2' },
    { key: 's3', color: '#22c55e88', label: 'S3' },
  ]

  ctx.save()
  ctx.font = `9px ${theme.fontFamilyMono}`

  for (const level of levels) {
    const value = Number(lastPoint[level.key])
    if (!Number.isFinite(value)) {
      continue
    }

    const y = valueToY(value, range, height)
    if (y < 0 || y > height) {
      continue
    }

    ctx.strokeStyle = level.color
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
    ctx.setLineDash([])

    ctx.fillStyle = level.color
    ctx.textAlign = 'left'
    ctx.fillText(level.label, 4, y - 3)
  }

  ctx.restore()
}
