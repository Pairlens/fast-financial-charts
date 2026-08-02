import type { SyncIndicatorComputeFn } from '../../../types'

export const computeKAMA: SyncIndicatorComputeFn = ({ bars, params }) => {
  const period = Math.max(2, Number(params.period ?? 10))
  const fastPeriod = Math.max(1, Number(params.fast ?? 2))
  const slowPeriod = Math.max(fastPeriod + 1, Number(params.slow ?? 30))

  if (bars.length <= period) {
    return []
  }

  const fastSC = 2 / (fastPeriod + 1)
  const slowSC = 2 / (slowPeriod + 1)

  let kama = bars[period - 1].close
  const values: Array<{ ts: number; value: number }> = [
    { ts: bars[period - 1].ts, value: kama },
  ]

  for (let index = period; index < bars.length; index += 1) {
    const direction = Math.abs(bars[index].close - bars[index - period].close)
    let volatility = 0
    for (let j = index - period + 1; j <= index; j += 1) {
      volatility += Math.abs(bars[j].close - bars[j - 1].close)
    }

    const er = volatility === 0 ? 0 : direction / volatility
    const sc = Math.pow(er * (fastSC - slowSC) + slowSC, 2)

    kama = kama + sc * (bars[index].close - kama)
    values.push({ ts: bars[index].ts, value: kama })
  }

  return values
}
