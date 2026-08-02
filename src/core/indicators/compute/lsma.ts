import type { SyncIndicatorComputeFn } from '../../../types'

export const computeLSMA: SyncIndicatorComputeFn = ({ bars, params }) => {
  const period = Math.max(1, Number(params.period ?? 25))
  if (bars.length < period) {
    return []
  }

  const values: Array<{ ts: number; value: number }> = []

  for (let index = period - 1; index < bars.length; index += 1) {
    let sumX = 0
    let sumY = 0
    let sumXY = 0
    let sumX2 = 0

    for (let j = 0; j < period; j += 1) {
      const x = j
      const y = bars[index - period + 1 + j].close
      sumX += x
      sumY += y
      sumXY += x * y
      sumX2 += x * x
    }

    const slope =
      (period * sumXY - sumX * sumY) / (period * sumX2 - sumX * sumX)
    const intercept = (sumY - slope * sumX) / period
    const value = intercept + slope * (period - 1)

    values.push({
      ts: bars[index].ts,
      value,
    })
  }

  return values
}
