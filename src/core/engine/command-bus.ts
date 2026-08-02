import type { ChartStore } from './chart-store'
import type {
  ChartCapabilities,
  ChartCommand,
  ChartCommandResult,
  ChartEvent,
  ChartSnapshot,
  DrawingObject,
  IndicatorComputation,
} from '../../types'

export type CommandBusAdapters = {
  getVisibleData: (snapshot: ChartSnapshot, limit?: number) => unknown
  screenshot: () => unknown
  getCapabilities: () => ChartCapabilities
  subscribeEvents: (events: Array<ChartEvent['type']>) => {
    subscriptionId: string
  }
  unsubscribeEvents: (events: Array<ChartEvent['type']>) => { removed: number }
  undo: () => void
  redo: () => void
  resetDrawingHistory: () => void
}

const toFailure = (error: string): ChartCommandResult => ({
  ok: false,
  error,
})

export class CommandBus {
  private readonly store: ChartStore

  private readonly adapters: CommandBusAdapters

  constructor(store: ChartStore, adapters: CommandBusAdapters) {
    this.store = store
    this.adapters = adapters
  }

  execute(command: ChartCommand): ChartCommandResult {
    try {
      switch (command.type) {
        case 'addIndicator': {
          const indicator = this.store.addIndicator(command.payload)
          return this.store.executeResult(indicator)
        }
        case 'removeIndicator': {
          this.store.removeIndicator(command.payload.id)
          return this.store.executeResult({ removed: command.payload.id })
        }
        case 'removeAllIndicators': {
          this.store.removeAllIndicators()
          return this.store.executeResult({ removed: true })
        }
        case 'addDrawing': {
          const drawing: DrawingObject = {
            ...command.payload,
            id:
              command.payload.id ??
              `draw_${Math.random().toString(36).slice(2, 9)}`,
          } as DrawingObject
          this.store.addDrawing(drawing)
          return this.store.executeResult(drawing)
        }
        case 'updateDrawing': {
          this.store.patchDrawing(command.payload.id, command.payload.patch)
          return this.store.executeResult({ updated: command.payload.id })
        }
        case 'removeDrawing': {
          this.store.removeDrawing(command.payload.id)
          return this.store.executeResult({ removed: command.payload.id })
        }
        case 'clearDrawings': {
          this.store.clearDrawings()
          return this.store.executeResult({ cleared: true })
        }
        case 'setDrawings': {
          this.store.setDrawings(command.payload.drawings)
          // After the replace so the history reset captures the new state as
          // the baseline (the replace itself pushes an undo entry first).
          if (command.payload.resetHistory) {
            this.adapters.resetDrawingHistory()
          }
          return this.store.executeResult({
            count: command.payload.drawings.length,
          })
        }
        case 'setViewport': {
          this.store.setViewport(command.payload)
          return this.store.executeResult(this.store.getSnapshot().viewport)
        }
        case 'scrollToLatest': {
          this.store.scrollToLatest(command.payload?.bars)
          return this.store.executeResult(this.store.getSnapshot().viewport)
        }
        case 'setCompareMode': {
          this.store.setCompareMode(command.payload.compareMode)
          return this.store.executeResult({
            compareMode: command.payload.compareMode,
          })
        }
        case 'setChartType': {
          this.store.setChartType(command.payload.chartType)
          return this.store.executeResult({
            chartType: command.payload.chartType,
          })
        }
        case 'getVisibleData': {
          const snapshot = this.store.getSnapshot({
            includeSeries: true,
            includeIndicatorValues: false,
          })
          if (!('series' in snapshot)) {
            return toFailure('Chart series snapshot unavailable')
          }
          return this.store.executeResult(
            this.adapters.getVisibleData(snapshot, command.payload?.limit),
          )
        }
        case 'getChartState': {
          return this.store.executeResult(
            this.store.getSnapshot({
              includeSeries: true,
              includeIndicatorValues: true,
            }),
          )
        }
        case 'getIndicatorValue': {
          const computation = this.store.getSnapshot({
            includeIndicatorValues: true,
            includeSeries: false,
          })
          if (!('indicatorResults' in computation)) {
            return toFailure(`Indicator ${command.payload.id} not found`)
          }

          const indicatorComputation = computation.indicatorResults.find(
            (result) => result.indicator.id === command.payload.id,
          )
          if (!indicatorComputation) {
            return toFailure(`Indicator ${command.payload.id} not found`)
          }

          const value = resolveIndicatorValue(
            indicatorComputation,
            command.payload.ts,
          )
          return this.store.executeResult(value)
        }
        case 'getDrawingState': {
          return this.store.executeResult(this.store.getSnapshot().drawings)
        }
        case 'applyTick': {
          return this.store.executeResult(this.store.applyTick(command.payload))
        }
        case 'applyTicks': {
          return this.store.executeResult(
            this.store.applyTicks(command.payload.updates),
          )
        }
        case 'appendBar': {
          this.store.appendBar(command.payload)
          return this.store.executeResult({ appended: true })
        }
        case 'replaceSeries': {
          this.store.replaceSeries(command.payload)
          return this.store.executeResult({
            replaced: command.payload.series.length,
          })
        }
        case 'setActiveTool': {
          this.store.setActiveTool(command.payload.tool, command.payload.meta)
          return this.store.executeResult({ activeTool: command.payload.tool })
        }
        case 'getCapabilities': {
          return this.store.executeResult(this.adapters.getCapabilities())
        }
        case 'subscribeEvents': {
          return this.store.executeResult(
            this.adapters.subscribeEvents(command.payload.events),
          )
        }
        case 'unsubscribeEvents': {
          return this.store.executeResult(
            this.adapters.unsubscribeEvents(command.payload.events),
          )
        }
        case 'screenshot': {
          return this.store.executeResult(this.adapters.screenshot())
        }
        case 'undo': {
          this.adapters.undo()
          return this.store.executeResult({ undone: true })
        }
        case 'redo': {
          this.adapters.redo()
          return this.store.executeResult({ redone: true })
        }
        case 'updateIndicator': {
          this.store.updateIndicator(command.payload.id, command.payload)
          return this.store.executeResult({ updated: command.payload.id })
        }
        case 'setTheme': {
          this.store.updateTheme(command.payload.theme)
          return this.store.executeResult({ themeUpdated: true })
        }
        case 'setPriceScaleMode': {
          this.store.setPriceScaleMode(command.payload.mode)
          return this.store.executeResult({
            priceScaleMode: command.payload.mode,
          })
        }
        default:
          return toFailure(
            `Unsupported command: ${(command as ChartCommand).type}`,
          )
      }
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown command error',
      }
    }
  }
}

const resolveIndicatorValue = (
  computation: IndicatorComputation,
  ts?: number,
): unknown => {
  if (computation.values.length === 0) {
    return null
  }

  if (!ts) {
    return computation.values[computation.values.length - 1]
  }

  const index = computation.values.findIndex((value) => value.ts >= ts)
  if (index === -1) {
    return computation.values[computation.values.length - 1]
  }

  return computation.values[index]
}
