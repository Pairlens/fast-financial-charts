import { INDICATOR_COMPUTE_DISPATCH } from '../compute/dispatch'
import type { IndicatorWorkerResponse } from '../../../types'

import type { WorkerProtocolRequest, WorkerProtocolResponse } from './protocol'

const toErrorResponse = (
  requestId: string,
  indicatorId: string,
  error: string,
): IndicatorWorkerResponse => ({
  requestId,
  indicatorId,
  values: [],
  error,
})

self.onmessage = (event: MessageEvent<WorkerProtocolRequest>) => {
  if (event.data?.type !== 'compute') {
    return
  }

  const request = event.data.payload
  const compute = INDICATOR_COMPUTE_DISPATCH[request.indicator.type]

  if (!compute) {
    const response: WorkerProtocolResponse = {
      type: 'result',
      payload: toErrorResponse(
        request.requestId,
        request.indicator.id,
        `Unsupported indicator type: ${request.indicator.type}`,
      ),
    }
    self.postMessage(response)
    return
  }

  try {
    const values = compute({
      bars: request.bars,
      params: request.indicator.params,
      timeframeMs: request.timeframeMs,
    })

    const response: WorkerProtocolResponse = {
      type: 'result',
      payload: {
        requestId: request.requestId,
        indicatorId: request.indicator.id,
        values,
      },
    }

    self.postMessage(response)
  } catch (error) {
    const response: WorkerProtocolResponse = {
      type: 'result',
      payload: toErrorResponse(
        request.requestId,
        request.indicator.id,
        error instanceof Error ? error.message : 'Failed to compute indicator',
      ),
    }

    self.postMessage(response)
  }
}

export {}
