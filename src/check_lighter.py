from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import requests

from config import (
    LIGHTER_BASE_URL,
    MARKET_ID,
    MAX_CANDLES_PER_REQUEST,
    REQUEST_TIMEOUT_SECONDS,
    TIMEFRAME,
    TIMEFRAME_SECONDS,
)


def get_json(path: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
    url = f"{LIGHTER_BASE_URL.rstrip('/')}{path}"
    response = requests.get(url, params=params, timeout=REQUEST_TIMEOUT_SECONDS)
    response.raise_for_status()
    payload = response.json()
    if not isinstance(payload, dict):
        raise ValueError(f"Réponse inattendue pour {url}: {type(payload).__name__}")
    return payload


def timestamp_to_utc(value: int | float | str) -> datetime:
    numeric = float(value)
    if numeric > 5_000_000_000:
        numeric /= 1000
    return datetime.fromtimestamp(numeric, tz=timezone.utc)


def discover_markets() -> list[dict[str, Any]]:
    payload = get_json("/api/v1/orderBookDetails", {"filter": "all"})
    markets = payload.get("order_book_details", [])
    if not isinstance(markets, list):
        return []
    return [market for market in markets if isinstance(market, dict)]


def print_market_summary(markets: list[dict[str, Any]]) -> None:
    if not markets:
        print(
            "Découverte marchés indisponible ou réponse non reconnue. "
            "Configurez MARKET_ID manuellement dans src/config.py."
        )
        return

    print(f"Marchés publics trouvés: {len(markets)}")
    btc_markets = []
    for market in markets:
        market_id = market.get("market_id")
        is_configured_market = str(market_id).isdigit() and int(market_id) == MARKET_ID
        is_btc_symbol = "BTC" in str(market.get("symbol", "")).upper()
        if is_btc_symbol or is_configured_market:
            btc_markets.append(market)
    selected = btc_markets[:20] if btc_markets else markets[:20]

    print("Extrait des marchés pertinents:")
    for market in selected:
        print(
            "  "
            f"market_id={market.get('market_id')} "
            f"symbol={market.get('symbol')} "
            f"type={market.get('market_type')} "
            f"status={market.get('status')}"
        )

    if not btc_markets:
        print(
            "Aucun symbole BTC évident dans l'extrait. Vérifiez le MARKET_ID "
            "dans l'interface ou la documentation Lighter avant une collecte longue."
        )


def fetch_sample_candles() -> list[dict[str, Any]]:
    now = datetime.now(tz=timezone.utc)
    step_seconds = TIMEFRAME_SECONDS[TIMEFRAME]
    end_timestamp = int(now.timestamp())
    start_timestamp = end_timestamp - min(60, MAX_CANDLES_PER_REQUEST) * step_seconds
    payload = get_json(
        "/api/v1/candles",
        {
            "market_id": MARKET_ID,
            "resolution": TIMEFRAME,
            "start_timestamp": start_timestamp,
            "end_timestamp": end_timestamp,
            "count_back": min(60, MAX_CANDLES_PER_REQUEST),
        },
    )
    candles = payload.get("c", [])
    if not isinstance(candles, list):
        raise ValueError("La réponse candles ne contient pas une liste dans la clé 'c'.")
    return [candle for candle in candles if isinstance(candle, dict)]


def main() -> None:
    print(f"API Lighter: {LIGHTER_BASE_URL}")
    print("Vérification de l'endpoint public orderBookDetails...")
    markets = discover_markets()
    print_market_summary(markets)

    print("\nTest de récupération candles...")
    candles = fetch_sample_candles()
    timestamps = [timestamp_to_utc(candle["t"]) for candle in candles if "t" in candle]

    print("\nRésumé:")
    print(f"  market_id: {MARKET_ID}")
    print(f"  timeframe: {TIMEFRAME}")
    print(f"  bougies reçues: {len(candles)}")
    print(f"  première date: {min(timestamps).isoformat() if timestamps else None}")
    print(f"  dernière date: {max(timestamps).isoformat() if timestamps else None}")


if __name__ == "__main__":
    main()
