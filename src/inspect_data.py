from __future__ import annotations

import pandas as pd

from config import TIMEFRAME, TIMEFRAME_SECONDS, VALIDATED_DATA_DIR


def read_validated_data() -> pd.DataFrame:
    files = sorted(VALIDATED_DATA_DIR.glob("*.parquet"))
    if not files:
        return pd.DataFrame()
    frames = [pd.read_parquet(path) for path in files]
    frame = pd.concat(frames, ignore_index=True)
    frame["timestamp_utc"] = pd.to_datetime(frame["timestamp_utc"], utc=True, errors="coerce")
    for column in ["open", "high", "low", "close", "volume"]:
        frame[column] = pd.to_numeric(frame[column], errors="coerce")
    return frame.sort_values("timestamp_utc")


def abnormal_candles(frame: pd.DataFrame) -> pd.DataFrame:
    ranges = frame["high"] - frame["low"]
    valid_ranges = ranges.dropna()
    if valid_ranges.empty:
        return frame.iloc[0:0]
    q1 = valid_ranges.quantile(0.25)
    q3 = valid_ranges.quantile(0.75)
    iqr = q3 - q1
    threshold = q3 + 10 * iqr if iqr > 0 else valid_ranges.quantile(0.99) * 5
    return frame.loc[ranges > threshold, ["timestamp_utc", "open", "high", "low", "close", "volume"]].head(10)


def main() -> None:
    frame = read_validated_data()
    if frame.empty:
        print(f"Aucune donnée validée disponible dans {VALIDATED_DATA_DIR}")
        return

    timestamps = frame["timestamp_utc"].dropna()
    deltas = timestamps.sort_values().diff().dropna().dt.total_seconds().astype(int)
    delta_distribution = deltas.value_counts().sort_index().to_dict()
    expected_seconds = TIMEFRAME_SECONDS[TIMEFRAME]
    gaps = deltas[deltas > expected_seconds]
    covered_days = (
        (timestamps.max() - timestamps.min()).total_seconds() / 86_400 if not timestamps.empty else 0
    )

    print("Inspection des données validées")
    print(f"  nombre de lignes: {len(frame)}")
    print(f"  date de début: {timestamps.min().isoformat() if not timestamps.empty else None}")
    print(f"  date de fin: {timestamps.max().isoformat() if not timestamps.empty else None}")
    print(f"  jours couverts: {covered_days:.2f}")
    print(f"  prix min: {frame[['open', 'high', 'low', 'close']].min().min()}")
    print(f"  prix max: {frame[['open', 'high', 'low', 'close']].max().max()}")
    print(f"  volume moyen: {frame['volume'].mean()}")
    print(f"  volume médian: {frame['volume'].median()}")
    print(f"  volume max: {frame['volume'].max()}")
    print(f"  bougies à volume nul: {int((frame['volume'] == 0).sum())}")
    print(f"  distribution des écarts temporels: {delta_distribution}")
    print(f"  trous détectés: {int(len(gaps))}")

    examples = abnormal_candles(frame)
    if examples.empty:
        print("  bougies anormales: aucun exemple détecté")
    else:
        print("  exemples de bougies anormales:")
        print(examples.to_string(index=False))


if __name__ == "__main__":
    main()
