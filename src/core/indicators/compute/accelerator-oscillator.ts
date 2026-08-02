import type { SyncIndicatorComputeFn } from '../../../types'

export const computeAcceleratorOscillator: SyncIndicatorComputeFn = ({
  bars,
  params,
}) => {
  const fast = Math.max(1, Number(params.fast ?? 5))
  const slow = Math.max(1, Number(params.slow ?? 34))
  const smoothPeriod = Math.max(1, Number(params.smoothPeriod ?? 5))

  if (bars.length < slow + smoothPeriod - 1) {
    return []
  }

  const medianPrices = bars.map((bar) => (bar.high + bar.low) / 2)

  // Step 1: Awesome Oscillator = SMA(medianPrice, fast) - SMA(medianPrice, slow)
  const ao: Array<{ ts: number; value: number }> = []

  for (let index = slow - 1; index < bars.length; index += 1) {
    let fastSum = 0
    for (let j = index - fast + 1; j <= index; j += 1) {
      fastSum += medianPrices[j]
    }

    let slowSum = 0
    for (let j = index - slow + 1; j <= index; j += 1) {
      slowSum += medianPrices[j]
    }

    ao.push({
      ts: bars[index].ts,
      value: fastSum / fast - slowSum / slow,
    })
  }

  if (ao.length < smoothPeriod) {
    return []
  }

  // Step 2: AC = AO - SMA(AO, smoothPeriod)
  const values: Array<{ ts: number; value: number }> = []
  let rollingSum = 0

  for (let index = 0; index < ao.length; index += 1) {
    rollingSum += ao[index].value

    if (index >= smoothPeriod) {
      rollingSum -= ao[index - smoothPeriod].value
    }

    if (index >= smoothPeriod - 1) {
      const smaAO = rollingSum / smoothPeriod
      values.push({
        ts: ao[index].ts,
        value: ao[index].value - smaAO,
      })
    }
  }

  return values
}
