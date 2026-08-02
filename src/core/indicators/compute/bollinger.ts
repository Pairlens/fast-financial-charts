import { computeSMA } from './sma'
import type { SyncIndicatorComputeFn } from '../../../types'

export const computeBollingerBands: SyncIndicatorComputeFn = ({
  bars,
  params,
}) => {
  const period = Math.max(2, Number(params.period ?? 20))
  const stdDev = Math.max(0.1, Number(params.stdDev ?? 2))
  const sma = computeSMA({ bars, params: { period }, timeframeMs: 0 })

  return sma.map((value, index) => {
    const sample = bars.slice(index, index + period)
    const mean = Number(value.value ?? 0)
    const variance =
      sample.reduce((sum, bar) => sum + Math.pow(bar.close - mean, 2), 0) /
      Math.max(1, sample.length)
    const deviation = Math.sqrt(variance)

    return {
      ts: value.ts,
      upper: mean + stdDev * deviation,
      middle: mean,
      lower: mean - stdDev * deviation,
    }
  })
}
