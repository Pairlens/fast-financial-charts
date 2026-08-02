import type { ChartBar } from '../../types'

export const findBarIndexByTs = (bars: Array<ChartBar>, ts: number): number => {
  if (bars.length === 0) {
    return -1
  }

  let lo = 0
  let hi = bars.length - 1

  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    const value = bars[mid]

    if (value.ts === ts) {
      return mid
    }

    if (value.ts < ts) {
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }

  return Math.max(0, Math.min(lo, bars.length - 1))
}
