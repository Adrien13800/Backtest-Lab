# Backtest Lab

Plateforme de replay/backtesting trading.

## Stack

- Frontend: React, TypeScript, Vite, lightweight-charts
- Backend: FastAPI, Pydantic, SQLAlchemy, Alembic
- Database: PostgreSQL local. TimescaleDB est optionnel au debut.
- Jobs/cache: Redis, optionnel pour les prochains imports/jobs.
- File storage: MinIO/S3, optionnel pour les prochains exports lourds.

## Mode recommande sans Docker

Ce workflow suffit pour developper la plateforme et tester la persistance serveur.

### 1. Preparer Postgres local

Si Postgres tourne deja sur `localhost:5432`, cree le role et la base attendus:

```bash
psql -h 127.0.0.1 -d postgres -c "CREATE ROLE backtest WITH LOGIN PASSWORD 'backtest';"
createdb -h 127.0.0.1 -O backtest backtest_lab
```

Si le role ou la base existent deja, ces commandes peuvent simplement etre ignorees.

### 2. Installer le backend

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -e "backend[dev]"
cp backend/.env.example backend/.env
npm run api:migrate
npm run api:dev
```

API: `http://127.0.0.1:8000`

API docs: `http://127.0.0.1:8000/docs`

### 3. Lancer le frontend

```bash
npm install
npm run dev
```

Frontend: `http://127.0.0.1:5173`

## Docker optionnel

```bash
cp .env.example .env
cp backend/.env.example backend/.env
npm run stack:up
```

Services:

- API: `http://127.0.0.1:8000`
- API docs: `http://127.0.0.1:8000/docs`
- Postgres/Timescale: `localhost:5432`
- Redis: `localhost:6379`
- MinIO API: `http://127.0.0.1:9000`
- MinIO console: `http://127.0.0.1:9001`

## Migrations

Quand Postgres tourne:

```bash
npm run api:migrate
```

## Commandes utiles

```bash
npm run lint
npm run build
npm run api:dev
```

## Architecture

Voir [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
