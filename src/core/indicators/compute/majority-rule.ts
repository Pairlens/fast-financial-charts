import type { SyncIndicatorComputeFn } from '../../../types'

export const computeMajorityRule: SyncIndicatorComputeFn = ({
  bars,
  params,
}) => {
  const period = Math.max(1, Number(params.period ?? 14))
  if (bars.length < period + 1) {
    return []
  }

  const values: Array<{ ts: number; value: number }> = []

  for (let i = period; i < bars.length; i += 1) {
    let count = 0

    for (let k = 1; k <= period; k += 1) {
      if (bars[i].close > bars[i - k].close) {
        count += 1
      }
    }

    values.push({
      ts: bars[i].ts,
      value: (count / period) * 100,
    })
  }

  return values
}
