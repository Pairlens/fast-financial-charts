import { distanceToSegment } from './shared'
import type { DrawingHit, DrawingHitTestContext } from '../../../types'

export const hitTestArrow = (
  context: DrawingHitTestContext,
): DrawingHit | null => {
  if (context.drawing.type !== 'arrow') {
    return null
  }

  const drawing = context.drawing
  const [start, end] = drawing.points
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
