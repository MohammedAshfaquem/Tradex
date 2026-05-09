// import { useState, useEffect, useRef } from 'react'
// import { useNavigate } from 'react-router-dom'
// import axios from 'axios'
// import ReasonModal from '../components/ReasonModal'
// import { buildApiUrl, buildWsUrl } from '../utils/network'

// const dedupeSignalsBySymbol = (rows = []) => {
//   const bySymbol = new Map()
//   rows.forEach((row) => {
//     if (row?.symbol) {
//       bySymbol.set(row.symbol, row)
//     }
//   })
//   return Array.from(bySymbol.values())
// }

// const Dashboard = () => {
//   const navigate = useNavigate()
//   const [signals, setSignals] = useState([])
//   const [metrics, setMetrics] = useState({
//     signalsToday: 0,
//     modelAccuracy: 0,
//     fiiFlow: 0,
//     watchlistCount: 0,
//   })
//   const [wsConnected, setWsConnected] = useState(false)
//   const [lastUpdated, setLastUpdated] = useState(null)
//   // streaming state
//   const [streamLoading, setStreamLoading] = useState(true)
//   const [streamTotal, setStreamTotal] = useState(0)
//   const [streamReceived, setStreamReceived] = useState(0)
//   const [error, setError] = useState(null)
//   const [selectedSignal, setSelectedSignal] = useState(null)
//   const [showReasonModal, setShowReasonModal] = useState(false)
//   const sseRef = useRef(null)
//   const hasInitializedRef = useRef(false)
//   const [signalFilter, setSignalFilter] = useState('ALL')
//   const [riskFilter, setRiskFilter] = useState('ALL')

//   // Handle modal close
//   const handleCloseModal = () => {
//     setShowReasonModal(false)
//     setSelectedSignal(null)
//   }

//   // Handle reason click to show modal
//   const handleReasonClick = (signal, e) => {
//     e.stopPropagation()
//     setSelectedSignal(signal)
//     setShowReasonModal(true)
//   }

//   // WebSocket connection
//   useEffect(() => {
//     const ws = new WebSocket(buildWsUrl('/ws/signals'))

//     ws.onopen = () => {
//       console.log('WebSocket connected')
//       setWsConnected(true)
//     }

//     ws.onmessage = (event) => {
//       const data = JSON.parse(event.data)

//       if (data.type === 'signals_update') {
//         setSignals(dedupeSignalsBySymbol(data.signals || []))
//         setLastUpdated(new Date())
//       }
//     }

//     ws.onerror = (error) => {
//       console.error('WebSocket error:', error)
//       setWsConnected(false)
//     }

//     ws.onclose = () => {
//       console.log('WebSocket disconnected')
//       setWsConnected(false)
//     }

//     return () => {
//       ws.close()
//     }
//   }, [])

//   // Fetch signals via SSE — one signal arrives at a time
//   useEffect(() => {
//     if (hasInitializedRef.current) return
//     hasInitializedRef.current = true

//     const fetchData = async () => {
//       try {
//         setError(null)
//         setSignals([])
//         setStreamReceived(0)
//         setStreamTotal(0)
//         setStreamLoading(true)

//         // Fetch watchlist first
//         const watchlistRes = await axios.get('/api/watchlist')
//         const watchlist = watchlistRes.data.watchlist

//         if (watchlist.length === 0) {
//           setError('❌ Watchlist is empty. No stocks to analyze.')
//           setStreamLoading(false)
//           return
//         }

//         setMetrics((prev) => ({ ...prev, watchlistCount: watchlist.length }))

//         // Fetch backtest accuracy (non-blocking)
//         axios.get('/api/backtest').then((res) => {
//           if (res.data.results) {
//             setMetrics((prev) => ({
//               ...prev,
//               modelAccuracy: res.data.results.win_rate || 0,
//             }))
//           }
//         }).catch(() => {})

//         // Open SSE stream — signals arrive one by one
//         const symbols = watchlist.map((w) => w.symbol).join(',')
//         const evtSource = new EventSource(buildApiUrl(`/api/signals/stream?symbols=${encodeURIComponent(symbols)}`))
//         sseRef.current = evtSource

//         evtSource.onmessage = (event) => {
//           const msg = JSON.parse(event.data)

//           if (msg.type === 'total') {
//             setStreamTotal(msg.count)
//           } else if (msg.type === 'signal') {
//             setSignals((prev) => dedupeSignalsBySymbol([...prev, msg.data]))
//             setStreamReceived((prev) => prev + 1)
//             setLastUpdated(new Date())
//           } else if (msg.type === 'error') {
//             setStreamReceived((prev) => prev + 1)
//           } else if (msg.type === 'done') {
//             setStreamLoading(false)
//             evtSource.close()
//           }
//         }

//         evtSource.onerror = () => {
//           setStreamLoading(false)
//           evtSource.close()
//         }
//       } catch (err) {
//         console.error('Error:', err)
//         setError(`❌ ${err.message} - Check backend URL and CORS settings`) 
//         setStreamLoading(false)
//       }
//     }

//     fetchData()

//     return () => {
//       if (sseRef.current) sseRef.current.close()
//     }
//   }, [])

//   // Update metrics when signals change
//   useEffect(() => {
//     setMetrics((prev) => ({
//       ...prev,
//       signalsToday: signals.filter((s) => s.signal === 'BUY').length,
//     }))
//   }, [signals])

//   const getSignalBadgeClass = (signal) => {
//     const baseClass = 'signal-badge-'
//     return baseClass + signal.toLowerCase()
//   }

//   const formatTime = (timestamp) => {
//     const date = new Date(timestamp)
//     return date.toLocaleTimeString('en-IN', {
//       hour: '2-digit',
//       minute: '2-digit',
//     })
//   }

//   // How many skeleton rows remain while streaming
//   const skeletonCount = streamTotal > 0 ? streamTotal - streamReceived : 5

//   // Apply filters
//   const filteredSignals = signals.filter((s) => {
//     if (signalFilter !== 'ALL' && s.signal !== signalFilter) return false
//     if (riskFilter !== 'ALL' && s.risk !== riskFilter) return false
//     return true
//   })

//   if (error) {
//     return (
//       <div className="p-6 space-y-6">
//         <h1 className="text-3xl font-bold">Dashboard</h1>
//         <div className="card bg-signal-sell/10 border border-signal-sell">
//           <p className="text-lg font-bold text-signal-sell mb-2">{error}</p>
//           <p className="text-text-secondary mb-4">Make sure:</p>
//           <ul className="text-text-secondary space-y-1 list-disc list-inside">
//             <li>Backend is running: <code className="bg-bg-border px-2 py-1">uvicorn backend.main:app --reload --port 8000</code></li>
//             <li>Database initialized with watchlist</li>
//             <li>No errors in backend logs</li>
//           </ul>
//         </div>
//       </div>
//     )
//   }

//   return (
//     <div className="p-8 max-w-7xl mx-auto space-y-8 relative z-10">
//       {/* Header */}
//       <div className="flex items-center justify-between">
//         <div>
//           <h1 className="text-4xl font-black tracking-tight">Market Overview</h1>
//           <p className="text-text-muted mt-2 font-medium">Real-time NSE trading signals powered by AI</p>
//         </div>

//         <div className="flex items-center gap-6 glass-panel px-6 py-3 rounded-full border border-white/5">
//           {/* Live indicator */}
//           <div className="flex items-center gap-2">
//             <span className={`status-dot ${wsConnected ? 'status-online' : 'status-offline'}`}></span>
//             <span className="text-xs font-bold tracking-widest uppercase text-text-secondary">
//               {wsConnected ? 'Live Connection' : 'Offline'}
//             </span>
//           </div>

//           <div className="w-px h-4 bg-white/10"></div>

//           {/* Clock */}
//           <div className="text-text-secondary text-sm font-mono tracking-wider font-medium">
//             {new Date().toLocaleTimeString('en-IN')}
//           </div>
//         </div>
//       </div>

//       {/* Metrics Cards */}
//       <div className="grid grid-cols-4 gap-6">
//         <div className="premium-card">
//           <p className="metric-label">
//             <span className="text-xl">📊</span> Signals Today
//           </p>
//           <p className="metric-value text-emerald-400">
//             {metrics.signalsToday}
//           </p>
//         </div>

//         <div className="premium-card">
//           <p className="metric-label">
//             <span className="text-xl">🎯</span> Model Accuracy
//           </p>
//           <p className="metric-value text-accent-primary">
//             {metrics.modelAccuracy.toFixed(1)}%
//           </p>
//         </div>

//         <div className="premium-card">
//           <p className="metric-label">
//             <span className="text-xl">💰</span> FII Flow Today
//           </p>
//           <p
//             className={`metric-value ${
//               metrics.fiiFlow >= 0 ? 'text-emerald-400' : 'text-rose-400'
//             }`}
//           >
//             ₹{metrics.fiiFlow} Cr
//           </p>
//         </div>

//         <div className="premium-card">
//           <p className="metric-label">
//             <span className="text-xl">👁️</span> Active Watchlist
//           </p>
//           <p className="metric-value">
//             {metrics.watchlistCount}
//           </p>
//         </div>
//       </div>

//       {/* Signals Table */}
//       <div className="premium-card !p-0">
//         <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/[0.02]">
//           <div className="flex items-center gap-3">
//             <h2 className="text-lg font-bold tracking-wide">Live Signals</h2>
//             {streamLoading && streamTotal > 0 && (
//               <span className="text-xs text-text-muted font-mono bg-black/30 px-3 py-1 rounded-full border border-white/5">
//                 Analyzing {streamReceived}/{streamTotal}…
//               </span>
//             )}
//           </div>
//           {lastUpdated && (
//             <p className="text-text-muted text-xs font-medium bg-black/30 px-3 py-1.5 rounded-full border border-white/5">
//               Updated: {formatTime(lastUpdated)}
//             </p>
//           )}
//         </div>

//         {/* Filter bar */}
//         <div className="flex items-center gap-4 px-6 py-3 border-b border-white/5 bg-white/[0.01]">
//           <span className="text-text-muted text-xs font-semibold uppercase tracking-widest">Signal:</span>
//           <div className="flex gap-1.5">
//             {['ALL', 'BUY', 'SELL', 'WATCH', 'SKIP'].map((f) => (
//               <button
//                 key={f}
//                 onClick={() => setSignalFilter(f)}
//                 className={`px-3 py-1 rounded-lg text-xs font-bold tracking-wider transition-all duration-200 border ${
//                   signalFilter === f
//                     ? f === 'BUY' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
//                     : f === 'SELL' ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
//                     : f === 'WATCH' ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
//                     : f === 'SKIP' ? 'bg-zinc-500/20 text-zinc-400 border-zinc-500/40'
//                     : 'bg-accent-primary/20 text-accent-primary border-accent-primary/40'
//                     : 'bg-transparent text-text-muted border-white/10 hover:bg-white/5'
//                 }`}
//               >
//                 {f}
//               </button>
//             ))}
//           </div>

//           <div className="w-px h-5 bg-white/10 mx-2"></div>

//           <span className="text-text-muted text-xs font-semibold uppercase tracking-widest">Risk:</span>
//           <div className="flex gap-1.5">
//             {['ALL', 'LOW', 'MEDIUM', 'HIGH'].map((f) => (
//               <button
//                 key={f}
//                 onClick={() => setRiskFilter(f)}
//                 className={`px-3 py-1 rounded-lg text-xs font-bold tracking-wider transition-all duration-200 border ${
//                   riskFilter === f
//                     ? f === 'LOW' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
//                     : f === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
//                     : f === 'HIGH' ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
//                     : 'bg-accent-primary/20 text-accent-primary border-accent-primary/40'
//                     : 'bg-transparent text-text-muted border-white/10 hover:bg-white/5'
//                 }`}
//               >
//                 {f}
//               </button>
//             ))}
//           </div>

//           {(signalFilter !== 'ALL' || riskFilter !== 'ALL') && (
//             <button
//               onClick={() => { setSignalFilter('ALL'); setRiskFilter('ALL') }}
//               className="ml-auto text-xs text-text-muted hover:text-white transition-colors underline"
//             >
//               Clear filters
//             </button>
//           )}
//         </div>

//         <div className="overflow-x-auto">
//           <table className="w-full text-sm">
//             <thead>
//               <tr className="table-header-premium">
//                 <th className="py-4 px-6 font-semibold">Stock</th>
//                 <th className="py-4 px-6 font-semibold">Signal</th>
//                 <th className="py-4 px-6 font-semibold">AI Confidence</th>
//                 <th className="py-4 px-6 font-semibold">Entry ₹</th>
//                 <th className="py-4 px-6 font-semibold">Target ₹</th>
//                 <th className="py-4 px-6 font-semibold">Stop Loss ₹</th>
//                 <th className="py-4 px-6 font-semibold">Risk Level</th>
//                 <th className="py-4 px-6 font-semibold">Analysis</th>
//                 <th className="py-4 px-6 font-semibold">Time</th>
//               </tr>
//             </thead>
//             <tbody>
//               {/* Loaded signal rows */}
//               {filteredSignals.map((signal, index) => (
//                 <tr
//                   key={index}
//                   className="table-row-premium cursor-pointer animate-fade-in"
//                   onClick={() => navigate(`/chart/${signal.symbol}`)}
//                 >
//                   <td className="py-4 px-6 font-bold tracking-wide">{signal.symbol}</td>
//                   <td className="py-4 px-6">
//                     <span className={getSignalBadgeClass(signal.signal)}>
//                       {signal.signal}
//                     </span>
//                   </td>
//                   <td className="py-4 px-6">
//                     <div className="flex items-center gap-3">
//                       <div className="progress-bar-glass w-24">
//                         <div
//                           className={`${
//                             signal.confidence >= 75
//                               ? 'progress-fill-buy'
//                               : signal.confidence >= 55
//                               ? 'progress-fill-watch'
//                               : 'progress-fill-sell'
//                           }`}
//                           style={{ width: `${signal.confidence}%` }}
//                         ></div>
//                       </div>
//                       <span className="text-sm font-bold font-mono">
//                         {signal.confidence}%
//                       </span>
//                     </div>
//                   </td>
//                   <td className="py-4 px-6 font-mono text-text-secondary">{signal.entry_price?.toFixed(2) || '-'}</td>
//                   <td className="py-4 px-6 font-mono text-emerald-400 font-semibold">
//                     {signal.target?.toFixed(2) || '-'}
//                   </td>
//                   <td className="py-4 px-6 font-mono text-rose-400 font-semibold">
//                     {signal.stop_loss?.toFixed(2) || '-'}
//                   </td>
//                   <td className="py-4 px-6">
//                     <span
//                       className={`text-xs font-bold tracking-wider uppercase ${
//                         signal.risk === 'HIGH'
//                           ? 'text-rose-400'
//                           : signal.risk === 'MEDIUM'
//                           ? 'text-amber-400'
//                           : 'text-emerald-400'
//                       }`}
//                     >
//                       {signal.risk}
//                     </span>
//                   </td>
//                   <td className="py-4 px-6">
//                     <div
//                       className="text-text-muted hover:text-white transition-colors flex items-center gap-2 max-w-[200px]"
//                       onClick={(e) => handleReasonClick(signal, e)}
//                     >
//                       <span className="truncate">📊 {signal.reason}</span>
//                       <div className="invisible group-hover:visible bg-white/10 p-1 rounded-md ml-auto shrink-0">
//                         <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/></svg>
//                       </div>
//                     </div>
//                   </td>
//                   <td className="py-4 px-6 text-text-muted font-mono">
//                     {formatTime(signal.timestamp)}
//                   </td>
//                 </tr>
//               ))}

//               {/* Shimmer skeleton rows for signals still being fetched */}
//               {streamLoading && skeletonCount > 0 && Array(skeletonCount).fill(0).map((_, i) => (
//                 <tr key={`skeleton-${i}`} className="border-b border-white/5">
//                   <td className="py-4 px-6"><div className="skeleton h-4 w-20"></div></td>
//                   <td className="py-4 px-6"><div className="skeleton h-6 w-16 rounded-lg"></div></td>
//                   <td className="py-4 px-6"><div className="skeleton h-4 w-28"></div></td>
//                   <td className="py-4 px-6"><div className="skeleton h-4 w-16"></div></td>
//                   <td className="py-4 px-6"><div className="skeleton h-4 w-16"></div></td>
//                   <td className="py-4 px-6"><div className="skeleton h-4 w-16"></div></td>
//                   <td className="py-4 px-6"><div className="skeleton h-4 w-12"></div></td>
//                   <td className="py-4 px-6"><div className="skeleton h-4 w-36"></div></td>
//                   <td className="py-4 px-6"><div className="skeleton h-4 w-14"></div></td>
//                 </tr>
//               ))}

//               {/* Empty state — only after streaming is done */}
//               {!streamLoading && filteredSignals.length === 0 && (
//                 <tr>
//                   <td colSpan="9" className="text-center py-8 text-text-secondary">
//                     No signals match current filters.
//                   </td>
//                 </tr>
//               )}
//             </tbody>
//           </table>
//         </div>
//       </div>

//       {/* Reason Modal */}
//       <ReasonModal
//         isOpen={showReasonModal}
//         onClose={handleCloseModal}
//         signal={selectedSignal}
//       />
//     </div>
//   )
// }



// export default Dashboard


import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import ReasonModal from '../components/ReasonModal'
import { buildApiUrl, buildWsUrl } from '../utils/network'

const dedupeSignalsBySymbol = (rows = []) => {
  const bySymbol = new Map()
  rows.forEach((row) => {
    if (row?.symbol) bySymbol.set(row.symbol, row)
  })
  return Array.from(bySymbol.values())
}

/* ── Design tokens ──────────────────────────────────────── */
const T = {
  bg0:    '#05080d',
  bg1:    '#090e16',
  bg2:    '#0d1420',
  bg3:    '#111827',
  border: 'rgba(255,255,255,0.06)',
  borderHover: 'rgba(255,255,255,0.13)',
  text1:  '#f0f6fc',
  text2:  '#8b949e',
  text3:  '#484f58',
  green:  '#22c55e',
  greenDim:'rgba(34,197,94,0.12)',
  greenBorder:'rgba(34,197,94,0.25)',
  red:    '#f87171',
  redDim: 'rgba(248,113,113,0.12)',
  redBorder:'rgba(248,113,113,0.25)',
  amber:  '#fbbf24',
  amberDim:'rgba(251,191,36,0.12)',
  amberBorder:'rgba(251,191,36,0.25)',
  blue:   '#60a5fa',
  blueDim:'rgba(96,165,250,0.12)',
  blueBorder:'rgba(96,165,250,0.25)',
  zinc:   '#71717a',
  zincDim:'rgba(113,113,122,0.12)',
}

const SIGNAL_MAP = {
  BUY:   { color: T.green,  bg: T.greenDim, border: T.greenBorder },
  SELL:  { color: T.red,    bg: T.redDim,   border: T.redBorder   },
  WATCH: { color: T.amber,  bg: T.amberDim, border: T.amberBorder },
  SKIP:  { color: T.zinc,   bg: T.zincDim,  border: 'rgba(113,113,122,0.25)' },
}
const RISK_MAP = {
  LOW:    { color: T.green, label: 'LOW'    },
  MEDIUM: { color: T.amber, label: 'MED'    },
  HIGH:   { color: T.red,   label: 'HIGH'   },
}

const sigCfg  = (s = '') => SIGNAL_MAP[s.toUpperCase()] || { color: T.text2, bg: 'rgba(255,255,255,0.06)', border: T.border }
const riskCfg = (r = '') => RISK_MAP[r.toUpperCase()]   || { color: T.text2, label: r }

/* ── Sub-components ─────────────────────────────────────── */

const LiveDot = ({ on }) => (
  <span style={{
    display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
    background: on ? T.green : T.zinc,
    boxShadow: on ? `0 0 6px ${T.green}` : 'none',
    animation: on ? 'livepulse 2s ease-in-out infinite' : 'none',
  }} />
)

const MetricCard = ({ icon, label, value, valueColor }) => (
  <div style={{
    background: T.bg2,
    border: `1px solid ${T.border}`,
    borderRadius: 12,
    padding: '20px 22px',
    display: 'flex', flexDirection: 'column', gap: 10,
    transition: 'border-color 0.2s',
  }}
    onMouseEnter={e => e.currentTarget.style.borderColor = T.borderHover}
    onMouseLeave={e => e.currentTarget.style.borderColor = T.border}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 15 }}>{icon}</span>
      <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', color: T.text2, textTransform: 'uppercase' }}>
        {label}
      </span>
    </div>
    <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.03em', color: valueColor || T.text1, lineHeight: 1 }}>
      {value}
    </div>
  </div>
)

const ConfidenceBar = ({ value }) => {
  const color = value >= 75 ? T.green : value >= 55 ? T.amber : T.red
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 72, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.07)', overflow: 'hidden', flexShrink: 0 }}>
        <div style={{ width: `${value}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 0.6s ease' }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color, fontFamily: '"IBM Plex Mono", monospace', minWidth: 34 }}>
        {value}%
      </span>
    </div>
  )
}

const SignalBadge = ({ signal }) => {
  const c = sigCfg(signal)
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      fontSize: 10, fontWeight: 800, letterSpacing: '0.12em',
      color: c.color, background: c.bg,
      border: `1px solid ${c.border}`,
      borderRadius: 5, padding: '3px 9px',
    }}>
      {signal?.toUpperCase()}
    </span>
  )
}

const RiskBadge = ({ risk }) => {
  const c = riskCfg(risk)
  return (
    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: c.color }}>
      {c.label}
    </span>
  )
}

const FilterPill = ({ label, active, color, onClick }) => (
  <button onClick={onClick} style={{
    background: active ? (color ? `${color}18` : 'rgba(255,255,255,0.08)') : 'transparent',
    border: `1px solid ${active ? (color ? `${color}44` : T.borderHover) : T.border}`,
    borderRadius: 20, padding: '4px 13px',
    fontSize: 11, fontWeight: 700, letterSpacing: '0.07em',
    color: active ? (color || T.text1) : T.text2,
    cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
  }}
    onMouseEnter={e => !active && (e.currentTarget.style.borderColor = T.borderHover)}
    onMouseLeave={e => !active && (e.currentTarget.style.borderColor = T.border)}
  >
    {label}
  </button>
)

const SkeletonRow = () => (
  <tr style={{ borderBottom: `1px solid ${T.border}` }}>
    {[80, 60, 100, 64, 64, 64, 48, 140, 52].map((w, i) => (
      <td key={i} style={{ padding: '14px 20px' }}>
        <div style={{
          height: 12, width: w, borderRadius: 4,
          background: 'rgba(255,255,255,0.05)',
          animation: 'shimmer 1.6s ease-in-out infinite',
        }} />
      </td>
    ))}
  </tr>
)

/* ── Main component ─────────────────────────────────────── */

const Dashboard = () => {
  const navigate = useNavigate()
  const [signals, setSignals] = useState([])
  const [metrics, setMetrics] = useState({ signalsToday: 0, modelAccuracy: 0, fiiFlow: 0, watchlistCount: 0 })
  const [wsConnected, setWsConnected] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [streamLoading, setStreamLoading] = useState(true)
  const [streamTotal, setStreamTotal] = useState(0)
  const [streamReceived, setStreamReceived] = useState(0)
  const [error, setError] = useState(null)
  const [selectedSignal, setSelectedSignal] = useState(null)
  const [showReasonModal, setShowReasonModal] = useState(false)
  const sseRef = useRef(null)
  const hasInitializedRef = useRef(false)
  const [signalFilter, setSignalFilter] = useState('ALL')
  const [riskFilter, setRiskFilter] = useState('ALL')
  const [hoveredRow, setHoveredRow] = useState(null)
  const [clock, setClock] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const handleCloseModal = () => { setShowReasonModal(false); setSelectedSignal(null) }
  const handleReasonClick = (signal, e) => { e.stopPropagation(); setSelectedSignal(signal); setShowReasonModal(true) }

  // WebSocket
  useEffect(() => {
    const ws = new WebSocket(buildWsUrl('/ws/signals'))
    ws.onopen  = () => { console.log('WebSocket connected'); setWsConnected(true) }
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.type === 'signals_update') { setSignals(dedupeSignalsBySymbol(data.signals || [])); setLastUpdated(new Date()) }
    }
    ws.onerror = () => setWsConnected(false)
    ws.onclose = () => { console.log('WebSocket disconnected'); setWsConnected(false) }
    return () => ws.close()
  }, [])

  // SSE stream
  useEffect(() => {
    if (hasInitializedRef.current) return
    hasInitializedRef.current = true
    const fetchData = async () => {
      try {
        setError(null); setSignals([]); setStreamReceived(0); setStreamTotal(0); setStreamLoading(true)
        const watchlistRes = await axios.get('/api/watchlist')
        const watchlist = watchlistRes.data.watchlist
        if (watchlist.length === 0) { setError('Watchlist is empty. No stocks to analyze.'); setStreamLoading(false); return }
        setMetrics((prev) => ({ ...prev, watchlistCount: watchlist.length }))
        axios.get('/api/backtest').then((res) => {
          if (res.data.results) setMetrics((prev) => ({ ...prev, modelAccuracy: res.data.results.win_rate || 0 }))
        }).catch(() => {})
        const symbols = watchlist.map((w) => w.symbol).join(',')
        const evtSource = new EventSource(buildApiUrl(`/api/signals/stream?symbols=${encodeURIComponent(symbols)}`))
        sseRef.current = evtSource
        evtSource.onmessage = (event) => {
          const msg = JSON.parse(event.data)
          if (msg.type === 'total') setStreamTotal(msg.count)
          else if (msg.type === 'signal') { setSignals((prev) => dedupeSignalsBySymbol([...prev, msg.data])); setStreamReceived((prev) => prev + 1); setLastUpdated(new Date()) }
          else if (msg.type === 'error') setStreamReceived((prev) => prev + 1)
          else if (msg.type === 'done') { setStreamLoading(false); evtSource.close() }
        }
        evtSource.onerror = () => { setStreamLoading(false); evtSource.close() }
      } catch (err) {
        console.error('Error:', err)
        setError(`${err.message} — Check backend URL and CORS settings`)
        setStreamLoading(false)
      }
    }
    fetchData()
    return () => { if (sseRef.current) sseRef.current.close() }
  }, [])

  useEffect(() => {
    setMetrics((prev) => ({ ...prev, signalsToday: signals.filter((s) => s.signal === 'BUY').length }))
  }, [signals])

  const formatTime = (ts) => new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })

  const skeletonCount = streamTotal > 0 ? streamTotal - streamReceived : 5

  const filteredSignals = signals.filter((s) => {
    if (signalFilter !== 'ALL' && s.signal !== signalFilter) return false
    if (riskFilter !== 'ALL' && s.risk !== riskFilter) return false
    return true
  })

  /* ── Error state ── */
  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: T.bg0, color: T.text1, padding: '40px 32px', fontFamily: '"IBM Plex Sans", system-ui, sans-serif' }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap');`}</style>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 24 }}>Dashboard</h1>
        <div style={{ background: T.redDim, border: `1px solid ${T.redBorder}`, borderRadius: 12, padding: '24px 28px' }}>
          <p style={{ color: T.red, fontWeight: 700, marginBottom: 12 }}>⚠ {error}</p>
          <p style={{ color: T.text2, marginBottom: 10 }}>Make sure:</p>
          <ul style={{ color: T.text2, paddingLeft: 20, lineHeight: 2 }}>
            <li>Backend is running: <code style={{ background: 'rgba(255,255,255,0.07)', padding: '2px 8px', borderRadius: 4, fontSize: 12, fontFamily: '"IBM Plex Mono", monospace' }}>uvicorn backend.main:app --reload --port 8000</code></li>
            <li>Database initialized with watchlist</li>
            <li>No errors in backend logs</li>
          </ul>
        </div>
      </div>
    )
  }

  /* ── Main render ── */
  return (
    <div style={{ minHeight: '100vh', background: T.bg0, color: T.text1, fontFamily: '"IBM Plex Sans", system-ui, sans-serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap');
        @keyframes livepulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.85)} }
        @keyframes shimmer { 0%,100%{opacity:0.4} 50%{opacity:0.9} }
        @keyframes rowfade { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:none} }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
        button { cursor: pointer; }
      `}</style>

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '36px 28px', display: 'flex', flexDirection: 'column', gap: 28 }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <LiveDot on={wsConnected} />
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', color: T.text2, textTransform: 'uppercase' }}>
                {wsConnected ? 'Live · NSE' : 'Offline · NSE'}
              </span>
            </div>
            <h1 style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.025em', color: T.text1 }}>Market Overview</h1>
            <p style={{ fontSize: 13, color: T.text2, marginTop: 4 }}>Real-time NSE trading signals powered by AI</p>
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 16,
            background: T.bg2, border: `1px solid ${T.border}`,
            borderRadius: 10, padding: '10px 18px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <LiveDot on={wsConnected} />
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', color: T.text2, textTransform: 'uppercase' }}>
                {wsConnected ? 'Connected' : 'Offline'}
              </span>
            </div>
            <div style={{ width: 1, height: 16, background: T.border }} />
            <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 13, color: T.text2, letterSpacing: '0.04em' }}>
              {clock.toLocaleTimeString('en-IN')}
            </span>
          </div>
        </div>

        {/* ── Metrics ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          <MetricCard icon="📊" label="Signals Today"     value={metrics.signalsToday}                 valueColor={T.green} />
          <MetricCard icon="🎯" label="Model Accuracy"    value={`${metrics.modelAccuracy.toFixed(1)}%`} valueColor={T.blue}  />
          <MetricCard icon="💰" label="FII Flow Today"    value={`₹${metrics.fiiFlow} Cr`}              valueColor={metrics.fiiFlow >= 0 ? T.green : T.red} />
          <MetricCard icon="👁" label="Active Watchlist"  value={metrics.watchlistCount} />
        </div>

        {/* ── Signals table card ── */}
        <div style={{ background: T.bg1, border: `1px solid ${T.border}`, borderRadius: 14, overflow: 'hidden' }}>

          {/* Card header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '18px 24px', borderBottom: `1px solid ${T.border}`,
            background: 'rgba(255,255,255,0.01)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em', color: T.text1 }}>Live Signals</h2>
              {streamLoading && streamTotal > 0 && (
                <span style={{
                  fontSize: 11, fontWeight: 600, letterSpacing: '0.04em',
                  color: T.text2, background: 'rgba(255,255,255,0.05)',
                  border: `1px solid ${T.border}`, borderRadius: 20,
                  padding: '3px 12px', fontFamily: '"IBM Plex Mono", monospace',
                }}>
                  {streamReceived} / {streamTotal} analyzed
                </span>
              )}
            </div>
            {lastUpdated && (
              <span style={{
                fontSize: 11, color: T.text3, fontFamily: '"IBM Plex Mono", monospace',
                background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.border}`,
                borderRadius: 20, padding: '3px 12px',
              }}>
                Updated {formatTime(lastUpdated)}
              </span>
            )}
          </div>

          {/* Filter bar */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
            padding: '12px 24px', borderBottom: `1px solid ${T.border}`,
            background: 'rgba(255,255,255,0.005)',
          }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: T.text3, textTransform: 'uppercase', marginRight: 4 }}>Signal</span>
            {['ALL', 'BUY', 'SELL', 'WATCH', 'SKIP'].map((f) => (
              <FilterPill
                key={f} label={f} active={signalFilter === f}
                color={f !== 'ALL' ? sigCfg(f).color : null}
                onClick={() => setSignalFilter(f)}
              />
            ))}

            <div style={{ width: 1, height: 18, background: T.border, margin: '0 8px' }} />

            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: T.text3, textTransform: 'uppercase', marginRight: 4 }}>Risk</span>
            {['ALL', 'LOW', 'MEDIUM', 'HIGH'].map((f) => (
              <FilterPill
                key={f} label={f} active={riskFilter === f}
                color={f !== 'ALL' ? riskCfg(f).color : null}
                onClick={() => setRiskFilter(f)}
              />
            ))}

            {(signalFilter !== 'ALL' || riskFilter !== 'ALL') && (
              <button
                onClick={() => { setSignalFilter('ALL'); setRiskFilter('ALL') }}
                style={{
                  marginLeft: 'auto', background: 'none', border: 'none',
                  fontSize: 11, color: T.text2, textDecoration: 'underline',
                  fontFamily: 'inherit', transition: 'color 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.color = T.text1}
                onMouseLeave={e => e.currentTarget.style.color = T.text2}
              >
                Clear filters
              </button>
            )}
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                  {['Stock', 'Signal', 'AI Confidence', 'Entry ₹', 'Target ₹', 'Stop Loss ₹', 'Risk', 'Analysis', 'Time'].map((h) => (
                    <th key={h} style={{
                      padding: '12px 20px', textAlign: 'left',
                      fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
                      color: T.text3, textTransform: 'uppercase',
                      background: 'rgba(255,255,255,0.02)',
                      whiteSpace: 'nowrap',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Signal rows */}
                {filteredSignals.map((signal, i) => (
                  <tr
                    key={i}
                    onClick={() => navigate(`/chart/${signal.symbol}`)}
                    onMouseEnter={() => setHoveredRow(i)}
                    onMouseLeave={() => setHoveredRow(null)}
                    style={{
                      borderBottom: `1px solid ${T.border}`,
                      background: hoveredRow === i ? 'rgba(255,255,255,0.025)' : 'transparent',
                      cursor: 'pointer',
                      transition: 'background 0.12s',
                      animation: 'rowfade 0.3s ease both',
                      animationDelay: `${i * 0.03}s`,
                    }}
                  >
                    <td style={{ padding: '14px 20px' }}>
                      <span style={{ fontWeight: 700, color: T.text1, letterSpacing: '0.02em', fontFamily: '"IBM Plex Mono", monospace' }}>
                        {signal.symbol}
                      </span>
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <SignalBadge signal={signal.signal} />
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <ConfidenceBar value={signal.confidence} />
                    </td>
                    <td style={{ padding: '14px 20px', fontFamily: '"IBM Plex Mono", monospace', color: T.text2 }}>
                      {signal.entry_price?.toFixed(2) || '—'}
                    </td>
                    <td style={{ padding: '14px 20px', fontFamily: '"IBM Plex Mono", monospace', color: T.green, fontWeight: 600 }}>
                      {signal.target?.toFixed(2) || '—'}
                    </td>
                    <td style={{ padding: '14px 20px', fontFamily: '"IBM Plex Mono", monospace', color: T.red, fontWeight: 600 }}>
                      {signal.stop_loss?.toFixed(2) || '—'}
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <RiskBadge risk={signal.risk} />
                    </td>
                    <td style={{ padding: '14px 20px', maxWidth: 220 }}>
                      <div
                        onClick={(e) => handleReasonClick(signal, e)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          color: T.text2, cursor: 'pointer', transition: 'color 0.15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = T.text1}
                        onMouseLeave={e => e.currentTarget.style.color = T.text2}
                      >
                        <span style={{
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          fontSize: 12, flex: 1
                        }}>
                          {signal.reason}
                        </span>
                        <span style={{
                          flexShrink: 0, fontSize: 10, color: T.blue,
                          background: T.blueDim, border: `1px solid ${T.blueBorder}`,
                          borderRadius: 4, padding: '2px 6px', fontWeight: 600,
                          letterSpacing: '0.04em', whiteSpace: 'nowrap',
                        }}>
                          View ↗
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 20px', fontFamily: '"IBM Plex Mono", monospace', fontSize: 12, color: T.text3, whiteSpace: 'nowrap' }}>
                      {formatTime(signal.timestamp)}
                    </td>
                  </tr>
                ))}

                {/* Skeleton rows */}
                {streamLoading && skeletonCount > 0 && Array(skeletonCount).fill(0).map((_, i) => (
                  <SkeletonRow key={`sk-${i}`} />
                ))}

                {/* Empty state */}
                {!streamLoading && filteredSignals.length === 0 && (
                  <tr>
                    <td colSpan={9} style={{ padding: '56px 24px', textAlign: 'center', color: T.text3 }}>
                      <div style={{ fontSize: 32, marginBottom: 10, opacity: 0.3 }}>◉</div>
                      <p style={{ fontSize: 13 }}>No signals match current filters.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Reason Modal — untouched */}
      <ReasonModal
        isOpen={showReasonModal}
        onClose={handleCloseModal}
        signal={selectedSignal}
      />
    </div>
  )
}

export default Dashboard
