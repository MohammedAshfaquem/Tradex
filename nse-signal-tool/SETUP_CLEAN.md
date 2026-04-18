# 🔧 NSE Signal Tool - Setup Guide (No Defaults)

## Step 1: Delete Old Database
```bash
cd nse-signal-tool
rm -f backend/nse_signals.db
```

## Step 2: Start Backend
```bash
uvicorn backend.main:app --reload --port 8000
```

You should see:
```
✓ Database initialized
ℹ️  No default watchlist. Add stocks via API or manually.
INFO: Uvicorn running on http://127.0.0.1:8000
INFO: Application startup complete
```

## Step 3: Go to Frontend
Open **http://localhost:3000**

You will see:
```
❌ Watchlist is empty. No stocks to analyze.
```

This is CORRECT! ✅ No defaults are hiding errors.

## Step 4: Add Stocks to Watchlist

Go to **Watchlist** page and add stocks. Example:
- RELIANCE
- TCS
- HDFCBANK
- INFY
- ICICIBANK

## Step 5: Back to Dashboard
Dashboard should now show signals with real data!

---

## 🎯 If You See Errors, They Mean:

| Error Message | Problem | Solution |
|---------------|---------|----------|
| `❌ Watchlist is empty` | No stocks added | Add stocks in Watchlist page |
| `❌ No signals generated` | Backend error | Check backend logs |
| `❌ Network Error - Backend may not be running` | Backend is down | Run `uvicorn backend.main:app --reload --port 8000` |
| `"LLM analysis unavailable"` | Missing Gemini API key | Add `GEMINI_API_KEY` to `.env` |

---

## ➕ How to Add Stocks to Watchlist

### Option A: Frontend UI (Easiest)
1. Go to **Watchlist** page
2. Type stock symbol: `RELIANCE`
3. Click "Add Stock"
4. Repeat for more stocks

### Option B: Database Query
```bash
python -c "
from backend.db.database import get_db_session
from backend.db.models import Watchlist

session = get_db_session()

stocks = ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK']
for symbol in stocks:
    if not session.query(Watchlist).filter_by(symbol=symbol).first():
        session.add(Watchlist(symbol=symbol, is_active=True))

session.commit()
print(f'Added stocks to watchlist')
session.close()
"
```

---

## ✅ Verify Watchlist

```bash
curl http://localhost:8000/api/watchlist
```

Should show:
```json
{
  "watchlist": [
    {"symbol": "RELIANCE", "added_at": "2025-03-26T...", "is_active": true},
    {"symbol": "TCS", "added_at": "2025-03-26T...", "is_active": true}
  ]
}
```

---

## 🎯 Once Watchlist Has Stocks

Refresh http://localhost:3000

You should see:
- ✅ Dashboard with real signals
- ✅ Varied confidence scores
- ✅ Different signal types (BUY, WATCH, SKIP)
- ✅ Correct risk levels (LOW, MEDIUM, HIGH)

---

## ⚠️ Common Mistakes

### ❌ Don't
```bash
# Don't edit database manually
sqlite3 backend/nse_signals.db "INSERT INTO watchlist ..."

# Don't add fake stocks
# Add stocks that exist on NSE only
```

### ✅ Do
```bash
# Use the frontend UI (simplest)
# Or use the Python script above
# Add real NSE stock symbols
```

---

## 📝 Notes

- **No hidden defaults** = You see errors immediately
- **Real data only** = No fake demo data
- **Clean slate** = Everything you see is real or an error
- **Easy debugging** = You know exactly what's broken

---

## 🚀 You're Ready!

Start with **Step 1** and work through them in order.

**Every error you see is real and actionable!**
