import { DEFAULT_DRAWING_COLOR, DEFAULT_DRAWING_LINE_WIDTH } from '../models'
import type {
  DrawingCreateContext,
  DrawingObject,
  DrawingPoint,
} from '../../../types'

export const createCircleDrawing = (
  context: DrawingCreateContext,
): DrawingObject => {
  return {
    id: context.id,
    type: 'circle',
    points: [context.point, context.point],
    color: DEFAULT_DRAWING_COLOR,
    lineWidth: DEFAULT_DRAWING_LINE_WIDTH,
    visible: true,
    seriesId: context.seriesId,
  }
}

export const updateCircleDrawingEdge = (
  drawing: DrawingObject,
  point: DrawingPoint,
): DrawingObject => {
  if (drawing.type !== 'circle') {
    return drawing
  }

  return {
    ...drawing,
    points: [drawing.points[0], point],
  }
}
