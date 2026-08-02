import { computeRSI } from './rsi'
import type { SyncIndicatorComputeFn } from '../../../types'

export const computeStochRSI: SyncIndicatorComputeFn = ({ bars, params }) => {
  const rsiPeriod = Math.max(2, Number(params.rsiPeriod ?? 14))
  const stochPeriod = Math.max(2, Number(params.stochPeriod ?? 14))
  const kSmooth = Math.max(1, Number(params.kSmooth ?? 3))
  const dSmooth = Math.max(1, Number(params.dSmooth ?? 3))

  const rsiValues = computeRSI({
    bars,
    params: { period: rsiPeriod },
    timeframeMs: 0,
  })
  if (rsiValues.length < stochPeriod) {
    return []
  }

  const rsiNums = rsiValues.map((p) => Number(p.value))

  // Stochastic on RSI values
  const rawK: Array<{ ts: number; value: number }> = []
  for (let index = stochPeriod - 1; index < rsiNums.length; index += 1) {
    let highest = -Infinity
    let lowest = Infinity
    for (let j = index - stochPeriod + 1; j <= index; j += 1) {
      highest = Math.max(highest, rsiNums[j])
      lowest = Math.min(lowest, rsiNums[j])
    }
    const range = highest - lowest
    rawK.push({
      ts: rsiValues[index].ts,
      value: range === 0 ? 50 : ((rsiNums[index] - lowest) / range) * 100,
    })
  }

  // Smooth %K
  const smoothedK: Array<{ ts: number; value: number }> = []
  for (let index = kSmooth - 1; index < rawK.length; index += 1) {
    let sum = 0
    for (let j = 0; j < kSmooth; j += 1) {
      sum += rawK[index - j].value
    }
    smoothedK.push({ ts: rawK[index].ts, value: sum / kSmooth })
  }

  // %D = SMA of smoothed %K
  const values: Array<{ ts: number; k: number; d: number }> = []
  for (let index = dSmooth - 1; index < smoothedK.length; index += 1) {
    let sum = 0
    for (let j = 0; j < dSmooth; j += 1) {
      sum += smoothedK[index - j].value
    }
    values.push({
      ts: smoothedK[index].ts,
      k: smoothedK[index].value,
      d: sum / dSmooth,
    })
  }

  return values
}
