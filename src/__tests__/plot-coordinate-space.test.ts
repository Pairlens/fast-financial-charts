import { describe, expect, test } from 'bun:test'

import { createCoordinateHelpers } from '../core/primitives/coordinates'
import { toLinePoints } from '../core/indicators/presenters/utils'
import { toXFromTs } from '../core/drawings/transforms'
import { computeViewportUniforms } from '../core/render/webgl/shaders/viewport-uniforms'
import type { ChartBar } from '../types/data'

/**
 * Every layer of the chart must map a bar index to the same x pixel.
 *
 * The series is rasterized by WebGL through `computeViewportUniforms`, while
 * the grid, axis labels, indicators, drawings, and crosshair are drawn by
 * Canvas2D with `(index - startIndex + 0.5) / total * plotWidth`. Those two
 * agree only when the GL viewport is clipped to the plot area — the container
 * minus the price-axis gutter. When the GL viewport spanned the whole canvas
 * instead, the newest bars were rasterized underneath the opaque price-axis
 * panel and could not be seen without scrolling the chart right.
 */
describe('plot coordinate space', () => {
  const CONTAINER_WIDTH = 625
  const PRICE_AXIS_WIDTH = 74
  const PLOT_WIDTH = CONTAINER_WIDTH - PRICE_AXIS_WIDTH
  const DPR = 2

  const viewport = { startIndex: 120, endIndex: 319 }
  const total = viewport.endIndex - viewport.startIndex + 1

  /** The Canvas2D convention every axis-space pass uses. */
  const canvas2dX = (index: number): number =>
    ((index - viewport.startIndex + 0.5) / total) * PLOT_WIDTH

  /**
   * The WebGL convention: uniforms produce NDC, the GL viewport maps NDC
   * [-1,1] across its own width. Mirrors `indexToNdcX` in viewport-glsl.ts.
   */
  const webglX = (index: number, viewportPixelWidth: number): number => {
    const uniforms = computeViewportUniforms(
      viewport,
      { min: 90, max: 130 },
      'normal',
      0,
      viewportPixelWidth,
      400,
    )
    const ndcX = index * uniforms.xScale + uniforms.xOffset
    const physicalPx = (ndcX * 0.5 + 0.5) * viewportPixelWidth
    return physicalPx / DPR // back to CSS pixels
  }

  test('WebGL and Canvas2D agree when the GL viewport is the plot area', () => {
    const glViewportWidth = PLOT_WIDTH * DPR

    for (const index of [120, 180, 250, 319]) {
      expect(webglX(index, glViewportWidth)).toBeCloseTo(canvas2dX(index), 6)
    }
  })

  test('the newest visible bar lands inside the plot, not under the axis', () => {
    const lastBarX = webglX(viewport.endIndex, PLOT_WIDTH * DPR)

    expect(lastBarX).toBeLessThan(PLOT_WIDTH)
    expect(lastBarX).toBeLessThan(CONTAINER_WIDTH - PRICE_AXIS_WIDTH)
  })

  test('a full-canvas GL viewport pushes the newest bars under the axis', () => {
    // Regression guard: this is the state the fix removed. Spanning the whole
    // canvas puts the last bar past the axis boundary, where the opaque price
    // panel hides it.
    const lastBarX = webglX(viewport.endIndex, CONTAINER_WIDTH * DPR)

    expect(lastBarX).toBeGreaterThan(PLOT_WIDTH)
  })

  test('indicator presenters share the series coordinate space', () => {
    const bars: Array<ChartBar> = Array.from({ length: 400 }, (_, i) => ({
      ts: 1000 + i * 1000,
      open: 100,
      high: 110,
      low: 90,
      close: 105,
      volume: 10,
    }))
    const values = bars.map((bar) => ({ ts: bar.ts, value: 100 }))

    const points = toLinePoints(
      bars,
      values,
      viewport,
      PLOT_WIDTH,
      () => 0, // y is irrelevant here
    )

    expect(points).toHaveLength(total)
    expect(points[0].x).toBeCloseTo(canvas2dX(viewport.startIndex), 6)
    expect(points[points.length - 1].x).toBeCloseTo(
      canvas2dX(viewport.endIndex),
      6,
    )
    // Nothing an indicator draws may spill into the price-axis gutter.
    for (const point of points) {
      expect(point.x).toBeLessThan(PLOT_WIDTH)
    }
  })

  test('drawings and primitives share the series coordinate space', () => {
    const bars: Array<ChartBar> = Array.from({ length: 400 }, (_, i) => ({
      ts: 1000 + i * 1000,
      open: 100,
      high: 110,
      low: 90,
      close: 105,
      volume: 10,
    }))

    const helpers = createCoordinateHelpers(
      viewport,
      { min: 90, max: 130 },
      PLOT_WIDTH,
      400,
      bars,
      'normal',
    )

    const drawingContext = {
      bars,
      viewport,
      width: PLOT_WIDTH,
      height: 400,
      range: { min: 90, max: 130 },
    }

    for (const index of [120, 250, 319]) {
      expect(helpers.indexToX(index)).toBeCloseTo(canvas2dX(index), 6)
      expect(toXFromTs(bars[index].ts, drawingContext)).toBeCloseTo(
        canvas2dX(index),
        6,
      )
    }
  })
})
