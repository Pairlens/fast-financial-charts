import type { SyncIndicatorComputeFn } from '../../../types'

export const computeMomentum: SyncIndicatorComputeFn = ({ bars, params }) => {
  const period = Math.max(1, Number(params.period ?? 10))
  if (bars.length <= period) {
    return []
  }

  const values: Array<{ ts: number; value: number }> = []

  for (let index = period; index < bars.length; index += 1) {
    values.push({
      ts: bars[index].ts,
      value: bars[index].close - bars[index - period].close,
    })
  }

  return values
}
