import csv
from dataclasses import dataclass
from datetime import UTC, datetime
from decimal import Decimal
from io import StringIO


@dataclass(frozen=True)
class ParsedCandle:
    time: datetime
    open: Decimal
    high: Decimal
    low: Decimal
    close: Decimal
    volume: Decimal


def parse_ohlcv_csv(content: str) -> list[ParsedCandle]:
    rows = list(csv.DictReader(StringIO(content)))

    if not rows:
        raise ValueError("CSV must contain a header and at least one row.")

    normalized_headers = {
        normalize_header(header): header
        for header in (rows[0].keys() if rows else [])
        if header is not None
    }

    time_key = find_header(normalized_headers, "time", "timestamp", "date", "datetime")
    close_key = find_header(normalized_headers, "close", "c", "price", "adjclose")

    if time_key is None or close_key is None:
        raise ValueError("CSV must contain timestamp/date/time and close columns.")

    open_key = find_header(normalized_headers, "open", "o")
    high_key = find_header(normalized_headers, "high", "h")
    low_key = find_header(normalized_headers, "low", "l")
    volume_key = find_header(normalized_headers, "volume", "vol", "v")

    candles: list[ParsedCandle] = []

    for index, row in enumerate(rows, start=2):
        close = parse_decimal(row[close_key], index)
        open_price = parse_decimal(row[open_key], index) if open_key else close
        high = parse_decimal(row[high_key], index) if high_key else max(open_price, close)
        low = parse_decimal(row[low_key], index) if low_key else min(open_price, close)
        volume = parse_decimal(row[volume_key], index) if volume_key else Decimal("0")

        candles.append(
            ParsedCandle(
                time=parse_timestamp(row[time_key], index),
                open=open_price,
                high=high,
                low=low,
                close=close,
                volume=volume,
            )
        )

    deduplicated = {candle.time: candle for candle in candles}
    return sorted(deduplicated.values(), key=lambda candle: candle.time)


def normalize_header(value: str) -> str:
    return value.lower().replace(" ", "").replace("_", "").replace("-", "")


def find_header(headers: dict[str, str], *candidates: str) -> str | None:
    for candidate in candidates:
        if candidate in headers:
            return headers[candidate]
    return None


def parse_decimal(value: str | None, row_index: int) -> Decimal:
    if value is None:
        raise ValueError(f"Missing numeric value on row {row_index}.")

    try:
        return Decimal(value.strip().replace(",", "."))
    except Exception as error:
        raise ValueError(f"Invalid numeric value on row {row_index}: {value}") from error


def parse_timestamp(value: str | None, row_index: int) -> datetime:
    if value is None:
        raise ValueError(f"Missing timestamp value on row {row_index}.")

    raw_value = value.strip()

    try:
        numeric = Decimal(raw_value)
        timestamp = int(numeric / 1000) if numeric > 10_000_000_000 else int(numeric)
        return datetime.fromtimestamp(timestamp, tz=UTC)
    except Exception:
        pass

    try:
        parsed = datetime.fromisoformat(raw_value.replace("Z", "+00:00"))
    except ValueError as error:
        raise ValueError(f"Invalid timestamp on row {row_index}: {value}") from error

    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=UTC)

    return parsed.astimezone(UTC)
