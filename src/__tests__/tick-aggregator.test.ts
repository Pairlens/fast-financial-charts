import { describe, expect, test } from 'bun:test'

import { applyTickToBars } from '../core/data/tick-aggregator'
import { makeBars } from './fixtures'

describe('tick aggregator', () => {
  test('updates last bar within same timeframe', () => {
    const bars = makeBars(5)
    const barsRef = bars
    const lastBefore = bars[bars.length - 1]
    const previousClose = lastBefore.close
    const previousVolume = lastBefore.volume

    const result = applyTickToBars(
      bars,
      {
        seriesId: 'BTC-USD',
        ts: lastBefore.ts + 30_000,
        price: lastBefore.close + 2,
        volume: 5,
      },
      '1m',
    )

    expect(result.appended).toBe(false)
    expect(result.changedIndex).toBe(4)
    expect(bars).toBe(barsRef)
    expect(bars).toHaveLength(5)
    expect(bars[4].close).toBe(previousClose + 2)
    expect(bars[4].volume).toBe(previousVolume + 5)
  })

  test('appends bar after timeframe rollover', () => {
    const bars = makeBars(5)
    const last = bars[bars.length - 1]

    const result = applyTickToBars(
      bars,
      {
        seriesId: 'BTC-USD',
        ts: last.ts + 61_000,
        price: last.close + 1,
        volume: 1,
      },
      '1m',
    )

    expect(result.appended).toBe(true)
    expect(bars).toHaveLength(6)
    expect(result.changedIndex).toBe(5)
  })
})
