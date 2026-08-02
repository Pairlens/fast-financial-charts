import type { SyncIndicatorComputeFn } from '../../../types'

export const computeMACross: SyncIndicatorComputeFn = ({ bars, params }) => {
  const fastPeriod = Math.max(1, Number(params.fastPeriod ?? 9))
  const slowPeriod = Math.max(1, Number(params.slowPeriod ?? 21))

  if (bars.length < slowPeriod) return []

  const values: Array<{ ts: number; fast: number; slow: number }> = []

  let fastSum = 0
  let slowSum = 0

  for (let i = 0; i < bars.length; i += 1) {
    fastSum += bars[i].close
    slowSum += bars[i].close

    if (i >= fastPeriod) {
      fastSum -= bars[i - fastPeriod].close
    }
    if (i >= slowPeriod) {
      slowSum -= bars[i - slowPeriod].close
    }

    if (i >= slowPeriod - 1) {
      values.push({
        ts: bars[i].ts,
        fast: fastSum / fastPeriod,
        slow: slowSum / slowPeriod,
      })
    }
  }

  return values
}
