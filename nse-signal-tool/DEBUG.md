# 🔍 NSE Signal Tool - Debugging Guide

## If Frontend Shows "Loading" Forever

This means the API request is NOT completing. Follow these steps:

---

## Step 1: Check Backend Terminal

Look at the backend terminal where you ran:
```bash
uvicorn backend.main:app --reload --port 8000
```

**Do you see:**
- ✅ `INFO: Uvicorn running on http://127.0.0.1:8000`
- ✅ No error messages?

If not, **the backend is not running or crashed**.

---

## Step 2: Check Browser Console

1. Open **http://localhost:3000**
2. Press **F12** (Open Developer Tools)
3. Click **Console** tab
4. Look for red error messages

**Common errors:**
```
GET http://localhost:8000/api/watchlist - Failed to fetch
```
= Backend not running

```
Cannot read property 'watchlist' of undefined
```
= API returned invalid JSON

```
CORS error
```
= Backend CORS not configured correctly

---

## Step 3: Test Backend API Directly

Open a new terminal and run:

```bash
# Test 1: Is backend running?
curl http://localhost:8000

# Should return:
# {"message":"NSE Signal Tool API","version":"1.0.0","status":"running"}
```

If you get error:
```
curl: (7) Failed to connect to localhost port 8000
```

**Backend is NOT running!** Start it:
```bash
cd nse-signal-tool
uvicorn backend.main:app --reload --port 8000
```

---

## Step 4: Test Watchlist Endpoint

```bash
curl http://localhost:8000/api/watchlist
```

Should return:
```json
{"watchlist": []}
```

If you get error, note the exact error message and show it to me.

---

## Step 5: Add Stocks and Test

Go to frontend **Watchlist** page and add one stock: **RELIANCE**

Then test API again:
```bash
curl http://localhost:8000/api/watchlist
```

Should now return:
```json
{"watchlist": [{"symbol": "RELIANCE", "added_at": "...", "is_active": true}]}
```

---

## Step 6: Test Signal Generation

```bash
curl http://localhost:8000/api/signal/RELIANCE
```

This will show:
- ✅ If signal generation works
- ❌ If there's an error

**Important:** This takes 2-3 seconds because it fetches fresh market data!

Watch backend logs - you should see:
```
📥 Fetching fresh data for RELIANCE.NS (1d, 6mo)
✅ Fresh data fetched: 750 candles
... (more processing)
✅ Signal generated
```

---

## Step 7: If API Works But Frontend Still Shows "Loading"

**Problem:** Frontend is stuck waiting for something

**Solution:** Refresh frontend with cache cleared

1. Open **http://localhost:3000**
2. Press **Ctrl+Shift+R** (Hard refresh - clears cache)
3. Wait 10 seconds
4. Check browser console (F12 → Console tab)
5. Screenshot the console

---

## Common Issues & Fixes

| Symptom | Cause | Fix |
|---------|-------|-----|
| Loading forever | Backend not running | `uvicorn backend.main:app --reload --port 8000` |
| "Network Error" | Watchlist empty | Add stocks in Watchlist page |
| CORS error | Frontend/Backend mismatch | Restart both |
| API returns 500 | Backend error | Check backend terminal logs |
| "Watchlist is empty" | No stocks added | Go to Watchlist page, add RELIANCE |

---

## Tell Me:

1. **Is backend running?** (show terminal output)
2. **What's in browser console?** (F12 → Console → copy + paste errors)
3. **What does this return?**
   ```bash
   curl http://localhost:8000/api/watchlist
   ```
4. **What does this return?** (after adding RELIANCE)
   ```bash
   curl http://localhost:8000/api/signal/RELIANCE
   ```

Once you answer these, I can help you fix it! 🔧
