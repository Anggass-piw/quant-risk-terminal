import { describe, expect, it } from 'vitest'
import { buildHistogram, simulateRisk } from '../lib/risk'

const assets = [
  { symbol: 'BTC', weight: 0.65, dailyVolatility: 0.042, dailyDrift: 0.0008 },
  { symbol: 'ETH', weight: 0.2, dailyVolatility: 0.051, dailyDrift: 0.0006 },
  { symbol: 'SOL', weight: 0.15, dailyVolatility: 0.067, dailyDrift: 0.0009 },
]

describe('simulateRisk', () => {
  it('menghasilkan hasil deterministik untuk seed dan parameter yang sama', () => {
    const first = simulateRisk(assets, 2_000_000_000, { scenarios: 2_000, seed: 11 })
    const second = simulateRisk(assets, 2_000_000_000, { scenarios: 2_000, seed: 11 })
    expect(first.returns).toEqual(second.returns)
    expect(first.var).toBe(second.var)
    expect(first.cvar).toBe(second.cvar)
  })

  it('CVaR tidak lebih kecil daripada VaR pada distribusi simulasi', () => {
    const result = simulateRisk(assets, 2_000_000_000, { scenarios: 5_000, confidence: 0.99 })
    expect(result.cvar).toBeGreaterThanOrEqual(result.var)
    expect(result.returns).toHaveLength(5_000)
    expect(result.returns).toEqual([...result.returns].sort((a, b) => a - b))
  })

  it('horizon yang lebih panjang tidak mengecilkan volatilitas secara mekanis', () => {
    const oneDay = simulateRisk(assets, 2_000_000_000, { scenarios: 4_000, horizonDays: 1 })
    const fiveDays = simulateRisk(assets, 2_000_000_000, { scenarios: 4_000, horizonDays: 5 })
    expect(fiveDays.volatility).toBeGreaterThan(oneDay.volatility)
  })

  it('return long-only GBM tidak melampaui kerugian penuh portofolio', () => {
    const result = simulateRisk(assets, 2_000_000_000, { scenarios: 1_000, horizonDays: 10 })
    expect(Math.min(...result.returns)).toBeGreaterThan(-1)
  })

  it('menolak konfigurasi yang tidak valid', () => {
    expect(() => simulateRisk([], 100)).toThrow('setidaknya satu aset')
    expect(() => simulateRisk(assets, 0)).toThrow('lebih besar dari nol')
    expect(() => simulateRisk(assets, 100, { confidence: 1 })).toThrow('di antara 0 dan 1')
  })
})

describe('buildHistogram', () => {
  it('membagi hasil ke jumlah bin yang diminta dan menghitung semua observasi', () => {
    const bins = buildHistogram([-2, -1, 0, 1, 2], 5)
    expect(bins).toHaveLength(5)
    expect(bins.reduce((sum, bin) => sum + bin.count, 0)).toBe(5)
  })

  it('mengembalikan array kosong untuk input kosong', () => {
    expect(buildHistogram([])).toEqual([])
  })
})
