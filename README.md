# Job Application Tracker

A full-stack job application tracker with a Kanban board, Gmail integration, analytics dashboard, and Google OAuth authentication.

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python, FastAPI, SQLModel, Alembic |
| Frontend | React, TypeScript, Vite |
| UI | Tailwind CSS v4, shadcn/ui |
| Database | PostgreSQL 17 |
| Auth | Google OAuth 2.0, JWT (access + refresh tokens) |
| Drag & Drop | @dnd-kit |
| Charts | Recharts |
| State | TanStack Query v5, Zustand |
| Testing | pytest (backend), Vitest (frontend) |

## Features

- **Kanban Board** — Drag-and-drop applications across stages (Saved, Applied, Screening, Interview, Offer, Rejected, Withdrawn)
- **Application CRUD** — Track company, position, URL, location, salary, work model, notes
- **Contact Management** — Link contacts to applications with role, email, phone, LinkedIn
- **Application Timeline** — Event log per application (auto-created on stage changes)
- **Gmail Integration** — Connect Gmail, sync job-related emails, auto-link to tracked applications
- **Analytics Dashboard** — Stats cards, stage funnel, application timeline, response rates, stage distribution
- **Google OAuth** — Secure authentication with JWT access/refresh token rotation
- **Dark Mode** — Full light/dark theme support

## Project Structure

```
├── backend/             # FastAPI + SQLModel
│   ├── app/
│   │   ├── models/      # SQLModel database models
│   │   ├── schemas/     # Pydantic request/response schemas
│   │   ├── routers/     # API route handlers
│   │   ├── services/    # Business logic
│   │   └── utils/       # JWT, Gmail queries
│   ├── alembic/         # Database migrations
│   └── tests/           # pytest unit tests
├── frontend/            # React + Vite + TypeScript
│   └── src/
│       ├── api/         # Axios API client
│       ├── hooks/       # TanStack Query hooks
│       ├── components/  # UI components (kanban, forms, charts)
│       ├── pages/       # Route pages
│       └── stores/      # Zustand stores
├── docker-compose.yml       # Dev: Postgres + backend + frontend
├── docker-compose.prod.yml  # Prod: + nginx reverse proxy
└── nginx/                   # Nginx config
```

## Local Development Setup

### Prerequisites

- Python 3.12+
- Node.js 20+
- Docker & Docker Compose (for PostgreSQL)
- Google Cloud Console project (for OAuth)

### 1. Clone and install

```bash
git clone <repo-url>
cd "Job App Tracker"

# Backend
cd backend
pip install -e ".[dev]"
cd ..

# Frontend
cd frontend
npm install
cd ..
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env` with your values. For Google OAuth:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project → APIs & Services → Credentials → OAuth 2.0 Client ID
3. Set authorized redirect URI to `http://localhost:5173/auth/google/callback`
4. Copy Client ID and Secret into `.env`

For Gmail integration, generate an encryption key:
```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

### 3. Start PostgreSQL

```bash
docker compose up db -d
```

### 4. Run database migrations

```bash
cd backend
alembic revision --autogenerate -m "initial"
alembic upgrade head
cd ..
```

### 5. Start the backend

```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

API docs available at http://localhost:8000/docs

### 6. Start the frontend

In a separate terminal:
```bash
cd frontend
npm run dev
```

App available at http://localhost:5173

### Running Tests

```bash
# Backend (37 tests)
cd backend
python -m pytest tests/ -v

# Frontend type check
cd frontend
npx tsc -b
```

## Production Deployment

```bash
# Build and run with Docker Compose
docker compose -f docker-compose.prod.yml up -d --build
```

This starts PostgreSQL, the FastAPI backend (4 workers), a static nginx frontend, and an nginx reverse proxy on port 80.

## API Endpoints

All endpoints prefixed with `/api/v1`. Auth required unless noted.

| Method | Path | Description |
|---|---|---|
| POST | `/auth/google` | Exchange Google code for tokens |
| POST | `/auth/refresh` | Rotate refresh token |
| GET | `/auth/me` | Current user |
| GET | `/board` | Kanban board data |
| PATCH | `/board/move` | Move card between stages |
| GET/POST | `/applications` | List/create applications |
| GET/PUT/DELETE | `/applications/:id` | Get/update/delete application |
| GET/POST | `/contacts` | List/create contacts |
| POST/DELETE | `/applications/:id/contacts/:cid` | Link/unlink contact |
| GET/POST | `/applications/:id/timeline` | List/create timeline events |
| POST | `/emails/connect-gmail` | Connect Gmail OAuth |
| POST | `/emails/sync` | Sync emails from Gmail |
| GET | `/emails/suggestions` | Auto-detected job email matches |
| GET | `/analytics/summary` | Dashboard stats |
| GET | `/analytics/funnel` | Stage conversion funnel |
| GET | `/analytics/timeline` | Applications over time |
| GET | `/analytics/stage-distribution` | Current stage breakdown |
