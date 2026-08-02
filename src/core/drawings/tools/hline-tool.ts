import { DEFAULT_DRAWING_COLOR, DEFAULT_DRAWING_LINE_WIDTH } from '../models'
import type {
  DrawingCreateContext,
  DrawingObject,
  DrawingPoint,
} from '../../../types'

export const createHorizontalLineDrawing = (
  context: DrawingCreateContext,
): DrawingObject => {
  return {
    id: context.id,
    type: 'hline',
    price: context.point.price,
    color: DEFAULT_DRAWING_COLOR,
    lineWidth: DEFAULT_DRAWING_LINE_WIDTH,
    visible: true,
    seriesId: context.seriesId,
  }
}

export const updateHorizontalLinePrice = (
  drawing: DrawingObject,
  point: DrawingPoint,
): DrawingObject => {
  if (drawing.type !== 'hline') {
    return drawing
  }

  return {
    ...drawing,
    price: point.price,
  }
}
