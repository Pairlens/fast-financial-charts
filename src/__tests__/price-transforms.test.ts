import { describe, expect, test } from 'bun:test'

import {
  computeSimpleAtr,
  isPriceTransformChartType,
  toKagiBars,
  toLineBreakBars,
  toPointFigureBars,
  toRenkoBars,
  transformBarsForChartType,
} from '../core/data/price-transforms'
import {
  createPricePassState,
  renderPricePass,
} from '../core/render/webgl/passes/price-pass'
import { FLOATS_PER_INSTANCE } from '../core/render/webgl/programs/candle-program'
import { BAR_FLOATS_PER_INSTANCE } from '../core/render/webgl/programs/bar-program'
import { THEME_TOKENS } from '../core/theme/tokens'
import type { ChartBar, ChartSeriesInput, ChartType } from '../types'

const BASE_TS = 1_700_000_000_000

/** Tight bars around a close series: open = previous close, small wicks. */
const barsFromCloses = (closes: Array<number>): Array<ChartBar> =>
  closes.map((close, i) => {
    const open = i > 0 ? closes[i - 1] : close
    return {
      ts: BASE_TS + i * 60_000,
      open,
      high: Math.max(open, close) + 0.1,
      low: Math.min(open, close) - 0.1,
      close,
      volume: 10,
    }
  })

/** Strongly trending bars for render-integration tests (default ATR path). */
const makeTrendingBars = (count: number, start = 100): Array<ChartBar> =>
  barsFromCloses(Array.from({ length: count }, (_, i) => start + i * 2))

describe('computeSimpleAtr', () => {
  test('averages the true range of the last 14 bars', () => {
    const bars = barsFromCloses([100, 101, 102, 103])
    // Each TR = high - low = |move| + 0.2 = 1.2
    expect(computeSimpleAtr(bars)).toBeCloseTo(1.2, 6)
  })

  test('falls back to 1% of last close for degenerate input', () => {
    expect(computeSimpleAtr([])).toBe(0)
    const single = barsFromCloses([200])
    expect(computeSimpleAtr(single)).toBeCloseTo(2, 6)
    // Zero-range bars → ATR 0 → fallback
    const flat: Array<ChartBar> = [100, 100, 100].map((close, i) => ({
      ts: BASE_TS + i,
      open: close,
      high: close,
      low: close,
      close,
      volume: 0,
    }))
    expect(computeSimpleAtr(flat)).toBeCloseTo(1, 6)
  })
})

describe('toRenkoBars', () => {
  test('uptrend produces contiguous up bricks', () => {
    const bars = barsFromCloses([100, 101, 102, 103, 105])
    const bricks = toRenkoBars(bars, 1)

    expect(bricks).toHaveLength(5)
    for (const brick of bricks) {
      expect(brick.close).toBeGreaterThan(brick.open)
      expect(brick.close - brick.open).toBeCloseTo(1, 6)
      expect(brick.high).toBeCloseTo(brick.close, 6)
      expect(brick.low).toBeCloseTo(brick.open, 6)
    }
    // Edges are contiguous within the trend
    for (let i = 1; i < bricks.length; i += 1) {
      expect(bricks[i].open).toBeCloseTo(bricks[i - 1].close, 6)
    }
    expect(bricks[0].open).toBeCloseTo(100, 6)
    expect(bricks[4].close).toBeCloseTo(105, 6)
  })

  test('a single bar can complete multiple bricks sharing its ts', () => {
    const bars = barsFromCloses([100, 103.5])
    const bricks = toRenkoBars(bars, 1)

    expect(bricks).toHaveLength(3)
    for (const brick of bricks) {
      expect(brick.ts).toBe(bars[1].ts)
    }
  })

  test('reversal requires a 2x brickSize move', () => {
    // Up to 102 (bricks 100→101, 101→102; current brick spans 101..102).
    // A drop to 100.5 is only 1.5 below the top edge — no reversal.
    const noReversal = toRenkoBars(barsFromCloses([100, 102, 100.5]), 1)
    expect(noReversal).toHaveLength(2)
    expect(noReversal.every((b) => b.close > b.open)).toBe(true)

    // A drop to 100 is 2 full bricks below the top edge — down brick forms,
    // opening at the current brick's lower edge (101).
    const reversed = toRenkoBars(barsFromCloses([100, 102, 100]), 1)
    expect(reversed).toHaveLength(3)
    const down = reversed[2]
    expect(down.open).toBeCloseTo(101, 6)
    expect(down.close).toBeCloseTo(100, 6)
    expect(down.close).toBeLessThan(down.open)
  })

  test('empty input and degenerate brick size produce no bricks', () => {
    expect(toRenkoBars([], 1)).toHaveLength(0)
    expect(toRenkoBars(barsFromCloses([100, 101]), 0)).toHaveLength(0)
  })
})

describe('toLineBreakBars', () => {
  test('rising closes each produce a new up line', () => {
    const bars = barsFromCloses([1, 2, 3, 4])
    const lines = toLineBreakBars(bars)

    expect(lines).toHaveLength(4)
    // Lines open at the previous line close
    for (let i = 1; i < lines.length; i += 1) {
      expect(lines[i].open).toBeCloseTo(lines[i - 1].close, 6)
      expect(lines[i].close).toBeGreaterThan(lines[i].open)
    }
  })

  test('closes inside the previous 3-line range produce no line', () => {
    const lines = toLineBreakBars(barsFromCloses([1, 2, 3, 2.5]))
    // 2.5 is between min(1,2,3) and max(1,2,3) → no new line
    expect(lines).toHaveLength(3)
  })

  test('a close below the min of the previous 3 closes reverses down', () => {
    const lines = toLineBreakBars(barsFromCloses([1, 2, 3, 0.5]))
    expect(lines).toHaveLength(4)
    const down = lines[3]
    expect(down.open).toBeCloseTo(3, 6)
    expect(down.close).toBeCloseTo(0.5, 6)
    expect(down.close).toBeLessThan(down.open)
  })

  test('the break window only considers the previous 3 lines', () => {
    // Line closes: 1,2,3,4 — window is (2,3,4), min=2
    expect(toLineBreakBars(barsFromCloses([1, 2, 3, 4, 2.5]))).toHaveLength(4)
    expect(toLineBreakBars(barsFromCloses([1, 2, 3, 4, 1.5]))).toHaveLength(5)
  })

  test('empty input produces no lines', () => {
    expect(toLineBreakBars([])).toHaveLength(0)
  })
})

describe('toKagiBars', () => {
  test('a counter-move of the reversal amount completes the segment', () => {
    const bars = barsFromCloses([100, 102, 101.5, 100.5])
    const segments = toKagiBars(bars, 1)

    expect(segments).toHaveLength(2)
    // Completed up segment: start 100 → extreme 102
    expect(segments[0].open).toBeCloseTo(100, 6)
    expect(segments[0].close).toBeCloseTo(102, 6)
    expect(segments[0].ts).toBe(bars[3].ts) // ts of the reversal candle
    // Trailing in-progress down segment from the extreme
    expect(segments[1].open).toBeCloseTo(102, 6)
    expect(segments[1].close).toBeCloseTo(100.5, 6)
    expect(segments[1].close).toBeLessThan(segments[1].open)
  })

  test('moves with the trend extend the current segment', () => {
    const segments = toKagiBars(barsFromCloses([100, 101, 103, 104]), 1)
    expect(segments).toHaveLength(1)
    expect(segments[0].open).toBeCloseTo(100, 6)
    expect(segments[0].close).toBeCloseTo(104, 6)
  })

  test('sub-reversal counter-moves are absorbed', () => {
    const segments = toKagiBars(barsFromCloses([100, 102, 101.5, 103]), 1)
    expect(segments).toHaveLength(1)
    expect(segments[0].close).toBeCloseTo(103, 6)
  })

  test('empty input and degenerate reversal produce no segments', () => {
    expect(toKagiBars([], 1)).toHaveLength(0)
    expect(toKagiBars(barsFromCloses([100, 105]), 0)).toHaveLength(0)
  })
})

describe('toPointFigureBars', () => {
  test('an uptrend builds a single X column snapped to whole boxes', () => {
    const columns = toPointFigureBars(barsFromCloses([100, 101, 102.5, 105]), 1)

    expect(columns).toHaveLength(1)
    expect(columns[0].open).toBeCloseTo(100, 6)
    expect(columns[0].close).toBeCloseTo(105, 6)
    expect(columns[0].close).toBeGreaterThan(columns[0].open)
  })

  test('a 3-box counter-move starts a new O column', () => {
    const columns = toPointFigureBars(barsFromCloses([100, 105, 101.9]), 1)

    expect(columns).toHaveLength(2)
    // Completed X column
    expect(columns[0].open).toBeCloseTo(100, 6)
    expect(columns[0].close).toBeCloseTo(105, 6)
    // O column starts one box below the top and extends in whole boxes
    expect(columns[1].open).toBeCloseTo(104, 6)
    expect(columns[1].close).toBeCloseTo(102, 6)
    expect(columns[1].close).toBeLessThan(columns[1].open)
  })

  test('counter-moves under 3 boxes do not reverse', () => {
    const columns = toPointFigureBars(barsFromCloses([100, 105, 102.5]), 1)
    expect(columns).toHaveLength(1)
    expect(columns[0].close).toBeCloseTo(105, 6)
  })

  test('empty input and degenerate box size produce no columns', () => {
    expect(toPointFigureBars([], 1)).toHaveLength(0)
    expect(toPointFigureBars(barsFromCloses([100, 105]), 0)).toHaveLength(0)
  })
})

describe('transformBarsForChartType', () => {
  test('dispatches every price-transform chart type', () => {
    const bars = makeTrendingBars(30)
    for (const chartType of [
      'renko',
      'lineBreak',
      'kagi',
      'pointFigure',
    ] as const) {
      expect(isPriceTransformChartType(chartType)).toBe(true)
      const transformed = transformBarsForChartType(bars, chartType)
      expect(transformed.length).toBeGreaterThan(0)
      for (const bar of transformed) {
        expect(Number.isFinite(bar.open)).toBe(true)
        expect(Number.isFinite(bar.close)).toBe(true)
        expect(bar.high).toBeGreaterThanOrEqual(bar.low)
      }
    }
  })

  test('non-transform chart types are rejected by the guard', () => {
    expect(isPriceTransformChartType('candles')).toBe(false)
    expect(isPriceTransformChartType('heikinAshi')).toBe(false)
    expect(isPriceTransformChartType('column')).toBe(false)
  })
})

// ── Render integration (mirrors extended-chart-types.test.ts harness) ──

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

  drawWithCachedBuffer(): void {}
}

class MockLineProgram {
  draws: Array<Float32Array> = []

  draw(points: Float32Array): void {
    this.draws.push(points)
  }
}

class MockAreaProgram {
  drawCount = 0

  ensureBuffer(vertexCount: number): Float32Array {
    return new Float32Array(vertexCount * 2)
  }

  drawInterleaved(): void {
    this.drawCount += 1
  }

  drawWithCachedBuffer(): void {}
}

class MockThickLineProgram {
  drawCount = 0

  ensureBuffer(vertexCount: number): Float32Array {
    return new Float32Array(vertexCount * 7)
  }

  drawInterleaved(): void {
    this.drawCount += 1
  }

  drawWithCachedBuffer(): void {}
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
  options?: { lastBarOnly?: boolean; viewportOnly?: boolean },
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
    canvasPixelWidth: 1920,
    canvasPixelHeight: 1080,
    dpr: 1,
    state,
  })
}

describe('price-transform chart types — render integration', () => {
  test('renko renders transformed bricks through the candle program', () => {
    const programs = makePrograms()
    const state = createPricePassState()
    const bars = makeTrendingBars(30)
    const expectedBricks = toRenkoBars(bars)
    expect(expectedBricks.length).toBeGreaterThan(0)

    const result = render(
      programs,
      state,
      [makeSeries('BTC-USD', bars)],
      'renko',
    )

    // 2 instances (body + wick) per brick — N:M, not per source bar
    expect(programs.candle.drawCount).toBe(1)
    expect(programs.candle.lastInstanceCount).toBe(expectedBricks.length * 2)
    expect(programs.bar.drawCount).toBe(0)
    expect(programs.thickLine.drawCount).toBe(0)

    // Bricks are right-aligned: first brick x-index = sourceCount - brickCount
    const indexOffset = bars.length - expectedBricks.length
    const body = programs.candle.bufferSlice(0, FLOATS_PER_INSTANCE)
    expect(body[0]).toBeCloseTo(expectedBricks[0].open, 4)
    expect(body[3]).toBeCloseTo(expectedBricks[0].close, 4)
    expect(body[4]).toBe(indexOffset)
    expect(body[5]).toBe(0)

    // Last brick lands on the last source bar's x-index
    const lastStart = (expectedBricks.length - 1) * 2 * FLOATS_PER_INSTANCE
    const lastBody = programs.candle.bufferSlice(
      lastStart,
      lastStart + FLOATS_PER_INSTANCE,
    )
    expect(lastBody[4]).toBe(bars.length - 1)

    // y-range and visible bars come from the transformed series
    expect(result.primaryVisibleBars).toHaveLength(expectedBricks.length)
    expect(result.yRange.max).toBeGreaterThan(result.yRange.min)
    const brickMax = Math.max(...expectedBricks.map((b) => b.high))
    const brickMin = Math.min(...expectedBricks.map((b) => b.low))
    expect(result.yRange.max).toBeGreaterThanOrEqual(brickMax)
    expect(result.yRange.min).toBeLessThanOrEqual(brickMin)
  })

  test('lineBreak renders transformed lines through the candle program', () => {
    const programs = makePrograms()
    const state = createPricePassState()
    const bars = makeTrendingBars(25)
    const expectedLines = toLineBreakBars(bars)
    expect(expectedLines.length).toBeGreaterThan(0)

    const result = render(
      programs,
      state,
      [makeSeries('BTC-USD', bars)],
      'lineBreak',
    )

    expect(programs.candle.drawCount).toBe(1)
    expect(programs.candle.lastInstanceCount).toBe(expectedLines.length * 2)
    expect(result.primaryVisibleBars).toHaveLength(expectedLines.length)
  })

  test('kagi and pointFigure render their transformed series', () => {
    for (const chartType of ['kagi', 'pointFigure'] as const) {
      const programs = makePrograms()
      const state = createPricePassState()
      const bars = makeTrendingBars(40)
      const expected = transformBarsForChartType(bars, chartType)
      expect(expected.length).toBeGreaterThan(0)

      const result = render(
        programs,
        state,
        [makeSeries('BTC-USD', bars)],
        chartType,
      )

      expect(programs.candle.drawCount).toBe(1)
      expect(programs.candle.lastInstanceCount).toBe(expected.length * 2)
      expect(result.primaryVisibleBars).toHaveLength(expected.length)
      expect(Number.isFinite(result.yRange.min)).toBe(true)
      expect(Number.isFinite(result.yRange.max)).toBe(true)
    }
  })

  test('viewportOnly redraws reuse the cached transform and buffer', () => {
    const programs = makePrograms()
    const state = createPricePassState()
    const bars = makeTrendingBars(30)
    const series = [makeSeries('BTC-USD', bars)]

    const first = render(programs, state, series, 'renko')
    const second = render(programs, state, series, 'renko', {
      viewportOnly: true,
    })

    expect(programs.candle.drawCount).toBe(1)
    expect(programs.candle.drawWithCachedCount).toBe(1)
    expect(second.primaryVisibleBars).toHaveLength(
      first.primaryVisibleBars.length,
    )
    expect(second.yRange.min).toBeCloseTo(first.yRange.min, 6)
    expect(second.yRange.max).toBeCloseTo(first.yRange.max, 6)
  })

  test('lastBarOnly ticks take the full-rebuild path (no partial patch)', () => {
    const programs = makePrograms()
    const state = createPricePassState()
    const bars = makeTrendingBars(30)

    render(programs, state, [makeSeries('BTC-USD', bars)], 'renko')
    bars[29] = { ...bars[29], close: bars[29].close + 5 }
    render(programs, state, [makeSeries('BTC-USD', bars)], 'renko', {
      lastBarOnly: true,
    })

    // A tick can change the brick count, so no bufferSubData patching
    expect(programs.candle.updateCalls).toHaveLength(0)
    expect(programs.candle.drawCount).toBe(2)
  })

  test('switching from a transform type to candles invalidates the cache', () => {
    const programs = makePrograms()
    const state = createPricePassState()
    const bars = makeTrendingBars(20)
    const series = [makeSeries('BTC-USD', bars)]

    render(programs, state, series, 'renko')
    render(programs, state, series, 'candles', { lastBarOnly: true })

    expect(programs.candle.updateCalls).toHaveLength(0)
    expect(programs.candle.lastInstanceCount).toBe(bars.length * 2)
  })

  test('transform types fall back to line rendering in compare mode', () => {
    for (const chartType of [
      'renko',
      'lineBreak',
      'kagi',
      'pointFigure',
    ] as const) {
      const programs = makePrograms()
      const state = createPricePassState()

      render(
        programs,
        state,
        [
          makeSeries('BTC-USD', makeTrendingBars(20)),
          makeSeries('ETH-USD', makeTrendingBars(20, 50)),
        ],
        chartType,
      )

      expect(programs.line.draws.length).toBe(2)
      expect(programs.candle.drawCount).toBe(0)
    }
  })

  test('flat data producing zero bricks renders without throwing', () => {
    const programs = makePrograms()
    const state = createPricePassState()
    const flat = barsFromCloses(Array.from({ length: 10 }, () => 100))

    const result = render(
      programs,
      state,
      [makeSeries('BTC-USD', flat)],
      'renko',
    )

    expect(programs.candle.lastInstanceCount).toBe(0)
    expect(result.primaryVisibleBars).toHaveLength(0)
    expect(Number.isFinite(result.yRange.min)).toBe(true)
    expect(Number.isFinite(result.yRange.max)).toBe(true)
  })
})
