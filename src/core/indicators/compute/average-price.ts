import type { SyncIndicatorComputeFn } from '../../../types'

export const computeAveragePrice: SyncIndicatorComputeFn = ({ bars }) => {
  return bars.map((bar) => ({
    ts: bar.ts,
    value: (bar.open + bar.high + bar.low + bar.close) / 4,
  }))
}
