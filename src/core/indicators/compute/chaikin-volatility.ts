import { computeEMA } from './ema'
import type { SyncIndicatorComputeFn } from '../../../types'

export const computeChaikinVolatility: SyncIndicatorComputeFn = ({
  bars,
  params,
}) => {
  const emaPeriod = Math.max(1, Number(params.emaPeriod ?? 10))
  const rocPeriod = Math.max(1, Number(params.rocPeriod ?? 10))

  if (bars.length < emaPeriod + rocPeriod) {
    return []
  }

  // Step 1: High-low range as fake bars for EMA
  const rangeBars = bars.map((bar) => ({
    ts: bar.ts,
    open: 0,
    high: 0,
    low: 0,
    close: bar.high - bar.low,
    volume: 0,
  }))

  // Step 2: EMA of the high-low range
  const emaHL = computeEMA({
    bars: rangeBars,
    params: { period: emaPeriod },
    timeframeMs: 0,
  })

  if (emaHL.length <= rocPeriod) {
    return []
  }

  // Step 3: ROC of the EMA
  const values: Array<{ ts: number; value: number }> = []

  for (let index = rocPeriod; index < emaHL.length; index += 1) {
    const current = Number(emaHL[index].value)
    const previous = Number(emaHL[index - rocPeriod].value)
    const cv = previous === 0 ? 0 : (100 * (current - previous)) / previous

    values.push({
      ts: emaHL[index].ts,
      value: cv,
    })
  }

  return values
}
