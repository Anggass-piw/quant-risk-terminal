import { useMemo } from 'react'
import { buildHistogram } from '../lib/risk'

const chartPalette = ['#7c6cf2', '#44d6b5', '#61a6ff']

export function EquityChart({ range, tick }: { range: string; tick: number }) {
  const points = useMemo(() => {
    const count = range === '1H' ? 24 : range === '1D' ? 30 : range === '1W' ? 36 : 42
    return Array.from({ length: count }, (_, index) => {
      const trend = index * 0.43
      const wave = Math.sin(index * 0.72) * 3.2 + Math.cos(index * 0.23) * 2.1
      const fine = Math.sin(index * 2.06) * 1.15
      const pulse = Math.sin((index + tick * 0.7) * 0.42) * 0.7
      return 48 + trend + wave + fine + pulse
    })
  }, [range, tick])

  const coordinates = points.map((value, index) => ({
    x: 8 + (index / (points.length - 1)) * 984,
    y: 210 - ((value - Math.min(...points)) / (Math.max(...points) - Math.min(...points))) * 160,
  }))
  const line = coordinates.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
  const area = `${line} L 992 218 L 8 218 Z`

  return (
    <svg className="equity-chart" viewBox="0 0 1000 250" role="img" aria-label={`Grafik kinerja simulasi ${range}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="equity-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#8171ff" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#8171ff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="equity-stroke" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#6f70ff" />
          <stop offset="100%" stopColor="#40ddba" />
        </linearGradient>
      </defs>
      {[50, 100, 150, 200].map((y) => <line key={y} x1="8" x2="992" y1={y} y2={y} className="chart-gridline" />)}
      <path d={area} fill="url(#equity-fill)" />
      <path d={line} fill="none" stroke="url(#equity-stroke)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={coordinates[coordinates.length - 1].x} cy={coordinates[coordinates.length - 1].y} r="5" fill="#49ddbc" stroke="#101720" strokeWidth="3" />
      <text x="10" y="241" className="chart-axis-label">{range === '1H' ? '60 mnt lalu' : range === '1D' ? '00:00' : range === '1W' ? 'Senin' : '01 Okt'}</text>
      <text x="492" y="241" textAnchor="middle" className="chart-axis-label">{range === '1H' ? '30 mnt' : range === '1D' ? '12:00' : range === '1W' ? 'Kamis' : '15 Okt'}</text>
      <text x="990" y="241" textAnchor="end" className="chart-axis-label">sekarang</text>
    </svg>
  )
}

export function RiskHistogram({ returns, confidence }: { returns: number[]; confidence: number }) {
  const bins = useMemo(() => buildHistogram(returns, 22), [returns])
  const maxCount = Math.max(...bins.map((bin) => bin.count), 1)
  const cutoffIndex = Math.ceil((1 - confidence) * returns.length) - 1
  const cutoff = returns[Math.max(0, cutoffIndex)] ?? 0

  return (
    <svg className="histogram-chart" viewBox="0 0 520 190" role="img" aria-label="Histogram distribusi return hasil simulasi Monte Carlo" preserveAspectRatio="none">
      {[34, 72, 110, 148].map((y) => <line key={y} x1="28" x2="512" y1={y} y2={y} className="chart-gridline" />)}
      {bins.map((bin, index) => {
        const barWidth = 15
        const gap = 6
        const x = 34 + index * (barWidth + gap)
        const height = (bin.count / maxCount) * 112
        const isTail = bin.x <= cutoff
        return <rect key={`${index}-${bin.x}`} x={x} y={148 - height} width={barWidth} height={height} rx="3" fill={isTail ? '#fb7185' : '#42d5b0'} opacity={isTail ? 0.82 : 0.72} />
      })}
      <line x1={34 + Math.max(0, bins.findIndex((bin) => bin.x > cutoff)) * 21} x2={34 + Math.max(0, bins.findIndex((bin) => bin.x > cutoff)) * 21} y1="22" y2="150" stroke="#fb7185" strokeDasharray="4 4" strokeWidth="1.5" />
      <text x="30" y="177" className="chart-axis-label">Rugi</text>
      <text x="270" y="177" textAnchor="middle" className="chart-axis-label">Return simulasi</text>
      <text x="510" y="177" textAnchor="end" className="chart-axis-label">Untung</text>
    </svg>
  )
}

export function VolatilitySurface() {
  const lines = useMemo(() => {
    const output: { points: string; color: string; opacity: number }[] = []
    const project = (u: number, v: number) => {
      const ridge = Math.exp(-((u - 0.56) ** 2) / 0.09) * 23
      const smile = Math.sin(u * Math.PI * 1.3) * 8
      const slope = (1 - v) * 42
      const z = 60 + ridge + smile + slope + Math.sin(v * Math.PI * 1.1) * 7
      const x = 58 + u * 460 + (v - 0.5) * 82
      const y = 154 - z + v * 51
      return `${x.toFixed(1)},${y.toFixed(1)}`
    }
    for (let row = 0; row <= 7; row += 1) {
      const v = row / 7
      const points = Array.from({ length: 33 }, (_, index) => project(index / 32, v)).join(' ')
      output.push({ points, color: row === 3 ? '#8c7dff' : '#55b8e9', opacity: row === 3 ? 0.95 : 0.44 })
    }
    for (let column = 0; column <= 12; column += 1) {
      const u = column / 12
      const points = Array.from({ length: 17 }, (_, index) => project(u, index / 16)).join(' ')
      output.push({ points, color: column === 6 ? '#47d9b6' : '#6864d8', opacity: column === 6 ? 0.9 : 0.5 })
    }
    return output
  }, [])

  return (
    <svg className="surface-chart" viewBox="0 0 560 230" role="img" aria-label="Wireframe permukaan volatilitas implisit sintetis">
      <path d="M 48 188 L 486 188 L 540 160" fill="none" className="surface-axis" />
      <path d="M 48 188 L 102 215 L 540 188" fill="none" className="surface-axis" />
      {lines.map((line, index) => <polyline key={index} points={line.points} fill="none" stroke={line.color} strokeWidth="1.15" opacity={line.opacity} />)}
      <text x="258" y="220" textAnchor="middle" className="chart-axis-label">Moneyness</text>
      <text x="520" y="203" textAnchor="end" className="chart-axis-label">Tenor</text>
      <text x="18" y="55" className="chart-axis-label">IV</text>
    </svg>
  )
}

export const chartColors = chartPalette
