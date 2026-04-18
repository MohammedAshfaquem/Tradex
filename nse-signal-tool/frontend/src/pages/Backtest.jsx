import { useState, useEffect } from 'react'
import axios from 'axios'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const Backtest = () => {
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    fetchResults()
  }, [])

  const fetchResults = async () => {
    try {
      const res = await axios.get('/api/backtest')
      if (res.data.results) {
        setResults(res.data.results)
      }
      setLoading(false)
    } catch (error) {
      console.error('Error fetching backtest results:', error)
      setLoading(false)
    }
  }

  const runBacktest = async () => {
    if (!confirm('Run new backtest? This will take several minutes.')) return

    setRunning(true)

    try {
      await axios.post('/api/backtest/run')
      alert(
        'Backtest started in background. Results will be available shortly.'
      )

      // Poll for results
      const pollInterval = setInterval(async () => {
        const res = await axios.get('/api/backtest')
        if (res.data.results && res.data.results.run_date !== results?.run_date) {
          setResults(res.data.results)
          setRunning(false)
          clearInterval(pollInterval)
        }
      }, 5000)

      // Stop polling after 5 minutes
      setTimeout(() => {
        clearInterval(pollInterval)
        setRunning(false)
      }, 300000)
    } catch (error) {
      console.error('Error running backtest:', error)
      setRunning(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto"></div>
          <p className="mt-4 text-text-secondary">Loading backtest results...</p>
        </div>
      </div>
    )
  }

  if (!results) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">Backtest</h1>
        <div className="card text-center py-12">
          <p className="text-text-secondary mb-6">
            No backtest results available. Run a backtest to see performance.
          </p>
          <button
            onClick={runBacktest}
            disabled={running}
            className="btn-primary disabled:opacity-50"
          >
            {running ? 'Running Backtest...' : 'Run Backtest'}
          </button>
        </div>
      </div>
    )
  }

  const byStockResults = results.details?.by_stock || {}

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Backtest Results</h1>
          <p className="text-text-secondary mt-1">
            Run date: {new Date(results.run_date).toLocaleString('en-IN')}
          </p>
        </div>

        <button
          onClick={runBacktest}
          disabled={running}
          className="btn-primary disabled:opacity-50"
        >
          {running ? 'Running...' : 'Run New Backtest'}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="card">
          <p className="text-text-secondary text-sm">ML Accuracy</p>
          <p className="text-3xl font-bold text-accent mt-2">
            {results.accuracy?.toFixed(1) || '—'}%
          </p>
          <p className="text-text-muted text-xs mt-1">Directional prediction</p>
        </div>

        <div className="card">
          <p className="text-text-secondary text-sm">Win Rate</p>
          <p className="text-3xl font-bold text-signal-buy mt-2">
            {results.win_rate?.toFixed(1)}%
          </p>
          <p className="text-text-muted text-xs mt-1">Target-hit trades</p>
        </div>

        <div className="card">
          <p className="text-text-secondary text-sm">Total Trades</p>
          <p className="text-3xl font-bold text-text-primary mt-2">
            {results.total_trades}
          </p>
        </div>

        <div className="card">
          <p className="text-text-secondary text-sm">Avg Profit</p>
          <p className="text-3xl font-bold text-signal-buy mt-2">
            {results.avg_profit?.toFixed(2)}%
          </p>
        </div>

        <div className="card">
          <p className="text-text-secondary text-sm">Avg Loss</p>
          <p className="text-3xl font-bold text-signal-sell mt-2">
            {results.avg_loss?.toFixed(2)}%
          </p>
        </div>

        <div className="card">
          <p className="text-text-secondary text-sm">Risk/Reward</p>
          <p className="text-3xl font-bold text-accent mt-2">
            {results.rr_ratio?.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Per-Stock Results */}
      {Object.keys(byStockResults).length > 0 && (
        <div className="card">
          <h2 className="text-xl font-bold mb-4">Performance by Stock</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-bg-border text-left">
                  <th className="pb-3 font-semibold">Stock</th>
                  <th className="pb-3 font-semibold">ML Accuracy</th>
                  <th className="pb-3 font-semibold">Total Trades</th>
                  <th className="pb-3 font-semibold">Wins</th>
                  <th className="pb-3 font-semibold">Losses</th>
                  <th className="pb-3 font-semibold">Win Rate</th>
                  <th className="pb-3 font-semibold">Avg Profit</th>
                  <th className="pb-3 font-semibold">Avg Loss</th>
                  <th className="pb-3 font-semibold">R/R Ratio</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(byStockResults).map(([symbol, data]) => (
                  <tr
                    key={symbol}
                    className="border-b border-bg-border hover:bg-bg-border transition-colors"
                  >
                    <td className="py-3 font-semibold">{symbol}</td>
                    <td className="py-3 text-accent">{data.ml_accuracy?.toFixed(1) ?? '—'}%</td>
                    <td className="py-3">{data.total_trades}</td>
                    <td className="py-3 text-signal-buy">{data.wins}</td>
                    <td className="py-3 text-signal-sell">{data.losses}</td>
                    <td className="py-3">{data.win_rate?.toFixed(1)}%</td>
                    <td className="py-3 text-signal-buy">
                      {data.avg_profit?.toFixed(2)}%
                    </td>
                    <td className="py-3 text-signal-sell">
                      {data.avg_loss?.toFixed(2)}%
                    </td>
                    <td className="py-3">{data.rr_ratio?.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* P&L Curve */}
      {results.details?.all_trades && (
        <div className="card">
          <h2 className="text-xl font-bold mb-4">Cumulative P&L Curve</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={results.details.all_trades.map((trade, i) => ({
                  index: i + 1,
                  cumulative: results.details.all_trades
                    .slice(0, i + 1)
                    .reduce((sum, t) => sum + t.profit_pct, 0),
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3a" />
                <XAxis
                  dataKey="index"
                  stroke="#8b8fa8"
                  label={{ value: 'Trade Number', position: 'insideBottom', offset: -5 }}
                />
                <YAxis
                  stroke="#8b8fa8"
                  label={{ value: 'Cumulative P&L (%)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a1d27',
                    border: '1px solid #2a2d3a',
                    borderRadius: '8px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="cumulative"
                  stroke="#3d7eff"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}

export default Backtest
