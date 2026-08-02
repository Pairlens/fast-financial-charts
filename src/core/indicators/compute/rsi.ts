import type { SyncIndicatorComputeFn } from '../../../types'

export const computeRSI: SyncIndicatorComputeFn = ({ bars, params }) => {
  const period = Math.max(2, Number(params.period ?? 14))
  if (bars.length <= period) {
    return []
  }

  let avgGain = 0
  let avgLoss = 0

  for (let index = 1; index <= period; index += 1) {
    const delta = bars[index].close - bars[index - 1].close
    if (delta >= 0) {
      avgGain += delta
    } else {
      avgLoss += Math.abs(delta)
    }
  }

  avgGain /= period
  avgLoss /= period

  const values: Array<{ ts: number; value: number }> = []

  for (let index = period; index < bars.length; index += 1) {
    if (index > period) {
      const delta = bars[index].close - bars[index - 1].close
      avgGain = (avgGain * (period - 1) + Math.max(delta, 0)) / period
      avgLoss = (avgLoss * (period - 1) + Math.max(-delta, 0)) / period
    }

    const rs = avgLoss === 0 ? Number.POSITIVE_INFINITY : avgGain / avgLoss
    const value = avgLoss === 0 ? 100 : 100 - 100 / (1 + rs)
    values.push({
      ts: bars[index].ts,
      value,
    })
  }

  return values
}
