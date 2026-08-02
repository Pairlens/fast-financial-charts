import type { DrawingHit, DrawingHitTestContext } from '../../../types'

export const hitTestEllipse = (
  context: DrawingHitTestContext,
): DrawingHit | null => {
  if (context.drawing.type !== 'ellipse') {
    return null
  }

  const drawing = context.drawing
  const [start, end] = drawing.points
  const x1 = context.toX(start.ts)
  const y1 = context.toY(start.price)
  const x2 = context.toX(end.ts)
  const y2 = context.toY(end.price)

  const cx = (x1 + x2) / 2
  const cy = (y1 + y2) / 2
  const rx = Math.abs(x2 - x1) / 2
  const ry = Math.abs(y2 - y1) / 2

  if (rx < 1 || ry < 1) {
    return null
  }

  // Normalized distance from center (1.0 = on ellipse perimeter)
  const dx = (context.x - cx) / rx
  const dy = (context.y - cy) / ry
  const normalizedDist = Math.hypot(dx, dy)

  // Distance from the perimeter in pixel-space (approximate)
  const delta = Math.abs(normalizedDist - 1) * Math.min(rx, ry)

  if (delta > 8) {
    return null
  }

  return {
    drawingId: drawing.id,
    distance: delta,
  }
}
