import type { SyncIndicatorComputeFn } from '../../../types'

export const computeRVI: SyncIndicatorComputeFn = ({ bars, params }) => {
  const period = Math.max(1, Number(params.period ?? 10))
  const signalPeriod = Math.max(1, Number(params.signal ?? 4))

  // Need at least 3 lookback bars for the weighted sum + period for SMA
  if (bars.length < period + 3) {
    return []
  }

  // Compute weighted numerator and denominator for each bar (starting at index 3)
  const numerators: Array<{ ts: number; value: number }> = []
  const denominators: Array<{ ts: number; value: number }> = []

  for (let index = 3; index < bars.length; index += 1) {
    const num =
      (bars[index].close -
        bars[index].open +
        2 * (bars[index - 1].close - bars[index - 1].open) +
        2 * (bars[index - 2].close - bars[index - 2].open) +
        (bars[index - 3].close - bars[index - 3].open)) /
      6

    const den =
      (bars[index].high -
        bars[index].low +
        2 * (bars[index - 1].high - bars[index - 1].low) +
        2 * (bars[index - 2].high - bars[index - 2].low) +
        (bars[index - 3].high - bars[index - 3].low)) /
      6

    numerators.push({ ts: bars[index].ts, value: num })
    denominators.push({ ts: bars[index].ts, value: den })
  }

  if (numerators.length < period) {
    return []
  }

  // RVI = SMA(numerator, period) / SMA(denominator, period)
  const rviLine: Array<{ ts: number; value: number }> = []

  for (let index = period - 1; index < numerators.length; index += 1) {
    let sumNum = 0
    let sumDen = 0
    for (let j = 0; j < period; j += 1) {
      sumNum += numerators[index - j].value
      sumDen += denominators[index - j].value
    }
    rviLine.push({
      ts: numerators[index].ts,
      value: sumDen === 0 ? 0 : sumNum / sumDen,
    })
  }

  if (rviLine.length < signalPeriod + 2) {
    return []
  }

  // Signal = symmetrically weighted MA of RVI: (rvi + 2*rvi[i-1] + 2*rvi[i-2] + rvi[i-3]) / 6
  const values: Array<{ ts: number; value: number; signal: number }> = []

  for (let index = 3; index < rviLine.length; index += 1) {
    const signal =
      (rviLine[index].value +
        2 * rviLine[index - 1].value +
        2 * rviLine[index - 2].value +
        rviLine[index - 3].value) /
      6

    values.push({
      ts: rviLine[index].ts,
      value: rviLine[index].value,
      signal,
    })
  }

  return values
}
