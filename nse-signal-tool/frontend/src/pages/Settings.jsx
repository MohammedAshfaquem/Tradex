import { useState, useEffect } from 'react'

const Settings = () => {
  const [settings, setSettings] = useState({
    geminiApiKey: '',
    buyThreshold: 75,
    watchThreshold: 55,
    refreshInterval: 60,
    enableLlm: true,
    enableNews: true,
    trainingStocks: 'RELIANCE,TCS,HDFCBANK,INFY,ICICIBANK,SBIN,AXISBANK,WIPRO,LT,MARUTI',
  })

  const [saved, setSaved] = useState(false)

  // Load settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('nseSignalSettings')
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings))
    }
  }, [])

  const handleChange = (key, value) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }))
    setSaved(false)
  }

  const saveSettings = () => {
    localStorage.setItem('nseSignalSettings', JSON.stringify(settings))
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-text-secondary mt-1">
          Configure your trading signal parameters
        </p>
      </div>

      {/* API Configuration */}
      <div className="premium-card">
        <h2 className="text-xl font-bold mb-4 tracking-wide">API Configuration</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-text-secondary mb-2 uppercase tracking-wide">
              Gemini API Key
            </label>
            <input
              type="password"
              value={settings.geminiApiKey}
              onChange={(e) => handleChange('geminiApiKey', e.target.value)}
              placeholder="Enter your Gemini API key"
              className="premium-input w-full"
            />
            <p className="text-text-muted text-xs mt-2">
              Get a free API key from{' '}
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent-primary hover:underline hover:text-blue-400"
              >
                aistudio.google.com
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Signal Thresholds */}
      <div className="premium-card">
        <h2 className="text-xl font-bold mb-4 tracking-wide">Signal Thresholds</h2>

        <div className="space-y-8">
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-semibold text-text-secondary uppercase tracking-wide">
                BUY Threshold
              </label>
              <span className="text-sm font-bold text-emerald-400">
                {settings.buyThreshold}%
              </span>
            </div>
            <input
              type="range"
              min="60"
              max="90"
              value={settings.buyThreshold}
              onChange={(e) =>
                handleChange('buyThreshold', parseInt(e.target.value))
              }
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <p className="text-text-muted text-xs mt-2">
              Minimum confidence score to generate BUY signal (Default: 75)
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-semibold text-text-secondary uppercase tracking-wide">
                WATCH Threshold
              </label>
              <span className="text-sm font-bold text-amber-400">
                {settings.watchThreshold}%
              </span>
            </div>
            <input
              type="range"
              min="40"
              max="75"
              value={settings.watchThreshold}
              onChange={(e) =>
                handleChange('watchThreshold', parseInt(e.target.value))
              }
              className="w-full accent-amber-500 cursor-pointer"
            />
            <p className="text-text-muted text-xs mt-2">
              Minimum confidence score to generate WATCH signal (Default: 55)
            </p>
          </div>
        </div>
      </div>

      {/* Update Settings */}
      <div className="premium-card">
        <h2 className="text-xl font-bold mb-4 tracking-wide">Update Settings</h2>

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-semibold text-text-secondary uppercase tracking-wide">
                Refresh Interval
              </label>
              <span className="text-sm font-bold text-white">
                {settings.refreshInterval}s
              </span>
            </div>
            <input
              type="range"
              min="30"
              max="300"
              step="30"
              value={settings.refreshInterval}
              onChange={(e) =>
                handleChange('refreshInterval', parseInt(e.target.value))
              }
              className="w-full accent-accent-primary cursor-pointer"
            />
            <p className="text-text-muted text-xs mt-2">
              How often to refresh signals via WebSocket (Default: 60s)
            </p>
          </div>
        </div>
      </div>

      {/* Feature Toggles */}
      <div className="premium-card">
        <h2 className="text-xl font-bold mb-4 tracking-wide">Feature Toggles</h2>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-semibold text-text-secondary uppercase tracking-wide">
                Enable LLM Reasoning
              </label>
              <p className="text-text-muted text-xs mt-1">
                Use Gemini AI for advanced signal analysis and reasoning
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.enableLlm}
                onChange={(e) => handleChange('enableLlm', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-primary"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-semibold text-text-secondary uppercase tracking-wide">
                Enable News Fetching
              </label>
              <p className="text-text-muted text-xs mt-1">
                Fetch and analyze news sentiment from RSS feeds
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.enableNews}
                onChange={(e) => handleChange('enableNews', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-primary"></div>
            </label>
          </div>
        </div>
      </div>

      {/* ML Model Configuration */}
      <div className="premium-card">
        <h2 className="text-xl font-bold mb-4 tracking-wide">ML Model Configuration</h2>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-text-secondary mb-2 uppercase tracking-wide">
              Training Stocks (comma-separated)
            </label>
            <textarea
              value={settings.trainingStocks}
              onChange={(e) => handleChange('trainingStocks', e.target.value)}
              rows="3"
              className="premium-input w-full"
              placeholder="RELIANCE,TCS,HDFCBANK,..."
            />
            <p className="text-text-muted text-xs mt-2">
              Stocks used for ML model training. Change and retrain model for
              custom predictions.
            </p>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => alert('Model retraining would be triggered here')}
              className="btn-secondary whitespace-nowrap"
            >
              🚀 Retrain Model
            </button>
            <button
              onClick={() => alert('Backtest would be run with new settings')}
              className="btn-secondary whitespace-nowrap"
            >
              📈 Run Backtest
            </button>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="premium-card bg-black/40 border-accent-primary/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-lg">Save Settings</p>
            <p className="text-text-muted text-sm mt-1">
              Settings are saved locally in your browser
            </p>
          </div>

          <button
            onClick={saveSettings}
            className={`btn-primary transition-all duration-300 ${
              saved ? 'from-emerald-500 to-teal-400 shadow-glow-success' : ''
            }`}
          >
            {saved ? '✓ Saved!' : 'Save Settings'}
          </button>
        </div>
      </div>

      {/* System Info */}
      <div className="premium-card">
        <h2 className="text-xl font-bold mb-4 tracking-wide">System Information</h2>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between border-b border-white/5 pb-2">
            <span className="text-text-secondary font-medium uppercase tracking-wider text-xs">Version</span>
            <span className="font-bold">2.0.0 Premium</span>
          </div>
          <div className="flex justify-between border-b border-white/5 pb-2">
            <span className="text-text-secondary font-medium uppercase tracking-wider text-xs">Backend API</span>
            <span className="font-bold">http://localhost:8000</span>
          </div>
          <div className="flex justify-between border-b border-white/5 pb-2">
            <span className="text-text-secondary font-medium uppercase tracking-wider text-xs">Database</span>
            <span className="font-bold">SQLite (Local)</span>
          </div>
          <div className="flex justify-between border-b border-white/5 pb-2">
            <span className="text-text-secondary font-medium uppercase tracking-wider text-xs">ML Model</span>
            <span className="font-bold">XGBoost</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary font-medium uppercase tracking-wider text-xs">LLM Provider</span>
            <span className="font-bold bg-clip-text text-transparent bg-gradient-to-r from-accent-primary to-blue-400">Google Gemini 1.5 Flash</span>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="premium-card bg-gradient-to-br from-rose-500/10 to-red-500/5 border-rose-500/30">
        <h3 className="font-black text-rose-400 tracking-wide mb-2 flex items-center gap-2"><span>⚠️</span> Disclaimer</h3>
        <p className="text-sm text-text-muted leading-relaxed">
          This tool is for educational and research purposes only. It does NOT
          constitute financial advice. Always do your own research, consult a
          licensed financial advisor, and understand the risks involved in stock
          trading. The developers are not responsible for any financial losses.
        </p>
      </div>
    </div>
  )
}

export default Settings
