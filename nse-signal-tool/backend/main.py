from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import asyncio
import json
import os
import sys
import numpy as np


class NumpyEncoder(json.JSONEncoder):
    """Custom JSON encoder for numpy types."""
    def default(self, obj):
        if isinstance(obj, np.bool_):
            return bool(obj)
        if isinstance(obj, np.integer):
            return int(obj)
        if isinstance(obj, np.floating):
            return float(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        return super().default(obj)

# Patch pandas_ta append error with Pandas >= 2.0
import pandas as pd
if not hasattr(pd.Series, 'append'):
    pd.Series.append = lambda self, other, ignore_index=False, verify_integrity=False: pd.concat([self, other], ignore_index=ignore_index, verify_integrity=verify_integrity)

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from db.database import get_db, init_db, get_db_session
from db.models import Signal, Watchlist, BacktestResult, StockCache
from data.fetcher import get_stock_data, get_latest_price
from data.fno_data import get_fno_data, get_fii_dii_data
from data.news_scraper import get_stock_news, analyze_news_sentiment
from signals.indicators import calculate_indicators
from signals.patterns import detect_patterns
from signals.aggregator import calculate_confidence, calculate_volume_metrics
from ml.predict import predict_signal
from ml.backtest import backtest_model
from ml.train import train_model
from llm.gemini_reasoner import analyze_signal
from websocket_manager import ws_manager
from signals.trend_filter import get_market_trend
from signals.signal_cooldown import apply_cooldown
from notifications.email_alerts import email_notifier

# Initialize database
init_db()

# Check if model exists, train if not
model_path = os.path.join(os.path.dirname(__file__), 'ml', 'model.pkl')
if not os.path.exists(model_path):
    print("⚠ ML model not found. Training model...")
    try:
        train_model()
    except Exception as e:
        print(f"❌ Error training model: {e}")
        print("   You can train manually later with: python -m backend.ml.train")

# Create FastAPI app
app = FastAPI(
    title="NSE Signal Tool API",
    description="Real-time stock signal generation for NSE stocks",
    version="1.0.0"
)

# CORS middleware
allowed_origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://tradex-bay.vercel.app",
]

extra_origins = os.getenv("CORS_ORIGINS", "")
if extra_origins:
    allowed_origins.extend([
        origin.strip() for origin in extra_origins.split(",") if origin.strip()
    ])

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _generate_signal_sync(symbol: str, timeframe: str = "1d") -> dict:
    """
    Synchronous core logic for generating a signal.
    """
    try:
        # 1. Fetch stock data
        df = get_stock_data(symbol, timeframe=timeframe, period="6mo")

        if df.empty:
            return None

        # 2. Calculate technical indicators
        indicators = calculate_indicators(df)

        # 3. Detect candlestick patterns
        patterns = detect_patterns(df)

        # 4. Calculate volume metrics
        volume_data = calculate_volume_metrics(df)

        # 5. Fetch F&O data
        fno_data = get_fno_data(symbol)

        # 6. Fetch FII/DII data
        fii_dii = get_fii_dii_data()
        fno_data.update(fii_dii)

        # 7. Fetch news and analyze sentiment
        news = get_stock_news(symbol)
        news_headlines = [item['headline'] for item in news]
        news_score = analyze_news_sentiment(news_headlines)

        # 8. ML model prediction
        ml_prob = predict_signal(df)

        # 9. LLM analysis (if enabled)
        llm_analysis = analyze_signal(
            symbol=symbol,
            price=volume_data.get('current_price', 0),
            indicators=indicators,
            fno_data=fno_data,
            news_headlines=news,
            ml_prob=ml_prob
        )

        # Multi-timeframe agreement analysis
        timeframe_agreement = 0
        try:
            df_1h = get_stock_data(symbol, timeframe="1h", period="60d")
            df_15m = get_stock_data(symbol, timeframe="15m", period="7d")
            tf_score = 0
            if not df_1h.empty and len(df_1h) >= 50:
                ind_1h = calculate_indicators(df_1h)
                ts_1h = ind_1h.get('total_score', 0)
                if ts_1h >= 15: tf_score += 9
                elif ts_1h >= 10: tf_score += 6
                elif ts_1h >= 5: tf_score += 3
                elif ts_1h <= -15: tf_score -= 9
                elif ts_1h <= -10: tf_score -= 6
                elif ts_1h <= -5: tf_score -= 3
            if not df_15m.empty and len(df_15m) >= 50:
                ind_15m = calculate_indicators(df_15m)
                ts_15m = ind_15m.get('total_score', 0)
                if ts_15m >= 15: tf_score += 6
                elif ts_15m >= 10: tf_score += 4
                elif ts_15m >= 5: tf_score += 2
                elif ts_15m <= -15: tf_score -= 6
                elif ts_15m <= -10: tf_score -= 4
                elif ts_15m <= -5: tf_score -= 2
            timeframe_agreement = tf_score
        except Exception as e:
            print(f"Error fetching multi-timeframe for {symbol}: {e}")

        # 10. Calculate final confidence
        # Use the better of: LLM news_score (contextual) or keyword sentiment (always available)
        # If LLM returned a non-zero news_score, use it; otherwise use keyword analysis
        llm_news = llm_analysis.get('news_score', 0)
        final_news_score = llm_news if llm_news != 0 else news_score

        confidence, signal, breakdown = calculate_confidence(
            symbol=symbol,
            indicators=indicators,
            patterns=patterns,
            volume_data=volume_data,
            fno_data=fno_data,
            news_score=final_news_score,
            ml_probability=ml_prob,
            timeframe_agreement=timeframe_agreement
        )

        # 11. Market trend filter
        market_trend = get_market_trend()
        breakdown["market_trend"] = market_trend
        if market_trend == "bullish" and signal == "SELL":
            confidence = max(0, confidence - 15)  # Penalize counter-trend
            if confidence <= 35:
                signal = "SKIP"
        elif market_trend == "bearish" and signal == "BUY":
            confidence = max(0, confidence - 15)
            if confidence < 72:
                signal = "WATCH"

        # 12. Apply cooldown
        if not apply_cooldown(symbol, signal):
            print(f"⏳ Signal for {symbol} ({signal}) is in cooldown.")
            return None

        # 13. Store signal in database
        session = get_db_session()
        try:
            db_signal = Signal(
                symbol=symbol,
                timestamp=datetime.now(),
                signal=signal,
                confidence=confidence,
                entry_price=breakdown.get('entry_price'),
                target=breakdown.get('target'),
                stoploss=breakdown.get('stop_loss'),
                reason=llm_analysis.get('reason', 'Technical setup'),
                breakdown_json=json.dumps(breakdown)
            )
            session.add(db_signal)
            session.commit()
        finally:
            session.close()

        def _sanitize(obj):
            """Recursively replace NaN/Inf floats with None so JSON serialization never fails."""
            import math
            if isinstance(obj, dict):
                return {k: _sanitize(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [_sanitize(v) for v in obj]
            elif isinstance(obj, float) and (math.isnan(obj) or math.isinf(obj)):
                return None
            return obj

        # Compute risk from technical data (don't rely solely on LLM)
        def _compute_risk(indicators, volume_data, confidence):
            """Determine risk level from volatility, RSI, and confidence."""
            rsi = indicators.get('rsi_value', 50)
            atr = volume_data.get('atr', 0)
            price = volume_data.get('current_price', 1)
            atr_pct = (atr / price * 100) if price > 0 else 2

            risk_score = 0
            # High ATR % = high risk
            if atr_pct > 3:
                risk_score += 2
            elif atr_pct > 2:
                risk_score += 1

            # Extreme RSI = higher risk
            if rsi > 75 or rsi < 25:
                risk_score += 2
            elif rsi > 65 or rsi < 35:
                risk_score += 1

            # Low confidence = higher risk
            if confidence < 45:
                risk_score += 1

            if risk_score >= 3:
                return "HIGH"
            elif risk_score >= 1:
                return "MEDIUM"
            return "LOW"

        # Use LLM risk if available, otherwise compute from technicals
        llm_risk = llm_analysis.get('risk', '')
        if llm_risk and llm_risk != 'MEDIUM':
            computed_risk = llm_risk
        else:
            computed_risk = _compute_risk(indicators, volume_data, confidence)

        # Build reason — prefer LLM, fallback to technical summary
        llm_reason = llm_analysis.get('reason', '')
        if not llm_reason or 'unavailable' in llm_reason.lower() or 'disabled' in llm_reason.lower():
            # Build a short technical reason from indicators
            rsi_val = indicators.get('rsi_value', 50)
            macd_s = indicators.get('macd_score', 0)
            ema_s = indicators.get('ema_score', 0)
            parts = []
            if rsi_val > 65:
                parts.append(f"RSI overbought ({rsi_val:.0f})")
            elif rsi_val < 35:
                parts.append(f"RSI oversold ({rsi_val:.0f})")
            else:
                parts.append(f"RSI neutral ({rsi_val:.0f})")
            if ema_s >= 5:
                parts.append("EMA bullish")
            elif ema_s <= -5:
                parts.append("EMA bearish")
            if macd_s > 0:
                parts.append("MACD positive")
            elif macd_s < 0:
                parts.append("MACD negative")
            computed_reason = ", ".join(parts[:3])
        else:
            computed_reason = llm_reason

        result = {
            "symbol": symbol,
            "signal": signal,
            "confidence": confidence,
            "entry_price": breakdown.get('entry_price'),
            "target": breakdown.get('target'),
            "stop_loss": breakdown.get('stop_loss'),
            "risk": computed_risk,
            "reason": computed_reason,
            "timestamp": datetime.now().isoformat(),
            "breakdown": breakdown,
            "indicators": indicators,
            "patterns": patterns.get('patterns', []),
            "fno": fno_data,
            "news": news[:3],
            "ml_probability": ml_prob
        }
        return _sanitize(result)

    except Exception as e:
        print(f"Error generating signal for {symbol}: {e}")
        return None

async def generate_signal_for_symbol(symbol: str, timeframe: str = "1d") -> dict:
    """
    Async wrapper to run signal generation in a threadpool to prevent blocking the event loop.
    """
    import asyncio
    return await asyncio.to_thread(_generate_signal_sync, symbol, timeframe)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "NSE Signal Tool API",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/api/signals")
async def get_signals(symbols: str):
    """
    Generate signals for multiple symbols.

    Args:
        symbols: Comma-separated list of symbols (e.g., "RELIANCE,TCS,HDFCBANK")

    Returns:
        List of signal data
    """
    symbol_list = [s.strip().upper() for s in symbols.split(",")]

    tasks = [generate_signal_for_symbol(symbol) for symbol in symbol_list]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    signals = []
    for count, result in enumerate(results):
        if result and not isinstance(result, Exception):
            signals.append(result)
        elif isinstance(result, Exception):
            print(f"Error fetching signal for {symbol_list[count]}: {result}")

    return {"signals": signals}


@app.get("/api/signals/stream")
async def stream_signals(request: Request, symbols: str):
    """
    Stream signals one-by-one via Server-Sent Events (SSE).
    Frontend receives each signal as soon as it's ready instead of waiting for all.
    """
    symbol_list = [s.strip().upper() for s in symbols.split(",")]

    async def event_generator():
        # Send total count first so frontend can show correct skeleton count
        total_event = json.dumps({"type": "total", "count": len(symbol_list)}, cls=NumpyEncoder)
        yield f"data: {total_event}\n\n"

        for idx, symbol in enumerate(symbol_list):
            if await request.is_disconnected():
                break
            try:
                result = await generate_signal_for_symbol(symbol)
                if result:
                    payload = json.dumps(
                        {"type": "signal", "index": idx, "data": result},
                        cls=NumpyEncoder
                    )
                else:
                    payload = json.dumps(
                        {"type": "error", "index": idx, "symbol": symbol},
                        cls=NumpyEncoder
                    )
            except Exception as e:
                print(f"[STREAM] Error for {symbol}: {e}")
                payload = json.dumps(
                    {"type": "error", "index": idx, "symbol": symbol},
                    cls=NumpyEncoder
                )
            yield f"data: {payload}\n\n"

        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        }
    )


@app.get("/api/signal/{symbol}")
async def get_single_signal(symbol: str):
    """
    Generate signal for a single symbol.

    Args:
        symbol: Stock symbol (e.g., "RELIANCE")

    Returns:
        Signal data
    """
    signal_data = await generate_signal_for_symbol(symbol.upper())

    if not signal_data:
        raise HTTPException(status_code=404, detail=f"Could not generate signal for {symbol}")

    return signal_data


@app.get("/api/chart/{symbol}")
async def get_chart_data(symbol: str, timeframe: str = "1h"):
    """
    Get OHLCV data with indicators for charting.

    Args:
        symbol: Stock symbol
        timeframe: Timeframe (15m, 1h, 4h, 1d)

    Returns:
        Chart data with OHLCV and indicators
    """
    try:
        # Fetch data
        df = get_stock_data(symbol.upper(), timeframe=timeframe, period="60d")

        if df.empty:
            raise HTTPException(status_code=404, detail=f"No data found for {symbol}")

        # Calculate indicators
        indicators = calculate_indicators(df)

        # Convert dataframe to records
        df_dict = df.to_dict(orient='records')

        return {
            "symbol": symbol.upper(),
            "timeframe": timeframe,
            "data": df_dict,
            "indicators": indicators
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/watchlist")
async def get_watchlist(db: Session = Depends(get_db)):
    """Get all watchlist stocks."""
    watchlist = db.query(Watchlist).filter_by(is_active=True).all()
    return {
        "watchlist": [
            {
                "symbol": w.symbol,
                "added_at": w.added_at.isoformat(),
                "is_active": w.is_active
            }
            for w in watchlist
        ]
    }


@app.post("/api/watchlist")
async def add_to_watchlist(data: dict, db: Session = Depends(get_db)):
    """
    Add stock to watchlist.

    Body: {"symbol": "RELIANCE"}
    """
    symbol = data.get("symbol", "").upper()

    if not symbol:
        raise HTTPException(status_code=400, detail="Symbol is required")

    # Check if already in watchlist
    existing = db.query(Watchlist).filter_by(symbol=symbol).first()
    if existing:
        if not existing.is_active:
            existing.is_active = True
            db.commit()
            return {"message": f"Reactivated {symbol} in watchlist"}
        return {"message": f"{symbol} already in watchlist"}

    # Add to watchlist
    watchlist_item = Watchlist(symbol=symbol, is_active=True)
    db.add(watchlist_item)
    db.commit()

    return {"message": f"Added {symbol} to watchlist"}


@app.delete("/api/watchlist/{symbol}")
async def remove_from_watchlist(symbol: str, db: Session = Depends(get_db)):
    """Remove stock from watchlist."""
    watchlist_item = db.query(Watchlist).filter_by(symbol=symbol.upper()).first()

    if not watchlist_item:
        raise HTTPException(status_code=404, detail=f"{symbol} not in watchlist")

    db.delete(watchlist_item)
    db.commit()

    return {"message": f"Removed {symbol} from watchlist"}


@app.get("/api/backtest")
async def get_backtest_results(db: Session = Depends(get_db)):
    """Get latest backtest results."""
    latest = db.query(BacktestResult).order_by(BacktestResult.run_date.desc()).first()

    if not latest:
        return {
            "message": "No backtest results found. Run a backtest first.",
            "results": None
        }

    results_dict = {
        "run_date": latest.run_date.isoformat(),
        "accuracy": latest.accuracy,
        "win_rate": latest.win_rate,
        "total_trades": latest.total_trades,
        "avg_profit": latest.avg_profit,
        "avg_loss": latest.avg_loss,
        "rr_ratio": latest.rr_ratio,
        "details": json.loads(latest.results_json) if latest.results_json else {}
    }

    return {"results": results_dict}


@app.post("/api/backtest/run")
async def run_backtest(background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Run backtest in background."""

    def run_backtest_task():
        try:
            print("Starting backtest...")
            results = backtest_model()

            if results:
                # Save to database
                session = get_db_session()
                try:
                    backtest_result = BacktestResult(
                        run_date=datetime.now(),
                        accuracy=results.get('ml_accuracy', results.get('overall_win_rate')),
                        win_rate=results.get('overall_win_rate'),
                        total_trades=results.get('total_trades'),
                        avg_profit=results.get('avg_profit'),
                        avg_loss=results.get('avg_loss'),
                        rr_ratio=results.get('rr_ratio'),
                        results_json=json.dumps(results, cls=NumpyEncoder)
                    )
                    session.add(backtest_result)
                    session.commit()
                    print("✓ Backtest results saved")
                finally:
                    session.close()

        except Exception as e:
            print(f"Error running backtest: {e}")

    background_tasks.add_task(run_backtest_task)

    return {"message": "Backtest started in background"}


@app.get("/api/accuracy")
async def get_accuracy_stats():
    """
    Compute real-time signal accuracy stats from historical signals in the DB.
    Evaluates past BUY/SELL signals against actual price movements 5 days later.
    """
    import asyncio
    from data.fetcher import get_stock_data

    session = get_db_session()
    try:
        # Get all non-SKIP, non-WATCH signals from DB
        signals_from_db = session.query(Signal).filter(
            Signal.signal.in_(["BUY", "SELL"]),
            Signal.entry_price.isnot(None),
            Signal.target.isnot(None),
            Signal.stoploss.isnot(None)
        ).order_by(Signal.timestamp.desc()).limit(200).all()
    finally:
        session.close()

    if not signals_from_db:
        return {
            "overall_accuracy": 0,
            "total_signals": 0,
            "wins": 0,
            "losses": 0,
            "per_symbol": {},
            "by_confidence_tier": {},
            "top_signals": [],
            "message": "No historical signals yet. Generate signals to build history."
        }

    wins = 0
    losses = 0
    per_symbol = {}
    by_confidence_tier = {"high": {"wins": 0, "losses": 0}, "medium": {"wins": 0, "losses": 0}, "low": {"wins": 0, "losses": 0}}
    analyzed_signals = []

    def evaluate_signal(sig):
        """Check if entry_price moved toward target or stop_loss later."""
        try:
            # Fetch current price data
            df = get_stock_data(sig.symbol, timeframe="1d", period="1mo")
            if df.empty or len(df) < 2:
                return None

            entry = float(sig.entry_price)
            target = float(sig.target)
            stop = float(sig.stoploss)
            signal_type = sig.signal

            # Get price data after signal timestamp
            sig_time = sig.timestamp
            df['datetime'] = pd.to_datetime(df['datetime'])
            future_df = df[df['datetime'] > sig_time].head(5) if 'datetime' in df.columns else df.tail(5)

            if future_df.empty:
                future_df = df.tail(3)

            highs = future_df['high'].tolist()
            lows = future_df['low'].tolist()

            reached_target = False
            reached_stop = False

            for h, l in zip(highs, lows):
                if signal_type == "BUY":
                    if h >= target:
                        reached_target = True
                        break
                    if l <= stop:
                        reached_stop = True
                        break
                elif signal_type == "SELL":
                    if l <= target:
                        reached_target = True
                        break
                    if h >= stop:
                        reached_stop = True
                        break

            if not reached_target and not reached_stop:
                # Use current close vs entry
                current_close = float(df['close'].iloc[-1])
                if signal_type == "BUY":
                    reached_target = current_close >= entry * 1.005
                    reached_stop = current_close <= entry * 0.995
                else:
                    reached_target = current_close <= entry * 0.995
                    reached_stop = current_close >= entry * 1.005

            outcome = "win" if reached_target else ("loss" if reached_stop else "open")
            rr = round(abs(target - entry) / abs(stop - entry), 2) if abs(stop - entry) > 0 else 1.0

            return {
                "id": sig.id,
                "symbol": sig.symbol,
                "signal": sig.signal,
                "confidence": sig.confidence,
                "entry_price": entry,
                "target": target,
                "stop_loss": stop,
                "outcome": outcome,
                "rr_ratio": rr,
                "timestamp": sig.timestamp.isoformat() if sig.timestamp else None,
                "reason": sig.reason or "",
                "breakdown": json.loads(sig.breakdown_json) if sig.breakdown_json else {}
            }
        except Exception as e:
            return None

    # Evaluate up to 60 signals (avoid too many API calls)
    for sig in signals_from_db[:60]:
        result = evaluate_signal(sig)
        if result:
            analyzed_signals.append(result)
            sym = result["symbol"]
            outcome = result["outcome"]
            conf = result["confidence"] or 0

            if outcome == "win":
                wins += 1
            elif outcome == "loss":
                losses += 1

            # Per symbol tracking
            if sym not in per_symbol:
                per_symbol[sym] = {"wins": 0, "losses": 0, "open": 0, "total": 0}
            per_symbol[sym]["total"] += 1
            per_symbol[sym][outcome] = per_symbol[sym].get(outcome, 0) + 1

            # Confidence tier
            if conf >= 80:
                tier = "high"
            elif conf >= 70:
                tier = "medium"
            else:
                tier = "low"
            by_confidence_tier[tier][outcome] = by_confidence_tier[tier].get(outcome, 0) + 1

    total_decided = wins + losses
    overall_accuracy = round((wins / total_decided) * 100, 1) if total_decided > 0 else 0

    # Compute per-symbol accuracy
    for sym in per_symbol:
        sym_wins = per_symbol[sym]["wins"]
        sym_losses = per_symbol[sym]["losses"]
        sym_total = sym_wins + sym_losses
        per_symbol[sym]["accuracy"] = round((sym_wins / sym_total) * 100, 1) if sym_total > 0 else 0

    # Compute tier accuracy
    for tier in by_confidence_tier:
        tier_wins = by_confidence_tier[tier].get("wins", 0)
        tier_losses = by_confidence_tier[tier].get("losses", 0)
        tier_total = tier_wins + tier_losses
        by_confidence_tier[tier]["accuracy"] = round((tier_wins / tier_total) * 100, 1) if tier_total > 0 else 0

    # Sort top signals by win, then confidence
    top_signals = sorted(
        [s for s in analyzed_signals if s["outcome"] == "win"],
        key=lambda x: x["confidence"],
        reverse=True
    )[:10]

    return {
        "overall_accuracy": overall_accuracy,
        "total_signals": len(analyzed_signals),
        "wins": wins,
        "losses": losses,
        "open": len(analyzed_signals) - total_decided,
        "per_symbol": per_symbol,
        "by_confidence_tier": by_confidence_tier,
        "top_signals": top_signals,
        "all_signals": analyzed_signals[:50]
    }


@app.get("/api/news/{symbol}")
async def get_news(symbol: str):
    """Get latest news for a stock."""
    news = get_stock_news(symbol.upper())

    return {
        "symbol": symbol.upper(),
        "news": news
    }


@app.post("/api/alerts/test-email")
async def test_email_alert():
    """Send a one-time SMTP test email using current env configuration."""
    success, message = email_notifier.send_test_email()
    if not success:
        raise HTTPException(status_code=400, detail=message)
    return {"status": "ok", "message": message}



@app.websocket("/ws/signals")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time signal updates."""
    await ws_manager.connect(websocket)

    try:
        # Send initial message
        await ws_manager.send_personal(
            {"type": "connected", "message": "Connected to signal stream"},
            websocket
        )

        # Keep connection alive and listen for messages
        while True:
            data = await websocket.receive_text()
            # Echo back or handle commands if needed
            await ws_manager.send_personal(
                {"type": "echo", "message": data},
                websocket
            )

    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)


@app.on_event("startup")
async def startup_event():
    """Start background tasks on server startup."""
    import asyncio
    update_interval = int(os.getenv("WS_UPDATE_INTERVAL", "60"))

    # Start WebSocket background updates
    asyncio.create_task(ws_manager.start_background_updates(interval_seconds=update_interval))
    print(f"✓ Started WebSocket background updates (every {update_interval}s)")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
