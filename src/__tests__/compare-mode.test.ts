import { describe, expect, test } from 'bun:test'

import { normalizeSeriesForCompare } from '../core/data/compare-normalization'
import { makeBars } from './fixtures'

describe('compare normalization', () => {
  test('normalizes to 100 baseline in indexed mode', () => {
    const barsA = makeBars(30, 100)
    const barsB = makeBars(30, 200)

    const compared = normalizeSeriesForCompare(
      [
        { id: 'A', bars: barsA },
        { id: 'B', bars: barsB },
      ],
      'indexed',
      { startIndex: 0, endIndex: 29 },
    )

    expect(compared).toHaveLength(2)
    expect(compared[0].points[0]?.value).toBe(100)
    expect(compared[1].points[0]?.value).toBe(100)
  })
})
