import { describe, expect, test } from 'bun:test'

import {
  TickWeight,
  computeTimeAxisTicks,
} from '../core/render/canvas2d/time-ticks'
import type { ChartBar, ChartViewport } from '../types'

const MS_MINUTE = 60_000
const MS_HOUR = 60 * MS_MINUTE
const MS_DAY = 24 * MS_HOUR

/** Monospace stand-in for ctx.measureText at the axis font size. */
const measureText = (text: string): number => text.length * 6

/** Bars on a fixed interval, starting at a local midnight. */
const makeSeries = (count: number, intervalMs: number): Array<ChartBar> => {
  const start = new Date(2026, 0, 5) // Mon 2026-01-05 00:00 local
  start.setHours(0, 0, 0, 0)
  const startTs = start.getTime()

  return Array.from({ length: count }, (_, index) => ({
    ts: startTs + index * intervalMs,
    open: 100,
    high: 101,
    low: 99,
    close: 100.5,
    volume: 10,
  }))
}

const fullViewport = (bars: Array<ChartBar>): ChartViewport => ({
  startIndex: 0,
  endIndex: bars.length - 1,
})

const plan = (
  bars: Array<ChartBar>,
  chartWidth: number,
  viewport: ChartViewport = fullViewport(bars),
) => computeTimeAxisTicks({ bars, viewport, chartWidth, measureText })

/** Every pair of adjacent labels, as [leftEdge, rightEdge] boxes. */
const boxes = (ticks: ReturnType<typeof plan>) =>
  ticks.map((tick) => [
    tick.labelX - tick.width / 2,
    tick.labelX + tick.width / 2,
  ])

describe('time axis tick planning', () => {
  test('labels never overlap, at any width or zoom', () => {
    const cases: Array<{ bars: Array<ChartBar>; widths: Array<number> }> = [
      { bars: makeSeries(500, MS_MINUTE), widths: [120, 320, 700, 1400] },
      { bars: makeSeries(500, 5 * MS_MINUTE), widths: [120, 320, 700, 1400] },
      { bars: makeSeries(500, MS_HOUR), widths: [90, 240, 640, 1920] },
      { bars: makeSeries(400, 4 * MS_HOUR), widths: [160, 480, 1024] },
      { bars: makeSeries(900, MS_DAY), widths: [200, 560, 1280] },
      { bars: makeSeries(600, 7 * MS_DAY), widths: [200, 560, 1280] },
      { bars: makeSeries(120, 30 * MS_DAY), widths: [200, 560, 1280] },
    ]

    for (const { bars, widths } of cases) {
      for (const width of widths) {
        // Sweep zoom levels from "everything" down to a handful of bars.
        for (const visible of [bars.length, 200, 60, 20, 5, 2]) {
          if (visible > bars.length) continue
          const viewport: ChartViewport = {
            startIndex: bars.length - visible,
            endIndex: bars.length - 1,
          }
          const ticks = plan(bars, width, viewport)
          const rects = boxes(ticks)

          for (let i = 1; i < rects.length; i += 1) {
            expect(rects[i][0]).toBeGreaterThan(rects[i - 1][1])
          }
        }
      }
    }
  })

  test('labels stay inside the axis', () => {
    const bars = makeSeries(300, MS_HOUR)
    for (const width of [150, 400, 900]) {
      for (const tick of plan(bars, width)) {
        expect(tick.labelX - tick.width / 2).toBeGreaterThanOrEqual(0)
        expect(tick.labelX + tick.width / 2).toBeLessThanOrEqual(width)
      }
    }
  })

  test('ticks are ordered left to right and land on visible bars', () => {
    const bars = makeSeries(400, 15 * MS_MINUTE)
    const viewport: ChartViewport = { startIndex: 100, endIndex: 260 }
    const ticks = computeTimeAxisTicks({
      bars,
      viewport,
      chartWidth: 800,
      measureText,
    })

    expect(ticks.length).toBeGreaterThan(1)
    for (let i = 1; i < ticks.length; i += 1) {
      expect(ticks[i].x).toBeGreaterThan(ticks[i - 1].x)
    }
    for (const tick of ticks) {
      expect(tick.index).toBeGreaterThanOrEqual(viewport.startIndex)
      expect(tick.index).toBeLessThanOrEqual(viewport.endIndex)
      expect(tick.ts).toBe(bars[tick.index].ts)
    }
  })

  test('labels say only what changed: day number at midnight, clock otherwise', () => {
    const bars = makeSeries(24 * 4, MS_HOUR) // four days of hourly bars
    const ticks = plan(bars, 900)

    const dayTicks = ticks.filter((tick) => tick.weight === TickWeight.Day)
    expect(dayTicks.length).toBeGreaterThan(0)
    for (const tick of dayTicks) {
      const date = new Date(tick.ts)
      expect(date.getHours()).toBe(0)
      expect(tick.label).toBe(String(date.getDate()))
    }

    const timeTicks = ticks.filter((tick) => tick.weight <= TickWeight.Hour)
    expect(timeTicks.length).toBeGreaterThan(0)
    for (const tick of timeTicks) {
      expect(tick.label).toMatch(/^\d{2}:\d{2}$/)
    }
  })

  test('month and year boundaries outrank the days around them', () => {
    // Daily bars spanning a year boundary.
    const start = new Date(2025, 11, 1)
    start.setHours(0, 0, 0, 0)
    const bars: Array<ChartBar> = Array.from({ length: 90 }, (_, index) => {
      const day = new Date(start)
      day.setDate(day.getDate() + index)
      return {
        ts: day.getTime(),
        open: 100,
        high: 101,
        low: 99,
        close: 100,
        volume: 1,
      }
    })

    const ticks = plan(bars, 600)
    const labels = ticks.map((tick) => tick.label)

    expect(labels).toContain('2026')
    expect(ticks.find((tick) => tick.label === '2026')?.weight).toBe(
      TickWeight.Year,
    )
    // February opens inside the range and keeps its month label.
    expect(labels).toContain('Feb')
  })

  test('a boundary falling in a data gap labels the bar that reopens', () => {
    // Weekday-only daily bars: Sat/Sun boundaries have no bar of their own.
    const bars: Array<ChartBar> = []
    const cursor = new Date(2026, 0, 5) // Monday
    cursor.setHours(0, 0, 0, 0)
    for (let i = 0; i < 60; i += 1) {
      const day = cursor.getDay()
      if (day !== 0 && day !== 6) {
        bars.push({
          ts: cursor.getTime(),
          open: 100,
          high: 101,
          low: 99,
          close: 100,
          volume: 1,
        })
      }
      cursor.setDate(cursor.getDate() + 1)
    }

    const ticks = plan(bars, 700)
    expect(ticks.length).toBeGreaterThan(0)
    // Every label describes the bar it sits on — no weekend ghosts.
    for (const tick of ticks) {
      const date = new Date(tick.ts)
      expect(date.getDay()).not.toBe(0)
      expect(date.getDay()).not.toBe(6)
      if (tick.weight === TickWeight.Day) {
        expect(tick.label).toBe(String(date.getDate()))
      }
    }
    // Bars repeat at most once per index.
    const indices = ticks.map((tick) => tick.index)
    expect(new Set(indices).size).toBe(indices.length)
  })

  test('tickMarkFormatter overrides the label and still gets measured', () => {
    const bars = makeSeries(200, MS_HOUR)
    const ticks = computeTimeAxisTicks({
      bars,
      viewport: fullViewport(bars),
      chartWidth: 800,
      measureText,
      tickMarkFormatter: (time, tickType) =>
        `${tickType}:${new Date(time).getHours()}`,
    })

    expect(ticks.length).toBeGreaterThan(0)
    for (const tick of ticks) {
      expect(tick.label).toMatch(/^(year|month|day|time):\d+$/)
      expect(tick.width).toBe(measureText(tick.label))
    }
    const rects = boxes(ticks)
    for (let i = 1; i < rects.length; i += 1) {
      expect(rects[i][0]).toBeGreaterThan(rects[i - 1][1])
    }
  })

  test('a very long custom label yields one centered tick, not a pile', () => {
    const bars = makeSeries(200, MS_HOUR)
    const ticks = computeTimeAxisTicks({
      bars,
      viewport: fullViewport(bars),
      chartWidth: 220,
      measureText,
      tickMarkFormatter: (time) => new Date(time).toISOString(),
    })

    expect(ticks.length).toBe(1)
    expect(ticks[0].labelX).toBeGreaterThan(0)
  })

  test('degenerate inputs return no ticks instead of throwing', () => {
    expect(plan([], 800)).toEqual([])
    expect(plan(makeSeries(50, MS_HOUR), 0)).toEqual([])

    // Single bar, and a viewport wider than the data (right-hand offset).
    const one = makeSeries(1, MS_HOUR)
    expect(plan(one, 400).length).toBe(1)

    const bars = makeSeries(50, MS_HOUR)
    const ticks = computeTimeAxisTicks({
      bars,
      viewport: { startIndex: 0, endIndex: 80 },
      chartWidth: 600,
      measureText,
    })
    for (const tick of ticks) {
      expect(tick.index).toBeLessThan(bars.length)
      expect(tick.x).toBeLessThanOrEqual(600)
    }
  })

  test('tick count scales with available width', () => {
    const bars = makeSeries(400, MS_HOUR)
    const narrow = plan(bars, 200).length
    const wide = plan(bars, 1600).length

    expect(narrow).toBeGreaterThan(0)
    expect(wide).toBeGreaterThan(narrow)
  })

  test('never ticks finer than the bar interval', () => {
    const bars = makeSeries(200, MS_DAY)
    const ticks = plan(bars, 1600)

    for (let i = 1; i < ticks.length; i += 1) {
      expect(ticks[i].ts - ticks[i - 1].ts).toBeGreaterThanOrEqual(MS_DAY)
    }
  })
})
