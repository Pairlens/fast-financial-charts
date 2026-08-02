import { describe, expect, test } from 'bun:test'

import { ChartStore } from '../core/engine/chart-store'
import { DirtyFlags, hasDirtyFlag } from '../core/engine/dirty-flags'
import { resolveTickRenderFlags } from '../core/engine/tick-render-path'
import { makeBars } from './fixtures'
import type { ChartBar, NumericRange } from '../types'

const range: NumericRange = { min: 90, max: 110 }

const barWithin: ChartBar = {
  ts: 0,
  open: 100,
  high: 101,
  low: 99,
  close: 100.5,
  volume: 10,
}

describe('resolveTickRenderFlags', () => {
  test('same-bucket tick within y-range downgrades to LAST_BAR path', () => {
    const flags = resolveTickRenderFlags({
      flagsBefore: DirtyFlags.NONE,
      appended: false,
      changedBars: [barWithin],
      priceScaleMode: 'normal',
      currentYRange: range,
    })

    expect(flags).not.toBeNull()
    expect(hasDirtyFlag(flags!, DirtyFlags.LAST_BAR)).toBe(true)
    expect(hasDirtyFlag(flags!, DirtyFlags.OVERLAY)).toBe(true)
    expect(hasDirtyFlag(flags!, DirtyFlags.UI)).toBe(true)
    // No full-rebuild flags
    expect(hasDirtyFlag(flags!, DirtyFlags.GEOMETRY)).toBe(false)
    expect(hasDirtyFlag(flags!, DirtyFlags.VIEWPORT)).toBe(false)
    expect(hasDirtyFlag(flags!, DirtyFlags.INDICATORS)).toBe(false)
  })

  test('preserves flags that were already pending before the tick', () => {
    const flags = resolveTickRenderFlags({
      flagsBefore: DirtyFlags.GEOMETRY,
      appended: false,
      changedBars: [barWithin],
      priceScaleMode: 'normal',
      currentYRange: range,
    })

    // A pre-existing GEOMETRY request must not be dropped by the downgrade
    expect(hasDirtyFlag(flags!, DirtyFlags.GEOMETRY)).toBe(true)
    expect(hasDirtyFlag(flags!, DirtyFlags.LAST_BAR)).toBe(true)
  })

  test('append/rollover keeps the full rebuild', () => {
    const flags = resolveTickRenderFlags({
      flagsBefore: DirtyFlags.NONE,
      appended: true,
      changedBars: [barWithin],
      priceScaleMode: 'normal',
      currentYRange: range,
    })
    expect(flags).toBeNull()
  })

  test('tick extending above y-range keeps the full rebuild', () => {
    const flags = resolveTickRenderFlags({
      flagsBefore: DirtyFlags.NONE,
      appended: false,
      changedBars: [{ ...barWithin, high: 120 }],
      priceScaleMode: 'normal',
      currentYRange: range,
    })
    expect(flags).toBeNull()
  })

  test('tick extending below y-range keeps the full rebuild', () => {
    const flags = resolveTickRenderFlags({
      flagsBefore: DirtyFlags.NONE,
      appended: false,
      changedBars: [{ ...barWithin, low: 80 }],
      priceScaleMode: 'normal',
      currentYRange: range,
    })
    expect(flags).toBeNull()
  })

  test('transformed scale modes (percentage/indexedTo100) keep the full rebuild', () => {
    for (const mode of ['percentage', 'indexedTo100'] as const) {
      const flags = resolveTickRenderFlags({
        flagsBefore: DirtyFlags.NONE,
        appended: false,
        changedBars: [barWithin],
        priceScaleMode: mode,
        currentYRange: range,
      })
      expect(flags).toBeNull()
    }
  })

  test('logarithmic mode (raw-price range) allows the partial path', () => {
    const flags = resolveTickRenderFlags({
      flagsBefore: DirtyFlags.NONE,
      appended: false,
      changedBars: [barWithin],
      priceScaleMode: 'logarithmic',
      currentYRange: range,
    })
    expect(flags).not.toBeNull()
  })

  test('uninitialized or degenerate y-range keeps the full rebuild', () => {
    for (const bad of [
      { min: 0, max: 0 },
      { min: 5, max: 4 },
      { min: Number.NaN, max: 10 },
      { min: 0, max: Number.POSITIVE_INFINITY },
    ]) {
      const flags = resolveTickRenderFlags({
        flagsBefore: DirtyFlags.NONE,
        appended: false,
        changedBars: [barWithin],
        priceScaleMode: 'normal',
        currentYRange: bad,
      })
      expect(flags).toBeNull()
    }
  })

  test('missing changed bar (unknown series) keeps the full rebuild', () => {
    const flags = resolveTickRenderFlags({
      flagsBefore: DirtyFlags.NONE,
      appended: false,
      changedBars: [undefined],
      priceScaleMode: 'normal',
      currentYRange: range,
    })
    expect(flags).toBeNull()

    const empty = resolveTickRenderFlags({
      flagsBefore: DirtyFlags.NONE,
      appended: false,
      changedBars: [],
      priceScaleMode: 'normal',
      currentYRange: range,
    })
    expect(empty).toBeNull()
  })
})

describe('ChartStore.applyTick → render path integration', () => {
  const makeStore = (barCount = 30) =>
    new ChartStore({
      props: {
        series: [{ id: 'BTC-USD', bars: makeBars(barCount) }],
        timeframe: '1m',
        compareMode: 'indexed',
        indicators: [],
        drawings: [],
        activeTool: null,
        defaultViewport: { type: 'last-bars', bars: barCount },
        viewport: undefined,
        theme: undefined,
        performance: undefined,
        interaction: undefined,
        plugins: undefined,
      },
    })

  /** Mirrors ChartEngine.downgradeTickDirtyFlags composition. */
  const decideFlags = (
    store: ChartStore,
    seriesId: string,
    appended: boolean,
    currentYRange: NumericRange,
  ) => {
    const series = store.seriesStore.getSeriesById(seriesId, { clone: false })
    return resolveTickRenderFlags({
      flagsBefore: DirtyFlags.NONE,
      appended,
      changedBars: [series?.bars[series.bars.length - 1]],
      priceScaleMode: store.getStateRef().priceScaleMode,
      currentYRange,
    })
  }

  test('same-bucket tick reports update and flags LAST_BAR', () => {
    const store = makeStore()
    const bars = store.seriesStore.getPrimarySeriesRef()!.bars
    const last = bars[bars.length - 1]

    const result = store.applyTick({
      seriesId: 'BTC-USD',
      ts: last.ts + 1_000, // inside the 1m bucket
      price: last.close + 0.01,
    })

    expect(result.appended).toBe(false)
    expect(result.changedIndex).toBe(bars.length - 1)

    const wideRange: NumericRange = { min: 0, max: 10_000 }
    const flags = decideFlags(store, 'BTC-USD', result.appended, wideRange)
    expect(flags).not.toBeNull()
    expect(hasDirtyFlag(flags!, DirtyFlags.LAST_BAR)).toBe(true)
    expect(hasDirtyFlag(flags!, DirtyFlags.GEOMETRY)).toBe(false)
  })

  test('tick extending beyond the rendered y-range keeps the full rebuild', () => {
    const store = makeStore()
    const bars = store.seriesStore.getPrimarySeriesRef()!.bars
    const last = bars[bars.length - 1]
    const tightRange: NumericRange = { min: last.low, max: last.high }

    const result = store.applyTick({
      seriesId: 'BTC-USD',
      ts: last.ts + 1_000,
      price: last.high + 50, // blows through the range → axis must re-fit
    })

    expect(result.appended).toBe(false)
    const flags = decideFlags(store, 'BTC-USD', result.appended, tightRange)
    expect(flags).toBeNull()
  })

  test('rollover tick reports append and keeps the full rebuild', () => {
    const store = makeStore()
    const bars = store.seriesStore.getPrimarySeriesRef()!.bars
    const last = bars[bars.length - 1]

    const result = store.applyTick({
      seriesId: 'BTC-USD',
      ts: last.ts + 120_000, // past the 1m bucket end → new bar
      price: last.close,
    })

    expect(result.appended).toBe(true)
    const wideRange: NumericRange = { min: 0, max: 10_000 }
    const flags = decideFlags(store, 'BTC-USD', result.appended, wideRange)
    expect(flags).toBeNull()
  })
})
