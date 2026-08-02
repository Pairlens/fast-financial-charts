import { computeSMA } from './sma'
import type { SyncIndicatorComputeFn } from '../../../types'

export const computeVolumeOscillator: SyncIndicatorComputeFn = ({
  bars,
  params,
}) => {
  const fast = Math.max(1, Number(params.fast ?? 5))
  const slow = Math.max(1, Number(params.slow ?? 10))
  if (bars.length < slow) {
    return []
  }

  // Create fake bars where close = volume for SMA computation
  const volumeBars = bars.map((bar) => ({
    ts: bar.ts,
    open: 0,
    high: 0,
    low: 0,
    close: bar.volume,
    volume: 0,
  }))

  const fastSma = computeSMA({
    bars: volumeBars,
    params: { period: fast },
    timeframeMs: 0,
  })
  const slowSma = computeSMA({
    bars: volumeBars,
    params: { period: slow },
    timeframeMs: 0,
  })

  // Build lookup by ts for fast SMA
  const fastByTs = new Map<number, number>()
  for (const point of fastSma) {
    fastByTs.set(point.ts, Number(point.value))
  }

  const values: Array<{ ts: number; value: number }> = []

  for (const point of slowSma) {
    const fastVal = fastByTs.get(point.ts)
    const slowVal = Number(point.value)
    if (fastVal === undefined) {
      continue
    }
    values.push({
      ts: point.ts,
      value: slowVal === 0 ? 0 : (100 * (fastVal - slowVal)) / slowVal,
    })
  }

  return values
}
