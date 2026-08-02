import { describe, expect, test } from 'bun:test'

import {
  createPricePassState,
  fillStepLinePoints,
  renderPricePass,
} from '../core/render/webgl/passes/price-pass'
import { FLOATS_PER_INSTANCE } from '../core/render/webgl/programs/candle-program'
import { BAR_FLOATS_PER_INSTANCE } from '../core/render/webgl/programs/bar-program'
import { THEME_TOKENS } from '../core/theme/tokens'
import { makeBars } from './fixtures'
import type { ChartBar, ChartSeriesInput, ChartType } from '../types'

class MockCandleProgram {
  drawCount = 0
  drawWithCachedCount = 0
  lastInstanceCount = 0
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

  drawInterleaved(instanceCount: number): void {
    this.drawCount += 1
    this.lastInstanceCount = instanceCount
  }

  drawWithCachedBuffer(instanceCount: number): void {
    this.drawWithCachedCount += 1
    this.lastInstanceCount = instanceCount
  }
}

class MockBarProgram {
  drawCount = 0
  drawWithCachedCount = 0

  private buffer = new Float32Array(0)

  ensureBuffer(count: number): Float32Array {
    const needed = count * BAR_FLOATS_PER_INSTANCE
    if (this.buffer.length < needed) {
      this.buffer = new Float32Array(needed)
    }
    return this.buffer
  }

  updateInstances(): void {}

  drawInterleaved(): void {
    this.drawCount += 1
  }

  drawWithCachedBuffer(): void {
    this.drawWithCachedCount += 1
  }
}

class MockLineProgram {
  draws: Array<Float32Array> = []

  draw(points: Float32Array): void {
    this.draws.push(points)
  }
}

class MockAreaProgram {
  drawCount = 0
  drawWithCachedCount = 0
  lastVertexCount = 0

  private buffer = new Float32Array(0)

  ensureBuffer(vertexCount: number): Float32Array {
    const needed = vertexCount * 2
    if (this.buffer.length < needed) {
      this.buffer = new Float32Array(needed)
    }
    return this.buffer
  }

  bufferSlice(floatStart: number, floatEnd: number): Float32Array {
    return this.buffer.slice(floatStart, floatEnd)
  }

  drawInterleaved(vertexCount: number): void {
    this.drawCount += 1
    this.lastVertexCount = vertexCount
  }

  drawWithCachedBuffer(vertexCount: number): void {
    this.drawWithCachedCount += 1
    this.lastVertexCount = vertexCount
  }
}

class MockThickLineProgram {
  drawCount = 0
  drawWithCachedCount = 0
  lastVertexCount = 0

  private buffer = new Float32Array(0)

  ensureBuffer(vertexCount: number): Float32Array {
    const needed = vertexCount * 7
    if (this.buffer.length < needed) {
      this.buffer = new Float32Array(needed)
    }
    return this.buffer
  }

  drawInterleaved(vertexCount: number): void {
    this.drawCount += 1
    this.lastVertexCount = vertexCount
  }

  drawWithCachedBuffer(vertexCount: number): void {
    this.drawWithCachedCount += 1
    this.lastVertexCount = vertexCount
  }
}

type Programs = {
  candle: MockCandleProgram
  bar: MockBarProgram
  line: MockLineProgram
  area: MockAreaProgram
  thickLine: MockThickLineProgram
}

const makePrograms = (): Programs => ({
  candle: new MockCandleProgram(),
  bar: new MockBarProgram(),
  line: new MockLineProgram(),
  area: new MockAreaProgram(),
  thickLine: new MockThickLineProgram(),
})

const makeSeries = (id: string, bars: Array<ChartBar>): ChartSeriesInput => ({
  id,
  bars,
})

const render = (
  programs: Programs,
  state: ReturnType<typeof createPricePassState>,
  series: Array<ChartSeriesInput>,
  chartType: ChartType,
  options?: {
    lastBarOnly?: boolean
    viewportOnly?: boolean
    histogramBaseValue?: number
  },
) => {
  const barCount = series[0]?.bars.length ?? 0
  return renderPricePass({
    series,
    viewport: { startIndex: 0, endIndex: Math.max(0, barCount - 1) },
    compareMode: 'indexed',
    chartType,
    priceScaleMode: 'normal',
    theme: THEME_TOKENS,
    candleProgram: programs.candle as never,
    barProgram: programs.bar as never,
    lineProgram: programs.line as never,
    areaProgram: programs.area as never,
    thickLineProgram: programs.thickLine as never,
    lastBarOnly: options?.lastBarOnly,
    viewportOnly: options?.viewportOnly,
    histogramBaseValue: options?.histogramBaseValue,
    canvasPixelWidth: 1920,
    canvasPixelHeight: 1080,
    dpr: 1,
    state,
  })
}

describe('fillStepLinePoints', () => {
  test('expands N closes into 2N-1 step points', () => {
    const state = createPricePassState()
    const bars: Array<ChartBar> = [10, 12, 11].map((close, i) => ({
      ts: i,
      open: close - 1,
      high: close + 1,
      low: close - 2,
      close,
      volume: 1,
    }))

    const pointCount = fillStepLinePoints(state, bars)

    expect(pointCount).toBe(5)
    // [(0,10), (1,10), (1,12), (2,12), (2,11)]
    expect(Array.from(state.smoothedBuf.slice(0, pointCount * 2))).toEqual([
      0, 10, 1, 10, 1, 12, 2, 12, 2, 11,
    ])
  })

  test('single bar produces a single point', () => {
    const state = createPricePassState()
    const bars = makeBars(1, 100)

    const pointCount = fillStepLinePoints(state, bars)

    expect(pointCount).toBe(1)
    expect(state.smoothedBuf[0]).toBe(0)
    expect(state.smoothedBuf[1]).toBeCloseTo(bars[0].close, 4)
  })

  test('empty bars produce zero points', () => {
    const state = createPricePassState()
    expect(fillStepLinePoints(state, [])).toBe(0)
  })
})

describe('extended chart types — render paths', () => {
  test('hollowCandles renders 2 instances per bar with hollow body flag', () => {
    const programs = makePrograms()
    const state = createPricePassState()
    const bars = makeBars(20, 100)

    render(programs, state, [makeSeries('BTC-USD', bars)], 'hollowCandles')

    expect(programs.candle.drawCount).toBe(1)
    expect(programs.candle.lastInstanceCount).toBe(40)

    // First bar: body instance carries partType 2 (hollow), wick carries 1
    const body = programs.candle.bufferSlice(0, FLOATS_PER_INSTANCE)
    const wick = programs.candle.bufferSlice(
      FLOATS_PER_INSTANCE,
      2 * FLOATS_PER_INSTANCE,
    )
    expect(body[5]).toBe(2)
    expect(wick[5]).toBe(1)
    // Raw OHLC preserved (float32 rounding)
    expect(body[0]).toBeCloseTo(bars[0].open, 4)
    expect(body[3]).toBeCloseTo(bars[0].close, 4)
  })

  test('hollowCandles supports the lastBarOnly partial path', () => {
    const programs = makePrograms()
    const state = createPricePassState()
    const bars = makeBars(20, 100)

    render(programs, state, [makeSeries('BTC-USD', bars)], 'hollowCandles')
    bars[19].close += 0.1
    render(programs, state, [makeSeries('BTC-USD', bars)], 'hollowCandles', {
      lastBarOnly: true,
    })

    expect(programs.candle.drawCount).toBe(1)
    expect(programs.candle.updateCalls).toEqual([
      { firstInstance: 19 * 2, instanceCount: 2 },
    ])
    // Rewritten body keeps the hollow flag
    const start = 19 * 2 * FLOATS_PER_INSTANCE
    const body = programs.candle.bufferSlice(start, start + FLOATS_PER_INSTANCE)
    expect(body[5]).toBe(2)
  })

  test('stepLine renders through the thick-line program without smoothing', () => {
    const programs = makePrograms()
    const state = createPricePassState()
    const bars = makeBars(30, 100)

    render(programs, state, [makeSeries('BTC-USD', bars)], 'stepLine')

    expect(programs.thickLine.drawCount).toBe(1)
    // 2N-1 points, 2 vertices per point
    expect(programs.thickLine.lastVertexCount).toBe((30 * 2 - 1) * 2)
    // No area fill for stepLine
    expect(programs.area.drawCount).toBe(0)
  })

  test('stepLine viewportOnly redraw uses the cached buffer', () => {
    const programs = makePrograms()
    const state = createPricePassState()
    const bars = makeBars(30, 100)
    const series = [makeSeries('BTC-USD', bars)]

    render(programs, state, series, 'stepLine')
    render(programs, state, series, 'stepLine', { viewportOnly: true })

    expect(programs.thickLine.drawCount).toBe(1)
    expect(programs.thickLine.drawWithCachedCount).toBe(1)
  })

  test('hlcArea renders a high/low band plus three lines', () => {
    const programs = makePrograms()
    const state = createPricePassState()
    const bars = makeBars(25, 100)

    render(programs, state, [makeSeries('BTC-USD', bars)], 'hlcArea')

    // Band: 2 vertices per bar
    expect(programs.area.drawCount).toBe(1)
    expect(programs.area.lastVertexCount).toBe(50)
    // Band buffer alternates [i, high, i, low]
    const band = programs.area.bufferSlice(0, 8)
    expect(band[0]).toBe(0)
    expect(band[1]).toBeCloseTo(bars[0].high, 4)
    expect(band[2]).toBe(0)
    expect(band[3]).toBeCloseTo(bars[0].low, 4)
    // Three thick lines: high, low, close
    expect(programs.thickLine.drawCount).toBe(3)
    expect(programs.thickLine.lastVertexCount).toBe(25 * 2)
    // Candle/bar programs untouched
    expect(programs.candle.drawCount).toBe(0)
    expect(programs.bar.drawCount).toBe(0)
  })

  test('highLow renders one range instance per bar colored by prev close', () => {
    const programs = makePrograms()
    const state = createPricePassState()
    const bars = makeBars(20, 100)

    render(programs, state, [makeSeries('BTC-USD', bars)], 'highLow')

    expect(programs.candle.drawCount).toBe(1)
    expect(programs.candle.lastInstanceCount).toBe(20)

    // Second bar: open slot = previous close, rect spans high..low, flag 3
    const start = 1 * FLOATS_PER_INSTANCE
    const inst = programs.candle.bufferSlice(start, start + FLOATS_PER_INSTANCE)
    expect(inst[0]).toBeCloseTo(bars[0].close, 4)
    expect(inst[1]).toBeCloseTo(bars[1].high, 4)
    expect(inst[2]).toBeCloseTo(bars[1].low, 4)
    expect(inst[3]).toBeCloseTo(bars[1].close, 4)
    expect(inst[4]).toBe(1)
    expect(inst[5]).toBe(3)
  })

  test('column renders base..close range instances colored by prev close', () => {
    const programs = makePrograms()
    const state = createPricePassState()
    const bars = makeBars(20, 100)

    render(programs, state, [makeSeries('BTC-USD', bars)], 'column')

    expect(programs.candle.drawCount).toBe(1)
    expect(programs.candle.lastInstanceCount).toBe(20)

    // Second bar: rect spans base(0)..close, open slot = prev close, flag 3
    const start = 1 * FLOATS_PER_INSTANCE
    const inst = programs.candle.bufferSlice(start, start + FLOATS_PER_INSTANCE)
    expect(inst[0]).toBeCloseTo(bars[0].close, 4)
    expect(inst[1]).toBeCloseTo(Math.max(0, bars[1].close), 4)
    expect(inst[2]).toBeCloseTo(Math.min(0, bars[1].close), 4)
    expect(inst[5]).toBe(3)
  })

  test('highLow/column support viewportOnly and lastBarOnly paths', () => {
    const programs = makePrograms()
    const state = createPricePassState()
    const bars = makeBars(20, 100)
    const series = [makeSeries('BTC-USD', bars)]

    render(programs, state, series, 'highLow')
    render(programs, state, series, 'highLow', { viewportOnly: true })
    expect(programs.candle.drawWithCachedCount).toBe(1)

    bars[19].close += 0.1
    render(programs, state, series, 'highLow', { lastBarOnly: true })
    expect(programs.candle.updateCalls).toEqual([
      { firstInstance: 19, instanceCount: 1 },
    ])
    expect(programs.candle.drawCount).toBe(1)
  })

  test('chart type switch from a new type invalidates cached fills', () => {
    const programs = makePrograms()
    const state = createPricePassState()
    const bars = makeBars(20, 100)
    const series = [makeSeries('BTC-USD', bars)]

    render(programs, state, series, 'column')
    // Switching to candles with lastBarOnly must full-rebuild, not patch
    bars[19].close += 0.1
    render(programs, state, series, 'candles', { lastBarOnly: true })

    expect(programs.candle.updateCalls).toHaveLength(0)
    expect(programs.candle.lastInstanceCount).toBe(40)
  })

  test('all new chart types fall back to line rendering in compare mode', () => {
    const newTypes: Array<ChartType> = [
      'hollowCandles',
      'stepLine',
      'hlcArea',
      'highLow',
      'column',
    ]

    for (const chartType of newTypes) {
      const programs = makePrograms()
      const state = createPricePassState()
      const result = render(
        programs,
        state,
        [
          makeSeries('BTC-USD', makeBars(20, 100)),
          makeSeries('ETH-USD', makeBars(20, 50)),
        ],
        chartType,
      )

      // Compare mode: per-series polylines via the plain line program only
      expect(programs.line.draws.length).toBe(2)
      expect(programs.candle.drawCount).toBe(0)
      expect(programs.thickLine.drawCount).toBe(0)
      expect(programs.area.drawCount).toBe(0)
      expect(Number.isFinite(result.yRange.min)).toBe(true)
      expect(Number.isFinite(result.yRange.max)).toBe(true)
    }
  })

  test('every new chart type renders single-series without throwing', () => {
    const newTypes: Array<ChartType> = [
      'hollowCandles',
      'stepLine',
      'hlcArea',
      'highLow',
      'column',
    ]

    for (const chartType of newTypes) {
      const programs = makePrograms()
      const state = createPricePassState()
      const result = render(
        programs,
        state,
        [makeSeries('BTC-USD', makeBars(40, 100))],
        chartType,
      )
      expect(result.primaryVisibleBars).toHaveLength(40)
      expect(result.yRange.max).toBeGreaterThan(result.yRange.min)
    }
  })
})
