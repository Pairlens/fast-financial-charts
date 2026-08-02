import type { SyncIndicatorComputeFn } from '../../../types'

export const computeStochastic: SyncIndicatorComputeFn = ({ bars, params }) => {
  const kPeriod = Math.max(2, Number(params.kPeriod ?? 14))
  const dPeriod = Math.max(1, Number(params.dPeriod ?? 3))
  const smooth = Math.max(1, Number(params.smooth ?? 3))

  if (bars.length < kPeriod) {
    return []
  }

  const rawK: Array<{ ts: number; value: number }> = []

  for (let index = kPeriod - 1; index < bars.length; index += 1) {
    let highest = -Infinity
    let lowest = Infinity
    for (let j = index - kPeriod + 1; j <= index; j += 1) {
      highest = Math.max(highest, bars[j].high)
      lowest = Math.min(lowest, bars[j].low)
    }
    const range = highest - lowest
    rawK.push({
      ts: bars[index].ts,
      value: range === 0 ? 50 : ((bars[index].close - lowest) / range) * 100,
    })
  }

  // Smooth %K with SMA
  const smoothedK: Array<{ ts: number; value: number }> = []
  for (let index = smooth - 1; index < rawK.length; index += 1) {
    let sum = 0
    for (let j = 0; j < smooth; j += 1) {
      sum += rawK[index - j].value
    }
    smoothedK.push({ ts: rawK[index].ts, value: sum / smooth })
  }

  // %D = SMA of smoothed %K
  const values: Array<{ ts: number; k: number; d: number }> = []
  for (let index = dPeriod - 1; index < smoothedK.length; index += 1) {
    let sum = 0
    for (let j = 0; j < dPeriod; j += 1) {
      sum += smoothedK[index - j].value
    }
    values.push({
      ts: smoothedK[index].ts,
      k: smoothedK[index].value,
      d: sum / dPeriod,
    })
  }

  return values
}
