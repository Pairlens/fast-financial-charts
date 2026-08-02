import type { SyncIndicatorComputeFn } from '../../../types'

export const computeROC: SyncIndicatorComputeFn = ({ bars, params }) => {
  const period = Math.max(1, Number(params.period ?? 12))
  if (bars.length <= period) {
    return []
  }

  const values: Array<{ ts: number; value: number }> = []

  for (let index = period; index < bars.length; index += 1) {
    const prev = bars[index - period].close
    values.push({
      ts: bars[index].ts,
      value: prev === 0 ? 0 : ((bars[index].close - prev) / prev) * 100,
    })
  }

  return values
}
