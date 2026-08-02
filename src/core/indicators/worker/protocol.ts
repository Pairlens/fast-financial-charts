import type {
  IndicatorWorkerRequest,
  IndicatorWorkerResponse,
} from '../../../types'

export type WorkerProtocolRequest = {
  type: 'compute'
  payload: IndicatorWorkerRequest
}

export type WorkerProtocolResponse = {
  type: 'result'
  payload: IndicatorWorkerResponse
}
