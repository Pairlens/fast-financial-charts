import type { SyncIndicatorComputeFn } from '../../../types'

const highLow = (
  bars: Array<{ high: number; low: number }>,
  start: number,
  length: number,
): { highest: number; lowest: number } => {
  let highest = -Infinity
  let lowest = Infinity
  const end = Math.min(start + length, bars.length)
  for (let i = start; i < end; i += 1) {
    highest = Math.max(highest, bars[i].high)
    lowest = Math.min(lowest, bars[i].low)
  }
  return { highest, lowest }
}

export const computeIchimoku: SyncIndicatorComputeFn = ({ bars, params }) => {
  const tenkanPeriod = Math.max(2, Number(params.tenkanPeriod ?? 9))
  const kijunPeriod = Math.max(2, Number(params.kijunPeriod ?? 26))
  const senkouBPeriod = Math.max(2, Number(params.senkouBPeriod ?? 52))
  const displacement = Math.max(1, Number(params.displacement ?? 26))

  if (bars.length < senkouBPeriod) {
    return []
  }

  const values: Array<{
    ts: number
    tenkan: number
    kijun: number
    senkouA: number
    senkouB: number
    chikou: number
  }> = []

  for (let index = senkouBPeriod - 1; index < bars.length; index += 1) {
    const tenkanHL = highLow(bars, index - tenkanPeriod + 1, tenkanPeriod)
    const tenkan = (tenkanHL.highest + tenkanHL.lowest) / 2

    const kijunHL = highLow(bars, index - kijunPeriod + 1, kijunPeriod)
    const kijun = (kijunHL.highest + kijunHL.lowest) / 2

    const senkouA = (tenkan + kijun) / 2

    const senkouBHL = highLow(bars, index - senkouBPeriod + 1, senkouBPeriod)
    const senkouB = (senkouBHL.highest + senkouBHL.lowest) / 2

    const chikouIndex = index - displacement
    const chikou = chikouIndex >= 0 ? bars[chikouIndex].close : bars[0].close

    values.push({
      ts: bars[index].ts,
      tenkan,
      kijun,
      senkouA,
      senkouB,
      chikou,
    })
  }

  return values
}
