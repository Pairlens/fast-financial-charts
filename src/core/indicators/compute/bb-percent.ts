import { computeBollingerBands } from './bollinger'
import type { SyncIndicatorComputeFn } from '../../../types'

export const computeBBPercent: SyncIndicatorComputeFn = ({ bars, params }) => {
  const period = Math.max(2, Number(params.period ?? 20))
  const stdDev = Math.max(0.1, Number(params.stdDev ?? 2))

  const bb = computeBollingerBands({
    bars,
    params: { period, stdDev },
    timeframeMs: 0,
  })
  if (bb.length === 0) {
    return []
  }

  return bb.map((point) => {
    const upper = Number(point.upper)
    const lower = Number(point.lower)
    const bandwidth = upper - lower
    const close = bars.find((b) => b.ts === point.ts)?.close ?? 0

    return {
      ts: point.ts,
      value: bandwidth === 0 ? 0 : (close - lower) / bandwidth,
    }
  })
}
