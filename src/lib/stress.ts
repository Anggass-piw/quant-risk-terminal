export type StressPosition = {
  symbol: string
  name: string
  quantity: number
  price: number
  color?: string
}

export type StressShock = {
  symbol: string
  percent: number
}

export type StressRow = {
  symbol: string
  name: string
  quantity: number
  price: number
  shockPercent: number
  currentValue: number
  stressedValue: number
  pnl: number
  portfolioImpactPercent: number
}

export type StressResult = {
  currentValue: number
  stressedValue: number
  pnl: number
  changePercent: number
  rows: StressRow[]
}

export function calculateStressTest(positions: StressPosition[], shocks: StressShock[]): StressResult {
  if (positions.length === 0) throw new Error('Portofolio harus memiliki setidaknya satu aset.')
  if (positions.some((position) => !Number.isFinite(position.quantity) || position.quantity < 0 || !Number.isFinite(position.price) || position.price < 0)) {
    throw new Error('Kuantitas dan harga aset harus berupa angka non-negatif.')
  }
  if (shocks.some((shock) => !Number.isFinite(shock.percent) || shock.percent < -100)) {
    throw new Error('Shock harus berupa angka dan tidak boleh kurang dari -100%.')
  }

  const shockBySymbol = new Map(shocks.map((shock) => [shock.symbol, shock.percent]))
  const currentValue = positions.reduce((sum, position) => sum + position.quantity * position.price, 0)
  if (currentValue <= 0) throw new Error('Nilai portofolio harus lebih besar dari nol.')

  const rows = positions.map((position) => {
    const shockPercent = shockBySymbol.get(position.symbol) ?? 0
    const positionValue = position.quantity * position.price
    const pnl = positionValue * shockPercent / 100
    return {
      symbol: position.symbol,
      name: position.name,
      quantity: position.quantity,
      price: position.price,
      shockPercent,
      currentValue: positionValue,
      stressedValue: positionValue + pnl,
      pnl,
      portfolioImpactPercent: pnl / currentValue * 100,
    }
  })
  const pnl = rows.reduce((sum, row) => sum + row.pnl, 0)
  const stressedValue = currentValue + pnl

  return {
    currentValue,
    stressedValue,
    pnl,
    changePercent: pnl / currentValue * 100,
    rows,
  }
}

function escapeCsv(value: string | number): string {
  const text = String(value)
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

export function formatStressCsv(result: StressResult, scenarioName: string): string {
  const lines = [
    [escapeCsv('Skenario'), escapeCsv(scenarioName)].join(','),
    ['Aset', 'Shock (%)', 'Nilai awal (IDR)', 'Nilai setelah shock (IDR)', 'P&L (IDR)', 'Dampak portofolio (%)'].join(','),
    ...result.rows.map((row) => [
      escapeCsv(row.symbol),
      row.shockPercent,
      row.currentValue,
      row.stressedValue,
      row.pnl,
      row.portfolioImpactPercent,
    ].join(',')),
    ['TOTAL', '', result.currentValue, result.stressedValue, result.pnl, result.changePercent].join(','),
  ]
  return `${lines.join('\n')}\n`
}
