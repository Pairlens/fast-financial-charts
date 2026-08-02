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

export const computeSMIErgodic: SyncIndicatorComputeFn = ({ bars, params }) => {
  const longPeriod = Math.max(1, Number(params.longPeriod ?? 20))
  const shortPeriod = Math.max(1, Number(params.shortPeriod ?? 5))
  const signalPeriod = Math.max(1, Number(params.signal ?? 5))

  if (bars.length < 2) {
    return []
  }

  // Price change series
  const changes: Array<{ ts: number; value: number }> = []
  const absChanges: Array<{ ts: number; value: number }> = []

  for (let index = 1; index < bars.length; index += 1) {
    const change = bars[index].close - bars[index - 1].close
    changes.push({ ts: bars[index].ts, value: change })
    absChanges.push({ ts: bars[index].ts, value: Math.abs(change) })
  }

  // Double-smooth momentum: EMA(EMA(change, longPeriod), shortPeriod)
  const emaLongMom = emaFromValues(changes, longPeriod)
  if (emaLongMom.length === 0) {
    return []
  }
  const doubleSmoothMom = emaFromValues(emaLongMom, shortPeriod)
  if (doubleSmoothMom.length === 0) {
    return []
  }

  // Double-smooth absolute momentum: EMA(EMA(|change|, longPeriod), shortPeriod)
  const emaLongAbs = emaFromValues(absChanges, longPeriod)
  if (emaLongAbs.length === 0) {
    return []
  }
  const doubleSmoothAbs = emaFromValues(emaLongAbs, shortPeriod)
  if (doubleSmoothAbs.length === 0) {
    return []
  }

  // SMI = 100 * doubleSmoothMom / doubleSmoothAbsMom
  const absMap = new Map(doubleSmoothAbs.map((p) => [p.ts, Number(p.value)]))

  const smiLine: Array<{ ts: number; value: number }> = []
  for (const point of doubleSmoothMom) {
    const absVal = absMap.get(point.ts)
    if (absVal !== undefined) {
      smiLine.push({
        ts: point.ts,
        value: absVal === 0 ? 0 : (100 * Number(point.value)) / absVal,
      })
    }
  }

  if (smiLine.length === 0) {
    return []
  }

  // Signal = EMA(SMI, signalPeriod)
  const signalValues = emaFromValues(smiLine, signalPeriod)
  const signalMap = new Map(signalValues.map((p) => [p.ts, Number(p.value)]))

  return smiLine.map((point) => ({
    ts: point.ts,
    value: point.value,
    signal: signalMap.get(point.ts) ?? point.value,
  }))
}
