export const DirtyFlags = {
  NONE: 0,
  GEOMETRY: 1 << 0,
  OVERLAY: 1 << 1,
  UI: 1 << 2,
  INDICATORS: 1 << 3,
  /** Viewport changed but data didn't — uniform-only update, no buffer rebuild. */
  VIEWPORT: 1 << 4,
  /**
   * Only the last bar mutated (same-bucket live tick) — incremental instance
   * update via bufferSubData, no full geometry rebuild. Superseded by
   * GEOMETRY/VIEWPORT when either is also dirty (full path wins).
   */
  LAST_BAR: 1 << 5,
  /** All full-rebuild flags (intentionally excludes LAST_BAR — GEOMETRY supersedes it). */
  ALL: (1 << 5) - 1,
} as const

export type DirtyFlag = number

export const hasDirtyFlag = (flags: DirtyFlag, flag: DirtyFlag): boolean => {
  return (flags & flag) !== 0
}
