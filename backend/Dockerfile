FROM python:3.13-slim AS base

WORKDIR /app

COPY . .
RUN pip install --no-cache-dir .

ENV PYTHONPATH=/app

EXPOSE 8000

CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
