import type { DrawingCreateContext, DrawingObject } from '../../../types'

export const createPriceDateRangeDrawing = (
  context: DrawingCreateContext,
): DrawingObject => {
  return {
    id: context.id,
    type: 'price-date-range',
    points: [context.point, context.point],
    color: '#8b8b8b',
    lineWidth: 1,
    visible: true,
    seriesId: context.seriesId,
  }
}
