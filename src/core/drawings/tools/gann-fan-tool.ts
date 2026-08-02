import { DEFAULT_DRAWING_COLOR, DEFAULT_DRAWING_LINE_WIDTH } from '../models'
import type { DrawingCreateContext, DrawingObject } from '../../../types'

/** Standard Gann fan rays: slope multipliers relative to the A→B unit box. */
export const GANN_FAN_LINES: Array<{ ratio: number; label: string }> = [
  { ratio: 8, label: '8/1' },
  { ratio: 4, label: '4/1' },
  { ratio: 3, label: '3/1' },
  { ratio: 2, label: '2/1' },
  { ratio: 1, label: '1/1' },
  { ratio: 1 / 2, label: '1/2' },
  { ratio: 1 / 3, label: '1/3' },
  { ratio: 1 / 4, label: '1/4' },
  { ratio: 1 / 8, label: '1/8' },
]

export const createGannFanDrawing = (
  context: DrawingCreateContext,
): DrawingObject => {
  return {
    id: context.id,
    type: 'gann-fan',
    points: [context.point, context.point],
    color: DEFAULT_DRAWING_COLOR,
    lineWidth: DEFAULT_DRAWING_LINE_WIDTH,
    visible: true,
    seriesId: context.seriesId,
  }
}
