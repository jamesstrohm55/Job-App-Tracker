from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import applications, auth, board, contacts, timeline


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(
    title="Job Application Tracker",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1")
app.include_router(applications.router, prefix="/api/v1")
app.include_router(board.router, prefix="/api/v1")
app.include_router(contacts.router, prefix="/api/v1")
app.include_router(timeline.router, prefix="/api/v1")


@app.get("/health")
async def health():
    return {"status": "ok"}
