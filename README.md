# Backtest Lab - Données Bitcoin Lighter

Ce projet ne dépend plus de terminal local ni d'intégration de trading externe. Il collecte uniquement des données de marché publiques Bitcoin depuis l'API HTTP Lighter, les sauvegarde en Parquet, les valide, puis permet de les inspecter.

Il n'envoie aucun ordre, n'utilise aucune clé privée, ne signe aucune transaction et n'accède à aucun compte authentifié.

## Architecture

```text
data/
  raw/lighter/btc/m1/
  validated/lighter/btc/m1/
  rejected/lighter/btc/m1/
  quality_reports/
src/
  config.py
  check_lighter.py
  collect_lighter_btc.py
  validate_data.py
  inspect_data.py
```

## Configuration

La configuration principale se trouve dans `src/config.py`.

```python
MARKET_ID = 1
TIMEFRAME = "1m"
START_DATETIME = datetime(2025, 1, 1, tzinfo=timezone.utc)
END_DATETIME = datetime(2025, 1, 31, tzinfo=timezone.utc)
```

`MARKET_ID` est volontairement configurable, car le marché Bitcoin sur Lighter peut être identifié par une valeur numérique. Lancez `python src/check_lighter.py` pour afficher les marchés publics visibles via `orderBookDetails` et vérifier que l'identifiant sélectionné renvoie des candles.

Toutes les dates doivent rester en UTC. Cela évite les ambiguïtés liées aux fuseaux horaires, aux changements d'heure et aux comparaisons entre sources de données.

## Installation

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Vérifier l'API Lighter

```bash
python src/check_lighter.py
```

Le script vérifie l'accès à l'API publique, tente d'afficher les marchés disponibles, puis récupère un petit échantillon de candles sur le `MARKET_ID` configuré.

## Collecter les données

```bash
python src/collect_lighter_btc.py
```

Le collecteur pagine les appels temporels pour respecter la limite de 500 candles par réponse. Les fichiers bruts sont écrits dans `data/raw/lighter/btc/m1/` avec un nom du type:

```text
lighter_btc_m1_YYYY-MM-DD_YYYY-MM-DD.parquet
```

Les données brutes ne sont pas modifiées. Chaque ligne garde aussi `raw_payload`, une version JSON sérialisée de la bougie reçue, pour faciliter l'audit.

## Valider les données

```bash
python src/validate_data.py
```

La validation contrôle les timestamps manquants, les doublons, l'ordre chronologique, les prix incohérents, les volumes négatifs, les trous temporels, les volumes nuls et les ranges anormaux.

Un rapport JSON est écrit dans `data/quality_reports/`. Les fichiers qui passent les contrôles critiques sont copiés vers `data/validated/lighter/btc/m1/`; les autres vers `data/rejected/lighter/btc/m1/`.

Séparer le brut du validé permet de conserver une trace auditée de ce que l'API a renvoyé, tout en offrant une zone propre pour les étapes futures.

## Inspecter les données

```bash
python src/inspect_data.py
```

L'inspection lit les fichiers validés et affiche les bornes temporelles, la couverture en jours, les prix min/max, les statistiques de volume, la distribution des écarts temporels, les trous détectés et quelques exemples de bougies anormales.

## Étapes futures

La base est volontairement limitée à la préparation de données de marché. Elle pourra accueillir plus tard un moteur de replay, un backtester, des agents de stratégie ou un risk manager, mais aucun trading réel n'est implémenté à ce stade.
