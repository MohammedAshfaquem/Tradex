# NSE Signal Tool - Quick Start Guide

## 🚀 Quick Setup (Under 10 minutes)

### Step 1: Install Python Dependencies
```bash
cd nse-signal-tool
pip install -r requirements.txt
```

### Step 2: Configure Environment
```bash
cp .env.example .env
```

Edit `.env` and add your Gemini API key:
```
GEMINI_API_KEY=your_key_here
```

**Get free API key:** https://aistudio.google.com/app/apikey

### Step 3: Train ML Model (First time only - ~5 minutes)
```bash
python -m backend.ml.train
```

### Step 4: Start Backend Server
```bash
uvicorn backend.main:app --reload --port 8000
```

Backend will be available at: http://localhost:8000

### Step 5: Start Frontend (New Terminal)
```bash
cd frontend
npm install
npm run dev
```

Frontend will be available at: http://localhost:3000

### Step 6: Open Browser
Navigate to **http://localhost:3000**

You should see:
- ✅ Dashboard with live signals
- ✅ WebSocket "LIVE" indicator (green dot)
- ✅ Default watchlist: RELIANCE, TCS, HDFCBANK, etc.

---

## 📊 Test Your Setup

### Test 1: Check Backend API
Visit: http://localhost:8000/docs

You should see the FastAPI interactive documentation.

### Test 2: Generate a Signal
```bash
curl http://localhost:8000/api/signal/RELIANCE
```

Should return JSON with signal data.

### Test 3: Check WebSocket
In the Dashboard, look for the green "LIVE" dot next to the clock. If it's green, WebSocket is connected!

---

## 🎯 Usage Examples

### Add Stock to Watchlist
1. Go to **Watchlist** page
2. Type stock symbol (e.g., "BHARTIARTL")
3. Click "Add Stock"

### View Detailed Chart
1. Click on any stock row in Dashboard
2. Or go to **Charts** and enter symbol
3. Toggle timeframes: 15m, 1H, 4H, 1D

### Run Backtest
1. Go to **Backtest** page
2. Click "Run Backtest"
3. Wait ~2-3 minutes for results

### Adjust Settings
1. Go to **Settings** page
2. Adjust BUY/WATCH thresholds
3. Configure API key
4. Enable/disable features
5. Click "Save Settings"

---

## 🔧 Troubleshooting

### Issue: Model training fails
**Solution:** Ensure you have internet connection. Training downloads 3 years of stock data.

### Issue: nsepython errors
**Solution:** NSE APIs can be rate-limited. The tool defaults to neutral F&O values if API fails.

### Issue: WebSocket not connecting
**Solution:**
- Ensure backend is running on port 8000
- Check browser console for errors
- Try refreshing the page

### Issue: News not loading
**Solution:** RSS feeds may be temporarily down. News is optional and won't affect other signals.

### Issue: Gemini API errors
**Solution:**
- Verify API key in `.env` file
- Check API key is valid at aistudio.google.com
- Free tier has rate limits (60 requests/minute)

---

## 📈 Understanding Signals

### Signal Types
- **BUY (≥75%)**: Strong bullish setup, consider entry
- **WATCH (55-74%)**: Moderate setup, monitor closely
- **SKIP (<55%)**: Weak setup, avoid

### Confidence Breakdown
Each signal shows contribution from:
- **Technical (25 pts)**: RSI, MACD, EMAs, BB, VWAP
- **Patterns (15 pts)**: Candlestick patterns
- **Volume (10 pts)**: Volume vs average
- **F&O (10 pts)**: PCR, OI, FII/DII flows
- **News (10 pts)**: Sentiment analysis
- **ML Model (15 pts)**: XGBoost prediction
- **Timeframe (15 pts)**: Multi-TF agreement

---

## ⚡ Performance Tips

### Speed Up Signal Generation
- Reduce watchlist size (6-10 stocks optimal)
- Increase WebSocket interval to 120s in Settings
- Use daily timeframe for faster chart loading

### Improve Accuracy
- Run backtest regularly to validate model
- Retrain model with more/different stocks
- Adjust thresholds based on your risk appetite

### Save API Costs (Gemini)
- Disable LLM reasoning in Settings if not needed
- Free tier is generous (1500 requests/day)

---

## 🎓 Learning Resources

### Technical Analysis
- RSI: https://www.investopedia.com/terms/r/rsi.asp
- MACD: https://www.investopedia.com/terms/m/macd.asp
- Candlestick Patterns: https://www.investopedia.com/trading/candlestick-charting-what-is-it/

### F&O Concepts
- PCR: https://www.investopedia.com/terms/p/putcallratio.asp
- Open Interest: https://www.investopedia.com/terms/o/openinterest.asp

### Machine Learning
- XGBoost: https://xgboost.readthedocs.io/

---

## 🛡️ Risk Management

**Always follow these principles:**

1. **Start Small**: Paper trade first, use small positions
2. **Use Stop Loss**: Every trade should have a stop loss
3. **Position Sizing**: Never risk more than 1-2% per trade
4. **Diversify**: Don't put all capital in one stock
5. **Review**: Regularly backtest and adjust strategy

---

## 📞 Support

- **Issues**: Open an issue on GitHub
- **Questions**: Check README.md for detailed docs
- **Updates**: Star the repo for updates

---

## ✅ Next Steps

1. ✅ Setup complete
2. 📊 Add your favorite stocks to watchlist
3. 🧪 Run backtest to see historical performance
4. 🎯 Paper trade signals for 1-2 weeks
5. 📈 Gradually go live with small positions
6. 🔄 Refine strategy based on results

**Happy Trading! 🚀📈**

---

*Disclaimer: This tool is for educational purposes. Not financial advice. Trade at your own risk.*
