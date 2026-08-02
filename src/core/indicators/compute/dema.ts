import { computeEMA } from './ema'
import type { SyncIndicatorComputeFn } from '../../../types'

export const computeDEMA: SyncIndicatorComputeFn = ({ bars, params }) => {
  const period = Math.max(1, Number(params.period ?? 20))
  const ema1 = computeEMA({ bars, params: { period }, timeframeMs: 0 })
  if (ema1.length === 0) {
    return []
  }

  const ema2 = computeEMA({
    bars: ema1.map((p) => ({
      ts: p.ts,
      open: Number(p.value),
      high: Number(p.value),
      low: Number(p.value),
      close: Number(p.value),
      volume: 0,
    })),
    params: { period },
    timeframeMs: 0,
  })

  const ema1Map = new Map(ema1.map((p) => [p.ts, Number(p.value)]))

  return ema2
    .filter((p) => ema1Map.has(p.ts))
    .map((p) => ({
      ts: p.ts,
      value: 2 * ema1Map.get(p.ts)! - Number(p.value),
    }))
}
