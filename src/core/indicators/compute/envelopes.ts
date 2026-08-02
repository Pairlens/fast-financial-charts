import { computeSMA } from './sma'
import type { SyncIndicatorComputeFn } from '../../../types'

export const computeEnvelopes: SyncIndicatorComputeFn = ({ bars, params }) => {
  const period = Math.max(1, Number(params.period ?? 20))
  const deviation = Math.max(0, Number(params.deviation ?? 10))

  const sma = computeSMA({ bars, params: { period }, timeframeMs: 0 })

  if (sma.length === 0) {
    return []
  }

  return sma.map((p) => {
    const basis = Number(p.value)
    return {
      ts: p.ts,
      upper: basis * (1 + deviation / 100),
      lower: basis * (1 - deviation / 100),
      basis,
    }
  })
}
