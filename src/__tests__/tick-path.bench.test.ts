/**
 * Micro-benchmark for the live-tick render path.
 *
 * Compares the full O(N) rebuild (fillCandleInstances over ALL bars + full
 * buffer re-upload) against the incremental LAST_BAR path (rewrite 2
 * instances + bufferSubData of 12 floats).
 *
 * Wall-clock numbers are logged for information only. Assertions are based
 * on instrumented float-upload counts so CI never flakes on timing.
 */
import { describe, expect, test } from 'bun:test'

import {
  createPricePassState,
  renderPricePass,
} from '../core/render/webgl/passes/price-pass'
import { FLOATS_PER_INSTANCE } from '../core/render/webgl/programs/candle-program'
import { THEME_TOKENS } from '../core/theme/tokens'
import { makeBars } from './fixtures'
import type { ChartBar } from '../types'

class InstrumentedCandleProgram {
  /** Floats pushed to the GPU via full re-upload (bufferData equivalent). */
  fullUploadFloats = 0
  /** Floats pushed to the GPU via partial upload (bufferSubData equivalent). */
  partialUploadFloats = 0
  drawCalls = 0

  private buffer = new Float32Array(0)

  ensureBuffer(count: number): Float32Array {
    const needed = count * FLOATS_PER_INSTANCE
    if (this.buffer.length < needed) {
      this.buffer = new Float32Array(needed)
    }
    return this.buffer
  }

  updateInstances(_firstInstance: number, instanceCount: number): void {
    this.partialUploadFloats += instanceCount * FLOATS_PER_INSTANCE
  }

  drawInterleaved(instanceCount: number): void {
    this.fullUploadFloats += instanceCount * FLOATS_PER_INSTANCE
    this.drawCalls += 1
  }

  drawWithCachedBuffer(): void {
    this.drawCalls += 1
  }
}

class NoopProgram {
  ensureBuffer(count: number): Float32Array {
    return new Float32Array(count * 8)
  }
  updateInstances(): void {}
  drawInterleaved(): void {}
  drawWithCachedBuffer(): void {}
  draw(): void {}
}

const mutateLastBar = (bars: Array<ChartBar>, delta: number): void => {
  const last = bars[bars.length - 1]
  const close = last.close + delta
  last.close = close
  last.high = Math.max(last.high, close)
  last.low = Math.min(last.low, close)
}

const renderOnce = (
  bars: Array<ChartBar>,
  candle: InstrumentedCandleProgram,
  state: ReturnType<typeof createPricePassState>,
  lastBarOnly: boolean,
): void => {
  const noop = new NoopProgram()
  renderPricePass({
    series: [{ id: 'BENCH', bars }],
    // Realistic terminal viewport: last 120 bars visible
    viewport: {
      startIndex: Math.max(0, bars.length - 120),
      endIndex: bars.length - 1,
    },
    compareMode: 'indexed',
    chartType: 'candles',
    priceScaleMode: 'normal',
    theme: THEME_TOKENS,
    candleProgram: candle as never,
    barProgram: noop as never,
    lineProgram: noop as never,
    areaProgram: noop as never,
    lastBarOnly,
    canvasPixelWidth: 1920,
    canvasPixelHeight: 1080,
    state,
  })
}

describe('tick path micro-benchmark (candles)', () => {
  test('LAST_BAR partial path uploads orders of magnitude fewer floats than full rebuild', () => {
    const sizes = [1_000, 10_000, 100_000]

    for (const barCount of sizes) {
      const bars = makeBars(barCount, 100)
      const candle = new InstrumentedCandleProgram()
      const state = createPricePassState()

      // Initial full fill (as after history load)
      renderOnce(bars, candle, state, false)

      const iterations = barCount >= 100_000 ? 20 : 100

      // ── Full-rebuild path (status quo: every tick marks DirtyFlags.ALL) ──
      candle.fullUploadFloats = 0
      candle.partialUploadFloats = 0
      const fullStart = performance.now()
      for (let i = 0; i < iterations; i += 1) {
        mutateLastBar(bars, i % 2 === 0 ? 0.01 : -0.01)
        renderOnce(bars, candle, state, false)
      }
      const fullMs = performance.now() - fullStart
      const fullFloats = candle.fullUploadFloats

      // ── Incremental LAST_BAR path ──
      candle.fullUploadFloats = 0
      candle.partialUploadFloats = 0
      const partialStart = performance.now()
      for (let i = 0; i < iterations; i += 1) {
        mutateLastBar(bars, i % 2 === 0 ? 0.01 : -0.01)
        renderOnce(bars, candle, state, true)
      }
      const partialMs = performance.now() - partialStart
      const partialFloats = candle.partialUploadFloats

      const fullOps = (iterations / fullMs) * 1000
      const partialOps = (iterations / partialMs) * 1000
      console.log(
        `[tick-path bench] ${barCount.toLocaleString()} bars × ${iterations} ticks | ` +
          `full: ${fullMs.toFixed(1)}ms (${Math.round(fullOps).toLocaleString()} ops/s, ` +
          `${fullFloats.toLocaleString()} floats uploaded) | ` +
          `partial: ${partialMs.toFixed(1)}ms (${Math.round(partialOps).toLocaleString()} ops/s, ` +
          `${partialFloats.toLocaleString()} floats uploaded) | ` +
          `upload reduction: ${(fullFloats / Math.max(1, partialFloats)).toFixed(0)}x`,
      )

      // Full path re-uploads every instance of every bar on every tick
      expect(fullFloats).toBe(iterations * barCount * 2 * FLOATS_PER_INSTANCE)
      // Partial path uploads exactly one bar (body + wick) per tick
      expect(partialFloats).toBe(iterations * 2 * FLOATS_PER_INSTANCE)
      // Generous CI-safe bound: at least 100x fewer floats written/uploaded
      expect(partialFloats * 100).toBeLessThan(fullFloats)
      // Partial path must never fall back to a full upload
      expect(candle.fullUploadFloats).toBe(0)
    }
  })
})
