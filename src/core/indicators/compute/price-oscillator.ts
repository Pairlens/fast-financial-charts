import type { SyncIndicatorComputeFn } from '../../../types'

export const computePriceOscillator: SyncIndicatorComputeFn = ({
  bars,
  params,
}) => {
  const fast = Math.max(1, Number(params.fast ?? 12))
  const slow = Math.max(1, Number(params.slow ?? 26))
  if (bars.length < slow) {
    return []
  }

  const fastMul = 2 / (fast + 1)
  const slowMul = 2 / (slow + 1)

  // Seed fast EMA with SMA over first `fast` bars
  let fastEma = bars.slice(0, fast).reduce((sum, b) => sum + b.close, 0) / fast
  // Warm up fast EMA through remaining bars up to `slow`
  for (let i = fast; i < slow; i += 1) {
    fastEma = bars[i].close * fastMul + fastEma * (1 - fastMul)
  }

  // Seed slow EMA with SMA over first `slow` bars
  let slowEma = bars.slice(0, slow).reduce((sum, b) => sum + b.close, 0) / slow

  const values: Array<{ ts: number; value: number }> = []

  // First output point at bar index slow - 1
  const ppo = slowEma === 0 ? 0 : ((fastEma - slowEma) / slowEma) * 100
  values.push({ ts: bars[slow - 1].ts, value: ppo })

  for (let i = slow; i < bars.length; i += 1) {
    fastEma = bars[i].close * fastMul + fastEma * (1 - fastMul)
    slowEma = bars[i].close * slowMul + slowEma * (1 - slowMul)

    const value = slowEma === 0 ? 0 : ((fastEma - slowEma) / slowEma) * 100
    values.push({ ts: bars[i].ts, value })
  }

  return values
}
