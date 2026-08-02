import { DEFAULT_DRAWING_COLOR, DEFAULT_DRAWING_LINE_WIDTH } from '../models'
import type { DrawingCreateContext, DrawingObject } from '../../../types'

/** Fibonacci counts: vertical lines are placed this many A→B spans after A. */
export const DEFAULT_FIB_TIME_ZONE_LEVELS = [0, 1, 2, 3, 5, 8, 13, 21, 34, 55]

export const createFibTimeZoneDrawing = (
  context: DrawingCreateContext,
): DrawingObject => {
  return {
    id: context.id,
    type: 'fib-time-zone',
    points: [context.point, context.point],
    color: DEFAULT_DRAWING_COLOR,
    lineWidth: DEFAULT_DRAWING_LINE_WIDTH,
    visible: true,
    seriesId: context.seriesId,
    levels: DEFAULT_FIB_TIME_ZONE_LEVELS,
  }
}
