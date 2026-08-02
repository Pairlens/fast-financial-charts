import { DEFAULT_DRAWING_COLOR, DEFAULT_DRAWING_LINE_WIDTH } from '../models'
import { getShapeDef } from '../path-shapes'
import type {
  DrawingCreateContext,
  DrawingObject,
  PathShapePreset,
} from '../../../types'

export const createPathDrawing = (
  context: DrawingCreateContext,
): DrawingObject => {
  const preset =
    (context.meta?.preset as PathShapePreset | undefined) ?? 'triangle'
  const shapeDef = getShapeDef(preset)
  return {
    id: context.id,
    type: 'path',
    points: [context.point, context.point],
    preset,
    fill: shapeDef?.defaultFill ?? true,
    color: DEFAULT_DRAWING_COLOR,
    lineWidth: DEFAULT_DRAWING_LINE_WIDTH,
    visible: true,
    seriesId: context.seriesId,
  }
}
