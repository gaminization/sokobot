# 🛠️ Installation & Setup Guide

Welcome to the **Sokobot** installation guide! This document will walk you through the process of setting up the Warehouse Robot Management System on your local machine for development and testing.

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **[Python 3.10+](https://www.python.org/downloads/)**
- **[Node.js 20+](https://nodejs.org/)**
- **[PostgreSQL 14+](https://www.postgresql.org/)** (Recommended for production/dev)
- Basic CLI tools: `pip`, `npm`, and `alembic`

---

## ⚙️ 1. Configure Environment

Start by setting up your environment variables. We provide templates for both the backend and frontend.

```bash
# Copy backend environment template
cp .env.example .env

# Copy frontend environment template
cp frontend/.env.example frontend/.env
```

### 🔑 Important Variables in `.env`:
- `DATABASE_URL`: Ensure this points to your database. (e.g., `postgresql+psycopg://wrms:wrms@localhost:5432/wrms`)
- `SECRET_KEY`: **Must** be replaced before shared or production use!
- `AUTO_SEED=true`: Automatically seeds admin/operator users, robots, stations, and waypoints on first boot.

---

## 🏗️ 2. Backend Setup

Our backend is powered by FastAPI. Follow these steps to get it running:

1. **Install Python dependencies:**
   ```bash
   pip install -r backend/requirements.txt
   ```

2. **Run Database Migrations:**
   ```bash
   alembic -c backend/alembic.ini upgrade head
   ```

3. **Start the API Server:**
   ```bash
   uvicorn backend.main:app --reload
   ```

📍 **Endpoints:**
- Base API: `http://localhost:8000`
- Swagger UI (Docs): `http://localhost:8000/docs`

---

## 💻 3. Frontend Setup

The frontend command-center is built with React, Vite, and Tailwind CSS.

1. **Install Node dependencies:**
   ```bash
   cd frontend
   npm install
   ```

2. **Run the Development Server:**
   ```bash
   npm run dev
   ```

📍 **Endpoint:**
- Frontend App: `http://localhost:5173`

---

## 🔐 4. Default Login Credentials

If `AUTO_SEED` was set to true, the following accounts are ready to use:

| Role | Email | Password |
| :--- | :--- | :--- |
| **Admin** | `admin@wrms.com` | `admin123` |
| **Operator** | `operator@wrms.com` | `operator123` |

---

## 🧪 5. Running Tests

We strongly recommend running tests to verify your setup.

### Backend/API Tests:
```bash
pytest -q
```

### Frontend Production Build Test:
```bash
cd frontend
npm run build
```

---

## 🗄️ 6. SQLite Fallback (Zero-Dependency Run)

If you prefer a zero-dependency local run without PostgreSQL, you can use SQLite. Just update your `.env`:

```env
DATABASE_URL=sqlite:///./wrms.db
```
*Note: This works perfectly for local development, tests, and Alembic migration verification.*

---

## 📝 7. Additional Notes

- ⏳ **Simulation Engine:** The simulation engine runs directly within the FastAPI process. It advances robot and task states every `SIMULATION_TICK_SECONDS`.
- 🚀 **Production Deployment:** Always prefer PostgreSQL over SQLite and ensure a secure, non-default `SECRET_KEY`.
- 🔗 **API Connectivity:** The frontend expects the API under the `VITE_API_BASE_URL` environment variable, which defaults to `http://localhost:8000/api`.
