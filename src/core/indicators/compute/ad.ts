import type { SyncIndicatorComputeFn } from '../../../types'

export const computeAD: SyncIndicatorComputeFn = ({ bars }) => {
  if (bars.length === 0) {
    return []
  }

  let ad = 0
  const values: Array<{ ts: number; value: number }> = []

  for (const bar of bars) {
    const range = bar.high - bar.low
    const mfm =
      range === 0 ? 0 : (bar.close - bar.low - (bar.high - bar.close)) / range
    ad += mfm * bar.volume
    values.push({ ts: bar.ts, value: ad })
  }

  return values
}
