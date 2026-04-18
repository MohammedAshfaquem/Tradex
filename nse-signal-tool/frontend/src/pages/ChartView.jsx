import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'
import { createChart } from 'lightweight-charts'

const ChartView = () => {
  const { symbol } = useParams()
  const [chartData, setChartData] = useState(null)
  const [signalData, setSignalData] = useState(null)
  const [ timeframe, setTimeframe] = useState('1h')
  const [loading, setLoading] = useState(true)
  const chartContainerRef = useRef(null)
  const chartRef = useRef(null)

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        // Fetch chart data
        const chartRes = await axios.get(`/api/chart/${symbol}?timeframe=${timeframe}`)
        setChartData(chartRes.data)

        // Fetch signal data
        const signalRes = await axios.get(`/api/signal/${symbol}`)
        setSignalData(signalRes.data)

        setLoading(false)
      } catch (error) {
        console.error('Error fetching data:', error)
        setLoading(false)
      }
    }

    fetchData()
  }, [symbol, timeframe])

  // Initialize chart
  useEffect(() => {
    if (!chartData || !chartContainerRef.current) return

    // Clear existing chart
    if (chartRef.current) {
      chartRef.current.remove()
    }

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: '#1a1d27' },
        textColor: '#8b8fa8',
      },
      grid: {
        vertLines: { color: '#2a2d3a' },
        horzLines: { color: '#2a2d3a' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 500,
    })

    // Candlestick series
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#00d084',
      downColor: '#ff4757',
      borderUpColor: '#00d084',
      borderDownColor: '#ff4757',
      wickUpColor: '#00d084',
      wickDownColor: '#ff4757',
    })

    // Process data
    const ohlcData = chartData.data.map((d) => ({
      time: new Date(d.datetime).getTime() / 1000,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }))

    candlestickSeries.setData(ohlcData)

    // Add EMAs if available
    if (chartData.indicators.ema9) {
      const ema9Series = chart.addLineSeries({
        color: '#3d7eff',
        lineWidth: 2,
      })

      const ema21Series = chart.addLineSeries({
        color: '#ff9800',
        lineWidth: 2,
      })

      const ema50Series = chart.addLineSeries({
        color: '#9c27b0',
        lineWidth: 2,
      })

      // For simplicity, using same EMA value for all points
      // In production, calculate EMAs for each point
      const lastTime = ohlcData[ohlcData.length - 1].time
      ema9Series.setData([{ time: lastTime, value: chartData.indicators.ema9 }])
      ema21Series.setData([{ time: lastTime, value: chartData.indicators.ema21 }])
      ema50Series.setData([{ time: lastTime, value: chartData.indicators.ema50 }])
    }

    // Volume series
    const volumeSeries = chart.addHistogramSeries({
      color: '#26a69a',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '',
    })

    const volumeData = chartData.data.map((d) => ({
      time: new Date(d.datetime).getTime() / 1000,
      value: d.volume,
      color: d.close >= d.open ? '#26a69a80' : '#ef535080',
    }))

    volumeSeries.setData(volumeData)

    chart.timeScale().fitContent()

    chartRef.current = chart

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
        })
      }
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chart.remove()
    }
  }, [chartData])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto"></div>
          <p className="mt-4 text-text-secondary">Loading chart...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-tight">{symbol}</h1>
          {signalData && (
            <p className="text-text-muted mt-2 font-medium tracking-wide">
              ₹{signalData.entry_price?.toFixed(2)}{' '}
              <span className="text-white/20 px-2">•</span>{' '}
              <span className={`font-bold ${
                signalData.signal === 'BUY' ? 'text-emerald-400' :
                signalData.signal === 'SELL' ? 'text-rose-400' :
                'text-amber-400'
              }`}>{signalData.signal} Signal</span>
            </p>
          )}
        </div>

        {/* Timeframe selector */}
        <div className="flex gap-2">
          {['15m', '1h', '4h', '1d'].map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-4 py-2 rounded-xl font-bold tracking-widest text-xs transition-all duration-200 ${
                timeframe === tf
                  ? 'bg-gradient-to-r from-accent-primary to-blue-500 text-white shadow-glow-primary'
                  : 'bg-white/5 text-text-secondary hover:bg-white/10 hover:text-white border border-white/5'
              }`}
            >
              {tf.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Chart */}
        <div className="col-span-2 space-y-6">
          <div className="premium-card !p-0 overflow-hidden border border-white/10">
            <div ref={chartContainerRef}></div>
          </div>

          {/* Confidence Breakdown */}
          {signalData?.breakdown && (
            <div className="premium-card">
              <h3 className="text-lg font-bold mb-6 tracking-wide">Confidence Breakdown</h3>
              <div className="space-y-4">
                {Object.entries(signalData.breakdown)
                  .filter(([key]) => !['entry_price', 'target', 'stop_loss', 'risk_reward'].includes(key))
                  .map(([key, value]) => (
                    <div key={key} className="flex items-center gap-4">
                      <span className="text-text-secondary w-40 capitalize font-medium text-sm tracking-wide">
                        {key.replace(/_/g, ' ')}
                      </span>
                      <div className="progress-bar-glass">
                        <div
                          className="bg-gradient-to-r from-accent-primary to-blue-400 h-1.5 rounded-full shadow-glow-primary"
                          style={{ width: `${Math.abs(value) * 5}%` }}
                        ></div>
                      </div>
                      <span className="font-bold font-mono w-12 text-right">{value}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Panel */}
        <div className="space-y-6">
          {/* Signal Card */}
          {signalData && (
            <div className="premium-card">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold tracking-wide">Signal</h3>
                <span
                  className={`signal-badge-${signalData.signal.toLowerCase()}`}
                >
                  {signalData.signal}
                </span>
              </div>

              <div className="space-y-5">
                <div>
                  <p className="text-text-muted text-xs uppercase tracking-widest font-semibold mb-1">Confidence</p>
                  <p className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-accent-primary to-blue-400 mt-1">
                    {signalData.confidence}%
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 bg-black/20 p-4 rounded-xl border border-white/5">
                  <div>
                    <p className="text-text-muted text-xs uppercase tracking-widest font-semibold mb-1">Entry</p>
                    <p className="text-lg font-bold font-mono">
                      ₹{signalData.entry_price?.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-text-muted text-xs uppercase tracking-widest font-semibold mb-1">Risk</p>
                    <p
                      className={`text-sm font-bold tracking-widest mt-1 ${
                        signalData.risk === 'HIGH'
                          ? 'text-rose-400'
                          : signalData.risk === 'MEDIUM'
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {signalData.risk}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20">
                  <p className="text-text-secondary text-sm font-medium">Target</p>
                  <p className="text-lg font-bold font-mono text-emerald-400 shadow-glow-success">
                    ₹{signalData.target?.toFixed(2)}
                  </p>
                </div>

                <div className="flex items-center justify-between bg-rose-500/10 p-3 rounded-lg border border-rose-500/20">
                  <p className="text-text-secondary text-sm font-medium">Stop Loss</p>
                  <p className="text-lg font-bold font-mono text-rose-400 shadow-glow-danger">
                    ₹{signalData.stop_loss?.toFixed(2)}
                  </p>
                </div>

                <div className="pt-4 border-t border-white/10">
                  <p className="text-text-muted text-xs uppercase tracking-widest font-semibold mb-2">AI Analysis</p>
                  <p className="text-sm font-medium leading-relaxed text-text-primary/90">{signalData.reason}</p>
                </div>
              </div>
            </div>
          )}

          {/* Indicators */}
          {signalData?.indicators && (
            <div className="premium-card">
              <h3 className="text-lg font-bold mb-6 tracking-wide">Technical Indicators</h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-text-secondary font-medium text-sm">RSI</span>
                    <span className="font-bold font-mono">
                      {signalData.indicators.rsi_value}
                    </span>
                  </div>
                  <div className="progress-bar-glass">
                    <div
                      className={`h-1.5 rounded-full ${
                        signalData.indicators.rsi_value > 70
                          ? 'bg-gradient-to-r from-rose-400 to-red-500 shadow-glow-danger'
                          : signalData.indicators.rsi_value < 30
                          ? 'bg-gradient-to-r from-emerald-400 to-teal-500 shadow-glow-success'
                          : 'bg-gradient-to-r from-amber-400 to-orange-500 shadow-glow-warning'
                      }`}
                      style={{
                        width: `${signalData.indicators.rsi_value}%`,
                      }}
                    ></div>
                  </div>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <p className="text-text-secondary font-medium text-sm">MACD</p>
                  <p className="font-bold font-mono">
                    {signalData.indicators.macd_value?.toFixed(4)}
                  </p>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <p className="text-text-secondary font-medium text-sm">EMA Trend</p>
                  <p className="font-bold tracking-wide text-sm">
                    {signalData.indicators.ema_score >= 5
                      ? 'Bullish 🟢'
                      : signalData.indicators.ema_score >= 3
                      ? 'Neutral 🟡'
                      : 'Bearish 🔴'}
                  </p>
                </div>

                <div className="flex justify-between items-center py-2">
                  <p className="text-text-secondary font-medium text-sm">ML Probability</p>
                  <p className="font-bold font-mono text-accent-primary shadow-glow-primary">
                    {(signalData.ml_probability * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* F&O Data */}
          {signalData?.fno && (
            <div className="premium-card">
              <h3 className="text-lg font-bold mb-4 tracking-wide">F&O Data</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-text-secondary font-medium text-sm">PCR</span>
                  <span className="font-bold font-mono">{signalData.fno.pcr}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-text-secondary font-medium text-sm">OI Direction</span>
                  <span className="font-bold capitalize text-sm">
                    {signalData.fno.oi_direction?.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-text-secondary font-medium text-sm">FII Net</span>
                  <span
                    className={`font-bold font-mono ${
                      signalData.fno.fii_net >= 0
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                    }`}
                  >
                    ₹{signalData.fno.fii_net} Cr
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* News */}
          {signalData?.news && signalData.news.length > 0 && (
            <div className="premium-card">
              <h3 className="text-lg font-bold mb-4 tracking-wide">Recent News</h3>
              <div className="space-y-3">
                {signalData.news.map((item, index) => (
                  <div key={index} className="text-sm">
                    <p className="text-text-primary">{item.headline}</p>
                    <p className="text-text-secondary text-xs mt-1">
                      {item.source}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ChartView
