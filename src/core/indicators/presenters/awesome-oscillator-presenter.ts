import { findBarIndexByTs } from '../../data/binary-search'
import { computeNumericRange, valueToY } from '../../data/scales'
import { drawTitleLabel, drawZeroLine } from './utils'
import type { IndicatorPresenter } from '../../../types'

export const awesomeOscillatorPresenter: IndicatorPresenter = (context) => {
  const { ctx, width, height, theme, indicator } = context
  const total = Math.max(
    1,
    context.viewport.endIndex - context.viewport.startIndex + 1,
  )

  const numericValues = context.values
    .map((p) => Number(p.value))
    .filter((v) => Number.isFinite(v))
  const range = computeNumericRange(numericValues, { min: -1, max: 1 }, 0.08)
  const zeroY = valueToY(0, range, height)

  ctx.save()

  let prevValue = 0
  for (const point of context.values) {
    const index = findBarIndexByTs(context.bars, point.ts)
    if (
      index < context.viewport.startIndex ||
      index > context.viewport.endIndex
    ) {
      continue
    }

    const value = Number(point.value)
    if (!Number.isFinite(value)) {
      continue
    }

    const x = ((index - context.viewport.startIndex + 0.5) / total) * width
    const y = valueToY(value, range, height)
    const barHeight = Math.abs(zeroY - y)

    ctx.fillStyle = value >= prevValue ? theme.upCandle : theme.downCandle
    ctx.fillRect(x - 1.5, Math.min(y, zeroY), 3, Math.max(1, barHeight))

    prevValue = value
  }

  ctx.restore()

  drawZeroLine(ctx, range, width, height, theme.indicator.oscillator.zeroLine)
  drawTitleLabel(ctx, 'AO', indicator.color, theme)
}
