import type { SyncIndicatorComputeFn } from '../../../types'

export const computeVWAP: SyncIndicatorComputeFn = ({ bars }) => {
  let cumulativeVolume = 0
  let cumulativeTypicalPriceVolume = 0

  return bars.map((bar) => {
    const typicalPrice = (bar.high + bar.low + bar.close) / 3
    cumulativeVolume += bar.volume
    cumulativeTypicalPriceVolume += typicalPrice * bar.volume

    return {
      ts: bar.ts,
      value:
        cumulativeVolume === 0
          ? typicalPrice
          : cumulativeTypicalPriceVolume / cumulativeVolume,
    }
  })
}
