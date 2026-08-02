import { DEFAULT_DRAWING_COLOR } from '../models'
import type { DrawingCreateContext, DrawingObject } from '../../../types'

export const createHighlighterDrawing = (
  context: DrawingCreateContext,
): DrawingObject => {
  return {
    id: context.id,
    type: 'highlighter',
    points: [context.point],
    color: DEFAULT_DRAWING_COLOR,
    lineWidth: 12,
    visible: true,
    seriesId: context.seriesId,
    fillOpacity: 0.3,
  }
}
