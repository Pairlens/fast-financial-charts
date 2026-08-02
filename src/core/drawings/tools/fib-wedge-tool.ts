import { DEFAULT_DRAWING_COLOR, DEFAULT_DRAWING_LINE_WIDTH } from '../models'
import type { DrawingCreateContext, DrawingObject } from '../../../types'

/** Fib ratios of the wedge radius at which arcs are drawn. */
export const DEFAULT_FIB_WEDGE_LEVELS = [0.382, 0.5, 0.618, 0.786, 1]

export const createFibWedgeDrawing = (
  context: DrawingCreateContext,
): DrawingObject => {
  return {
    id: context.id,
    type: 'fib-wedge',
    points: [context.point, context.point, context.point],
    color: DEFAULT_DRAWING_COLOR,
    lineWidth: DEFAULT_DRAWING_LINE_WIDTH,
    visible: true,
    seriesId: context.seriesId,
    levels: DEFAULT_FIB_WEDGE_LEVELS,
  }
}
