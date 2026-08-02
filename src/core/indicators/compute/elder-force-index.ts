import { computeEMA } from './ema'
import type { SyncIndicatorComputeFn } from '../../../types'

export const computeElderForceIndex: SyncIndicatorComputeFn = ({
  bars,
  params,
}) => {
  const period = Math.max(1, Number(params.period ?? 13))
  if (bars.length < 2) {
    return []
  }

  const rawForce = []
  for (let index = 1; index < bars.length; index += 1) {
    rawForce.push({
      ts: bars[index].ts,
      open: 0,
      high: 0,
      low: 0,
      close: (bars[index].close - bars[index - 1].close) * bars[index].volume,
      volume: 0,
    })
  }

  if (period <= 1) {
    return rawForce.map((b) => ({ ts: b.ts, value: b.close }))
  }

  return computeEMA({
    bars: rawForce,
    params: { period },
    timeframeMs: 0,
  }).map((p) => ({ ts: p.ts, value: Number(p.value) }))
}
