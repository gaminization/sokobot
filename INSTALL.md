# INSTALL

## Prerequisites

- Python 3.10+
- Node.js 20+
- PostgreSQL 14+ for preferred production/dev database
- `pip`, `npm`, and `alembic`

## 1. Configure environment

Copy the examples you want to use:

```bash
cp .env.example .env
cp frontend/.env.example frontend/.env
```

Important defaults in `.env`:

- `DATABASE_URL`
  Preferred: `postgresql+psycopg://wrms:wrms@localhost:5432/wrms`
- `SECRET_KEY`
  Replace before shared or production use.
- `AUTO_SEED=true`
  Seeds admin/operator users, robots, stations, and waypoints on first boot.

## 2. Backend setup

Install dependencies:

```bash
pip install -r backend/requirements.txt
```

Run migrations:

```bash
alembic -c backend/alembic.ini upgrade head
```

Start the API:

```bash
uvicorn backend.main:app --reload
```

The backend will be available at:

- `http://localhost:8000`
- Swagger UI: `http://localhost:8000/docs`

## 3. Frontend setup

Install frontend dependencies:

```bash
cd frontend
npm install
```

Run the dev server:

```bash
npm run dev
```

The frontend will be available at:

- `http://localhost:5173`

## 4. Default login

- Admin
  `admin@wrms.com` / `admin123`
- Operator
  `operator@wrms.com` / `operator123`

## 5. Run tests

Backend/API tests:

```bash
pytest -q
```

Frontend production build:

```bash
cd frontend
npm run build
```

## 6. SQLite fallback

If you want a zero-dependency local run, keep:

```env
DATABASE_URL=sqlite:///./wrms.db
```

This works for local development, tests, and Alembic migration verification.

## 7. Notes

- The simulation engine runs in the FastAPI process and advances robot/task state every `SIMULATION_TICK_SECONDS`.
- For production deployment, prefer PostgreSQL and a non-default `SECRET_KEY`.
- The frontend expects the API under `VITE_API_BASE_URL`, defaulting to `http://localhost:8000/api`.
