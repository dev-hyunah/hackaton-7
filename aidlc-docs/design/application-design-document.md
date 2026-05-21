# 애플리케이션 설계서 (Application Design Document)

**프로젝트**: Revenue Manager — 항공 운임 수익 관리 시스템  
**버전**: v7 (최종)  
**작성일**: 2026-05-21  
**작성 방법론**: AIDLC (AI-Driven Development Lifecycle)

---

## 목차

1. [시스템 개요](#1-시스템-개요)
2. [사용자 및 페르소나](#2-사용자-및-페르소나)
3. [기능 요구사항 요약](#3-기능-요구사항-요약)
4. [애플리케이션 컴포넌트 구조](#4-애플리케이션-컴포넌트-구조)
5. [Frontend 설계](#5-frontend-설계)
6. [Backend 설계](#6-backend-설계)
7. [AI Engine 설계](#7-ai-engine-설계)
8. [데이터 모델](#8-데이터-모델)
9. [비즈니스 규칙](#9-비즈니스-규칙)
10. [API 명세](#10-api-명세)
11. [비기능 요구사항 설계](#11-비기능-요구사항-설계)
12. [설계 패턴](#12-설계-패턴)

---

## 1. 시스템 개요

### 1.1 목적

Revenue Manager는 항공사 수익관리(RM) 담당자가 노선별 운임을 실시간으로 조회·수정하고, AI 기반 가격 추천으로 수익을 극대화하는 웹 기반 통합 관리 플랫폼이다.

### 1.2 핵심 가치 제안

| 기능 영역 | 가치 |
|---|---|
| AI 전략 분석 | 돌발 이슈 입력 시 Claude AI가 등급별 차별화 가격 즉시 제안 |
| EMSRb 알고리즘 | 통계 기반 최적 좌석 배분으로 수익 극대화 |
| What-if 시뮬레이터 | 유가·환율·운임 변동 시나리오 실시간 분석 |
| 자동 보고서 | PDF·DOCX·이메일 자동 생성 |

### 1.3 시스템 범위

- **운항 노선**: 국내선 9개 노선 (GMP-CJU, GMP-PUS, GMP-TAE, GMP-KWJ, ICN-CJU, ICN-PUS, GMP-KPO, GMP-RSU, GMP-CJJ)
- **기종**: B737-900 (좌석 173석 — 프레스티지 8석 + 이코노미 165석)
- **운임 클래스**: 4개 Tier (프레스티지 / 일반 정상 / 일반 할인 / 특가)
- **데이터 범위**: 항공편 4,050개 · 좌석 16,200개 · 경쟁사 가격 2,430개

---

## 2. 사용자 및 페르소나

### 2.1 주요 페르소나: Revenue Manager (김수익)

| 항목 | 내용 |
|---|---|
| 역할 | 항공사 수익관리 담당자 |
| 경력 | 5년 이상 운임 관리 전문가 |
| 목표 | 노선별 수익과 탑승률(L/F) 동시 최적화 |
| 주요 업무 | 가격 정책 수립, AI 추천 검토·승인/거부, 수익 모니터링 |
| 사용 빈도 | 매일 다수 회 |
| 동시 접속자 | 최대 10명 이하 (해커톤 기준: 1명) |

### 2.2 User Journey 및 Stories

| Journey | Stories | 수 |
|---|---|---|
| Journey 1 | 운임 조회 & 관리 | 3개 |
| Journey 2 | AI 가격 추천 적용 | 3개 |
| Journey 3 | 경쟁사 모니터링 | 3개 |
| Journey 4 | What-if 시뮬레이션 | 3개 |
| Journey 5 | 수익 보고서 생성 | 3개 |
| **합계** | | **15개** |

---

## 3. 기능 요구사항 요약

| ID | 기능 요구사항 | 구현 컴포넌트 |
|---|---|---|
| FR-01 | 노선별 항공편 조회 및 운임 관리 | FareManagement, /api/fares |
| FR-02 | 좌석 클래스별 운임·공급석 수정 | FareManagement, FareService |
| FR-03 | AI 기반 실시간 가격 추천 | AiRecommendations, ClaudeAiEngine |
| FR-04 | 경쟁사 운임 모니터링 | CompetitorMonitor, /api/competitors |
| FR-05 | What-if 시뮬레이션 | Simulator, SimulationService |
| FR-06 | 수익 대시보드 & KPI 현황 | Dashboard, /api/dashboard |
| FR-07 | 보고서 자동 생성 (PDF) | Report, ReportService |
| FR-08 | EMSRb 좌석 자동 배분 | /api/rm/optimize, EMSRb 알고리즘 |
| FR-09 | 기내 좌석 배치도 시각화 | FareManagement SeatMap |
| FR-10 | 인벤토리 변경 로그 팝업 | FareManagement, PriceHistoryRepository |
| FR-11 | 가격 변경 이력 추적 | PriceHistory, LC-03 |

---

## 4. 애플리케이션 컴포넌트 구조

### 4.1 전체 컴포넌트 개요

```
┌─────────────────────────────────────────────────────────┐
│                  FRONTEND (React/TS)                    │
│                                                         │
│  Pages         Stores (Zustand)    Shared               │
│  ├─ Dashboard  ├─ dashboardStore   ├─ ApiClient         │
│  ├─ FareMgmt   ├─ fareStore        └─ Types (index.ts)  │
│  ├─ AiRec      ├─ aiRecStore                            │
│  ├─ Competitor ├─ simulationStore                       │
│  ├─ Simulator  └─ reportStore                           │
│  └─ Report                                              │
└─────────────────────────────────────────────────────────┘
                         │ HTTPS / REST JSON
┌─────────────────────────────────────────────────────────┐
│                  BACKEND (FastAPI/Python)                │
│                                                         │
│  Routers           Services          Repositories       │
│  ├─ /dashboard     ├─ FareService    ├─ FareRepo        │
│  ├─ /fares         ├─ AiRecService   ├─ PriceHistRepo   │
│  ├─ /recommendations├─ CompetitorSvc └─ CompetitorRepo  │
│  ├─ /competitors   ├─ SimulationSvc                     │
│  ├─ /simulation    └─ ReportService                     │
│  ├─ /reports                                            │
│  └─ /rm (EMSRb)    Validation Layer                     │
│                    ├─ LC-01: Pydantic                   │
│                    └─ LC-02: BizRuleValidator            │
└─────────────────────────────────────────────────────────┘
                         │ SQLAlchemy ORM
┌─────────────────────────────────────────────────────────┐
│                  DATABASE (SQLite)                      │
│  routes / flights / fare_tiers / price_histories        │
│  ai_recommendations / competitor_prices                 │
└─────────────────────────────────────────────────────────┘
                         │ Anthropic SDK
┌─────────────────────────────────────────────────────────┐
│                  AI ENGINE                              │
│  AbstractAiEngine ─┬─ ClaudeAiEngine (Claude Sonnet 4.6)│
│                    └─ MockAiEngine (Fallback)           │
│  EMSRb + Logit WTP + Dynamic Pricing Algorithm          │
└─────────────────────────────────────────────────────────┘
```

### 4.2 컴포넌트 의존성 매트릭스

| 컴포넌트 | 의존 대상 |
|---|---|
| Dashboard | dashboardStore → ApiClient → /api/dashboard |
| FareManagement | fareStore → ApiClient → /api/fares, /api/rm |
| AiRecommendations | aiRecStore → ApiClient → /api/recommendations |
| CompetitorMonitor | ApiClient → /api/competitors |
| Simulator | simulationStore → ApiClient → /api/simulation |
| Report | reportStore → ApiClient → /api/reports |
| FareService | FareRepository, PriceHistoryRepository, LC-02 |
| AiRecommendationService | AbstractAiEngine (Strategy Pattern) |
| SimulationService | AbstractSimulationEngine |

---

## 5. Frontend 설계

### 5.1 기술 스택

| 항목 | 기술 | 버전 | 선택 근거 |
|---|---|---|---|
| UI 프레임워크 | React | 19 | 최신 Concurrent Features |
| 언어 | TypeScript | 6 | strict 모드, 타입 안전성 |
| 빌드 도구 | Vite | 8 | 고속 HMR, 최적화 빌드 |
| 상태 관리 | Zustand | 5 | 가볍고 단순한 전역 상태 |
| 스타일링 | Tailwind CSS | 4 | oklch 색상, 유틸리티 클래스 |
| 차트 | Recharts | 3 | React 친화적 선언형 차트 |
| PDF 생성 | jsPDF + html2canvas | - | 클라이언트사이드 PDF |
| DOCX 생성 | docx | - | 클라이언트사이드 DOCX |
| 라우팅 | History API | - | Hash 제거, pathname 방식 |

### 5.2 페이지 컴포넌트 상세

#### Dashboard (`/`)
- **기능**: 노선별 수익·탑승률·예약 현황 실시간 집계
- **주요 UI**: 수익 달성률 카드, 노선별 수익 바 차트, 등급별 L/F 바 차트, AI 추천 건수
- **필터**: 기간(1/3/7/10일), 노선 드롭다운
- **Store**: `dashboardStore`
- **API**: `GET /api/dashboard/summary`

#### FareManagement (`/fares`, `/fares/:flightNo`)
- **기능**: 항공편별 좌석 클래스 운임·공급석 조회·수정
- **Step 1**: 날짜·노선 선택 → 항공편 목록 조회
- **Step 2**: 항공편 선택 → 클래스별 운임 편집 + 기내 좌석 배치도 + 인벤토리 로그
- **특징**: URL 라우팅 지원 (`/fares/KE1201`) — 새로고침 시 상세 페이지 유지
- **Store**: `fareStore`
- **API**: `GET /api/fares/{route}`, `PUT /api/fares/{flightId}`

#### AiRecommendations (`/recommendations`)
- **기능**: PENDING 상태 AI 추천 목록 조회 + 승인/거부
- **주요 UI**: 추천 목록 테이블, 변동률·신뢰도·예측 L/F 표시
- **비즈니스 규칙**: 승인 즉시 DB 반영 (BR-05), 수동 수정 시 PENDING → REJECTED (BR-07)
- **Store**: `aiRecommendationStore`
- **API**: `GET /api/recommendations`, `POST /api/recommendations/{id}/approve`

#### CompetitorMonitor (`/competitors`)
- **기능**: 노선별 경쟁사 운임 비교
- **주요 UI**: 자사 vs 경쟁사 4개 등급 운임 비교 테이블, 가격 차이 강조
- **API**: `GET /api/competitors/{route}/comparison`

#### Simulator (`/simulator`)
- **기능**: 유가·환율·운임 변동 시나리오 시뮬레이션
- **입력**: 유가 변동 (-50~+50%), 환율 변동 (-30~+30%), 운임 조정 (-50~+50%)
- **출력**: 예상 수요 변화, 예상 수익 변화, 등급별 탄력성 (SimulationResultModal)
- **특징**: IATA 단거리 아시아 국내선 기준 탄력성 계수 적용
- **Store**: `simulationStore`
- **API**: `POST /api/simulation/run`

#### Report (`/reports`)
- **기능**: 기간·노선별 수익 보고서 생성
- **출력**: PDF / DOCX / 이메일
- **내용**: 수익 달성률, Yield 추이, AI 기여도 분석, 최적화 점수
- **Store**: `reportStore`
- **API**: `POST /api/reports/generate`, `POST /api/reports/{id}/email`

### 5.3 Zustand Store 설계

| Store | 상태 | 주요 액션 |
|---|---|---|
| dashboardStore | flights, revenue, periodDays, selectedRoute | fetchDashboard, setPeriod, setRoute |
| fareStore | selectedFlight, fareTiers, step | fetchFlights, updateFare, setStep |
| aiRecommendationStore | recommendations, loading | fetchRecommendations, approve, reject |
| simulationStore | params, result, showModal | setParam, runSimulation, setShowModal |
| reportStore | reportData, loading | generateReport, downloadPdf, sendEmail |

### 5.4 ApiClient 설계

```typescript
// BASE_URL: import.meta.env.VITE_API_URL ?? '' (상대 경로)
class ApiClient {
  get<T>(path: string): Promise<T>
  post<T>(path: string, body: unknown): Promise<T>
  put<T>(path: string, body: unknown): Promise<T>
}
```

- 모든 API 호출은 `ApiClient`를 통해 단일 진입점으로 처리
- 모든 응답에 TypeScript 제네릭 타입 적용
- `VITE_API_URL` 환경변수 미설정 시 상대 경로(빈 문자열)로 동작 — 배포 환경에서 FastAPI가 직접 서빙

### 5.5 라우팅 설계

| URL 패턴 | 컴포넌트 | 비고 |
|---|---|---|
| `/` | Dashboard | 기본 진입점 |
| `/fares` | FareManagement (목록) | Step 1 |
| `/fares/:flightNo` | FareManagement (상세) | Step 2, 새로고침 유지 |
| `/recommendations` | AiRecommendations | |
| `/competitors` | CompetitorMonitor | |
| `/simulator` | Simulator | |
| `/reports` | Report | |

History API 기반 (`window.history.pushState`) — Hash URL 없음

---

## 6. Backend 설계

### 6.1 기술 스택

| 항목 | 기술 | 버전 | 선택 근거 |
|---|---|---|---|
| 프레임워크 | FastAPI | 0.115 | 자동 Swagger, Pydantic 통합 |
| 언어 | Python | 3.11+ | 타입 힌트 최신 지원 |
| ORM | SQLAlchemy | 2.0 | 타입 안전 쿼리 |
| DB | SQLite | - | 해커톤 데모, 외부 의존 최소화 |
| 데이터 검증 | Pydantic | 2.10 | 자동 직렬화/역직렬화 |
| 수학 | scipy | - | EMSRb 정규분포 계산 |
| 서버 | uvicorn | - | ASGI, 비동기 지원 |

### 6.2 레이어 구조

```
HTTP Request
     │
     ▼
Router Layer        ← Pydantic 자동 검증 (LC-01)
     │
     ▼
Service Layer       ← Business Rule Validation (LC-02)
     │              ← PriceHistory 자동 기록 (LC-03)
     ▼
Repository Layer    ← SQLAlchemy Session 관리
     │
     ▼
SQLite Database
```

### 6.3 Router 상세

| Router | 경로 | 주요 엔드포인트 |
|---|---|---|
| dashboard | `/api/dashboard` | `GET /summary` |
| fares | `/api/fares` | `GET /{route_id}`, `PUT /{flight_id}`, `PUT /{flight_id}/seats`, `GET /{flight_id}/history` |
| recommendations | `/api/recommendations` | `GET /`, `POST /{id}/approve`, `POST /{id}/reject` |
| competitors | `/api/competitors` | `GET /{route_id}`, `GET /{route_id}/comparison` |
| simulation | `/api/simulation` | `POST /run` |
| reports | `/api/reports` | `POST /generate`, `POST /{id}/email` |
| rm | `/api/rm` | `POST /optimize`, `POST /simulate-scenario` |

### 6.4 Service 상세

#### FareService
- **책임**: 운임 CRUD + Tier 계층 검증
- **핵심 메서드**: `update_fare()`, `update_seats()`, `get_flights_by_route()`
- **비즈니스 규칙 적용**: BR-01, BR-04, BR-08 저장 전 검증
- **부작용**: 가격 변경 시 PriceHistoryRepository 자동 기록 (LC-03)

#### AiRecommendationService
- **책임**: AI 추천 생성·승인·거부
- **Strategy Pattern**: `AbstractAiEngine` 주입 → `ClaudeAiEngine` 또는 `MockAiEngine`
- **승인 흐름**: `approve()` → FareTier.current_price 즉시 반영 → PriceHistory(AI) 기록

#### SimulationService
- **책임**: What-if 시뮬레이션 계산
- **Strategy Pattern**: `AbstractSimulationEngine` 주입
- **IATA 탄력성 적용**: 프레스티지 -0.6, 일반 정상 -1.2, 할인 -1.5, 특가 -2.0

#### CompetitorService
- **책임**: 경쟁사 가격 데이터 조회 및 자사 대비 비교

#### ReportService
- **책임**: 수익 보고서 데이터 집계 + 이메일 발송
- **보고서 항목**: 총 수익, 달성률, Yield 추이, AI 추천 기여도, 최적화 점수

### 6.5 Repository 상세

| Repository | 대상 모델 | 주요 메서드 |
|---|---|---|
| FareRepository | FareTier | `get_by_flight_tier()`, `update()`, `bulk_update()` |
| PriceHistoryRepository | PriceHistory | `record_change()`, `get_by_fare_tier()` |
| CompetitorRepository | CompetitorPrice | `get_by_route_date()` |

### 6.6 정적 파일 서빙

FastAPI가 React 빌드 산출물을 직접 서빙:

```python
# main.py
app.mount("/assets", StaticFiles(directory="../static/assets"), name="assets")

@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    # /api/* 제외한 모든 경로 → index.html 반환 (SPA Fallback)
    return FileResponse("../static/index.html")
```

---

## 7. AI Engine 설계

### 7.1 Strategy Pattern 구조

```python
class AbstractAiEngine(ABC):
    @abstractmethod
    def generate_recommendation(self, flight, fare) -> dict: ...

class ClaudeAiEngine(AbstractAiEngine):
    # Anthropic API 실호출 — Claude Sonnet 4.6
    def generate_recommendation(self, flight, fare) -> dict: ...

class MockAiEngine(AbstractAiEngine):
    # 규칙 기반 Mock — 오프라인 Fallback
    def generate_recommendation(self, flight, fare) -> dict: ...
```

- 인터페이스 교체만으로 프로덕션 ↔ Mock 전환
- `AiRecommendationService`는 `AbstractAiEngine`만 의존

### 7.2 Claude AI 분석 흐름

```
1. 담당자: 돌발 이슈 자유 텍스트 입력 (태풍·행사·경쟁사 동향)
2. ClaudeAiEngine: 노선·시즌·현재 운임·경쟁 컨텍스트 포함 프롬프트 구성
3. Claude Sonnet 4.6 API 호출
4. 응답 파싱: 4개 등급별 추천 가격 + 조정 근거
5. AiRecommendation 레코드 생성 (status=PENDING)
6. 담당자 검토 → 승인 One-click 적용
```

### 7.3 EMSRb (Expected Marginal Seat Revenue-b) 알고리즘

항공 수익관리 업계 표준 알고리즘으로, 클래스별 보호 수준(Protection Level)을 산정한다.

**핵심 수식**:
```
Protection Level(k) = μ_k - σ_k × Φ⁻¹(p_{k+1}/p_k)

여기서:
- μ_k, σ_k: 클래스 k의 수요 평균/표준편차
- Φ⁻¹: 정규분포 역누적분포함수 (scipy.stats.norm.ppf)
- p_k: 클래스 k 운임
- CV(변동계수): LF≥80%→0.20, LF≥60%→0.25, LF<60%→0.40
```

**적용 엔드포인트**: `POST /api/rm/optimize`

### 7.4 Logit WTP (Willingness-To-Pay) 구매 확률 모델

```
P(구매 | 가격 p) = exp(α - β·p) / (1 + exp(α - β·p))

β(가격 민감도) ∝ 1/DTD (출발까지 남은 일수에 반비례)
→ DTD 짧을수록 가격 민감도 낮음 (막판 구매자)
→ DTD 길수록 가격 민감도 높음 (조기 예약자)
```

### 7.5 Dynamic Pricing

| 방식 | 적용 대상 | 설명 |
|---|---|---|
| Pace-Based Continuous | 프레스티지석 | 잔여 4석 이하 시 지수적 가격 상승 |
| Hybrid Up-pricing | 일반석 특가(V) | 수요 급증 시 클래스 차단 대신 가격 상향 |

---

## 8. 데이터 모델

### 8.1 엔티티 관계도

```
Route (1) ──────────── (N) Flight
                              │
                    (1) ──────┤──────── (N) FareTier
                              │                │
                              │      (1) ──────┘──── (N) PriceHistory
                              │                │
                              │      (1) ──────┘──── (N) AiRecommendation
                              │
CompetitorPrice (N) ──── (1) Route
SimulationResult (N) ─── (1) Route
```

### 8.2 엔티티 스키마 상세

#### Route (노선)
| 필드 | 타입 | 제약 | 설명 |
|---|---|---|---|
| id | VARCHAR PK | NOT NULL | 노선 코드 (GMP-CJU 등) |
| origin | VARCHAR | NOT NULL | 출발 공항 코드 |
| destination | VARCHAR | NOT NULL | 도착 공항 코드 |

#### Flight (운항편)
| 필드 | 타입 | 제약 | 설명 |
|---|---|---|---|
| id | VARCHAR PK | NOT NULL | UUID |
| flight_number | VARCHAR | NOT NULL | 편명 (KE1201) |
| route_id | VARCHAR FK | NOT NULL | → routes.id |
| departure_date | DATE | NOT NULL | 운항 날짜 |
| departure_time | VARCHAR | NOT NULL | 출발 시각 (HH:MM) |
| time_slot | VARCHAR | NOT NULL | MORNING/FORENOON/AFTERNOON/EVENING |
| load_factor | FLOAT | NOT NULL | 전체 L/F (%) |
| pace | FLOAT | | 전주 대비 변동률 (%) |

#### FareTier (등급별 운임)
| 필드 | 타입 | 제약 | 설명 |
|---|---|---|---|
| id | VARCHAR PK | NOT NULL | UUID |
| flight_id | VARCHAR FK | NOT NULL | → flights.id |
| class_code | VARCHAR | NOT NULL | C / Y / B / M / S / K / L / T / V / G |
| tier | VARCHAR | NOT NULL | PRESTIGE / ECONOMY_FULL / ECONOMY_DISCOUNT / ECONOMY_SPECIAL |
| current_price | INT | NOT NULL, > 0 | 현재 운임 (원) |
| ai_recommended_price | INT | NULLABLE | AI 추천 운임 |
| total_seats | INT | NOT NULL | 전체 좌석 수 |
| sold_seats | INT | NOT NULL | 판매 좌석 수 |
| status | VARCHAR | NOT NULL | OPEN / CLOSED / SOLD_OUT |

**좌석 배분 (B737-900)**
| Tier | 클래스 | 좌석 수 |
|---|---|---|
| PRESTIGE | C | 8석 |
| ECONOMY_FULL | Y, B, M | 30석 |
| ECONOMY_DISCOUNT | S, K, L | 85석 |
| ECONOMY_SPECIAL | T, V, G | 50석 |
| **합계** | | **173석** |

#### PriceHistory (가격 변경 이력)
| 필드 | 타입 | 제약 | 설명 |
|---|---|---|---|
| id | VARCHAR PK | NOT NULL | UUID |
| fare_tier_id | VARCHAR FK | NOT NULL | → fare_tiers.id |
| change_type | VARCHAR | NOT NULL | MANUAL / AI |
| price_before | INT | NOT NULL | 변경 전 가격 |
| price_after | INT | NOT NULL | 변경 후 가격 |
| changed_by | VARCHAR | NOT NULL | 담당자명 또는 'AI' |
| changed_at | DATETIME | NOT NULL | 변경 일시 |
| rationale | TEXT | NULLABLE | 변경 근거 (AI 변경 시) |

#### AiRecommendation (AI 추천)
| 필드 | 타입 | 제약 | 설명 |
|---|---|---|---|
| id | VARCHAR PK | NOT NULL | UUID |
| flight_id | VARCHAR FK | NOT NULL | → flights.id |
| class_code | VARCHAR | NOT NULL | 클래스 코드 |
| current_price | INT | NOT NULL | 현재 운임 |
| recommended_price | INT | NOT NULL | 추천 운임 |
| rationale | TEXT | NOT NULL | 추천 근거 |
| change_percent | FLOAT | NOT NULL | 변동률 (%) |
| confidence | FLOAT | NOT NULL | 신뢰도 (0.0~1.0) |
| predicted_load_factor | FLOAT | | 예측 L/F |
| status | VARCHAR | NOT NULL | PENDING / APPROVED / REJECTED |
| created_at | DATETIME | NOT NULL | 생성 일시 |

#### CompetitorPrice (경쟁사 가격)
| 필드 | 타입 | 제약 | 설명 |
|---|---|---|---|
| id | VARCHAR PK | NOT NULL | UUID |
| route_id | VARCHAR FK | NOT NULL | → routes.id |
| airline | VARCHAR | NOT NULL | 경쟁사명 (아시아나, 제주항공 등) |
| flight_date | DATE | NOT NULL | 운항 날짜 |
| time_slot | VARCHAR | NOT NULL | 시간대 |
| tier | VARCHAR | NOT NULL | 4개 Tier 통일 (PRESTIGE 등) |
| price | INT | NOT NULL | 경쟁사 운임 (원) |

---

## 9. 비즈니스 규칙

### 9.1 가격 제약 규칙

| ID | 규칙 | 검증 시점 | 검증 위치 |
|---|---|---|---|
| BR-01 | PRESTIGE ≥ ECONOMY_FULL × 1.5 | 저장 전 | FareService, LC-02 |
| BR-04 | 모든 운임 > 0 (음수/0 불가) | 저장 전 | Pydantic + LC-02 |
| BR-08 | ECONOMY_FULL > ECONOMY_DISCOUNT > ECONOMY_SPECIAL | 저장 전 | LC-02 |

### 9.2 AI 추천 규칙

| ID | 규칙 |
|---|---|
| BR-03 | 추천 가격 범위: current × 0.7 ≤ recommended ≤ current × 1.5 |
| BR-05 | 승인 즉시 FareTier.current_price 반영 + PriceHistory(AI) 기록 |
| BR-07 | 수동 수정 시 해당 편 PENDING 추천 → 모두 REJECTED 처리 |

### 9.3 Load Factor 규칙

| 범위 | 상태 | UI 색상 |
|---|---|---|
| L/F ≥ 90% | CRITICAL | 적색 |
| L/F ≥ 70% | WARNING | 황색 |
| L/F < 70% | NORMAL | 네이비 |

### 9.4 시간대별 가격 보정 계수

| 시간대 | 기준 | 계수 |
|---|---|---|
| MORNING (~09:00) | 조조 프리미엄 | × 1.20~1.25 |
| FORENOON (09~12시) | 기본 | × 1.00 |
| AFTERNOON (12~17시) | 기본 | × 1.00 |
| EVENING (17시~) | 저녁 프리미엄 | × 1.30~1.35 |
| 주말 | 추가 | × 1.10 |
| 성수기 | 추가 | × 1.20 |

---

## 10. API 명세

### 10.1 Dashboard

```
GET /api/dashboard/summary
  Query: route (str, optional), days (int, default=7)
  Response: {
    totalRevenue: int,
    targetRevenue: int,
    achievementRate: float,
    routeRevenues: [{ route, revenue, target, rate }],
    classLoadFactors: [{ className, lf }],
    pendingRecommendations: int
  }
```

### 10.2 Fares

```
GET /api/fares/{route_id}
  Query: date (YYYY-MM-DD, optional)
  Response: FlightFareSchema[]

PUT /api/fares/{flight_id}
  Body: { class_code: str, new_price: int, updated_by: str }
  Response: { success: bool, message: str }

PUT /api/fares/{flight_id}/seats
  Body: { tier: str, new_count: int }
  Response: { success: bool, reallocated_seats: dict }

GET /api/fares/{flight_id}/history
  Response: PriceHistorySchema[]
```

### 10.3 Recommendations

```
GET /api/recommendations
  Query: route (str, optional)
  Response: AiRecommendationSchema[]

POST /api/recommendations/{id}/approve
  Body: { approved_by: str }
  Response: { success: bool, new_price: int }

POST /api/recommendations/{id}/reject
  Body: { rejected_by: str }
  Response: { success: bool }
```

### 10.4 Competitors

```
GET /api/competitors/{route_id}
  Query: date (YYYY-MM-DD, optional)
  Response: CompetitorPriceSchema[]

GET /api/competitors/{route_id}/comparison
  Query: date (YYYY-MM-DD, optional)
  Response: {
    ourFares: { tier: price },
    competitorFares: [{ airline, fares: { tier: price } }],
    priceGap: float
  }
```

### 10.5 Simulation

```
POST /api/simulation/run
  Body: {
    route: str,
    date: str,
    fuelChangePct: float,    // -50 ~ +50
    exchangeRateChangePct: float,  // -30 ~ +30
    priceChangePct: float    // -50 ~ +50
  }
  Response: {
    expectedDemandChange: float,
    expectedRevenueChange: float,
    classSummary: [{ tier, demandChange, revenueChange }],
    rmRecommendation: str
  }
```

### 10.6 Reports

```
POST /api/reports/generate
  Body: { route: str | null, period_start: date, period_end: date }
  Response: ReportSchema

POST /api/reports/{id}/email
  Body: { recipient_email: str }
  Response: { success: bool }
```

### 10.7 RM Optimize (EMSRb)

```
POST /api/rm/optimize
  Body: { 각 Tier별 기본 운임, 잔여석, 판매석, DTD, 경쟁사 가격 }
  Response: { 클래스별 권장 운임, 예약 한도 }

POST /api/rm/simulate-scenario
  Body: { route, date, scenario_type: 'A'|'B'|'C' }
  Response: { 시나리오별 예상 수익/수요 }
```

---

## 11. 비기능 요구사항 설계

| ID | 항목 | 목표 | 구현 방식 |
|---|---|---|---|
| NFR-01 | 성능 | 정상 동작 (SLA 없음) | SQLite 로컬, 단일 사용자 |
| NFR-02 | 가용성 | 데모 환경 | AWS App Runner 자동 재시작 |
| NFR-03 | 보안 | 인증 없음, 데모 공개 | CORS `*`, SQLAlchemy ORM |
| NFR-04 | 유지보수성 | 모듈화 + 타입 안전성 | 계층 분리, TypeScript strict |
| NFR-05 | 테스팅 | PBT 핵심 불변 속성 | Hypothesis, 4/4 통과 |

---

## 12. 설계 패턴

### 12.1 적용 패턴 요약

| 패턴 | 적용 위치 | 목적 |
|---|---|---|
| Validation Pattern (Pydantic) | 모든 Router 입출력 | 타입 검증 자동화 |
| Repository Pattern | Service → Repository | DB 접근 추상화 |
| Strategy Pattern | AI Engine, Simulation Engine | 구현체 교체 가능 |
| Property-Based Testing | `test_fare_invariants.py` | 가격 불변 속성 검증 |
| CORS Middleware | `main.py` | 전체 오리진 허용 |
| StaticFiles + SPA Fallback | `main.py` | 단일 포트 서빙 |

### 12.2 비적용 패턴 (근거)

| 패턴 | 미적용 근거 |
|---|---|
| JWT 인증 | NFR-03: 인증 생략 결정 |
| Circuit Breaker | 외부 서비스 의존도 낮음 |
| Redis 캐싱 | 성능 목표 없음, 복잡도 증가 |
| Event Sourcing | 해커톤 범위 초과 |
| Microservices | 단일 컨테이너 배포 |
