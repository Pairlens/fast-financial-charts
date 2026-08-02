import { DEFAULT_DRAWING_COLOR, DEFAULT_DRAWING_LINE_WIDTH } from '../models'
import type { DrawingCreateContext, DrawingObject } from '../../../types'

export const DEFAULT_FIB_EXTENSION_LEVELS = [
  0, 0.236, 0.382, 0.5, 0.618, 1, 1.618, 2.618,
]

export const createFibExtensionDrawing = (
  context: DrawingCreateContext,
): DrawingObject => {
  return {
    id: context.id,
    type: 'fib-extension',
    points: [context.point, context.point, context.point],
    levels: DEFAULT_FIB_EXTENSION_LEVELS,
    color: DEFAULT_DRAWING_COLOR,
    lineWidth: DEFAULT_DRAWING_LINE_WIDTH,
    visible: true,
    seriesId: context.seriesId,
  }
}
