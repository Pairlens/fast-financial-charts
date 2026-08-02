import { describe, expect, test } from 'bun:test'

import {
  computeCustomIndicator,
  isCustomIndicatorType,
} from '../core/indicators/custom-compute'
import { createDefaultIndicatorRegistry } from '../core/indicators/registry'
import { resolveCustomSeriesColor } from '../core/indicators/presenters/custom-series-presenter'
import { DARK_THEME_TOKENS } from '../core/theme/tokens'
import { makeBars } from './fixtures'
import type {
  IndicatorDefinition,
  IndicatorInstance,
  IndicatorWorkerRequest,
} from '../types'

const makeInstance = (type: IndicatorInstance['type']): IndicatorInstance => ({
  id: 'ind_custom_1',
  type,
  seriesId: 'primary',
  params: { period: 5 },
  pane: 'separate',
  color: '#4aa8ff',
  visible: true,
})

const makeRequest = (
  type: IndicatorInstance['type'],
): IndicatorWorkerRequest => ({
  requestId: 'req_1',
  indicator: makeInstance(type),
  bars: makeBars(20),
  timeframeMs: 60_000,
})

const noopPresenter = () => {}

describe('isCustomIndicatorType', () => {
  test('detects custom-prefixed types', () => {
    expect(isCustomIndicatorType('custom:py-momentum')).toBe(true)
    expect(isCustomIndicatorType('EMA')).toBe(false)
    expect(isCustomIndicatorType('MACD')).toBe(false)
  })
})

describe('computeCustomIndicator', () => {
  test('awaits an async compute and returns worker-shaped values', async () => {
    const definition: IndicatorDefinition = {
      type: 'custom:py-momentum',
      pane: 'separate',
      compute: async ({ bars, params }) => {
        await Promise.resolve()
        const period = Number(params.period)
        return bars.map((bar) => ({ ts: bar.ts, value: bar.close * period }))
      },
      presenter: noopPresenter,
      supportsIncremental: false,
    }

    const request = makeRequest('custom:py-momentum')
    const response = await computeCustomIndicator(definition, request)

    expect(response.error).toBeUndefined()
    expect(response.requestId).toBe('req_1')
    expect(response.indicatorId).toBe('ind_custom_1')
    expect(response.values).toHaveLength(20)
    expect(Number(response.values[0].value)).toBe(request.bars[0].close * 5)
  })

  test('supports synchronous computes too', async () => {
    const definition: IndicatorDefinition = {
      type: 'custom:sync',
      pane: 'overlay',
      compute: ({ bars }) => bars.map((bar) => ({ ts: bar.ts, value: 1 })),
      presenter: noopPresenter,
      supportsIncremental: false,
    }

    const response = await computeCustomIndicator(
      definition,
      makeRequest('custom:sync'),
    )
    expect(response.error).toBeUndefined()
    expect(response.values).toHaveLength(20)
  })

  test('unregistered type resolves to the worker unsupported-type error shape', async () => {
    const response = await computeCustomIndicator(
      undefined,
      makeRequest('custom:missing'),
    )

    expect(response.values).toEqual([])
    expect(response.error).toBe('Unsupported indicator type: custom:missing')
    expect(response.requestId).toBe('req_1')
    expect(response.indicatorId).toBe('ind_custom_1')
  })

  test('a rejecting compute resolves to an error response instead of throwing', async () => {
    const definition: IndicatorDefinition = {
      type: 'custom:broken',
      pane: 'separate',
      compute: async () => {
        throw new Error('python runtime unavailable')
      },
      presenter: noopPresenter,
      supportsIncremental: false,
    }

    const response = await computeCustomIndicator(
      definition,
      makeRequest('custom:broken'),
    )

    expect(response.values).toEqual([])
    expect(response.error).toBe('python runtime unavailable')
  })

  test('a synchronously-throwing compute resolves to an error response', async () => {
    const definition: IndicatorDefinition = {
      type: 'custom:throws',
      pane: 'separate',
      compute: () => {
        throw new Error('bad params')
      },
      presenter: noopPresenter,
      supportsIncremental: false,
    }

    const response = await computeCustomIndicator(
      definition,
      makeRequest('custom:throws'),
    )

    expect(response.values).toEqual([])
    expect(response.error).toBe('bad params')
  })
})

describe('indicator registry (un)registration', () => {
  test('register and remove custom definitions', () => {
    const registry = createDefaultIndicatorRegistry()
    const definition: IndicatorDefinition = {
      type: 'custom:py-momentum',
      pane: 'separate',
      compute: () => [],
      presenter: noopPresenter,
      supportsIncremental: false,
    }

    expect(registry.get('custom:py-momentum')).toBeUndefined()
    registry.register(definition)
    expect(registry.get('custom:py-momentum')).toBe(definition)

    expect(registry.remove('custom:py-momentum')).toBe(true)
    expect(registry.get('custom:py-momentum')).toBeUndefined()
    expect(registry.remove('custom:py-momentum')).toBe(false)
  })
})

describe('resolveCustomSeriesColor', () => {
  const theme = DARK_THEME_TOKENS

  test('passes raw css colors through', () => {
    expect(resolveCustomSeriesColor('#ff00aa', 0, theme)).toBe('#ff00aa')
    expect(resolveCustomSeriesColor('rgb(1, 2, 3)', 3, theme)).toBe(
      'rgb(1, 2, 3)',
    )
  })

  test('maps theme tokens onto the chart theme', () => {
    expect(resolveCustomSeriesColor('token:up', 0, theme)).toBe(theme.upCandle)
    expect(resolveCustomSeriesColor('token:down', 0, theme)).toBe(
      theme.downCandle,
    )
    expect(resolveCustomSeriesColor('token:muted', 0, theme)).toBe(
      theme.axisText,
    )
    expect(resolveCustomSeriesColor('token:primary', 0, theme)).toBe(
      theme.crosshair,
    )
    expect(resolveCustomSeriesColor('token:accent', 0, theme)).toBe(
      theme.indicator.macd.signal,
    )
  })

  test('falls back to the default palette by series index', () => {
    const first = resolveCustomSeriesColor(undefined, 0, theme)
    const second = resolveCustomSeriesColor(undefined, 1, theme)

    expect(first).not.toBe(second)
    // Palette wraps around
    expect(resolveCustomSeriesColor(undefined, 6, theme)).toBe(first)
    // Unknown tokens degrade to the palette instead of an invalid color
    expect(resolveCustomSeriesColor('token:nonsense', 0, theme)).toBe(first)
  })
})
