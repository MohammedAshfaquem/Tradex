import os
import smtplib
from datetime import datetime, timedelta
from email.message import EmailMessage
from typing import Dict, Optional


def _env_bool(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "y", "on"}


class EmailNotifier:
    """Send BUY signal alerts with de-duplication and cooldown."""

    def __init__(self):
        self.last_sent_at: Dict[str, datetime] = {}

    def _get_recipients(self):
        recipients = os.getenv("ALERT_EMAIL_TO", "").strip()
        if not recipients:
            return []
        return [email.strip() for email in recipients.split(",") if email.strip()]

    def _config(self) -> Dict[str, Optional[str]]:
        return {
            "enabled": _env_bool("ALERT_EMAIL_ENABLED", False),
            "smtp_host": os.getenv("SMTP_HOST", "smtp.gmail.com").strip(),
            "smtp_port": int(os.getenv("SMTP_PORT", "587")),
            "smtp_username": os.getenv("SMTP_USERNAME", "").strip(),
            "smtp_password": os.getenv("SMTP_PASSWORD", "").strip(),
            "smtp_from": os.getenv("SMTP_FROM", os.getenv("SMTP_USERNAME", "")).strip(),
            "min_confidence": int(os.getenv("ALERT_MIN_CONFIDENCE", "72")),
            "cooldown_minutes": int(os.getenv("ALERT_COOLDOWN_MINUTES", "120")),
        }

    def send_buy_alert(self, signal_data: Dict):
        cfg = self._config()
        if not cfg["enabled"]:
            return

        recipients = self._get_recipients()
        if not recipients:
            return

        symbol = str(signal_data.get("symbol", "")).upper()
        confidence = int(signal_data.get("confidence", 0) or 0)
        if not symbol or confidence < cfg["min_confidence"]:
            return

        now = datetime.now()
        last = self.last_sent_at.get(symbol)
        if last and (now - last) < timedelta(minutes=cfg["cooldown_minutes"]):
            return

        msg = EmailMessage()
        msg["Subject"] = f"BUY Alert: {symbol} ({confidence}%)"
        msg["From"] = cfg["smtp_from"]
        msg["To"] = ", ".join(recipients)

        entry = signal_data.get("entry_price")
        target = signal_data.get("target")
        stop = signal_data.get("stop_loss")
        risk = signal_data.get("risk")
        reason = signal_data.get("reason", "")
        ts = signal_data.get("timestamp", datetime.now().isoformat())

        body = (
            f"TradeX BUY signal detected\n\n"
            f"Symbol: {symbol}\n"
            f"Signal: BUY\n"
            f"Confidence: {confidence}%\n"
            f"Entry: {entry}\n"
            f"Target: {target}\n"
            f"Stop Loss: {stop}\n"
            f"Risk: {risk}\n"
            f"Time: {ts}\n\n"
            f"Reason: {reason}\n\n"
            f"Note: This alert is automated and not financial advice."
        )
        msg.set_content(body)

        try:
            with smtplib.SMTP(cfg["smtp_host"], cfg["smtp_port"], timeout=15) as server:
                server.starttls()
                if cfg["smtp_username"] and cfg["smtp_password"]:
                    server.login(cfg["smtp_username"], cfg["smtp_password"])
                server.send_message(msg)
            self.last_sent_at[symbol] = now
            print(f"[EMAIL] BUY alert sent for {symbol} to {len(recipients)} recipient(s)")
        except Exception as exc:
            print(f"[EMAIL] Failed to send BUY alert for {symbol}: {exc}")


email_notifier = EmailNotifier()
