import type {
  IndicatorDefinition,
  IndicatorType,
  IndicatorWorkerRequest,
  IndicatorWorkerResponse,
} from '../../types'

/**
 * Whether an indicator type is a registry-defined custom indicator.
 * Custom indicators compute on the main thread (their compute may be async,
 * e.g. backed by an external Python runtime) instead of the indicator worker.
 */
export const isCustomIndicatorType = (
  type: IndicatorType,
): type is `custom:${string}` => type.startsWith('custom:')

/**
 * Compute a registry-defined custom indicator on the main thread.
 *
 * Mirrors the indicator worker response contract exactly — an unregistered
 * type or a throwing/rejecting compute yields an error response (never a
 * rejected promise), so the engine handles custom results identically to
 * worker results.
 */
export const computeCustomIndicator = async (
  definition: IndicatorDefinition | undefined,
  request: IndicatorWorkerRequest,
): Promise<IndicatorWorkerResponse> => {
  if (!definition) {
    return {
      requestId: request.requestId,
      indicatorId: request.indicator.id,
      values: [],
      error: `Unsupported indicator type: ${request.indicator.type}`,
    }
  }

  try {
    const values = await definition.compute({
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
