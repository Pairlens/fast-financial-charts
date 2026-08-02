import { computeBollingerBands } from './bollinger'
import type { SyncIndicatorComputeFn } from '../../../types'

export const computeBBWidth: SyncIndicatorComputeFn = ({ bars, params }) => {
  const period = Math.max(2, Number(params.period ?? 20))
  const stdDev = Math.max(0.1, Number(params.stdDev ?? 2))

  const bb = computeBollingerBands({
    bars,
    params: { period, stdDev },
    timeframeMs: 0,
  })

  return bb.map((point) => {
    const upper = Number(point.upper)
    const lower = Number(point.lower)
    const middle = Number(point.middle)
    return {
      ts: point.ts,
      value: middle === 0 ? 0 : (upper - lower) / middle,
    }
  })
}
