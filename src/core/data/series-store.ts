import { applyTickToBars } from './tick-aggregator'
import type {
  BarAppendUpdate,
  ChartSeriesInput,
  SeriesReplaceUpdate,
  TickUpdate,
  Timeframe,
} from '../../types'

export class SeriesStore {
  private readonly series = new Map<string, ChartSeriesInput>()

  private readonly order: Array<string> = []

  constructor(initialSeries: Array<ChartSeriesInput> = []) {
    this.replaceSeries({ series: initialSeries })
  }

  replaceSeries(update: SeriesReplaceUpdate): void {
    this.series.clear()
    this.order.length = 0

    for (const item of update.series) {
      this.series.set(item.id, {
        ...item,
        bars: item.bars.slice(),
      })
      this.order.push(item.id)
    }
  }

  replaceSeriesIfChanged(update: SeriesReplaceUpdate): boolean {
    const current = this.getSeriesRefs()
    if (current.length !== update.series.length) {
      this.replaceSeries(update)
      return true
    }

    for (let index = 0; index < update.series.length; index += 1) {
      if (current[index] !== update.series[index]) {
        this.replaceSeries(update)
        return true
      }
    }

    return false
  }

  upsertSeries(input: ChartSeriesInput): void {
    this.series.set(input.id, {
      ...input,
      bars: input.bars.slice(),
    })

    if (!this.order.includes(input.id)) {
      this.order.push(input.id)
    }
  }

  applyTick(
    update: TickUpdate,
    timeframe: Timeframe,
  ): { appended: boolean; changedIndex: number } {
    const series = this.series.get(update.seriesId)

    if (!series) {
      const nextSeries: ChartSeriesInput = {
        id: update.seriesId,
        bars: [],
      }
      this.upsertSeries(nextSeries)
    }

    const target = this.series.get(update.seriesId)

    if (!target) {
      return {
        appended: false,
        changedIndex: -1,
      }
    }

    const aggregated = applyTickToBars(target.bars, update, timeframe)

    return {
      appended: aggregated.appended,
      changedIndex: aggregated.changedIndex,
    }
  }

  appendBar(update: BarAppendUpdate): void {
    const target = this.series.get(update.seriesId)

    if (!target) {
      this.upsertSeries({
        id: update.seriesId,
        bars: [update.bar],
      })
      return
    }

    target.bars.push(update.bar)
  }

  getSeries(options?: { clone?: boolean }): Array<ChartSeriesInput> {
    const clone = options?.clone ?? true
    return this.order
      .map((id) => this.series.get(id))
      .filter((value): value is ChartSeriesInput => Boolean(value))
      .map((item) => {
        if (!clone) {
          return item
        }

        return {
          ...item,
          bars: item.bars.slice(),
        }
      })
  }

  getSeriesById(
    id: string,
    options?: { clone?: boolean },
  ): ChartSeriesInput | undefined {
    const clone = options?.clone ?? true
    const series = this.series.get(id)

    if (!series) {
      return undefined
    }

    if (!clone) {
      return series
    }

    return {
      ...series,
      bars: series.bars.slice(),
    }
  }

  getPrimarySeries(options?: {
    clone?: boolean
  }): ChartSeriesInput | undefined {
    const primaryId = this.order[0]
    if (!primaryId) {
      return undefined
    }

    return this.getSeriesById(primaryId, options)
  }

  getSeriesRefs(): Array<ChartSeriesInput> {
    return this.getSeries({ clone: false })
  }

  getPrimarySeriesRef(): ChartSeriesInput | undefined {
    return this.getPrimarySeries({ clone: false })
  }

  /**
   * Get the rendering order of series IDs.
   */
  getSeriesOrder(): Array<string> {
    return this.order.slice()
  }

  /**
   * Reorder series by providing the desired order of IDs.
   * IDs not in the list are appended at the end; invalid IDs are ignored.
   */
  setSeriesOrder(orderedIds: Array<string>): void {
    const seen = new Set<string>()
    const next: Array<string> = []

    for (const id of orderedIds) {
      if (this.series.has(id) && !seen.has(id)) {
        next.push(id)
        seen.add(id)
      }
    }

    // Append any remaining series not in the provided list
    for (const id of this.order) {
      if (!seen.has(id)) {
        next.push(id)
      }
    }

    this.order.length = 0
    this.order.push(...next)
  }

  /**
   * Remove the last `count` bars from a series.
   */
  popBars(seriesId: string, count: number): number {
    const series = this.series.get(seriesId)
    if (!series || count <= 0) return 0

    const removed = Math.min(count, series.bars.length)
    series.bars.splice(series.bars.length - removed, removed)
    return removed
  }
}
