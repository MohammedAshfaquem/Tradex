# NSE Signal Tool 📈

An advanced stock trading signal generation tool for the National Stock Exchange (NSE) of India. Combines technical analysis, machine learning, F&O data, news sentiment, and LLM reasoning to generate actionable trading signals.

## Features

- **Real-time Signal Generation**: Automated analysis of NSE stocks with confidence scores
- **Multi-layer Analysis**:
  - Technical Indicators (RSI, MACD, EMA, Bollinger Bands, VWAP)
  - Candlestick Pattern Recognition
  - Volume Analysis
  - F&O Data (PCR, OI, Max Pain, FII/DII flows)
  - News Sentiment Analysis
  - ML-based Price Prediction (XGBoost)
  - LLM Reasoning (Gemini 1.5 Flash)
- **Interactive Dashboard**: React-based frontend with live WebSocket updates
- **Backtesting**: Historical performance analysis with walk-forward validation
- **Watchlist Management**: Track multiple stocks simultaneously
- **TradingView Charts**: Professional charting with lightweight-charts

## Architecture

```
Backend (Python/FastAPI)
├── Data Layer: yfinance, nsepython, RSS feeds
├── Signal Engine: Technical indicators + patterns
├── ML Model: XGBoost classifier
├── LLM Layer: Gemini API integration
├── Database: SQLite with SQLAlchemy
└── WebSocket: Real-time signal broadcasting

Frontend (React)
├── Dashboard: Signal overview + metrics
├── Chart View: TradingView-style charts
├── Watchlist: Stock portfolio management
├── Backtest: Performance analytics
└── Settings: Configuration panel
```

## Setup Instructions

### Prerequisites

- Python 3.10 or higher
- Node.js 18 or higher
- npm or yarn

### Backend Setup

1. **Clone the repository** (or navigate to the project folder):
   ```bash
   cd nse-signal-tool
   ```

2. **Install Python dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add your Gemini API key:
   ```
   GEMINI_API_KEY=your_actual_key_here
   ALERT_EMAIL_ENABLED=true
   ALERT_EMAIL_TO=you@example.com
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USERNAME=you@gmail.com
   SMTP_PASSWORD=your_app_password
   SMTP_FROM=you@gmail.com
   ALERT_MIN_CONFIDENCE=72
   ALERT_COOLDOWN_MINUTES=120
   ```

   Get a free Gemini API key from: https://aistudio.google.com/app/apikey

4. **Train the ML model** (first time only):
   ```bash
   python -m backend.ml.train
   ```

   This will:
   - Download 3 years of data for 10 NSE stocks
   - Train an XGBoost model with walk-forward validation
   - Save the model to `backend/ml/model.pkl`
   - Takes ~5-10 minutes depending on internet speed

5. **Start the backend server**:
   ```bash
   uvicorn backend.main:app --reload --port 8000
   ```

   The API will be available at: http://localhost:8000
   API docs at: http://localhost:8000/docs

### Frontend Setup

1. **Navigate to frontend folder**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

   The frontend will be available at: http://localhost:5173 (or http://localhost:3000)

### Quick Test

Once both servers are running:

1. Open http://localhost:5173 in your browser
2. You should see the Dashboard with default watchlist stocks
3. Click on any stock to view detailed chart and signal analysis
4. WebSocket connection will show "LIVE" indicator when connected

## API Endpoints

### REST API

- `GET /api/signals?symbols=RELIANCE,TCS` - Generate signals for multiple stocks
- `GET /api/signal/{symbol}` - Generate signal for single stock
- `GET /api/chart/{symbol}?timeframe=1h` - Get chart data with indicators
- `GET /api/watchlist` - Get watchlist stocks
- `POST /api/watchlist` - Add stock to watchlist
- `DELETE /api/watchlist/{symbol}` - Remove from watchlist
- `GET /api/backtest` - Get latest backtest results
- `POST /api/backtest/run` - Run new backtest
- `GET /api/news/{symbol}` - Get latest news for stock

### WebSocket

- `WS /ws/signals` - Real-time signal updates (broadcasts every 60 seconds)

## Signal Scoring System

Signals are scored out of 100 points across multiple layers:

| Layer | Max Points | Factors |
|-------|-----------|---------|
| Technical Indicators | 25 | RSI, MACD, EMA alignment, BB position, VWAP |
| Candlestick Patterns | 15 | Engulfing, Morning Star, Hammer, etc. |
| Volume Analysis | 10 | Volume ratio vs 20-day average |
| F&O Data | 10 | PCR, OI direction, FII/DII flows |
| News Sentiment | 10 | Keyword analysis from RSS feeds |
| ML Model | 15 | XGBoost probability |
| Timeframe Agreement | 15 | Multi-timeframe consensus |
| **Bonuses** | +10 | F&O expiry day, strong alignment |

### Signal Thresholds

- **BUY** (≥75 points): Strong setup, enter trade
- **WATCH** (55-74 points): Moderate setup, monitor closely
- **SKIP** (<55 points): Weak setup, avoid trade

The live engine currently uses:

- **BUY** (≥72 confidence)
- **WATCH** (55-71 confidence)
- **SKIP** (36-54 confidence)
- **SELL** (≤35 confidence)

### What If Confidence Drops After Entry?

Do not exit only because confidence drops from 58 to 50. Use a rule-based trade plan:

- Enter only on BUY signal with your minimum confidence filter.
- Exit when either stop-loss is hit, target is hit, or a fresh SELL signal appears.
- If confidence falls but price is above stop-loss and no SELL signal, continue holding.

This avoids emotional exits and keeps decisions consistent.

## Training Stocks

The ML model is trained on these 10 liquid NSE stocks:

1. RELIANCE - Reliance Industries
2. TCS - Tata Consultancy Services
3. HDFCBANK - HDFC Bank
4. INFY - Infosys
5. ICICIBANK - ICICI Bank
6. SBIN - State Bank of India
7. AXISBANK - Axis Bank
8. WIPRO - Wipro
9. LT - Larsen & Toubro
10. MARUTI - Maruti Suzuki

## Customization

### Adding More Stocks

Edit `backend/ml/train.py` and modify the `TRAINING_STOCKS` list, then retrain:

```python
TRAINING_STOCKS = [
    "RELIANCE", "TCS", "BHARTIARTL", "KOTAKBANK", ...
]
```

### Adjusting Signal Thresholds

Edit `.env` file:

```
BUY_THRESHOLD=80
WATCH_THRESHOLD=60
```

### Changing Update Frequency

Edit `.env` file:

```
WS_UPDATE_INTERVAL=30  # Update every 30 seconds
```

## Troubleshooting

### Model Training Fails

- Check internet connection (needs to download stock data)
- Ensure sufficient disk space (~500MB)
- Try running with fewer stocks first

### nsepython Errors

- NSE APIs can be rate-limited or temporarily down
- The tool gracefully defaults to neutral F&O values
- Try again after a few minutes

### WebSocket Not Connecting

- Ensure backend is running on port 8000
- Check browser console for errors
- Verify CORS settings in `backend/main.py`

### News Not Loading

- RSS feeds may be temporarily unavailable
- Check internet connection
- News is optional and won't affect other signals

## Performance Optimization

### Data Caching

- Stock data is cached for 5 minutes (intraday) or 60 minutes (daily)
- Cache is stored in SQLite database
- Clear cache by deleting `backend/nse_signals.db`

### Rate Limiting

- Gemini API: 1 second delay between calls
- yfinance: No explicit rate limit (use responsibly)
- nsepython: Avoid excessive calls (cached data preferred)

## Security Notes

- Never commit `.env` file with real API keys
- Keep `GEMINI_API_KEY` private
- Use free Gemini tier for personal use only
- For production, implement proper authentication

## Disclaimer

⚠️ **Important**: This tool is for educational and research purposes only. It does NOT constitute financial advice. Always:

- Do your own research before trading
- Consult a licensed financial advisor
- Understand the risks involved in stock trading
- Use appropriate position sizing and risk management
- Paper trade first to validate signals

The developers are not responsible for any financial losses incurred from using this tool.

## Tech Stack

**Backend**:
- FastAPI (REST API & WebSocket)
- SQLAlchemy (Database ORM)
- pandas-ta (Technical Analysis)
- XGBoost (Machine Learning)
- yfinance (Stock Data)
- nsepython (F&O Data)
- Gemini API (LLM Reasoning)

**Frontend**:
- React 18
- Vite (Build Tool)
- TailwindCSS (Styling)
- lightweight-charts (TradingView Charts)
- Recharts (Analytics Charts)
- Axios (HTTP Client)

## License

MIT License - See LICENSE file for details

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Support

For issues, questions, or feedback:

- Open an issue on GitHub
- Check existing issues first
- Provide detailed error messages and logs

## Roadmap

- [ ] Add more technical indicators (Ichimoku, Fibonacci)
- [ ] Support for multiple LLM providers (OpenAI, Claude)
- [ ] Mobile app (React Native)
- [ ] Telegram/Discord bot for signals
- [ ] Options chain visualization
- [ ] Portfolio tracking
- [ ] Paper trading mode
- [ ] Strategy backtester with custom rules

---

Built with ❤️ for NSE traders
