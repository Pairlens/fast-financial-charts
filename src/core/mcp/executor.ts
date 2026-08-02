import { createMcpToolSchemas } from './schema'
import type {
  BarAppendUpdate,
  ChartEvent,
  ChartMCP,
  ChartType,
  ChartViewport,
  DrawingObject,
  FastFinancialChartRef,
  IndicatorInstanceInput,
  MCPToolSchema,
  SeriesReplaceUpdate,
  TickUpdate,
} from '../../types'

const assertObject = (
  input: unknown,
  toolName: string,
): Record<string, unknown> => {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new Error(`${toolName}: params must be an object`)
  }

  return input as Record<string, unknown>
}

const asString = (
  value: unknown,
  field: string,
  toolName: string,
  options?: { required?: boolean },
): string | undefined => {
  if (value === undefined || value === null) {
    if (options?.required) {
      throw new Error(`${toolName}: ${field} is required`)
    }
    return undefined
  }

  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${toolName}: ${field} must be a non-empty string`)
  }

  return value
}

const asNumber = (
  value: unknown,
  field: string,
  toolName: string,
  options?: { required?: boolean },
): number | undefined => {
  if (value === undefined || value === null) {
    if (options?.required) {
      throw new Error(`${toolName}: ${field} is required`)
    }
    return undefined
  }

  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${toolName}: ${field} must be a finite number`)
  }

  return value
}

const asArray = <T>(
  value: unknown,
  field: string,
  toolName: string,
  validator: (entry: unknown, index: number) => T,
): Array<T> => {
  if (!Array.isArray(value)) {
    throw new Error(`${toolName}: ${field} must be an array`)
  }

  return value.map((entry, index) => validator(entry, index))
}

const asTick = (value: unknown, toolName: string): TickUpdate => {
  const payload = assertObject(value, toolName)
  return {
    seriesId: asString(payload.seriesId, 'seriesId', toolName, {
      required: true,
    })!,
    ts: asNumber(payload.ts, 'ts', toolName, { required: true })!,
    price: asNumber(payload.price, 'price', toolName, { required: true })!,
    volume: asNumber(payload.volume, 'volume', toolName),
  }
}

export class ChartMcpExecutor implements ChartMCP {
  private controller: FastFinancialChartRef | null = null

  private readonly schema: Array<MCPToolSchema> = createMcpToolSchemas()

  getSchema(): Array<MCPToolSchema> {
    return this.schema.slice()
  }

  bindController(ref: FastFinancialChartRef | null): void {
    this.controller = ref
  }

  execute(toolName: string, params: unknown): unknown {
    if (!this.controller) {
      throw new Error('Chart controller is not bound to MCP executor')
    }

    const payload = assertObject(params ?? {}, toolName)

    if (toolName === 'applyTick') {
      this.controller.applyTick(asTick(payload, toolName))
      return { ok: true }
    }

    if (toolName === 'applyTicks') {
      const updates = asArray(payload.updates, 'updates', toolName, (entry) =>
        asTick(entry, toolName),
      )
      this.controller.applyTicks(updates)
      return { ok: true, count: updates.length }
    }

    if (toolName === 'appendBar') {
      const seriesId = asString(payload.seriesId, 'seriesId', toolName, {
        required: true,
      })!
      const bar = assertObject(
        payload.bar,
        toolName,
      ) as unknown as BarAppendUpdate['bar']
      this.controller.appendBar({ seriesId, bar })
      return { ok: true }
    }

    if (toolName === 'replaceSeries') {
      if (!Array.isArray(payload.series)) {
        throw new Error(`${toolName}: series must be an array`)
      }
      this.controller.setSeries(payload as unknown as SeriesReplaceUpdate)
      return { ok: true }
    }

    const result = (() => {
      switch (toolName) {
        case 'addIndicator':
          return this.controller?.executeCommand({
            type: 'addIndicator',
            payload: payload as unknown as IndicatorInstanceInput,
          })
        case 'removeIndicator':
          return this.controller?.executeCommand({
            type: 'removeIndicator',
            payload: {
              id: asString(payload.id, 'id', toolName, { required: true })!,
            },
          })
        case 'removeAllIndicators':
          return this.controller?.executeCommand({
            type: 'removeAllIndicators',
            payload: {},
          })
        case 'addDrawing':
          return this.controller?.executeCommand({
            type: 'addDrawing',
            payload: payload as unknown as Omit<DrawingObject, 'id'>,
          })
        case 'updateDrawing':
          return this.controller?.executeCommand({
            type: 'updateDrawing',
            payload: {
              id: asString(payload.id, 'id', toolName, { required: true })!,
              patch: assertObject(
                payload.patch,
                toolName,
              ) as Partial<DrawingObject>,
            },
          })
        case 'removeDrawing':
          return this.controller?.executeCommand({
            type: 'removeDrawing',
            payload: {
              id: asString(payload.id, 'id', toolName, { required: true })!,
            },
          })
        case 'clearDrawings':
          return this.controller?.executeCommand({
            type: 'clearDrawings',
            payload: {},
          })
        case 'setViewport':
          return this.controller?.executeCommand({
            type: 'setViewport',
            payload: {
              startIndex: asNumber(payload.startIndex, 'startIndex', toolName, {
                required: true,
              })!,
              endIndex: asNumber(payload.endIndex, 'endIndex', toolName, {
                required: true,
              })!,
            } as ChartViewport,
          })
        case 'scrollToLatest':
          return this.controller?.executeCommand({
            type: 'scrollToLatest',
            payload: { bars: asNumber(payload.bars, 'bars', toolName) },
          })
        case 'setCompareMode': {
          const compareMode = asString(
            payload.compareMode,
            'compareMode',
            toolName,
            { required: true },
          )
          if (
            compareMode !== 'indexed' &&
            compareMode !== 'price' &&
            compareMode !== 'dual-axis'
          ) {
            throw new Error(
              `${toolName}: compareMode must be indexed, price, or dual-axis`,
            )
          }
          return this.controller?.executeCommand({
            type: 'setCompareMode',
            payload: { compareMode },
          })
        }
        case 'setChartType': {
          const chartType = asString(payload.chartType, 'chartType', toolName, {
            required: true,
          })
          const validChartTypes: Array<ChartType> = [
            'candles',
            'heikinAshi',
            'hollowCandles',
            'line',
            'stepLine',
            'area',
            'hlcArea',
            'bar',
            'highLow',
            'baseline',
            'histogram',
            'column',
            'renko',
            'lineBreak',
            'kagi',
            'pointFigure',
          ]
          if (!chartType || !validChartTypes.includes(chartType as ChartType)) {
            throw new Error(
              `${toolName}: chartType must be one of ${validChartTypes.join(', ')}`,
            )
          }
          return this.controller?.executeCommand({
            type: 'setChartType',
            payload: {
              chartType: chartType as ChartType,
            },
          })
        }
        case 'getVisibleData':
          return this.controller?.executeCommand({
            type: 'getVisibleData',
            payload: { limit: asNumber(payload.limit, 'limit', toolName) },
          })
        case 'getChartState':
          return this.controller?.executeCommand({
            type: 'getChartState',
            payload: {},
          })
        case 'getIndicatorValue':
          return this.controller?.executeCommand({
            type: 'getIndicatorValue',
            payload: {
              id: asString(payload.id, 'id', toolName, { required: true })!,
              ts: asNumber(payload.ts, 'ts', toolName),
            },
          })
        case 'getDrawingState':
          return this.controller?.executeCommand({
            type: 'getDrawingState',
            payload: {},
          })
        case 'getCapabilities':
          return this.controller?.executeCommand({
            type: 'getCapabilities',
            payload: {},
          })
        case 'subscribeEvents': {
          const events = asArray(
            payload.events,
            'events',
            toolName,
            (entry) => {
              const eventName = asString(entry, 'events[]', toolName, {
                required: true,
              })
              const allowed: Array<ChartEvent['type']> = [
                'contextmenu',
                'hover',
                'hudUpdate',
                'drawingsChange',
                'indicatorsChange',
                'stateChange',
                'indicatorComputeComplete',
              ]
              if (
                !eventName ||
                !allowed.includes(eventName as ChartEvent['type'])
              ) {
                throw new Error(
                  `${toolName}: invalid event name ${String(entry)}`,
                )
              }
              return eventName as ChartEvent['type']
            },
          )
          return this.controller?.executeCommand({
            type: 'subscribeEvents',
            payload: { events },
          })
        }
        case 'unsubscribeEvents': {
          const events = asArray(
            payload.events,
            'events',
            toolName,
            (entry) => {
              const eventName = asString(entry, 'events[]', toolName, {
                required: true,
              })
              if (!eventName) {
                throw new Error(`${toolName}: invalid event name`)
              }
              return eventName as ChartEvent['type']
            },
          )
          return this.controller?.executeCommand({
            type: 'unsubscribeEvents',
            payload: { events },
          })
        }
        case 'screenshot':
          return this.controller?.executeCommand({
            type: 'screenshot',
            payload: {},
          })
        case 'undo':
          return this.controller?.executeCommand({
            type: 'undo',
            payload: {},
          })
        case 'redo':
          return this.controller?.executeCommand({
            type: 'redo',
            payload: {},
          })
        case 'updateIndicator':
          return this.controller?.executeCommand({
            type: 'updateIndicator',
            payload: {
              id: asString(payload.id, 'id', toolName, { required: true })!,
              params: payload.params as
                | Record<string, boolean | number | string>
                | undefined,
              color: asString(payload.color, 'color', toolName),
              visible: payload.visible as boolean | undefined,
              pane: asString(payload.pane, 'pane', toolName) as
                | 'overlay'
                | 'separate'
                | undefined,
            },
          })
        case 'setTheme':
          return this.controller?.executeCommand({
            type: 'setTheme',
            payload: {
              theme: assertObject(payload.theme, toolName),
            },
          })
        case 'setPriceScaleMode': {
          const mode = asString(payload.mode, 'mode', toolName, {
            required: true,
          })
          if (
            mode !== 'normal' &&
            mode !== 'logarithmic' &&
            mode !== 'percentage' &&
            mode !== 'indexedTo100'
          ) {
            throw new Error(
              `${toolName}: mode must be normal, logarithmic, percentage, or indexedTo100`,
            )
          }
          return this.controller?.executeCommand({
            type: 'setPriceScaleMode',
            payload: { mode },
          })
        }
        case 'fitContent':
          return this.controller?.executeCommand({
            type: 'fitContent',
          })
        case 'scrollToPosition':
          return this.controller?.executeCommand({
            type: 'scrollToPosition',
            payload: {
              barIndex: asNumber(payload.barIndex, 'barIndex', toolName, {
                required: true,
              })!,
              animated: payload.animated as boolean | undefined,
            },
          })
        case 'priceToCoordinate':
          return this.controller?.executeCommand({
            type: 'priceToCoordinate',
            payload: {
              price: asNumber(payload.price, 'price', toolName, {
                required: true,
              })!,
            },
          })
        case 'coordinateToPrice':
          return this.controller?.executeCommand({
            type: 'coordinateToPrice',
            payload: {
              y: asNumber(payload.y, 'y', toolName, { required: true })!,
            },
          })
        case 'timeToCoordinate':
          return this.controller?.executeCommand({
            type: 'timeToCoordinate',
            payload: {
              ts: asNumber(payload.ts, 'ts', toolName, { required: true })!,
            },
          })
        case 'coordinateToTime':
          return this.controller?.executeCommand({
            type: 'coordinateToTime',
            payload: {
              x: asNumber(payload.x, 'x', toolName, { required: true })!,
            },
          })
        case 'getData':
          return this.controller?.executeCommand({
            type: 'getData',
            payload: {
              seriesId: asString(payload.seriesId, 'seriesId', toolName),
              limit: asNumber(payload.limit, 'limit', toolName),
              offset: asNumber(payload.offset, 'offset', toolName),
            },
          })
        case 'getDataByIndex':
          return this.controller?.executeCommand({
            type: 'getDataByIndex',
            payload: {
              index: asNumber(payload.index, 'index', toolName, {
                required: true,
              })!,
              seriesId: asString(payload.seriesId, 'seriesId', toolName),
            },
          })
        case 'popBars':
          return this.controller?.executeCommand({
            type: 'popBars',
            payload: {
              count: asNumber(payload.count, 'count', toolName, {
                required: true,
              })!,
              seriesId: asString(payload.seriesId, 'seriesId', toolName),
            },
          })
        case 'getSeriesOrder':
          return this.controller?.executeCommand({
            type: 'getSeriesOrder',
          })
        case 'setSeriesOrder': {
          const orderedIds = asArray(
            payload.orderedIds,
            'orderedIds',
            toolName,
            (entry) => {
              const id = asString(entry, 'orderedIds[]', toolName, {
                required: true,
              })
              if (!id)
                throw new Error(
                  `${toolName}: orderedIds[] must be non-empty strings`,
                )
              return id
            },
          )
          return this.controller?.executeCommand({
            type: 'setSeriesOrder',
            payload: { orderedIds },
          })
        }
        case 'takeScreenshot':
          return this.controller?.executeCommand({
            type: 'takeScreenshot',
            payload: {
              includeCrosshair: payload.includeCrosshair as boolean | undefined,
              includeOverlays: payload.includeOverlays as boolean | undefined,
            },
          })
        default:
          throw new Error(`Unsupported MCP tool: ${toolName}`)
      }
    })()

    if (!result?.ok) {
      throw new Error(result?.error ?? `MCP command failed: ${toolName}`)
    }

    return result.result
  }
}
