import { DEFAULT_DRAWING_COLOR, DEFAULT_DRAWING_LINE_WIDTH } from '../models'
import type { DrawingCreateContext, DrawingObject } from '../../../types'

/** Internal horizontal/vertical division ratios of the Gann box. */
export const DEFAULT_GANN_BOX_LEVELS = [0.25, 0.382, 0.5, 0.618, 0.75]

export const createGannBoxDrawing = (
  context: DrawingCreateContext,
): DrawingObject => {
  return {
    id: context.id,
    type: 'gann-box',
    points: [context.point, context.point],
    color: DEFAULT_DRAWING_COLOR,
    lineWidth: DEFAULT_DRAWING_LINE_WIDTH,
    visible: true,
    seriesId: context.seriesId,
    levels: DEFAULT_GANN_BOX_LEVELS,
  }
}
