import type { NumericRange } from './data'
import type { PriceScaleMode } from './viewport'

/**
 * Unique identifier for a user-created pane.
 * The main chart pane is never referenced by a PaneId — it's always implicit.
 */
export type PaneId = string

/**
 * Configuration for a user pane (below the main chart pane).
 */
export type PaneConfig = {
  /** Unique pane identifier */
  id: PaneId
  /** Relative height weight among sibling panes (default 1) */
  stretchFactor: number
  /** Minimum height in pixels (default 60) */
  minHeight: number
  /** Optional per-pane price scale mode override */
  priceScaleMode?: PriceScaleMode
  /** Optional label rendered in the pane header area */
  label?: string
}

/**
 * Runtime state for a resolved pane, with computed layout values.
 */
export type PaneState = PaneConfig & {
  /** Computed pixel offset from the top of the indicator container */
  top: number
  /** Computed pixel height */
  height: number
  /** Per-pane price range (computed from assigned indicators) */
  priceRange: NumericRange
}

/**
 * Complete layout describing all panes.
 */
export type MultiPaneLayout = {
  /** The main WebGL chart pane (always at top, not managed by PaneManager) */
  mainHeight: number
  /** User panes (below main), in order */
  userPanes: Array<PaneState>
  /** Total height of all user panes combined */
  userPanesHeight: number
  /** Has at least one visible user pane */
  hasUserPanes: boolean
  /** Y positions of separator lines between adjacent user panes */
  separatorPositions: Array<number>
}

/**
 * Input for creating a new pane (id and some fields are optional).
 */
export type PaneInput = {
  id?: string
  stretchFactor?: number
  minHeight?: number
  priceScaleMode?: PriceScaleMode
  label?: string
}
