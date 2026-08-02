import type { DrawingCreateContext, DrawingObject } from '../../../types'

export const createLongPositionDrawing = (
  context: DrawingCreateContext,
): DrawingObject => {
  return {
    id: context.id,
    type: 'long-position',
    points: [context.point, context.point],
    color: '#22c55e',
    lineWidth: 1,
    visible: true,
    seriesId: context.seriesId,
  }
}
