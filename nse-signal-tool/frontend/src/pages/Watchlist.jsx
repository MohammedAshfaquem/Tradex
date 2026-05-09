// import { useState, useEffect } from 'react'
// import { useNavigate } from 'react-router-dom'
// import axios from 'axios'
// import {  LineChart, Line, ResponsiveContainer } from 'recharts'

// const Watchlist = () => {
//   const navigate = useNavigate()
//   const [watchlist, setWatchlist] = useState([])
//   const [stockData, setStockData] = useState({})
//   const [newSymbol, setNewSymbol] = useState('')
//   const [loading, setLoading] = useState(true)
//   const [adding, setAdding] = useState(false)

//   // Fetch watchlist
//   useEffect(() => {
//     fetchWatchlist()
//   }, [])

//   const fetchWatchlist = async () => {
//     try {
//       const res = await axios.get('/api/watchlist')
//       const stocks = res.data.watchlist

//       setWatchlist(stocks)

//       // Fetch signal data for each stock
//       for (const stock of stocks) {
//         fetchStockData(stock.symbol)
//       }

//       setLoading(false)
//     } catch (error) {
//       console.error('Error fetching watchlist:', error)
//       setLoading(false)
//     }
//   }

//   const fetchStockData = async (symbol) => {
//     try {
//       const [signalRes, chartRes] = await Promise.all([
//         axios.get(`/api/signal/${symbol}`),
//         axios.get(`/api/chart/${symbol}?timeframe=1d`),
//       ])

//       setStockData((prev) => ({
//         ...prev,
//         [symbol]: {
//           signal: signalRes.data,
//           chart: chartRes.data.data.slice(-20), // Last 20 candles
//         },
//       }))
//     } catch (error) {
//       console.error(`Error fetching data for ${symbol}:`, error)
//     }
//   }

//   const addStock = async (e) => {
//     e.preventDefault()

//     if (!newSymbol.trim()) return

//     setAdding(true)

//     try {
//       // Validate symbol exists
//       await axios.get(`/api/signal/${newSymbol.toUpperCase()}`)

//       // Add to watchlist
//       await axios.post('/api/watchlist', {
//         symbol: newSymbol.toUpperCase(),
//       })

//       setNewSymbol('')
//       fetchWatchlist()
//     } catch (error) {
//       alert(
//         `Failed to add ${newSymbol}. Please check if the symbol is valid.`
//       )
//     } finally {
//       setAdding(false)
//     }
//   }

//   const removeStock = async (symbol) => {
//     if (!confirm(`Remove ${symbol} from watchlist?`)) return

//     try {
//       await axios.delete(`/api/watchlist/${symbol}`)
//       setWatchlist((prev) => prev.filter((s) => s.symbol !== symbol))
//       setStockData((prev) => {
//         const newData = { ...prev }
//         delete newData[symbol]
//         return newData
//       })
//     } catch (error) {
//       console.error('Error removing stock:', error)
//     }
//   }

//   if (loading) {
//     return (
//       <div className="flex items-center justify-center h-full">
//         <div className="text-center">
//           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto"></div>
//           <p className="mt-4 text-text-secondary">Loading watchlist...</p>
//         </div>
//       </div>
//     )
//   }

//   return (
//     <div className="p-6 space-y-6">
//       {/* Header */}
//       <div>
//         <h1 className="text-3xl font-bold">Watchlist</h1>
//         <p className="text-text-secondary mt-1">
//           Track your favorite NSE stocks
//         </p>
//       </div>

//       {/* Add Stock Form */}
//       <div className="premium-card">
//         <form onSubmit={addStock} className="flex gap-3">
//           <input
//             type="text"
//             value={newSymbol}
//             onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
//             placeholder="Search stock symbol (e.g., RELIANCE)"
//             className="premium-input flex-1"
//             disabled={adding}
//           />
//           <button
//             type="submit"
//             disabled={adding}
//             className="btn-primary disabled:opacity-50"
//           >
//             {adding ? 'Adding...' : 'Add Stock'}
//           </button>
//         </form>
//       </div>

//       {/* Watchlist Grid */}
//       {watchlist.length === 0 ? (
//         <div className="premium-card text-center py-12">
//           <p className="text-text-secondary">
//             No stocks in watchlist. Add some to get started!
//           </p>
//         </div>
//       ) : (
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//           {watchlist.map((stock) => {
//             const data = stockData[stock.symbol]

//             return (
//               <div
//                 key={stock.symbol}
//                 className="premium-card-hover"
//                 onClick={() => navigate(`/chart/${stock.symbol}`)}
//               >
//                 <div className="flex items-start justify-between mb-4">
//                   <div>
//                     <h3 className="text-xl font-bold">{stock.symbol}</h3>
//                     {data?.signal && (
//                       <p className="text-text-secondary text-sm mt-1">
//                         ₹{data.signal.entry_price?.toFixed(2)}
//                         {data.signal.entry_price && (
//                           <span
//                             className={
//                               Math.random() > 0.5
//                                 ? 'text-signal-buy ml-2'
//                                 : 'text-signal-sell ml-2'
//                             }
//                           >
//                             {Math.random() > 0.5 ? '+' : '-'}
//                             {(Math.random() * 3).toFixed(2)}%
//                           </span>
//                         )}
//                       </p>
//                     )}
//                   </div>

//                   <button
//                     onClick={(e) => {
//                       e.stopPropagation()
//                       removeStock(stock.symbol)
//                     }}
//                     className="text-text-secondary hover:text-signal-sell transition-colors"
//                   >
//                     ✕
//                   </button>
//                 </div>

//                 {data?.signal && (
//                   <>
//                     <div className="flex items-center justify-between mb-3">
//                       <span
//                         className={`signal-badge-${data.signal.signal.toLowerCase()}`}
//                       >
//                         {data.signal.signal}
//                       </span>
//                       <span className="text-sm font-semibold">
//                         {data.signal.confidence}%
//                       </span>
//                     </div>

//                     {/* Mini Sparkline */}
//                     {data.chart && data.chart.length > 0 && (
//                       <div className="h-16">
//                         <ResponsiveContainer width="100%" height="100%">
//                           <LineChart data={data.chart}>
//                             <Line
//                               type="monotone"
//                               dataKey="close"
//                               stroke="#0a84ff"
//                               strokeWidth={2}
//                               dot={false}
//                             />
//                           </LineChart>
//                         </ResponsiveContainer>
//                       </div>
//                     )}

//                     <div className="mt-3 pt-3 border-t border-bg-border text-sm">
//                       <p className="text-text-secondary line-clamp-2">
//                         {data.signal.reason}
//                       </p>
//                     </div>
//                   </>
//                 )}

//                 {!data && (
//                   <div className="text-center py-4">
//                     <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent mx-auto"></div>
//                   </div>
//                 )}
//               </div>
//             )
//           })}
//         </div>
//       )}
//     </div>
//   )
// }

// export default Watchlist


import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import {
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'

const SIGNAL_CONFIG = {
  BUY:    { label: 'BUY',    color: '#16a34a', bg: 'rgba(22,163,74,0.10)',  dot: '#16a34a' },
  SELL:   { label: 'SELL',   color: '#dc2626', bg: 'rgba(220,38,38,0.10)',  dot: '#dc2626' },
  WATCH:  { label: 'WATCH',  color: '#d97706', bg: 'rgba(217,119,6,0.10)',  dot: '#d97706' },
  SKIP:   { label: 'SKIP',   color: '#6b7280', bg: 'rgba(107,114,128,0.10)',dot: '#6b7280' },
  NEUTRAL:{ label: 'NEUTRAL',color: '#6b7280', bg: 'rgba(107,114,128,0.10)',dot: '#6b7280' },
}

const getSignalCfg = (signal = '') => SIGNAL_CONFIG[signal.toUpperCase()] || SIGNAL_CONFIG.NEUTRAL

const ConfidenceRing = ({ value }) => {
  const r = 14
  const circ = 2 * Math.PI * r
  const pct = Math.min(100, Math.max(0, value || 0))
  const dash = (pct / 100) * circ
  const color = pct >= 70 ? '#16a34a' : pct >= 45 ? '#d97706' : '#dc2626'
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
      <circle cx="18" cy="18" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
      <circle
        cx="18" cy="18" r={r} fill="none"
        stroke={color} strokeWidth="3"
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
      />
      <text
        x="18" y="18"
        textAnchor="middle" dominantBaseline="central"
        style={{ transform: 'rotate(90deg) translate(0px, -36px)', transformOrigin: '18px 18px', fontSize: '9px', fontWeight: 600, fill: color }}
      >
        {pct}%
      </text>
    </svg>
  )
}

const SparkTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#161b22', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 6, padding: '4px 8px', fontSize: 11, color: '#e6edf3'
    }}>
      ₹{Number(payload[0].value).toFixed(2)}
    </div>
  )
}

const MiniSpark = ({ data, signal }) => {
  if (!data || data.length === 0) return null
  const first = data[0]?.close || 0
  const last = data[data.length - 1]?.close || 0
  const isUp = last >= first
  const lineColor = isUp ? '#16a34a' : '#dc2626'
  return (
    <ResponsiveContainer width="100%" height={56}>
      <LineChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
        <Tooltip content={<SparkTooltip />} />
        <Line
          type="monotone" dataKey="close"
          stroke={lineColor} strokeWidth={1.5}
          dot={false} activeDot={{ r: 3, fill: lineColor }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

const SkeletonCard = () => (
  <div style={{
    background: '#0d1117', border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 12, padding: '20px', animation: 'pulse 1.6s ease-in-out infinite'
  }}>
    {[60, 40, 80, 30].map((w, i) => (
      <div key={i} style={{
        height: i === 0 ? 18 : 12,
        width: `${w}%`,
        background: 'rgba(255,255,255,0.05)',
        borderRadius: 4,
        marginBottom: i < 3 ? 12 : 0
      }} />
    ))}
  </div>
)

const Watchlist = () => {
  const navigate = useNavigate()
  const [watchlist, setWatchlist] = useState([])
  const [stockData, setStockData] = useState({})
  const [newSymbol, setNewSymbol] = useState('')
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')
  const [sortBy, setSortBy] = useState('confidence')
  const [filterSignal, setFilterSignal] = useState('ALL')

  useEffect(() => { fetchWatchlist() }, [])

  const fetchWatchlist = async () => {
    try {
      const res = await axios.get('/api/watchlist')
      const stocks = res.data.watchlist
      setWatchlist(stocks)
      for (const stock of stocks) fetchStockData(stock.symbol)
      setLoading(false)
    } catch (err) {
      console.error('Error fetching watchlist:', err)
      setLoading(false)
    }
  }

  const fetchStockData = async (symbol) => {
    try {
      const [signalRes, chartRes] = await Promise.all([
        axios.get(`/api/signal/${symbol}`),
        axios.get(`/api/chart/${symbol}?timeframe=1d`),
      ])
      setStockData((prev) => ({
        ...prev,
        [symbol]: {
          signal: signalRes.data,
          chart: chartRes.data.data.slice(-20),
        },
      }))
    } catch (err) {
      console.error(`Error fetching data for ${symbol}:`, err)
    }
  }

  const addStock = async (e) => {
    e.preventDefault()
    if (!newSymbol.trim()) return
    setError('')
    setAdding(true)
    try {
      await axios.get(`/api/signal/${newSymbol.toUpperCase()}`)
      await axios.post('/api/watchlist', { symbol: newSymbol.toUpperCase() })
      setNewSymbol('')
      fetchWatchlist()
    } catch (err) {
      setError(`Symbol "${newSymbol.toUpperCase()}" not found or invalid.`)
    } finally {
      setAdding(false)
    }
  }

  const removeStock = async (symbol, e) => {
    e.stopPropagation()
    if (!confirm(`Remove ${symbol} from watchlist?`)) return
    try {
      await axios.delete(`/api/watchlist/${symbol}`)
      setWatchlist((prev) => prev.filter((s) => s.symbol !== symbol))
      setStockData((prev) => {
        const nd = { ...prev }
        delete nd[symbol]
        return nd
      })
    } catch (err) {
      console.error('Error removing stock:', err)
    }
  }

  const refreshStock = async (symbol, e) => {
    e.stopPropagation()
    setStockData((prev) => { const nd = { ...prev }; delete nd[symbol]; return nd })
    fetchStockData(symbol)
  }

  const sortedFiltered = [...watchlist]
    .filter((s) => {
      if (filterSignal === 'ALL') return true
      return stockData[s.symbol]?.signal?.signal?.toUpperCase() === filterSignal
    })
    .sort((a, b) => {
      const da = stockData[a.symbol]
      const db = stockData[b.symbol]
      if (sortBy === 'confidence') {
        return (db?.signal?.confidence || 0) - (da?.signal?.confidence || 0)
      }
      if (sortBy === 'symbol') return a.symbol.localeCompare(b.symbol)
      if (sortBy === 'price') {
        return (db?.signal?.entry_price || 0) - (da?.signal?.entry_price || 0)
      }
      return 0
    })

  const signalCounts = ['BUY', 'SELL', 'WATCH', 'SKIP'].reduce((acc, s) => {
    acc[s] = watchlist.filter(
      (w) => stockData[w.symbol]?.signal?.signal?.toUpperCase() === s
    ).length
    return acc
  }, {})

  return (
    <div style={{
      minHeight: '100vh',
      background: '#060a0f',
      color: '#e6edf3',
      fontFamily: '"IBM Plex Mono", "Fira Code", "Cascadia Code", monospace',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600&display=swap');
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes fadeSlideIn { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
        ::-webkit-scrollbar { width: 4px }
        ::-webkit-scrollbar-track { background: transparent }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px }
        .stock-card { transition: border-color 0.2s, transform 0.15s, box-shadow 0.2s; animation: fadeSlideIn 0.35s ease both; }
        .stock-card:hover { border-color: rgba(255,255,255,0.18) !important; transform: translateY(-2px); box-shadow: 0 8px 32px rgba(0,0,0,0.4) !important; cursor: pointer; }
        .remove-btn:hover { color: #dc2626 !important; background: rgba(220,38,38,0.1) !important; }
        .refresh-btn:hover { color: #3b82f6 !important; background: rgba(59,130,246,0.1) !important; }
        .filter-pill { transition: all 0.15s; cursor: pointer; }
        .filter-pill:hover { background: rgba(255,255,255,0.08) !important; }
        .sort-btn:hover { background: rgba(255,255,255,0.06) !important; }
        .add-input:focus { outline: none; border-color: rgba(59,130,246,0.6) !important; box-shadow: 0 0 0 3px rgba(59,130,246,0.12) !important; }
        .add-btn:hover:not(:disabled) { background: #2563eb !important; }
        .add-btn:active:not(:disabled) { transform: scale(0.98); }
      `}</style>

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 24px' }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: 32, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%', background: '#16a34a',
                boxShadow: '0 0 8px #16a34a', animation: 'pulse 2s ease-in-out infinite'
              }} />
              <span style={{ fontSize: 11, color: '#6b7280', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 500 }}>
                NSE · Live Signals
              </span>
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 600, margin: 0, letterSpacing: '-0.02em', color: '#f0f6fc' }}>
              Watchlist
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280', fontFamily: '"IBM Plex Sans", sans-serif' }}>
              {watchlist.length} stocks tracked · Real-time signal analysis
            </p>
          </div>

          {/* Signal summary pills */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              { label: 'BUY',  count: signalCounts.BUY,  color: '#16a34a', bg: 'rgba(22,163,74,0.1)'  },
              { label: 'SELL', count: signalCounts.SELL, color: '#dc2626', bg: 'rgba(220,38,38,0.1)' },
              { label: 'WATCH', count: signalCounts.WATCH, color: '#d97706', bg: 'rgba(217,119,6,0.1)' },
              { label: 'SKIP', count: signalCounts.SKIP, color: '#6b7280', bg: 'rgba(107,114,128,0.1)' },
            ].map(({ label, count, color, bg }) => (
              <div key={label} style={{
                background: bg, border: `1px solid ${color}22`, borderRadius: 8,
                padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 8
              }}>
                <span style={{ fontSize: 11, color, fontWeight: 600, letterSpacing: '0.08em' }}>{label}</span>
                <span style={{ fontSize: 18, fontWeight: 600, color, lineHeight: 1 }}>{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Add stock form ── */}
        <div style={{
          background: '#0d1117', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 12, padding: '16px 20px', marginBottom: 24
        }}>
          <form onSubmit={addStock} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <span style={{
                position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                fontSize: 13, color: '#4b5563', pointerEvents: 'none', fontWeight: 600
              }}>NSE:</span>
              <input
                type="text"
                value={newSymbol}
                onChange={(e) => { setNewSymbol(e.target.value.toUpperCase()); setError('') }}
                placeholder="RELIANCE, INFY, TCS..."
                disabled={adding}
                className="add-input"
                style={{
                  width: '100%', background: '#161b22', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8, padding: '10px 12px 10px 46px', color: '#e6edf3',
                  fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                }}
              />
            </div>
            <button
              type="submit"
              disabled={adding || !newSymbol.trim()}
              className="add-btn"
              style={{
                background: '#1d4ed8', color: '#fff', border: 'none',
                borderRadius: 8, padding: '10px 20px', fontSize: 13,
                fontWeight: 600, fontFamily: 'inherit', cursor: adding ? 'not-allowed' : 'pointer',
                opacity: adding || !newSymbol.trim() ? 0.5 : 1,
                transition: 'background 0.15s, transform 0.1s, opacity 0.2s',
                display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap'
              }}
            >
              {adding ? (
                <>
                  <div style={{
                    width: 12, height: 12, border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#fff', borderRadius: '50%',
                    animation: 'spin 0.7s linear infinite'
                  }} />
                  Adding...
                </>
              ) : (
                <>＋ Add Stock</>
              )}
            </button>
          </form>
          {error && (
            <p style={{ margin: '10px 0 0', fontSize: 12, color: '#dc2626', fontFamily: '"IBM Plex Sans", sans-serif' }}>
              ⚠ {error}
            </p>
          )}
        </div>

        {/* ── Filter & Sort bar ── */}
        {watchlist.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 20, flexWrap: 'wrap', gap: 12
          }}>
            {/* Signal filter */}
            <div style={{ display: 'flex', gap: 6 }}>
              {['ALL', 'BUY', 'SELL', 'WATCH', 'SKIP'].map((f) => {
                const active = filterSignal === f
                const cfg = f !== 'ALL' ? getSignalCfg(f) : null
                return (
                  <button
                    key={f}
                    onClick={() => setFilterSignal(f)}
                    className="filter-pill"
                    style={{
                      background: active ? (cfg ? cfg.bg : 'rgba(255,255,255,0.08)') : 'transparent',
                      border: `1px solid ${active ? (cfg ? cfg.color + '44' : 'rgba(255,255,255,0.2)') : 'rgba(255,255,255,0.06)'}`,
                      borderRadius: 20, padding: '5px 14px', fontSize: 11,
                      fontWeight: 600, fontFamily: 'inherit', letterSpacing: '0.07em',
                      color: active ? (cfg ? cfg.color : '#e6edf3') : '#6b7280',
                    }}
                  >
                    {f}
                  </button>
                )
              })}
            </div>

            {/* Sort */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: '#6b7280', letterSpacing: '0.06em' }}>SORT</span>
              {[
                { key: 'confidence', label: 'Confidence' },
                { key: 'symbol',     label: 'Symbol' },
                { key: 'price',      label: 'Price' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setSortBy(key)}
                  className="sort-btn"
                  style={{
                    background: sortBy === key ? 'rgba(255,255,255,0.08)' : 'transparent',
                    border: `1px solid ${sortBy === key ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)'}`,
                    borderRadius: 6, padding: '4px 10px', fontSize: 11,
                    color: sortBy === key ? '#e6edf3' : '#6b7280',
                    fontFamily: 'inherit', fontWeight: 500, cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Loading state ── */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : sortedFiltered.length === 0 ? (
          <div style={{
            background: '#0d1117', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 12, padding: '64px 24px', textAlign: 'center'
          }}>
            <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.3 }}>◉</div>
            <p style={{ color: '#6b7280', margin: 0, fontFamily: '"IBM Plex Sans", sans-serif', fontSize: 14 }}>
              {watchlist.length === 0
                ? 'No stocks in watchlist. Add a symbol above to get started.'
                : `No stocks match the "${filterSignal}" filter.`}
            </p>
          </div>
        ) : (
          /* ── Stock grid ── */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {sortedFiltered.map((stock, idx) => {
              const data = stockData[stock.symbol]
              const sig = data?.signal
              const cfg = getSignalCfg(sig?.signal)
              const chartData = data?.chart
              const firstClose = chartData?.[0]?.close || 0
              const lastClose = chartData?.[chartData?.length - 1]?.close || 0
              const priceChange = firstClose ? ((lastClose - firstClose) / firstClose) * 100 : 0
              const isUp = priceChange >= 0

              return (
                <div
                  key={stock.symbol}
                  className="stock-card"
                  onClick={() => navigate(`/chart/${stock.symbol}`)}
                  style={{
                    background: '#0d1117',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 12,
                    padding: '18px 20px',
                    animationDelay: `${idx * 0.04}s`,
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {/* Top accent line */}
                  {sig && (
                    <div style={{
                      position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                      background: cfg.color, opacity: 0.7, borderRadius: '12px 12px 0 0'
                    }} />
                  )}

                  {/* ── Card header ── */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em', color: '#f0f6fc' }}>
                          {stock.symbol}
                        </h3>
                        {sig && (
                          <span style={{
                            fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
                            color: cfg.color, background: cfg.bg,
                            border: `1px solid ${cfg.color}33`,
                            borderRadius: 4, padding: '2px 7px'
                          }}>
                            {sig.signal?.toUpperCase()}
                          </span>
                        )}
                      </div>
                      {sig?.entry_price && (
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
                          <span style={{ fontSize: 18, fontWeight: 600, color: '#e6edf3', letterSpacing: '-0.02em' }}>
                            ₹{sig.entry_price.toFixed(2)}
                          </span>
                          {chartData && chartData.length > 1 && (
                            <span style={{ fontSize: 12, fontWeight: 500, color: isUp ? '#16a34a' : '#dc2626' }}>
                              {isUp ? '▲' : '▼'} {Math.abs(priceChange).toFixed(2)}%
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: 4, marginLeft: 8 }}>
                      <button
                        onClick={(e) => refreshStock(stock.symbol, e)}
                        className="refresh-btn"
                        title="Refresh"
                        style={{
                          background: 'transparent', border: '1px solid rgba(255,255,255,0.06)',
                          borderRadius: 6, width: 28, height: 28, display: 'flex',
                          alignItems: 'center', justifyContent: 'center',
                          color: '#6b7280', cursor: 'pointer', fontSize: 13,
                          transition: 'all 0.15s', padding: 0,
                        }}
                      >
                        ↺
                      </button>
                      <button
                        onClick={(e) => removeStock(stock.symbol, e)}
                        className="remove-btn"
                        title="Remove"
                        style={{
                          background: 'transparent', border: '1px solid rgba(255,255,255,0.06)',
                          borderRadius: 6, width: 28, height: 28, display: 'flex',
                          alignItems: 'center', justifyContent: 'center',
                          color: '#6b7280', cursor: 'pointer', fontSize: 14,
                          transition: 'all 0.15s', padding: 0,
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  {/* ── Loading spinner ── */}
                  {!data && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 0', color: '#4b5563', fontSize: 12 }}>
                      <div style={{
                        width: 14, height: 14, border: '2px solid rgba(255,255,255,0.1)',
                        borderTopColor: '#3b82f6', borderRadius: '50%',
                        animation: 'spin 0.7s linear infinite'
                      }} />
                      Fetching signal...
                    </div>
                  )}

                  {sig && (
                    <>
                      {/* ── Confidence + key levels row ── */}
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        marginBottom: 12, padding: '10px 12px',
                        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
                        borderRadius: 8
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <ConfidenceRing value={sig.confidence} />
                          <div>
                            <div style={{ fontSize: 10, color: '#6b7280', letterSpacing: '0.07em', marginBottom: 1 }}>CONFIDENCE</div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: '#e6edf3' }}>{sig.confidence}%</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 16 }}>
                          {sig.target && (
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: 10, color: '#6b7280', letterSpacing: '0.07em', marginBottom: 1 }}>TARGET</div>
                              <div style={{ fontSize: 12, fontWeight: 600, color: '#16a34a' }}>₹{sig.target.toFixed(2)}</div>
                            </div>
                          )}
                          {sig.stop_loss && (
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: 10, color: '#6b7280', letterSpacing: '0.07em', marginBottom: 1 }}>STOP</div>
                              <div style={{ fontSize: 12, fontWeight: 600, color: '#dc2626' }}>₹{sig.stop_loss.toFixed(2)}</div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* ── Sparkline ── */}
                      {chartData && chartData.length > 0 && (
                        <div style={{ marginBottom: 12 }}>
                          <MiniSpark data={chartData} signal={sig.signal} />
                        </div>
                      )}

                      {/* ── Reason ── */}
                      {sig.reason && (
                        <div style={{
                          paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.05)'
                        }}>
                          <p style={{
                            margin: 0, fontSize: 11, color: '#6b7280', lineHeight: 1.6,
                            fontFamily: '"IBM Plex Sans", sans-serif',
                            display: '-webkit-box', WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical', overflow: 'hidden'
                          }}>
                            {sig.reason}
                          </p>
                        </div>
                      )}

                      {/* ── Footer: view chart link ── */}
                      <div style={{
                        marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'flex-end'
                      }}>
                        <span style={{ fontSize: 11, color: '#3b82f6', letterSpacing: '0.04em' }}>
                          View Chart →
                        </span>
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default Watchlist
