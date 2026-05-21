from __future__ import annotations
import logging
import os
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import ValidationError
from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / ".env", override=True)

# AI 분석 로그: 콘솔 + 파일(backend/logs/ai_strategy.log) 동시 출력
_log_dir = Path(__file__).resolve().parent.parent / "logs"
_log_dir.mkdir(exist_ok=True)
_ai_logger = logging.getLogger("groq_ai_engine")
_ai_logger.setLevel(logging.INFO)
if not _ai_logger.handlers:
    _fmt = logging.Formatter("%(asctime)s  %(message)s", datefmt="%Y-%m-%d %H:%M:%S")
    _fh = logging.FileHandler(_log_dir / "ai_strategy.log", encoding="utf-8")
    _fh.setFormatter(_fmt)
    _ch = logging.StreamHandler()
    _ch.setFormatter(_fmt)
    _ai_logger.addHandler(_fh)
    _ai_logger.addHandler(_ch)

from app.database import engine
from app.models import models
from app.routers import fare, ai_recommendation, competitor, simulation, report, dashboard
from app.routers import rm_optimize

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="RM System API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(ValidationError)
async def validation_exception_handler(request: Request, exc: ValidationError) -> JSONResponse:
    return JSONResponse(status_code=400, content={"detail": exc.errors()})


@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError) -> JSONResponse:
    return JSONResponse(status_code=400, content={"detail": str(exc)})


app.include_router(dashboard.router)
app.include_router(fare.router)
app.include_router(ai_recommendation.router)
app.include_router(competitor.router)
app.include_router(simulation.router)
app.include_router(report.router)
app.include_router(rm_optimize.router)


@app.get("/health")
def health_check():
    return {"status": "ok"}


# Serve React SPA static files (only when dist/ exists — production)
_static_dir = Path(__file__).parent.parent.parent / "static"
if _static_dir.exists():
    app.mount("/assets", StaticFiles(directory=str(_static_dir / "assets")), name="assets")

    @app.get("/{full_path:path}")
    def serve_spa(full_path: str):
        return FileResponse(str(_static_dir / "index.html"))
