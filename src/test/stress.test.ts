import { describe, expect, it } from 'vitest'
import { calculateStressTest, formatStressCsv } from '../lib/stress'

const positions = [
  { symbol: 'BTC', name: 'Bitcoin', quantity: 2, price: 100 },
  { symbol: 'ETH', name: 'Ethereum', quantity: 4, price: 50 },
]

describe('calculateStressTest', () => {
  it('menghitung P&L, nilai setelah shock, dan dampak portofolio per aset', () => {
    const result = calculateStressTest(positions, [
      { symbol: 'BTC', percent: -10 },
      { symbol: 'ETH', percent: 20 },
    ])

    expect(result.currentValue).toBe(400)
    expect(result.stressedValue).toBe(420)
    expect(result.pnl).toBe(20)
    expect(result.changePercent).toBe(5)
    expect(result.rows.map((row) => row.pnl)).toEqual([-20, 40])
    expect(result.rows[0].portfolioImpactPercent).toBe(-5)
  })

  it('membatasi kerugian aset hingga 100% dan menganggap shock yang tidak diberikan sebagai nol', () => {
    const result = calculateStressTest(positions, [{ symbol: 'BTC', percent: -100 }])

    expect(result.rows[0].stressedValue).toBe(0)
    expect(result.rows[1].pnl).toBe(0)
    expect(result.pnl).toBe(-200)
  })

  it('menolak portofolio kosong, nilai nol, dan shock yang lebih buruk dari -100%', () => {
    expect(() => calculateStressTest([], [])).toThrow('setidaknya satu aset')
    expect(() => calculateStressTest([{ ...positions[0], quantity: 0 }], [])).toThrow('lebih besar dari nol')
    expect(() => calculateStressTest(positions, [{ symbol: 'BTC', percent: -101 }])).toThrow('tidak boleh kurang dari -100%')
  })
})

describe('formatStressCsv', () => {
  it('menghasilkan ringkasan dan membungkus nama skenario yang mengandung koma', () => {
    const result = calculateStressTest(positions, [{ symbol: 'BTC', percent: -10 }])
    const csv = formatStressCsv(result, 'Risk-off, ringan')

    expect(csv).toContain('"Risk-off, ringan"')
    expect(csv).toContain('BTC,-10,200,180,-20,-5')
    expect(csv).toContain('TOTAL,,400,380,-20,-5')
    expect(csv.endsWith('\n')).toBe(true)
  })
})
