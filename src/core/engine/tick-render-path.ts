import { DirtyFlags } from './dirty-flags'
import type { ChartBar, NumericRange } from '../../types'
import type { PriceScaleMode } from '../../types/viewport'

export type TickRenderFlagsInput = {
  /** Dirty flags that were pending BEFORE the tick was applied. */
  flagsBefore: number
  /** True when any tick appended a new bar (rollover) or created a series. */
  appended: boolean
  /**
   * Bars mutated by the ticks — the last bar of each touched series.
   * `undefined` entries (series/bar not found) force the full-rebuild path.
   */
  changedBars: ReadonlyArray<ChartBar | undefined>
  priceScaleMode: PriceScaleMode
  /**
   * The y-range currently rendered (post-margin, as used for the GPU
   * uniforms). Ticks that extend beyond it must re-fit the axis.
   */
  currentYRange: NumericRange
}

/**
 * Decide the render path for a batch of just-applied live ticks.
 *
 * Returns the downgraded dirty flags (incremental LAST_BAR path) when every
 * tick only mutated the last bar of its series and stayed inside the current
 * y-range — or `null` when the pending full rebuild must be kept:
 *
 * - append / rollover / new series (bar count changed, autoscroll fired)
 * - tick extends beyond the current y-range (axis must re-fit)
 * - percentage / indexedTo100 scale modes (range lives in transformed space,
 *   so a raw-price comparison is not valid)
 * - y-range not yet initialized (nothing rendered yet)
 *
 * Pure function — kept separate from ChartEngine so the decision logic is
 * unit-testable without a WebGL context.
 */
export const resolveTickRenderFlags = (
  input: TickRenderFlagsInput,
): number | null => {
  if (input.appended) {
    return null
  }

  if (input.changedBars.length === 0) {
    return null
  }

  if (
    input.priceScaleMode !== 'normal' &&
    input.priceScaleMode !== 'logarithmic'
  ) {
    return null
  }

  const { min, max } = input.currentYRange
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) {
    return null
  }

  for (const bar of input.changedBars) {
    if (!bar) {
      return null
    }
    if (bar.high > max || bar.low < min) {
      return null
    }
  }

  return (
    input.flagsBefore | DirtyFlags.LAST_BAR | DirtyFlags.OVERLAY | DirtyFlags.UI
  )
}
