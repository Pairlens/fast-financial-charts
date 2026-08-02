import { describe, expect, test } from 'bun:test'

import { clampViewport, viewportFromPreset } from '../core/data/viewport-slicer'

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
