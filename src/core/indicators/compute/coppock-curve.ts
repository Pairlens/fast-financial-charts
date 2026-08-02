import { computeROC } from './roc'
import type { SyncIndicatorComputeFn } from '../../../types'

export const computeCoppockCurve: SyncIndicatorComputeFn = ({
  bars,
  params,
}) => {
  const longPeriod = Math.max(2, Number(params.longPeriod ?? 14))
  const shortPeriod = Math.max(1, Number(params.shortPeriod ?? 11))
  const wmaPeriod = Math.max(1, Number(params.wmaPeriod ?? 10))

  const longROC = computeROC({
    bars,
    params: { period: longPeriod },
    timeframeMs: 0,
  })
  const shortROC = computeROC({
    bars,
    params: { period: shortPeriod },
    timeframeMs: 0,
  })

  if (longROC.length === 0 || shortROC.length === 0) {
    return []
  }

  const shortMap = new Map(shortROC.map((p) => [p.ts, Number(p.value)]))
  const combined = longROC
    .filter((p) => shortMap.has(p.ts))
    .map((p) => ({
      ts: p.ts,
      value: Number(p.value) + shortMap.get(p.ts)!,
    }))

  if (combined.length < wmaPeriod) {
    return []
  }

  // WMA of combined ROC
  const denominator = (wmaPeriod * (wmaPeriod + 1)) / 2
  const values: Array<{ ts: number; value: number }> = []

  for (let index = wmaPeriod - 1; index < combined.length; index += 1) {
    let sum = 0
    for (let w = 0; w < wmaPeriod; w += 1) {
      sum += combined[index - wmaPeriod + 1 + w].value * (w + 1)
    }
    values.push({
      ts: combined[index].ts,
      value: sum / denominator,
    })
  }

  return values
}
