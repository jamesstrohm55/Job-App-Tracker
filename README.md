# HireTrackr

A full-stack job search command center with a built-in email client, Kanban board, Gmail integration, analytics dashboard, and smart email classification.

## Features

- **Full Email Client** — Two-panel Gmail-like inbox with compose, reply, search, and batch operations
- **Smart Email Classification** — Auto-detects job applications, interviews, rejections, and offers from your Gmail
- **Kanban Board** — Drag-and-drop applications across stages (Saved, Applied, Screening, Interview, Offer, Rejected, Withdrawn)
- **Auto-Create Applications** — Automatically creates tracked applications from LinkedIn "sent to" and ATS confirmation emails
- **Interview Management** — Import interviews from emails with parsed meeting links, participants, date/time. Cards show "Join Meeting" button
- **Rejection Detection** — Scans email bodies for rejection language, creates applications in Rejected stage
- **Board Notifications** — Unified notification system: "Is this an interview?", "Interview passed — how did it go?", "Rejection detected"
- **Analytics Dashboard** — Stats cards, stage funnel, application timeline, response rates, stage distribution charts
- **Contact Management** — Track contacts per application with role, email, phone, LinkedIn
- **Application Timeline** — Event log per application, auto-created on stage changes
- **Email Trash** — Trash rejection emails directly from the board, per-application or bulk
- **Dark Mode** — Full light/dark theme with glassmorphism UI
- **Google OAuth** — Secure authentication with JWT access/refresh token rotation

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.13, FastAPI, SQLModel, Alembic |
| Frontend | React 19, TypeScript, Vite |
| UI | Tailwind CSS v4, shadcn/ui, Glassmorphism, Plus Jakarta Sans |
| Database | PostgreSQL 17 |
| Auth | Google OAuth 2.0, JWT (access + refresh tokens) |
| Drag & Drop | @dnd-kit |
| Charts | Recharts |
| State | TanStack Query v5, Zustand |
| Forms | react-hook-form, zod |
| Testing | pytest (backend) |
| Containerization | Docker, Docker Compose |

## Project Structure

```
├── backend/                 # FastAPI + SQLModel
│   ├── app/
│   │   ├── models/          # SQLModel database models
│   │   ├── schemas/         # Pydantic request/response schemas
│   │   ├── routers/         # API route handlers
│   │   ├── services/        # Business logic
│   │   │   ├── gmail_service.py      # Gmail sync, send, reply, trash
│   │   │   ├── email_parser.py       # Rules-based email classification
│   │   │   ├── interview_extractor.py # Parse interview details from emails
│   │   │   └── ...
│   │   └── utils/
│   ├── alembic/             # Database migrations
│   └── tests/               # pytest tests
├── frontend/                # React + Vite + TypeScript
│   └── src/
│       ├── api/             # Axios API client
│       ├── hooks/           # TanStack Query hooks
│       ├── components/
│       │   ├── ui/          # shadcn/ui + glassmorphism components
│       │   ├── layout/      # App shell, sidebar, header
│       │   ├── kanban/      # Board, columns, cards
│       │   ├── emails/      # Email list, detail, compose
│       │   ├── analytics/   # Charts and stats
│       │   └── ...
│       ├── pages/           # Route pages
│       └── stores/          # Zustand stores
├── .github/workflows/       # GitHub Actions (frontend deploy)
├── docker-compose.yml       # Dev: Postgres + backend
├── render.yaml              # Render deployment config
└── nginx/                   # Nginx config for production
```

## Local Development

### Prerequisites

- Python 3.12+
- Node.js 20+
- Docker (for PostgreSQL)
- Google Cloud Console project (for OAuth + Gmail API)

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

Edit `backend/.env`:
```
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/job_tracker
JWT_ACCESS_SECRET=<random-string>
JWT_REFRESH_SECRET=<random-string>
GOOGLE_CLIENT_ID=<from-google-cloud-console>
GOOGLE_CLIENT_SECRET=<from-google-cloud-console>
GOOGLE_REDIRECT_URI=http://localhost:5173/auth/google/callback
GMAIL_REDIRECT_URI=http://localhost:5173/settings/gmail/callback
GMAIL_ENCRYPTION_KEY=<run: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())">
FRONTEND_URL=http://localhost:5173
CORS_ORIGINS=["http://localhost:5173"]
```

Edit `frontend/.env`:
```
VITE_GOOGLE_CLIENT_ID=<same-google-client-id>
```

### 3. Start PostgreSQL

```bash
docker compose up db -d
```

### 4. Run migrations

```bash
cd backend
python -m alembic upgrade head
```

### 5. Start the app

```bash
# Terminal 1: Backend
cd backend
python -m uvicorn app.main:app --reload --port 8000

# Terminal 2: Frontend
cd frontend
npm run dev
```

App: http://localhost:5173 | API docs: http://localhost:8000/docs

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create project → APIs & Services → Credentials → OAuth 2.0 Client ID
3. Authorized JavaScript origins: `http://localhost:5173`
4. Authorized redirect URIs:
   - `http://localhost:5173/auth/google/callback`
   - `http://localhost:5173/settings/gmail/callback`
5. Enable Gmail API in APIs & Services → Library

## Deployment

### Frontend → GitHub Pages

The GitHub Actions workflow (`.github/workflows/deploy-frontend.yml`) auto-deploys on push to `main`.

Set these in GitHub repo Settings → Variables → Actions:
- `VITE_API_URL` = `https://your-backend.onrender.com/api/v1`
- `VITE_GOOGLE_CLIENT_ID` = your Google Client ID

### Backend → Render

1. Connect repo to Render
2. It detects `render.yaml` and creates the web service + Postgres
3. Set environment variables in Render dashboard

## API Endpoints

60+ endpoints. Key ones:

| Method | Path | Description |
|---|---|---|
| POST | `/auth/google` | Google OAuth login |
| GET | `/board` | Kanban board data |
| PATCH | `/board/move` | Move card between stages |
| GET/POST | `/applications` | List/create applications |
| POST | `/emails/sync-all` | Sync all emails from last 15 days |
| GET | `/emails/inbox` | Paginated inbox with filters |
| GET | `/emails/{id}/body` | Fetch full email body |
| POST | `/emails/compose` | Send email |
| POST | `/emails/{id}/reply` | Reply to email |
| POST | `/emails/batch` | Batch mark read/unread/trash |
| GET | `/emails/pending-actions` | Board notifications |
| POST | `/emails/import-as-interview` | Import email as interview |
| POST | `/emails/confirm-rejection` | Confirm rejection |
| GET | `/analytics/summary` | Dashboard stats |
| GET | `/analytics/funnel` | Stage conversion funnel |

## Running Tests

```bash
cd backend
python -m pytest tests/ -v
```
