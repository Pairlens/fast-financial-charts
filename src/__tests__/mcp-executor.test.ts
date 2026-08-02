import { describe, expect, test } from 'bun:test'

import { ChartMcpExecutor } from '../core/mcp/executor'
import type { ChartCommand, FastFinancialChartRef } from '../types'

const createController = () => {
  const commands: Array<ChartCommand> = []
  const appliedTicks: Array<{
    seriesId: string
    ts: number
    price: number
    volume?: number
  }> = []
  const appliedTickBatches: Array<
    Array<{ seriesId: string; ts: number; price: number; volume?: number }>
  > = []

  const controller: FastFinancialChartRef = {
    applyTick: (update) => {
      appliedTicks.push(update)
    },
    applyTicks: (updates) => {
      appliedTickBatches.push(updates)
    },
    appendBar: () => undefined,
    setSeries: () => undefined,
    executeCommand: (command) => {
      commands.push(command)
      return {
        ok: true,
        result: command.type,
      }
    },
    getSnapshot: () => ({
      timeframe: '1m',
      compareMode: 'indexed',
      chartType: 'candles',
      viewport: { startIndex: 0, endIndex: 1 },
      indicators: [],
      drawings: [],
      selectedDrawingId: null,
      activeTool: null,
      hoveredBarTs: null,
      performance: {
        maxFps: 60,
        enableHiDpi: true,
        indicatorWorker: true,
        viewportMinBars: 20,
      },
      theme: {
        background: '#000000',
        grid: '#111111',
        axisText: '#222222',
        axisBackground: '#333333',
        upCandle: '#00d084',
        downCandle: '#ff4f64',
        crosshair: '#4aa8ff',
        selection: '#4aa8ff66',
        drawingHandle: '#f8fafc',
        hudBg: '#111925dd',
        hudText: '#f8fafc',
        fontFamilyMono: 'monospace',
        fontSizeAxis: 11,
        fontSizeHud: 10,
        menuZ: 50,
        indicator: {
          macd: {
            signal: '#ffb020',
            histogramUp: '#00d08455',
            histogramDown: '#ff4f6460',
            zeroLine: '#8ea0bc55',
          },
          rsi: { guide: '#8b7dff55' },
          volume: { up: '#00d08455', down: '#ff4f6455' },
        },
      },
      seriesCount: 1,
    }),
    getMcpSchema: () => [],
    subscribe: () => () => undefined,
    getCapabilities: () => ({
      chartTypes: ['candles', 'heikinAshi', 'line', 'area'],
      compareModes: ['indexed', 'price', 'dual-axis'],
      drawingTools: ['line'],
      indicatorTypes: ['EMA'],
      mcpTools: ['applyTick'],
    }),
  }

  return {
    controller,
    commands,
    appliedTicks,
    appliedTickBatches,
  }
}

describe('mcp executor', () => {
  test('validates applyTick payloads', () => {
    const { controller, appliedTicks } = createController()
    const executor = new ChartMcpExecutor()
    executor.bindController(controller)

    expect(() =>
      executor.execute('applyTick', { seriesId: 'BTC-USD', ts: 1 }),
    ).toThrow()

    executor.execute('applyTick', {
      seriesId: 'BTC-USD',
      ts: 1,
      price: 100,
      volume: 2,
    })

    expect(appliedTicks).toHaveLength(1)
    expect(appliedTicks[0].seriesId).toBe('BTC-USD')
  })

  test('routes applyTicks directly to batch API', () => {
    const { controller, appliedTickBatches } = createController()
    const executor = new ChartMcpExecutor()
    executor.bindController(controller)

    executor.execute('applyTicks', {
      updates: [
        { seriesId: 'BTC-USD', ts: 1, price: 100 },
        { seriesId: 'BTC-USD', ts: 2, price: 101 },
      ],
    })

    expect(appliedTickBatches).toHaveLength(1)
    expect(appliedTickBatches[0]).toHaveLength(2)
  })

  test('rejects invalid event names for subscribeEvents', () => {
    const { controller } = createController()
    const executor = new ChartMcpExecutor()
    executor.bindController(controller)

    expect(() =>
      executor.execute('subscribeEvents', { events: ['invalid.event'] }),
    ).toThrow()
  })
})
