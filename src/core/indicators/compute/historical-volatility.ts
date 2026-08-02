import type { SyncIndicatorComputeFn } from '../../../types'

export const computeHistoricalVolatility: SyncIndicatorComputeFn = ({
  bars,
  params,
}) => {
  const period = Math.max(2, Number(params.period ?? 20))
  if (bars.length <= period) {
    return []
  }

  const logReturns: Array<number> = [0]
  for (let index = 1; index < bars.length; index += 1) {
    logReturns.push(
      bars[index - 1].close === 0
        ? 0
        : Math.log(bars[index].close / bars[index - 1].close),
    )
  }

  const values: Array<{ ts: number; value: number }> = []

  for (let index = period; index < bars.length; index += 1) {
    let sum = 0
    for (let j = index - period + 1; j <= index; j += 1) {
      sum += logReturns[j]
    }
    const mean = sum / period

    let variance = 0
    for (let j = index - period + 1; j <= index; j += 1) {
      variance += Math.pow(logReturns[j] - mean, 2)
    }
    variance /= period - 1

    // Annualized: sqrt(variance) * sqrt(365) * 100 (crypto trades 365 days)
    values.push({
      ts: bars[index].ts,
      value: Math.sqrt(variance) * Math.sqrt(365) * 100,
    })
  }

  return values
}
