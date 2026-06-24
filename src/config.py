from datetime import datetime, timezone
from pathlib import Path

LIGHTER_BASE_URL = "https://mainnet.zklighter.elliot.ai"
SOURCE = "lighter"
ASSET = "btc"
SYMBOL = "BTC"
MARKET_ID = 1
TIMEFRAME = "1m"

START_DATETIME = datetime(2025, 1, 1, tzinfo=timezone.utc)
END_DATETIME = datetime(2025, 1, 31, tzinfo=timezone.utc)

PROJECT_ROOT = Path(__file__).resolve().parents[1]

RAW_DATA_DIR = PROJECT_ROOT / "data" / "raw" / SOURCE / ASSET / "m1"
VALIDATED_DATA_DIR = PROJECT_ROOT / "data" / "validated" / SOURCE / ASSET / "m1"
REJECTED_DATA_DIR = PROJECT_ROOT / "data" / "rejected" / SOURCE / ASSET / "m1"
QUALITY_REPORTS_DIR = PROJECT_ROOT / "data" / "quality_reports"

REQUEST_TIMEOUT_SECONDS = 30
MAX_CANDLES_PER_REQUEST = 500

TIMEFRAME_SECONDS = {
    "1m": 60,
    "5m": 5 * 60,
    "15m": 15 * 60,
    "30m": 30 * 60,
    "1h": 60 * 60,
    "4h": 4 * 60 * 60,
    "12h": 12 * 60 * 60,
    "1d": 24 * 60 * 60,
}
