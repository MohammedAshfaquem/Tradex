from fastapi import WebSocket
from typing import List, Set
import asyncio
import json
from datetime import datetime


class WebSocketManager:
    """Manage WebSocket connections and broadcast signals."""

    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.background_task = None
        self.last_broadcast_signals = {}  # {symbol: dict} to store last broadcast signal for diffing

    async def connect(self, websocket: WebSocket):
        """Accept and store new WebSocket connection."""
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"✓ WebSocket connected. Total connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        """Remove WebSocket connection."""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        print(f"✗ WebSocket disconnected. Total connections: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        """Send message to all connected clients."""
        if not self.active_connections:
            return

        # Convert to JSON string
        message_str = json.dumps(message)

        # Send to all connections
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(message_str)
            except Exception as e:
                print(f"Error sending to WebSocket: {e}")
                disconnected.append(connection)

        # Remove disconnected clients
        for conn in disconnected:
            self.disconnect(conn)

    async def send_personal(self, message: dict, websocket: WebSocket):
        """Send message to specific client."""
        try:
            message_str = json.dumps(message)
            await websocket.send_text(message_str)
        except Exception as e:
            print(f"Error sending personal message: {e}")
            self.disconnect(websocket)

    async def start_background_updates(self, interval_seconds: int = 60):
        """
        Start background task to generate and broadcast signals periodically.

        Args:
            interval_seconds: How often to generate signals (default 60s)
        """
        from db.database import get_db_session
        from db.models import Watchlist

        print(f"Starting background signal updates (every {interval_seconds}s)")

        while True:
            try:
                await asyncio.sleep(interval_seconds)

                if not self.active_connections:
                    # No clients connected, skip
                    continue

                print(f"[{datetime.now().strftime('%H:%M:%S')}] Generating signals for watchlist...")

                # Get watchlist stocks
                session = get_db_session()
                try:
                    watchlist_stocks = session.query(Watchlist).filter_by(is_active=True).all()
                    symbols = [w.symbol for w in watchlist_stocks]
                except Exception as e:
                    print(f"Error fetching watchlist: {e}")
                    continue
                finally:
                    session.close()

                if not symbols:
                    continue

                # Generate signals for watchlist stocks
                from main import generate_signal_for_symbol

                tasks = [generate_signal_for_symbol(symbol) for symbol in symbols]
                results = await asyncio.gather(*tasks, return_exceptions=True)

                changed_signals = []
                for i, signal_data in enumerate(results):
                    if signal_data and not isinstance(signal_data, Exception):
                        symbol = signal_data['symbol']
                        # Diffing logic: Broadcast if signal direction changes or confidence changes > 5%
                        prev_signal = self.last_broadcast_signals.get(symbol)
                        if not prev_signal or prev_signal['signal'] != signal_data['signal'] or abs(prev_signal['confidence'] - signal_data['confidence']) > 5:
                            changed_signals.append(signal_data)
                            self.last_broadcast_signals[symbol] = signal_data
                    elif isinstance(signal_data, Exception):
                        print(f"Error generating signal for {symbols[i]}: {signal_data}")

                # Broadcast only if there are changes
                if changed_signals:
                    await self.broadcast({
                        "type": "signals_update",
                        "timestamp": datetime.now().isoformat(),
                        "signals": changed_signals
                    })
                    print(f"✓ Broadcasted diff of {len(changed_signals)} signals to {len(self.active_connections)} clients")

            except Exception as e:
                print(f"Error in background updates: {e}")
                await asyncio.sleep(5)  # Wait before retrying


# Global WebSocket manager instance
ws_manager = WebSocketManager()
