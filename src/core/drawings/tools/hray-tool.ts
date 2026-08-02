import { DEFAULT_DRAWING_COLOR, DEFAULT_DRAWING_LINE_WIDTH } from '../models'
import type { DrawingCreateContext, DrawingObject } from '../../../types'

export const createHorizontalRayDrawing = (
  context: DrawingCreateContext,
): DrawingObject => {
  return {
    id: context.id,
    type: 'hray',
    price: context.point.price,
    ts: context.point.ts,
    color: DEFAULT_DRAWING_COLOR,
    lineWidth: DEFAULT_DRAWING_LINE_WIDTH,
    visible: true,
    seriesId: context.seriesId,
  }
}
