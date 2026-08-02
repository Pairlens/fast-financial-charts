import type { SyncIndicatorComputeFn } from '../../../types'

export const computeALMA: SyncIndicatorComputeFn = ({ bars, params }) => {
  const period = Math.max(2, Number(params.period ?? 9))
  const offset = Math.max(0, Math.min(1, Number(params.offset ?? 0.85)))
  const sigma = Math.max(0.1, Number(params.sigma ?? 6))

  if (bars.length < period) {
    return []
  }

  const m = offset * (period - 1)
  const s = period / sigma

  const weights: Array<number> = []
  let weightSum = 0
  for (let i = 0; i < period; i += 1) {
    const w = Math.exp(-((i - m) * (i - m)) / (2 * s * s))
    weights.push(w)
    weightSum += w
  }

  const values: Array<{ ts: number; value: number }> = []

  for (let index = period - 1; index < bars.length; index += 1) {
    let sum = 0
    for (let i = 0; i < period; i += 1) {
      sum += bars[index - period + 1 + i].close * weights[i]
    }
    values.push({
      ts: bars[index].ts,
      value: sum / weightSum,
    })
  }

  return values
}
