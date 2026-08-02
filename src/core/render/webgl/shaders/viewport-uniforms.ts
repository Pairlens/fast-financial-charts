import type { ChartViewport, NumericRange } from '../../../../types'
import type { PriceScaleMode } from '../../../../types/viewport'

/**
 * CPU-side uniform values that drive GPU-side NDC viewport transforms.
 * Decompose the toNdcX() / toNdcY() / toNdcYForMode() functions into
 * scale+offset pairs that can be set as vertex shader uniforms.
 */
export type ViewportUniforms = {
  xScale: number
  xOffset: number
  yScale: number
  yOffset: number
  mode: number // 0=normal, 1=log, 2=percentage, 3=indexedTo100
  basePrice: number
  halfW: number // max(1/viewportW, 0.8 / total) — 80% bar fill ratio for instanced programs
  viewportW: number // physical pixel width of the WebGL canvas
  viewportH: number // physical pixel height of the WebGL canvas
}

/**
 * Compute viewport uniforms from current viewport, price range, and scale mode.
 *
 * The result satisfies:
 *   indexToNdcX(barIndex)  = barIndex * xScale + xOffset  ≡  toNdcX(barIndex, viewport)
 *   priceToNdcY(price)     = f(price) * yScale + yOffset  ≡  toNdcYForMode(price, range, mode)
 *
 * where f(price) is identity for normal, log() for logarithmic, or the percentage/indexed
 * transform (applied in the GPU shader via u_mode + u_basePrice).
 */
export const computeViewportUniforms = (
  viewport: ChartViewport,
  yRange: NumericRange,
  priceScaleMode: PriceScaleMode,
  basePrice: number,
  viewportW: number,
  viewportH: number,
): ViewportUniforms => {
  const total = Math.max(1, viewport.endIndex - viewport.startIndex + 1)

  // X: ndcX = (index - start + 0.5) / total * 2 - 1
  //        = index * (2/total) + ((-start + 0.5) * 2/total - 1)
  const xScale = 2 / total
  const xOffset = (-viewport.startIndex + 0.5) * xScale - 1

  // Y: depends on mode
  let yScale: number
  let yOffset: number
  let mode: number

  const spread = yRange.max - yRange.min
  const safeSpread = Math.abs(spread) < 1e-10 ? 1 : spread

  if (priceScaleMode === 'logarithmic') {
    mode = 1
    const logMin = Math.log(Math.max(1e-10, yRange.min))
    const logMax = Math.log(Math.max(1e-10, yRange.max))
    const logSpread = logMax - logMin
    const safeLogSpread = Math.abs(logSpread) < 1e-10 ? 1 : logSpread
    yScale = 2 / safeLogSpread
    yOffset = -((2 * logMin) / safeLogSpread) - 1
  } else if (priceScaleMode === 'percentage') {
    mode = 2
    // Range is already in transformed (%) space; GPU shader transforms raw price → %
    yScale = 2 / safeSpread
    yOffset = -((2 * yRange.min) / safeSpread) - 1
  } else if (priceScaleMode === 'indexedTo100') {
    mode = 3
    // Range is already in transformed (indexed) space; GPU shader transforms raw price → indexed
    yScale = 2 / safeSpread
    yOffset = -((2 * yRange.min) / safeSpread) - 1
  } else {
    mode = 0
    yScale = 2 / safeSpread
    yOffset = -((2 * yRange.min) / safeSpread) - 1
  }

  const halfW = Math.max(1 / Math.max(1, viewportW), 0.8 / total)

  return {
    xScale,
    xOffset,
    yScale,
    yOffset,
    mode,
    basePrice,
    halfW,
    viewportW,
    viewportH,
  }
}

/**
 * Identity uniforms: scale=1, offset=0, mode=0 → passthrough.
 * NDC coordinates in = NDC coordinates out.
 * Used by volume pass and compare mode which still write NDC directly.
 */
export const IDENTITY_VIEWPORT_UNIFORMS: ViewportUniforms = {
  xScale: 1,
  xOffset: 0,
  yScale: 1,
  yOffset: 0,
  mode: 0,
  basePrice: 0,
  halfW: 0,
  viewportW: 1,
  viewportH: 1,
}
