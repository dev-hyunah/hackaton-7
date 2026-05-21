# Backend — Revenue Manager API

FastAPI 기반의 항공 운임 수익 관리 시스템 백엔드입니다.
SQLite DB를 사용하며 운임 관리, EMSRb 인벤토리 최적화, AI 추천(Groq LLM/Mock), 경쟁사 모니터링, 시뮬레이션, 보고서 API를 제공합니다.

---

## 기술 스택

| 항목 | 버전 | 용도 |
|------|------|------|
| Python | 3.11+ | 런타임 |
| FastAPI | 0.115 | API 프레임워크 |
| SQLAlchemy | 2.0 | ORM |
| SQLite | — | 개발용 데이터베이스 |
| Pydantic | 2.10 | 요청/응답 스키마 검증 |
| Uvicorn | 0.32 | ASGI 서버 |
| Groq API | — | AI 전략 분석 엔진 (llama-3.3-70b-versatile, 무료 티어, 현재 활성) |
| SciPy | 1.11+ | EMSRb 정규분포 계산 |
| pytest | 8.3 | 테스트 프레임워크 |
| python-dotenv | 1.0+ | 환경 변수 관리 |

---

## 디렉터리 구조

```
backend/
├── app/
│   ├── main.py                       # FastAPI 앱, CORS 미들웨어, 라우터 등록, SPA 서빙
│   ├── database.py                   # SQLAlchemy 엔진 및 세션 설정 (sqlite:///./rm_system.db)
│   ├── core/
│   │   └── pricing.py                # EMSRb 기반 운임 최적화 로직
│   ├── models/
│   │   └── models.py                 # ORM 모델 (Route, Flight, FareTier, ...)
│   ├── schemas/
│   │   └── schemas.py                # Pydantic 요청/응답 스키마
│   ├── repositories/
│   │   ├── fare_repository.py
│   │   ├── competitor_repository.py
│   │   └── price_history_repository.py
│   ├── services/
│   │   ├── fare_service.py
│   │   ├── ai_recommendation_service.py
│   │   ├── competitor_service.py
│   │   ├── simulation_service.py
│   │   └── report_service.py
│   └── routers/
│       ├── dashboard.py              # GET /dashboard/summary
│       ├── fare.py                   # GET|PUT /fares, PUT /fares/{id}/seats
│       ├── ai_recommendation.py      # GET|POST /recommendations
│       ├── competitor.py             # GET /competitors
│       ├── simulation.py             # POST /simulation/run
│       ├── report.py                 # POST /reports/generate
│       └── rm_optimize.py            # POST /api/rm/optimize (EMSRb 최적화)
├── tests/
│   └── test_fare_invariants.py       # Hypothesis PBT — 4/4 통과
├── requirements.txt
├── seed_data.py                      # 샘플 노선·항공편·운임 데이터 삽입
└── rm_system.db                      # SQLite DB 파일 (서버 기동 시 자동 생성)
```

> `ai_engine/` 디렉터리는 프로젝트 루트(`../ai_engine/`)에 위치합니다. `PYTHONPATH`에 루트 경로를 포함해야 import됩니다.

---

## 실행 환경

- Python 3.11 이상
- pip / venv

---

## 설치 및 실행

백엔드는 **`backend/` 디렉터리에서** 실행합니다. `ai_engine/` 모듈이 프로젝트 루트에 있으므로 `PYTHONPATH` 설정이 필수입니다.

```bash
# backend/ 디렉터리에서 실행
cd backend

# 가상환경 생성 및 활성화
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

# 의존성 설치
pip install -r requirements.txt

# 샘플 데이터 삽입 (최초 1회, 이미 데이터가 있으면 자동 스킵)
python seed_data.py

# 개발 서버 실행 (PYTHONPATH 설정 필수)
PYTHONPATH=.. uvicorn app.main:app --reload --port 8000
```

> **Windows PowerShell**:
> ```powershell
> $env:PYTHONPATH = ".."
> uvicorn app.main:app --reload --port 8000
> ```

실행 후 접근 주소:
- API Base: `http://localhost:8000`
- Swagger UI: `http://localhost:8000/docs`
- 헬스 체크: `http://localhost:8000/health`

---

## 환경 변수

`backend/.env` 파일을 생성하세요 (없어도 동작하지만 AI 분석은 Mock으로 대체됨).

| 변수명 | 설명 | 기본값 |
|--------|------|--------|
| `GROQ_API_KEY` | Groq AI 전략 분석 활성화 (무료 티어) | 미설정 시 MockAiEngine으로 자동 fallback |
| `GROQ_MODEL` | Groq 모델 ID | `llama-3.3-70b-versatile` |
| `ANTHROPIC_API_KEY` | Claude AI 전략 분석 (ClaudeAiEngine 교체 시) | 미사용 |
| `OLLAMA_BASE_URL` | Ollama 서버 주소 (OllamaAiEngine 사용 시) | `http://localhost:11434` |
| `OLLAMA_MODEL` | Ollama 모델 ID | `exaone3.5:7.8b` |

> **현재 상태**: `GROQ_API_KEY` 설정됨 — `llama-3.3-70b-versatile`로 AI 전략 분석 실호출 활성화.

---

## API 엔드포인트

### 헬스 체크
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/health` | 서버 상태 확인 (`{"status": "ok"}`) |

### 대시보드
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/dashboard/summary?route_id=GMP-CJU&days=7` | KPI 요약 (총 수익, 예약수, 탑승률, AI 추천 건수) |

### 운임 관리
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/fares/{route_id}?date=YYYY-MM-DD` | 노선·날짜별 운임 조회 |
| PUT | `/fares/{flight_id}` | 운임 수정 (`class_code`, `new_price`, `updated_by`) |
| PUT | `/fares/{flight_id}/seats` | 공급석 수정 (`class_code`, `new_total_seats`) |
| GET | `/fares/{flight_id}/history` | 운임 변경 이력 조회 |

> `flight_id`는 DB의 8자리 UUID 축약형 (예: `38ef2b87`) 또는 편명 (예: `KE1201`) 모두 허용.

### AI 추천
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/recommendations` | AI 추천 목록 조회 |
| POST | `/recommendations/{id}/approve` | AI 추천 승인 (운임에 즉시 반영) |
| POST | `/recommendations/{id}/reject` | AI 추천 거절 |
| POST | `/recommendations/strategy` | AI 전략 분석 요청 (자유 텍스트 이슈 입력) |

### 경쟁사 모니터링
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/competitors/{route_id}?date=YYYY-MM-DD` | 경쟁사 운임 목록 |
| GET | `/competitors/{route_id}/comparison?date=YYYY-MM-DD` | 자사 vs 경쟁사 운임 비교 |

### 시뮬레이션
| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/simulation/run` | 연료비·경쟁사 진입·가격 변동 시나리오 실행 |

### 보고서
| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/reports/generate` | 기간·노선별 수익 보고서 생성 |
| POST | `/reports/email` | 생성된 보고서 이메일 전송 |

### RM 최적화 (EMSRb)
| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/rm/optimize` | EMSRb 기반 좌석 인벤토리 최적화 추천 |
| POST | `/api/rm/simulate-scenario` | A/B/C 시나리오별 수익·수요 예측 |

전체 API 명세는 서버 실행 후 `http://localhost:8000/docs` 에서 확인하세요.

---

## 테스트

```bash
# backend/ 디렉터리에서 실행
source .venv/bin/activate
PYTHONPATH=.. pytest tests/
```

---

## 주요 비즈니스 규칙

- **BR-03**: AI 추천 가격은 현재 가격 대비 ±30% 범위 내로 제한
- **BR-10**: Sold Out 등급은 가격 수정 불가, 좌석 수만 수정 가능 (UI 레벨 강제)
- **BR-11**: 등급별 좌석 수 합계는 항공편 전체 좌석 수를 초과할 수 없음
- 운임 수정 시 `PriceHistory` 자동 기록 (change_type: MANUAL / AI)

---

## AI 엔진

`ai_engine/` 디렉터리에 위치하며 `AbstractAiEngine` 인터페이스로 추상화되어 있습니다.

| 기능 | 구현 엔진 | 현재 동작 |
|------|----------|----------|
| `analyze_strategy()` — AI 전략 분석 | GroqAiEngine | llama-3.3-70b-versatile 실호출 (GROQ_API_KEY 설정) |
| `generate_recommendation()` — 운임 추천 | MockAiEngine | 규칙형 Mock 동작 |

- **GroqAiEngine**: `GROQ_API_KEY` 설정 시 Groq 무료 API 실호출. **현재 활성 구현체**
- **OllamaAiEngine**: 로컬 Ollama 서버 연동 (기본 모델: `exaone3.5:7.8b`). 로컬 전용
- **ClaudeAiEngine**: `ANTHROPIC_API_KEY` 설정 시 Claude Sonnet 4.6 실호출. 현재 미사용
- **MockAiEngine**: 탑승률 기반 규칙형 추천. Fallback 구현체

**AI 분석 로그**: `backend/logs/ai_strategy.log` (요청·응답·소요시간·토큰 사용량 기록)

---

## 데이터베이스

`rm_system.db` 파일이 `backend/` 디렉터리에 생성됩니다 (`sqlite:///./rm_system.db`).

- 앱 최초 실행 시 `models.Base.metadata.create_all()`로 테이블 자동 생성
- `seed_data.py` 실행 시 9개 노선 × 90일 × 편수 = 4,050편, 16,200개 FareTier 삽입
- DB가 이미 데이터가 있으면 seed 자동 스킵 (중복 삽입 없음)

---

## 배포 (Docker / AWS App Runner)

```dockerfile
# Dockerfile 핵심 (프로젝트 루트 기준)
WORKDIR /app/backend
ENV PYTHONPATH=/app:/app/backend
CMD ["sh", "-c", "python seed_data.py && uvicorn app.main:app --host 0.0.0.0 --port 8080"]
```

`apprunner.yaml`은 프로젝트 루트에 위치하며 App Runner 자동 빌드·배포에 사용됩니다.
