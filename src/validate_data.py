from __future__ import annotations

import json
import shutil
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from config import (
    QUALITY_REPORTS_DIR,
    RAW_DATA_DIR,
    REJECTED_DATA_DIR,
    TIMEFRAME,
    TIMEFRAME_SECONDS,
    VALIDATED_DATA_DIR,
)


CRITICAL_FIELDS = ["timestamp_utc", "open", "high", "low", "close", "volume"]


def iso_or_none(value: Any) -> str | None:
    if pd.isna(value):
        return None
    timestamp = pd.Timestamp(value)
    if timestamp.tzinfo is None:
        timestamp = timestamp.tz_localize("UTC")
    return timestamp.tz_convert("UTC").isoformat()


def top_time_deltas(timestamps: pd.Series) -> dict[str, int]:
    deltas = timestamps.sort_values().diff().dropna()
    seconds = deltas.dt.total_seconds().astype(int)
    counter = Counter(seconds.tolist())
    return {f"{delta_seconds}s": count for delta_seconds, count in counter.most_common(10)}


def count_missing_timestamps(timestamps: pd.Series) -> int:
    if timestamps.empty:
        return 0
    expected_delta = f"{TIMEFRAME_SECONDS[TIMEFRAME]}s"
    expected = pd.date_range(
        start=timestamps.min(),
        end=timestamps.max(),
        freq=expected_delta,
        tz="UTC",
    )
    return int(len(expected.difference(pd.DatetimeIndex(timestamps.drop_duplicates()))))


def range_outliers_count(frame: pd.DataFrame) -> int:
    ranges = frame["high"] - frame["low"]
    valid_ranges = ranges.replace([np.inf, -np.inf], np.nan).dropna()
    if valid_ranges.empty:
        return 0
    q1 = valid_ranges.quantile(0.25)
    q3 = valid_ranges.quantile(0.75)
    iqr = q3 - q1
    if iqr <= 0:
        threshold = valid_ranges.quantile(0.99) * 5
    else:
        threshold = q3 + 10 * iqr
    return int((ranges > threshold).sum())


def validate_file(path: Path) -> dict[str, Any]:
    frame = pd.read_parquet(path)
    missing_columns = [column for column in CRITICAL_FIELDS if column not in frame.columns]

    if missing_columns:
        report = {
            "file": str(path),
            "rows": int(len(frame)),
            "start": None,
            "end": None,
            "missing_timestamps": 0,
            "duplicate_timestamps": 0,
            "non_monotonic_timestamps": True,
            "negative_or_zero_open": 0,
            "negative_or_zero_high": 0,
            "negative_or_zero_low": 0,
            "negative_or_zero_close": 0,
            "invalid_high": 0,
            "invalid_low": 0,
            "negative_volume": 0,
            "zero_volume_count": 0,
            "top_time_deltas": {},
            "suspected_gaps_count": 0,
            "abnormal_range_count": 0,
            "missing_columns": missing_columns,
            "passed": False,
        }
        return report

    frame["timestamp_utc"] = pd.to_datetime(frame["timestamp_utc"], utc=True, errors="coerce")
    for column in ["open", "high", "low", "close", "volume"]:
        frame[column] = pd.to_numeric(frame[column], errors="coerce")

    timestamps = frame["timestamp_utc"]
    expected_seconds = TIMEFRAME_SECONDS[TIMEFRAME]
    deltas = timestamps.sort_values().diff().dropna().dt.total_seconds()

    missing_timestamps = int(timestamps.isna().sum())
    duplicate_timestamps = int(timestamps.duplicated().sum())
    non_monotonic_timestamps = bool(not timestamps.dropna().is_monotonic_increasing)
    suspected_gaps_count = int((deltas > expected_seconds).sum())

    invalid_high = (
        (frame["high"] < frame["open"])
        | (frame["high"] < frame["close"])
        | (frame["high"] < frame["low"])
    )
    invalid_low = (
        (frame["low"] > frame["open"])
        | (frame["low"] > frame["close"])
        | (frame["low"] > frame["high"])
    )

    report = {
        "file": str(path),
        "rows": int(len(frame)),
        "start": iso_or_none(timestamps.min()),
        "end": iso_or_none(timestamps.max()),
        "missing_timestamps": missing_timestamps + count_missing_timestamps(timestamps.dropna()),
        "duplicate_timestamps": duplicate_timestamps,
        "non_monotonic_timestamps": non_monotonic_timestamps,
        "negative_or_zero_open": int((frame["open"] <= 0).sum()),
        "negative_or_zero_high": int((frame["high"] <= 0).sum()),
        "negative_or_zero_low": int((frame["low"] <= 0).sum()),
        "negative_or_zero_close": int((frame["close"] <= 0).sum()),
        "invalid_high": int(invalid_high.sum()),
        "invalid_low": int(invalid_low.sum()),
        "negative_volume": int((frame["volume"] < 0).sum()),
        "zero_volume_count": int((frame["volume"] == 0).sum()),
        "top_time_deltas": top_time_deltas(timestamps.dropna()),
        "suspected_gaps_count": suspected_gaps_count,
        "abnormal_range_count": range_outliers_count(frame),
    }

    critical_failures = [
        int(report["rows"] == 0),
        report["missing_timestamps"],
        report["duplicate_timestamps"],
        int(report["non_monotonic_timestamps"]),
        report["negative_or_zero_open"],
        report["negative_or_zero_high"],
        report["negative_or_zero_low"],
        report["negative_or_zero_close"],
        report["invalid_high"],
        report["invalid_low"],
        report["negative_volume"],
    ]
    report["passed"] = all(value == 0 for value in critical_failures)
    return report


def write_report(report: dict[str, Any], source_file: Path) -> Path:
    QUALITY_REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(tz=timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    report_path = QUALITY_REPORTS_DIR / f"{source_file.stem}_quality_{timestamp}.json"
    report_path.write_text(json.dumps(report, indent=2, sort_keys=True), encoding="utf-8")
    return report_path


def route_file(source_file: Path, passed: bool) -> Path:
    target_dir = VALIDATED_DATA_DIR if passed else REJECTED_DATA_DIR
    target_dir.mkdir(parents=True, exist_ok=True)
    target_path = target_dir / source_file.name
    shutil.copy2(source_file, target_path)
    return target_path


def main() -> None:
    files = sorted(RAW_DATA_DIR.glob("*.parquet"))
    if not files:
        print(f"Aucun fichier brut à valider dans {RAW_DATA_DIR}")
        return

    for path in files:
        print(f"Validation: {path}")
        report = validate_file(path)
        report_path = write_report(report, path)
        target_path = route_file(path, bool(report["passed"]))
        status = "validé" if report["passed"] else "rejeté"
        print(f"  statut: {status}")
        print(f"  rapport: {report_path}")
        print(f"  copie: {target_path}")


if __name__ == "__main__":
    main()
