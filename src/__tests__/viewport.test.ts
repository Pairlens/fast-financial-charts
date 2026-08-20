import { describe, expect, test } from 'bun:test'

import {
  clampViewport,
  reanchorViewportToRight,
  viewportFromPreset,
} from '../core/data/viewport-slicer'

describe('viewport utilities', () => {
  test('clamps viewport to data bounds', () => {
    const viewport = clampViewport({ startIndex: -50, endIndex: 999 }, 100, 20)

    expect(viewport.startIndex).toBeGreaterThanOrEqual(0)
    expect(viewport.endIndex).toBeLessThan(100)
    expect(viewport.endIndex - viewport.startIndex + 1).toBeGreaterThanOrEqual(
      20,
    )
  })

  test('builds viewport from presets', () => {
    const lastBars = viewportFromPreset(200, { type: 'last-bars', bars: 50 })
    expect(lastBars.endIndex).toBe(199)
    expect(lastBars.startIndex).toBe(150)

    const explicit = viewportFromPreset(200, {
      type: 'indices',
      startIndex: 10,
      endIndex: 40,
    })
    expect(explicit.startIndex).toBe(10)
    expect(explicit.endIndex).toBe(40)
  })
})

describe('reanchorViewportToRight', () => {
  const rightOffset = 20

  test('window inside the data keeps its span at the new right edge', () => {
    const oldBars = 500
    const viewport = viewportFromPreset(
      oldBars,
      { type: 'last-bars', bars: 200 },
      rightOffset,
    )
    expect(viewport).toEqual({ startIndex: 320, endIndex: 519 })

    const newBars = 620
    const next = reanchorViewportToRight(
      viewport,
      newBars,
      oldBars,
      rightOffset,
    )

    expect(next.endIndex).toBe(newBars - 1 + rightOffset)
    expect(next.endIndex - next.startIndex).toBe(
      viewport.endIndex - viewport.startIndex,
    )

    // Identical to the bar-count-delta shift this replaced
    const delta = newBars - oldBars
    expect(next).toEqual({
      startIndex: viewport.startIndex + delta,
      endIndex: viewport.endIndex + delta,
    })
  })

  test('window wider than the data keeps showing the whole series', () => {
    // 2 bars under the default 200-bar preset: viewportFromPreset clamps the
    // requested span down to [0, 21], so the window is wider than the series.
    const oldBars = 2
    const viewport = viewportFromPreset(
      oldBars,
      { type: 'last-bars', bars: 200 },
      rightOffset,
    )
    expect(viewport).toEqual({ startIndex: 0, endIndex: 21 })

    const newBars = 302
    const next = reanchorViewportToRight(
      viewport,
      newBars,
      oldBars,
      rightOffset,
    )

    expect(next).toEqual({ startIndex: 0, endIndex: newBars - 1 + rightOffset })

    // The bar-count-delta shift this replaced stranded the window on the last
    // two bars of a 302-bar series: [300, 321].
    const delta = newBars - oldBars
    expect(next).not.toEqual({
      startIndex: viewport.startIndex + delta,
      endIndex: viewport.endIndex + delta,
    })
  })

  test('window overshooting the old right edge comes back onto the data', () => {
    // A rightOffset that shrank between the last clamp and the replacement
    // leaves endIndex past barsLength - 1 + rightOffset.
    const next = reanchorViewportToRight(
      { startIndex: 40, endIndex: 130 },
      200,
      100,
      5,
    )

    expect(next.endIndex).toBe(204)
    expect(next.endIndex - next.startIndex).toBe(90)
  })

  test('never starts before the first bar when the new series is shorter', () => {
    const next = reanchorViewportToRight(
      { startIndex: 500, endIndex: 700 },
      10,
      900,
      0,
    )

    expect(next).toEqual({ startIndex: 0, endIndex: 9 })
  })
})
