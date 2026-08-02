import type { DrawingHit, DrawingHitTestContext } from '../../../types'

export const hitTestCircle = (
  context: DrawingHitTestContext,
): DrawingHit | null => {
  if (context.drawing.type !== 'circle') {
    return null
  }

  const drawing = context.drawing
  const [center, edge] = drawing.points
  const cx = context.toX(center.ts)
  const cy = context.toY(center.price)
  const ex = context.toX(edge.ts)
  const ey = context.toY(edge.price)

  const radius = Math.max(2, Math.hypot(ex - cx, ey - cy))
  const delta = Math.abs(Math.hypot(context.x - cx, context.y - cy) - radius)

  if (delta > 8) {
    return null
  }

  return {
    drawingId: drawing.id,
    distance: delta,
  }
}
