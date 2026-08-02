import { createScaledPath2D, resolvePathData } from '../path-shapes'
import type { DrawingHit, DrawingHitTestContext } from '../../../types'

export const hitTestPath = (
  context: DrawingHitTestContext,
): DrawingHit | null => {
  if (context.drawing.type !== 'path') {
    return null
  }

  const drawing = context.drawing
  const shapeDef = resolvePathData(drawing.preset, drawing.pathData)
  if (!shapeDef) return null

  const [start, end] = drawing.points
  const x1 = context.toX(start.ts)
  const y1 = context.toY(start.price)
  const x2 = context.toX(end.ts)
  const y2 = context.toY(end.price)

  const x = Math.min(x1, x2)
  const y = Math.min(y1, y2)
  const w = Math.abs(x2 - x1)
  const h = Math.abs(y2 - y1)

  if (w < 2 || h < 2) return null

  const path = createScaledPath2D(shapeDef.d, x, y, w, h)

  // Use an offscreen canvas context for isPointInPath / isPointInStroke.
  // The canvas must be large enough to cover the test coordinates — a 1×1
  // canvas would clip everything outside [0,1].
  const offscreen = new OffscreenCanvas(
    Math.ceil(context.x) + 1,
    Math.ceil(context.y) + 1,
  )
  const ctx = offscreen.getContext('2d')
  if (!ctx) return null

  ctx.lineWidth = Math.max(drawing.lineWidth, 6)

  const isFilled = drawing.fill ?? shapeDef.defaultFill
  const inFill = isFilled && ctx.isPointInPath(path, context.x, context.y)
  const inStroke = ctx.isPointInStroke(path, context.x, context.y)

  if (!inFill && !inStroke) return null

  return {
    drawingId: drawing.id,
    distance: inStroke ? 0 : 2,
  }
}
