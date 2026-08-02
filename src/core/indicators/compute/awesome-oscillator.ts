import type { SyncIndicatorComputeFn } from '../../../types'

export const computeAwesomeOscillator: SyncIndicatorComputeFn = ({
  bars,
  params,
}) => {
  const fastPeriod = Math.max(1, Number(params.fast ?? 5))
  const slowPeriod = Math.max(fastPeriod + 1, Number(params.slow ?? 34))

  if (bars.length < slowPeriod) {
    return []
  }

  const medianPrices = bars.map((bar) => (bar.high + bar.low) / 2)
  const values: Array<{ ts: number; value: number }> = []

  for (let index = slowPeriod - 1; index < bars.length; index += 1) {
    let fastSum = 0
    for (let j = index - fastPeriod + 1; j <= index; j += 1) {
      fastSum += medianPrices[j]
    }

    let slowSum = 0
    for (let j = index - slowPeriod + 1; j <= index; j += 1) {
      slowSum += medianPrices[j]
    }

    values.push({
      ts: bars[index].ts,
      value: fastSum / fastPeriod - slowSum / slowPeriod,
    })
  }

  return values
}
