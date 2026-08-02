import { computeROC } from './roc'
import { computeSMA } from './sma'
import type { SyncIndicatorComputeFn } from '../../../types'

const smaFromValues = (
  values: Array<{ ts: number; value?: number }>,
  period: number,
) => {
  const fakeBars = values.map((p) => ({
    ts: p.ts,
    open: Number(p.value),
    high: Number(p.value),
    low: Number(p.value),
    close: Number(p.value),
    volume: 0,
  }))
  return computeSMA({ bars: fakeBars, params: { period }, timeframeMs: 0 })
}

export const computeKST: SyncIndicatorComputeFn = ({ bars, params }) => {
  const roc1 = Math.max(1, Number(params.roc1 ?? 10))
  const roc2 = Math.max(1, Number(params.roc2 ?? 15))
  const roc3 = Math.max(1, Number(params.roc3 ?? 20))
  const roc4 = Math.max(1, Number(params.roc4 ?? 30))
  const sma1 = Math.max(1, Number(params.sma1 ?? 10))
  const sma2 = Math.max(1, Number(params.sma2 ?? 10))
  const sma3 = Math.max(1, Number(params.sma3 ?? 10))
  const sma4 = Math.max(1, Number(params.sma4 ?? 15))
  const signalPeriod = Math.max(1, Number(params.signal ?? 9))

  const rocValues1 = smaFromValues(
    computeROC({ bars, params: { period: roc1 }, timeframeMs: 0 }),
    sma1,
  )
  const rocValues2 = smaFromValues(
    computeROC({ bars, params: { period: roc2 }, timeframeMs: 0 }),
    sma2,
  )
  const rocValues3 = smaFromValues(
    computeROC({ bars, params: { period: roc3 }, timeframeMs: 0 }),
    sma3,
  )
  const rocValues4 = smaFromValues(
    computeROC({ bars, params: { period: roc4 }, timeframeMs: 0 }),
    sma4,
  )

  const map2 = new Map(rocValues2.map((p) => [p.ts, Number(p.value)]))
  const map3 = new Map(rocValues3.map((p) => [p.ts, Number(p.value)]))
  const map4 = new Map(rocValues4.map((p) => [p.ts, Number(p.value)]))

  const kstLine = rocValues1
    .filter((p) => map2.has(p.ts) && map3.has(p.ts) && map4.has(p.ts))
    .map((p) => ({
      ts: p.ts,
      value:
        Number(p.value) * 1 +
        map2.get(p.ts)! * 2 +
        map3.get(p.ts)! * 3 +
        map4.get(p.ts)! * 4,
    }))

  if (kstLine.length === 0) {
    return []
  }

  const signalLine = smaFromValues(kstLine, signalPeriod)
  const signalMap = new Map(signalLine.map((p) => [p.ts, Number(p.value)]))

  return kstLine.map((point) => ({
    ts: point.ts,
    value: point.value,
    signal: signalMap.get(point.ts) ?? point.value,
  }))
}
