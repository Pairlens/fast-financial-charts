import type { DrawingCreateContext, DrawingObject } from '../../../types'

export const createShortPositionDrawing = (
  context: DrawingCreateContext,
): DrawingObject => {
  return {
    id: context.id,
    type: 'short-position',
    points: [context.point, context.point],
    color: '#ef4444',
    lineWidth: 1,
    visible: true,
    seriesId: context.seriesId,
  }
}
