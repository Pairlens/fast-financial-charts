import type { SyncIndicatorComputeFn } from '../../../types'

export const computeMedianPrice: SyncIndicatorComputeFn = ({ bars }) => {
  return bars.map((bar) => ({
    ts: bar.ts,
    value: (bar.high + bar.low) / 2,
  }))
}
