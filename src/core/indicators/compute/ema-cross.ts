import type { SyncIndicatorComputeFn } from '../../../types'

export const computeEMACross: SyncIndicatorComputeFn = ({ bars, params }) => {
  const fastPeriod = Math.max(1, Number(params.fastPeriod ?? 9))
  const slowPeriod = Math.max(1, Number(params.slowPeriod ?? 21))

  if (bars.length < slowPeriod) return []

  const fastK = 2 / (fastPeriod + 1)
  const slowK = 2 / (slowPeriod + 1)

  // Seed fast EMA with SMA of first fastPeriod bars
  let fastEma = 0
  for (let i = 0; i < fastPeriod; i += 1) {
    fastEma += bars[i].close
  }
  fastEma /= fastPeriod

  // Advance fast EMA from fastPeriod to slowPeriod - 1
  for (let i = fastPeriod; i < slowPeriod - 1; i += 1) {
    fastEma = bars[i].close * fastK + fastEma * (1 - fastK)
  }

  // Seed slow EMA with SMA of first slowPeriod bars
  let slowEma = 0
  for (let i = 0; i < slowPeriod; i += 1) {
    slowEma += bars[i].close
  }
  slowEma /= slowPeriod

  // First point at slowPeriod - 1
  fastEma = bars[slowPeriod - 1].close * fastK + fastEma * (1 - fastK)

  const values: Array<{ ts: number; fast: number; slow: number }> = [
    {
      ts: bars[slowPeriod - 1].ts,
      fast: fastEma,
      slow: slowEma,
    },
  ]

  for (let i = slowPeriod; i < bars.length; i += 1) {
    fastEma = bars[i].close * fastK + fastEma * (1 - fastK)
    slowEma = bars[i].close * slowK + slowEma * (1 - slowK)

    values.push({
      ts: bars[i].ts,
      fast: fastEma,
      slow: slowEma,
    })
  }

  return values
}
