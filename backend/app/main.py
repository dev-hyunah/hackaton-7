from __future__ import annotations
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import ValidationError
from dotenv import load_dotenv

load_dotenv()

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
