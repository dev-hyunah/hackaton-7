FROM python:3.11-slim

WORKDIR /app

# 의존성 먼저 설치 (레이어 캐시 활용)
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 소스 복사
COPY backend/ ./backend/
COPY ai_engine/ ./ai_engine/

WORKDIR /app/backend

# SQLite DB 파일은 런타임에 생성되므로 제외
# seed_data.py 실행 후 서버 시작
CMD ["sh", "-c", "python seed_data.py && uvicorn app.main:app --host 0.0.0.0 --port 8080"]
