import { DEFAULT_DRAWING_COLOR, DEFAULT_DRAWING_LINE_WIDTH } from '../models'
import type { DrawingCreateContext, DrawingObject } from '../../../types'

/** Sequential vertex labels for the Elliott impulse + correction structure. */
export const ELLIOTT_WAVE_LABELS = ['1', '2', '3', '4', '5', 'A', 'B', 'C']

export const createElliottWaveDrawing = (
  context: DrawingCreateContext,
): DrawingObject => {
  return {
    id: context.id,
    type: 'elliott-wave',
    points: [context.point, context.point],
    color: DEFAULT_DRAWING_COLOR,
    lineWidth: DEFAULT_DRAWING_LINE_WIDTH,
    visible: true,
    seriesId: context.seriesId,
  }
}
