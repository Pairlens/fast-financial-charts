import type { SyncIndicatorComputeFn } from '../../../types'

const smma = (
  bars: Array<{ close: number }>,
  period: number,
): Array<number> => {
  if (bars.length < period) {
    return []
  }

  const values: Array<number> = []
  let sum = 0

  for (let index = 0; index < period; index += 1) {
    sum += bars[index].close
  }
  values.push(sum / period)

  for (let index = period; index < bars.length; index += 1) {
    const prev = values[values.length - 1]
    values.push((prev * (period - 1) + bars[index].close) / period)
  }

  return values
}

export const computeAlligator: SyncIndicatorComputeFn = ({ bars, params }) => {
  const jawPeriod = Math.max(2, Number(params.jawPeriod ?? 13))
  const teethPeriod = Math.max(2, Number(params.teethPeriod ?? 8))
  const lipsPeriod = Math.max(2, Number(params.lipsPeriod ?? 5))
  const jawShift = Math.max(0, Number(params.jawShift ?? 8))
  const teethShift = Math.max(0, Number(params.teethShift ?? 5))
  const lipsShift = Math.max(0, Number(params.lipsShift ?? 3))

  if (bars.length < jawPeriod) {
    return []
  }

  // Use median price (high + low) / 2
  const medianBars = bars.map((bar) => ({ close: (bar.high + bar.low) / 2 }))

  const jawValues = smma(medianBars, jawPeriod)
  const teethValues = smma(medianBars, teethPeriod)
  const lipsValues = smma(medianBars, lipsPeriod)

  const values: Array<{
    ts: number
    jaw: number
    teeth: number
    lips: number
  }> = []

  const maxLen = Math.max(
    jawValues.length,
    teethValues.length,
    lipsValues.length,
  )
  for (let index = 0; index < maxLen; index += 1) {
    const jawIdx = index - jawShift + jawPeriod - 1
    const teethIdx = index - teethShift + teethPeriod - 1
    const lipsIdx = index - lipsShift + lipsPeriod - 1
    const barIdx = index + jawPeriod - 1

    if (barIdx >= bars.length) {
      break
    }

    const jaw =
      jawIdx >= 0 && jawIdx < jawValues.length ? jawValues[jawIdx] : undefined
    const teeth =
      teethIdx >= 0 && teethIdx < teethValues.length
        ? teethValues[teethIdx]
        : undefined
    const lips =
      lipsIdx >= 0 && lipsIdx < lipsValues.length
        ? lipsValues[lipsIdx]
        : undefined

    if (jaw !== undefined && teeth !== undefined && lips !== undefined) {
      values.push({
        ts: bars[barIdx].ts,
        jaw,
        teeth,
        lips,
      })
    }
  }

  return values
}
