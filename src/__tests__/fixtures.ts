import type { ChartBar } from '../types'

export const makeBars = (count: number, startPrice = 100): Array<ChartBar> => {
  const bars: Array<ChartBar> = []
  let current = startPrice
  const startTs = 1_700_000_000_000

  for (let index = 0; index < count; index += 1) {
    const drift = (Math.sin(index / 3) + 1) * 0.5
    const close = current + drift
    const high = Math.max(current, close) + 0.8
    const low = Math.min(current, close) - 0.8

    bars.push({
      ts: startTs + index * 60_000,
      open: current,
      high,
      low,
      close,
      volume: 100 + index,
    })

    current = close
  }

  return bars
}
