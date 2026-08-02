import type { SyncIndicatorComputeFn } from '../../../types'

export const computeParabolicSAR: SyncIndicatorComputeFn = ({
  bars,
  params,
}) => {
  const afStart = Math.max(0.001, Number(params.afStart ?? 0.02))
  const afStep = Math.max(0.001, Number(params.afStep ?? 0.02))
  const afMax = Math.max(afStep, Number(params.afMax ?? 0.2))

  if (bars.length < 2) {
    return []
  }

  let isLong = bars[1].close > bars[0].close
  let sar = isLong ? bars[0].low : bars[0].high
  let ep = isLong ? bars[1].high : bars[1].low
  let af = afStart

  const values: Array<{ ts: number; value: number; direction: number }> = [
    { ts: bars[0].ts, value: sar, direction: isLong ? 1 : -1 },
  ]

  for (let index = 1; index < bars.length; index += 1) {
    const bar = bars[index]
    const prevBar = bars[index - 1]

    sar = sar + af * (ep - sar)

    if (isLong) {
      sar = Math.min(
        sar,
        prevBar.low,
        index >= 2 ? bars[index - 2].low : prevBar.low,
      )
      if (bar.low < sar) {
        isLong = false
        sar = ep
        ep = bar.low
        af = afStart
      } else {
        if (bar.high > ep) {
          ep = bar.high
          af = Math.min(af + afStep, afMax)
        }
      }
    } else {
      sar = Math.max(
        sar,
        prevBar.high,
        index >= 2 ? bars[index - 2].high : prevBar.high,
      )
      if (bar.high > sar) {
        isLong = true
        sar = ep
        ep = bar.high
        af = afStart
      } else {
        if (bar.low < ep) {
          ep = bar.low
          af = Math.min(af + afStep, afMax)
        }
      }
    }

    values.push({
      ts: bar.ts,
      value: sar,
      direction: isLong ? 1 : -1,
    })
  }

  return values
}
