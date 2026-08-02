import { DEFAULT_DRAWING_COLOR } from '../models'
import type { DrawingCreateContext, DrawingObject } from '../../../types'

export const createTextDrawing = (
  context: DrawingCreateContext,
): DrawingObject => {
  return {
    id: context.id,
    type: 'text',
    point: context.point,
    content: 'Text',
    color: DEFAULT_DRAWING_COLOR,
    lineWidth: 1,
    visible: true,
    seriesId: context.seriesId,
    fontSize: 12,
  }
}
