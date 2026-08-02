import type { ChartBar, TickUpdate, Timeframe } from '../../types'

export const timeframeToMilliseconds = (timeframe: Timeframe): number => {
  switch (timeframe) {
    case '1m':
      return 60_000
    case '5m':
      return 300_000
    case '15m':
      return 900_000
    case '30m':
      return 1_800_000
    case '1h':
      return 3_600_000
    case '2h':
      return 7_200_000
    case '4h':
      return 14_400_000
    case '1d':
      return 86_400_000
    case '3d':
      return 259_200_000
    case '1w':
      return 604_800_000
    case '1M':
      // 30-day approximation — used only for bucketing/labels; exchanges own
      // the true calendar-month candle boundaries.
      return 2_592_000_000
    default:
      return 60_000
  }
}

export type TickAggregationResult = {
  changedIndex: number
  appended: boolean
}

export const applyTickToBars = (
  bars: Array<ChartBar>,
  tick: TickUpdate,
  timeframe: Timeframe,
): TickAggregationResult => {
  if (bars.length === 0) {
    bars.push({
      ts: tick.ts,
      open: tick.price,
      high: tick.price,
      low: tick.price,
      close: tick.price,
      volume: tick.volume ?? 0,
    })

    return {
      changedIndex: 0,
      appended: true,
    }
  }

  const lastIndex = bars.length - 1
  const last = bars[lastIndex]
  const timeframeMs = timeframeToMilliseconds(timeframe)
  const barEnd = last.ts + timeframeMs

  if (tick.ts < barEnd) {
    last.high = Math.max(last.high, tick.price)
    last.low = Math.min(last.low, tick.price)
    last.close = tick.price
    last.volume += tick.volume ?? 0

    return {
      changedIndex: lastIndex,
      appended: false,
    }
  }

  bars.push({
    ts: barEnd,
    open: tick.price,
    high: tick.price,
    low: tick.price,
    close: tick.price,
    volume: tick.volume ?? 0,
  })

  return {
    changedIndex: bars.length - 1,
    appended: true,
  }
}
