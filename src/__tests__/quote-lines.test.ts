import { describe, expect, test } from 'bun:test'

import { renderTextOverlayPass } from '../core/render/canvas2d/text-overlay-pass'
import { THEME_TOKENS } from '../core/theme/tokens'
import { makeBars } from './fixtures'
import type { ChartViewport, NumericRange } from '../types'

/**
 * Recording stand-in for CanvasRenderingContext2D — captures the draw calls
 * the quote-lines feature depends on (dash pattern, line strokes, axis
 * labels) without a real canvas.
 */
class MockCtx {
  strokeStyle = ''
  fillStyle: string | CanvasGradient | CanvasPattern = ''
  lineWidth = 1
  font = ''
  textAlign = ''
  textBaseline = ''

  dashCalls: Array<Array<number>> = []
  strokes: Array<{ style: string; dash: Array<number> }> = []
  fillTexts: Array<{ text: string; x: number; y: number }> = []
  fillRects: Array<{ x: number; y: number; w: number; h: number }> = []

  private currentDash: Array<number> = []

  setLineDash(dash: Array<number>): void {
    this.currentDash = dash
    if (dash.length > 0) this.dashCalls.push(dash)
  }
  getLineDash(): Array<number> {
    return this.currentDash
  }
  beginPath(): void {}
  moveTo(): void {}
  lineTo(): void {}
  stroke(): void {
    this.strokes.push({
      style: String(this.strokeStyle),
      dash: [...this.currentDash],
    })
  }
  fill(): void {}
  fillRect(x: number, y: number, w: number, h: number): void {
    this.fillRects.push({ x, y, w, h })
  }
  fillText(text: string, x: number, y: number): void {
    this.fillTexts.push({ text, x, y })
  }
  clearRect(): void {}
  save(): void {}
  restore(): void {}
  translate(): void {}
  rotate(): void {}
  measureText(text: string): TextMetrics {
    return { width: text.length * 6 } as TextMetrics
  }
}

const render = (
  ctx: MockCtx,
  quoteLines: { bid: number; ask: number } | null,
  yRange: NumericRange = { min: 90, max: 130 },
) => {
  const bars = makeBars(20)
  const viewport: ChartViewport = { startIndex: 0, endIndex: 19 }
  renderTextOverlayPass({
    ctx: ctx as unknown as CanvasRenderingContext2D,
    width: 500,
    height: 400,
    bars,
    viewport,
    yRange,
    theme: THEME_TOKENS,
    lastClose: bars[bars.length - 1].close,
    lastBar: bars[bars.length - 1],
    pricePrecision: 2,
    quoteLines,
  })
}

describe('bid/ask quote lines (text overlay pass)', () => {
  test('draws two dotted lines and two axis labels when quotes are set', () => {
    const ctx = new MockCtx()
    render(ctx, { bid: 100.5, ask: 101.5 })

    // Two dotted [2,2] strokes — one per quote line (the last-close line
    // uses [3,3], axis borders use solid).
    const dotted = ctx.strokes.filter(
      (s) => s.dash.length === 2 && s.dash[0] === 2 && s.dash[1] === 2,
    )
    expect(dotted.length).toBe(2)
    expect(dotted.some((s) => s.style.startsWith(THEME_TOKENS.upCandle))).toBe(
      true,
    )
    expect(
      dotted.some((s) => s.style.startsWith(THEME_TOKENS.downCandle)),
    ).toBe(true)

    // Axis labels for both quotes are drawn (after the axis background fill,
    // so they stay visible).
    expect(ctx.fillTexts.some((t) => t.text === '100.50')).toBe(true)
    expect(ctx.fillTexts.some((t) => t.text === '101.50')).toBe(true)
  })

  test('draws nothing extra when quotes are null', () => {
    const ctx = new MockCtx()
    render(ctx, null)

    const dotted = ctx.strokes.filter(
      (s) => s.dash.length === 2 && s.dash[0] === 2 && s.dash[1] === 2,
    )
    expect(dotted.length).toBe(0)
  })

  test('pins off-range quotes to the chart edge (like the last-price label)', () => {
    const ctx = new MockCtx()
    // Range far above both quotes. valueToYScaled clamps to the chart
    // bounds, so the labels pin to the bottom edge — the same TradingView
    // behavior the last-close label already has.
    render(ctx, { bid: 100.5, ask: 101.5 }, { min: 1000, max: 2000 })

    const chartHeight = 400 - THEME_TOKENS.layout.timeAxisHeight
    const quoteLabels = ctx.fillTexts.filter(
      (t) => t.text === '100.50' || t.text === '101.50',
    )
    expect(quoteLabels.length).toBe(2)
    for (const label of quoteLabels) {
      expect(label.y).toBeGreaterThanOrEqual(0)
      expect(label.y).toBeLessThanOrEqual(chartHeight + 8)
    }
  })
})
