import type { SyncIndicatorComputeFn } from '../../../types'

export const computeWMA: SyncIndicatorComputeFn = ({ bars, params }) => {
  const period = Math.max(1, Number(params.period ?? 20))
  if (bars.length < period) {
    return []
  }

  const denominator = (period * (period + 1)) / 2
  const values: Array<{ ts: number; value: number }> = []

  for (let index = period - 1; index < bars.length; index += 1) {
    let sum = 0
    for (let w = 0; w < period; w += 1) {
      sum += bars[index - period + 1 + w].close * (w + 1)
    }
    values.push({ ts: bars[index].ts, value: sum / denominator })
  }

  return values
}
