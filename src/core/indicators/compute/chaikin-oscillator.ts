import { computeEMA } from './ema'
import type { SyncIndicatorComputeFn } from '../../../types'

export const computeChaikinOscillator: SyncIndicatorComputeFn = ({
  bars,
  params,
}) => {
  const fast = Math.max(1, Number(params.fast ?? 3))
  const slow = Math.max(1, Number(params.slow ?? 10))

  if (bars.length < 2) {
    return []
  }

  // Step 1: Accumulation/Distribution line
  let ad = 0
  const adBars: Array<{
    ts: number
    open: number
    high: number
    low: number
    close: number
    volume: number
  }> = []

  for (const bar of bars) {
    const range = bar.high - bar.low
    const clv =
      range === 0 ? 0 : (bar.close - bar.low - (bar.high - bar.close)) / range
    ad += clv * bar.volume
    adBars.push({
      ts: bar.ts,
      open: 0,
      high: 0,
      low: 0,
      close: ad,
      volume: 0,
    })
  }

  // Step 2: Fast and slow EMA of the A/D line
  const fastEma = computeEMA({
    bars: adBars,
    params: { period: fast },
    timeframeMs: 0,
  })
  const slowEma = computeEMA({
    bars: adBars,
    params: { period: slow },
    timeframeMs: 0,
  })

  if (fastEma.length === 0 || slowEma.length === 0) {
    return []
  }

  // Step 3: Chaikin = fastEMA - slowEMA
  const slowMap = new Map(slowEma.map((p) => [p.ts, Number(p.value)]))

  return fastEma
    .filter((p) => slowMap.has(p.ts))
    .map((p) => ({
      ts: p.ts,
      value: Number(p.value) - slowMap.get(p.ts)!,
    }))
}
