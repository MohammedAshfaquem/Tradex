import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './hooks/useTheme'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import ChartView from './pages/ChartView'
import Watchlist from './pages/Watchlist'
import Backtest from './pages/Backtest'
import Settings from './pages/Settings'
import Accuracy from './pages/Accuracy'

function App() {
  return (
    <ThemeProvider>
      <Router>
        <div className="flex h-screen bg-transparent">
          <Sidebar />
          <main className="flex-1 overflow-auto relative">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.1),rgba(255,255,255,0))] pointer-events-none"></div>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/chart/:symbol" element={<ChartView />} />
              <Route path="/watchlist" element={<Watchlist />} />
              <Route path="/accuracy" element={<Accuracy />} />
              <Route path="/backtest" element={<Backtest />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </main>
        </div>
      </Router>
    </ThemeProvider>
  )
}

export default App
