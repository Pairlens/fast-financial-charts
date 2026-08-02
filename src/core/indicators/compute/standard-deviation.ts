import type { SyncIndicatorComputeFn } from '../../../types'

export const computeStandardDeviation: SyncIndicatorComputeFn = ({
  bars,
  params,
}) => {
  const period = Math.max(2, Number(params.period ?? 20))
  if (bars.length < period) {
    return []
  }

  const values: Array<{ ts: number; value: number }> = []

  for (let index = period - 1; index < bars.length; index += 1) {
    let sum = 0
    for (let j = index - period + 1; j <= index; j += 1) {
      sum += bars[j].close
    }
    const mean = sum / period

    let variance = 0
    for (let j = index - period + 1; j <= index; j += 1) {
      variance += Math.pow(bars[j].close - mean, 2)
    }
    variance /= period - 1

    values.push({
      ts: bars[index].ts,
      value: Math.sqrt(variance),
    })
  }

  return values
}
