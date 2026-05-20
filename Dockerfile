# Stage 1: Build React frontend
FROM node:20-slim AS frontend-builder

WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Production image
FROM python:3.11-slim

WORKDIR /app

# Install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY backend/ ./backend/
COPY ai_engine/ ./ai_engine/

# Copy React build output into static/ (FastAPI serves from here)
COPY --from=frontend-builder /app/frontend/dist ./static/

WORKDIR /app/backend

ENV PYTHONPATH=/app:/app/backend

CMD ["sh", "-c", "python seed_data.py && uvicorn app.main:app --host 0.0.0.0 --port 8080"]
