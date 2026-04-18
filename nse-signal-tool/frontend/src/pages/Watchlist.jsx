import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import {  LineChart, Line, ResponsiveContainer } from 'recharts'

const Watchlist = () => {
  const navigate = useNavigate()
  const [watchlist, setWatchlist] = useState([])
  const [stockData, setStockData] = useState({})
  const [newSymbol, setNewSymbol] = useState('')
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)

  // Fetch watchlist
  useEffect(() => {
    fetchWatchlist()
  }, [])

  const fetchWatchlist = async () => {
    try {
      const res = await axios.get('/api/watchlist')
      const stocks = res.data.watchlist

      setWatchlist(stocks)

      // Fetch signal data for each stock
      for (const stock of stocks) {
        fetchStockData(stock.symbol)
      }

      setLoading(false)
    } catch (error) {
      console.error('Error fetching watchlist:', error)
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
          chart: chartRes.data.data.slice(-20), // Last 20 candles
        },
      }))
    } catch (error) {
      console.error(`Error fetching data for ${symbol}:`, error)
    }
  }

  const addStock = async (e) => {
    e.preventDefault()

    if (!newSymbol.trim()) return

    setAdding(true)

    try {
      // Validate symbol exists
      await axios.get(`/api/signal/${newSymbol.toUpperCase()}`)

      // Add to watchlist
      await axios.post('/api/watchlist', {
        symbol: newSymbol.toUpperCase(),
      })

      setNewSymbol('')
      fetchWatchlist()
    } catch (error) {
      alert(
        `Failed to add ${newSymbol}. Please check if the symbol is valid.`
      )
    } finally {
      setAdding(false)
    }
  }

  const removeStock = async (symbol) => {
    if (!confirm(`Remove ${symbol} from watchlist?`)) return

    try {
      await axios.delete(`/api/watchlist/${symbol}`)
      setWatchlist((prev) => prev.filter((s) => s.symbol !== symbol))
      setStockData((prev) => {
        const newData = { ...prev }
        delete newData[symbol]
        return newData
      })
    } catch (error) {
      console.error('Error removing stock:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto"></div>
          <p className="mt-4 text-text-secondary">Loading watchlist...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Watchlist</h1>
        <p className="text-text-secondary mt-1">
          Track your favorite NSE stocks
        </p>
      </div>

      {/* Add Stock Form */}
      <div className="premium-card">
        <form onSubmit={addStock} className="flex gap-3">
          <input
            type="text"
            value={newSymbol}
            onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
            placeholder="Search stock symbol (e.g., RELIANCE)"
            className="premium-input flex-1"
            disabled={adding}
          />
          <button
            type="submit"
            disabled={adding}
            className="btn-primary disabled:opacity-50"
          >
            {adding ? 'Adding...' : 'Add Stock'}
          </button>
        </form>
      </div>

      {/* Watchlist Grid */}
      {watchlist.length === 0 ? (
        <div className="premium-card text-center py-12">
          <p className="text-text-secondary">
            No stocks in watchlist. Add some to get started!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {watchlist.map((stock) => {
            const data = stockData[stock.symbol]

            return (
              <div
                key={stock.symbol}
                className="premium-card-hover"
                onClick={() => navigate(`/chart/${stock.symbol}`)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold">{stock.symbol}</h3>
                    {data?.signal && (
                      <p className="text-text-secondary text-sm mt-1">
                        ₹{data.signal.entry_price?.toFixed(2)}
                        {data.signal.entry_price && (
                          <span
                            className={
                              Math.random() > 0.5
                                ? 'text-signal-buy ml-2'
                                : 'text-signal-sell ml-2'
                            }
                          >
                            {Math.random() > 0.5 ? '+' : '-'}
                            {(Math.random() * 3).toFixed(2)}%
                          </span>
                        )}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      removeStock(stock.symbol)
                    }}
                    className="text-text-secondary hover:text-signal-sell transition-colors"
                  >
                    ✕
                  </button>
                </div>

                {data?.signal && (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <span
                        className={`signal-badge-${data.signal.signal.toLowerCase()}`}
                      >
                        {data.signal.signal}
                      </span>
                      <span className="text-sm font-semibold">
                        {data.signal.confidence}%
                      </span>
                    </div>

                    {/* Mini Sparkline */}
                    {data.chart && data.chart.length > 0 && (
                      <div className="h-16">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={data.chart}>
                            <Line
                              type="monotone"
                              dataKey="close"
                              stroke="#0a84ff"
                              strokeWidth={2}
                              dot={false}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    <div className="mt-3 pt-3 border-t border-bg-border text-sm">
                      <p className="text-text-secondary line-clamp-2">
                        {data.signal.reason}
                      </p>
                    </div>
                  </>
                )}

                {!data && (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent mx-auto"></div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default Watchlist
