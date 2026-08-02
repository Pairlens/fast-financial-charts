import type { IndicatorInstance } from '../../types'
import type { PaneManager } from '../engine/pane-manager'

export type PaneLayout = {
  mainHeight: number
  indicatorHeight: number
  hasIndicatorPane: boolean
}

/**
 * Legacy 2-pane layout computation (main + single indicator pane).
 * Kept for backward compatibility when no PaneManager is present.
 */
export const computePaneLayout = (
  totalHeight: number,
  indicators: Array<IndicatorInstance>,
  indicatorRatio = 0.28,
): PaneLayout => {
  const hasSeparate = indicators.some(
    (indicator) => indicator.pane === 'separate' && indicator.visible,
  )

  if (!hasSeparate) {
    return {
      mainHeight: Math.max(1, totalHeight),
      indicatorHeight: 0,
      hasIndicatorPane: false,
    }
  }

  const clampedRatio = Math.max(0.12, Math.min(0.65, indicatorRatio))
  const indicatorHeight = Math.max(120, Math.floor(totalHeight * clampedRatio))

  return {
    mainHeight: Math.max(1, totalHeight - indicatorHeight),
    indicatorHeight,
    hasIndicatorPane: true,
  }
}

/**
 * Multi-pane layout computation.
 * Delegates to PaneManager when user panes exist, or falls back to legacy
 * 2-pane layout when only 'overlay' / 'separate' indicators are used.
 */
export const computeMultiPaneLayout = (
  totalHeight: number,
  indicators: Array<IndicatorInstance>,
  paneManager: PaneManager,
): PaneLayout => {
  // If the PaneManager has explicit panes, use it
  if (paneManager.getPaneCount() > 0) {
    const multiLayout = paneManager.computeLayout(totalHeight)
    return {
      mainHeight: multiLayout.mainHeight,
      indicatorHeight: multiLayout.userPanesHeight,
      hasIndicatorPane: multiLayout.hasUserPanes,
    }
  }

  // Otherwise check if any indicators need a 'separate' pane (legacy behavior)
  const hasSeparate = indicators.some(
    (indicator) => indicator.visible && indicator.pane === 'separate',
  )

  if (!hasSeparate) {
    return {
      mainHeight: Math.max(1, totalHeight),
      indicatorHeight: 0,
      hasIndicatorPane: false,
    }
  }

  // Auto-create a default pane when legacy 'separate' indicators exist
  // but no explicit panes were configured
  const ratio = paneManager.getUserPanesRatio()
  const clampedRatio = Math.max(0.12, Math.min(0.65, ratio))
  const indicatorHeight = Math.max(120, Math.floor(totalHeight * clampedRatio))

  return {
    mainHeight: Math.max(1, totalHeight - indicatorHeight),
    indicatorHeight,
    hasIndicatorPane: true,
  }
}
