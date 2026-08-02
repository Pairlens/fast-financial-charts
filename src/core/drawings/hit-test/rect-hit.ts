import type { DrawingHit, DrawingHitTestContext } from '../../../types'

export const hitTestRectangle = (
  context: DrawingHitTestContext,
): DrawingHit | null => {
  if (context.drawing.type !== 'rectangle') {
    return null
  }

  const drawing = context.drawing
  const [start, end] = drawing.points
  const x1 = context.toX(start.ts)
  const y1 = context.toY(start.price)
  const x2 = context.toX(end.ts)
  const y2 = context.toY(end.price)

  const minX = Math.min(x1, x2)
  const maxX = Math.max(x1, x2)
  const minY = Math.min(y1, y2)
  const maxY = Math.max(y1, y2)

  if (
    context.x < minX - 4 ||
    context.x > maxX + 4 ||
    context.y < minY - 4 ||
    context.y > maxY + 4
  ) {
    return null
  }

  const edgeDistance = Math.min(
    Math.abs(context.x - minX),
    Math.abs(context.x - maxX),
    Math.abs(context.y - minY),
    Math.abs(context.y - maxY),
  )

  if (edgeDistance > 8) {
    return null
  }

  return {
    drawingId: drawing.id,
    distance: edgeDistance,
  }
}
