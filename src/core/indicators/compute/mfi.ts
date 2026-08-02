import type { SyncIndicatorComputeFn } from '../../../types'

export const computeMFI: SyncIndicatorComputeFn = ({ bars, params }) => {
  const period = Math.max(2, Number(params.period ?? 14))
  if (bars.length <= period) {
    return []
  }

  const typicalPrices = bars.map((bar) => (bar.high + bar.low + bar.close) / 3)
  const rawMoneyFlow = typicalPrices.map((tp, i) => tp * bars[i].volume)

  const values: Array<{ ts: number; value: number }> = []

  for (let index = period; index < bars.length; index += 1) {
    let positiveFlow = 0
    let negativeFlow = 0

    for (let j = index - period + 1; j <= index; j += 1) {
      if (typicalPrices[j] > typicalPrices[j - 1]) {
        positiveFlow += rawMoneyFlow[j]
      } else if (typicalPrices[j] < typicalPrices[j - 1]) {
        negativeFlow += rawMoneyFlow[j]
      }
    }

    const mfRatio = negativeFlow === 0 ? 100 : positiveFlow / negativeFlow
    const mfi = negativeFlow === 0 ? 100 : 100 - 100 / (1 + mfRatio)

    values.push({ ts: bars[index].ts, value: mfi })
  }

  return values
}
