import { distanceToSegment } from './shared'
import type {
  DrawingHit,
  DrawingHitTestContext,
  DrawingPoint,
} from '../../../types'

/**
 * Generic hit test for any drawing with a two-element `points` array.
 * Works for: line, info-line, trend-angle, callout, and any other two-point segment drawing.
 */
export const hitTestLine = (
  context: DrawingHitTestContext,
): DrawingHit | null => {
  const drawing = context.drawing
  if (!('points' in drawing) || !Array.isArray(drawing.points)) return null

  const [start, end] = drawing.points as [DrawingPoint, DrawingPoint]
  const x1 = context.toX(start.ts)
  const y1 = context.toY(start.price)
  const x2 = context.toX(end.ts)
  const y2 = context.toY(end.price)
  const distance = distanceToSegment(context.x, context.y, x1, y1, x2, y2)

  if (distance > 6) {
    return null
  }

  return {
    drawingId: drawing.id,
    distance,
  }
}
