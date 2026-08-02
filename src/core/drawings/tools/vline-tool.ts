import { DEFAULT_DRAWING_COLOR, DEFAULT_DRAWING_LINE_WIDTH } from '../models'
import type {
  DrawingCreateContext,
  DrawingObject,
  DrawingPoint,
} from '../../../types'

export const createVerticalLineDrawing = (
  context: DrawingCreateContext,
): DrawingObject => {
  return {
    id: context.id,
    type: 'vline',
    ts: context.point.ts,
    color: DEFAULT_DRAWING_COLOR,
    lineWidth: DEFAULT_DRAWING_LINE_WIDTH,
    visible: true,
    seriesId: context.seriesId,
  }
}

export const updateVerticalLineTs = (
  drawing: DrawingObject,
  point: DrawingPoint,
): DrawingObject => {
  if (drawing.type !== 'vline') {
    return drawing
  }

  return {
    ...drawing,
    ts: point.ts,
  }
}
