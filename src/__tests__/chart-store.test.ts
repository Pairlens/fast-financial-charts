import { describe, expect, test } from 'bun:test'

import { ChartStore } from '../core/engine/chart-store'
import { makeBars } from './fixtures'

describe('chart store snapshots', () => {
  test('returns lightweight snapshot by default', () => {
    const store = new ChartStore({
      props: {
        series: [{ id: 'BTC-USD', bars: makeBars(20) }],
        timeframe: '1m',
        compareMode: 'indexed',
        indicators: [
          { type: 'EMA', seriesId: 'BTC-USD', params: { period: 20 } },
        ],
        drawings: [],
        activeTool: null,
        defaultViewport: { type: 'last-bars', bars: 20 },
        viewport: undefined,
        theme: undefined,
        performance: undefined,
        interaction: undefined,
        plugins: undefined,
      },
    })

    const lite = store.getSnapshot()
    expect('series' in lite).toBe(false)
    expect(lite.seriesCount).toBe(1)
  })

  test('returns full snapshot when series and indicator values requested', () => {
    const store = new ChartStore({
      props: {
        series: [{ id: 'BTC-USD', bars: makeBars(20) }],
        timeframe: '1m',
        compareMode: 'indexed',
        indicators: [
          {
            id: 'ema_1',
            type: 'EMA',
            seriesId: 'BTC-USD',
            params: { period: 20 },
          },
        ],
        drawings: [],
        activeTool: null,
        defaultViewport: { type: 'last-bars', bars: 20 },
        viewport: undefined,
        theme: undefined,
        performance: undefined,
        interaction: undefined,
        plugins: undefined,
      },
    })

    store.setIndicatorComputations([
      {
        indicator: {
          id: 'ema_1',
          type: 'EMA',
          seriesId: 'BTC-USD',
          params: { period: 20 },
          pane: 'overlay',
          color: '#4aa8ff',
          visible: true,
        },
        values: [{ ts: makeBars(1)[0].ts, value: 10 }],
        computedAt: Date.now(),
      },
    ])

    const full = store.getSnapshot({
      includeSeries: true,
      includeIndicatorValues: true,
    })

    expect('series' in full).toBe(true)
    if ('series' in full) {
      expect(full.series).toHaveLength(1)
      expect(full.indicatorResults).toHaveLength(1)
    }
  })
})
