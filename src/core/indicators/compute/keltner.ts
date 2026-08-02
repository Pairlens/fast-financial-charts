import { computeATR } from './atr'
import { computeEMA } from './ema'
import type { SyncIndicatorComputeFn } from '../../../types'

export const computeKeltnerChannels: SyncIndicatorComputeFn = ({
  bars,
  params,
}) => {
  const period = Math.max(2, Number(params.period ?? 20))
  const atrPeriod = Math.max(2, Number(params.atrPeriod ?? 10))
  const multiplier = Math.max(0.1, Number(params.multiplier ?? 2))

  const emaValues = computeEMA({ bars, params: { period }, timeframeMs: 0 })
  const atrValues = computeATR({
    bars,
    params: { period: atrPeriod },
    timeframeMs: 0,
  })

  if (emaValues.length === 0 || atrValues.length === 0) {
    return []
  }

  const atrMap = new Map(atrValues.map((p) => [p.ts, Number(p.value)]))

  return emaValues
    .filter((p) => atrMap.has(p.ts))
    .map((p) => {
      const mid = Number(p.value)
      const atr = atrMap.get(p.ts)!
      return {
        ts: p.ts,
        upper: mid + multiplier * atr,
        middle: mid,
        lower: mid - multiplier * atr,
      }
    })
}
