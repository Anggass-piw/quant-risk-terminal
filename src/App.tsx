import { useEffect, useMemo, useState } from 'react'
import { EquityChart, RiskHistogram, VolatilitySurface } from './components/Charts'
import { MetricCard } from './components/MetricCard'
import { simulateRisk, type RiskAsset, type RiskResult } from './lib/risk'
import { calculateStressTest, formatStressCsv } from './lib/stress'

type Page = 'overview' | 'portfolio' | 'simulation' | 'stress' | 'models'
type Position = RiskAsset & {
  name: string
  quantity: number
  basePrice: number
  color: string
  delta: number
  gamma: number
  vega: number
}

const positions: Position[] = [
  { symbol: 'BTC', name: 'Bitcoin', quantity: 1.35, basePrice: 1_095_000_000, weight: 0.65, dailyVolatility: 0.042, dailyDrift: 0.0008, color: '#b99cff', delta: 0.82, gamma: 0.017, vega: 18.4 },
  { symbol: 'ETH', name: 'Ethereum', quantity: 7.8, basePrice: 57_000_000, weight: 0.20, dailyVolatility: 0.051, dailyDrift: 0.0006, color: '#71a9ff', delta: 0.64, gamma: 0.012, vega: 14.2 },
  { symbol: 'SOL', name: 'Solana', quantity: 120, basePrice: 2_900_000, weight: 0.15, dailyVolatility: 0.067, dailyDrift: 0.0009, color: '#4dd8b2', delta: 0.53, gamma: 0.009, vega: 10.8 },
]

const navItems: { id: Page; title: string; icon: string }[] = [
  { id: 'overview', title: 'Ikhtisar', icon: '◫' },
  { id: 'portfolio', title: 'Portofolio', icon: '▤' },
  { id: 'simulation', title: 'Simulasi Risiko', icon: '⌁' },
  { id: 'stress', title: 'Stress Test', icon: '⚡' },
  { id: 'models', title: 'Lab Model', icon: '◈' },
]

const stressScenarios: { id: string; name: string; description: string; shocks: Record<string, number> }[] = [
  { id: 'risk-off', name: 'Risk-off', description: 'Koreksi pasar serentak', shocks: { BTC: -20, ETH: -30, SOL: -40 } },
  { id: 'crypto-winter', name: 'Crypto winter', description: 'Drawdown ekstrem aset kripto', shocks: { BTC: -50, ETH: -60, SOL: -70 } },
  { id: 'relief-rally', name: 'Relief rally', description: 'Skenario pemulihan harga', shocks: { BTC: 15, ETH: 25, SOL: 35 } },
]

const currency = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })
const number = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 })
const percent = new Intl.NumberFormat('id-ID', { style: 'percent', maximumFractionDigits: 2 })

function assetPrice(position: Position, tick: number): number {
  const drift = Math.sin(tick * 0.46 + position.weight * 11) * 0.0028
  const shortWave = Math.cos(tick * 0.19 + position.weight * 7) * 0.0012
  return position.basePrice * (1 + drift + shortWave)
}

function Icon({ name }: { name: string }) {
  return <span className="icon-glyph" aria-hidden="true">{name}</span>
}

function PositionTable({ tick, compact = false }: { tick: number; compact?: boolean }) {
  const totalValue = positions.reduce((sum, position) => sum + assetPrice(position, tick) * position.quantity, 0)
  return (
    <div className="table-wrap">
      <table className="positions-table">
        <thead>
          <tr><th>Aset</th><th>Harga simulasi</th><th>Jumlah</th><th>Nilai posisi</th><th>Bobot</th><th>Δ hari ini</th></tr>
        </thead>
        <tbody>
          {positions.map((position, index) => {
            const price = assetPrice(position, tick)
            const value = price * position.quantity
            const weight = value / totalValue
            const change = Math.sin(tick * 0.52 + index) * 1.24 + [1.42, -0.38, 2.16][index]
            return (
              <tr key={position.symbol}>
                <td>
                  <div className="asset-cell">
                    <span className="coin-mark" style={{ color: position.color, background: `${position.color}18` }}>{position.symbol.slice(0, 1)}</span>
                    <span><strong>{position.name}</strong><small>{position.symbol} · Spot demo</small></span>
                  </div>
                </td>
                <td className="numeric-cell">{currency.format(price)}</td>
                <td className="numeric-cell">{number.format(position.quantity)} {position.symbol}</td>
                <td className="numeric-cell">{currency.format(value)}</td>
                <td><div className="weight-cell"><span>{percent.format(weight)}</span><span className="weight-track"><i style={{ width: `${weight * 100}%`, background: position.color }} /></span></div></td>
                <td className={change >= 0 ? 'positive-cell' : 'negative-cell'}>{change >= 0 ? '+' : ''}{number.format(change)}%</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {compact && <div className="table-footnote">Data harga diperbarui secara sintetis di browser; tidak berasal dari bursa.</div>}
    </div>
  )
}

function RiskSummary({ result, portfolioValue, compact = false }: { result: RiskResult; portfolioValue: number; compact?: boolean }) {
  return (
    <section className={`panel risk-panel ${compact ? 'risk-panel-compact' : ''}`}>
      <div className="panel-heading">
        <div><span className="eyebrow">TAIL RISK</span><h2>Distribusi kerugian</h2></div>
        <span className="confidence-pill">{Math.round(result.confidence * 100)}% · {result.horizonDays} hari</span>
      </div>
      <div className="risk-values">
        <div><span>Value at Risk</span><strong>{currency.format(result.var)}</strong></div>
        <div><span>Conditional VaR</span><strong className="text-coral">{currency.format(result.cvar)}</strong></div>
      </div>
      <RiskHistogram returns={result.returns} confidence={result.confidence} />
      {!compact && <div className="chart-legend"><span><i className="legend-dot coral" />Ekor kerugian</span><span><i className="legend-dot mint" />Rentang hasil simulasi</span></div>}
      <div className="risk-footnote">Estimasi {result.scenarios.toLocaleString('id-ID')} skenario · Nilai portofolio acuan {currency.format(portfolioValue)}</div>
    </section>
  )
}

function EquityPanel({ range, setRange, tick, portfolioValue }: { range: string; setRange: (value: string) => void; tick: number; portfolioValue: number }) {
  return (
    <section className="panel equity-panel">
      <div className="panel-heading equity-heading">
        <div><span className="eyebrow">KURVA NILAI · SIMULASI</span><h2>Kinerja portofolio</h2></div>
        <div className="range-switch" role="group" aria-label="Rentang grafik">
          {['1H', '1D', '1W', '1M'].map((item) => <button key={item} className={range === item ? 'selected' : ''} onClick={() => setRange(item)}>{item}</button>)}
        </div>
      </div>
      <div className="chart-value-line"><strong>{currency.format(portfolioValue)}</strong><span className="chart-demo-caption">Kurva sintetis <small>· ilustratif</small></span></div>
      <EquityChart range={range} tick={tick} />
    </section>
  )
}

function PortfolioPage({ tick, portfolioValue }: { tick: number; portfolioValue: number }) {
  const largestWeight = Math.max(...positions.map((position) => assetPrice(position, tick) * position.quantity / portfolioValue))
  return (
    <div className="page-stack">
      <div className="page-intro"><div><span className="eyebrow">ALOKASI ASET</span><h2>Portofolio demo</h2><p>Posisi contoh yang diperbarui menggunakan pergerakan sintetis.</p></div><span className="demo-chip">PAPER DATA</span></div>
      <div className="metrics-grid three-metrics">
        <MetricCard label="Nilai portofolio" value={currency.format(portfolioValue)} change="Data sintetis" tone="positive" icon={<Icon name="↗" />} />
        <MetricCard label="Jumlah aset" value="3" hint="Instrumen demo" tone="violet" icon={<Icon name="◈" />} />
        <MetricCard label="Konsentrasi terbesar" value={percent.format(largestWeight)} hint="BTC · bobot simulasi" tone="neutral" icon={<Icon name="◎" />} />
      </div>
      <section className="panel table-panel">
        <div className="panel-heading"><div><span className="eyebrow">POSISI SAAT INI</span><h2>Komposisi aset</h2></div><span className="tiny-status"><i /> Sintetis</span></div>
        <PositionTable tick={tick} compact />
      </section>
      <div className="panel-note"><strong>Catatan:</strong> Kuantitas dan harga di halaman ini adalah contoh lokal untuk demonstrasi. Aplikasi tidak membaca saldo pengguna dan tidak memiliki koneksi ke exchange.</div>
    </div>
  )
}

function SimulationPage({ result, portfolioValue, confidence, setConfidence, horizon, setHorizon, scenarios, setScenarios, runSimulation, isRunning }: {
  result: RiskResult
  portfolioValue: number
  confidence: number
  setConfidence: (value: number) => void
  horizon: number
  setHorizon: (value: number) => void
  scenarios: number
  setScenarios: (value: number) => void
  runSimulation: () => void
  isRunning: boolean
}) {
  return (
    <div className="page-stack">
      <div className="page-intro"><div><span className="eyebrow">MONTE CARLO · BROWSER-ONLY</span><h2>Simulasi risiko</h2><p>Ubah asumsi dan jalankan ulang simulasi return portofolio.</p></div><button className="primary-button" onClick={runSimulation} disabled={isRunning}>{isRunning ? 'Menghitung…' : '↻  Jalankan simulasi'}</button></div>
      <section className="panel controls-panel">
        <div className="control-block"><label>Tingkat kepercayaan</label><div className="range-switch larger" role="group" aria-label="Tingkat kepercayaan"><button className={confidence === 0.95 ? 'selected' : ''} onClick={() => setConfidence(0.95)}>95%</button><button className={confidence === 0.99 ? 'selected' : ''} onClick={() => setConfidence(0.99)}>99%</button></div></div>
        <div className="control-block"><label>Horizon risiko</label><select value={horizon} onChange={(event) => setHorizon(Number(event.target.value))}><option value={1}>1 hari</option><option value={5}>5 hari</option><option value={10}>10 hari</option></select></div>
        <div className="control-block"><label>Jumlah skenario</label><select value={scenarios} onChange={(event) => setScenarios(Number(event.target.value))}><option value={2500}>2.500</option><option value={10000}>10.000</option><option value={25000}>25.000</option></select></div>
        <div className="seed-note"><span className="seed-icon">⌘</span><span>Seed deterministik<br /><strong>Model GBM sederhana</strong></span></div>
      </section>
      <div className="metrics-grid three-metrics risk-metrics">
        <MetricCard label={`VaR ${Math.round(result.confidence * 100)}%`} value={currency.format(result.var)} hint={`${result.horizonDays} hari · kerugian ambang`} tone="negative" icon={<Icon name="⌁" />} />
        <MetricCard label="CVaR / Expected Shortfall" value={currency.format(result.cvar)} hint="Rata-rata kerugian pada ekor" tone="negative" icon={<Icon name="⌄" />} />
        <MetricCard label="Volatilitas simulasi" value={percent.format(result.volatility)} hint={`${result.scenarios.toLocaleString('id-ID')} skenario`} tone="violet" icon={<Icon name="∿" />} />
      </div>
      <RiskSummary result={result} portfolioValue={portfolioValue} />
      <div className="panel-note"><strong>Interpretasi:</strong> VaR adalah ambang kerugian pada tingkat kepercayaan terpilih dalam model ini, bukan batas kerugian maksimum. CVaR mengukur rata-rata kerugian di ekor distribusi. Angka ini sintetis dan bukan rekomendasi investasi.</div>
    </div>
  )
}

function StressPage({ tick }: { tick: number }) {
  const [selectedScenario, setSelectedScenario] = useState('risk-off')
  const [shockValues, setShockValues] = useState<Record<string, number>>({ ...stressScenarios[0].shocks })
  const stressPositions = positions.map((position) => ({
    symbol: position.symbol,
    name: position.name,
    quantity: position.quantity,
    price: assetPrice(position, tick),
    color: position.color,
  }))
  const result = calculateStressTest(stressPositions, stressPositions.map((position) => ({
    symbol: position.symbol,
    percent: shockValues[position.symbol] ?? 0,
  })))
  const scenarioName = stressScenarios.find((scenario) => scenario.id === selectedScenario)?.name ?? 'Shock kustom'

  const applyPreset = (scenario: typeof stressScenarios[number]) => {
    setSelectedScenario(scenario.id)
    setShockValues({ ...scenario.shocks })
  }
  const updateShock = (symbol: string, value: number) => {
    if (!Number.isFinite(value)) return
    setSelectedScenario('custom')
    setShockValues((current) => ({ ...current, [symbol]: Math.max(-100, Math.min(100, value)) }))
  }
  const exportCsv = () => {
    const blob = new Blob([formatStressCsv(result, scenarioName)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'quant-risk-stress-test.csv'
    document.body.append(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
  }

  return (
    <div className="page-stack">
      <div className="page-intro"><div><span className="eyebrow">SCENARIO ANALYSIS · SPOT SHOCK</span><h2>Stress test portofolio</h2><p>Ukur dampak perubahan harga hipotetis terhadap setiap posisi.</p></div><button className="primary-button" onClick={exportCsv}>↓  Ekspor CSV</button></div>
      <section className="scenario-grid" aria-label="Preset skenario stress">
        {stressScenarios.map((scenario) => <button key={scenario.id} className={`scenario-card ${selectedScenario === scenario.id ? 'selected' : ''}`} onClick={() => applyPreset(scenario)}>
          <strong>{scenario.name}</strong><span>{scenario.description}</span><small>BTC {scenario.shocks.BTC > 0 ? '+' : ''}{scenario.shocks.BTC}% · ETH {scenario.shocks.ETH > 0 ? '+' : ''}{scenario.shocks.ETH}% · SOL {scenario.shocks.SOL > 0 ? '+' : ''}{scenario.shocks.SOL}%</small>
        </button>)}
        <button className={`scenario-card ${selectedScenario === 'custom' ? 'selected' : ''}`} onClick={() => { setSelectedScenario('custom'); setShockValues(Object.fromEntries(positions.map((position) => [position.symbol, 0]))) }}>
          <strong>Shock kustom</strong><span>Tentukan perubahan tiap aset</span><small>Atur sendiri · −100% hingga +100%</small>
        </button>
      </section>
      <section className="panel shock-panel">
        <div className="panel-heading"><div><span className="eyebrow">ASUMSI HARGA</span><h2>Shock per aset</h2></div><span className="tiny-status"><i /> {scenarioName}</span></div>
        <div className="shock-grid">{stressPositions.map((position) => {
          const value = shockValues[position.symbol] ?? 0
          return <div className="shock-control" key={position.symbol}>
            <div className="shock-control-heading"><span className="asset-cell"><span className="coin-mark" style={{ color: position.color, background: `${position.color}18` }}>{position.symbol.slice(0, 1)}</span><span><strong>{position.name}</strong><small>{position.symbol} · spot demo</small></span></span><label className="shock-input-wrap"><input type="number" min="-100" max="100" step="1" value={value} aria-label={`${position.symbol} shock dalam persen`} onChange={(event) => updateShock(position.symbol, Number(event.target.value))} /><span>%</span></label></div>
            <input className="shock-slider" type="range" min="-100" max="100" step="1" value={value} aria-label={`Atur shock ${position.symbol}`} onChange={(event) => updateShock(position.symbol, Number(event.target.value))} />
            <div className="shock-scale"><span>−100%</span><span>0%</span><span>+100%</span></div>
          </div>
        })}</div>
      </section>
      <div className="metrics-grid stress-metrics">
        <MetricCard label="Nilai sebelum shock" value={currency.format(result.currentValue)} hint="Posisi demo saat ini" tone="neutral" icon={<Icon name="◎" />} />
        <MetricCard label="Nilai setelah shock" value={currency.format(result.stressedValue)} hint={scenarioName} tone="violet" icon={<Icon name="↗" />} />
        <MetricCard label="Dampak P&L" value={`${result.pnl > 0 ? '+' : ''}${currency.format(result.pnl)}`} change={result.pnl >= 0 ? 'Skenario positif' : 'Skenario negatif'} hint={`${result.changePercent > 0 ? '+' : ''}${number.format(result.changePercent)}% dari nilai awal`} tone={result.pnl >= 0 ? 'positive' : 'negative'} icon={<Icon name={result.pnl >= 0 ? '↗' : '↘'} />} />
      </div>
      <section className="panel table-panel stress-results-panel">
        <div className="panel-heading"><div><span className="eyebrow">HASIL PER POSISI</span><h2>Rincian dampak skenario</h2></div><span className="table-caption">Linear repricing · IDR</span></div>
        <div className="table-wrap"><table className="positions-table stress-table">
          <thead><tr><th>Aset</th><th>Shock</th><th>Nilai awal</th><th>Nilai setelah shock</th><th>P&amp;L</th><th>Kontribusi</th></tr></thead>
          <tbody>{result.rows.map((row) => <tr key={row.symbol}>
            <td><div className="asset-cell"><span className="coin-mark" style={{ color: stressPositions.find((position) => position.symbol === row.symbol)?.color }}>{row.symbol.slice(0, 1)}</span><span><strong>{row.name}</strong><small>{row.symbol} · spot demo</small></span></div></td>
            <td className={row.shockPercent >= 0 ? 'positive-cell' : 'negative-cell'}>{row.shockPercent > 0 ? '+' : ''}{number.format(row.shockPercent)}%</td>
            <td className="numeric-cell">{currency.format(row.currentValue)}</td>
            <td className="numeric-cell">{currency.format(row.stressedValue)}</td>
            <td className={row.pnl >= 0 ? 'positive-cell' : 'negative-cell'}>{row.pnl > 0 ? '+' : ''}{currency.format(row.pnl)}</td>
            <td className={row.portfolioImpactPercent >= 0 ? 'positive-cell' : 'negative-cell'}>{row.portfolioImpactPercent > 0 ? '+' : ''}{number.format(row.portfolioImpactPercent)}%</td>
          </tr>)}</tbody>
          <tfoot><tr><th>TOTAL</th><td>—</td><td>{currency.format(result.currentValue)}</td><td>{currency.format(result.stressedValue)}</td><td className={result.pnl >= 0 ? 'positive-cell' : 'negative-cell'}>{result.pnl > 0 ? '+' : ''}{currency.format(result.pnl)}</td><td className={result.changePercent >= 0 ? 'positive-cell' : 'negative-cell'}>{result.changePercent > 0 ? '+' : ''}{number.format(result.changePercent)}%</td></tr></tfoot>
        </table></div>
      </section>
      <div className="panel-note"><strong>Batasan model:</strong> Shock diterapkan langsung pada nilai posisi spot (linear repricing). Analisis ini tidak memperhitungkan korelasi, likuiditas, slippage, pajak, atau instrumen derivatif. Seluruh harga dan hasil bersifat sintetis, bukan prediksi maupun rekomendasi investasi.</div>
    </div>
  )
}

function ModelPage() {
  return (
    <div className="page-stack">
      <div className="page-intro"><div><span className="eyebrow">VOLATILITAS & ASUMSI</span><h2>Lab model</h2><p>Pratinjau permukaan dan status komponen untuk versi MVP.</p></div><span className="demo-chip">BELUM TERKALIBRASI</span></div>
      <div className="model-grid">
        <section className="panel surface-panel"><div className="panel-heading"><div><span className="eyebrow">IMPLIED VOLATILITY · SINTETIS</span><h2>Permukaan volatilitas</h2></div><span className="surface-label">WIREframe DEMO</span></div><VolatilitySurface /><div className="surface-legend"><span>Tenor pendek</span><i /><span>Tenor panjang</span></div></section>
        <section className="panel model-status-panel"><div className="panel-heading"><div><span className="eyebrow">KOMPONEN MVP</span><h2>Status model</h2></div></div>
          <div className="status-row"><span><i className="status-dot ready" />Simulasi Monte Carlo</span><strong>Aktif · lokal</strong></div>
          <div className="status-row"><span><i className="status-dot demo" />Data pasar</span><strong>Sintetis</strong></div>
          <div className="status-row"><span><i className="status-dot off" />Kalibrasi Heston PDE</span><strong>Belum tersedia</strong></div>
          <div className="status-row"><span><i className="status-dot off" />GPU / CUDA engine</span><strong>Belum tersedia</strong></div>
          <div className="status-row"><span><i className="status-dot off" />Streaming WebSocket</span><strong>Belum tersedia</strong></div>
          <div className="model-callout">Visualisasi ini adalah wireframe ilustratif. Tidak ada kalibrasi ke harga opsi pasar atau estimasi parameter Heston di MVP.</div>
        </section>
      </div>
      <section className="panel greek-panel"><div className="panel-heading"><div><span className="eyebrow">GREEKS · NILAI CONTOH</span><h2>Eksposur ilustratif</h2></div><span className="tiny-status">Bukan hasil pricing opsi</span></div><div className="greek-values"><div><span>Delta (Δ)</span><strong>0,74</strong><small>sensitivitas arah</small></div><div><span>Gamma (Γ)</span><strong>0,014</strong><small>perubahan delta</small></div><div><span>Vega (ν)</span><strong>15,8</strong><small>sensitivitas volatilitas</small></div></div></section>
    </div>
  )
}

export default function App() {
  const [page, setPage] = useState<Page>('overview')
  const [tick, setTick] = useState(0)
  const [range, setRange] = useState('1D')
  const [confidence, setConfidence] = useState(0.99)
  const [horizon, setHorizon] = useState(1)
  const [scenarios, setScenarios] = useState(10_000)
  const [runId, setRunId] = useState(0)
  const [isRunning, setIsRunning] = useState(false)

  useEffect(() => {
    const timer = window.setInterval(() => setTick((value) => value + 1), 3_000)
    return () => window.clearInterval(timer)
  }, [])

  const portfolioValue = positions.reduce((sum, position) => sum + assetPrice(position, tick) * position.quantity, 0)
  const riskResult = useMemo(() => simulateRisk(positions.map((position) => ({ ...position, weight: assetPrice(position, tick) * position.quantity / portfolioValue })), portfolioValue, {
    confidence,
    horizonDays: horizon,
    scenarios,
    seed: 7_421 + runId,
  }), [confidence, horizon, scenarios, portfolioValue, runId, tick])

  const runSimulation = () => {
    setIsRunning(true)
    window.setTimeout(() => {
      setRunId((value) => value + 1)
      setIsRunning(false)
    }, 180)
  }

  const title = navItems.find((item) => item.id === page)?.title ?? 'Ikhtisar'
  const latest = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date())

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark"><span>◌</span><i /></div><div><strong>AURORA</strong><small>QUANT TERMINAL</small></div></div>
        <div className="workspace-select"><span className="workspace-avatar">A</span><span><strong>Research Desk</strong><small>Workspace demo</small></span><span className="chevron">⌄</span></div>
        <div className="nav-caption">ANALISIS</div>
        <nav className="main-nav" aria-label="Navigasi utama">
          {navItems.map((item) => <button key={item.id} className={`nav-item ${page === item.id ? 'active' : ''}`} onClick={() => setPage(item.id)}><span className="nav-icon">{item.icon}</span><span>{item.title}</span>{item.id === 'simulation' && <span className="nav-badge">MVP</span>}</button>)}
        </nav>
        <div className="sidebar-divider" />
        <div className="nav-caption">WORKSPACE</div>
        <button className="nav-item muted-nav" onClick={() => setPage('models')}><span className="nav-icon">▧</span><span>Asumsi & model</span></button>
        <div className="sidebar-bottom">
          <div className="safe-box"><span className="safe-icon">⌑</span><div><strong>Mode aman aktif</strong><small>Order riil dinonaktifkan</small></div><i /></div>
          <div className="profile-row"><div className="profile-avatar">AP</div><span><strong>Analyst Profile</strong><small>Local demo</small></span><span className="more-dots">···</span></div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar"><div className="breadcrumb"><span>Workspace</span><i>/</i><strong>{title}</strong></div><div className="topbar-actions"><span className="feed-status"><i /> DATA SIMULASI</span><span className="updated-label">Update {latest}</span><button className="icon-button" aria-label="Notifikasi">♧<span /></button><div className="top-avatar">AP</div></div></header>
        <div className="content-area">
          <div className="page-header"><div><div className="page-kicker"><span className="pulse-dot" />ENVIRONMENT: SIMULATED</div><h1>{page === 'overview' ? 'Terminal risiko kuantitatif' : title}</h1><p>{page === 'overview' ? 'Ringkasan risiko dan eksekusi portofolio dalam lingkungan simulasi.' : page === 'portfolio' ? 'Pantau komposisi dan eksposur aset sintetis.' : page === 'simulation' ? 'Uji skenario pasar dan ukur risiko ekor portofolio.' : page === 'stress' ? 'Ukur dampak shock harga hipotetis pada posisi portofolio.' : 'Eksplorasi wireframe volatilitas dan status modul analitik.'}</p></div><div className="header-actions"><span className="session-label"><span /> SANDBOX</span><button className="secondary-button" onClick={() => setPage('simulation')}>＋ <span>Skenario baru</span></button></div></div>

          {page === 'overview' && <div className="page-stack">
            <div className="metrics-grid">
              <MetricCard label="Nilai portofolio" value={currency.format(portfolioValue)} change="Data sintetis" tone="positive" icon={<Icon name="↗" />} hint="Equity simulasi" />
              <MetricCard label={`VaR ${Math.round(riskResult.confidence * 100)}% · ${riskResult.horizonDays} hari`} value={currency.format(riskResult.var)} change="Risiko ekor" tone="negative" icon={<Icon name="⌁" />} hint="Metode Monte Carlo" />
              <MetricCard label={`CVaR ${Math.round(riskResult.confidence * 100)}%`} value={currency.format(riskResult.cvar)} change="Expected shortfall" tone="violet" icon={<Icon name="⌄" />} hint="Rata-rata tail loss" />
              <MetricCard label="Vol. tahunan (aproks.)" value={percent.format(riskResult.volatility * Math.sqrt(252 / riskResult.horizonDays))} tone="neutral" icon={<Icon name="∿" />} hint="√waktu · 252 hari" />
            </div>
            <div className="dashboard-grid">
              <EquityPanel range={range} setRange={setRange} tick={tick} portfolioValue={portfolioValue} />
              <RiskSummary result={riskResult} portfolioValue={portfolioValue} compact />
            </div>
            <section className="panel table-panel overview-table">
              <div className="panel-heading"><div><span className="eyebrow">ASSET ALLOCATION</span><h2>Posisi portofolio</h2></div><button className="text-button" onClick={() => setPage('portfolio')}>Lihat semua <span>→</span></button></div>
              <PositionTable tick={tick} compact />
            </section>
            <div className="bottom-grid">
              <section className="panel surface-preview"><div className="panel-heading"><div><span className="eyebrow">MODEL LAB · PREVIEW</span><h2>Permukaan volatilitas</h2></div><button className="text-button" onClick={() => setPage('models')}>Buka lab <span>→</span></button></div><VolatilitySurface /><div className="surface-inline-note"><i /> Kurva sintetis · belum dikalibrasi ke pasar</div></section>
              <section className="panel execution-panel"><div className="panel-heading"><div><span className="eyebrow">EXECUTION CONTROL</span><h2>Kontrol eksekusi</h2></div><span className="disabled-pill">NONAKTIF</span></div><div className="execution-state"><div className="lock-mark">⌑</div><div><strong>Paper-only environment</strong><p>Transmisi order riil tidak tersedia pada versi MVP ini.</p></div></div><button className="disabled-execution" disabled>Eksekusi riil dinonaktifkan</button><button className="simulation-link" onClick={() => setPage('simulation')}>Jalankan simulasi risiko <span>→</span></button></section>
            </div>
            <div className="disclaimer-bar"><span>ⓘ</span><p>Seluruh data pada dashboard adalah data sintetis untuk demonstrasi. VaR, CVaR, Greeks, dan skenario tidak dapat digunakan sebagai saran atau keputusan investasi.</p></div>
          </div>}

          {page === 'portfolio' && <PortfolioPage tick={tick} portfolioValue={portfolioValue} />}
          {page === 'simulation' && <SimulationPage result={riskResult} portfolioValue={portfolioValue} confidence={confidence} setConfidence={setConfidence} horizon={horizon} setHorizon={setHorizon} scenarios={scenarios} setScenarios={setScenarios} runSimulation={runSimulation} isRunning={isRunning} />}
          {page === 'stress' && <StressPage tick={tick} />}
          {page === 'models' && <ModelPage />}
        </div>
      </main>
    </div>
  )
}
