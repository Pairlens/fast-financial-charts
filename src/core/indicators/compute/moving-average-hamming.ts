import type { SyncIndicatorComputeFn } from '../../../types'

export const computeMovingAverageHamming: SyncIndicatorComputeFn = ({
  bars,
  params,
}) => {
  const period = Math.max(1, Number(params.period ?? 20))
  if (bars.length < period) {
    return []
  }

  // Pre-compute normalized Hamming weights
  const weights: Array<number> = []
  let weightSum = 0

  for (let i = 0; i < period; i += 1) {
    const w =
      period === 1
        ? 1
        : 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (period - 1))
    weights.push(w)
    weightSum += w
  }

  // Normalize
  for (let i = 0; i < period; i += 1) {
    weights[i] /= weightSum
  }

  const values: Array<{ ts: number; value: number }> = []

  for (let index = period - 1; index < bars.length; index += 1) {
    let sum = 0
    for (let i = 0; i < period; i += 1) {
      sum += weights[i] * bars[index - period + 1 + i].close
    }
    values.push({
      ts: bars[index].ts,
      value: sum,
    })
  }

  return values
}
