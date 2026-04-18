# 🚀 NSE Signal Tool - Setup Instructions

## ⚡ Quick Fix for "Everything Shows MEDIUM"

This happens when the backend isn't properly configured. Follow these steps:

### Step 1: Stop Any Running Processes
```bash
# Kill backend (if running)
# Press Ctrl+C in the backend terminal

# Keep frontend running
```

### Step 2: Delete Old Database
```bash
cd nse-signal-tool
rm -f backend/nse_signals.db
```

This will clear the old 6-stock database. New database will create with **15 stocks**.

### Step 3: Get Gemini API Key
1. Go to: https://aistudio.google.com/app/apikey
2. Click "Create API Key"
3. Copy the key

### Step 4: Configure .env File
```bash
# Make sure .env exists
cat .env
```

Edit `.env` and make sure it has:
```
GEMINI_API_KEY=your_actual_key_here
```

**Don't use `your_key_here` - paste your actual key!**

### Step 5: Restart Backend
```bash
cd nse-signal-tool
uvicorn backend.main:app --reload --port 8000
```

You should see:
```
✓ Database initialized
✓ Added 15 default stocks to watchlist
✓ Model saved to backend/ml/model.pkl
INFO: Uvicorn running on http://127.0.0.1:8000
```

### Step 6: Refresh Frontend
1. Go to http://localhost:3000
2. Refresh the page (Ctrl+R or Cmd+R)
3. You should see:
   - ✅ Demo Mode banner disappears (if backend up)
   - ✅ Green "LIVE" dot appears
   - ✅ Varied signals (BUY, WATCH, SKIP with different risks)
   - ✅ 15 stocks in dashboard instead of 6

---

## 🎯 Signal Variety Explanation

Each signal should show **different risk levels**:

| Signal | Risk Level | Confidence | Meaning |
|--------|-----------|-----------|---------|
| BUY | LOW | 75%+ | Strong bullish, safe entry |
| BUY | MEDIUM | 75%+ | Bullish but watch volume |
| WATCH | MEDIUM | 55-74% | Monitor, good risk/reward |
| WATCH | HIGH | 55-74% | Monitor, higher risk |
| SKIP | HIGH | <55% | Weak signal, avoid trade |

**If everything shows MEDIUM**, it means LLM analysis isn't running (no API key or backend issue).

---

## 🔧 Verify Backend is Working

### Test 1: Check API
```bash
curl http://localhost:8000/api/signal/RELIANCE
```

Should return JSON with signal data (not HTML error).

### Test 2: Check API Docs
Visit: http://localhost:8000/docs

Should show interactive Swagger documentation.

### Test 3: Check Database
```bash
cd nse-signal-tool
python -c "
from backend.db.database import get_db_session
from backend.db.models import Watchlist
session = get_db_session()
stocks = session.query(Watchlist).all()
print(f'Watchlist has {len(stocks)} stocks:')
for s in stocks:
    print(f'  - {s.symbol}')
session.close()
"
```

Should show 15 stocks, not 6.

---

## 📊 Expected Output

### Good (Backend Running)
```
Dashboard shows:
- Green "LIVE" dot
- 15 stocks listed
- Varied signals: BUY (78%), WATCH (62%), SKIP (48%)
- Different risk levels: LOW, MEDIUM, HIGH
- FII Flow: ₹250 Cr or ₹-120 Cr (varies)
- Model Accuracy: ~58%
```

### Bad (Backend Not Running)
```
Dashboard shows:
- Orange "DEMO MODE" banner
- Red/grey "OFFLINE" dot
- All signals show MEDIUM risk
- Only 6 stocks (or less)
```

---

## 🐛 Troubleshooting

### Issue: "Backend is running but signals still show MEDIUM"

**Solution:** API key is missing or invalid.

```bash
# Check if .env file exists
cat nse-signal-tool/.env

# Check if GEMINI_API_KEY is set
grep GEMINI_API_KEY nse-signal-tool/.env
```

If GEMINI_API_KEY is missing or `your_key_here`, add your real key:

```bash
# Edit .env file
nano nse-signal-tool/.env
```

Add:
```
GEMINI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Then restart backend:
```bash
uvicorn backend.main:app --reload --port 8000
```

### Issue: "Database still shows only 6 stocks"

**Solution:** Database isn't being recreated.

```bash
# Stop backend
# Press Ctrl+C

# Delete database
rm -f nse-signal-tool/backend/nse_signals.db

# Restart backend
uvicorn backend.main:app --reload --port 8000
```

You should see:
```
✓ Initializing database at ...
✓ Added 15 default stocks to watchlist
```

### Issue: "Refresh still shows DEMO MODE"

**Solution:** Frontend isn't connecting to backend.

Check:
1. Backend running on port 8000? (`curl http://localhost:8000`)
2. Frontend on port 3000? (`http://localhost:3000`)
3. CORS allowed? (Backend should show: `"allow_origins=["http://localhost:3000"...]"`)

---

## ✅ Checklist

- [ ] Backend running on port 8000
- [ ] Frontend running on port 3000
- [ ] .env has valid GEMINI_API_KEY
- [ ] Database deleted and recreated (15 stocks)
- [ ] Model trained (model.pkl exists)
- [ ] Dashboard shows green "LIVE" dot
- [ ] Signals show varied risk levels (LOW, MEDIUM, HIGH)
- [ ] 15 stocks visible in watchlist

---

## 📞 Still Having Issues?

Try these commands to diagnose:

```bash
# Check backend running
ps aux | grep uvicorn

# Check frontend running
ps aux | grep vite

# Check database exists
ls -lh nse-signal-tool/backend/nse_signals.db

# Check model exists
ls -lh nse-signal-tool/backend/ml/model.pkl

# Check API key in env
cat nse-signal-tool/.env | grep GEMINI

# Test API
curl -s http://localhost:8000/api/signal/RELIANCE | head -20
```

---

**Once everything is set up, you'll see real signals with varied confidence and risk levels! 🚀**
