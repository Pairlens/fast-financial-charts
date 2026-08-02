import type {
  MultiPaneLayout,
  PaneConfig,
  PaneId,
  PaneInput,
  PaneState,
} from '../../types/panes'

const DEFAULT_STRETCH_FACTOR = 1
const DEFAULT_MIN_HEIGHT = 60

const createPaneId = (): PaneId => {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return `pane_${crypto.randomUUID().slice(0, 8)}`
  }

  return `pane_${Math.random().toString(36).slice(2, 10)}`
}

/**
 * Manages N user panes below the main chart pane.
 *
 * - Panes are identified by unique PaneId strings.
 * - Heights are computed via stretch factors (proportional allocation).
 * - Separator drag adjusts stretch factors of adjacent panes.
 * - Main pane is NOT managed here — only user indicator/custom panes.
 */
export class PaneManager {
  private panes: Array<PaneConfig> = []

  private cachedLayout: MultiPaneLayout | null = null

  /** Fraction of total height reserved for user panes (default 0.28) */
  private userPanesRatio = 0.28

  // ── Public API ────────────────────────────────────────────────

  addPane(input?: PaneInput): PaneId {
    const id = input?.id ?? createPaneId()

    if (this.panes.some((p) => p.id === id)) {
      return id // already exists
    }

    this.panes.push({
      id,
      stretchFactor: input?.stretchFactor ?? DEFAULT_STRETCH_FACTOR,
      minHeight: input?.minHeight ?? DEFAULT_MIN_HEIGHT,
      priceScaleMode: input?.priceScaleMode,
      label: input?.label,
    })
    this.invalidateLayout()
    return id
  }

  removePane(paneId: PaneId): boolean {
    const index = this.panes.findIndex((p) => p.id === paneId)
    if (index === -1) {
      return false
    }

    this.panes.splice(index, 1)
    this.invalidateLayout()
    return true
  }

  swapPanes(paneId1: PaneId, paneId2: PaneId): boolean {
    const index1 = this.panes.findIndex((p) => p.id === paneId1)
    const index2 = this.panes.findIndex((p) => p.id === paneId2)
    if (index1 === -1 || index2 === -1 || index1 === index2) {
      return false
    }

    const temp = this.panes[index1]
    this.panes[index1] = this.panes[index2]
    this.panes[index2] = temp
    this.invalidateLayout()
    return true
  }

  updatePane(paneId: PaneId, patch: Partial<Omit<PaneConfig, 'id'>>): boolean {
    const pane = this.panes.find((p) => p.id === paneId)
    if (!pane) {
      return false
    }

    if (patch.stretchFactor !== undefined)
      pane.stretchFactor = patch.stretchFactor
    if (patch.minHeight !== undefined) pane.minHeight = patch.minHeight
    if (patch.priceScaleMode !== undefined)
      pane.priceScaleMode = patch.priceScaleMode
    if (patch.label !== undefined) pane.label = patch.label
    this.invalidateLayout()
    return true
  }

  getPanes(): ReadonlyArray<PaneConfig> {
    return this.panes
  }

  getPaneById(paneId: PaneId): PaneConfig | undefined {
    return this.panes.find((p) => p.id === paneId)
  }

  getPaneCount(): number {
    return this.panes.length
  }

  getUserPanesRatio(): number {
    return this.userPanesRatio
  }

  setUserPanesRatio(ratio: number): void {
    this.userPanesRatio = Math.max(0.12, Math.min(0.65, ratio))
    this.invalidateLayout()
  }

  /**
   * Set pane configurations from external source (e.g. props).
   * Replaces all existing panes.
   */
  setPanes(panes: Array<PaneInput>): void {
    this.panes = panes.map((input) => ({
      id: input.id ?? createPaneId(),
      stretchFactor: input.stretchFactor ?? DEFAULT_STRETCH_FACTOR,
      minHeight: input.minHeight ?? DEFAULT_MIN_HEIGHT,
      priceScaleMode: input.priceScaleMode,
      label: input.label,
    }))
    this.invalidateLayout()
  }

  // ── Layout Computation ────────────────────────────────────────

  /**
   * Compute the full multi-pane layout given the total container height.
   * Results are cached until invalidated by a mutation.
   */
  computeLayout(totalHeight: number): MultiPaneLayout {
    if (this.panes.length === 0) {
      return {
        mainHeight: Math.max(1, totalHeight),
        userPanes: [],
        userPanesHeight: 0,
        hasUserPanes: false,
        separatorPositions: [],
      }
    }

    const clampedRatio = Math.max(0.12, Math.min(0.65, this.userPanesRatio))
    const userPanesHeight = Math.max(
      this.panes.length * DEFAULT_MIN_HEIGHT,
      Math.floor(totalHeight * clampedRatio),
    )
    const mainHeight = Math.max(1, totalHeight - userPanesHeight)

    const userPanes = this.distributeHeights(userPanesHeight)
    const separatorPositions = this.computeSeparators(userPanes)

    const layout: MultiPaneLayout = {
      mainHeight,
      userPanes,
      userPanesHeight,
      hasUserPanes: true,
      separatorPositions,
    }

    this.cachedLayout = layout
    return layout
  }

  /**
   * Get the previously computed layout, or null if not yet computed.
   */
  getLayout(): MultiPaneLayout | null {
    return this.cachedLayout
  }

  /**
   * Handle dragging a separator between two adjacent user panes.
   * @param separatorIndex — index of the separator (0 = between pane[0] and pane[1])
   * @param deltaY — pixel delta to move (positive = separator moves down)
   * @param totalUserPanesHeight — total height available for user panes
   */
  handleSeparatorDrag(
    separatorIndex: number,
    deltaY: number,
    totalUserPanesHeight: number,
  ): void {
    if (separatorIndex < 0 || separatorIndex >= this.panes.length - 1) {
      return
    }

    const paneAbove = this.panes[separatorIndex]
    const paneBelow = this.panes[separatorIndex + 1]

    if (!this.cachedLayout) {
      return
    }

    const aboveState = this.cachedLayout.userPanes[separatorIndex]
    const belowState = this.cachedLayout.userPanes[separatorIndex + 1]
    if (!aboveState || !belowState) {
      return
    }

    const newAboveHeight = Math.max(
      paneAbove.minHeight,
      aboveState.height + deltaY,
    )
    const newBelowHeight = Math.max(
      paneBelow.minHeight,
      belowState.height - deltaY,
    )

    // Adjust stretch factors proportionally
    const totalFactors = paneAbove.stretchFactor + paneBelow.stretchFactor
    const combinedHeight = aboveState.height + belowState.height

    if (combinedHeight > 0) {
      paneAbove.stretchFactor = (newAboveHeight / combinedHeight) * totalFactors
      paneBelow.stretchFactor = (newBelowHeight / combinedHeight) * totalFactors
    }

    // Recompute layout with same total height
    this.computeLayout(this.cachedLayout.mainHeight + totalUserPanesHeight)
  }

  // ── Private ───────────────────────────────────────────────────

  private invalidateLayout(): void {
    this.cachedLayout = null
  }

  /**
   * Distribute available height among panes proportionally by stretch factor,
   * enforcing per-pane minimum heights with iterative clamping.
   * Guarantees the sum of heights never exceeds availableHeight.
   */
  private distributeHeights(availableHeight: number): Array<PaneState> {
    const count = this.panes.length
    if (count === 0) return []

    // Check if total minHeight exceeds budget — if so, distribute proportionally
    // without minHeight enforcement (container is simply too small)
    const totalMinHeight = this.panes.reduce((sum, p) => sum + p.minHeight, 0)
    if (totalMinHeight >= availableHeight) {
      let top = 0
      return this.panes.map((pane) => {
        const height = Math.max(
          1,
          Math.floor((pane.minHeight / totalMinHeight) * availableHeight),
        )
        const state: PaneState = {
          ...pane,
          top,
          height,
          priceRange: { min: 0, max: 1 },
        }
        top += height
        return state
      })
    }

    // Initial proportional allocation
    const totalFactor = this.panes.reduce((sum, p) => sum + p.stretchFactor, 0)
    const heights = this.panes.map(
      (p) => (p.stretchFactor / totalFactor) * availableHeight,
    )

    // Iterative clamping pass: clamp to minHeight, redistribute surplus
    let iterations = 0
    const maxIterations = count + 1

    while (iterations < maxIterations) {
      let surplus = 0
      let unclamped = 0
      let unclampedFactor = 0

      for (let i = 0; i < count; i++) {
        if (heights[i] < this.panes[i].minHeight) {
          surplus += this.panes[i].minHeight - heights[i]
          heights[i] = this.panes[i].minHeight
        } else {
          unclamped++
          unclampedFactor += this.panes[i].stretchFactor
        }
      }

      if (surplus <= 0 || unclamped === 0) break

      // Redistribute surplus proportionally among unclamped panes
      for (let i = 0; i < count; i++) {
        if (heights[i] > this.panes[i].minHeight) {
          heights[i] -=
            (surplus * this.panes[i].stretchFactor) / unclampedFactor
        }
      }

      iterations++
    }

    // Build PaneState objects with computed offsets.
    // Floor heights and distribute remainder to the last pane to guarantee
    // total sum does not exceed availableHeight.
    const flooredHeights = heights.map((h, i) =>
      Math.max(this.panes[i].minHeight, Math.floor(h)),
    )
    const flooredTotal = flooredHeights.reduce((sum, h) => sum + h, 0)
    const remainder = availableHeight - flooredTotal
    if (remainder > 0 && count > 0) {
      flooredHeights[count - 1] += remainder
    } else if (remainder < 0 && count > 0) {
      // Overshoot from rounding — trim from last pane (keeping minHeight)
      flooredHeights[count - 1] = Math.max(
        this.panes[count - 1].minHeight,
        flooredHeights[count - 1] + remainder,
      )
    }

    let top = 0
    return this.panes.map((pane, i) => {
      const state: PaneState = {
        ...pane,
        top,
        height: flooredHeights[i],
        priceRange: { min: 0, max: 1 },
      }
      top += flooredHeights[i]
      return state
    })
  }

  private computeSeparators(panes: Array<PaneState>): Array<number> {
    const separators: Array<number> = []
    for (let i = 0; i < panes.length - 1; i++) {
      separators.push(panes[i].top + panes[i].height)
    }
    return separators
  }
}
