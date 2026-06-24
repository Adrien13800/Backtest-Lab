from __future__ import annotations

import json
import math
from datetime import datetime, timezone
from typing import Any, Iterable

import pandas as pd
import requests

from config import (
    ASSET,
    END_DATETIME,
    LIGHTER_BASE_URL,
    MARKET_ID,
    MAX_CANDLES_PER_REQUEST,
    RAW_DATA_DIR,
    REQUEST_TIMEOUT_SECONDS,
    SOURCE,
    START_DATETIME,
    SYMBOL,
    TIMEFRAME,
    TIMEFRAME_SECONDS,
)


OUTPUT_COLUMNS = [
    "source",
    "asset",
    "symbol",
    "market_id",
    "timeframe",
    "timestamp_utc",
    "open",
    "high",
    "low",
    "close",
    "volume",
    "quote_volume",
    "trade_count",
    "raw_payload",
    "ingested_at",
]


def ensure_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        raise ValueError(f"Datetime naïf refusé: {value!r}. Utilisez timezone.utc.")
    return value.astimezone(timezone.utc)


def timestamp_to_utc(value: int | float | str) -> datetime:
    numeric = float(value)
    if numeric > 5_000_000_000:
        numeric /= 1000
    return datetime.fromtimestamp(numeric, tz=timezone.utc)


def request_candles(
    session: requests.Session,
    start_timestamp: int,
    end_timestamp: int,
    count_back: int,
) -> list[dict[str, Any]]:
    url = f"{LIGHTER_BASE_URL.rstrip('/')}/api/v1/candles"
    params = {
        "market_id": MARKET_ID,
        "resolution": TIMEFRAME,
        "start_timestamp": start_timestamp,
        "end_timestamp": end_timestamp,
        "count_back": count_back,
    }
    response = session.get(url, params=params, timeout=REQUEST_TIMEOUT_SECONDS)
    response.raise_for_status()
    payload = response.json()
    candles = payload.get("c", [])
    if not isinstance(candles, list):
        raise ValueError(f"Réponse candles invalide: clé 'c' absente ou non-liste: {payload}")
    normalized = [candle for candle in candles if isinstance(candle, dict) and "t" in candle]
    return [
        candle
        for candle in normalized
        if start_timestamp <= int(timestamp_to_utc(candle["t"]).timestamp()) < end_timestamp
    ]


def iter_time_windows(start: datetime, end: datetime) -> Iterable[tuple[int, int]]:
    step_seconds = TIMEFRAME_SECONDS.get(TIMEFRAME)
    if step_seconds is None:
        raise ValueError(f"TIMEFRAME non supporté: {TIMEFRAME}")

    current = int(ensure_utc(start).timestamp())
    final = int(ensure_utc(end).timestamp())
    if current >= final:
        raise ValueError("START_DATETIME doit être strictement antérieur à END_DATETIME.")

    window_seconds = step_seconds * MAX_CANDLES_PER_REQUEST
    while current < final:
        window_end = min(current + window_seconds, final)
        yield current, window_end
        current = window_end


def normalize_candle(candle: dict[str, Any], ingested_at: datetime) -> dict[str, Any]:
    return {
        "source": SOURCE,
        "asset": ASSET,
        "symbol": SYMBOL,
        "market_id": MARKET_ID,
        "timeframe": TIMEFRAME,
        "timestamp_utc": timestamp_to_utc(candle["t"]),
        "open": candle.get("o"),
        "high": candle.get("h"),
        "low": candle.get("l"),
        "close": candle.get("c"),
        "volume": candle.get("v"),
        "quote_volume": candle.get("V"),
        "trade_count": candle.get("n"),
        "raw_payload": json.dumps(candle, sort_keys=True, separators=(",", ":")),
        "ingested_at": ingested_at,
    }


def collect_candles() -> pd.DataFrame:
    ingested_at = datetime.now(tz=timezone.utc)
    rows: list[dict[str, Any]] = []
    step_seconds = TIMEFRAME_SECONDS[TIMEFRAME]

    with requests.Session() as session:
        for start_timestamp, end_timestamp in iter_time_windows(START_DATETIME, END_DATETIME):
            expected_count = min(
                MAX_CANDLES_PER_REQUEST,
                max(1, math.ceil((end_timestamp - start_timestamp) / step_seconds)),
            )
            start_iso = datetime.fromtimestamp(start_timestamp, tz=timezone.utc).isoformat()
            end_iso = datetime.fromtimestamp(end_timestamp, tz=timezone.utc).isoformat()
            print(f"Récupération {TIMEFRAME}: {start_iso} -> {end_iso}")
            candles = request_candles(session, start_timestamp, end_timestamp, expected_count)
            print(f"  bougies reçues: {len(candles)}")
            rows.extend(normalize_candle(candle, ingested_at) for candle in candles if "t" in candle)

    frame = pd.DataFrame(rows, columns=OUTPUT_COLUMNS)
    if frame.empty:
        return frame

    numeric_columns = ["open", "high", "low", "close", "volume", "quote_volume", "trade_count"]
    for column in numeric_columns:
        frame[column] = pd.to_numeric(frame[column], errors="coerce")

    frame["timestamp_utc"] = pd.to_datetime(frame["timestamp_utc"], utc=True)
    frame["ingested_at"] = pd.to_datetime(frame["ingested_at"], utc=True)
    return frame[OUTPUT_COLUMNS]


def output_path() -> str:
    start_label = ensure_utc(START_DATETIME).date().isoformat()
    end_label = ensure_utc(END_DATETIME).date().isoformat()
    filename = f"{SOURCE}_{ASSET}_m1_{start_label}_{end_label}.parquet"
    return str(RAW_DATA_DIR / filename)


def main() -> None:
    RAW_DATA_DIR.mkdir(parents=True, exist_ok=True)
    frame = collect_candles()
    path = output_path()
    frame.to_parquet(path, index=False)
    print("\nCollecte terminée.")
    print(f"  lignes sauvegardées: {len(frame)}")
    print(f"  fichier brut: {path}")
    if not frame.empty:
        print(f"  début: {frame['timestamp_utc'].min().isoformat()}")
        print(f"  fin: {frame['timestamp_utc'].max().isoformat()}")


if __name__ == "__main__":
    main()
