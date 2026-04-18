import { NavLink } from 'react-router-dom'
import { useTheme } from '../hooks/useTheme'

const Sidebar = () => {
  const { theme, toggleTheme } = useTheme()
  const navItems = [
    { path: '/', label: 'Dashboard', icon: '📊' },
    { path: '/chart/RELIANCE', label: 'Charts', icon: '📈' },
    { path: '/watchlist', label: 'Watchlist', icon: '👁️' },
    { path: '/accuracy', label: 'Accuracy', icon: '🎯' },
    { path: '/backtest', label: 'Backtest', icon: '🔬' },
    { path: '/settings', label: 'Settings', icon: '⚙️' },
  ]

  return (
    <aside className="w-72 glass-panel border-r border-white/5 flex flex-col relative z-20">
      <div className="p-8 border-b border-white/5 pb-6">
        <h1 className="text-3xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-accent-primary to-blue-400">NSE Signal</h1>
        <p className="text-text-muted text-xs tracking-widest uppercase mt-2 font-semibold">AI-Powered Trading</p>
      </div>

      <nav className="flex-1 p-4 mt-4">
        <ul className="space-y-3">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-4 px-5 py-3.5 rounded-xl transition-all duration-300 font-medium ${
                    isActive
                      ? 'bg-gradient-to-r from-accent-primary/20 to-transparent text-white border-l-4 border-accent-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]'
                      : 'text-text-secondary hover:bg-white/5 hover:text-white border-l-4 border-transparent'
                  }`
                }
              >
                <span className={`text-xl transition-transform duration-300`}>{item.icon}</span>
                <span className="tracking-wide">{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-6 border-t border-white/5 dark:border-white/5 text-text-muted text-xs space-y-3">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-white/5 dark:bg-white/5 hover:bg-white/10 transition-colors duration-200 text-text-secondary"
        >
          <span className="text-sm font-medium">{theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode'}</span>
          <div className={`w-9 h-5 rounded-full relative transition-colors duration-300 ${theme === 'dark' ? 'bg-zinc-600' : 'bg-accent-primary'}`}>
            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-300 ${theme === 'dark' ? 'left-0.5' : 'left-[18px]'}`}></div>
          </div>
        </button>
        <div className="flex items-center justify-between">
          <span>v2.0 Premium</span>
          <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-glow-success animate-pulse"></div>
        </div>
        <p className="opacity-50">© 2026 Tradex Signal</p>
      </div>
    </aside>
  )
}

export default Sidebar
