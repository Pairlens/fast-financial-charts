import type { SyncIndicatorComputeFn } from '../../../types'

export const computeNetVolume: SyncIndicatorComputeFn = ({ bars }) => {
  if (bars.length === 0) {
    return []
  }

  const values: Array<{ ts: number; value: number }> = []

  for (const bar of bars) {
    let net = 0
    if (bar.close > bar.open) {
      net = bar.volume
    } else if (bar.close < bar.open) {
      net = -bar.volume
    }
    values.push({ ts: bar.ts, value: net })
  }

  return values
}
