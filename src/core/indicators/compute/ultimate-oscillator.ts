import type { SyncIndicatorComputeFn } from '../../../types'

export const computeUltimateOscillator: SyncIndicatorComputeFn = ({
  bars,
  params,
}) => {
  const period1 = Math.max(1, Number(params.period1 ?? 7))
  const period2 = Math.max(period1, Number(params.period2 ?? 14))
  const period3 = Math.max(period2, Number(params.period3 ?? 28))

  if (bars.length <= period3) {
    return []
  }

  const bp: Array<number> = [0]
  const tr: Array<number> = [0]

  for (let index = 1; index < bars.length; index += 1) {
    const prevClose = bars[index - 1].close
    bp.push(bars[index].close - Math.min(bars[index].low, prevClose))
    tr.push(
      Math.max(
        bars[index].high - bars[index].low,
        Math.abs(bars[index].high - prevClose),
        Math.abs(bars[index].low - prevClose),
      ),
    )
  }

  const values: Array<{ ts: number; value: number }> = []

  for (let index = period3; index < bars.length; index += 1) {
    const avg = (period: number) => {
      let sumBP = 0
      let sumTR = 0
      for (let j = index - period + 1; j <= index; j += 1) {
        sumBP += bp[j]
        sumTR += tr[j]
      }
      return sumTR === 0 ? 0 : sumBP / sumTR
    }

    const uo = (100 * (4 * avg(period1) + 2 * avg(period2) + avg(period3))) / 7

    values.push({
      ts: bars[index].ts,
      value: Math.max(0, Math.min(100, uo)),
    })
  }

  return values
}
