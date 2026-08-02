import type { SyncIndicatorComputeFn } from '../../../types'

export const computeMovingAverageMultiple: SyncIndicatorComputeFn = ({
  bars,
  params,
}) => {
  const periodsStr = String(params.periods ?? '10,20,50,100,200')
  const periods = periodsStr
    .split(',')
    .map((s) => Math.max(1, Number(s.trim())))
    .filter((n) => !Number.isNaN(n))

  if (periods.length === 0 || bars.length === 0) {
    return []
  }

  if (bars.length < Math.min(...periods)) {
    return []
  }

  // Build rolling sums for each period
  const rollingSums = new Map<number, number>()
  for (const p of periods) {
    rollingSums.set(p, 0)
  }

  const values: Array<{ ts: number; [key: string]: number | undefined }> = []

  for (let index = 0; index < bars.length; index += 1) {
    const close = bars[index].close

    for (const p of periods) {
      rollingSums.set(p, rollingSums.get(p)! + close)
      if (index >= p) {
        rollingSums.set(p, rollingSums.get(p)! - bars[index - p].close)
      }
    }

    // Only start output once at least the smallest period is satisfied
    const smallestPeriod = Math.min(...periods)
    if (index < smallestPeriod - 1) {
      continue
    }

    const point: { ts: number; [key: string]: number | undefined } = {
      ts: bars[index].ts,
    }

    let hasAny = false
    for (const p of periods) {
      if (index >= p - 1) {
        point[`ma_${p}`] = rollingSums.get(p)! / p
        hasAny = true
      }
    }

    if (hasAny) {
      values.push(point)
    }
  }

  return values
}
