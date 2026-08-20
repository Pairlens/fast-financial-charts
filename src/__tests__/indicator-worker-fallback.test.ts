import { afterEach, describe, expect, test } from 'bun:test'

import { INDICATOR_COMPUTE_DISPATCH } from '../core/indicators/compute/dispatch'
import { createIndicatorWorkerClient } from '../core/indicators/worker/worker-client'
import { makeBars } from './fixtures'
import type { IndicatorInstance, IndicatorWorkerRequest } from '../types'

/**
 * The CommonJS build has no `import.meta.url`, so scripts/build.mjs substitutes
 * `undefined` and the worker's module URL becomes
 * `new URL('./indicator.worker.js', undefined)`, which throws `TypeError:
 * Invalid URL` before a Worker is ever constructed.
 *
 * That is deliberate: every base a browser CommonJS bundle could supply instead
 * (`self.location`, a bundler's fake `__filename`) resolves the worker against
 * the host page, which 404s and leaves compute stalling on the client's 3s
 * first-response deadline. Throwing at construction fails fast into inline
 * compute instead.
 *
 * Which makes the fallback load-bearing for every CommonJS consumer, so it is
 * pinned here: a build-script or client change that stops catching this must
 * fail a test rather than silently ship charts whose indicators never compute.
 */

const CJS_WORKER_URL_ERROR = 'Invalid URL'

const originalWorker = Object.getOwnPropertyDescriptor(globalThis, 'Worker')

const setWorker = (value: unknown) => {
  Object.defineProperty(globalThis, 'Worker', {
    value,
    configurable: true,
    writable: true,
  })
}

afterEach(() => {
  if (originalWorker) {
    Object.defineProperty(globalThis, 'Worker', originalWorker)
  } else {
    delete (globalThis as { Worker?: unknown }).Worker
  }
})

const indicator: IndicatorInstance = {
  id: 'ema-1',
  type: 'EMA',
  seriesId: 'series-1',
  params: { period: 10 },
  pane: 'overlay',
  color: '#fff',
  visible: true,
}

const request = (bars = makeBars(60)): IndicatorWorkerRequest => ({
  requestId: 'request-1',
  indicator,
  bars,
  timeframeMs: 60_000,
})

describe('createIndicatorWorkerClient fallback', () => {
  test('falls back to inline compute when the worker URL cannot be built', async () => {
    let constructed = 0
    setWorker(
      class {
        constructor() {
          constructed += 1
          // What `new URL('./indicator.worker.js', undefined)` throws in the
          // CommonJS build, raised where the client would see it.
          throw new TypeError(CJS_WORKER_URL_ERROR)
        }
      },
    )

    const client = createIndicatorWorkerClient(true)
    const response = await client.compute(request())

    expect(constructed).toBe(1)
    expect(response.error).toBeUndefined()
    expect(response.requestId).toBe('request-1')
    expect(response.indicatorId).toBe('ema-1')
    expect(response.values.length).toBeGreaterThan(0)

    client.dispose()
  })

  test('the fallback returns the same values the dispatch table computes', async () => {
    setWorker(
      class {
        constructor() {
          throw new TypeError(CJS_WORKER_URL_ERROR)
        }
      },
    )

    const bars = makeBars(60)
    const client = createIndicatorWorkerClient(true)
    const response = await client.compute(request(bars))

    const expected = INDICATOR_COMPUTE_DISPATCH.EMA({
      bars,
      params: indicator.params,
      timeframeMs: 60_000,
    })

    expect(response.values).toEqual(expected)

    client.dispose()
  })

  test('falls back to inline compute when Worker does not exist at all', async () => {
    delete (globalThis as { Worker?: unknown }).Worker

    const client = createIndicatorWorkerClient(true)
    const response = await client.compute(request())

    expect(response.error).toBeUndefined()
    expect(response.values.length).toBeGreaterThan(0)

    client.dispose()
  })

  test('never constructs a worker when workers are disabled', async () => {
    let constructed = 0
    setWorker(
      class {
        constructor() {
          constructed += 1
        }
      },
    )

    const client = createIndicatorWorkerClient(false)
    const response = await client.compute(request())

    expect(constructed).toBe(0)
    expect(response.values.length).toBeGreaterThan(0)

    client.dispose()
  })

  test('an unsupported indicator type reports an error instead of throwing', async () => {
    setWorker(
      class {
        constructor() {
          throw new TypeError(CJS_WORKER_URL_ERROR)
        }
      },
    )

    const client = createIndicatorWorkerClient(true)
    const response = await client.compute({
      ...request(),
      indicator: { ...indicator, type: 'NotAnIndicator' as never },
    })

    expect(response.values).toEqual([])
    expect(response.error).toContain('Unsupported indicator type')

    client.dispose()
  })
})
