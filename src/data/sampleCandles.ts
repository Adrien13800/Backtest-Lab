import type { Candle } from '../types'

const start = Date.UTC(2025, 0, 6, 7, 0, 0) / 1000

function pseudoRandom(seed: number) {
  const value = Math.sin(seed * 12.9898) * 43758.5453
  return value - Math.floor(value)
}

export function createSampleCandles(count = 850): Candle[] {
  const candles: Candle[] = []
  let close = 1.086

  for (let index = 0; index < count; index += 1) {
    const trend = Math.sin(index / 47) * 0.00018
    const sessionPulse = Math.sin(index / 13) * 0.00008
    const noise = (pseudoRandom(index + 4) - 0.5) * 0.00042
    const open = close

    close = Math.max(1.065, open + trend + sessionPulse + noise)

    const wick = 0.00016 + pseudoRandom(index + 19) * 0.00038
    const high = Math.max(open, close) + wick
    const low = Math.min(open, close) - wick * (0.75 + pseudoRandom(index + 27) * 0.55)
    const volume = Math.round(760 + pseudoRandom(index + 41) * 2800)

    candles.push({
      time: start + index * 5 * 60,
      open: roundPrice(open),
      high: roundPrice(high),
      low: roundPrice(low),
      close: roundPrice(close),
      volume,
    })
  }

  return candles
}

function roundPrice(value: number) {
  return Number(value.toFixed(5))
}
