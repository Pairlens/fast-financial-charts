import type { PathShapePreset } from '../../types'

/**
 * Built-in shape catalog — SVG path data normalized to a 0-100 viewBox.
 * The renderer scales each path into the drawing's bounding box.
 */
export type PathShapeDef = {
  /** SVG path `d` attribute, normalized to a 0–100 coordinate space. */
  d: string
  /** Whether the shape should be filled by default. */
  defaultFill: boolean
}

const SHAPE_CATALOG: Record<PathShapePreset, PathShapeDef> = {
  triangle: {
    d: 'M50 5 L95 95 L5 95 Z',
    defaultFill: false,
  },
  diamond: {
    d: 'M50 2 L98 50 L50 98 L2 50 Z',
    defaultFill: false,
  },
  star: {
    d: 'M50 2 L63 38 L98 38 L70 60 L80 97 L50 75 L20 97 L30 60 L2 38 L37 38 Z',
    defaultFill: false,
  },
  hexagon: {
    d: 'M50 2 L93 27 L93 73 L50 98 L7 73 L7 27 Z',
    defaultFill: false,
  },
  pentagon: {
    d: 'M50 2 L97 38 L79 97 L21 97 L3 38 Z',
    defaultFill: false,
  },
  cross: {
    d: 'M35 5 L65 5 L65 35 L95 35 L95 65 L65 65 L65 95 L35 95 L35 65 L5 65 L5 35 L35 35 Z',
    defaultFill: false,
  },
  heart: {
    d: 'M50 88 C20 65 2 45 2 28 C2 14 14 2 28 2 C38 2 46 8 50 18 C54 8 62 2 72 2 C86 2 98 14 98 28 C98 45 80 65 50 88 Z',
    defaultFill: true,
  },
  flag: {
    d: 'M10 5 L10 95 M10 5 L90 25 L10 50',
    defaultFill: false,
  },
  checkmark: {
    d: 'M10 55 L38 82 L90 18',
    defaultFill: false,
  },
  xmark: {
    d: 'M15 15 L85 85 M85 15 L15 85',
    defaultFill: false,
  },
}

/** Resolve path data from a preset name or raw d string. */
export const resolvePathData = (
  preset?: PathShapePreset,
  pathData?: string,
): PathShapeDef | null => {
  if (preset && preset in SHAPE_CATALOG) {
    return SHAPE_CATALOG[preset]
  }
  if (pathData) {
    return { d: pathData, defaultFill: false }
  }
  return null
}

/** Parse an SVG path string into a Path2D, scaled to fit a bounding box. */
export const createScaledPath2D = (
  d: string,
  x: number,
  y: number,
  w: number,
  h: number,
): Path2D => {
  // The catalog paths use 0–100 coordinate space.
  // We create a transformed path via SVG matrix transform.
  const sx = w / 100
  const sy = h / 100
  const matrix = new DOMMatrix([sx, 0, 0, sy, x, y])
  const source = new Path2D(d)
  const scaled = new Path2D()
  scaled.addPath(source, matrix)
  return scaled
}

export const getPresetNames = (): Array<PathShapePreset> =>
  Object.keys(SHAPE_CATALOG) as Array<PathShapePreset>

export const getShapeDef = (
  preset: PathShapePreset,
): PathShapeDef | undefined => SHAPE_CATALOG[preset]
