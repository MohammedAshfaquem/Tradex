import { useState, useEffect } from 'react'

const UI = {
  bg0: '#060a0f',
  bg1: '#0d1117',
  bg2: '#161b22',
  border: 'rgba(255,255,255,0.08)',
  borderSoft: 'rgba(255,255,255,0.06)',
  text1: '#e6edf3',
  text2: '#8b949e',
  text3: '#6b7280',
  blue: '#3b82f6',
  green: '#16a34a',
  amber: '#d97706',
  red: '#dc2626',
}

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

  const cardStyle = {
    background: UI.bg1,
    border: `1px solid ${UI.borderSoft}`,
    borderRadius: 12,
    padding: '18px 20px',
  }

  const labelStyle = {
    display: 'block',
    fontSize: 11,
    fontWeight: 600,
    color: UI.text2,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: 8,
  }

  const inputStyle = {
    width: '100%',
    background: UI.bg2,
    border: `1px solid ${UI.border}`,
    borderRadius: 8,
    color: UI.text1,
    padding: '10px 12px',
    fontSize: 13,
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box',
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: UI.bg0,
        color: UI.text1,
        fontFamily: '"IBM Plex Sans", "Segoe UI", sans-serif',
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap');
      `}</style>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: UI.text3, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6 }}>
            Config
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>Settings</h1>
          <p style={{ color: UI.text2, fontSize: 13, marginTop: 4 }}>Configure your trading signal parameters</p>
        </div>

        <div style={cardStyle}>
          <h2 style={{ margin: '0 0 14px', fontSize: 16, letterSpacing: '-0.01em' }}>API Configuration</h2>
          <label style={labelStyle}>Gemini API Key</label>
          <input
            type="password"
            value={settings.geminiApiKey}
            onChange={(e) => handleChange('geminiApiKey', e.target.value)}
            placeholder="Enter your Gemini API key"
            style={inputStyle}
          />
          <p style={{ marginTop: 8, fontSize: 12, color: UI.text2 }}>
            Get a free API key from{' '}
            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" style={{ color: UI.blue }}>
              aistudio.google.com
            </a>
          </p>
        </div>

        <div style={cardStyle}>
          <h2 style={{ margin: '0 0 14px', fontSize: 16, letterSpacing: '-0.01em' }}>Signal Thresholds</h2>

          <div style={{ marginBottom: 22 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <label style={labelStyle}>Buy Threshold</label>
              <span style={{ fontSize: 12, fontWeight: 700, color: UI.green }}>{settings.buyThreshold}%</span>
            </div>
            <input
              type="range"
              min="60"
              max="90"
              value={settings.buyThreshold}
              onChange={(e) => handleChange('buyThreshold', parseInt(e.target.value))}
              style={{ width: '100%', accentColor: UI.green }}
            />
            <p style={{ marginTop: 6, fontSize: 12, color: UI.text2 }}>Minimum confidence score to generate BUY signal.</p>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <label style={labelStyle}>Watch Threshold</label>
              <span style={{ fontSize: 12, fontWeight: 700, color: UI.amber }}>{settings.watchThreshold}%</span>
            </div>
            <input
              type="range"
              min="40"
              max="75"
              value={settings.watchThreshold}
              onChange={(e) => handleChange('watchThreshold', parseInt(e.target.value))}
              style={{ width: '100%', accentColor: UI.amber }}
            />
            <p style={{ marginTop: 6, fontSize: 12, color: UI.text2 }}>Minimum confidence score to generate WATCH signal.</p>
          </div>
        </div>

        <div style={cardStyle}>
          <h2 style={{ margin: '0 0 14px', fontSize: 16, letterSpacing: '-0.01em' }}>Update Settings</h2>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <label style={labelStyle}>Refresh Interval</label>
            <span style={{ fontSize: 12, fontWeight: 700 }}>{settings.refreshInterval}s</span>
          </div>
          <input
            type="range"
            min="30"
            max="300"
            step="30"
            value={settings.refreshInterval}
            onChange={(e) => handleChange('refreshInterval', parseInt(e.target.value))}
            style={{ width: '100%', accentColor: UI.blue }}
          />
          <p style={{ marginTop: 6, fontSize: 12, color: UI.text2 }}>How often to refresh signals via WebSocket.</p>
        </div>

        <div style={cardStyle}>
          <h2 style={{ margin: '0 0 14px', fontSize: 16, letterSpacing: '-0.01em' }}>Feature Toggles</h2>
          <div style={{ display: 'grid', gap: 14 }}>
            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', border: `1px solid ${UI.border}`, borderRadius: 8, background: UI.bg2 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Enable LLM Reasoning</div>
                <div style={{ fontSize: 12, color: UI.text2, marginTop: 2 }}>Use Gemini AI for signal analysis and reasoning.</div>
              </div>
              <input type="checkbox" checked={settings.enableLlm} onChange={(e) => handleChange('enableLlm', e.target.checked)} />
            </label>

            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', border: `1px solid ${UI.border}`, borderRadius: 8, background: UI.bg2 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Enable News Fetching</div>
                <div style={{ fontSize: 12, color: UI.text2, marginTop: 2 }}>Fetch and analyze news sentiment from RSS feeds.</div>
              </div>
              <input type="checkbox" checked={settings.enableNews} onChange={(e) => handleChange('enableNews', e.target.checked)} />
            </label>
          </div>
        </div>

        <div style={cardStyle}>
          <h2 style={{ margin: '0 0 14px', fontSize: 16, letterSpacing: '-0.01em' }}>ML Model Configuration</h2>
          <label style={labelStyle}>Training Stocks (comma-separated)</label>
          <textarea
            value={settings.trainingStocks}
            onChange={(e) => handleChange('trainingStocks', e.target.value)}
            rows="3"
            placeholder="RELIANCE,TCS,HDFCBANK,..."
            style={{ ...inputStyle, resize: 'vertical', minHeight: 82 }}
          />
          <p style={{ marginTop: 6, fontSize: 12, color: UI.text2 }}>Stocks used for ML model training.</p>

          <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
            <button
              onClick={() => alert('Model retraining would be triggered here')}
              style={{ background: UI.bg2, color: UI.text1, border: `1px solid ${UI.border}`, borderRadius: 8, padding: '9px 12px', fontSize: 12, fontWeight: 600 }}
            >
              Retrain Model
            </button>
            <button
              onClick={() => alert('Backtest would be run with new settings')}
              style={{ background: UI.bg2, color: UI.text1, border: `1px solid ${UI.border}`, borderRadius: 8, padding: '9px 12px', fontSize: 12, fontWeight: 600 }}
            >
              Run Backtest
            </button>
          </div>
        </div>

        <div style={{ ...cardStyle, border: `1px solid ${saved ? 'rgba(22,163,74,0.35)' : UI.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Save Settings</p>
              <p style={{ marginTop: 4, fontSize: 12, color: UI.text2 }}>Settings are saved locally in your browser.</p>
            </div>
            <button
              onClick={saveSettings}
              style={{
                background: saved ? UI.green : UI.blue,
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '10px 16px',
                fontWeight: 700,
                fontSize: 12,
              }}
            >
              {saved ? 'Saved' : 'Save Settings'}
            </button>
          </div>
        </div>

        <div style={cardStyle}>
          <h2 style={{ margin: '0 0 14px', fontSize: 16, letterSpacing: '-0.01em' }}>System Information</h2>
          <div style={{ display: 'grid', gap: 8, fontSize: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: UI.text2 }}><span>Version</span><span style={{ color: UI.text1, fontWeight: 700 }}>2.0.0 Premium</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: UI.text2 }}><span>Backend API</span><span style={{ color: UI.text1, fontWeight: 700 }}>http://localhost:8000</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: UI.text2 }}><span>Database</span><span style={{ color: UI.text1, fontWeight: 700 }}>SQLite (Local)</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: UI.text2 }}><span>ML Model</span><span style={{ color: UI.text1, fontWeight: 700 }}>XGBoost</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: UI.text2 }}><span>LLM Provider</span><span style={{ color: UI.blue, fontWeight: 700 }}>Google Gemini 1.5 Flash</span></div>
          </div>
        </div>

        <div style={{ ...cardStyle, border: '1px solid rgba(220,38,38,0.25)', background: 'rgba(220,38,38,0.06)' }}>
          <h3 style={{ margin: '0 0 8px', color: UI.red, fontSize: 15 }}>Disclaimer</h3>
          <p style={{ margin: 0, fontSize: 12, color: UI.text2, lineHeight: 1.7 }}>
            This tool is for educational and research purposes only. It does not constitute financial advice.
            Always do your own research, consult a licensed financial advisor, and understand the risks involved in stock trading.
          </p>
        </div>
      </div>
    </div>
  )
}

export default Settings
