# Backtest Lab Architecture

Objectif: construire une plateforme de replay/backtesting inspiree des grands outils de replay de marche, sans copier leur code, leur marque ni leur interface proprietaire.

## Stack retenue

- Frontend: React, TypeScript, Vite, lightweight-charts.
- Backend API: FastAPI, Pydantic, SQLAlchemy async.
- Migrations: Alembic.
- Database: PostgreSQL local. TimescaleDB est optionnel et active automatiquement si l'extension existe.
- Jobs/cache: Redis, optionnel pour les imports/jobs asynchrones.
- Object storage: MinIO/S3, optionnel pour les fichiers lourds.
- Infra locale: sans Docker par defaut; Docker Compose reste disponible en option.

## V1 locale actuelle

La V1 locale est une application React qui couvre le coeur produit d'une plateforme de replay:

- donnees OHLCV synthetiques au format M5;
- import CSV avec colonnes `time/date/timestamp`, `open`, `high`, `low`, `close`, `volume`;
- replay bougie par bougie avec play/pause, vitesse et progression;
- ordres market, limit et stop;
- file d'ordres pending annulables;
- sizing par risque fixe en pourcentage de balance;
- SL/TP calcules par distance de stop et reward/risk;
- cloture automatique sur SL/TP;
- cloture manuelle;
- spread, slippage et commission par million;
- sauvegarde automatique localStorage;
- sauvegarde/reprise serveur de snapshots de session;
- upload CSV serveur et stockage de datasets historiques;
- chargement de datasets serveur dans le replay;
- comptes utilisateurs, login/logout et isolation des sessions/datasets par utilisateur;
- export trades CSV et session JSON;
- prop firm simulator: target, max drawdown, daily loss limit, trading days;
- journal de trades avec setup, tags et notes;
- metrics: PnL, fees, win rate, profit factor, expectancy R, average win/loss, max drawdown, hold moyen.

Le moteur est volontairement separe de l'UI:

- `src/lib/replay.ts`: execution, parsing CSV, metrics, formatters;
- `src/types.ts`: contrats metier;
- `src/components/ReplayChart.tsx`: affichage graphique;
- `src/App.tsx`: orchestration de session.
- `backend/app`: API FastAPI, schemas, routes versionnees et snapshots de session;
- `backend/app/api/routes/auth.py`: register, login, me, logout;
- `backend/app/api/deps.py`: dependance utilisateur courant via Bearer token;
- `backend/app/api/routes/datasets.py`: upload, listing, lecture et suppression de datasets;
- `backend/app/services/csv_parser.py`: parsing CSV OHLCV cote serveur;
- `backend/alembic`: migrations PostgreSQL compatibles Timescale si l'extension existe;
- `docker-compose.yml`: optionnel pour Postgres/Timescale, Redis, MinIO et API.

## Regle intrabar

Avec des donnees OHLC, si le SL et le TP sont touches dans la meme bougie, le moteur applique une regle conservatrice: le stop-loss gagne la priorite. Pour un replay plus realiste, il faudra integrer des donnees plus fines, par exemple seconde, tick ou LTF reconstruction. Les ordres pending sont remplis quand leur prix est touche par le high/low de la bougie courante.

## Architecture cible

```text
frontend
  chart
  replay controls
  order ticket
  journal
  analytics

api backend
  auth
  sessions
  trades
  datasets
  billing
  exports

market data service
  imports CSV
  connecteurs fournisseurs
  normalisation OHLCV/tick
  aggregation timeframes

simulation engine
  replay cursor
  matching orders
  risk sizing
  slippage/spread/commission
  prop firm rules

analytics service
  equity curve
  drawdown
  expectancy
  tags/setups
  stats par instrument/session/heure

database
  users
  symbols
  candles
  sessions
  orders
  trades
  journal notes
```

## Roadmap technique SaaS

1. Stabiliser le moteur local avec tests unitaires: SL/TP, pending fills, sizing, fees, prop firm et parsing CSV.
2. Ajouter break-even, partial close, trailing stop et multi-positions.
3. Ajouter timeframes multiples et aggregation OHLCV.
4. Ajouter captures de chart, templates de playbook et scorecards.
5. Persister les sessions avec un backend Node/NestJS ou Python/FastAPI.
6. Stocker les bougies dans PostgreSQL + TimescaleDB ou ClickHouse selon volume.
7. Ajouter comptes utilisateurs, workspaces, strategies et permissions.
8. Ajouter connecteurs data vendors et jobs d'import historises.
9. Ajouter analytics avances: cohortes, edge par setup, distribution R, calendrier.
10. Ajouter un assistant IA base sur le journal structure, pas sur le chart seul.

## Donnees

Format interne recommande:

```text
symbol
timeframe
timestamp_utc
open
high
low
close
volume
spread_optional
source
```

Les timestamps doivent rester en UTC en stockage. L'affichage peut ensuite utiliser le fuseau de l'utilisateur.

## Tests prioritaires

- position long touche TP seulement;
- position long touche SL seulement;
- position long touche SL et TP dans la meme bougie;
- equivalent short;
- sizing avec risque 1%;
- profit factor sans pertes;
- parsing CSV timestamp ISO, Unix seconds, Unix milliseconds;
- session reset apres import CSV.
