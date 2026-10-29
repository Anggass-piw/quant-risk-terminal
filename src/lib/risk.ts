export type RiskAsset = {
  symbol: string
  weight: number
  dailyVolatility: number
  dailyDrift: number
  idiosyncraticScale?: number
}

export type RiskResult = {
  returns: number[]
  var: number
  cvar: number
  expectedReturn: number
  volatility: number
  confidence: number
  horizonDays: number
  scenarios: number
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return (state + 1) / 4294967297
  }
}

function normalPair(random: () => number): [number, number] {
  const u1 = Math.max(random(), 1e-12)
  const u2 = random()
  const magnitude = Math.sqrt(-2 * Math.log(u1))
  const angle = 2 * Math.PI * u2
  return [magnitude * Math.cos(angle), magnitude * Math.sin(angle)]
}

export function simulateRisk(
  assets: RiskAsset[],
  portfolioValue: number,
  options: { confidence?: number; horizonDays?: number; scenarios?: number; seed?: number } = {},
): RiskResult {
  const confidence = options.confidence ?? 0.99
  const horizonDays = options.horizonDays ?? 1
  const scenarios = options.scenarios ?? 10_000
  const seed = options.seed ?? 7_421

  if (assets.length === 0) throw new Error('Portofolio harus memiliki setidaknya satu aset.')
  if (!Number.isFinite(portfolioValue) || portfolioValue <= 0) throw new Error('Nilai portofolio harus lebih besar dari nol.')
  if (!(confidence > 0 && confidence < 1)) throw new Error('Tingkat kepercayaan harus di antara 0 dan 1.')
  if (!Number.isInteger(horizonDays) || horizonDays < 1) throw new Error('Horizon harus berupa bilangan hari positif.')
  if (!Number.isInteger(scenarios) || scenarios < 100) throw new Error('Jumlah skenario minimum adalah 100.')
  if (assets.some((asset) => asset.weight < 0 || asset.dailyVolatility < 0)) {
    throw new Error('Bobot dan volatilitas aset tidak boleh negatif.')
  }

  const totalWeight = assets.reduce((sum, asset) => sum + asset.weight, 0)
  if (totalWeight <= 0) throw new Error('Total bobot portofolio harus lebih besar dari nol.')

  const random = seededRandom(seed)
  const scale = Math.sqrt(horizonDays)
  const returns: number[] = []
  let cachedNormal = 0
  let hasCachedNormal = false

  const nextNormal = () => {
    if (hasCachedNormal) {
      hasCachedNormal = false
      return cachedNormal
    }
    const [first, second] = normalPair(random)
    cachedNormal = second
    hasCachedNormal = true
    return first
  }

  for (let scenario = 0; scenario < scenarios; scenario += 1) {
    const marketShock = nextNormal()
    let portfolioReturn = 0
    for (const asset of assets) {
      const idiosyncraticShock = nextNormal()
      const common = 0.68 * marketShock
      const specificScale = asset.idiosyncraticScale ?? Math.sqrt(1 - 0.68 ** 2)
      const specific = specificScale * idiosyncraticShock
      const factorVariance = 0.68 ** 2 + specificScale ** 2
      const drift = (asset.dailyDrift - 0.5 * asset.dailyVolatility ** 2 * factorVariance) * horizonDays
      const shock = asset.dailyVolatility * scale * (common + specific)
      const terminalReturn = Math.expm1(drift + shock)
      portfolioReturn += (asset.weight / totalWeight) * terminalReturn
    }
    returns.push(portfolioReturn)
  }

  returns.sort((a, b) => a - b)
  const tailSize = Math.max(1, Math.ceil((1 - confidence) * scenarios))
  const cutoff = returns[tailSize - 1]
  const tailMean = returns.slice(0, tailSize).reduce((sum, value) => sum + value, 0) / tailSize
  const expectedReturn = returns.reduce((sum, value) => sum + value, 0) / scenarios
  const variance = returns.reduce((sum, value) => sum + (value - expectedReturn) ** 2, 0) / scenarios

  return {
    returns,
    var: Math.max(0, -cutoff * portfolioValue),
    cvar: Math.max(0, -tailMean * portfolioValue),
    expectedReturn,
    volatility: Math.sqrt(variance),
    confidence,
    horizonDays,
    scenarios,
  }
}

export function buildHistogram(returns: number[], binCount = 18): { x: number; count: number }[] {
  if (returns.length === 0 || binCount < 1) return []
  const min = Math.min(...returns)
  const max = Math.max(...returns)
  const range = max - min || 1
  const bins = Array.from({ length: binCount }, (_, index) => ({
    x: min + ((index + 0.5) / binCount) * range,
    count: 0,
  }))
  for (const value of returns) {
    const index = Math.min(binCount - 1, Math.floor(((value - min) / range) * binCount))
    bins[index].count += 1
  }
  return bins
}
