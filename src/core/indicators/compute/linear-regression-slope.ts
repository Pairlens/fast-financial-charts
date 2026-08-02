import type { SyncIndicatorComputeFn } from '../../../types'

export const computeLinearRegressionSlope: SyncIndicatorComputeFn = ({
  bars,
  params,
}) => {
  const period = Math.max(1, Number(params.period ?? 25))
  if (bars.length < period) {
    return []
  }

  const values: Array<{ ts: number; value: number }> = []

  // Pre-compute constants that depend only on period
  const sumX = (period * (period - 1)) / 2
  const sumX2 = (period * (period - 1) * (2 * period - 1)) / 6
  const denom = period * sumX2 - sumX * sumX

  for (let index = period - 1; index < bars.length; index += 1) {
    const offset = index - period + 1
    let sumY = 0
    let sumXY = 0

    for (let i = 0; i < period; i += 1) {
      const y = bars[offset + i].close
      sumY += y
      sumXY += i * y
    }

    const m = (period * sumXY - sumX * sumY) / denom

    values.push({
      ts: bars[index].ts,
      value: m,
    })
  }

  return values
}
