# 아키텍처 설계서 (Architecture Design Document)

**프로젝트**: Revenue Manager — 항공 운임 수익 관리 시스템  
**버전**: v7 (최종)  
**작성일**: 2026-05-21  
**작성 방법론**: AIDLC (AI-Driven Development Lifecycle)

---

## 목차

1. [아키텍처 개요](#1-아키텍처-개요)
2. [아키텍처 결정 기록 (ADR)](#2-아키텍처-결정-기록-adr)
3. [시스템 아키텍처 다이어그램](#3-시스템-아키텍처-다이어그램)
4. [레이어 아키텍처](#4-레이어-아키텍처)
5. [컴포넌트 아키텍처](#5-컴포넌트-아키텍처)
6. [데이터 아키텍처](#6-데이터-아키텍처)
7. [인프라 아키텍처](#7-인프라-아키텍처)
8. [보안 아키텍처](#8-보안-아키텍처)
9. [배포 아키텍처](#9-배포-아키텍처)
10. [품질 속성 (Quality Attributes)](#10-품질-속성)

---

## 1. 아키텍처 개요

### 1.1 아키텍처 스타일

Revenue Manager는 **모놀리식 멀티티어(Monolithic Multi-Tier)** 아키텍처를 채택한다.

```
┌─────────────────────────────────────────────────────────────────┐
│              단일 Docker 컨테이너 (Monolith)                     │
│                                                                 │
│  ┌─────────────┐    ┌─────────────────┐    ┌────────────────┐  │
│  │  Tier 1     │    │    Tier 2        │    │    Tier 3      │  │
│  │ Presentation│───▶│   Application   │───▶│     Data       │  │
│  │ (React SPA) │    │   (FastAPI)     │    │   (SQLite)     │  │
│  └─────────────┘    └─────────────────┘    └────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                    External: Anthropic API
```

### 1.2 선택 근거

| 대안 | 비교 | 결정 |
|---|---|---|
| Microservices | 운영 복잡도↑, 해커톤 범위 초과 | ✗ 미채택 |
| **Monolith** | 빠른 개발, 단일 배포, 데모 목적 적합 | ✓ **채택** |
| Serverless | Cold Start, DB 연결 문제 | ✗ 미채택 |

### 1.3 핵심 아키텍처 원칙

1. **단순성 우선**: 해커톤 데모 목적 — 불필요한 복잡도 배제
2. **계층 분리**: Router → Service → Repository → DB 엄격한 단방향 의존
3. **타입 안전성**: TypeScript strict + Pydantic 100% 적용
4. **교체 가능성**: Strategy Pattern으로 AI Engine 런타임 교체 지원
5. **단일 진입점**: 프론트엔드·백엔드 단일 포트(8080) 서빙

---

## 2. 아키텍처 결정 기록 (ADR)

### ADR-001: 단일 컨테이너 모놀리식 배포

- **결정**: React SPA + FastAPI를 단일 Docker 컨테이너로 배포
- **이유**: 해커톤 기간 내 배포 파이프라인 단순화, App Runner 단일 서비스 운용
- **결과**: FastAPI `StaticFiles`로 React 빌드 산출물 직접 서빙
- **트레이드오프**: 프론트·백엔드 독립 배포 불가 (허용 수준)

### ADR-002: SQLite 선택 (RDS 미사용)

- **결정**: 컨테이너 내부 SQLite 사용
- **이유**: 외부 DB 프로비저닝 불필요, seed_data.py로 즉시 복원 가능
- **결과**: 컨테이너 재시작 시 데이터 초기화 (데모 시연 중 재배포 금지)
- **트레이드오프**: 데이터 영속성 없음 (허용 수준 — 데모용)

### ADR-003: Strategy Pattern for AI Engine

- **결정**: `AbstractAiEngine` 인터페이스로 Claude API ↔ Mock 교체 가능
- **이유**: 개발 중 API Key 없이 Mock으로 동작, 배포 시 실제 API 전환
- **결과**: `MockAiEngine` (오프라인), `ClaudeAiEngine` (프로덕션) 동일 인터페이스
- **트레이드오프**: 추상화 계층 1개 추가 (무시 가능)

### ADR-004: History API 라우팅 (Hash 제거)

- **결정**: `/#/fares` 대신 `/fares` pathname 방식 채택
- **이유**: URL 가독성, 새로고침 시 상세 페이지 유지 (UX 개선)
- **결과**: App Runner에서 모든 경로 → `index.html` fallback 처리 필요
- **구현**: FastAPI catch-all 라우트 `/{full_path:path}` → `index.html` 반환

### ADR-005: CSS hidden 탭 렌더링 (언마운트 방지)

- **결정**: App.tsx에서 각 탭 컴포넌트를 조건부 렌더링(`&&`) 대신 `className={active ? "" : "hidden"}` 방식으로 항상 마운트 유지
- **이유**: 탭 전환 시 컴포넌트가 언마운트되면 FareManagement의 `appliedFlights`, `confirmedClasses`, `routeDateCache`, `step`, `selectedFlight` 등 로컬 상태가 초기화됨
- **결과**: 모든 탭 컴포넌트는 앱 실행 시 한 번만 마운트되고, 이후 CSS `hidden` 클래스로 표시/숨김만 전환
- **트레이드오프**: 초기 렌더링 시 모든 탭 컴포넌트가 동시에 마운트됨 (해커톤 규모에서 무시 가능)

### ADR-007: Property-Based Testing 도입

- **결정**: 가격 불변 속성 검증에 Hypothesis PBT 적용
- **이유**: 운임 계층 규칙(BR-01, BR-04, BR-08)은 수천 가지 입력 조합 검증 필요
- **결과**: `test_fare_invariants.py` — 4/4 불변 속성 테스트 통과
- **트레이드오프**: 일반 Unit Test 대비 설정 복잡도 소폭 증가

---

## 3. 시스템 아키텍처 다이어그램

### 3.1 전체 시스템 뷰

```
┌────────────────────────────────────────────────────────────────────┐
│                         사용자 환경                                │
│                                                                    │
│   Revenue Manager (김수익)                                         │
│   Chrome Browser                                                   │
└──────────────────────────────┬─────────────────────────────────────┘
                               │ HTTPS 443
                               ▼
┌────────────────────────────────────────────────────────────────────┐
│                   AWS Cloud (us-east-1)                           │
│                                                                    │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │              AWS App Runner                                 │  │
│  │         up8msmtgyc.us-east-1.awsapprunner.com               │  │
│  │                                                             │  │
│  │  ┌───────────────────────────────────────────────────────┐  │  │
│  │  │           Docker Container (:8080)                    │  │  │
│  │  │                                                       │  │  │
│  │  │  ┌─────────────┐     ┌────────────────────────────┐  │  │  │
│  │  │  │  React SPA  │     │       FastAPI               │  │  │  │
│  │  │  │  (static/)  │◄────│  Router → Service → Repo   │  │  │  │
│  │  │  └─────────────┘     └──────────────┬─────────────┘  │  │  │
│  │  │                                     │                 │  │  │
│  │  │                      ┌──────────────▼─────────────┐  │  │  │
│  │  │                      │     SQLite (파일시스템)     │  │  │  │
│  │  │                      │  routes / flights /         │  │  │  │
│  │  │                      │  fare_tiers / histories    │  │  │  │
│  │  │                      └────────────────────────────┘  │  │  │
│  │  │                                                       │  │  │
│  │  │  ┌─────────────────────────────────────────────────┐  │  │  │
│  │  │  │         AI Engine (Strategy Pattern)            │  │  │  │
│  │  │  │  ClaudeAiEngine ──► 외부 Anthropic API          │  │  │  │
│  │  │  │  MockAiEngine   ──► 로컬 Mock (Fallback)        │  │  │  │
│  │  │  └─────────────────────────────────────────────────┘  │  │  │
│  │  └───────────────────────────────────────────────────────┘  │  │
│  │                                                             │  │
│  │  IAM Role: hackathon-apprunner-ecr-role                     │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │              AWS ECR                                        │  │
│  │  362353307746.dkr.ecr.us-east-1.amazonaws.com/hackathon-app │  │
│  │  hackathon-app:latest (AES256 암호화)                        │  │
│  └─────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
                               │ HTTPS
                               ▼
┌────────────────────────────────────────────────────────────────────┐
│                 External Services                                  │
│                                                                    │
│  Anthropic Claude API                                              │
│  Model: Claude Sonnet 4.6                                          │
│  Auth: ANTHROPIC_API_KEY (환경변수)                                 │
└────────────────────────────────────────────────────────────────────┘
```

### 3.2 요청 처리 흐름

```
브라우저 (HTTPS)
       │
       ├─ GET /                → React index.html
       ├─ GET /fares           → React index.html (SPA)
       ├─ GET /assets/*.js     → React 번들 파일
       ├─ GET /api/fares/...   → FastAPI Router
       ├─ POST /api/ai/...     → FastAPI → Claude API
       └─ GET /health          → FastAPI 헬스 체크
```

---

## 4. 레이어 아키텍처

### 4.1 Frontend 레이어 구조

```
┌──────────────────────────────────────────────────────────┐
│                  View Layer (Pages)                      │
│  Dashboard │ FareManagement │ Competitor │ Simulator │ Report  │
├──────────────────────────────────────────────────────────┤
│                  State Layer (Zustand)                   │
│  flightsStore │ dashboardStore │ fareStore │ aiRecStore │ ...  │
├──────────────────────────────────────────────────────────┤
│                  API Layer (ApiClient)                   │
│  GET/POST/PUT → REST JSON → Backend                      │
├──────────────────────────────────────────────────────────┤
│                  Type Layer (TypeScript)                 │
│  types/index.ts — 모든 DTO 인터페이스 정의               │
└──────────────────────────────────────────────────────────┘
```

**단방향 의존**: View → State → API → Type (역방향 의존 금지)

### 4.2 Backend 레이어 구조

```
┌──────────────────────────────────────────────────────────┐
│              HTTP Transport Layer                        │
│  uvicorn (ASGI) + FastAPI middleware                     │
│  CORS, StaticFiles, Exception Handler                    │
├──────────────────────────────────────────────────────────┤
│              Router Layer                                │
│  Pydantic 자동 검증 (LC-01)                               │
│  /fares / /recommendations / /simulation / ...           │
├──────────────────────────────────────────────────────────┤
│              Service Layer                               │
│  Business Rule Validation (LC-02)                        │
│  PriceHistory 자동 기록 (LC-03)                           │
│  FareService │ AiRecService │ SimulationService │ ...     │
├──────────────────────────────────────────────────────────┤
│              Repository Layer                            │
│  SQLAlchemy Session 관리                                  │
│  FareRepository │ PriceHistRepo │ CompetitorRepo          │
├──────────────────────────────────────────────────────────┤
│              ORM Layer (SQLAlchemy 2.0)                  │
│  Models: Route │ Flight │ FareTier │ PriceHistory │ ...  │
├──────────────────────────────────────────────────────────┤
│              Database Layer (SQLite)                     │
│  6개 테이블 │ seed_data.py 초기 데이터                    │
└──────────────────────────────────────────────────────────┘
```

**단방향 의존**: Router → Service → Repository → ORM → DB (역방향 금지)

### 4.3 레이어 간 통신 규약

| 경계 | 프로토콜 | 포맷 |
|---|---|---|
| Browser ↔ FastAPI | HTTPS | JSON (REST) |
| FastAPI ↔ SQLite | SQLAlchemy ORM | Python 객체 |
| FastAPI ↔ Anthropic | HTTPS | JSON (SDK) |
| Router ↔ Service | Python 함수 호출 | Pydantic Schema |
| Service ↔ Repository | Python 함수 호출 | SQLAlchemy Model |

---

## 5. 컴포넌트 아키텍처

### 5.1 Frontend 컴포넌트 계층도

```
App (최상위 라우터)
├── Dashboard
│   ├── RevenueSummaryCard
│   ├── RouteRevenueChart (Recharts BarChart)
│   ├── ClassLfChart (Recharts BarChart)
│   └── AiRecommendationBadge
│
├── FareManagement
│   ├── Step1: FlightSelector
│   │   ├── DatePicker
│   │   ├── RoutePicker
│   │   └── FlightList
│   └── Step2: FareEditor
│       ├── ClassEditCard (4개 Tier, AI 추천 상세보기 내장)
│       ├── SeatMap (기종별 배치도 — B737-900ER/B737-800/A220-300)
│       └── InventoryLogModal (PriceHistory 팝업)
│
├── CompetitorMonitor
│   └── PriceComparisonTable
│
├── Simulator
│   ├── SliderPanel (유가/환율/운임)
│   ├── SimulationResultChart
│   └── SimulationResultModal
│
└── Report
    ├── ReportParamsForm
    ├── ReportPreview
    └── ExportButtons (PDF / DOCX / Email)
```

### 5.2 Backend 컴포넌트 계층도

```
FastAPI Application (main.py)
├── Middleware
│   ├── CORSMiddleware (allow_origins=["*"])
│   └── ValidationExceptionHandler
│
├── Routers (7개)
│   ├── DashboardRouter → DashboardService
│   ├── FareRouter → FareService
│   ├── RecommendationRouter → AiRecommendationService
│   ├── CompetitorRouter → CompetitorService
│   ├── SimulationRouter → SimulationService
│   ├── ReportRouter → ReportService
│   └── RmRouter → RmOptimizeService (EMSRb)
│
├── Services (5개)
│   ├── FareService
│   │   ├── FareRepository
│   │   ├── PriceHistoryRepository
│   │   └── BusinessRuleValidator (LC-02)
│   ├── AiRecommendationService
│   │   └── AbstractAiEngine
│   │       ├── ClaudeAiEngine → Anthropic API
│   │       └── MockAiEngine
│   ├── SimulationService
│   │   └── AbstractSimulationEngine
│   │       └── MockSimulationEngine
│   ├── CompetitorService
│   │   └── CompetitorRepository
│   └── ReportService
│       └── FareRepository (읽기 전용)
│
└── StaticFiles + SPA Fallback
    └── /static/ → React dist/
```

### 5.3 AI Engine 컴포넌트 구조

```
AbstractAiEngine (인터페이스)
      │
      ├── ClaudeAiEngine
      │   ├── Anthropic SDK 초기화 (ANTHROPIC_API_KEY)
      │   ├── 프롬프트 구성 (노선·시즌·운임·경쟁 컨텍스트)
      │   ├── Claude Sonnet 4.6 API 호출
      │   └── 응답 파싱 (4개 등급별 가격·근거)
      │
      └── MockAiEngine
          ├── 규칙 기반 추천 (현재가 ±10~20%)
          ├── L/F 기반 가중치 조정
          └── 랜덤 신뢰도 생성

AbstractSimulationEngine (인터페이스)
      │
      └── MockSimulationEngine
          ├── 탄력성 계수 (클래스별 실측 기반)
          │   (C: -0.45, Y: -0.95, M: -1.35, V: -1.75)
          ├── 유가·환율·가격 변동 복합 계산
          └── 의사난수 시드 고정 (재현 가능)
```

---

## 6. 데이터 아키텍처

### 6.1 데이터 흐름 다이어그램

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│  seed_data  │────▶│   SQLite DB  │────▶│  Repository  │
│ (초기화)    │     │  (6 tables)  │     │  (ORM 추상화) │
└─────────────┘     └──────────────┘     └──────┬───────┘
                                                 │
                                    ┌────────────▼────────────┐
                                    │       Service Layer      │
                                    │  비즈니스 로직 + 검증   │
                                    └────────────┬────────────┘
                                                 │
                                    ┌────────────▼────────────┐
                                    │      Router Layer        │
                                    │   Pydantic 직렬화        │
                                    └────────────┬────────────┘
                                                 │ JSON
                                    ┌────────────▼────────────┐
                                    │   Frontend (Zustand)     │
                                    │   타입 안전 상태 관리    │
                                    └─────────────────────────┘
```

### 6.2 주요 데이터 흐름 시나리오

#### 시나리오 1: 운임 수정

```
1. [FareManagement] 담당자가 프레스티지 운임 입력
2. [fareStore] updateFare() 호출
3. [ApiClient] PUT /api/fares/{flightId} 전송
4. [FareRouter] Pydantic 검증 (class_code, new_price > 0)
5. [FareService] BR-01, BR-04, BR-08 비즈니스 규칙 검증
6. [FareRepository] fare_tiers 테이블 UPDATE
7. [PriceHistoryRepository] price_histories INSERT (change_type=MANUAL)
8. [FareRouter] { success: true } 응답
9. [fareStore] 로컬 상태 업데이트 → UI 재렌더링
```

#### 시나리오 2: AI 추천 승인

```
1. [AiRecommendations] 담당자가 추천 카드 승인 클릭
2. [aiRecStore] approveRecommendation(id) 호출
3. [ApiClient] POST /api/recommendations/{id}/approve 전송
4. [RecommendationRouter] Pydantic 검증
5. [AiRecommendationService] AiRecommendation.status → APPROVED
6. [FareService] FareTier.current_price → recommended_price 즉시 반영
7. [PriceHistoryRepository] price_histories INSERT (change_type=AI)
8. [RecommendationRouter] { success: true, new_price } 응답
9. [aiRecStore] 추천 목록에서 해당 항목 제거
```

#### 시나리오 3: 시뮬레이션 실행

```
1. [Simulator] 슬라이더 조정 → "시뮬레이션 실행" 버튼
2. [simulationStore] runSimulation(params) 호출
3. [ApiClient] POST /api/simulation/run 전송
4. [SimulationRouter] Pydantic 검증 (범위 검증 포함)
5. [SimulationService] MockSimulationEngine.run(params)
   - IATA 탄력성 계수 적용
   - 유가·환율·가격 복합 영향 계산
   - 등급별 수요·수익 변화 산출
6. [SimulationRouter] SimulationResultDTO 응답
7. [simulationStore] result, showModal=true 업데이트
8. [SimulationResultModal] 팝업 표시
```

#### 시나리오 4: FareManagement → Dashboard 실시간 연동

```
1. [FareManagement] 운임 수정 또는 AI 추천 적용
2. [setFlightsAndSync] setFlightsForRoute(route, updatedFlights) 호출
3. [flightsStore] flightsByRoute[route] 업데이트
4. [Dashboard] flightsByRoute 구독 → useMemo로 KPI 자동 재계산
5. [Dashboard UI] 수익·LF 수치 즉시 반영
```

### 6.3 데이터 영속성 전략

| 데이터 유형 | 저장소 | 영속성 | 비고 |
|---|---|---|---|
| 운항편·운임 | SQLite | 컨테이너 수명 | 재시작 시 seed_data.py 복원 |
| 가격 변경 이력 | SQLite | 컨테이너 수명 | 운임 수정 시 자동 기록 |
| AI 추천 이력 | SQLite | 컨테이너 수명 | 승인/거부 상태 포함 |
| 경쟁사 가격 | SQLite | 컨테이너 수명 | seed_data.py 생성 |
| 프론트 상태 | Zustand (메모리) | 브라우저 탭 수명 | 새로고침 시 초기화 |

---

## 7. 인프라 아키텍처

### 7.1 AWS 인프라 구성

```
┌─────────────────────────────────────────────────────────────────┐
│                    AWS us-east-1                                │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                  App Runner Service                       │  │
│  │                  hackathon-app                            │  │
│  │                                                           │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │             Task (컨테이너 인스턴스)                 │  │  │
│  │  │  CPU: 1 vCPU  |  Memory: 2 GB                       │  │  │
│  │  │  Port: 8080                                         │  │  │
│  │  │  Min Instances: 1                                   │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │                                                           │  │
│  │  Auto Scaling: Default (Max 25 instances)                 │  │
│  │  Auto Deploy: Disabled                                    │  │
│  │  TLS: 자동 관리                                            │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                  ECR Repository                           │  │
│  │  hackathon-app:latest                                     │  │
│  │  암호화: AES256                                            │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                  IAM                                      │  │
│  │  hackathon-apprunner-ecr-role                             │  │
│  │  권한: ECR Pull (최소 권한 원칙)                           │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 네트워크 아키텍처

```
Internet
   │ 443 (HTTPS)
   ▼
App Runner Public Endpoint
   │ TLS Termination (자동)
   │ 8080 (HTTP 내부)
   ▼
Docker Container
   ├─ /api/*  → FastAPI uvicorn
   ├─ /health → FastAPI health
   ├─ /assets → Static Files
   └─ /*      → index.html (SPA)
```

| 레이어 | 포트 | 프로토콜 | 비고 |
|---|---|---|---|
| 외부 (인터넷) | 443 | HTTPS | App Runner 자동 TLS |
| App Runner 내부 | 8080 | HTTP | 컨테이너 포트 |
| uvicorn | 0.0.0.0:8080 | HTTP | `--host 0.0.0.0 --port 8080` |

### 7.3 컨테이너 아키텍처

**멀티스테이지 빌드 전략**:

```dockerfile
# Stage 1: Frontend Build
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci                           # 의존성 캐시 레이어
COPY frontend/ ./
RUN npm run build                    # → dist/ 생성

# Stage 2: Production Image
FROM python:3.11-slim
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt   # 의존성 캐시 레이어
COPY backend/ ./backend/
COPY ai_engine/ ./ai_engine/
COPY --from=frontend-builder /app/frontend/dist ./static/
WORKDIR /app/backend
ENV PYTHONPATH=/app:/app/backend
CMD ["sh", "-c", "python seed_data.py && uvicorn app.main:app --host 0.0.0.0 --port 8080"]
```

**빌드 최적화**:
- `package*.json` 먼저 COPY → npm ci 레이어 캐싱
- `requirements.txt` 먼저 COPY → pip install 레이어 캐싱
- 소스 변경 시 의존성 레이어 재사용 → 빌드 속도 향상

---

## 8. 보안 아키텍처

### 8.1 보안 결정 개요

> **⚠️ 중요**: 현재 구현은 해커톤 데모 목적으로 보안 설정이 최소화되어 있다.
> 프로덕션 전환 시 아래 "권고사항"을 반드시 적용해야 한다.

| 보안 항목 | 현재 설정 | 프로덕션 권고 |
|---|---|---|
| 인증/인가 | 없음 (공개 접근) | JWT + Cognito |
| API Key 관리 | 환경변수 직접 설정 | AWS Secrets Manager |
| CORS | `allow_origins=["*"]` | 특정 도메인만 허용 |
| HTTPS | App Runner 자동 TLS | 유지 |
| SQL Injection | SQLAlchemy ORM 자동 방지 | 유지 |
| 이미지 스캔 | Disabled | ECR scanOnPush: true |
| WAF | 없음 | AWS WAF 적용 |

### 8.2 현재 적용된 보안 조치

```
1. TLS/HTTPS
   - App Runner 자동 인증서 관리
   - 모든 외부 통신 암호화

2. SQL Injection 방지
   - SQLAlchemy ORM 파라미터 바인딩
   - 직접 SQL 문자열 조합 금지

3. 입력 검증
   - Pydantic BaseModel 타입 강제
   - 범위 검증 (가격 > 0, L/F 0~100)

4. IAM 최소 권한
   - hackathon-apprunner-ecr-role: ECR Pull 권한만 부여
   - 불필요한 AWS 서비스 접근 없음

5. 이미지 암호화
   - ECR AES256 저장 암호화
```

---

## 9. 배포 아키텍처

### 9.1 배포 파이프라인 (수동)

```
개발자 워크스테이션 (macOS)
         │
         │ 1. docker build --platform linux/amd64 -t hackathon-app:latest .
         │    (멀티스테이지: Node.js 빌드 + Python 실행)
         │
         ▼
    Docker Image
         │
         │ 2. aws ecr get-login-password | docker login ...
         │ 3. docker tag ... && docker push ...
         │
         ▼
    AWS ECR (hackathon-app:latest)
         │
         │ 4. aws apprunner start-deployment --service-arn ...
         │
         ▼
    AWS App Runner
         │ 이미지 Pull → 컨테이너 교체 (약 2~3분)
         │ seed_data.py 자동 실행 → uvicorn 시작
         │
         ▼
    RUNNING (서비스 운영 재개)
```

### 9.2 배포 소요 시간

| 단계 | 소요 시간 |
|---|---|
| Docker 빌드 | 약 30~60초 (캐시 활용 시 단축) |
| ECR 푸시 | 약 30~60초 (변경 레이어만 전송) |
| App Runner 재배포 | 약 2~3분 |
| seed_data.py 실행 | 약 10~20초 |
| **전체** | **약 4~6분** |

### 9.3 롤백 전략

현재 롤백 전략 없음 (`latest` 태그 단일 운용).

프로덕션 전환 시 권고:
```bash
# 이전 이미지 태그 유지
docker tag hackathon-app:latest \
  362353307746.dkr.ecr.us-east-1.amazonaws.com/hackathon-app:v$(date +%Y%m%d%H%M)

# 롤백 시
aws apprunner update-service \
  --service-arn ... \
  --source-configuration ImageRepository.ImageIdentifier=...hackathon-app:v20260520xxxx
```

### 9.4 환경 변수 관리

| 변수 | 설정 위치 | 비고 |
|---|---|---|
| `PYTHONPATH` | Dockerfile ENV | `/app:/app/backend` 고정 |
| `ANTHROPIC_API_KEY` | App Runner 환경변수 | 콘솔 또는 CLI로 설정 |

---

## 10. 품질 속성

### 10.1 성능 (Performance)

| 항목 | 현재 수준 | 측정 기준 |
|---|---|---|
| API 응답 시간 | < 1초 (SQLite, 단일 사용자) | 체감 기준 |
| 페이지 로드 | < 2초 (캐시 활용) | App Runner CDN 없음 |
| Claude API | 2~5초 (네트워크 의존) | Anthropic 서버 응답 |
| Docker 빌드 | ~60초 (레이어 캐시) | 변경 레이어 최소화 |

### 10.2 가용성 (Availability)

| 항목 | 현재 수준 |
|---|---|
| 목표 가용성 | 데모 기간 중 정상 운영 |
| 자동 재시작 | App Runner 기본 설정 |
| 헬스 체크 | `GET /health` → 200 OK |
| 최소 인스턴스 | 1 (Cold Start 없음) |

### 10.3 유지보수성 (Maintainability)

| 항목 | 설계 결정 |
|---|---|
| 계층 분리 | Router → Service → Repository → DB (단방향) |
| 타입 안전성 | TypeScript strict + Pydantic 100% |
| 모듈화 | 기능별 파일 분리 (6개 라우터, 5개 서비스) |
| 테스트 | PBT 4/4 통과, TypeScript 0 오류 |

### 10.4 확장성 (Scalability)

| 항목 | 현재 | 확장 방향 |
|---|---|---|
| 컴퓨팅 | App Runner Auto Scaling | 인스턴스 수 조정 |
| 데이터베이스 | SQLite (단일 파일) | RDS PostgreSQL 전환 |
| 캐싱 | 없음 | Redis ElastiCache |
| CDN | 없음 | CloudFront 정적 파일 |

### 10.5 테스트 가능성 (Testability)

| 레이어 | 테스트 방식 |
|---|---|
| 가격 불변 속성 | Hypothesis PBT (4개 속성, 4/4 통과) |
| API 엔드포인트 | FastAPI TestClient (수동 확인) |
| Frontend 타입 | TypeScript 컴파일 (0 오류) |
| 빌드 검증 | `npm run build` 성공 확인 |

---

## 부록: 기술 스택 전체 목록

| 계층 | 기술 | 버전 | 역할 |
|---|---|---|---|
| Frontend | React | 19 | UI 프레임워크 |
| Frontend | TypeScript | 6 | 타입 안전성 |
| Frontend | Vite | 6+ | 빌드·개발 서버 |
| Frontend | Zustand | 5 | 전역 상태 관리 |
| Frontend | Tailwind CSS | 4 | 스타일링 |
| Frontend | Recharts | 3 | 차트 컴포넌트 |
| Frontend | jsPDF + html-to-image | - | PDF 생성 (oklch 색상 호환) |
| Frontend | docx | - | DOCX 생성 |
| Backend | Python | 3.11 | 서버 언어 |
| Backend | FastAPI | 0.115 | REST API 프레임워크 |
| Backend | SQLAlchemy | 2.0 | ORM |
| Backend | SQLite | 3 | 데이터베이스 |
| Backend | Pydantic | 2.10 | 데이터 검증 |
| Backend | scipy | - | EMSRb 수치 계산 |
| Backend | uvicorn | - | ASGI 서버 |
| AI | Anthropic SDK | - | Claude API 클라이언트 |
| AI | Claude Sonnet 4.6 | - | 가격 추천 LLM |
| Testing | Hypothesis | - | Property-Based Testing |
| Testing | pytest | - | 테스트 프레임워크 |
| Infra | Docker | - | 컨테이너화 |
| Infra | AWS App Runner | - | 컨테이너 실행 서비스 |
| Infra | AWS ECR | - | 컨테이너 이미지 레지스트리 |
| Infra | AWS IAM | - | 접근 제어 |
