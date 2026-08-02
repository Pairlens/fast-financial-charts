import { describe, expect, test } from 'bun:test'

import { createCoordinateHelpers } from '../core/primitives/coordinates'
import type { ChartBar } from '../types/data'

describe('createCoordinateHelpers', () => {
  const bars: Array<ChartBar> = [
    { ts: 1000, open: 100, high: 110, low: 90, close: 105, volume: 50 },
    { ts: 2000, open: 105, high: 115, low: 95, close: 110, volume: 60 },
    { ts: 3000, open: 110, high: 120, low: 100, close: 115, volume: 70 },
    { ts: 4000, open: 115, high: 125, low: 105, close: 120, volume: 80 },
    { ts: 5000, open: 120, high: 130, low: 110, close: 125, volume: 90 },
  ]

  const viewport = { startIndex: 0, endIndex: 4 }
  const priceRange = { min: 90, max: 130 }
  // Plot dimensions: the caller has already subtracted the axis gutters
  // (e.g. a 500px container with a 100px price axis).
  const plotWidth = 400
  const plotHeight = 400

  const helpers = createCoordinateHelpers(
    viewport,
    priceRange,
    plotWidth,
    plotHeight,
    bars,
    'normal',
  )

  test('indexToX converts bar index to pixel X', () => {
    // plotWidth = 400
    // total = 4 - 0 + 1 = 5
    // For index 0: relative = 0 - 0 + 0.5 = 0.5, x = (0.5 / 5) * 400 = 40
    expect(helpers.indexToX(0)).toBe(40)
    // For index 2: relative = 2 - 0 + 0.5 = 2.5, x = (2.5 / 5) * 400 = 200
    expect(helpers.indexToX(2)).toBe(200)
    // For index 4: relative = 4 - 0 + 0.5 = 4.5, x = (4.5 / 5) * 400 = 360
    expect(helpers.indexToX(4)).toBe(360)
  })

  test('xToIndex converts pixel X back to bar index', () => {
    // Round-trip: indexToX → xToIndex should give back the same index
    for (let i = 0; i <= 4; i++) {
      const x = helpers.indexToX(i)
      expect(helpers.xToIndex(x)).toBe(i)
    }
  })

  test('priceToY converts price to pixel Y', () => {
    // In normal mode, valueToYScaled maps price linearly:
    // y = (1 - (price - min) / (max - min)) * height
    // For price = 130 (max): y = (1 - 1) * 400 = 0
    expect(helpers.priceToY(130)).toBeCloseTo(0, 1)
    // For price = 90 (min): y = (1 - 0) * 400 = 400
    expect(helpers.priceToY(90)).toBeCloseTo(400, 1)
    // For price = 110 (midpoint): y = (1 - 0.5) * 400 = 200
    expect(helpers.priceToY(110)).toBeCloseTo(200, 1)
  })

  test('yToPrice converts pixel Y back to price', () => {
    // Round-trip test
    for (const price of [90, 100, 110, 120, 130]) {
      const y = helpers.priceToY(price)
      expect(helpers.yToPrice(y)).toBeCloseTo(price, 5)
    }
  })

  test('timeToX finds bar by timestamp', () => {
    // ts=3000 is index 2, which should map to x = 200
    expect(helpers.timeToX(3000)).toBe(200)
  })

  test('timeToX returns null for non-exact timestamp', () => {
    // After fix: timeToX verifies exact ts match, returns null for non-matching timestamps
    expect(helpers.timeToX(9999)).toBeNull()
    expect(helpers.timeToX(1500)).toBeNull() // between bars
    expect(helpers.timeToX(500)).toBeNull() // before first bar
  })

  test('timeToX returns null for empty bars', () => {
    const emptyHelpers = createCoordinateHelpers(
      viewport,
      priceRange,
      plotWidth,
      plotHeight,
      [],
      'normal',
    )
    expect(emptyHelpers.timeToX(1000)).toBeNull()
  })
})
