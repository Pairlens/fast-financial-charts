import type { SyncIndicatorComputeFn } from '../../../types'

export const computeEaseOfMovement: SyncIndicatorComputeFn = ({
  bars,
  params,
}) => {
  const period = Math.max(1, Number(params.period ?? 14))
  if (bars.length < period + 1) {
    return []
  }

  // Raw EMV starting from index 1
  const rawEmv: Array<number> = []
  for (let index = 1; index < bars.length; index += 1) {
    const distanceMoved =
      (bars[index].high + bars[index].low) / 2 -
      (bars[index - 1].high + bars[index - 1].low) / 2
    const range = bars[index].high - bars[index].low
    const boxRatio = range === 0 ? 0 : bars[index].volume / 10000 / range
    rawEmv.push(boxRatio === 0 ? 0 : distanceMoved / boxRatio)
  }

  // SMA smoothing over period
  const values: Array<{ ts: number; value: number }> = []
  let rollingSum = 0

  for (let index = 0; index < rawEmv.length; index += 1) {
    rollingSum += rawEmv[index]

    if (index >= period) {
      rollingSum -= rawEmv[index - period]
    }

    if (index >= period - 1) {
      values.push({
        ts: bars[index + 1].ts,
        value: rollingSum / period,
      })
    }
  }

  return values
}
