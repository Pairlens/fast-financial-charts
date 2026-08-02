import { describe, expect, test } from 'bun:test'

import {
  createPricePassState,
  renderPricePass,
} from '../core/render/webgl/passes/price-pass'
import { FLOATS_PER_INSTANCE } from '../core/render/webgl/programs/candle-program'
import { BAR_FLOATS_PER_INSTANCE } from '../core/render/webgl/programs/bar-program'
import {
  IDENTITY_VIEWPORT_UNIFORMS,
  computeViewportUniforms,
} from '../core/render/webgl/shaders/viewport-uniforms'
import { THEME_TOKENS } from '../core/theme/tokens'
import { makeBars } from './fixtures'
import type {
  ChartBar,
  ChartSeriesInput,
  ChartViewport,
  NumericRange,
} from '../types'
import type { PriceScaleMode } from '../types/viewport'

class MockCandleProgram {
  drawCount = 0
  drawWithCachedCount = 0
  lastInstanceCount = 0
  /** bufferSubData-equivalent hook: records partial uploads. */
  updateCalls: Array<{ firstInstance: number; instanceCount: number }> = []

  private buffer = new Float32Array(0)

  ensureBuffer(count: number): Float32Array {
    const needed = count * FLOATS_PER_INSTANCE
    if (this.buffer.length < needed) {
      this.buffer = new Float32Array(needed)
    }
    return this.buffer
  }

  updateInstances(firstInstance: number, instanceCount: number): void {
    this.updateCalls.push({ firstInstance, instanceCount })
  }

  bufferSlice(floatStart: number, floatEnd: number): Float32Array {
    return this.buffer.slice(floatStart, floatEnd)
  }

  drawInterleaved(
    _instanceCount: number,
    _colors: unknown,
    _uniforms?: unknown,
  ): void {
    this.drawCount += 1
    this.lastInstanceCount = _instanceCount
  }

  drawWithCachedBuffer(
    _instanceCount: number,
    _colors: unknown,
    _uniforms?: unknown,
  ): void {
    this.drawWithCachedCount += 1
    this.lastInstanceCount = _instanceCount
  }
}

class MockBarProgram {
  drawCount = 0
  drawWithCachedCount = 0
  /** bufferSubData-equivalent hook: records partial uploads. */
  updateCalls: Array<{ firstInstance: number; instanceCount: number }> = []

  private buffer = new Float32Array(0)

  ensureBuffer(count: number): Float32Array {
    const needed = count * BAR_FLOATS_PER_INSTANCE
    if (this.buffer.length < needed) {
      this.buffer = new Float32Array(needed)
    }
    return this.buffer
  }

  updateInstances(firstInstance: number, instanceCount: number): void {
    this.updateCalls.push({ firstInstance, instanceCount })
  }

  bufferSlice(floatStart: number, floatEnd: number): Float32Array {
    return this.buffer.slice(floatStart, floatEnd)
  }

  drawInterleaved(
    _instanceCount: number,
    _colors: unknown,
    _uniforms?: unknown,
  ): void {
    this.drawCount += 1
  }

  drawWithCachedBuffer(
    _instanceCount: number,
    _colors: unknown,
    _uniforms?: unknown,
  ): void {
    this.drawWithCachedCount += 1
  }
}

class MockLineProgram {
  draws: Array<Float32Array> = []

  draw(
    points: Float32Array,
    _color?: unknown,
    _mode?: unknown,
    _uniforms?: unknown,
  ): void {
    this.draws.push(points)
  }
}

class MockAreaProgram {
  drawCount = 0

  draw(
    _points: Float32Array,
    _color: [number, number, number, number],
    _mode?: unknown,
    _uniforms?: unknown,
  ): void {
    this.drawCount += 1
  }
}

const makeSeriesFromBars = (
  id: string,
  bars: Array<ChartBar>,
): ChartSeriesInput => ({
  id,
  bars,
})

describe('price pass', () => {
  test('renders candles for single-series indexed compare mode', () => {
    const candle = new MockCandleProgram()
    const line = new MockLineProgram()
    const area = new MockAreaProgram()
    const bar = new MockBarProgram()
    const state = createPricePassState()

    renderPricePass({
      series: [makeSeriesFromBars('BTC-USD', makeBars(30, 100))],
      viewport: { startIndex: 0, endIndex: 29 },
      compareMode: 'indexed',
      chartType: 'candles',
      priceScaleMode: 'normal',
      theme: THEME_TOKENS,
      candleProgram: candle as never,
      barProgram: bar as never,
      lineProgram: line as never,
      areaProgram: area as never,
      canvasPixelWidth: 1920,
      canvasPixelHeight: 1080,
      state,
    })

    expect(candle.drawCount).toBe(1)
    expect(line.draws).toHaveLength(0)
    expect(area.drawCount).toBe(0)
  })

  test('aligns compare points to primary timestamps instead of local index', () => {
    const candle = new MockCandleProgram()
    const line = new MockLineProgram()
    const area = new MockAreaProgram()
    const bar = new MockBarProgram()
    const state = createPricePassState()

    const primaryBars = Array.from({ length: 10 }, (_, index) => ({
      ts: index,
      open: 100 + index,
      high: 101 + index,
      low: 99 + index,
      close: 100 + index,
      volume: 10,
    }))

    const shiftedBars = Array.from({ length: 10 }, (_, index) => ({
      ts: index + 3,
      open: 200 + index,
      high: 201 + index,
      low: 199 + index,
      close: 200 + index,
      volume: 10,
    }))

    renderPricePass({
      series: [
        makeSeriesFromBars('BTC-USD', primaryBars),
        makeSeriesFromBars('ETH-USD', shiftedBars),
      ],
      viewport: { startIndex: 0, endIndex: 9 },
      compareMode: 'indexed',
      chartType: 'line',
      priceScaleMode: 'normal',
      theme: THEME_TOKENS,
      candleProgram: candle as never,
      barProgram: bar as never,
      lineProgram: line as never,
      areaProgram: area as never,
      canvasPixelWidth: 1920,
      canvasPixelHeight: 1080,
      state,
    })

    expect(line.draws.length).toBeGreaterThan(1)
    const shiftedPoints = line.draws[1]
    const firstX = shiftedPoints[0]
    expect(firstX).toBeGreaterThan(-0.5)
  })

  test('viewportOnly skips buffer fill and uses drawWithCachedBuffer', () => {
    const candle = new MockCandleProgram()
    const line = new MockLineProgram()
    const area = new MockAreaProgram()
    const bar = new MockBarProgram()
    const state = createPricePassState()

    const bars = makeBars(50, 100)
    const viewport = { startIndex: 0, endIndex: 49 }

    // First render: full fill (not viewportOnly)
    renderPricePass({
      series: [makeSeriesFromBars('BTC-USD', bars)],
      viewport,
      compareMode: 'indexed',
      chartType: 'candles',
      priceScaleMode: 'normal',
      theme: THEME_TOKENS,
      candleProgram: candle as never,
      barProgram: bar as never,
      lineProgram: line as never,
      areaProgram: area as never,
      canvasPixelWidth: 1920,
      canvasPixelHeight: 1080,
      state,
    })

    expect(candle.drawCount).toBe(1)
    expect(candle.drawWithCachedCount).toBe(0)

    // Second render: viewportOnly — should use cached buffer
    renderPricePass({
      series: [makeSeriesFromBars('BTC-USD', bars)],
      viewport: { startIndex: 5, endIndex: 44 },
      compareMode: 'indexed',
      chartType: 'candles',
      priceScaleMode: 'normal',
      theme: THEME_TOKENS,
      candleProgram: candle as never,
      barProgram: bar as never,
      lineProgram: line as never,
      areaProgram: area as never,
      viewportOnly: true,
      canvasPixelWidth: 1920,
      canvasPixelHeight: 1080,
      state,
    })

    // drawInterleaved should still be 1 (from first call)
    expect(candle.drawCount).toBe(1)
    // drawWithCachedBuffer should be 1 (from viewportOnly call)
    expect(candle.drawWithCachedCount).toBe(1)
  })

  test('per-engine states do not cross-contaminate cached counts', () => {
    // Simulate two chart instances: each has its own programs (GPU buffers)
    // and its own render state. Interleave fills and viewport-only draws.
    const candleA = new MockCandleProgram()
    const candleB = new MockCandleProgram()
    const line = new MockLineProgram()
    const area = new MockAreaProgram()
    const bar = new MockBarProgram()
    const stateA = createPricePassState()
    const stateB = createPricePassState()

    const renderChart = (
      candle: MockCandleProgram,
      state: ReturnType<typeof createPricePassState>,
      barCount: number,
      viewportOnly: boolean,
    ) => {
      renderPricePass({
        series: [makeSeriesFromBars('BTC-USD', makeBars(barCount, 100))],
        viewport: { startIndex: 0, endIndex: barCount - 1 },
        compareMode: 'indexed',
        chartType: 'candles',
        priceScaleMode: 'normal',
        theme: THEME_TOKENS,
        candleProgram: candle as never,
        barProgram: bar as never,
        lineProgram: line as never,
        areaProgram: area as never,
        viewportOnly,
        canvasPixelWidth: 1920,
        canvasPixelHeight: 1080,
        state,
      })
    }

    // Chart A fills 50 bars (100 instances: body + wick per bar)
    renderChart(candleA, stateA, 50, false)
    expect(candleA.lastInstanceCount).toBe(100)

    // Chart B fills 10 bars (20 instances) — must not disturb A's state
    renderChart(candleB, stateB, 10, false)
    expect(candleB.lastInstanceCount).toBe(20)

    // Chart A pans (viewport-only): must draw A's cached count, not B's
    renderChart(candleA, stateA, 50, true)
    expect(candleA.drawWithCachedCount).toBe(1)
    expect(candleA.lastInstanceCount).toBe(100)

    // Chart B pans (viewport-only): must draw B's cached count, not A's
    renderChart(candleB, stateB, 10, true)
    expect(candleB.drawWithCachedCount).toBe(1)
    expect(candleB.lastInstanceCount).toBe(20)

    // A fresh state that never filled must NOT take the viewport-only path,
    // even though other states have filled this chart type before.
    const candleC = new MockCandleProgram()
    const stateC = createPricePassState()
    renderChart(candleC, stateC, 30, true)
    expect(candleC.drawWithCachedCount).toBe(0)
    expect(candleC.drawCount).toBe(1)
    expect(candleC.lastInstanceCount).toBe(60)
  })
})

describe('price pass — last-bar incremental path', () => {
  type Programs = {
    candle: MockCandleProgram
    bar: MockBarProgram
    line: MockLineProgram
    area: MockAreaProgram
  }

  const makePrograms = (): Programs => ({
    candle: new MockCandleProgram(),
    bar: new MockBarProgram(),
    line: new MockLineProgram(),
    area: new MockAreaProgram(),
  })

  const render = (
    programs: Programs,
    state: ReturnType<typeof createPricePassState>,
    bars: Array<ChartBar>,
    options?: {
      chartType?: 'candles' | 'heikinAshi' | 'bar' | 'histogram'
      lastBarOnly?: boolean
      viewportOnly?: boolean
    },
  ) => {
    renderPricePass({
      series: [makeSeriesFromBars('BTC-USD', bars)],
      viewport: { startIndex: 0, endIndex: bars.length - 1 },
      compareMode: 'indexed',
      chartType: options?.chartType ?? 'candles',
      priceScaleMode: 'normal',
      theme: THEME_TOKENS,
      candleProgram: programs.candle as never,
      barProgram: programs.bar as never,
      lineProgram: programs.line as never,
      areaProgram: programs.area as never,
      lastBarOnly: options?.lastBarOnly,
      viewportOnly: options?.viewportOnly,
      canvasPixelWidth: 1920,
      canvasPixelHeight: 1080,
      state,
    })
  }

  const mutateLastBar = (bars: Array<ChartBar>, close: number) => {
    const last = bars[bars.length - 1]
    last.close = close
    last.high = Math.max(last.high, close)
    last.low = Math.min(last.low, close)
  }

  test('candles: lastBarOnly updates only the last 2 instances via subData', () => {
    const programs = makePrograms()
    const state = createPricePassState()
    const bars = makeBars(50, 100)

    // Full fill first (uploads whole buffer)
    render(programs, state, bars)
    expect(programs.candle.drawCount).toBe(1)
    expect(programs.candle.updateCalls).toHaveLength(0)

    // Same-bucket tick: mutate last bar in place, render lastBarOnly
    mutateLastBar(bars, bars[49].close + 0.1)
    render(programs, state, bars, { lastBarOnly: true })

    // No full re-upload, exactly one partial upload of body+wick
    expect(programs.candle.drawCount).toBe(1)
    expect(programs.candle.updateCalls).toEqual([
      { firstInstance: 49 * 2, instanceCount: 2 },
    ])
    expect(programs.candle.drawWithCachedCount).toBe(1)
    expect(programs.candle.lastInstanceCount).toBe(100)

    // Written instance data matches the mutated bar (interleaved layout)
    const start = 49 * 2 * FLOATS_PER_INSTANCE
    const written = programs.candle.bufferSlice(
      start,
      start + 2 * FLOATS_PER_INSTANCE,
    )
    const last = bars[49]
    // The mirror is a Float32Array — round expectations to float32
    expect(Array.from(written)).toEqual(
      Array.from(
        Float32Array.from([
          last.open,
          last.high,
          last.low,
          last.close,
          49,
          0,
          last.open,
          last.high,
          last.low,
          last.close,
          49,
          1,
        ]),
      ),
    )
  })

  test('candles: partial path buffer equals a from-scratch full fill after tick sequence', () => {
    const programsA = makePrograms()
    const stateA = createPricePassState()
    const bars = makeBars(80, 100)

    render(programsA, stateA, bars)

    // Sequence of same-bucket ticks, each rendered via the partial path
    const closes = [100.4, 99.8, 101.2, 100.9, 102.3]
    for (const close of closes) {
      mutateLastBar(bars, close)
      render(programsA, stateA, bars, { lastBarOnly: true })
    }
    expect(programsA.candle.drawCount).toBe(1)
    expect(programsA.candle.updateCalls).toHaveLength(closes.length)

    // From-scratch fill of the final data on a fresh program/state
    const programsB = makePrograms()
    const stateB = createPricePassState()
    render(programsB, stateB, bars)

    const totalFloats = 80 * 2 * FLOATS_PER_INSTANCE
    expect(Array.from(programsA.candle.bufferSlice(0, totalFloats))).toEqual(
      Array.from(programsB.candle.bufferSlice(0, totalFloats)),
    )
  })

  test('candles: lastBarOnly without a prior fill falls back to full rebuild', () => {
    const programs = makePrograms()
    const state = createPricePassState()
    const bars = makeBars(30, 100)

    render(programs, state, bars, { lastBarOnly: true })

    expect(programs.candle.drawCount).toBe(1)
    expect(programs.candle.updateCalls).toHaveLength(0)
    expect(programs.candle.lastInstanceCount).toBe(60)
  })

  test('candles: lastBarOnly after bar-count change falls back to full rebuild', () => {
    const programs = makePrograms()
    const state = createPricePassState()
    const bars = makeBars(30, 100)

    render(programs, state, bars)

    // Simulate an append that (incorrectly) still signals lastBarOnly —
    // the cached instance count no longer matches, so full fill must win.
    const appended = makeBars(31, 100)
    render(programs, state, appended, { lastBarOnly: true })

    expect(programs.candle.drawCount).toBe(2)
    expect(programs.candle.updateCalls).toHaveLength(0)
    expect(programs.candle.lastInstanceCount).toBe(62)
  })

  test('heikinAshi: lastBarOnly falls back to full rebuild (HA depends on prior bar)', () => {
    const programs = makePrograms()
    const state = createPricePassState()
    const bars = makeBars(30, 100)

    render(programs, state, bars, { chartType: 'heikinAshi' })
    mutateLastBar(bars, bars[29].close + 0.1)
    render(programs, state, bars, {
      chartType: 'heikinAshi',
      lastBarOnly: true,
    })

    expect(programs.candle.drawCount).toBe(2)
    expect(programs.candle.updateCalls).toHaveLength(0)
  })

  test('bar chart: lastBarOnly updates only the last 3 instances', () => {
    const programs = makePrograms()
    const state = createPricePassState()
    const bars = makeBars(40, 100)

    render(programs, state, bars, { chartType: 'bar' })
    expect(programs.bar.drawCount).toBe(1)

    mutateLastBar(bars, bars[39].close + 0.1)
    render(programs, state, bars, { chartType: 'bar', lastBarOnly: true })

    expect(programs.bar.drawCount).toBe(1)
    expect(programs.bar.updateCalls).toEqual([
      { firstInstance: 39 * 3, instanceCount: 3 },
    ])
    expect(programs.bar.drawWithCachedCount).toBe(1)

    const start = 39 * 3 * BAR_FLOATS_PER_INSTANCE
    const written = programs.bar.bufferSlice(
      start,
      start + 3 * BAR_FLOATS_PER_INSTANCE,
    )
    const last = bars[39]
    // The mirror is a Float32Array — round expectations to float32
    expect(Array.from(written)).toEqual(
      Array.from(
        Float32Array.from([
          last.open,
          last.high,
          last.low,
          last.close,
          39,
          0,
          last.open,
          last.high,
          last.low,
          last.close,
          39,
          1,
          last.open,
          last.high,
          last.low,
          last.close,
          39,
          2,
        ]),
      ),
    )
  })

  test('histogram: lastBarOnly updates only the last instance', () => {
    const programs = makePrograms()
    const state = createPricePassState()
    const bars = makeBars(40, 100)

    render(programs, state, bars, { chartType: 'histogram' })
    expect(programs.candle.drawCount).toBe(1)

    mutateLastBar(bars, bars[39].close + 0.1)
    render(programs, state, bars, {
      chartType: 'histogram',
      lastBarOnly: true,
    })

    expect(programs.candle.drawCount).toBe(1)
    expect(programs.candle.updateCalls).toEqual([
      { firstInstance: 39, instanceCount: 1 },
    ])
    expect(programs.candle.drawWithCachedCount).toBe(1)

    const start = 39 * FLOATS_PER_INSTANCE
    const written = programs.candle.bufferSlice(
      start,
      start + FLOATS_PER_INSTANCE,
    )
    const close = bars[39].close
    // The mirror is a Float32Array — round expectations to float32
    expect(Array.from(written)).toEqual(
      Array.from(
        Float32Array.from([
          0,
          Math.max(close, 0),
          Math.min(close, 0),
          close,
          39,
          0,
        ]),
      ),
    )
  })

  test('chart type switch between fills falls back to full rebuild', () => {
    const programs = makePrograms()
    const state = createPricePassState()
    const bars = makeBars(30, 100)

    render(programs, state, bars, { chartType: 'bar' })
    // lastFillChartType is now 'bar' — candles lastBarOnly must full-fill
    mutateLastBar(bars, bars[29].close + 0.1)
    render(programs, state, bars, { chartType: 'candles', lastBarOnly: true })

    expect(programs.candle.drawCount).toBe(1)
    expect(programs.candle.updateCalls).toHaveLength(0)
    expect(programs.candle.lastInstanceCount).toBe(60)
  })
})

describe('computeViewportUniforms', () => {
  test('X transform matches toNdcX for all bar indices', () => {
    const viewport: ChartViewport = { startIndex: 10, endIndex: 39 }
    const yRange: NumericRange = { min: 90, max: 110 }

    const uniforms = computeViewportUniforms(
      viewport,
      yRange,
      'normal',
      0,
      1920,
      1080,
    )

    // toNdcX formula: ((index - start + 0.5) / total) * 2 - 1
    const total = viewport.endIndex - viewport.startIndex + 1
    for (let idx = viewport.startIndex; idx <= viewport.endIndex; idx += 1) {
      const expected = ((idx - viewport.startIndex + 0.5) / total) * 2 - 1
      const actual = idx * uniforms.xScale + uniforms.xOffset
      expect(Math.abs(actual - expected)).toBeLessThan(1e-10)
    }
  })

  test('Y linear transform matches toNdcY for price values', () => {
    const viewport: ChartViewport = { startIndex: 0, endIndex: 29 }
    const yRange: NumericRange = { min: 95, max: 105 }

    const uniforms = computeViewportUniforms(
      viewport,
      yRange,
      'normal',
      0,
      1920,
      1080,
    )

    const prices = [95, 97.5, 100, 102.5, 105]
    for (const price of prices) {
      const spread = yRange.max - yRange.min
      const expected = ((price - yRange.min) / spread) * 2 - 1
      const actual = price * uniforms.yScale + uniforms.yOffset
      expect(Math.abs(actual - expected)).toBeLessThan(1e-10)
    }
  })

  test('Y log transform matches toNdcYLog for price values', () => {
    const viewport: ChartViewport = { startIndex: 0, endIndex: 99 }
    const yRange: NumericRange = { min: 10, max: 1000 }

    const uniforms = computeViewportUniforms(
      viewport,
      yRange,
      'logarithmic',
      0,
      1920,
      1080,
    )

    expect(uniforms.mode).toBe(1)

    const prices = [10, 50, 100, 500, 1000]
    const logMin = Math.log(yRange.min)
    const logMax = Math.log(yRange.max)
    const logSpread = logMax - logMin

    for (const price of prices) {
      const expected = ((Math.log(price) - logMin) / logSpread) * 2 - 1
      const actual = Math.log(price) * uniforms.yScale + uniforms.yOffset
      expect(Math.abs(actual - expected)).toBeLessThan(1e-10)
    }
  })

  test('identity uniforms give passthrough', () => {
    const id = IDENTITY_VIEWPORT_UNIFORMS

    // x * 1 + 0 = x
    expect(0.5 * id.xScale + id.xOffset).toBe(0.5)
    expect(-0.3 * id.xScale + id.xOffset).toBeCloseTo(-0.3)

    // y * 1 + 0 = y
    expect(0.7 * id.yScale + id.yOffset).toBeCloseTo(0.7)
    expect(-1.0 * id.yScale + id.yOffset).toBe(-1.0)

    expect(id.mode).toBe(0)
    expect(id.basePrice).toBe(0)
    expect(id.halfW).toBe(0)
  })

  test('percentage mode sets mode=2', () => {
    const viewport: ChartViewport = { startIndex: 0, endIndex: 29 }
    const yRange: NumericRange = { min: -5, max: 10 }
    const uniforms = computeViewportUniforms(
      viewport,
      yRange,
      'percentage',
      50000,
      1920,
      1080,
    )
    expect(uniforms.mode).toBe(2)
    expect(uniforms.basePrice).toBe(50000)
  })

  test('indexedTo100 mode sets mode=3', () => {
    const viewport: ChartViewport = { startIndex: 0, endIndex: 29 }
    const yRange: NumericRange = { min: 90, max: 110 }
    const uniforms = computeViewportUniforms(
      viewport,
      yRange,
      'indexedTo100',
      50000,
      1920,
      1080,
    )
    expect(uniforms.mode).toBe(3)
    expect(uniforms.basePrice).toBe(50000)
  })

  test('halfW is computed correctly from viewport span (80% bar fill)', () => {
    const viewport: ChartViewport = { startIndex: 0, endIndex: 99 }
    const yRange: NumericRange = { min: 90, max: 110 }
    const viewportW = 1920
    const uniforms = computeViewportUniforms(
      viewport,
      yRange,
      'normal',
      0,
      viewportW,
      1080,
    )
    const total = viewport.endIndex - viewport.startIndex + 1
    expect(uniforms.halfW).toBe(Math.max(1 / viewportW, 0.8 / total))
  })

  test('viewportW and viewportH are passed through', () => {
    const viewport: ChartViewport = { startIndex: 0, endIndex: 99 }
    const yRange: NumericRange = { min: 90, max: 110 }
    const uniforms = computeViewportUniforms(
      viewport,
      yRange,
      'normal',
      0,
      1920,
      1080,
    )
    expect(uniforms.viewportW).toBe(1920)
    expect(uniforms.viewportH).toBe(1080)
  })

  test('identity uniforms include viewport dimensions', () => {
    const id = IDENTITY_VIEWPORT_UNIFORMS
    expect(id.viewportW).toBe(1)
    expect(id.viewportH).toBe(1)
  })
})
