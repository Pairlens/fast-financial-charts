import type { SyncIndicatorComputeFn } from '../../../types'

export const computeCCI: SyncIndicatorComputeFn = ({ bars, params }) => {
  const period = Math.max(2, Number(params.period ?? 20))
  if (bars.length < period) {
    return []
  }

  const typicalPrices = bars.map((bar) => (bar.high + bar.low + bar.close) / 3)
  const values: Array<{ ts: number; value: number }> = []

  for (let index = period - 1; index < bars.length; index += 1) {
    let sum = 0
    for (let j = index - period + 1; j <= index; j += 1) {
      sum += typicalPrices[j]
    }
    const mean = sum / period

    let meanDev = 0
    for (let j = index - period + 1; j <= index; j += 1) {
      meanDev += Math.abs(typicalPrices[j] - mean)
    }
    meanDev /= period

    values.push({
      ts: bars[index].ts,
      value:
        meanDev === 0 ? 0 : (typicalPrices[index] - mean) / (0.015 * meanDev),
    })
  }

  return values
}
