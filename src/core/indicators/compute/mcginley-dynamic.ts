import type { SyncIndicatorComputeFn } from '../../../types'

export const computeMcGinleyDynamic: SyncIndicatorComputeFn = ({
  bars,
  params,
}) => {
  const period = Math.max(1, Number(params.period ?? 14))
  if (bars.length < 1) {
    return []
  }

  const k = 0.6

  let md = bars[0].close
  const values: Array<{ ts: number; value: number }> = [
    {
      ts: bars[0].ts,
      value: md,
    },
  ]

  for (let index = 1; index < bars.length; index += 1) {
    const close = bars[index].close
    if (md === 0) {
      md = close
    } else {
      const ratio = close / md
      md = md + (close - md) / (k * period * ratio ** 4)
    }

    values.push({
      ts: bars[index].ts,
      value: md,
    })
  }

  return values
}
