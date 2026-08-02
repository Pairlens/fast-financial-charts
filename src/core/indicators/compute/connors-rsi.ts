import { computeRSI } from './rsi'
import type { SyncIndicatorComputeFn } from '../../../types'

export const computeConnorsRSI: SyncIndicatorComputeFn = ({ bars, params }) => {
  const rsiPeriod = Math.max(1, Number(params.rsiPeriod ?? 3))
  const streakPeriod = Math.max(1, Number(params.streakPeriod ?? 2))
  const rankPeriod = Math.max(1, Number(params.rankPeriod ?? 100))
  const minBars = Math.max(rsiPeriod, streakPeriod, rankPeriod) + 1
  if (bars.length < minBars) {
    return []
  }

  // Step 1: Standard RSI of close prices
  const rsiValues = computeRSI({
    bars,
    params: { period: rsiPeriod },
    timeframeMs: 0,
  })
  if (rsiValues.length === 0) {
    return []
  }

  // Step 2: Compute streak (consecutive up/down closes), then RSI of streak
  const streaks: Array<number> = [0]
  for (let index = 1; index < bars.length; index += 1) {
    if (bars[index].close > bars[index - 1].close) {
      streaks.push(streaks[index - 1] + 1)
    } else if (bars[index].close < bars[index - 1].close) {
      streaks.push(streaks[index - 1] - 1)
    } else {
      streaks.push(0)
    }
  }

  // Create fake bars from streak values for RSI computation
  const streakBars = streaks.map((s, index) => ({
    ts: bars[index].ts,
    open: 0,
    high: 0,
    low: 0,
    close: s,
    volume: 0,
  }))
  const streakRsiValues = computeRSI({
    bars: streakBars,
    params: { period: streakPeriod },
    timeframeMs: 0,
  })

  // Step 3: Percent rank of price change over rankPeriod
  const changes: Array<number> = [0]
  for (let index = 1; index < bars.length; index += 1) {
    changes.push(bars[index].close - bars[index - 1].close)
  }

  // Build lookup maps by ts for RSI and StreakRSI
  const rsiByTs = new Map<number, number>()
  for (const point of rsiValues) {
    rsiByTs.set(point.ts, Number(point.value))
  }

  const streakRsiByTs = new Map<number, number>()
  for (const point of streakRsiValues) {
    streakRsiByTs.set(point.ts, Number(point.value))
  }

  const values: Array<{ ts: number; value: number }> = []

  for (let index = rankPeriod; index < bars.length; index += 1) {
    const rsi = rsiByTs.get(bars[index].ts)
    const streakRsi = streakRsiByTs.get(bars[index].ts)
    if (rsi === undefined || streakRsi === undefined) {
      continue
    }

    // Percent rank: what percentage of previous rankPeriod changes are smaller
    const currentChange = changes[index]
    let count = 0
    for (let j = index - rankPeriod; j < index; j += 1) {
      if (changes[j] < currentChange) {
        count += 1
      }
    }
    const percentRank = (count / rankPeriod) * 100

    values.push({
      ts: bars[index].ts,
      value: (rsi + streakRsi + percentRank) / 3,
    })
  }

  return values
}
