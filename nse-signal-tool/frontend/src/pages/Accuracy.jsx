import { useState, useEffect } from 'react'
import axios from 'axios'

// ── helper colours ───────────────────────────────────────────────────────────
const outcomeClasses = {
  win:  'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
  loss: 'text-rose-400 bg-rose-400/10 border-rose-400/30',
  open: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
}

const signalClasses = {
  BUY:  'signal-badge-buy',
  SELL: 'signal-badge-sell',
  WATCH:'signal-badge-watch',
  SKIP: 'signal-badge-skip',
}

const tierColors = {
  high:   { bar: 'from-emerald-400 to-teal-500',  label: 'text-emerald-400', bg: 'bg-emerald-400/10  border-emerald-400/20' },
  medium: { bar: 'from-amber-400  to-orange-500', label: 'text-amber-400',   bg: 'bg-amber-400/10   border-amber-400/20'  },
  low:    { bar: 'from-rose-400   to-red-500',    label: 'text-rose-400',    bg: 'bg-rose-400/10    border-rose-400/20'   },
}

// ── Confidence breakdown detail panel ────────────────────────────────────────
const FACTOR_LABELS = {
  rsi_score:           { label: 'RSI Momentum',        max: 6  },
  macd_score:          { label: 'MACD Trend',           max: 5  },
  ema_score:           { label: 'EMA Alignment',        max: 5  },
  bb_score:            { label: 'Bollinger Bands',      max: 4  },
  vwap_score:          { label: 'VWAP Position',        max: 5  },
  adx_score:           { label: 'ADX Strength',         max: 5  },
  stoch_score:         { label: 'Stochastic',           max: 5  },
  pattern_score:       { label: 'Candlestick Patterns', max: 10 },
  volume_score:        { label: 'Volume Surge',         max: 6  },
  fno_score:           { label: 'F&O Data (PCR/OI)',    max: 8  },
  news_score:          { label: 'News Sentiment',       max: 8  },
  ml_score:            { label: 'ML Model Prob.',       max: 20 },
  timeframe_agreement: { label: 'Multi-TF Agreement',  max: 15 },
  bonuses:             { label: 'Bonus Points',         max: 5  },
}

function SignalDetailModal({ signal, onClose }) {
  if (!signal) return null
  const outcomeLabel = signal.outcome.charAt(0).toUpperCase() + signal.outcome.slice(1)
  const breakdown = signal.breakdown || {}
  const factors = Object.entries(FACTOR_LABELS).filter(([k]) => breakdown[k] !== undefined)

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="premium-card w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-black tracking-tight">{signal.symbol}</h2>
            <span className={signalClasses[signal.signal]}>{signal.signal}</span>
            <span className={`text-xs font-bold px-2 py-1 rounded-lg border ${outcomeClasses[signal.outcome]}`}>
              {outcomeLabel}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-white text-2xl leading-none transition-colors"
          >×</button>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Confidence', value: `${signal.confidence}%`, color: signal.confidence >= 80 ? 'text-emerald-400' : signal.confidence >= 70 ? 'text-amber-400' : 'text-rose-400' },
            { label: 'Risk:Reward', value: `1 : ${signal.rr_ratio}`, color: 'text-accent-primary' },
            { label: 'Entry', value: `₹${signal.entry_price?.toFixed(2)}`, color: 'text-white' },
          ].map(m => (
            <div key={m.label} className="bg-black/30 rounded-xl p-4 border border-white/5 text-center">
              <p className="text-text-muted text-xs uppercase tracking-widest font-semibold mb-1">{m.label}</p>
              <p className={`text-xl font-black font-mono ${m.color}`}>{m.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="flex items-center justify-between bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20">
            <span className="text-text-secondary text-sm">Target</span>
            <span className="font-bold font-mono text-emerald-400">₹{signal.target?.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between bg-rose-500/10 p-3 rounded-lg border border-rose-500/20">
            <span className="text-text-secondary text-sm">Stop Loss</span>
            <span className="font-bold font-mono text-rose-400">₹{signal.stop_loss?.toFixed(2)}</span>
          </div>
        </div>

        {/* Confidence Breakdown */}
        {factors.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-text-muted mb-4">
              Confidence Breakdown — What Drove This Signal
            </h3>
            <div className="space-y-3">
              {factors.map(([key, meta]) => {
                const raw = breakdown[key] ?? 0
                const pct = Math.min(100, Math.max(0, (Math.abs(raw) / meta.max) * 100))
                const isPositive = raw >= 0
                return (
                  <div key={key} className="flex items-center gap-3">
                    <span className="text-text-secondary text-xs font-medium w-44 shrink-0">{meta.label}</span>
                    <div className="flex-1 bg-black/40 rounded-full h-2 overflow-hidden border border-white/5">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${isPositive ? 'bg-gradient-to-r from-accent-primary to-blue-400' : 'bg-gradient-to-r from-rose-400 to-red-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className={`text-xs font-bold font-mono w-10 text-right ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {raw > 0 ? '+' : ''}{raw}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* AI Reason */}
        {signal.reason && (
          <div className="bg-accent-primary/5 border border-accent-primary/20 rounded-xl p-4">
            <p className="text-text-muted text-xs uppercase tracking-widest font-semibold mb-2">🤖 AI Analysis</p>
            <p className="text-sm text-text-primary/90 leading-relaxed">{signal.reason}</p>
          </div>
        )}

        <p className="text-text-muted text-xs mt-4 text-right">
          Generated: {signal.timestamp ? new Date(signal.timestamp).toLocaleString('en-IN') : 'N/A'}
        </p>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Accuracy() {
  const [data, setData]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [selected, setSelected] = useState(null)
  const [filter, setFilter]     = useState('all')  // all | win | loss | open

  useEffect(() => {
    axios.get('/api/accuracy', { timeout: 60000 })
      .then(res => { setData(res.data); setLoading(false) })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="w-14 h-14 rounded-full border-2 border-accent-primary border-t-transparent animate-spin mx-auto mb-4" />
        <p className="text-text-secondary font-medium">Analysing historical signals…</p>
        <p className="text-text-muted text-xs mt-2">Checking actual price outcomes — may take ~30s</p>
      </div>
    </div>
  )

  if (error) return (
    <div className="p-8">
      <div className="premium-card border-rose-500/30 bg-rose-500/5 text-rose-400">
        <p className="font-bold">❌ Error loading accuracy data</p>
        <p className="text-sm mt-1 text-text-muted">{error}</p>
      </div>
    </div>
  )

  const { overall_accuracy, total_signals, wins, losses, open: openCount,
          per_symbol, by_confidence_tier, all_signals, message } = data

  const filtered = (all_signals || []).filter(s => filter === 'all' || s.outcome === filter)

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-4xl font-black tracking-tight">Signal Accuracy</h1>
        <p className="text-text-muted mt-2">Real-time evaluation of past BUY/SELL signals against actual price movements</p>
      </div>

      {message && (
        <div className="premium-card border-amber-500/30 bg-amber-500/5 text-amber-400 text-sm">
          ℹ️ {message}
        </div>
      )}

      {/* Top KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Overall Accuracy', value: `${overall_accuracy}%`, sub: `${total_signals} evaluated`, color: overall_accuracy >= 70 ? 'text-emerald-400' : overall_accuracy >= 55 ? 'text-amber-400' : 'text-rose-400' },
          { label: 'Wins',   value: wins,        sub: 'Target hit',  color: 'text-emerald-400' },
          { label: 'Losses', value: losses,      sub: 'Stop hit',    color: 'text-rose-400'   },
          { label: 'Open',   value: openCount ?? 0, sub: 'Still running', color: 'text-amber-400'  },
        ].map(k => (
          <div key={k.label} className="premium-card text-center">
            <p className="text-text-muted text-xs uppercase tracking-widest font-semibold mb-2">{k.label}</p>
            <p className={`text-4xl font-black font-mono ${k.color}`}>{k.value}</p>
            <p className="text-text-muted text-xs mt-1">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Accuracy gauge */}
      <div className="premium-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold tracking-wide">Win Rate Gauge</h2>
          <span className={`text-3xl font-black font-mono ${overall_accuracy >= 70 ? 'text-emerald-400' : overall_accuracy >= 55 ? 'text-amber-400' : 'text-rose-400'}`}>
            {overall_accuracy}%
          </span>
        </div>
        <div className="w-full bg-black/40 rounded-full h-4 border border-white/5">
          <div
            className={`h-4 rounded-full transition-all duration-1000 bg-gradient-to-r ${overall_accuracy >= 70 ? 'from-emerald-400 to-teal-500 shadow-glow-success' : overall_accuracy >= 55 ? 'from-amber-400 to-orange-500 shadow-glow-warning' : 'from-rose-400 to-red-500 shadow-glow-danger'}`}
            style={{ width: `${overall_accuracy}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-text-muted mt-2">
          <span>0% (No accuracy)</span>
          <span className="text-amber-400">55% (Average)</span>
          <span className="text-emerald-400">70%+ (Strong)</span>
          <span>100%</span>
        </div>
      </div>

      {/* Confidence Tier Accuracy */}
      <div className="premium-card">
        <h2 className="text-lg font-bold mb-6 tracking-wide">Accuracy by Confidence Tier</h2>
        <div className="grid grid-cols-3 gap-4">
          {Object.entries(by_confidence_tier || {}).map(([tier, stats]) => {
            const tc = tierColors[tier] || tierColors.low
            return (
              <div key={tier} className={`rounded-xl p-5 border ${tc.bg}`}>
                <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${tc.label}`}>
                  {tier === 'high' ? '🔥 High (≥80%)' : tier === 'medium' ? '⚡ Medium (70-79%)' : '🌊 Low (<70%)'}
                </p>
                <p className={`text-4xl font-black font-mono mt-2 ${tc.label}`}>{stats.accuracy ?? 0}%</p>
                <div className="text-text-muted text-xs mt-3 space-y-1">
                  <div className="flex justify-between"><span>Wins</span><span className="text-emerald-400 font-bold">{stats.wins ?? 0}</span></div>
                  <div className="flex justify-between"><span>Losses</span><span className="text-rose-400 font-bold">{stats.losses ?? 0}</span></div>
                </div>
                <div className="mt-3 bg-black/30 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full bg-gradient-to-r ${tc.bar}`}
                    style={{ width: `${stats.accuracy ?? 0}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
        <p className="text-text-muted text-xs mt-4">
          💡 <strong className="text-white">Insight:</strong> Use only signals with ≥80% confidence for highest accuracy. SKIP WATCH and low-confidence signals entirely.
        </p>
      </div>

      {/* Per-Symbol Table */}
      {Object.keys(per_symbol || {}).length > 0 && (
        <div className="premium-card">
          <h2 className="text-lg font-bold mb-6 tracking-wide">Per-Symbol Accuracy</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="table-header-premium">
                  <th className="px-4 py-3 text-left">Symbol</th>
                  <th className="px-4 py-3 text-center">Total</th>
                  <th className="px-4 py-3 text-center">Wins</th>
                  <th className="px-4 py-3 text-center">Losses</th>
                  <th className="px-4 py-3 text-center">Accuracy</th>
                  <th className="px-4 py-3 text-left">Win Rate Bar</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(per_symbol)
                  .sort((a, b) => (b[1].accuracy || 0) - (a[1].accuracy || 0))
                  .map(([sym, stats]) => (
                    <tr key={sym} className="table-row-premium">
                      <td className="px-4 py-3 font-bold tracking-wide">{sym}</td>
                      <td className="px-4 py-3 text-center text-text-secondary font-mono">{stats.total}</td>
                      <td className="px-4 py-3 text-center text-emerald-400 font-bold font-mono">{stats.wins}</td>
                      <td className="px-4 py-3 text-center text-rose-400 font-bold font-mono">{stats.losses}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-black font-mono text-lg ${stats.accuracy >= 70 ? 'text-emerald-400' : stats.accuracy >= 55 ? 'text-amber-400' : 'text-rose-400'}`}>
                          {stats.accuracy}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="w-full bg-black/30 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full bg-gradient-to-r ${stats.accuracy >= 70 ? 'from-emerald-400 to-teal-500' : stats.accuracy >= 55 ? 'from-amber-400 to-orange-500' : 'from-rose-400 to-red-500'}`}
                            style={{ width: `${stats.accuracy}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Signal History */}
      <div className="premium-card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold tracking-wide">Signal History</h2>
          <div className="flex gap-2">
            {['all', 'win', 'loss', 'open'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${
                  filter === f
                    ? 'bg-accent-primary text-white shadow-glow-primary'
                    : 'bg-white/5 text-text-secondary hover:text-white'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="text-text-secondary text-center py-8">No signals match this filter.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="table-header-premium">
                  <th className="px-4 py-3 text-left">Symbol</th>
                  <th className="px-4 py-3 text-left">Signal</th>
                  <th className="px-4 py-3 text-center">Confidence</th>
                  <th className="px-4 py-3 text-center">Entry</th>
                  <th className="px-4 py-3 text-center">Target</th>
                  <th className="px-4 py-3 text-center">Stop</th>
                  <th className="px-4 py-3 text-center">R:R</th>
                  <th className="px-4 py-3 text-center">Outcome</th>
                  <th className="px-4 py-3 text-center">Detail</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => (
                  <tr
                    key={i}
                    className="table-row-premium cursor-pointer hover:bg-white/[0.04]"
                    onClick={() => setSelected(s)}
                  >
                    <td className="px-4 py-3 font-bold">{s.symbol}</td>
                    <td className="px-4 py-3">
                      <span className={signalClasses[s.signal]}>{s.signal}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-bold font-mono text-sm ${s.confidence >= 80 ? 'text-emerald-400' : s.confidence >= 70 ? 'text-amber-400' : 'text-rose-400'}`}>
                        {s.confidence}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-text-secondary">₹{s.entry_price?.toFixed(0)}</td>
                    <td className="px-4 py-3 text-center font-mono text-emerald-400">₹{s.target?.toFixed(0)}</td>
                    <td className="px-4 py-3 text-center font-mono text-rose-400">₹{s.stop_loss?.toFixed(0)}</td>
                    <td className="px-4 py-3 text-center font-mono text-accent-primary">{s.rr_ratio}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-bold px-2 py-1 rounded-lg border ${outcomeClasses[s.outcome] || outcomeClasses.open}`}>
                        {s.outcome}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={e => { e.stopPropagation(); setSelected(s) }}
                        className="text-accent-primary hover:text-white text-xs font-bold bg-accent-primary/10 hover:bg-accent-primary/20 px-3 py-1 rounded-lg transition-all"
                      >
                        View →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Signal Detail Modal */}
      {selected && (
        <SignalDetailModal signal={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
