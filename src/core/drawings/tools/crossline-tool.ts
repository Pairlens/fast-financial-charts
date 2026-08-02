import { DEFAULT_DRAWING_COLOR, DEFAULT_DRAWING_LINE_WIDTH } from '../models'
import type { DrawingCreateContext, DrawingObject } from '../../../types'

export const createCrossLineDrawing = (
  context: DrawingCreateContext,
): DrawingObject => {
  return {
    id: context.id,
    type: 'crossline',
    point: context.point,
    color: DEFAULT_DRAWING_COLOR,
    lineWidth: DEFAULT_DRAWING_LINE_WIDTH,
    visible: true,
    seriesId: context.seriesId,
  }
}
