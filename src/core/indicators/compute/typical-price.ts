import type { SyncIndicatorComputeFn } from '../../../types'

export const computeTypicalPrice: SyncIndicatorComputeFn = ({ bars }) => {
  return bars.map((bar) => ({
    ts: bar.ts,
    value: (bar.high + bar.low + bar.close) / 3,
  }))
}
