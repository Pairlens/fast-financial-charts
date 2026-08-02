import { describe, expect, test } from 'bun:test'

import { toDrawingPoint, toXFromTs } from '../core/drawings/transforms'
import type { DrawingTransformContext } from '../core/drawings/transforms'
import type { ChartBar } from '../types'

const makeBars = (count: number): Array<ChartBar> => {
  const bars: Array<ChartBar> = []
  const startTs = Date.UTC(2025, 0, 1, 0, 0, 0)
  for (let i = 0; i < count; i += 1) {
    const base = 100 + i
    bars.push({
      ts: startTs + i * 60_000,
      open: base,
      high: base + 2,
      low: base - 2,
      close: base + 1,
      volume: 1_000 + i,
    })
  }
  return bars
}

describe('drawing transforms', () => {
  test('toDrawingPoint selects the right-side bar at center boundaries', () => {
    const bars = makeBars(200)
    const context: DrawingTransformContext = {
      bars,
      viewport: {
        startIndex: 100,
        endIndex: 139,
      },
      width: 1_000,
      height: 500,
      range: { min: 0, max: 300 },
      priceScaleMode: 'normal',
    }

    // Boundary between visible bars 130 and 131 (k=30 boundary => k+1 transition).
    const xAtBoundary = (31 / 40) * context.width
    const point = toDrawingPoint(xAtBoundary, 250, context, false)
    expect(point.ts).toBe(bars[131].ts)
  })

  test('toDrawingPoint remains inverse-compatible with toXFromTs', () => {
    const bars = makeBars(180)
    const context: DrawingTransformContext = {
      bars,
      viewport: {
        startIndex: 120,
        endIndex: 159,
      },
      width: 1_200,
      height: 500,
      range: { min: 0, max: 300 },
      priceScaleMode: 'normal',
    }

    const targetIndex = 142
    const x = toXFromTs(bars[targetIndex].ts, context)
    const point = toDrawingPoint(x, 250, context, false)
    expect(point.ts).toBe(bars[targetIndex].ts)
  })
})
