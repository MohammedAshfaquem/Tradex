import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import ReasonModal from '../components/ReasonModal'
import { buildApiUrl, buildWsUrl } from '../utils/network'

const dedupeSignalsBySymbol = (rows = []) => {
  const bySymbol = new Map()
  rows.forEach((row) => {
    if (row?.symbol) {
      bySymbol.set(row.symbol, row)
    }
  })
  return Array.from(bySymbol.values())
}

const Dashboard = () => {
  const navigate = useNavigate()
  const [signals, setSignals] = useState([])
  const [metrics, setMetrics] = useState({
    signalsToday: 0,
    modelAccuracy: 0,
    fiiFlow: 0,
    watchlistCount: 0,
  })
  const [wsConnected, setWsConnected] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)
  // streaming state
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

  // Handle modal close
  const handleCloseModal = () => {
    setShowReasonModal(false)
    setSelectedSignal(null)
  }

  // Handle reason click to show modal
  const handleReasonClick = (signal, e) => {
    e.stopPropagation()
    setSelectedSignal(signal)
    setShowReasonModal(true)
  }

  // WebSocket connection
  useEffect(() => {
    const ws = new WebSocket(buildWsUrl('/ws/signals'))

    ws.onopen = () => {
      console.log('WebSocket connected')
      setWsConnected(true)
    }

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)

      if (data.type === 'signals_update') {
        setSignals(dedupeSignalsBySymbol(data.signals || []))
        setLastUpdated(new Date())
      }
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      setWsConnected(false)
    }

    ws.onclose = () => {
      console.log('WebSocket disconnected')
      setWsConnected(false)
    }

    return () => {
      ws.close()
    }
  }, [])

  // Fetch signals via SSE — one signal arrives at a time
  useEffect(() => {
    if (hasInitializedRef.current) return
    hasInitializedRef.current = true

    const fetchData = async () => {
      try {
        setError(null)
        setSignals([])
        setStreamReceived(0)
        setStreamTotal(0)
        setStreamLoading(true)

        // Fetch watchlist first
        const watchlistRes = await axios.get('/api/watchlist')
        const watchlist = watchlistRes.data.watchlist

        if (watchlist.length === 0) {
          setError('❌ Watchlist is empty. No stocks to analyze.')
          setStreamLoading(false)
          return
        }

        setMetrics((prev) => ({ ...prev, watchlistCount: watchlist.length }))

        // Fetch backtest accuracy (non-blocking)
        axios.get('/api/backtest').then((res) => {
          if (res.data.results) {
            setMetrics((prev) => ({
              ...prev,
              modelAccuracy: res.data.results.win_rate || 0,
            }))
          }
        }).catch(() => {})

        // Open SSE stream — signals arrive one by one
        const symbols = watchlist.map((w) => w.symbol).join(',')
        const evtSource = new EventSource(buildApiUrl(`/api/signals/stream?symbols=${encodeURIComponent(symbols)}`))
        sseRef.current = evtSource

        evtSource.onmessage = (event) => {
          const msg = JSON.parse(event.data)

          if (msg.type === 'total') {
            setStreamTotal(msg.count)
          } else if (msg.type === 'signal') {
            setSignals((prev) => dedupeSignalsBySymbol([...prev, msg.data]))
            setStreamReceived((prev) => prev + 1)
            setLastUpdated(new Date())
          } else if (msg.type === 'error') {
            setStreamReceived((prev) => prev + 1)
          } else if (msg.type === 'done') {
            setStreamLoading(false)
            evtSource.close()
          }
        }

        evtSource.onerror = () => {
          setStreamLoading(false)
          evtSource.close()
        }
      } catch (err) {
        console.error('Error:', err)
        setError(`❌ ${err.message} - Check backend URL and CORS settings`) 
        setStreamLoading(false)
      }
    }

    fetchData()

    return () => {
      if (sseRef.current) sseRef.current.close()
    }
  }, [])

  // Update metrics when signals change
  useEffect(() => {
    setMetrics((prev) => ({
      ...prev,
      signalsToday: signals.filter((s) => s.signal === 'BUY').length,
    }))
  }, [signals])

  const getSignalBadgeClass = (signal) => {
    const baseClass = 'signal-badge-'
    return baseClass + signal.toLowerCase()
  }

  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // How many skeleton rows remain while streaming
  const skeletonCount = streamTotal > 0 ? streamTotal - streamReceived : 5

  // Apply filters
  const filteredSignals = signals.filter((s) => {
    if (signalFilter !== 'ALL' && s.signal !== signalFilter) return false
    if (riskFilter !== 'ALL' && s.risk !== riskFilter) return false
    return true
  })

  if (error) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="card bg-signal-sell/10 border border-signal-sell">
          <p className="text-lg font-bold text-signal-sell mb-2">{error}</p>
          <p className="text-text-secondary mb-4">Make sure:</p>
          <ul className="text-text-secondary space-y-1 list-disc list-inside">
            <li>Backend is running: <code className="bg-bg-border px-2 py-1">uvicorn backend.main:app --reload --port 8000</code></li>
            <li>Database initialized with watchlist</li>
            <li>No errors in backend logs</li>
          </ul>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 relative z-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-tight">Market Overview</h1>
          <p className="text-text-muted mt-2 font-medium">Real-time NSE trading signals powered by AI</p>
        </div>

        <div className="flex items-center gap-6 glass-panel px-6 py-3 rounded-full border border-white/5">
          {/* Live indicator */}
          <div className="flex items-center gap-2">
            <span className={`status-dot ${wsConnected ? 'status-online' : 'status-offline'}`}></span>
            <span className="text-xs font-bold tracking-widest uppercase text-text-secondary">
              {wsConnected ? 'Live Connection' : 'Offline'}
            </span>
          </div>

          <div className="w-px h-4 bg-white/10"></div>

          {/* Clock */}
          <div className="text-text-secondary text-sm font-mono tracking-wider font-medium">
            {new Date().toLocaleTimeString('en-IN')}
          </div>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-4 gap-6">
        <div className="premium-card">
          <p className="metric-label">
            <span className="text-xl">📊</span> Signals Today
          </p>
          <p className="metric-value text-emerald-400">
            {metrics.signalsToday}
          </p>
        </div>

        <div className="premium-card">
          <p className="metric-label">
            <span className="text-xl">🎯</span> Model Accuracy
          </p>
          <p className="metric-value text-accent-primary">
            {metrics.modelAccuracy.toFixed(1)}%
          </p>
        </div>

        <div className="premium-card">
          <p className="metric-label">
            <span className="text-xl">💰</span> FII Flow Today
          </p>
          <p
            className={`metric-value ${
              metrics.fiiFlow >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            ₹{metrics.fiiFlow} Cr
          </p>
        </div>

        <div className="premium-card">
          <p className="metric-label">
            <span className="text-xl">👁️</span> Active Watchlist
          </p>
          <p className="metric-value">
            {metrics.watchlistCount}
          </p>
        </div>
      </div>

      {/* Signals Table */}
      <div className="premium-card !p-0">
        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold tracking-wide">Live Signals</h2>
            {streamLoading && streamTotal > 0 && (
              <span className="text-xs text-text-muted font-mono bg-black/30 px-3 py-1 rounded-full border border-white/5">
                Analyzing {streamReceived}/{streamTotal}…
              </span>
            )}
          </div>
          {lastUpdated && (
            <p className="text-text-muted text-xs font-medium bg-black/30 px-3 py-1.5 rounded-full border border-white/5">
              Updated: {formatTime(lastUpdated)}
            </p>
          )}
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-4 px-6 py-3 border-b border-white/5 bg-white/[0.01]">
          <span className="text-text-muted text-xs font-semibold uppercase tracking-widest">Signal:</span>
          <div className="flex gap-1.5">
            {['ALL', 'BUY', 'SELL', 'WATCH', 'SKIP'].map((f) => (
              <button
                key={f}
                onClick={() => setSignalFilter(f)}
                className={`px-3 py-1 rounded-lg text-xs font-bold tracking-wider transition-all duration-200 border ${
                  signalFilter === f
                    ? f === 'BUY' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                    : f === 'SELL' ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                    : f === 'WATCH' ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                    : f === 'SKIP' ? 'bg-zinc-500/20 text-zinc-400 border-zinc-500/40'
                    : 'bg-accent-primary/20 text-accent-primary border-accent-primary/40'
                    : 'bg-transparent text-text-muted border-white/10 hover:bg-white/5'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="w-px h-5 bg-white/10 mx-2"></div>

          <span className="text-text-muted text-xs font-semibold uppercase tracking-widest">Risk:</span>
          <div className="flex gap-1.5">
            {['ALL', 'LOW', 'MEDIUM', 'HIGH'].map((f) => (
              <button
                key={f}
                onClick={() => setRiskFilter(f)}
                className={`px-3 py-1 rounded-lg text-xs font-bold tracking-wider transition-all duration-200 border ${
                  riskFilter === f
                    ? f === 'LOW' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                    : f === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                    : f === 'HIGH' ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                    : 'bg-accent-primary/20 text-accent-primary border-accent-primary/40'
                    : 'bg-transparent text-text-muted border-white/10 hover:bg-white/5'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {(signalFilter !== 'ALL' || riskFilter !== 'ALL') && (
            <button
              onClick={() => { setSignalFilter('ALL'); setRiskFilter('ALL') }}
              className="ml-auto text-xs text-text-muted hover:text-white transition-colors underline"
            >
              Clear filters
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header-premium">
                <th className="py-4 px-6 font-semibold">Stock</th>
                <th className="py-4 px-6 font-semibold">Signal</th>
                <th className="py-4 px-6 font-semibold">AI Confidence</th>
                <th className="py-4 px-6 font-semibold">Entry ₹</th>
                <th className="py-4 px-6 font-semibold">Target ₹</th>
                <th className="py-4 px-6 font-semibold">Stop Loss ₹</th>
                <th className="py-4 px-6 font-semibold">Risk Level</th>
                <th className="py-4 px-6 font-semibold">Analysis</th>
                <th className="py-4 px-6 font-semibold">Time</th>
              </tr>
            </thead>
            <tbody>
              {/* Loaded signal rows */}
              {filteredSignals.map((signal, index) => (
                <tr
                  key={index}
                  className="table-row-premium cursor-pointer animate-fade-in"
                  onClick={() => navigate(`/chart/${signal.symbol}`)}
                >
                  <td className="py-4 px-6 font-bold tracking-wide">{signal.symbol}</td>
                  <td className="py-4 px-6">
                    <span className={getSignalBadgeClass(signal.signal)}>
                      {signal.signal}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="progress-bar-glass w-24">
                        <div
                          className={`${
                            signal.confidence >= 75
                              ? 'progress-fill-buy'
                              : signal.confidence >= 55
                              ? 'progress-fill-watch'
                              : 'progress-fill-sell'
                          }`}
                          style={{ width: `${signal.confidence}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-bold font-mono">
                        {signal.confidence}%
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-6 font-mono text-text-secondary">{signal.entry_price?.toFixed(2) || '-'}</td>
                  <td className="py-4 px-6 font-mono text-emerald-400 font-semibold">
                    {signal.target?.toFixed(2) || '-'}
                  </td>
                  <td className="py-4 px-6 font-mono text-rose-400 font-semibold">
                    {signal.stop_loss?.toFixed(2) || '-'}
                  </td>
                  <td className="py-4 px-6">
                    <span
                      className={`text-xs font-bold tracking-wider uppercase ${
                        signal.risk === 'HIGH'
                          ? 'text-rose-400'
                          : signal.risk === 'MEDIUM'
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {signal.risk}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div
                      className="text-text-muted hover:text-white transition-colors flex items-center gap-2 max-w-[200px]"
                      onClick={(e) => handleReasonClick(signal, e)}
                    >
                      <span className="truncate">📊 {signal.reason}</span>
                      <div className="invisible group-hover:visible bg-white/10 p-1 rounded-md ml-auto shrink-0">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/></svg>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-text-muted font-mono">
                    {formatTime(signal.timestamp)}
                  </td>
                </tr>
              ))}

              {/* Shimmer skeleton rows for signals still being fetched */}
              {streamLoading && skeletonCount > 0 && Array(skeletonCount).fill(0).map((_, i) => (
                <tr key={`skeleton-${i}`} className="border-b border-white/5">
                  <td className="py-4 px-6"><div className="skeleton h-4 w-20"></div></td>
                  <td className="py-4 px-6"><div className="skeleton h-6 w-16 rounded-lg"></div></td>
                  <td className="py-4 px-6"><div className="skeleton h-4 w-28"></div></td>
                  <td className="py-4 px-6"><div className="skeleton h-4 w-16"></div></td>
                  <td className="py-4 px-6"><div className="skeleton h-4 w-16"></div></td>
                  <td className="py-4 px-6"><div className="skeleton h-4 w-16"></div></td>
                  <td className="py-4 px-6"><div className="skeleton h-4 w-12"></div></td>
                  <td className="py-4 px-6"><div className="skeleton h-4 w-36"></div></td>
                  <td className="py-4 px-6"><div className="skeleton h-4 w-14"></div></td>
                </tr>
              ))}

              {/* Empty state — only after streaming is done */}
              {!streamLoading && filteredSignals.length === 0 && (
                <tr>
                  <td colSpan="9" className="text-center py-8 text-text-secondary">
                    No signals match current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reason Modal */}
      <ReasonModal
        isOpen={showReasonModal}
        onClose={handleCloseModal}
        signal={selectedSignal}
      />
    </div>
  )
}



export default Dashboard
