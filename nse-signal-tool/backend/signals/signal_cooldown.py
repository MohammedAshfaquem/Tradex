import time

# {symbol: {signal_type: timestamp}}
_cooldowns = {}
COOLDOWN_PERIOD = 3600  # 1 hour cooldown for same signal

def apply_cooldown(symbol: str, signal: str) -> bool:
    """
    Check if a signal is in cooldown.
    Updates the cooldown timestamp if the signal is accepted.
    Returns True if signal is ALLOWED (not in cooldown or ignored), False if BLOCKED.
    """
    if signal in ["SKIP", "WATCH"]:
        return True  # Don't cooldown non-actionable signals
        
    current_time = time.time()
    
    if symbol not in _cooldowns:
        _cooldowns[symbol] = {}
        
    last_time = _cooldowns[symbol].get(signal, 0)
    
    if current_time - last_time < COOLDOWN_PERIOD:
        return False  # Blocked by cooldown
        
    # Accept the signal and update cooldown
    _cooldowns[symbol][signal] = current_time
    return True
