import { computeEMA } from './ema'
import type { SyncIndicatorComputeFn } from '../../../types'

const emaFromValues = (
  values: Array<{ ts: number; value?: number }>,
  period: number,
) =>
  computeEMA({
    bars: values.map((p) => ({
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

export const computeTEMA: SyncIndicatorComputeFn = ({ bars, params }) => {
  const period = Math.max(1, Number(params.period ?? 20))
  const ema1 = computeEMA({ bars, params: { period }, timeframeMs: 0 })
  if (ema1.length === 0) {
    return []
  }

  const ema2 = emaFromValues(ema1, period)
  if (ema2.length === 0) {
    return []
  }

  const ema3 = emaFromValues(ema2, period)

  const ema1Map = new Map(ema1.map((p) => [p.ts, Number(p.value)]))
  const ema2Map = new Map(ema2.map((p) => [p.ts, Number(p.value)]))

  return ema3
    .filter((p) => ema1Map.has(p.ts) && ema2Map.has(p.ts))
    .map((p) => ({
      ts: p.ts,
      value: 3 * ema1Map.get(p.ts)! - 3 * ema2Map.get(p.ts)! + Number(p.value),
    }))
}
