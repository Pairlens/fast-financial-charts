import { computeEMA } from './ema'
import type { SyncIndicatorComputeFn } from '../../../types'

export const computeMassIndex: SyncIndicatorComputeFn = ({ bars, params }) => {
  const emaPeriod = Math.max(1, Number(params.emaPeriod ?? 9))
  const sumPeriod = Math.max(1, Number(params.sumPeriod ?? 25))

  if (bars.length < emaPeriod * 2 + sumPeriod) {
    return []
  }

  // Step 1: Single EMA of (high - low)
  const rangeBars = bars.map((bar) => ({
    ts: bar.ts,
    open: 0,
    high: 0,
    low: 0,
    close: bar.high - bar.low,
    volume: 0,
  }))

  const singleEma = computeEMA({
    bars: rangeBars,
    params: { period: emaPeriod },
    timeframeMs: 0,
  })

  if (singleEma.length < emaPeriod) {
    return []
  }

  // Step 2: Double EMA = EMA of single EMA
  const singleEmaBars = singleEma.map((p) => ({
    ts: p.ts,
    open: 0,
    high: 0,
    low: 0,
    close: Number(p.value),
    volume: 0,
  }))

  const doubleEma = computeEMA({
    bars: singleEmaBars,
    params: { period: emaPeriod },
    timeframeMs: 0,
  })

  if (doubleEma.length < sumPeriod) {
    return []
  }

  // Step 3: Ratio = singleEMA / doubleEMA
  const singleMap = new Map(singleEma.map((p) => [p.ts, Number(p.value)]))
  const ratios: Array<{ ts: number; ratio: number }> = []

  for (const p of doubleEma) {
    const single = singleMap.get(p.ts)
    const double = Number(p.value)
    if (single !== undefined && double !== 0) {
      ratios.push({ ts: p.ts, ratio: single / double })
    }
  }

  if (ratios.length < sumPeriod) {
    return []
  }

  // Step 4: Rolling sum of ratio over sumPeriod
  const values: Array<{ ts: number; value: number }> = []
  let rollingSum = 0

  for (let index = 0; index < ratios.length; index += 1) {
    rollingSum += ratios[index].ratio

    if (index >= sumPeriod) {
      rollingSum -= ratios[index - sumPeriod].ratio
    }

    if (index >= sumPeriod - 1) {
      values.push({
        ts: ratios[index].ts,
        value: rollingSum,
      })
    }
  }

  return values
}
