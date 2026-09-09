import { describe, expect, test } from 'bun:test'

import {
  NOTCH_DELTA,
  WHEEL_ZOOM_STEP,
  anchorIndexAt,
  clampSpan,
  classifyWheel,
  easeTowards,
  normalizeWheelDelta,
  priceRangeLimits,
  rangeAroundAnchor,
  spanAroundAnchor,
} from '../core/engine/zoom-math'
import {
  barIndexAtRatio,
  clampViewport,
  getVisibleBars,
  isIndexVisible,
  viewportSpan,
  visibleBarRange,
} from '../core/data/viewport-slicer'
import type { ChartViewport } from '../types'

const PLOT_W = 1200
const LIMITS = { minBars: 5, plotWidth: PLOT_W }

const wheel = (
  overrides: Partial<Parameters<typeof classifyWheel>[0]> & {
    dx?: number
    dy?: number
  },
) =>
  classifyWheel({
    delta: { x: overrides.dx ?? 0, y: overrides.dy ?? 0 },
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    shiftKey: false,
    overPriceAxis: false,
    ...overrides,
  })

/** Apply one wheel event to a viewport the way the engine does, unsmoothed. */
const applyWheel = (
  viewport: ChartViewport,
  dy: number,
  x: number,
  extra: Partial<Parameters<typeof classifyWheel>[0]> = {},
): ChartViewport => {
  const gesture = wheel({ dy, ...extra })
  if (gesture.kind !== 'zoom-time') throw new Error(gesture.kind)
  const ratio = x / PLOT_W
  const anchor = anchorIndexAt(viewport, ratio)
  const span = clampSpan(
    viewportSpan(viewport) * Math.exp(gesture.logSpan),
    LIMITS,
  )
  return spanAroundAnchor(span, anchor, ratio)
}

const span = (v: ChartViewport) => viewportSpan(v)

describe('normalizeWheelDelta', () => {
  test('pixel deltas pass through', () => {
    expect(normalizeWheelDelta({ deltaX: 4, deltaY: -3, deltaMode: 0 })).toEqual(
      { x: 4, y: -3 },
    )
  })

  test('line mode (Firefox, 3 per notch) lands near one notch', () => {
    const { y } = normalizeWheelDelta({ deltaX: 0, deltaY: 3, deltaMode: 1 })
    expect(y).toBeGreaterThan(NOTCH_DELTA * 0.9)
    expect(y).toBeLessThanOrEqual(NOTCH_DELTA)
  })

  test('page mode is at least a notch', () => {
    const { y } = normalizeWheelDelta({ deltaX: 0, deltaY: 1, deltaMode: 2 })
    expect(y).toBeGreaterThanOrEqual(NOTCH_DELTA)
  })
})

describe('classifyWheel', () => {
  test('a mouse notch is one full step, a trackpad tick a fraction of it', () => {
    const notch = wheel({ dy: 100 })
    const tick = wheel({ dy: 3 })
    expect(notch).toEqual({
      kind: 'zoom-time',
      logSpan: WHEEL_ZOOM_STEP,
      discrete: true,
    })
    expect(tick.kind).toBe('zoom-time')
    if (tick.kind !== 'zoom-time') return
    expect(tick.discrete).toBe(false)
    expect(tick.logSpan).toBeCloseTo(WHEEL_ZOOM_STEP * 0.03, 10)
  })

  test('a fast flick is capped at one notch', () => {
    const g = wheel({ dy: 400 })
    expect(g.kind === 'zoom-time' && g.logSpan).toBe(WHEEL_ZOOM_STEP)
  })

  test('scroll up zooms in, scroll down zooms out', () => {
    const up = wheel({ dy: -100 })
    const down = wheel({ dy: 100 })
    expect(up.kind === 'zoom-time' && up.logSpan).toBeLessThan(0)
    expect(down.kind === 'zoom-time' && down.logSpan).toBeGreaterThan(0)
  })

  test('a horizontal swipe pans instead of zooming in', () => {
    expect(wheel({ dx: 12, dy: 0 })).toEqual({ kind: 'pan', pixels: 12 })
    expect(wheel({ dx: -30, dy: 2 })).toEqual({ kind: 'pan', pixels: -30 })
  })

  test('shift + wheel pans with whichever delta the browser sent', () => {
    expect(wheel({ dy: 100, shiftKey: true })).toEqual({
      kind: 'pan',
      pixels: 100,
    })
    expect(wheel({ dx: 40, dy: 0, shiftKey: true })).toEqual({
      kind: 'pan',
      pixels: 40,
    })
  })

  test('a trackpad pinch (ctrl + small fractional delta) zooms TIME', () => {
    const g = wheel({ dy: -4.5, ctrlKey: true })
    expect(g.kind).toBe('zoom-time')
    if (g.kind !== 'zoom-time') return
    expect(g.discrete).toBe(false)
    expect(g.logSpan).toBeCloseTo(-0.045, 10)
  })

  test('ctrl + a mouse notch is a regular time step', () => {
    expect(wheel({ dy: 100, ctrlKey: true })).toEqual({
      kind: 'zoom-time',
      logSpan: WHEEL_ZOOM_STEP,
      discrete: true,
    })
  })

  test('the price axis scales over its gutter or with alt/cmd held', () => {
    expect(wheel({ dy: 100, overPriceAxis: true })).toEqual({
      kind: 'zoom-price',
      logRange: WHEEL_ZOOM_STEP,
    })
    expect(wheel({ dy: -50, altKey: true })).toEqual({
      kind: 'zoom-price',
      logRange: -WHEEL_ZOOM_STEP / 2,
    })
    expect(wheel({ dy: 100, metaKey: true }).kind).toBe('zoom-price')
  })

  test('a zero delta does nothing', () => {
    expect(wheel({ dy: 0 })).toEqual({ kind: 'none' })
    expect(wheel({ dy: 0, ctrlKey: true })).toEqual({ kind: 'none' })
  })
})

describe('time zoom geometry', () => {
  const start: ChartViewport = { startIndex: 800, endIndex: 999 }

  test('a trackpad flick is a modest zoom, not a jump to the floor', () => {
    let vp = start
    for (let i = 0; i < 30; i += 1) vp = applyWheel(vp, -3, 600)
    // 30 ticks of 3 is 0.9 of a notch: about 9% in.
    expect(span(vp)).toBeGreaterThan(180)
    expect(span(vp)).toBeLessThan(200)
  })

  test('zooming in then out by the same notches returns exactly', () => {
    let vp = start
    for (let i = 0; i < 8; i += 1) vp = applyWheel(vp, -100, 600)
    expect(span(vp)).toBeLessThan(100)
    for (let i = 0; i < 8; i += 1) vp = applyWheel(vp, 100, 600)
    expect(span(vp)).toBeCloseTo(200, 9)
    expect(vp.startIndex).toBeCloseTo(800, 9)
  })

  test('the bar under the cursor never moves', () => {
    let vp = start
    const x = 900
    const anchor = anchorIndexAt(vp, x / PLOT_W)
    for (let i = 0; i < 12; i += 1) {
      vp = applyWheel(vp, -100, x)
      expect(anchorIndexAt(vp, x / PLOT_W)).toBeCloseTo(anchor, 9)
    }
    for (let i = 0; i < 20; i += 1) {
      vp = applyWheel(vp, 37, x)
      expect(anchorIndexAt(vp, x / PLOT_W)).toBeCloseTo(anchor, 9)
    }
  })

  test('the step is continuous near the floor rather than quantised', () => {
    let vp: ChartViewport = { startIndex: 990, endIndex: 999 }
    const spans: Array<number> = []
    for (let i = 0; i < 8; i += 1) {
      vp = applyWheel(vp, -100, 600)
      spans.push(span(vp))
    }
    expect(spans[0]).toBeCloseTo(10 / 1.1, 9)
    expect(spans[1]).toBeCloseTo(10 / 1.21, 9)
    expect(spans[6]).toBeCloseTo(10 / 1.1 ** 7, 9)
    // The eighth step would go below 5 bars and lands on the floor instead.
    expect(spans[7]).toBe(5)
  })
})

describe('clampSpan', () => {
  test('floors at viewportMinBars and at maxBarSpacing', () => {
    expect(clampSpan(1, LIMITS)).toBe(5)
    expect(clampSpan(3, { ...LIMITS, maxBarSpacing: 60 })).toBe(20)
  })

  test('ceilings at minBarSpacing, half a pixel per bar by default', () => {
    expect(clampSpan(1e6, LIMITS)).toBe(2400)
    expect(clampSpan(1e6, { ...LIMITS, minBarSpacing: 2 })).toBe(600)
  })

  test('a non-finite span falls to the floor', () => {
    expect(clampSpan(Number.NaN, LIMITS)).toBe(5)
  })
})

describe('easeTowards', () => {
  test('approaches the target and never overshoots', () => {
    let v = 100
    for (let i = 0; i < 60; i += 1) v = easeTowards(v, 50, 16, 90)
    expect(v).toBeGreaterThan(50)
    expect(v).toBeLessThan(50.05)
  })

  test('a longer frame covers more of the distance', () => {
    expect(easeTowards(0, 1, 32, 90)).toBeGreaterThan(easeTowards(0, 1, 16, 90))
    expect(easeTowards(0, 1, 0, 90)).toBe(0)
  })
})

describe('price zoom geometry', () => {
  const range = { min: 100, max: 200 }
  const limits = priceRangeLimits(range)

  test('keeps the price under the cursor still', () => {
    const next = rangeAroundAnchor(range, 2, 0.25, limits)
    expect(next.max - next.min).toBeCloseTo(200, 9)
    expect(next.min + 0.25 * (next.max - next.min)).toBeCloseTo(125, 9)
  })

  test('cannot collapse to a point or run away', () => {
    let r = range
    for (let i = 0; i < 400; i += 1) r = rangeAroundAnchor(r, 0.5, 0.5, limits)
    expect(r.max - r.min).toBeCloseTo(limits.minExtent, 12)
    r = range
    for (let i = 0; i < 400; i += 1) r = rangeAroundAnchor(r, 2, 0.5, limits)
    expect(r.max - r.min).toBeCloseTo(limits.maxExtent, 6)
  })
})

describe('fractional viewport helpers', () => {
  const bars = Array.from({ length: 50 }, (_, i) => ({
    ts: i * 60_000,
    open: i,
    high: i + 1,
    low: i - 1,
    close: i,
    volume: 1,
  }))

  test('a fractional edge pulls in the bar it cuts through', () => {
    expect(visibleBarRange({ startIndex: 3.7, endIndex: 10.2 }, 50)).toEqual({
      start: 3,
      end: 11,
    })
    expect(visibleBarRange({ startIndex: 3, endIndex: 10 }, 50)).toEqual({
      start: 3,
      end: 10,
    })
    expect(visibleBarRange({ startIndex: -2.5, endIndex: 60 }, 50)).toEqual({
      start: 0,
      end: 49,
    })
  })

  test('getVisibleBars slices the same range', () => {
    const visible = getVisibleBars(bars, { startIndex: 3.7, endIndex: 10.2 })
    expect(visible[0]?.open).toBe(3)
    expect(visible[visible.length - 1]?.open).toBe(11)
  })

  test('isIndexVisible agrees with the range', () => {
    const vp = { startIndex: 3.7, endIndex: 10.2 }
    expect(isIndexVisible(vp, 3)).toBe(true)
    expect(isIndexVisible(vp, 11)).toBe(true)
    expect(isIndexVisible(vp, 2)).toBe(false)
    expect(isIndexVisible(vp, 12)).toBe(false)
  })

  test('barIndexAtRatio is the inverse of the bar-centre x mapping', () => {
    const vp = { startIndex: 10, endIndex: 19 }
    expect(barIndexAtRatio(vp, 0.05, 50)).toBe(10)
    expect(barIndexAtRatio(vp, 0.15, 50)).toBe(11)
    expect(barIndexAtRatio(vp, 0.999, 50)).toBe(19)
    const shifted = { startIndex: 10.5, endIndex: 19.5 }
    expect(barIndexAtRatio(shifted, 0.04, 50)).toBe(10)
    expect(barIndexAtRatio(shifted, 0.06, 50)).toBe(11)
    // The right edge sits at 20.5, so bar 20 is half on screen.
    expect(barIndexAtRatio(shifted, 5, 50)).toBe(20)
  })

  test('clampViewport keeps fractional edges', () => {
    const vp = clampViewport({ startIndex: 3.25, endIndex: 40.75 }, 100, 5)
    expect(vp).toEqual({ startIndex: 3.25, endIndex: 40.75 })
  })
})
