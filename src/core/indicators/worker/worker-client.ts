import { INDICATOR_COMPUTE_DISPATCH } from '../compute/dispatch'
import type {
  IndicatorWorkerLike,
  IndicatorWorkerRequest,
  IndicatorWorkerResponse,
} from '../../../types'

import type { WorkerProtocolRequest, WorkerProtocolResponse } from './protocol'

class InlineIndicatorWorkerClient implements IndicatorWorkerLike {
  async compute(
    request: IndicatorWorkerRequest,
  ): Promise<IndicatorWorkerResponse> {
    const compute = INDICATOR_COMPUTE_DISPATCH[request.indicator.type]

    if (!compute) {
      return {
        requestId: request.requestId,
        indicatorId: request.indicator.id,
        values: [],
        error: `Unsupported indicator type: ${request.indicator.type}`,
      }
    }

    try {
      const values = compute({
        bars: request.bars,
        params: request.indicator.params,
        timeframeMs: request.timeframeMs,
      })

      return {
        requestId: request.requestId,
        indicatorId: request.indicator.id,
        values,
      }
    } catch (error) {
      return {
        requestId: request.requestId,
        indicatorId: request.indicator.id,
        values: [],
        error:
          error instanceof Error ? error.message : 'Indicator compute failed',
      }
    }
  }

  dispose(): void {}
}

/**
 * How long the first worker round-trip may take before the client declares
 * the worker dead and falls back to inline compute. A healthy worker answers
 * in single-digit milliseconds; a worker whose module URL failed to load
 * never answers at all (and may not even fire onerror), which previously
 * stalled indicator computation silently and forever.
 */
const WORKER_FIRST_RESPONSE_TIMEOUT_MS = 3000

class BrowserIndicatorWorkerClient implements IndicatorWorkerLike {
  private readonly worker: Worker
  private readonly inlineFallback = new InlineIndicatorWorkerClient()
  private workerDead = false
  private workerProven = false

  private readonly pending = new Map<
    string,
    {
      resolve: (response: IndicatorWorkerResponse) => void
      reject: (error: Error) => void
    }
  >()

  constructor() {
    this.worker = new Worker(
      new URL('./indicator.worker.ts', import.meta.url),
      {
        type: 'module',
      },
    )

    this.worker.onmessage = (event: MessageEvent<WorkerProtocolResponse>) => {
      if (event.data?.type !== 'result') {
        return
      }

      this.workerProven = true
      const payload = event.data.payload
      const request = this.pending.get(payload.requestId)
      if (!request) {
        return
      }

      this.pending.delete(payload.requestId)
      request.resolve(payload)
    }

    this.worker.onerror = (event) => {
      this.markWorkerDead(new Error(event.message || 'Indicator worker failed'))
    }
  }

  private markWorkerDead(error: Error): void {
    if (this.workerDead) return
    this.workerDead = true
    console.warn(
      '[charts] Indicator worker unavailable, falling back to inline compute:',
      error.message,
    )
    for (const [requestId, request] of this.pending) {
      this.pending.delete(requestId)
      request.reject(error)
    }
  }

  async compute(
    request: IndicatorWorkerRequest,
  ): Promise<IndicatorWorkerResponse> {
    if (this.workerDead) {
      return this.inlineFallback.compute(request)
    }

    const viaWorker = new Promise<IndicatorWorkerResponse>(
      (resolve, reject) => {
        this.pending.set(request.requestId, { resolve, reject })

        const payload: WorkerProtocolRequest = {
          type: 'compute',
          payload: request,
        }

        this.worker.postMessage(payload)
      },
    )

    // Until the worker has answered once, race it against a deadline — a
    // worker whose module failed to load never responds and never errors.
    if (this.workerProven) {
      return viaWorker.catch(() => this.inlineFallback.compute(request))
    }

    let timer: ReturnType<typeof setTimeout> | null = null
    const deadline = new Promise<'timeout'>((resolve) => {
      timer = setTimeout(
        () => resolve('timeout'),
        WORKER_FIRST_RESPONSE_TIMEOUT_MS,
      )
    })

    try {
      const winner = await Promise.race([viaWorker, deadline])
      if (winner === 'timeout') {
        this.markWorkerDead(new Error('Indicator worker never responded'))
        return this.inlineFallback.compute(request)
      }
      return winner
    } catch {
      return this.inlineFallback.compute(request)
    } finally {
      if (timer) clearTimeout(timer)
    }
  }

  dispose(): void {
    this.worker.terminate()
    this.pending.clear()
    this.inlineFallback.dispose()
  }
}

export const createIndicatorWorkerClient = (
  enabled: boolean,
): IndicatorWorkerLike => {
  if (!enabled || typeof Worker === 'undefined') {
    return new InlineIndicatorWorkerClient()
  }

  return new BrowserIndicatorWorkerClient()
}
