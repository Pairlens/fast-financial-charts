import { computeWMA } from './wma'
import type { SyncIndicatorComputeFn } from '../../../types'

export const computeHMA: SyncIndicatorComputeFn = ({ bars, params }) => {
  const period = Math.max(2, Number(params.period ?? 9))
  const halfPeriod = Math.max(1, Math.floor(period / 2))
  const sqrtPeriod = Math.max(1, Math.floor(Math.sqrt(period)))

  const wmaFull = computeWMA({ bars, params: { period }, timeframeMs: 0 })
  const wmaHalf = computeWMA({
    bars,
    params: { period: halfPeriod },
    timeframeMs: 0,
  })

  if (wmaFull.length === 0 || wmaHalf.length === 0) {
    return []
  }

  const fullMap = new Map(wmaFull.map((p) => [p.ts, Number(p.value)]))

  const diffBars = wmaHalf
    .filter((p) => fullMap.has(p.ts))
    .map((p) => {
      const diff = 2 * Number(p.value) - fullMap.get(p.ts)!
      return {
        ts: p.ts,
        open: diff,
        high: diff,
        low: diff,
        close: diff,
        volume: 0,
      }
    })

  const result = computeWMA({
    bars: diffBars,
    params: { period: sqrtPeriod },
    timeframeMs: 0,
  })

  return result.map((p) => ({ ts: p.ts, value: Number(p.value) }))
}
