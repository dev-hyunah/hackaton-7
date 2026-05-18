# Backend — Revenue Manager API

FastAPI 기반의 항공 운임 수익 관리 시스템 백엔드입니다.
SQLite DB를 사용하며 운임 관리, AI 추천, 경쟁사 모니터링, 시뮬레이션, 보고서 API를 제공합니다.

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
| pytest | 8.3 | 테스트 프레임워크 |

---

## 디렉터리 구조

```
backend/
├── app/
│   ├── main.py               # FastAPI 앱 생성, 미들웨어, 라우터 등록
│   ├── database.py           # SQLAlchemy 엔진 및 세션 설정 (SQLite)
│   ├── models/
│   │   └── models.py         # ORM 모델 (Route, Flight, FareTier, ...)
│   ├── schemas/
│   │   └── schemas.py        # Pydantic 요청/응답 스키마
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
│       ├── dashboard.py      # GET /dashboard/summary
│       ├── fare.py           # GET|PUT /fares
│       ├── ai_recommendation.py
│       ├── competitor.py
│       ├── simulation.py
│       └── report.py
├── tests/
│   └── test_fare_invariants.py
├── requirements.txt
└── seed_data.py              # 샘플 노선·항공편·운임 데이터 삽입
```

---

## 실행 환경

- Python 3.11 이상
- pip / venv

---

## 설치 및 실행

```bash
# 가상환경 생성 및 활성화
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

# 의존성 설치
pip install -r requirements.txt

# (선택) 샘플 데이터 삽입
python seed_data.py

# 개발 서버 실행 (auto-reload)
uvicorn app.main:app --reload --port 8000
```

---

## API 엔드포인트

### 헬스 체크
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/health` | 서버 상태 확인 |

### 대시보드
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/dashboard/summary` | KPI 요약 (총 수익, 예약수, 탑승률, AI 추천 건수) |

### 운임 관리
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/fares/{route_id}?date=YYYY-MM-DD` | 노선·날짜별 운임 조회 |
| PUT | `/fares/{flight_id}` | 운임 수정 |
| GET | `/fares/{flight_id}/history` | 운임 변경 이력 조회 |

### AI 추천
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/ai-recommendation` | 추천 목록 조회 |
| POST | `/ai-recommendation/generate` | 추천 생성 (항공편·클래스 지정) |
| PATCH | `/ai-recommendation/{id}/approve` | 추천 승인 (운임에 반영) |
| PATCH | `/ai-recommendation/{id}/reject` | 추천 거절 |

### 경쟁사 모니터링
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/competitor` | 경쟁사 운임 목록 조회 |

### 시뮬레이션
| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/simulation/run` | 시뮬레이션 실행 |

### 보고서
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/report` | 수익 보고서 조회 |

전체 API 명세는 서버 실행 후 `http://localhost:8000/docs` 에서 확인하세요.

---

## 테스트

```bash
pytest tests/
```

---

## 주요 비즈니스 규칙

- **BR-01**: 운임 수정 시 변경 이력(`PriceHistory`)이 자동 기록됩니다.
- **BR-02**: AI 추천 승인 시 해당 운임이 추천 가격으로 즉시 갱신됩니다.
- **BR-03**: AI 추천 가격은 현재 가격 대비 ±30% 범위 내로 제한됩니다.

---

## 데이터베이스

개발 환경에서는 SQLite(`rm_system.db`)를 사용합니다.
앱 최초 실행 시 `models.Base.metadata.create_all()` 로 테이블이 자동 생성됩니다.
`seed_data.py` 를 실행하면 샘플 노선·항공편·운임 데이터가 삽입됩니다.
