import type { LineProgram } from '../programs/line-program'
import type {
  ChartBar,
  ChartTheme,
  ChartViewport,
  NumericRange,
} from '../../../../types'

type VolumePassInput = {
  bars: Array<ChartBar>
  viewport: ChartViewport
  priceRange: NumericRange
  theme: ChartTheme
  lineProgram: LineProgram
  /** Height fraction of the main chart area devoted to volume (0..1). Default 0.18 */
  heightRatio?: number
}

// ── Pre-allocated buffer (module-level, reused across frames) ──

let volumeBuf = new Float32Array(0)

const ensureVolumeBuffer = (barCount: number): Float32Array => {
  // 2 triangles per bar = 6 vertices × 2 floats = 12 floats per bar
  const needed = barCount * 12
  if (volumeBuf.length < needed) {
    volumeBuf = new Float32Array(needed)
  }
  return volumeBuf
}

// ── Cached theme colors ──

const volumeColorCache = new Map<string, [number, number, number, number]>()

const hexToVolumeColor = (
  hex: string,
  alpha: number,
): [number, number, number, number] => {
  const key = `${hex}_${alpha}`
  let cached = volumeColorCache.get(key)
  if (cached) return cached
  const normalized = hex.startsWith('#') ? hex.slice(1) : hex
  cached = [
    Number.parseInt(normalized.slice(0, 2), 16) / 255,
    Number.parseInt(normalized.slice(2, 4), 16) / 255,
    Number.parseInt(normalized.slice(4, 6), 16) / 255,
    alpha,
  ]
  volumeColorCache.set(key, cached)
  return cached
}

export const renderVolumePass = (input: VolumePassInput): void => {
  const { bars, viewport, lineProgram, theme } = input
  const heightRatio = input.heightRatio ?? 0.18

  const start = Math.max(0, viewport.startIndex)
  const end = Math.min(bars.length - 1, viewport.endIndex)
  if (end < start) return

  // Find max volume in visible range for scaling
  let maxVol = 0
  for (let i = start; i <= end; i += 1) {
    if (bars[i].volume > maxVol) maxVol = bars[i].volume
  }
  if (maxVol <= 0) return

  const total = Math.max(1, viewport.endIndex - viewport.startIndex + 1)
  const barWidth = Math.max(0.001, 1.8 / total)

  // Separate up/down bars and render in two passes for correct coloring
  const visibleCount = end - start + 1
  const buf = ensureVolumeBuffer(visibleCount)

  // Bottom of NDC is -1, volume bars grow upward from the bottom
  const volumeBaseY = -1.0
  const volumeMaxH = heightRatio * 2 // NDC height allocated to volume

  // Draw up-volume bars
  let upOffset = 0
  for (let i = start; i <= end; i += 1) {
    const bar = bars[i]
    if (bar.close < bar.open) continue // skip down bars

    const cx = ((i - viewport.startIndex + 0.5) / total) * 2 - 1
    const h = (bar.volume / maxVol) * volumeMaxH
    const left = cx - barWidth * 0.45
    const right = cx + barWidth * 0.45
    const top = volumeBaseY + h

    // Triangle 1
    buf[upOffset++] = left
    buf[upOffset++] = volumeBaseY
    buf[upOffset++] = right
    buf[upOffset++] = volumeBaseY
    buf[upOffset++] = left
    buf[upOffset++] = top
    // Triangle 2
    buf[upOffset++] = right
    buf[upOffset++] = volumeBaseY
    buf[upOffset++] = right
    buf[upOffset++] = top
    buf[upOffset++] = left
    buf[upOffset++] = top
  }

  if (upOffset >= 6) {
    const upColor = hexToVolumeColor(theme.indicator.volume.up, 0.45)
    lineProgram.draw(buf.subarray(0, upOffset), upColor, 4) // gl.TRIANGLES = 4
  }

  // Draw down-volume bars
  let downOffset = 0
  for (let i = start; i <= end; i += 1) {
    const bar = bars[i]
    if (bar.close >= bar.open) continue // skip up bars

    const cx = ((i - viewport.startIndex + 0.5) / total) * 2 - 1
    const h = (bar.volume / maxVol) * volumeMaxH
    const left = cx - barWidth * 0.45
    const right = cx + barWidth * 0.45
    const top = volumeBaseY + h

    // Triangle 1
    buf[downOffset++] = left
    buf[downOffset++] = volumeBaseY
    buf[downOffset++] = right
    buf[downOffset++] = volumeBaseY
    buf[downOffset++] = left
    buf[downOffset++] = top
    // Triangle 2
    buf[downOffset++] = right
    buf[downOffset++] = volumeBaseY
    buf[downOffset++] = right
    buf[downOffset++] = top
    buf[downOffset++] = left
    buf[downOffset++] = top
  }

  if (downOffset >= 6) {
    const downColor = hexToVolumeColor(theme.indicator.volume.down, 0.45)
    lineProgram.draw(buf.subarray(0, downOffset), downColor, 4) // gl.TRIANGLES = 4
  }
}
