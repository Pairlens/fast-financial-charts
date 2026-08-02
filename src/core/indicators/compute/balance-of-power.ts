import type { SyncIndicatorComputeFn } from '../../../types'

export const computeBalanceOfPower: SyncIndicatorComputeFn = ({
  bars,
  params,
}) => {
  const period = Math.max(1, Number(params.period ?? 14))
  if (bars.length < period) {
    return []
  }

  // Raw BOP for each bar
  const rawBop: Array<number> = []
  for (const bar of bars) {
    const range = bar.high - bar.low
    rawBop.push(range === 0 ? 0 : (bar.close - bar.open) / range)
  }

  // SMA smoothing over period
  const values: Array<{ ts: number; value: number }> = []
  let rollingSum = 0

  for (let index = 0; index < rawBop.length; index += 1) {
    rollingSum += rawBop[index]

    if (index >= period) {
      rollingSum -= rawBop[index - period]
    }

    if (index >= period - 1) {
      values.push({
        ts: bars[index].ts,
        value: rollingSum / period,
      })
    }
  }

  return values
}
