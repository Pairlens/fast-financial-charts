import { findBarIndexByTs } from '../data/binary-search'
import { hitTestArrow } from './hit-test/arrow-hit'

import { hitTestCircle } from './hit-test/circle-hit'
import { hitTestEllipse } from './hit-test/ellipse-hit'
import { hitTestLine } from './hit-test/line-hit'
import { hitTestPath } from './hit-test/path-hit'
import { hitTestRectangle } from './hit-test/rect-hit'
import {
  distanceToInfiniteLine,
  distanceToPoint,
  distanceToRay,
  distanceToRectEdge,
  distanceToSegment,
} from './hit-test/shared'
import { createScaledPath2D, resolvePathData } from './path-shapes'
import { createAbcdPatternDrawing } from './tools/abcd-pattern-tool'
import { createArcDrawing } from './tools/arc-tool'
import { createAnchoredVwapDrawing } from './tools/anchored-vwap-tool'
import { createArrowDrawing } from './tools/arrow-tool'
import { createBrushDrawing } from './tools/brush-tool'
import { createCalloutDrawing } from './tools/callout-tool'
import { createChannelDrawing } from './tools/channel-tool'
import { createCircleDrawing } from './tools/circle-tool'
import { createCrossLineDrawing } from './tools/crossline-tool'
import { createDateRangeDrawing } from './tools/date-range-tool'
import {
  ELLIOTT_WAVE_LABELS,
  createElliottWaveDrawing,
} from './tools/elliott-wave-tool'
import { createEllipseDrawing } from './tools/ellipse-tool'
import { createForecastDrawing } from './tools/forecast-tool'
import {
  DEFAULT_GANN_BOX_LEVELS,
  createGannBoxDrawing,
} from './tools/gann-box-tool'
import { GANN_FAN_LINES, createGannFanDrawing } from './tools/gann-fan-tool'
import { createHighlighterDrawing } from './tools/highlighter-tool'
import {
  DEFAULT_FIB_TIME_ZONE_LEVELS,
  createFibTimeZoneDrawing,
} from './tools/fib-time-zone-tool'
import {
  DEFAULT_FIB_WEDGE_LEVELS,
  createFibWedgeDrawing,
} from './tools/fib-wedge-tool'
import {
  DEFAULT_FIB_CHANNEL_LEVELS,
  createFibChannelDrawing,
} from './tools/fib-channel-tool'
import {
  DEFAULT_FIB_EXTENSION_LEVELS,
  createFibExtensionDrawing,
} from './tools/fib-extension-tool'
import {
  DEFAULT_FIB_LEVELS,
  createFibonacciDrawing,
} from './tools/fibonacci-tool'
import { createHeadShouldersDrawing } from './tools/head-shoulders-tool'
import { createHorizontalLineDrawing } from './tools/hline-tool'
import { createHorizontalRayDrawing } from './tools/hray-tool'
import { createInfoLineDrawing } from './tools/info-line-tool'
import { createLineDrawing } from './tools/line-tool'
import { createLongPositionDrawing } from './tools/long-position-tool'
import { createMeasureDrawing } from './tools/measure-tool'
import { createPathDrawing } from './tools/path-tool'
import { createPitchforkDrawing } from './tools/pitchfork-tool'
import { createPolylineDrawing } from './tools/polyline-tool'
import { createPriceDateRangeDrawing } from './tools/price-date-range-tool'
import { createRayDrawing } from './tools/ray-tool'
import { createRectangleDrawing } from './tools/rectangle-tool'
import { createRotatedRectangleDrawing } from './tools/rotated-rectangle-tool'
import { createShortPositionDrawing } from './tools/short-position-tool'
import { createTextDrawing } from './tools/text-tool'
import { createTrianglePatternDrawing } from './tools/triangle-pattern-tool'
import { createTrendAngleDrawing } from './tools/trend-angle-tool'
import { createVerticalLineDrawing } from './tools/vline-tool'
import { createXabcdPatternDrawing } from './tools/xabcd-pattern-tool'
import { createExtendedLineDrawing } from './tools/xline-tool'
import type {
  ChartBar,
  DrawingCreateContext,
  DrawingHit,
  DrawingHitTestContext,
  DrawingObject,
  DrawingPoint,
  DrawingShapeDefinition,
  DrawingToolType,
  LineStyleType,
} from '../../types'

/** Hit test for ray — distance to the ray from start through end, extending to infinity. */
const hitTestRay = (context: DrawingHitTestContext): DrawingHit | null => {
  const drawing = context.drawing
  if (!('points' in drawing) || !Array.isArray(drawing.points)) return null

  const [start, end] = drawing.points as [DrawingPoint, DrawingPoint]
  const x1 = context.toX(start.ts)
  const y1 = context.toY(start.price)
  const x2 = context.toX(end.ts)
  const y2 = context.toY(end.price)
  const dist = distanceToRay(context.x, context.y, x1, y1, x2, y2)

  if (dist > 6) return null
  return { drawingId: drawing.id, distance: dist }
}

/** Hit test for xline — distance to the infinite line through start and end. */
const hitTestXLine = (context: DrawingHitTestContext): DrawingHit | null => {
  const drawing = context.drawing
  if (!('points' in drawing) || !Array.isArray(drawing.points)) return null

  const [start, end] = drawing.points as [DrawingPoint, DrawingPoint]
  const x1 = context.toX(start.ts)
  const y1 = context.toY(start.price)
  const x2 = context.toX(end.ts)
  const y2 = context.toY(end.price)
  const dist = distanceToInfiniteLine(context.x, context.y, x1, y1, x2, y2)

  if (dist > 6) return null
  return { drawingId: drawing.id, distance: dist }
}

/** Hit test for hline — infinite horizontal line at a fixed price. */
const hitTestHLine = (context: DrawingHitTestContext): DrawingHit | null => {
  const drawing = context.drawing
  if (!('price' in drawing)) return null
  const y = context.toY(drawing.price as number)
  const dist = Math.abs(context.y - y)
  if (dist > 6) return null
  return { drawingId: drawing.id, distance: dist }
}

/** Hit test for vline — infinite vertical line at a fixed timestamp. */
const hitTestVLine = (context: DrawingHitTestContext): DrawingHit | null => {
  const drawing = context.drawing
  if (!('ts' in drawing)) return null
  const x = context.toX(drawing.ts as number)
  const dist = Math.abs(context.x - x)
  if (dist > 6) return null
  return { drawingId: drawing.id, distance: dist }
}

/** Hit test for hray — horizontal ray from (ts, price) extending right. */
const hitTestHRay = (context: DrawingHitTestContext): DrawingHit | null => {
  const drawing = context.drawing
  if (!('ts' in drawing) || !('price' in drawing)) return null
  const originX = context.toX(drawing.ts as number)
  const originY = context.toY(drawing.price as number)
  // Only hit if to the right of the origin point
  if (context.x < originX - 6) return null
  const dist = Math.abs(context.y - originY)
  if (dist > 6) return null
  return { drawingId: drawing.id, distance: dist }
}

/** Hit test for crossline — full-width horizontal + full-height vertical at a point. */
const hitTestCrossLine = (
  context: DrawingHitTestContext,
): DrawingHit | null => {
  const drawing = context.drawing
  if (!('point' in drawing)) return null
  const p = (drawing as { point: DrawingPoint }).point
  const cx = context.toX(p.ts)
  const cy = context.toY(p.price)
  // Distance to nearest axis line (horizontal or vertical)
  const dist = Math.min(Math.abs(context.x - cx), Math.abs(context.y - cy))
  if (dist > 6) return null
  return { drawingId: drawing.id, distance: dist }
}

/** Hit test for text — proximity to the text anchor point. */
const hitTestText = (context: DrawingHitTestContext): DrawingHit | null => {
  const drawing = context.drawing
  if (!('point' in drawing)) return null
  const p = (drawing as { point: DrawingPoint }).point
  const tx = context.toX(p.ts)
  const ty = context.toY(p.price)
  // Use a generous hit area around text (text extends right and above)
  const dx = context.x - tx
  const dy = context.y - ty
  // Text draws from (tx,ty) to the right; allow clicking within ~100px right, ~20px above/below
  if (dx < -6 || dx > 100 || dy < -20 || dy > 10) return null
  const dist = distanceToPoint(context.x, context.y, tx, ty)
  return { drawingId: drawing.id, distance: Math.min(dist, 5) }
}

/** Hit test for fibonacci — distance to any of the horizontal level lines. */
const hitTestFibonacci = (
  context: DrawingHitTestContext,
): DrawingHit | null => {
  const drawing = context.drawing
  if (!('points' in drawing) || !Array.isArray(drawing.points)) return null
  const [start, end] = drawing.points as [DrawingPoint, DrawingPoint]
  const startY = context.toY(start.price)
  const endY = context.toY(end.price)
  const levels =
    (drawing as { levels?: Array<number> }).levels ?? DEFAULT_FIB_LEVELS

  let minDist = Infinity
  for (const level of levels) {
    const y = startY + (endY - startY) * level
    const dist = Math.abs(context.y - y)
    if (dist < minDist) minDist = dist
  }
  if (minDist > 6) return null
  return { drawingId: drawing.id, distance: minDist }
}

/** Hit test for measure / long-position / short-position — rectangle area. */
const hitTestRectArea = (context: DrawingHitTestContext): DrawingHit | null => {
  const drawing = context.drawing
  if (!('points' in drawing) || !Array.isArray(drawing.points)) return null
  const [p1, p2] = drawing.points as [DrawingPoint, DrawingPoint]
  const x1 = context.toX(p1.ts)
  const y1 = context.toY(p1.price)
  const x2 = context.toX(p2.ts)
  const y2 = context.toY(p2.price)

  const minX = Math.min(x1, x2)
  const maxX = Math.max(x1, x2)
  const minY = Math.min(y1, y2)
  const maxY = Math.max(y1, y2)

  const dist = distanceToRectEdge(context.x, context.y, minX, minY, maxX, maxY)
  if (dist > 8) return null
  return { drawingId: drawing.id, distance: dist }
}

/** Hit test for date-range — vertical band between two timestamps. */
const hitTestDateRange = (
  context: DrawingHitTestContext,
): DrawingHit | null => {
  const drawing = context.drawing
  if (!('points' in drawing) || !Array.isArray(drawing.points)) return null
  const [p1, p2] = drawing.points as [DrawingPoint, DrawingPoint]
  const x1 = context.toX(p1.ts)
  const x2 = context.toX(p2.ts)

  const minX = Math.min(x1, x2)
  const maxX = Math.max(x1, x2)

  // Distance to nearest vertical border line
  const distLeft = Math.abs(context.x - minX)
  const distRight = Math.abs(context.x - maxX)
  const dist = Math.min(distLeft, distRight)
  if (dist > 8) return null
  return { drawingId: drawing.id, distance: dist }
}

/** Hit test for channel — two parallel line segments + fill between. */
const hitTestChannel = (context: DrawingHitTestContext): DrawingHit | null => {
  const drawing = context.drawing
  if (
    !('points' in drawing) ||
    !Array.isArray(drawing.points) ||
    drawing.points.length < 3
  )
    return null
  const [p0, p1, p2] = drawing.points as [
    DrawingPoint,
    DrawingPoint,
    DrawingPoint,
  ]
  const x0 = context.toX(p0.ts)
  const y0 = context.toY(p0.price)
  const x1 = context.toX(p1.ts)
  const y1 = context.toY(p1.price)
  const x2 = context.toX(p2.ts)
  const y2 = context.toY(p2.price)

  const offsetX = x2 - x0
  const offsetY = y2 - y0

  // Distance to baseline (p0→p1)
  const d1 = distanceToSegment(context.x, context.y, x0, y0, x1, y1)
  // Distance to parallel line
  const d2 = distanceToSegment(
    context.x,
    context.y,
    x0 + offsetX,
    y0 + offsetY,
    x1 + offsetX,
    y1 + offsetY,
  )

  const dist = Math.min(d1, d2)
  if (dist > 6) return null
  return { drawingId: drawing.id, distance: dist }
}

/** Hit test for pitchfork — median + two parallel rays. */
const hitTestPitchfork = (
  context: DrawingHitTestContext,
): DrawingHit | null => {
  const drawing = context.drawing
  if (
    !('points' in drawing) ||
    !Array.isArray(drawing.points) ||
    drawing.points.length < 3
  )
    return null
  const [pivot, left, right] = drawing.points as [
    DrawingPoint,
    DrawingPoint,
    DrawingPoint,
  ]
  const px = context.toX(pivot.ts)
  const py = context.toY(pivot.price)
  const lx = context.toX(left.ts)
  const ly = context.toY(left.price)
  const rx = context.toX(right.ts)
  const ry = context.toY(right.price)

  const midX = (lx + rx) / 2
  const midY = (ly + ry) / 2

  // Distance to median ray (pivot → midpoint, extending to infinity)
  const d1 = distanceToRay(context.x, context.y, px, py, midX, midY)
  // Distance to upper parallel ray (through left point, same direction)
  const d2 = distanceToRay(
    context.x,
    context.y,
    lx,
    ly,
    lx + (midX - px),
    ly + (midY - py),
  )
  // Distance to lower parallel ray (through right point, same direction)
  const d3 = distanceToRay(
    context.x,
    context.y,
    rx,
    ry,
    rx + (midX - px),
    ry + (midY - py),
  )
  // Distance to baseline (left→right)
  const d4 = distanceToSegment(context.x, context.y, lx, ly, rx, ry)

  const dist = Math.min(d1, d2, d3, d4)
  if (dist > 6) return null
  return { drawingId: drawing.id, distance: dist }
}

/** Hit test for fib-extension — horizontal level lines projected from point C. */
const hitTestFibExtension = (
  context: DrawingHitTestContext,
): DrawingHit | null => {
  const drawing = context.drawing
  if (
    !('points' in drawing) ||
    !Array.isArray(drawing.points) ||
    drawing.points.length < 3
  )
    return null
  const [pA, pB, pC] = drawing.points as [
    DrawingPoint,
    DrawingPoint,
    DrawingPoint,
  ]
  const levels =
    (drawing as { levels?: Array<number> }).levels ??
    DEFAULT_FIB_EXTENSION_LEVELS
  const range = pB.price - pA.price

  let minDist = Infinity
  for (const level of levels) {
    const price = pC.price + range * level
    const y = context.toY(price)
    const dist = Math.abs(context.y - y)
    if (dist < minDist) minDist = dist
  }

  // Also check distance to the A→B→C connecting segments
  const dAB = distanceToSegment(
    context.x,
    context.y,
    context.toX(pA.ts),
    context.toY(pA.price),
    context.toX(pB.ts),
    context.toY(pB.price),
  )
  const dBC = distanceToSegment(
    context.x,
    context.y,
    context.toX(pB.ts),
    context.toY(pB.price),
    context.toX(pC.ts),
    context.toY(pC.price),
  )
  minDist = Math.min(minDist, dAB, dBC)

  if (minDist > 6) return null
  return { drawingId: drawing.id, distance: minDist }
}

/** Hit test for fib-channel — parallel lines at fib-ratio offsets from baseline. */
const hitTestFibChannel = (
  context: DrawingHitTestContext,
): DrawingHit | null => {
  const drawing = context.drawing
  if (
    !('points' in drawing) ||
    !Array.isArray(drawing.points) ||
    drawing.points.length < 3
  )
    return null
  const [p0, p1, p2] = drawing.points as [
    DrawingPoint,
    DrawingPoint,
    DrawingPoint,
  ]
  const x0 = context.toX(p0.ts)
  const y0 = context.toY(p0.price)
  const x1 = context.toX(p1.ts)
  const y1 = context.toY(p1.price)
  const x2 = context.toX(p2.ts)
  const y2 = context.toY(p2.price)

  const offsetX = x2 - x0
  const offsetY = y2 - y0
  const levels =
    (drawing as { levels?: Array<number> }).levels ?? DEFAULT_FIB_CHANNEL_LEVELS

  let minDist = Infinity
  for (const level of levels) {
    const ox = offsetX * level
    const oy = offsetY * level
    const dist = distanceToSegment(
      context.x,
      context.y,
      x0 + ox,
      y0 + oy,
      x1 + ox,
      y1 + oy,
    )
    if (dist < minDist) minDist = dist
  }

  if (minDist > 6) return null
  return { drawingId: drawing.id, distance: minDist }
}

/** Hit test for polyline — distance to nearest segment in the chain. */
const hitTestPolyline = (context: DrawingHitTestContext): DrawingHit | null => {
  const drawing = context.drawing
  if (
    !('points' in drawing) ||
    !Array.isArray(drawing.points) ||
    drawing.points.length < 2
  )
    return null
  const pts = drawing.points as Array<DrawingPoint>

  let minDist = Infinity
  for (let i = 0; i < pts.length - 1; i++) {
    const x1 = context.toX(pts[i].ts)
    const y1 = context.toY(pts[i].price)
    const x2 = context.toX(pts[i + 1].ts)
    const y2 = context.toY(pts[i + 1].price)
    const dist = distanceToSegment(context.x, context.y, x1, y1, x2, y2)
    if (dist < minDist) minDist = dist
  }

  if (minDist > 6) return null
  return { drawingId: drawing.id, distance: minDist }
}

/** Hit test for triangle-pattern — distance to any of the 3 edges. */
const hitTestTrianglePattern = (
  context: DrawingHitTestContext,
): DrawingHit | null => {
  const drawing = context.drawing
  if (
    !('points' in drawing) ||
    !Array.isArray(drawing.points) ||
    drawing.points.length < 3
  )
    return null
  const [a, b, c] = drawing.points as [DrawingPoint, DrawingPoint, DrawingPoint]
  const ax = context.toX(a.ts),
    ay = context.toY(a.price)
  const bx = context.toX(b.ts),
    by = context.toY(b.price)
  const cx = context.toX(c.ts),
    cy = context.toY(c.price)

  const d1 = distanceToSegment(context.x, context.y, ax, ay, bx, by)
  const d2 = distanceToSegment(context.x, context.y, bx, by, cx, cy)
  const d3 = distanceToSegment(context.x, context.y, cx, cy, ax, ay)
  const dist = Math.min(d1, d2, d3)
  if (dist > 6) return null
  return { drawingId: drawing.id, distance: dist }
}

/** Hit test for VWAP — distance to anchor point (the computation line is dynamic). */
const hitTestAnchoredVwap = (
  context: DrawingHitTestContext,
): DrawingHit | null => {
  const drawing = context.drawing
  if (!('point' in drawing)) return null
  const p = (drawing as { point: DrawingPoint }).point
  const tx = context.toX(p.ts)
  const ty = context.toY(p.price)
  // Check if near the anchor point or near the VWAP horizontal level
  const dist = distanceToPoint(context.x, context.y, tx, ty)
  if (dist > 20) return null
  return { drawingId: drawing.id, distance: Math.min(dist, 5) }
}

/** Hit test for arc — sample points along the quadratic bezier and find nearest. */
const hitTestArc = (context: DrawingHitTestContext): DrawingHit | null => {
  const drawing = context.drawing
  if (
    !('points' in drawing) ||
    !Array.isArray(drawing.points) ||
    drawing.points.length < 3
  )
    return null
  const [p0, p1, p2] = drawing.points as [
    DrawingPoint,
    DrawingPoint,
    DrawingPoint,
  ]
  const x0 = context.toX(p0.ts),
    y0 = context.toY(p0.price)
  const x1 = context.toX(p1.ts),
    y1 = context.toY(p1.price)
  const x2 = context.toX(p2.ts),
    y2 = context.toY(p2.price)

  // Sample ~20 points along the quadratic bezier and find nearest
  let minDist = Infinity
  const steps = 20
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const mt = 1 - t
    const bx = mt * mt * x0 + 2 * mt * t * x1 + t * t * x2
    const by = mt * mt * y0 + 2 * mt * t * y1 + t * t * y2
    const dist = Math.hypot(context.x - bx, context.y - by)
    if (dist < minDist) minDist = dist
  }

  if (minDist > 6) return null
  return { drawingId: drawing.id, distance: minDist }
}

/** Hit test for rotated rectangle — distance to any of the 4 edges. */
const hitTestRotatedRectangle = (
  context: DrawingHitTestContext,
): DrawingHit | null => {
  const drawing = context.drawing
  if (
    !('points' in drawing) ||
    !Array.isArray(drawing.points) ||
    drawing.points.length < 3
  )
    return null
  const [p0, p1, p2] = drawing.points as [
    DrawingPoint,
    DrawingPoint,
    DrawingPoint,
  ]
  const x0 = context.toX(p0.ts),
    y0 = context.toY(p0.price)
  const x1 = context.toX(p1.ts),
    y1 = context.toY(p1.price)
  const x2 = context.toX(p2.ts),
    y2 = context.toY(p2.price)

  // p0→p1 is one edge, p2 defines the perpendicular width
  // Project p2 onto the perpendicular of p0→p1 to get the offset
  const edgeDx = x1 - x0
  const edgeDy = y1 - y0
  const edgeLen = Math.hypot(edgeDx, edgeDy)
  if (edgeLen < 0.5) return null

  // Perpendicular direction (normalized)
  const perpX = -edgeDy / edgeLen
  const perpY = edgeDx / edgeLen

  // Project p2-p0 onto perpendicular to get width
  const projDist = (x2 - x0) * perpX + (y2 - y0) * perpY

  // Four corners of the rotated rectangle
  const c0x = x0,
    c0y = y0
  const c1x = x1,
    c1y = y1
  const c2x = x1 + perpX * projDist,
    c2y = y1 + perpY * projDist
  const c3x = x0 + perpX * projDist,
    c3y = y0 + perpY * projDist

  const d1 = distanceToSegment(context.x, context.y, c0x, c0y, c1x, c1y)
  const d2 = distanceToSegment(context.x, context.y, c1x, c1y, c2x, c2y)
  const d3 = distanceToSegment(context.x, context.y, c2x, c2y, c3x, c3y)
  const d4 = distanceToSegment(context.x, context.y, c3x, c3y, c0x, c0y)

  const dist = Math.min(d1, d2, d3, d4)
  if (dist > 6) return null
  return { drawingId: drawing.id, distance: dist }
}

/** Hit test for gann-fan — distance to any of the fan rays from point A. */
const hitTestGannFan = (context: DrawingHitTestContext): DrawingHit | null => {
  const drawing = context.drawing
  if (!('points' in drawing) || !Array.isArray(drawing.points)) return null
  const [a, b] = drawing.points as [DrawingPoint, DrawingPoint]
  const ax = context.toX(a.ts)
  const ay = context.toY(a.price)
  const bx = context.toX(b.ts)
  const by = context.toY(b.price)
  const dx = bx - ax
  const dy = by - ay
  if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return null

  let minDist = Infinity
  for (const line of GANN_FAN_LINES) {
    const ry = dy * line.ratio
    if (Math.abs(dx) < 0.5 && Math.abs(ry) < 0.5) continue
    const dist = distanceToRay(context.x, context.y, ax, ay, ax + dx, ay + ry)
    if (dist < minDist) minDist = dist
  }
  if (minDist > 6) return null
  return { drawingId: drawing.id, distance: minDist }
}

/** Hit test for gann-box — box edges plus internal division lines. */
const hitTestGannBox = (context: DrawingHitTestContext): DrawingHit | null => {
  const drawing = context.drawing
  if (!('points' in drawing) || !Array.isArray(drawing.points)) return null
  const [p1, p2] = drawing.points as [DrawingPoint, DrawingPoint]
  const x1 = context.toX(p1.ts)
  const y1 = context.toY(p1.price)
  const x2 = context.toX(p2.ts)
  const y2 = context.toY(p2.price)
  const minX = Math.min(x1, x2)
  const maxX = Math.max(x1, x2)
  const minY = Math.min(y1, y2)
  const maxY = Math.max(y1, y2)

  let minDist = distanceToRectEdge(context.x, context.y, minX, minY, maxX, maxY)
  const levels =
    (drawing as { levels?: Array<number> }).levels ?? DEFAULT_GANN_BOX_LEVELS
  const insideX = context.x >= minX - 6 && context.x <= maxX + 6
  const insideY = context.y >= minY - 6 && context.y <= maxY + 6
  for (const level of levels) {
    if (insideX) {
      const dist = Math.abs(context.y - (minY + (maxY - minY) * level))
      if (dist < minDist) minDist = dist
    }
    if (insideY) {
      const dist = Math.abs(context.x - (minX + (maxX - minX) * level))
      if (dist < minDist) minDist = dist
    }
  }
  if (minDist > 6) return null
  return { drawingId: drawing.id, distance: minDist }
}

/** Hit test for fib-time-zone — vertical lines at fib counts of the A→B span. */
const hitTestFibTimeZone = (
  context: DrawingHitTestContext,
): DrawingHit | null => {
  const drawing = context.drawing
  if (!('points' in drawing) || !Array.isArray(drawing.points)) return null
  const [a, b] = drawing.points as [DrawingPoint, DrawingPoint]
  const ax = context.toX(a.ts)
  const bx = context.toX(b.ts)
  const span = bx - ax

  let minDist = Math.abs(context.x - ax)
  if (Math.abs(span) >= 0.5) {
    const levels =
      (drawing as { levels?: Array<number> }).levels ??
      DEFAULT_FIB_TIME_ZONE_LEVELS
    for (const count of levels) {
      const dist = Math.abs(context.x - (ax + span * count))
      if (dist < minDist) minDist = dist
    }
  }
  if (minDist > 6) return null
  return { drawingId: drawing.id, distance: minDist }
}

/** Hit test for fib-wedge — the two edges plus sampled points along each arc. */
const hitTestFibWedge = (context: DrawingHitTestContext): DrawingHit | null => {
  const drawing = context.drawing
  if (
    !('points' in drawing) ||
    !Array.isArray(drawing.points) ||
    drawing.points.length < 3
  )
    return null
  const [apex, e1, e2] = drawing.points as [
    DrawingPoint,
    DrawingPoint,
    DrawingPoint,
  ]
  const ax = context.toX(apex.ts)
  const ay = context.toY(apex.price)
  const x1 = context.toX(e1.ts)
  const y1 = context.toY(e1.price)
  const x2 = context.toX(e2.ts)
  const y2 = context.toY(e2.price)

  let minDist = Math.min(
    distanceToSegment(context.x, context.y, ax, ay, x1, y1),
    distanceToSegment(context.x, context.y, ax, ay, x2, y2),
  )

  const baseRadius = Math.max(
    Math.hypot(x1 - ax, y1 - ay),
    Math.hypot(x2 - ax, y2 - ay),
  )
  if (baseRadius >= 0.5) {
    const angle1 = Math.atan2(y1 - ay, x1 - ax)
    const angle2 = Math.atan2(y2 - ay, x2 - ax)
    let sweep = angle2 - angle1
    if (sweep > Math.PI) sweep -= Math.PI * 2
    if (sweep < -Math.PI) sweep += Math.PI * 2
    const levels =
      (drawing as { levels?: Array<number> }).levels ?? DEFAULT_FIB_WEDGE_LEVELS
    const steps = 12
    for (const level of levels) {
      const r = baseRadius * level
      for (let i = 0; i <= steps; i++) {
        const angle = angle1 + (sweep * i) / steps
        const px = ax + Math.cos(angle) * r
        const py = ay + Math.sin(angle) * r
        const dist = Math.hypot(context.x - px, context.y - py)
        if (dist < minDist) minDist = dist
      }
    }
  }
  if (minDist > 6) return null
  return { drawingId: drawing.id, distance: minDist }
}

/** Convert hex color + opacity to rgba string. Results are cached to avoid regex/parseInt per frame. */
const hexToRgbaCache = new Map<string, string>()
const hexToRgba = (hex: string, opacity: number): string => {
  const key = `${hex}|${opacity}`
  let result = hexToRgbaCache.get(key)
  if (result !== undefined) return result
  const match = hex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
  if (!match) {
    result = `rgba(0,0,0,${opacity})`
  } else {
    const r = parseInt(match[1], 16)
    const g = parseInt(match[2], 16)
    const b = parseInt(match[3], 16)
    result = `rgba(${r}, ${g}, ${b}, ${opacity})`
  }
  hexToRgbaCache.set(key, result)
  return result
}

/** Apply lineStyle (solid/dashed/dotted) to the context. */
const applyLineStyle = (
  ctx: CanvasRenderingContext2D,
  style: LineStyleType | undefined,
): void => {
  switch (style) {
    case 'dashed':
      ctx.setLineDash([8, 4])
      break
    case 'dotted':
      ctx.setLineDash([2, 3])
      break
    default:
      ctx.setLineDash([])
  }
}

/** Get the fill color for a drawing, respecting fillColor/fillOpacity overrides. */
const getDrawingFill = (drawing: DrawingObject): string => {
  const color = drawing.fillColor ?? drawing.color
  const opacity = drawing.fillOpacity ?? 0.13
  return hexToRgba(color, opacity)
}

/** Format a millisecond duration as a compact human label (e.g. "3d 4h"). */
const formatDuration = (ms: number): string => {
  const minutes = Math.round(ms / 60_000)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    const remMinutes = minutes % 60
    return remMinutes > 0 ? `${hours}h ${remMinutes}m` : `${hours}h`
  }
  const days = Math.floor(hours / 24)
  const remHours = hours % 24
  return remHours > 0 ? `${days}d ${remHours}h` : `${days}d`
}

const renderMeasurementLabel = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  startPrice: number,
  endPrice: number,
  color: string,
): void => {
  const delta = endPrice - startPrice
  const pct = startPrice !== 0 ? (delta / startPrice) * 100 : 0
  const sign = delta >= 0 ? '+' : ''
  const label = `${sign}${delta.toFixed(2)} (${sign}${pct.toFixed(1)}%)`

  ctx.font = '10px monospace'
  ctx.fillStyle = color
  ctx.textAlign = 'left'
  ctx.fillText(label, x + 6, y - 4)
}

const renderDrawing = ({
  ctx,
  drawing,
  bars,
  toX,
  toY,
}: {
  ctx: CanvasRenderingContext2D
  drawing: DrawingObject
  bars: Array<ChartBar>
  toX: (ts: number) => number
  toY: (price: number) => number
}): void => {
  if (!drawing.visible) {
    return
  }

  ctx.save()
  ctx.strokeStyle = drawing.color
  ctx.lineWidth = drawing.lineWidth
  applyLineStyle(ctx, drawing.lineStyle)

  switch (drawing.type) {
    case 'line': {
      const [start, end] = drawing.points
      const sx = toX(start.ts)
      const sy = toY(start.price)
      const ex = toX(end.ts)
      const ey = toY(end.price)

      const extend = drawing.extend ?? 'none'
      if (extend === 'none') {
        ctx.beginPath()
        ctx.moveTo(sx, sy)
        ctx.lineTo(ex, ey)
        ctx.stroke()
      } else {
        // Extend line to canvas edges
        const dx = ex - sx
        const dy = ey - sy
        const len = Math.hypot(dx, dy)
        if (len < 0.5) break
        const ux = dx / len
        const uy = dy / len
        const extLen = Math.max(ctx.canvas.width, ctx.canvas.height) * 2

        ctx.beginPath()
        if (extend === 'left' || extend === 'both') {
          ctx.moveTo(sx - ux * extLen, sy - uy * extLen)
        } else {
          ctx.moveTo(sx, sy)
        }
        if (extend === 'right' || extend === 'both') {
          ctx.lineTo(ex + ux * extLen, ey + uy * extLen)
        } else {
          ctx.lineTo(ex, ey)
        }
        ctx.stroke()
      }
      break
    }
    case 'arrow': {
      const [start, end] = drawing.points
      const sx = toX(start.ts)
      const sy = toY(start.price)
      const ex = toX(end.ts)
      const ey = toY(end.price)

      // Line
      ctx.beginPath()
      ctx.moveTo(sx, sy)
      ctx.lineTo(ex, ey)
      ctx.stroke()

      // Arrowhead at endpoint
      const dx = ex - sx
      const dy = ey - sy
      const len = Math.hypot(dx, dy)
      if (len > 2) {
        const headLen = 10
        const angle = Math.atan2(dy, dx)
        ctx.beginPath()
        ctx.moveTo(ex, ey)
        ctx.lineTo(
          ex - headLen * Math.cos(angle - Math.PI / 6),
          ey - headLen * Math.sin(angle - Math.PI / 6),
        )
        ctx.lineTo(
          ex - headLen * Math.cos(angle + Math.PI / 6),
          ey - headLen * Math.sin(angle + Math.PI / 6),
        )
        ctx.closePath()
        ctx.fillStyle = drawing.color
        ctx.fill()
      }
      break
    }
    case 'ray': {
      const [start, end] = drawing.points
      const sx = toX(start.ts)
      const sy = toY(start.price)
      const ex = toX(end.ts)
      const ey = toY(end.price)

      const dx = ex - sx
      const dy = ey - sy
      const len = Math.hypot(dx, dy)
      if (len < 0.5) break
      const ux = dx / len
      const uy = dy / len
      const extLen = Math.max(ctx.canvas.width, ctx.canvas.height) * 2

      ctx.beginPath()
      ctx.moveTo(sx, sy)
      ctx.lineTo(ex + ux * extLen, ey + uy * extLen)
      ctx.stroke()
      break
    }
    case 'xline': {
      const [start, end] = drawing.points
      const sx = toX(start.ts)
      const sy = toY(start.price)
      const ex = toX(end.ts)
      const ey = toY(end.price)

      const dx = ex - sx
      const dy = ey - sy
      const len = Math.hypot(dx, dy)
      if (len < 0.5) break
      const ux = dx / len
      const uy = dy / len
      const extLen = Math.max(ctx.canvas.width, ctx.canvas.height) * 2

      ctx.beginPath()
      ctx.moveTo(sx - ux * extLen, sy - uy * extLen)
      ctx.lineTo(ex + ux * extLen, ey + uy * extLen)
      ctx.stroke()
      break
    }
    case 'rectangle': {
      const [start, end] = drawing.points
      const x = Math.min(toX(start.ts), toX(end.ts))
      const y = Math.min(toY(start.price), toY(end.price))
      const width = Math.abs(toX(end.ts) - toX(start.ts))
      const height = Math.abs(toY(end.price) - toY(start.price))
      ctx.strokeRect(x, y, width, height)
      ctx.fillStyle = getDrawingFill(drawing)
      ctx.fillRect(x, y, width, height)
      // Measurement label
      renderMeasurementLabel(
        ctx,
        x + width,
        y,
        start.price,
        end.price,
        drawing.color,
      )
      break
    }
    case 'circle': {
      const [center, edge] = drawing.points
      const cx = toX(center.ts)
      const cy = toY(center.price)
      const edgeX = toX(edge.ts)
      const edgeY = toY(edge.price)
      const radius = Math.max(2, Math.hypot(edgeX - cx, edgeY - cy))
      ctx.beginPath()
      ctx.arc(cx, cy, radius, 0, Math.PI * 2)
      ctx.stroke()
      break
    }
    case 'ellipse': {
      const [start, end] = drawing.points
      const x1 = toX(start.ts)
      const y1 = toY(start.price)
      const x2 = toX(end.ts)
      const y2 = toY(end.price)
      const ecx = (x1 + x2) / 2
      const ecy = (y1 + y2) / 2
      const erx = Math.abs(x2 - x1) / 2
      const ery = Math.abs(y2 - y1) / 2

      if (erx > 0 && ery > 0) {
        ctx.beginPath()
        ctx.ellipse(ecx, ecy, erx, ery, 0, 0, Math.PI * 2)
        ctx.stroke()
        ctx.fillStyle = getDrawingFill(drawing)
        ctx.fill()
      }
      break
    }
    case 'path': {
      const shapeDef = resolvePathData(drawing.preset, drawing.pathData)
      if (!shapeDef) break

      const [start, end] = drawing.points
      const px1 = toX(start.ts)
      const py1 = toY(start.price)
      const px2 = toX(end.ts)
      const py2 = toY(end.price)
      const px = Math.min(px1, px2)
      const py = Math.min(py1, py2)
      const pw = Math.abs(px2 - px1)
      const ph = Math.abs(py2 - py1)

      if (pw > 1 && ph > 1) {
        const path = createScaledPath2D(shapeDef.d, px, py, pw, ph)
        const isFilled = drawing.fill ?? shapeDef.defaultFill

        if (isFilled) {
          ctx.fillStyle = getDrawingFill(drawing)
          ctx.fill(path)
        }
        ctx.stroke(path)
      }
      break
    }
    case 'hline': {
      const y = toY(drawing.price)
      // The drawings canvas is device-pixel-scaled; divide out the transform
      // to get the coordinate-space right edge (the visible plot edge).
      const scaleX = ctx.getTransform().a || 1
      const w = ctx.canvas.width / scaleX
      // Dashed "level" line (unless the caller asked for an explicit style).
      ctx.save()
      if (!drawing.lineStyle || drawing.lineStyle === 'solid') {
        ctx.setLineDash([7, 5])
      }
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
      ctx.stroke()

      // Right-edge price pill — the "well-defined TP/SL" look: a filled,
      // color-tinted tag at the axis showing the level's price.
      const p = drawing.price
      const label =
        Math.abs(p) >= 1
          ? p.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
          : p.toLocaleString('en-US', {
              minimumFractionDigits: 4,
              maximumFractionDigits: 6,
            })
      ctx.setLineDash([])
      ctx.font = '600 11px "JetBrains Mono Variable", ui-monospace, monospace'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      const padX = 7
      const padY = 4
      const tw = ctx.measureText(label).width
      const pillW = tw + padX * 2
      const pillH = 11 + padY * 2
      const pillX = Math.max(0, w - pillW - 8)
      const pillY = y - pillH / 2
      ctx.fillStyle = drawing.color
      ctx.beginPath()
      ctx.roundRect(pillX, pillY, pillW, pillH, 5)
      ctx.fill()
      // Dark ink reads cleanly on the light green/red/iris level colors.
      ctx.fillStyle = 'rgba(12, 10, 8, 0.92)'
      ctx.fillText(label, pillX + padX, y + 0.5)
      ctx.textBaseline = 'alphabetic'
      ctx.restore()
      break
    }
    case 'vline': {
      const x = toX(drawing.ts)
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, ctx.canvas.height)
      ctx.stroke()
      break
    }
    case 'fibonacci': {
      const [start, end] = drawing.points
      const startY = toY(start.price)
      const endY = toY(end.price)
      const startX = toX(start.ts)
      const endX = toX(end.ts)
      const levels = drawing.levels ?? DEFAULT_FIB_LEVELS

      const canvasWidth = ctx.canvas.width

      for (const level of levels) {
        const y = startY + (endY - startY) * level
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(canvasWidth, y)
        ctx.stroke()

        // Level label
        ctx.fillStyle = drawing.color
        ctx.font = '10px monospace'
        ctx.textAlign = 'left'
        const price = start.price + (end.price - start.price) * level
        ctx.fillText(
          `${(level * 100).toFixed(1)}% (${price.toFixed(2)})`,
          Math.min(startX, endX) + 4,
          y - 3,
        )
      }

      // Vertical range indicator
      ctx.setLineDash([3, 3])
      ctx.beginPath()
      ctx.moveTo(startX, startY)
      ctx.lineTo(startX, endY)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(endX, startY)
      ctx.lineTo(endX, endY)
      ctx.stroke()
      ctx.setLineDash([])
      break
    }
    case 'text': {
      const x = toX(drawing.point.ts)
      const y = toY(drawing.point.price)
      ctx.fillStyle = drawing.color
      ctx.font = `${drawing.fontSize ?? 12}px sans-serif`
      ctx.textAlign = 'left'
      ctx.fillText(drawing.content, x, y)
      break
    }
    case 'measure': {
      const [p1, p2] = drawing.points
      const x1 = toX(p1.ts)
      const y1 = toY(p1.price)
      const x2 = toX(p2.ts)
      const y2 = toY(p2.price)

      // Rectangle spanning price/time range
      const rx = Math.min(x1, x2)
      const ry = Math.min(y1, y2)
      const rw = Math.abs(x2 - x1)
      const rh = Math.abs(y2 - y1)

      const delta = p2.price - p1.price
      const isPositive = delta >= 0
      const tint = isPositive ? '34, 197, 94' : '239, 68, 68'

      // Filled rectangle
      ctx.fillStyle = `rgba(${tint}, 0.08)`
      ctx.fillRect(rx, ry, rw, rh)

      // Dashed border
      ctx.setLineDash([4, 4])
      ctx.strokeStyle = `rgba(${tint}, 0.5)`
      ctx.strokeRect(rx, ry, rw, rh)
      ctx.setLineDash([])

      // Compute metrics
      const pct = p1.price !== 0 ? (delta / p1.price) * 100 : 0
      const sign = delta >= 0 ? '+' : ''
      const idx1 = findBarIndexByTs(bars, p1.ts)
      const idx2 = findBarIndexByTs(bars, p2.ts)
      const barCount = Math.abs(idx2 - idx1)
      const label = `${sign}${delta.toFixed(2)} (${sign}${pct.toFixed(1)}%) · ${barCount} bars`

      // Pill at center of rectangle
      const mx = rx + rw / 2
      const my = ry + rh / 2
      ctx.font = '11px monospace'
      const textMetrics = ctx.measureText(label)
      const padX = 8
      const padY = 5
      const pillW = textMetrics.width + padX * 2
      const pillH = 16 + padY * 2
      const pillX = mx - pillW / 2
      const pillY = my - pillH / 2

      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
      ctx.beginPath()
      ctx.roundRect(pillX, pillY, pillW, pillH, 4)
      ctx.fill()

      ctx.fillStyle = isPositive ? '#22c55e' : '#ef4444'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(label, mx, my)
      ctx.textBaseline = 'alphabetic'
      break
    }
    case 'hray': {
      const y = toY(drawing.price)
      const startX = toX(drawing.ts)
      ctx.beginPath()
      ctx.moveTo(startX, y)
      ctx.lineTo(ctx.canvas.width, y)
      ctx.stroke()
      break
    }
    case 'crossline': {
      const cx = toX(drawing.point.ts)
      const cy = toY(drawing.point.price)
      ctx.beginPath()
      ctx.moveTo(0, cy)
      ctx.lineTo(ctx.canvas.width, cy)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(cx, 0)
      ctx.lineTo(cx, ctx.canvas.height)
      ctx.stroke()
      break
    }
    case 'info-line': {
      const [start, end] = drawing.points
      const sx = toX(start.ts)
      const sy = toY(start.price)
      const ex = toX(end.ts)
      const ey = toY(end.price)

      // Line
      ctx.beginPath()
      ctx.moveTo(sx, sy)
      ctx.lineTo(ex, ey)
      ctx.stroke()

      // Stats label
      const delta = end.price - start.price
      const pct = start.price !== 0 ? (delta / start.price) * 100 : 0
      const sign = delta >= 0 ? '+' : ''
      const idx1 = findBarIndexByTs(bars, start.ts)
      const idx2 = findBarIndexByTs(bars, end.ts)
      const barCount = Math.abs(idx2 - idx1)
      const label = `${sign}${delta.toFixed(2)} (${sign}${pct.toFixed(1)}%) · ${barCount} bars`

      const mx = (sx + ex) / 2
      const my = (sy + ey) / 2
      ctx.font = '10px monospace'
      const tm = ctx.measureText(label)
      const padX = 6
      const padY = 4
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)'
      ctx.beginPath()
      ctx.roundRect(
        mx - tm.width / 2 - padX,
        my - 8 - padY,
        tm.width + padX * 2,
        16 + padY * 2,
        3,
      )
      ctx.fill()

      ctx.fillStyle = drawing.color
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(label, mx, my)
      ctx.textBaseline = 'alphabetic'
      break
    }
    case 'trend-angle': {
      const [start, end] = drawing.points
      const sx = toX(start.ts)
      const sy = toY(start.price)
      const ex = toX(end.ts)
      const ey = toY(end.price)

      // Line
      ctx.beginPath()
      ctx.moveTo(sx, sy)
      ctx.lineTo(ex, ey)
      ctx.stroke()

      // Angle label (angle from horizontal)
      const dx = ex - sx
      const dy = ey - sy
      const angleDeg = Math.atan2(-dy, dx) * (180 / Math.PI)
      const label = `${angleDeg.toFixed(1)}°`

      ctx.font = '10px monospace'
      ctx.fillStyle = drawing.color
      ctx.textAlign = 'left'
      ctx.fillText(label, sx + 8, sy - 8)

      // Small arc indicator
      const arcRadius = Math.min(20, Math.hypot(dx, dy) * 0.3)
      if (arcRadius > 5) {
        ctx.beginPath()
        const startAngle = 0
        const endAngle = Math.atan2(-dy, dx)
        ctx.arc(sx, sy, arcRadius, -startAngle, -endAngle, dy > 0)
        ctx.stroke()
      }
      break
    }
    case 'long-position': {
      const [entry, target] = drawing.points
      const entryY = toY(entry.price)
      const targetY = toY(target.price)
      const left = toX(Math.min(entry.ts, target.ts))
      const right = toX(Math.max(entry.ts, target.ts))
      const width = Math.max(right - left, 80)

      const isProfit = target.price > entry.price

      // Target zone (green if profit, red if loss)
      ctx.fillStyle = isProfit
        ? 'rgba(34, 197, 94, 0.12)'
        : 'rgba(239, 68, 68, 0.12)'
      ctx.fillRect(
        left,
        Math.min(entryY, targetY),
        width,
        Math.abs(targetY - entryY),
      )

      // Entry line
      ctx.strokeStyle = '#8b8b8b'
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.moveTo(left, entryY)
      ctx.lineTo(left + width, entryY)
      ctx.stroke()
      ctx.setLineDash([])

      // Target line
      ctx.strokeStyle = isProfit ? '#22c55e' : '#ef4444'
      ctx.beginPath()
      ctx.moveTo(left, targetY)
      ctx.lineTo(left + width, targetY)
      ctx.stroke()

      // P&L label
      const delta = target.price - entry.price
      const pct = entry.price !== 0 ? (delta / entry.price) * 100 : 0
      const sign = delta >= 0 ? '+' : ''
      const label = `Long ${sign}${pct.toFixed(2)}%`
      ctx.font = '11px monospace'
      ctx.fillStyle = isProfit ? '#22c55e' : '#ef4444'
      ctx.textAlign = 'left'
      ctx.fillText(label, left + 4, Math.min(entryY, targetY) - 4)
      break
    }
    case 'short-position': {
      const [entry, target] = drawing.points
      const entryY = toY(entry.price)
      const targetY = toY(target.price)
      const left = toX(Math.min(entry.ts, target.ts))
      const right = toX(Math.max(entry.ts, target.ts))
      const width = Math.max(right - left, 80)

      const isProfit = target.price < entry.price

      // Target zone
      ctx.fillStyle = isProfit
        ? 'rgba(34, 197, 94, 0.12)'
        : 'rgba(239, 68, 68, 0.12)'
      ctx.fillRect(
        left,
        Math.min(entryY, targetY),
        width,
        Math.abs(targetY - entryY),
      )

      // Entry line
      ctx.strokeStyle = '#8b8b8b'
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.moveTo(left, entryY)
      ctx.lineTo(left + width, entryY)
      ctx.stroke()
      ctx.setLineDash([])

      // Target line
      ctx.strokeStyle = isProfit ? '#22c55e' : '#ef4444'
      ctx.beginPath()
      ctx.moveTo(left, targetY)
      ctx.lineTo(left + width, targetY)
      ctx.stroke()

      // P&L label
      const delta = entry.price - target.price
      const pct = entry.price !== 0 ? (delta / entry.price) * 100 : 0
      const sign = delta >= 0 ? '+' : ''
      const label = `Short ${sign}${pct.toFixed(2)}%`
      ctx.font = '11px monospace'
      ctx.fillStyle = isProfit ? '#22c55e' : '#ef4444'
      ctx.textAlign = 'left'
      ctx.fillText(label, left + 4, Math.min(entryY, targetY) - 4)
      break
    }
    case 'date-range': {
      const [p1, p2] = drawing.points
      const x1 = toX(p1.ts)
      const x2 = toX(p2.ts)
      const rx = Math.min(x1, x2)
      const rw = Math.abs(x2 - x1)

      // Vertical band
      ctx.fillStyle = 'rgba(139, 139, 139, 0.08)'
      ctx.fillRect(rx, 0, rw, ctx.canvas.height)

      // Vertical border lines
      ctx.setLineDash([4, 4])
      ctx.strokeStyle = 'rgba(139, 139, 139, 0.5)'
      ctx.beginPath()
      ctx.moveTo(x1, 0)
      ctx.lineTo(x1, ctx.canvas.height)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(x2, 0)
      ctx.lineTo(x2, ctx.canvas.height)
      ctx.stroke()
      ctx.setLineDash([])

      // Bar count label
      const idx1 = findBarIndexByTs(bars, p1.ts)
      const idx2 = findBarIndexByTs(bars, p2.ts)
      const barCount = Math.abs(idx2 - idx1)
      const label = `${barCount} bars`

      const mx = rx + rw / 2
      ctx.font = '11px monospace'
      const tm = ctx.measureText(label)
      const padX = 8
      const padY = 5
      const pillW = tm.width + padX * 2
      const pillH = 16 + padY * 2
      const pillX = mx - pillW / 2
      const pillY = 20

      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
      ctx.beginPath()
      ctx.roundRect(pillX, pillY, pillW, pillH, 4)
      ctx.fill()

      ctx.fillStyle = '#8b8b8b'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(label, mx, pillY + pillH / 2)
      ctx.textBaseline = 'alphabetic'
      break
    }
    case 'callout': {
      const [anchor, textPt] = drawing.points
      const ax = toX(anchor.ts)
      const ay = toY(anchor.price)
      const tx = toX(textPt.ts)
      const ty = toY(textPt.price)

      // Leader line
      ctx.beginPath()
      ctx.moveTo(ax, ay)
      ctx.lineTo(tx, ty)
      ctx.stroke()

      // Text box
      const content = drawing.content || 'Label'
      ctx.font = '12px sans-serif'
      const tm = ctx.measureText(content)
      const padX = 8
      const padY = 6
      const boxW = tm.width + padX * 2
      const boxH = 16 + padY * 2
      const boxX = tx - boxW / 2
      const boxY = ty - boxH / 2

      ctx.fillStyle = 'rgba(0, 0, 0, 0.85)'
      ctx.beginPath()
      ctx.roundRect(boxX, boxY, boxW, boxH, 4)
      ctx.fill()
      ctx.strokeStyle = drawing.color
      ctx.strokeRect(boxX, boxY, boxW, boxH)

      ctx.fillStyle = drawing.color
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(content, tx, ty)
      ctx.textBaseline = 'alphabetic'
      break
    }
    case 'channel': {
      const [p0, p1, p2] = drawing.points
      const x0 = toX(p0.ts)
      const y0 = toY(p0.price)
      const x1 = toX(p1.ts)
      const y1 = toY(p1.price)
      const x2 = toX(p2.ts)
      const y2 = toY(p2.price)

      // Baseline: p0 → p1
      ctx.beginPath()
      ctx.moveTo(x0, y0)
      ctx.lineTo(x1, y1)
      ctx.stroke()

      // Parallel line offset by p2's distance from p0
      const offsetX = x2 - x0
      const offsetY = y2 - y0

      ctx.beginPath()
      ctx.moveTo(x0 + offsetX, y0 + offsetY)
      ctx.lineTo(x1 + offsetX, y1 + offsetY)
      ctx.stroke()

      // Fill between
      ctx.fillStyle = getDrawingFill(drawing)
      ctx.beginPath()
      ctx.moveTo(x0, y0)
      ctx.lineTo(x1, y1)
      ctx.lineTo(x1 + offsetX, y1 + offsetY)
      ctx.lineTo(x0 + offsetX, y0 + offsetY)
      ctx.closePath()
      ctx.fill()

      // Dashed midline
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.moveTo(x0 + offsetX / 2, y0 + offsetY / 2)
      ctx.lineTo(x1 + offsetX / 2, y1 + offsetY / 2)
      ctx.stroke()
      ctx.setLineDash([])
      break
    }
    case 'pitchfork': {
      const [pivot, left, right] = drawing.points
      const px = toX(pivot.ts)
      const py = toY(pivot.price)
      const lx = toX(left.ts)
      const ly = toY(left.price)
      const rx = toX(right.ts)
      const ry = toY(right.price)

      // Midpoint of left and right
      const midX = (lx + rx) / 2
      const midY = (ly + ry) / 2

      // Median line: pivot → midpoint, extended
      const mdx = midX - px
      const mdy = midY - py
      const mdLen = Math.hypot(mdx, mdy)
      if (mdLen > 0.5) {
        const ux = mdx / mdLen
        const uy = mdy / mdLen
        const extLen = Math.max(ctx.canvas.width, ctx.canvas.height) * 2

        ctx.beginPath()
        ctx.moveTo(px, py)
        ctx.lineTo(midX + ux * extLen, midY + uy * extLen)
        ctx.stroke()

        // Upper parallel (through left point)
        ctx.beginPath()
        ctx.moveTo(lx, ly)
        ctx.lineTo(lx + ux * extLen, ly + uy * extLen)
        ctx.stroke()

        // Lower parallel (through right point)
        ctx.beginPath()
        ctx.moveTo(rx, ry)
        ctx.lineTo(rx + ux * extLen, ry + uy * extLen)
        ctx.stroke()
      }

      // Draw the left-right baseline
      ctx.setLineDash([3, 3])
      ctx.beginPath()
      ctx.moveTo(lx, ly)
      ctx.lineTo(rx, ry)
      ctx.stroke()
      ctx.setLineDash([])
      break
    }
    case 'fib-extension': {
      const [pA, pB, pC] = drawing.points
      const levels = drawing.levels ?? DEFAULT_FIB_EXTENSION_LEVELS
      const canvasWidth = ctx.canvas.width

      // Fib extension: project levels from C based on A→B range
      const range = pB.price - pA.price

      for (const level of levels) {
        const price = pC.price + range * level
        const y = toY(price)
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(canvasWidth, y)
        ctx.stroke()

        // Level label
        ctx.fillStyle = drawing.color
        ctx.font = '10px monospace'
        ctx.textAlign = 'left'
        ctx.fillText(
          `${(level * 100).toFixed(1)}% (${price.toFixed(2)})`,
          toX(pC.ts) + 4,
          y - 3,
        )
      }

      // Dashed lines connecting A→B→C
      ctx.setLineDash([3, 3])
      ctx.beginPath()
      ctx.moveTo(toX(pA.ts), toY(pA.price))
      ctx.lineTo(toX(pB.ts), toY(pB.price))
      ctx.lineTo(toX(pC.ts), toY(pC.price))
      ctx.stroke()
      ctx.setLineDash([])
      break
    }
    case 'fib-channel': {
      const [p0, p1, p2] = drawing.points
      const x0 = toX(p0.ts)
      const y0 = toY(p0.price)
      const x1 = toX(p1.ts)
      const y1 = toY(p1.price)
      const x2 = toX(p2.ts)
      const y2 = toY(p2.price)

      const levels = drawing.levels ?? DEFAULT_FIB_CHANNEL_LEVELS

      // Offset vector from baseline to p2
      const offsetX = x2 - x0
      const offsetY = y2 - y0

      for (const level of levels) {
        const ox = offsetX * level
        const oy = offsetY * level

        ctx.beginPath()
        ctx.moveTo(x0 + ox, y0 + oy)
        ctx.lineTo(x1 + ox, y1 + oy)
        ctx.stroke()

        // Label
        ctx.fillStyle = drawing.color
        ctx.font = '10px monospace'
        ctx.textAlign = 'left'
        ctx.fillText(`${(level * 100).toFixed(1)}%`, x1 + ox + 4, y1 + oy - 3)
      }
      break
    }
    case 'polyline': {
      const pts = drawing.points
      if (pts.length < 2) break

      ctx.beginPath()
      ctx.moveTo(toX(pts[0].ts), toY(pts[0].price))
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(toX(pts[i].ts), toY(pts[i].price))
      }
      ctx.stroke()
      break
    }
    case 'triangle-pattern': {
      const [a, b, c] = drawing.points
      const ax = toX(a.ts),
        ay = toY(a.price)
      const bx = toX(b.ts),
        by = toY(b.price)
      const cx = toX(c.ts),
        cy = toY(c.price)

      // Filled triangle
      ctx.fillStyle = getDrawingFill(drawing)
      ctx.beginPath()
      ctx.moveTo(ax, ay)
      ctx.lineTo(bx, by)
      ctx.lineTo(cx, cy)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()

      // Vertex labels
      ctx.font = '10px monospace'
      ctx.fillStyle = drawing.color
      ctx.textAlign = 'center'
      ctx.fillText('A', ax, ay - 8)
      ctx.fillText('B', bx, by - 8)
      ctx.fillText('C', cx, cy - 8)
      break
    }
    case 'abcd-pattern': {
      const pts = drawing.points
      if (pts.length < 2) break
      const labels = ['A', 'B', 'C', 'D']

      // Draw connecting segments
      ctx.beginPath()
      ctx.moveTo(toX(pts[0].ts), toY(pts[0].price))
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(toX(pts[i].ts), toY(pts[i].price))
      }
      ctx.stroke()

      // Vertex labels + Fib ratio labels on segments
      ctx.font = '10px monospace'
      ctx.fillStyle = drawing.color
      ctx.textAlign = 'center'
      for (let i = 0; i < pts.length; i++) {
        const px = toX(pts[i].ts)
        const py = toY(pts[i].price)
        ctx.fillText(labels[i] ?? `P${i}`, px, py - 8)
      }

      // Show Fib ratios between segments (AB vs BC, BC vs CD)
      if (pts.length >= 3) {
        const abRange = Math.abs(pts[1].price - pts[0].price)
        const bcRange = Math.abs(pts[2].price - pts[1].price)
        if (abRange > 0) {
          const ratio = bcRange / abRange
          const mx = (toX(pts[1].ts) + toX(pts[2].ts)) / 2
          const my = (toY(pts[1].price) + toY(pts[2].price)) / 2
          ctx.fillText(`${(ratio * 100).toFixed(1)}%`, mx + 20, my)
        }
      }
      if (pts.length >= 4) {
        const bcRange = Math.abs(pts[2].price - pts[1].price)
        const cdRange = Math.abs(pts[3].price - pts[2].price)
        if (bcRange > 0) {
          const ratio = cdRange / bcRange
          const mx = (toX(pts[2].ts) + toX(pts[3].ts)) / 2
          const my = (toY(pts[2].price) + toY(pts[3].price)) / 2
          ctx.fillText(`${(ratio * 100).toFixed(1)}%`, mx + 20, my)
        }
      }
      break
    }
    case 'xabcd-pattern': {
      const pts = drawing.points
      if (pts.length < 2) break
      const labels = ['X', 'A', 'B', 'C', 'D']

      // Draw connecting segments
      ctx.beginPath()
      ctx.moveTo(toX(pts[0].ts), toY(pts[0].price))
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(toX(pts[i].ts), toY(pts[i].price))
      }
      ctx.stroke()

      // Fill between segments if we have all 5 points
      if (pts.length >= 5) {
        ctx.fillStyle = getDrawingFill(drawing)
        ctx.beginPath()
        ctx.moveTo(toX(pts[0].ts), toY(pts[0].price))
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(toX(pts[i].ts), toY(pts[i].price))
        }
        ctx.closePath()
        ctx.fill()
      }

      // Vertex labels + Fib ratios
      ctx.font = '10px monospace'
      ctx.fillStyle = drawing.color
      ctx.textAlign = 'center'
      for (let i = 0; i < pts.length; i++) {
        const px = toX(pts[i].ts)
        const py = toY(pts[i].price)
        ctx.fillText(labels[i] ?? `P${i}`, px, py - 8)
      }

      // Fib ratios: XA retracement for AB, AB retracement for BC, etc.
      for (let i = 1; i < pts.length - 1; i++) {
        const prevRange = Math.abs(pts[i].price - pts[i - 1].price)
        const currRange = Math.abs(pts[i + 1].price - pts[i].price)
        if (prevRange > 0) {
          const ratio = currRange / prevRange
          const mx = (toX(pts[i].ts) + toX(pts[i + 1].ts)) / 2
          const my = (toY(pts[i].price) + toY(pts[i + 1].price)) / 2
          ctx.fillText(`${(ratio * 100).toFixed(1)}%`, mx + 20, my)
        }
      }
      break
    }
    case 'head-shoulders': {
      const pts = drawing.points
      if (pts.length < 2) break
      const labels = ['LS', 'N1', 'H', 'N2', 'RS', 'N3', 'T']

      // Draw connecting line through all points
      ctx.beginPath()
      ctx.moveTo(toX(pts[0].ts), toY(pts[0].price))
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(toX(pts[i].ts), toY(pts[i].price))
      }
      ctx.stroke()

      // Neckline: connect neckline points (N1=index 1, N2=index 3, extended)
      if (pts.length >= 4) {
        const n1x = toX(pts[1].ts),
          n1y = toY(pts[1].price)
        const n2x = toX(pts[3].ts),
          n2y = toY(pts[3].price)

        ctx.setLineDash([4, 4])
        const dx = n2x - n1x
        const dy = n2y - n1y
        const len = Math.hypot(dx, dy)
        if (len > 0.5) {
          const ux = dx / len,
            uy = dy / len
          const extLen = Math.max(ctx.canvas.width, ctx.canvas.height)
          ctx.beginPath()
          ctx.moveTo(n1x - ux * extLen, n1y - uy * extLen)
          ctx.lineTo(n2x + ux * extLen, n2y + uy * extLen)
          ctx.stroke()
        }
        ctx.setLineDash([])
      }

      // Vertex labels
      ctx.font = '10px monospace'
      ctx.fillStyle = drawing.color
      ctx.textAlign = 'center'
      for (let i = 0; i < pts.length; i++) {
        const px = toX(pts[i].ts)
        const py = toY(pts[i].price)
        ctx.fillText(labels[i] ?? `P${i}`, px, py - 8)
      }
      break
    }
    case 'anchored-vwap': {
      // Compute VWAP from anchor point forward using bar data
      const anchorTs = drawing.point.ts
      const startIdx = findBarIndexByTs(bars, anchorTs)
      if (startIdx < 0 || bars.length === 0) break

      let cumVol = 0
      let cumVolPrice = 0
      const vwapPoints: Array<{ x: number; y: number }> = []

      for (let i = Math.max(0, startIdx); i < bars.length; i++) {
        const bar = bars[i]
        const typicalPrice = (bar.high + bar.low + bar.close) / 3
        const vol = bar.volume ?? 1
        cumVol += vol
        cumVolPrice += typicalPrice * vol
        const vwap = cumVol > 0 ? cumVolPrice / cumVol : typicalPrice
        vwapPoints.push({ x: toX(bar.ts), y: toY(vwap) })
      }

      if (vwapPoints.length < 2) break

      ctx.beginPath()
      ctx.moveTo(vwapPoints[0].x, vwapPoints[0].y)
      for (let i = 1; i < vwapPoints.length; i++) {
        ctx.lineTo(vwapPoints[i].x, vwapPoints[i].y)
      }
      ctx.stroke()

      // Anchor marker
      const ax = toX(anchorTs)
      const ay = vwapPoints[0].y
      ctx.beginPath()
      ctx.arc(ax, ay, 4, 0, Math.PI * 2)
      ctx.fillStyle = drawing.color
      ctx.fill()

      // Label
      ctx.font = '10px monospace'
      ctx.fillStyle = drawing.color
      ctx.textAlign = 'left'
      ctx.fillText('VWAP', ax + 8, ay - 4)
      break
    }
    case 'forecast': {
      const [entry, target] = drawing.points
      const entryX = toX(entry.ts)
      const entryY = toY(entry.price)
      const targetX = toX(target.ts)
      const targetY = toY(target.price)

      const left = Math.min(entryX, targetX)
      const right = Math.max(entryX, targetX)
      const top = Math.min(entryY, targetY)
      const bottom = Math.max(entryY, targetY)
      const width = right - left
      const height = bottom - top

      // Main rectangle
      ctx.fillStyle = getDrawingFill(drawing)
      ctx.fillRect(left, top, width, height)
      ctx.strokeRect(left, top, width, height)

      // Projected target lines (extending right from the rectangle)
      ctx.setLineDash([4, 4])
      // Entry projection
      ctx.beginPath()
      ctx.moveTo(right, entryY)
      ctx.lineTo(right + width, entryY)
      ctx.stroke()
      // Target projection
      ctx.beginPath()
      ctx.moveTo(right, targetY)
      ctx.lineTo(right + width, targetY)
      ctx.stroke()
      ctx.setLineDash([])

      // P&L label
      const delta = target.price - entry.price
      const pct = entry.price !== 0 ? (delta / entry.price) * 100 : 0
      const sign = delta >= 0 ? '+' : ''
      ctx.font = '11px monospace'
      ctx.fillStyle = drawing.color
      ctx.textAlign = 'left'
      ctx.fillText(`Forecast ${sign}${pct.toFixed(2)}%`, left + 4, top - 4)
      break
    }
    case 'brush': {
      const pts = drawing.points
      if (pts.length < 2) break

      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      ctx.moveTo(toX(pts[0].ts), toY(pts[0].price))
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(toX(pts[i].ts), toY(pts[i].price))
      }
      ctx.stroke()
      break
    }
    case 'highlighter': {
      const pts = drawing.points
      if (pts.length < 2) break

      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.globalAlpha = drawing.fillOpacity ?? 0.3
      ctx.beginPath()
      ctx.moveTo(toX(pts[0].ts), toY(pts[0].price))
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(toX(pts[i].ts), toY(pts[i].price))
      }
      ctx.stroke()
      ctx.globalAlpha = 1
      break
    }
    case 'arc': {
      const [p0, p1, p2] = drawing.points
      const x0 = toX(p0.ts),
        y0 = toY(p0.price)
      const x1 = toX(p1.ts),
        y1 = toY(p1.price)
      const x2 = toX(p2.ts),
        y2 = toY(p2.price)

      ctx.beginPath()
      ctx.moveTo(x0, y0)
      ctx.quadraticCurveTo(x1, y1, x2, y2)
      ctx.stroke()
      break
    }
    case 'rotated-rectangle': {
      const [p0, p1, p2] = drawing.points
      const x0 = toX(p0.ts),
        y0 = toY(p0.price)
      const x1 = toX(p1.ts),
        y1 = toY(p1.price)
      const x2 = toX(p2.ts),
        y2 = toY(p2.price)

      // p0→p1 is one edge, p2 defines the perpendicular width
      const edgeDx = x1 - x0
      const edgeDy = y1 - y0
      const edgeLen = Math.hypot(edgeDx, edgeDy)
      if (edgeLen < 0.5) break

      // Perpendicular direction
      const perpX = -edgeDy / edgeLen
      const perpY = edgeDx / edgeLen
      const projDist = (x2 - x0) * perpX + (y2 - y0) * perpY

      // Four corners
      const c0x = x0,
        c0y = y0
      const c1x = x1,
        c1y = y1
      const c2x = x1 + perpX * projDist,
        c2y = y1 + perpY * projDist
      const c3x = x0 + perpX * projDist,
        c3y = y0 + perpY * projDist

      ctx.beginPath()
      ctx.moveTo(c0x, c0y)
      ctx.lineTo(c1x, c1y)
      ctx.lineTo(c2x, c2y)
      ctx.lineTo(c3x, c3y)
      ctx.closePath()
      ctx.fillStyle = getDrawingFill(drawing)
      ctx.fill()
      ctx.stroke()
      break
    }
    case 'gann-fan': {
      const [a, b] = drawing.points
      const ax = toX(a.ts)
      const ay = toY(a.price)
      const bx = toX(b.ts)
      const by = toY(b.price)
      const dx = bx - ax
      const dy = by - ay
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) break
      const extLen = Math.max(ctx.canvas.width, ctx.canvas.height) * 2
      const labelDist = Math.hypot(dx, dy)

      ctx.font = '10px monospace'
      ctx.textAlign = 'left'
      for (const line of GANN_FAN_LINES) {
        const ry = dy * line.ratio
        const len = Math.hypot(dx, ry)
        if (len < 0.5) continue
        const ux = dx / len
        const uy = ry / len

        // Emphasize the 1/1 line (goes through B)
        ctx.lineWidth =
          line.ratio === 1 ? drawing.lineWidth + 0.5 : drawing.lineWidth
        ctx.beginPath()
        ctx.moveTo(ax, ay)
        ctx.lineTo(ax + ux * extLen, ay + uy * extLen)
        ctx.stroke()

        // Ratio label at the unit-box distance along the ray
        ctx.fillStyle = drawing.color
        ctx.fillText(
          line.label,
          ax + ux * labelDist + 4,
          ay + uy * labelDist - 3,
        )
      }
      break
    }
    case 'gann-box': {
      const [start, end] = drawing.points
      const x1 = toX(start.ts)
      const y1 = toY(start.price)
      const x2 = toX(end.ts)
      const y2 = toY(end.price)
      const x = Math.min(x1, x2)
      const y = Math.min(y1, y2)
      const w = Math.abs(x2 - x1)
      const h = Math.abs(y2 - y1)

      ctx.fillStyle = getDrawingFill(drawing)
      ctx.fillRect(x, y, w, h)
      ctx.strokeRect(x, y, w, h)

      // Internal horizontal + vertical division lines
      const levels = drawing.levels ?? DEFAULT_GANN_BOX_LEVELS
      ctx.setLineDash([3, 3])
      for (const level of levels) {
        const ly = y + h * level
        ctx.beginPath()
        ctx.moveTo(x, ly)
        ctx.lineTo(x + w, ly)
        ctx.stroke()

        const lx = x + w * level
        ctx.beginPath()
        ctx.moveTo(lx, y)
        ctx.lineTo(lx, y + h)
        ctx.stroke()
      }
      ctx.setLineDash([])

      // Ratio labels along the left edge
      ctx.fillStyle = drawing.color
      ctx.font = '10px monospace'
      ctx.textAlign = 'left'
      for (const level of levels) {
        ctx.fillText(level.toFixed(3), x + 2, y + h * level - 2)
      }
      break
    }
    case 'fib-time-zone': {
      const [a, b] = drawing.points
      const ax = toX(a.ts)
      const bx = toX(b.ts)
      const span = bx - ax
      if (Math.abs(span) < 0.5) break
      const levels = drawing.levels ?? DEFAULT_FIB_TIME_ZONE_LEVELS
      const canvasHeight = ctx.canvas.height

      ctx.font = '10px monospace'
      ctx.textAlign = 'left'
      for (const count of levels) {
        const x = ax + span * count
        // Base pair (0 and 1) dashed; projected zones solid
        if (count <= 1) {
          ctx.setLineDash([3, 3])
        } else {
          ctx.setLineDash([])
        }
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, canvasHeight)
        ctx.stroke()

        ctx.fillStyle = drawing.color
        ctx.fillText(String(count), x + 3, 12)
      }
      ctx.setLineDash([])
      break
    }
    case 'fib-wedge': {
      const [apex, e1, e2] = drawing.points
      const ax = toX(apex.ts)
      const ay = toY(apex.price)
      const x1 = toX(e1.ts)
      const y1 = toY(e1.price)
      const x2 = toX(e2.ts)
      const y2 = toY(e2.price)

      const baseRadius = Math.max(
        Math.hypot(x1 - ax, y1 - ay),
        Math.hypot(x2 - ax, y2 - ay),
      )
      if (baseRadius < 0.5) break

      // Edge lines
      ctx.beginPath()
      ctx.moveTo(ax, ay)
      ctx.lineTo(x1, y1)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(ax, ay)
      ctx.lineTo(x2, y2)
      ctx.stroke()

      // Shortest angular sweep between the two edges
      const angle1 = Math.atan2(y1 - ay, x1 - ax)
      const angle2 = Math.atan2(y2 - ay, x2 - ax)
      let sweep = angle2 - angle1
      if (sweep > Math.PI) sweep -= Math.PI * 2
      if (sweep < -Math.PI) sweep += Math.PI * 2

      // Fill the outermost wedge sector
      ctx.fillStyle = getDrawingFill(drawing)
      ctx.beginPath()
      ctx.moveTo(ax, ay)
      ctx.arc(ax, ay, baseRadius, angle1, angle1 + sweep, sweep < 0)
      ctx.closePath()
      ctx.fill()

      // Arcs at fib ratios of the radius
      const levels = drawing.levels ?? DEFAULT_FIB_WEDGE_LEVELS
      ctx.font = '10px monospace'
      ctx.textAlign = 'left'
      for (const level of levels) {
        const r = baseRadius * level
        ctx.beginPath()
        ctx.arc(ax, ay, r, angle1, angle1 + sweep, sweep < 0)
        ctx.stroke()

        // Label at the arc's end along the second edge
        const lx = ax + Math.cos(angle2) * r
        const ly = ay + Math.sin(angle2) * r
        ctx.fillStyle = drawing.color
        ctx.fillText(`${(level * 100).toFixed(1)}%`, lx + 4, ly - 3)
      }
      break
    }
    case 'elliott-wave': {
      const pts = drawing.points
      if (pts.length < 2) break

      ctx.beginPath()
      ctx.moveTo(toX(pts[0].ts), toY(pts[0].price))
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(toX(pts[i].ts), toY(pts[i].price))
      }
      ctx.stroke()

      // Vertex labels: 1,2,3,4,5,A,B,C — placed away from the incoming leg
      ctx.font = '10px monospace'
      ctx.fillStyle = drawing.color
      ctx.textAlign = 'center'
      for (let i = 0; i < pts.length; i++) {
        const px = toX(pts[i].ts)
        const py = toY(pts[i].price)
        const neighborY = i > 0 ? toY(pts[i - 1].price) : py + 1
        const offset = py <= neighborY ? -8 : 14
        ctx.fillText(ELLIOTT_WAVE_LABELS[i] ?? `P${i}`, px, py + offset)
      }
      break
    }
    case 'price-date-range': {
      const [p1, p2] = drawing.points
      const x1 = toX(p1.ts)
      const y1 = toY(p1.price)
      const x2 = toX(p2.ts)
      const y2 = toY(p2.price)

      const rx = Math.min(x1, x2)
      const ry = Math.min(y1, y2)
      const rw = Math.abs(x2 - x1)
      const rh = Math.abs(y2 - y1)

      const delta = p2.price - p1.price
      const isPositive = delta >= 0
      const tint = isPositive ? '34, 197, 94' : '239, 68, 68'

      // Filled rectangle with dashed border
      ctx.fillStyle = `rgba(${tint}, 0.08)`
      ctx.fillRect(rx, ry, rw, rh)
      ctx.setLineDash([4, 4])
      ctx.strokeStyle = `rgba(${tint}, 0.5)`
      ctx.strokeRect(rx, ry, rw, rh)
      ctx.setLineDash([])

      // Metrics: price delta + bar count + elapsed time
      const pct = p1.price !== 0 ? (delta / p1.price) * 100 : 0
      const sign = delta >= 0 ? '+' : ''
      const idx1 = findBarIndexByTs(bars, p1.ts)
      const idx2 = findBarIndexByTs(bars, p2.ts)
      const barCount = Math.abs(idx2 - idx1)
      const priceLabel = `${sign}${delta.toFixed(2)} (${sign}${pct.toFixed(1)}%)`
      const timeLabel = `${barCount} bars · ${formatDuration(Math.abs(p2.ts - p1.ts))}`

      // Two-line pill at the rectangle center
      const mx = rx + rw / 2
      const my = ry + rh / 2
      ctx.font = '11px monospace'
      const padX = 8
      const padY = 5
      const lineH = 14
      const pillW =
        Math.max(
          ctx.measureText(priceLabel).width,
          ctx.measureText(timeLabel).width,
        ) +
        padX * 2
      const pillH = lineH * 2 + padY * 2
      const pillX = mx - pillW / 2
      const pillY = my - pillH / 2

      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
      ctx.beginPath()
      ctx.roundRect(pillX, pillY, pillW, pillH, 4)
      ctx.fill()

      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = isPositive ? '#22c55e' : '#ef4444'
      ctx.fillText(priceLabel, mx, my - lineH / 2)
      ctx.fillStyle = '#8b8b8b'
      ctx.fillText(timeLabel, mx, my + lineH / 2)
      ctx.textBaseline = 'alphabetic'
      break
    }
    default:
      break
  }

  ctx.restore()
}

const getHandles = (
  drawing: DrawingObject,
  toX: (ts: number) => number,
  toY: (price: number) => number,
) => {
  switch (drawing.type) {
    case 'line':
    case 'arrow':
    case 'ray':
    case 'xline':
    case 'rectangle':
    case 'circle':
    case 'ellipse':
    case 'path':
    case 'fibonacci':
    case 'info-line':
    case 'trend-angle':
    case 'long-position':
    case 'short-position':
    case 'date-range':
    case 'callout':
    case 'gann-fan':
    case 'gann-box':
    case 'fib-time-zone':
    case 'price-date-range':
    case 'measure': {
      return [
        {
          id: 'start',
          x: toX(drawing.points[0].ts),
          y: toY(drawing.points[0].price),
        },
        {
          id: 'end',
          x: toX(drawing.points[1].ts),
          y: toY(drawing.points[1].price),
        },
      ]
    }
    case 'hline':
      return [
        {
          id: 'price',
          x: 12,
          y: toY(drawing.price),
        },
      ]
    case 'hray':
      return [
        {
          id: 'anchor',
          x: toX(drawing.ts),
          y: toY(drawing.price),
        },
      ]
    case 'vline':
      return [
        {
          id: 'time',
          x: toX(drawing.ts),
          y: 12,
        },
      ]
    case 'crossline':
      return [
        {
          id: 'anchor',
          x: toX(drawing.point.ts),
          y: toY(drawing.point.price),
        },
      ]
    case 'text':
      return [
        {
          id: 'anchor',
          x: toX(drawing.point.ts),
          y: toY(drawing.point.price),
        },
      ]
    case 'channel':
    case 'pitchfork':
    case 'fib-extension':
    case 'fib-channel':
    case 'fib-wedge':
    case 'triangle-pattern':
      return drawing.points.map((p, i) => ({
        id: `p${i}`,
        x: toX(p.ts),
        y: toY(p.price),
      }))
    case 'abcd-pattern':
    case 'xabcd-pattern':
    case 'head-shoulders':
    case 'elliott-wave':
    case 'polyline':
      return drawing.points.map((p, i) => ({
        id: `p${i}`,
        x: toX(p.ts),
        y: toY(p.price),
      }))
    case 'anchored-vwap':
      return [
        {
          id: 'anchor',
          x: toX(drawing.point.ts),
          y: toY(drawing.point.price),
        },
      ]
    case 'brush':
    case 'highlighter':
      // Freehand tools: no resize handles (too many points), only move via shift
      return []
    case 'arc':
    case 'rotated-rectangle':
      return drawing.points.map((p, i) => ({
        id: `p${i}`,
        x: toX(p.ts),
        y: toY(p.price),
      }))
    case 'forecast':
      return [
        {
          id: 'start',
          x: toX(drawing.points[0].ts),
          y: toY(drawing.points[0].price),
        },
        {
          id: 'end',
          x: toX(drawing.points[1].ts),
          y: toY(drawing.points[1].price),
        },
      ]
    default:
      return []
  }
}

// ── Generic onDrag / onShift / onHandleResize for two-point drawings ──

const twoPointDrag = (
  drawing: DrawingObject,
  point: DrawingPoint,
): DrawingObject => {
  if ('points' in drawing && Array.isArray(drawing.points)) {
    return { ...drawing, points: [drawing.points[0], point] } as DrawingObject
  }
  return drawing
}

const twoPointShift = (
  drawing: DrawingObject,
  deltaTs: number,
  deltaPrice: number,
): DrawingObject => {
  if ('points' in drawing && Array.isArray(drawing.points)) {
    return {
      ...drawing,
      points: [
        {
          ts: drawing.points[0].ts + deltaTs,
          price: drawing.points[0].price + deltaPrice,
        },
        {
          ts: drawing.points[1].ts + deltaTs,
          price: drawing.points[1].price + deltaPrice,
        },
      ],
    } as DrawingObject
  }
  return drawing
}

const twoPointResize = (
  drawing: DrawingObject,
  handleId: string,
  point: DrawingPoint,
): DrawingObject => {
  if ('points' in drawing && Array.isArray(drawing.points)) {
    const [start, end] = drawing.points
    return {
      ...drawing,
      points: handleId === 'start' ? [point, end] : [start, point],
    } as DrawingObject
  }
  return drawing
}

const circleResize = (
  drawing: DrawingObject,
  handleId: string,
  point: DrawingPoint,
): DrawingObject => {
  if (drawing.type !== 'circle') {
    return drawing
  }

  const [center, radiusPoint] = drawing.points
  if (handleId === 'start') {
    const deltaTs = point.ts - center.ts
    const deltaPrice = point.price - center.price
    return {
      ...drawing,
      points: [
        point,
        {
          ts: radiusPoint.ts + deltaTs,
          price: radiusPoint.price + deltaPrice,
        },
      ],
    }
  }

  return {
    ...drawing,
    points: [center, point],
  }
}

const hlineDrag = (
  drawing: DrawingObject,
  point: DrawingPoint,
): DrawingObject => {
  if (drawing.type !== 'hline') return drawing
  return { ...drawing, price: point.price }
}

const hlineShift = (
  drawing: DrawingObject,
  _deltaTs: number,
  deltaPrice: number,
): DrawingObject => {
  if (drawing.type !== 'hline') return drawing
  return { ...drawing, price: drawing.price + deltaPrice }
}

const hlineResize = (
  drawing: DrawingObject,
  _handleId: string,
  point: DrawingPoint,
): DrawingObject => {
  if (drawing.type !== 'hline') return drawing
  return { ...drawing, price: point.price }
}

const vlineDrag = (
  drawing: DrawingObject,
  point: DrawingPoint,
): DrawingObject => {
  if (drawing.type !== 'vline') return drawing
  return { ...drawing, ts: point.ts }
}

const vlineShift = (
  drawing: DrawingObject,
  deltaTs: number,
  _deltaPrice: number,
): DrawingObject => {
  if (drawing.type !== 'vline') return drawing
  return { ...drawing, ts: drawing.ts + deltaTs }
}

const vlineResize = (
  drawing: DrawingObject,
  _handleId: string,
  point: DrawingPoint,
): DrawingObject => {
  if (drawing.type !== 'vline') return drawing
  return { ...drawing, ts: point.ts }
}

const textDrag = (
  drawing: DrawingObject,
  point: DrawingPoint,
): DrawingObject => {
  if (drawing.type !== 'text') return drawing
  return { ...drawing, point }
}

const textShift = (
  drawing: DrawingObject,
  deltaTs: number,
  deltaPrice: number,
): DrawingObject => {
  if (drawing.type !== 'text') return drawing
  return {
    ...drawing,
    point: {
      ts: drawing.point.ts + deltaTs,
      price: drawing.point.price + deltaPrice,
    },
  }
}

const textResize = (
  drawing: DrawingObject,
  _handleId: string,
  point: DrawingPoint,
): DrawingObject => {
  if (drawing.type !== 'text') return drawing
  return { ...drawing, point }
}

const hrayDrag = (
  drawing: DrawingObject,
  point: DrawingPoint,
): DrawingObject => {
  if (drawing.type !== 'hray') return drawing
  return { ...drawing, price: point.price, ts: point.ts }
}

const hrayShift = (
  drawing: DrawingObject,
  deltaTs: number,
  deltaPrice: number,
): DrawingObject => {
  if (drawing.type !== 'hray') return drawing
  return {
    ...drawing,
    price: drawing.price + deltaPrice,
    ts: drawing.ts + deltaTs,
  }
}

const hrayResize = (
  drawing: DrawingObject,
  _handleId: string,
  point: DrawingPoint,
): DrawingObject => {
  if (drawing.type !== 'hray') return drawing
  return { ...drawing, price: point.price, ts: point.ts }
}

const crosslineDrag = (
  drawing: DrawingObject,
  point: DrawingPoint,
): DrawingObject => {
  if (drawing.type !== 'crossline') return drawing
  return { ...drawing, point }
}

const crosslineShift = (
  drawing: DrawingObject,
  deltaTs: number,
  deltaPrice: number,
): DrawingObject => {
  if (drawing.type !== 'crossline') return drawing
  return {
    ...drawing,
    point: {
      ts: drawing.point.ts + deltaTs,
      price: drawing.point.price + deltaPrice,
    },
  }
}

const crosslineResize = (
  drawing: DrawingObject,
  _handleId: string,
  point: DrawingPoint,
): DrawingObject => {
  if (drawing.type !== 'crossline') return drawing
  return { ...drawing, point }
}

// ── Multi-point behavior helpers ──

const multiPointShift = (
  drawing: DrawingObject,
  deltaTs: number,
  deltaPrice: number,
): DrawingObject => {
  if (!('points' in drawing) || !Array.isArray(drawing.points)) return drawing
  return {
    ...drawing,
    points: drawing.points.map((p: DrawingPoint) => ({
      ts: p.ts + deltaTs,
      price: p.price + deltaPrice,
    })),
  } as DrawingObject
}

const multiPointResize = (
  drawing: DrawingObject,
  handleId: string,
  point: DrawingPoint,
): DrawingObject => {
  if (!('points' in drawing) || !Array.isArray(drawing.points)) return drawing
  const match = handleId.match(/^p(\d+)$/)
  if (!match) return drawing
  const idx = parseInt(match[1], 10)
  if (idx < 0 || idx >= drawing.points.length) return drawing
  const newPoints = [...drawing.points]
  newPoints[idx] = point
  return { ...drawing, points: newPoints } as DrawingObject
}

const threePointOnPointAdded = (
  drawing: DrawingObject,
  point: DrawingPoint,
  index: number,
): DrawingObject => {
  if (!('points' in drawing) || !Array.isArray(drawing.points)) return drawing
  const pts = [...drawing.points]
  if (index < pts.length) {
    pts[index] = point
  }
  return { ...drawing, points: pts } as DrawingObject
}

const threePointGhostPreview = (
  drawing: DrawingObject,
  cursorPoint: DrawingPoint,
  nextIndex: number,
): DrawingObject => {
  if (!('points' in drawing) || !Array.isArray(drawing.points)) return drawing
  const pts = [...drawing.points]
  if (nextIndex < pts.length) {
    pts[nextIndex] = cursorPoint
  }
  return { ...drawing, points: pts } as DrawingObject
}

const polylineOnPointAdded = (
  drawing: DrawingObject,
  point: DrawingPoint,
  _index: number,
): DrawingObject => {
  if (drawing.type !== 'polyline') return drawing
  // Replace the ghost last point with the clicked point, then add a new ghost
  const pts = [...drawing.points]
  pts[pts.length - 1] = point
  pts.push(point) // new ghost point
  return { ...drawing, points: pts } as DrawingObject
}

const polylineGhostPreview = (
  drawing: DrawingObject,
  cursorPoint: DrawingPoint,
  _nextIndex: number,
): DrawingObject => {
  if (drawing.type !== 'polyline') return drawing
  const pts = [...drawing.points]
  pts[pts.length - 1] = cursorPoint
  return { ...drawing, points: pts } as DrawingObject
}

// ── N-point pattern behaviors (ABCD, XABCD, Head & Shoulders) ──

/** Add a point to an N-point sequential pattern. Same as polyline but works for any type. */
const nPointOnPointAdded = (
  drawing: DrawingObject,
  point: DrawingPoint,
  _index: number,
): DrawingObject => {
  if (!('points' in drawing) || !Array.isArray(drawing.points)) return drawing
  const pts = [...drawing.points]
  pts[pts.length - 1] = point
  pts.push(point) // new ghost point
  return { ...drawing, points: pts } as DrawingObject
}

/** Update the ghost tail point for N-point patterns. */
const nPointGhostPreview = (
  drawing: DrawingObject,
  cursorPoint: DrawingPoint,
  _nextIndex: number,
): DrawingObject => {
  if (!('points' in drawing) || !Array.isArray(drawing.points)) return drawing
  const pts = [...drawing.points]
  pts[pts.length - 1] = cursorPoint
  return { ...drawing, points: pts } as DrawingObject
}

// ── Anchored VWAP behaviors (single-point, like hline) ──

const vwapDrag = (
  drawing: DrawingObject,
  _point: DrawingPoint,
): DrawingObject => drawing

const vwapShift = (
  drawing: DrawingObject,
  deltaTs: number,
  deltaPrice: number,
): DrawingObject => {
  if (!('point' in drawing)) return drawing
  const p = (drawing as { point: DrawingPoint }).point
  return {
    ...drawing,
    point: { ts: p.ts + deltaTs, price: p.price + deltaPrice },
  } as DrawingObject
}

const vwapResize = (
  drawing: DrawingObject,
  _handleId: string,
  point: DrawingPoint,
): DrawingObject => {
  if (!('point' in drawing)) return drawing
  return { ...drawing, point } as DrawingObject
}

// ── Freehand (brush/highlighter) behaviors ──

const freehandDrag = (
  drawing: DrawingObject,
  point: DrawingPoint,
): DrawingObject => {
  if (!('points' in drawing) || !Array.isArray(drawing.points)) return drawing
  return { ...drawing, points: [...drawing.points, point] } as DrawingObject
}

// ── Definition builder ──

type DrawingBehavior = {
  onDrag: (drawing: DrawingObject, point: DrawingPoint) => DrawingObject
  onShift: (
    drawing: DrawingObject,
    deltaTs: number,
    deltaPrice: number,
  ) => DrawingObject
  onHandleResize: (
    drawing: DrawingObject,
    handleId: string,
    point: DrawingPoint,
  ) => DrawingObject
}

const buildDefinition = (
  type: DrawingToolType,
  createDefault: (context: DrawingCreateContext) => DrawingObject,
  hitTest: (context: DrawingHitTestContext) => DrawingHit | null,
  behavior: DrawingBehavior,
): DrawingShapeDefinition => ({
  type,
  createDefault,
  hitTest,
  render: ({ ctx, drawing, bars, toX, toY }) =>
    renderDrawing({ ctx, drawing, bars, toX, toY }),
  getHandles,
  onDrag: behavior.onDrag,
  onShift: behavior.onShift,
  onHandleResize: behavior.onHandleResize,
})

type MultiPointOpts = {
  pointCount: number
  onPointAdded: DrawingShapeDefinition['onPointAdded']
  onGhostPreview: DrawingShapeDefinition['onGhostPreview']
}

const buildMultiPointDefinition = (
  type: DrawingToolType,
  createDefault: (context: DrawingCreateContext) => DrawingObject,
  hitTest: (context: DrawingHitTestContext) => DrawingHit | null,
  behavior: DrawingBehavior,
  multi: MultiPointOpts,
): DrawingShapeDefinition => ({
  ...buildDefinition(type, createDefault, hitTest, behavior),
  pointCount: multi.pointCount,
  onPointAdded: multi.onPointAdded,
  onGhostPreview: multi.onGhostPreview,
})

export class DrawingRegistry {
  private readonly shapes = new Map<DrawingToolType, DrawingShapeDefinition>()
  private allCache: Array<DrawingShapeDefinition> | null = null

  register(definition: DrawingShapeDefinition): void {
    this.shapes.set(definition.type, definition)
    this.allCache = null
  }

  get(type: DrawingToolType): DrawingShapeDefinition | undefined {
    return this.shapes.get(type)
  }

  all(): Array<DrawingShapeDefinition> {
    if (!this.allCache) {
      this.allCache = Array.from(this.shapes.values())
    }
    return this.allCache
  }

  registerDefaults(): void {
    const twoPointBehavior: DrawingBehavior = {
      onDrag: twoPointDrag,
      onShift: twoPointShift,
      onHandleResize: twoPointResize,
    }
    const circleBehavior: DrawingBehavior = {
      onDrag: twoPointDrag,
      onShift: twoPointShift,
      onHandleResize: circleResize,
    }

    this.register(
      buildDefinition('line', createLineDrawing, hitTestLine, twoPointBehavior),
    )
    this.register(
      buildDefinition(
        'arrow',
        createArrowDrawing,
        hitTestArrow,
        twoPointBehavior,
      ),
    )
    this.register(
      buildDefinition('ray', createRayDrawing, hitTestRay, twoPointBehavior),
    )
    this.register(
      buildDefinition(
        'xline',
        createExtendedLineDrawing,
        hitTestXLine,
        twoPointBehavior,
      ),
    )
    this.register(
      buildDefinition(
        'rectangle',
        createRectangleDrawing,
        hitTestRectangle,
        twoPointBehavior,
      ),
    )
    this.register(
      buildDefinition(
        'ellipse',
        createEllipseDrawing,
        hitTestEllipse,
        twoPointBehavior,
      ),
    )
    this.register(
      buildDefinition('path', createPathDrawing, hitTestPath, twoPointBehavior),
    )
    this.register(
      buildDefinition(
        'circle',
        createCircleDrawing,
        hitTestCircle,
        circleBehavior,
      ),
    )
    this.register(
      buildDefinition('hline', createHorizontalLineDrawing, hitTestHLine, {
        onDrag: hlineDrag,
        onShift: hlineShift,
        onHandleResize: hlineResize,
      }),
    )
    this.register(
      buildDefinition('vline', createVerticalLineDrawing, hitTestVLine, {
        onDrag: vlineDrag,
        onShift: vlineShift,
        onHandleResize: vlineResize,
      }),
    )
    this.register(
      buildDefinition(
        'fibonacci',
        createFibonacciDrawing,
        hitTestFibonacci,
        twoPointBehavior,
      ),
    )
    this.register(
      buildDefinition(
        'measure',
        createMeasureDrawing,
        hitTestRectArea,
        twoPointBehavior,
      ),
    )
    this.register(
      buildDefinition('text', createTextDrawing, hitTestText, {
        onDrag: textDrag,
        onShift: textShift,
        onHandleResize: textResize,
      }),
    )
    this.register(
      buildDefinition('hray', createHorizontalRayDrawing, hitTestHRay, {
        onDrag: hrayDrag,
        onShift: hrayShift,
        onHandleResize: hrayResize,
      }),
    )
    this.register(
      buildDefinition('crossline', createCrossLineDrawing, hitTestCrossLine, {
        onDrag: crosslineDrag,
        onShift: crosslineShift,
        onHandleResize: crosslineResize,
      }),
    )
    this.register(
      buildDefinition(
        'info-line',
        createInfoLineDrawing,
        hitTestLine,
        twoPointBehavior,
      ),
    )
    this.register(
      buildDefinition(
        'trend-angle',
        createTrendAngleDrawing,
        hitTestLine,
        twoPointBehavior,
      ),
    )
    this.register(
      buildDefinition(
        'long-position',
        createLongPositionDrawing,
        hitTestRectArea,
        twoPointBehavior,
      ),
    )
    this.register(
      buildDefinition(
        'short-position',
        createShortPositionDrawing,
        hitTestRectArea,
        twoPointBehavior,
      ),
    )
    this.register(
      buildDefinition(
        'date-range',
        createDateRangeDrawing,
        hitTestDateRange,
        twoPointBehavior,
      ),
    )
    this.register(
      buildDefinition(
        'callout',
        createCalloutDrawing,
        hitTestLine,
        twoPointBehavior,
      ),
    )

    // ── Multi-point tools ──
    const multiPointBehavior: DrawingBehavior = {
      onDrag: twoPointDrag, // Not used during multi-point creation
      onShift: multiPointShift,
      onHandleResize: multiPointResize,
    }

    this.register(
      buildMultiPointDefinition(
        'channel',
        createChannelDrawing,
        hitTestChannel,
        multiPointBehavior,
        {
          pointCount: 3,
          onPointAdded: threePointOnPointAdded,
          onGhostPreview: threePointGhostPreview,
        },
      ),
    )
    this.register(
      buildMultiPointDefinition(
        'pitchfork',
        createPitchforkDrawing,
        hitTestPitchfork,
        multiPointBehavior,
        {
          pointCount: 3,
          onPointAdded: threePointOnPointAdded,
          onGhostPreview: threePointGhostPreview,
        },
      ),
    )
    this.register(
      buildMultiPointDefinition(
        'fib-extension',
        createFibExtensionDrawing,
        hitTestFibExtension,
        multiPointBehavior,
        {
          pointCount: 3,
          onPointAdded: threePointOnPointAdded,
          onGhostPreview: threePointGhostPreview,
        },
      ),
    )
    this.register(
      buildMultiPointDefinition(
        'fib-channel',
        createFibChannelDrawing,
        hitTestFibChannel,
        multiPointBehavior,
        {
          pointCount: 3,
          onPointAdded: threePointOnPointAdded,
          onGhostPreview: threePointGhostPreview,
        },
      ),
    )
    this.register(
      buildMultiPointDefinition(
        'polyline',
        createPolylineDrawing,
        hitTestPolyline,
        multiPointBehavior,
        {
          pointCount: 0, // unlimited
          onPointAdded: polylineOnPointAdded,
          onGhostPreview: polylineGhostPreview,
        },
      ),
    )

    // ── Phase 4: Advanced pattern tools ──

    this.register(
      buildMultiPointDefinition(
        'triangle-pattern',
        createTrianglePatternDrawing,
        hitTestTrianglePattern,
        multiPointBehavior,
        {
          pointCount: 3,
          onPointAdded: threePointOnPointAdded,
          onGhostPreview: threePointGhostPreview,
        },
      ),
    )
    this.register(
      buildMultiPointDefinition(
        'abcd-pattern',
        createAbcdPatternDrawing,
        hitTestPolyline,
        multiPointBehavior,
        {
          pointCount: 4,
          onPointAdded: nPointOnPointAdded,
          onGhostPreview: nPointGhostPreview,
        },
      ),
    )
    this.register(
      buildMultiPointDefinition(
        'xabcd-pattern',
        createXabcdPatternDrawing,
        hitTestPolyline,
        multiPointBehavior,
        {
          pointCount: 5,
          onPointAdded: nPointOnPointAdded,
          onGhostPreview: nPointGhostPreview,
        },
      ),
    )
    this.register(
      buildMultiPointDefinition(
        'head-shoulders',
        createHeadShouldersDrawing,
        hitTestPolyline,
        multiPointBehavior,
        {
          pointCount: 7,
          onPointAdded: nPointOnPointAdded,
          onGhostPreview: nPointGhostPreview,
        },
      ),
    )
    this.register(
      buildDefinition(
        'anchored-vwap',
        createAnchoredVwapDrawing,
        hitTestAnchoredVwap,
        {
          onDrag: vwapDrag,
          onShift: vwapShift,
          onHandleResize: vwapResize,
        },
      ),
    )
    this.register(
      buildDefinition(
        'forecast',
        createForecastDrawing,
        hitTestRectArea,
        twoPointBehavior,
      ),
    )

    // ── Phase 5: Freehand & polish tools ──

    const freehandBehavior: DrawingBehavior = {
      onDrag: freehandDrag,
      onShift: multiPointShift,
      onHandleResize: multiPointResize,
    }

    this.register(
      buildDefinition(
        'brush',
        createBrushDrawing,
        hitTestPolyline,
        freehandBehavior,
      ),
    )
    this.register(
      buildDefinition(
        'highlighter',
        createHighlighterDrawing,
        hitTestPolyline,
        freehandBehavior,
      ),
    )
    this.register(
      buildMultiPointDefinition(
        'arc',
        createArcDrawing,
        hitTestArc,
        multiPointBehavior,
        {
          pointCount: 3,
          onPointAdded: threePointOnPointAdded,
          onGhostPreview: threePointGhostPreview,
        },
      ),
    )
    this.register(
      buildMultiPointDefinition(
        'rotated-rectangle',
        createRotatedRectangleDrawing,
        hitTestRotatedRectangle,
        multiPointBehavior,
        {
          pointCount: 3,
          onPointAdded: threePointOnPointAdded,
          onGhostPreview: threePointGhostPreview,
        },
      ),
    )

    // ── Wave 2: Gann, fib time/wedge, Elliott, price & date range ──

    this.register(
      buildDefinition(
        'gann-fan',
        createGannFanDrawing,
        hitTestGannFan,
        twoPointBehavior,
      ),
    )
    this.register(
      buildDefinition(
        'gann-box',
        createGannBoxDrawing,
        hitTestGannBox,
        twoPointBehavior,
      ),
    )
    this.register(
      buildDefinition(
        'fib-time-zone',
        createFibTimeZoneDrawing,
        hitTestFibTimeZone,
        twoPointBehavior,
      ),
    )
    this.register(
      buildMultiPointDefinition(
        'fib-wedge',
        createFibWedgeDrawing,
        hitTestFibWedge,
        multiPointBehavior,
        {
          pointCount: 3,
          onPointAdded: threePointOnPointAdded,
          onGhostPreview: threePointGhostPreview,
        },
      ),
    )
    this.register(
      buildMultiPointDefinition(
        'elliott-wave',
        createElliottWaveDrawing,
        hitTestPolyline,
        multiPointBehavior,
        {
          pointCount: 0, // unlimited — finalize on double-click
          onPointAdded: nPointOnPointAdded,
          onGhostPreview: nPointGhostPreview,
        },
      ),
    )
    this.register(
      buildDefinition(
        'price-date-range',
        createPriceDateRangeDrawing,
        hitTestRectArea,
        twoPointBehavior,
      ),
    )
  }
}

export const createDefaultDrawingRegistry = (): DrawingRegistry => {
  const registry = new DrawingRegistry()
  registry.registerDefaults()
  return registry
}
