import { computeNumericRange, valueToY } from '../../data/scales'
import { findBarIndexByTs } from '../../data/binary-search'
import { strokeLine } from './utils'
import type { IndicatorPresenter } from '../../../types'

export const macdPresenter: IndicatorPresenter = (context) => {
  const total = Math.max(
    1,
    context.viewport.endIndex - context.viewport.startIndex + 1,
  )

  const values = context.values
    .map((point) => [
      Number(point.macd),
      Number(point.signal),
      Number(point.histogram),
    ])
    .flat()
    .filter((value) => Number.isFinite(value))

  const range = computeNumericRange(values, { min: -1, max: 1 }, 0.1)
  const macdLine: Array<{ x: number; y: number }> = []
  const signalLine: Array<{ x: number; y: number }> = []
  const zeroY = valueToY(0, range, context.height)

  context.ctx.save()

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
    const macdValue = Number(point.macd)
    const signalValue = Number(point.signal)
    const histogramValue = Number(point.histogram)

    if (Number.isFinite(histogramValue)) {
      const y = valueToY(histogramValue, range, context.height)
      const height = Math.abs(zeroY - y)
      context.ctx.fillStyle =
        histogramValue >= 0
          ? context.theme.indicator.macd.histogramUp
          : context.theme.indicator.macd.histogramDown
      context.ctx.fillRect(x - 1, Math.min(y, zeroY), 2, Math.max(1, height))
    }

    if (Number.isFinite(macdValue)) {
      macdLine.push({ x, y: valueToY(macdValue, range, context.height) })
    }

    if (Number.isFinite(signalValue)) {
      signalLine.push({ x, y: valueToY(signalValue, range, context.height) })
    }
  }

  context.ctx.strokeStyle = context.theme.indicator.macd.zeroLine
  context.ctx.lineWidth = 1
  context.ctx.beginPath()
  context.ctx.moveTo(0, zeroY)
  context.ctx.lineTo(context.width, zeroY)
  context.ctx.stroke()

  context.ctx.restore()

  strokeLine(context.ctx, macdLine, context.indicator.color, 1.5)
  strokeLine(context.ctx, signalLine, context.theme.indicator.macd.signal, 1.1)
}
