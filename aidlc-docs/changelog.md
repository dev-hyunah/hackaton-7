# Changelog

코드 변경 이력입니다. 날짜 기준 최신순으로 기록합니다.

---

## 2026-05-21 — 시뮬레이터 슬라이더 범위 대칭화

**파일**: `frontend/src/components/Simulator.tsx`

### 변경 내용
- 유가 변동 슬라이더: `min=-30 max=50` → `min=-50 max=50` (0이 정중앙에 위치)
- 환율 변동 슬라이더: `min=-20 max=30` → `min=-30 max=30` (0이 정중앙에 위치)
- 자사 운임 조정 슬라이더: `min=-30 max=50` → `min=-50 max=50` (0이 정중앙에 위치)
- 각 슬라이더 하단 레이블 최솟값 텍스트 동일하게 수정

---

## 2026-05-21 — 시뮬레이터 계산 과정 콘솔 로그 추가

**파일**: `frontend/src/stores/simulationStore.ts`

### 변경 내용
- `calcImpact()` 함수에 `log: boolean` 파라미터 추가 (기본값 false)
- 시뮬레이션 실행 버튼 클릭 시 최종 계산에만 `log=true` 전달 (차트용 8회 반복 계산은 제외)
- 콘솔 출력 구조 (console.group 계층):
  - `📥 입력값`: 유가·환율·운임 변동값
  - `📊 노선 기준값`: 기준 수익·LF·수요
  - `⚙️ 외부요인 LF 변화 계산`: 유가효과·환율효과 계수 및 계산식
  - `🎯 등급별 가격탄력성`: 운임 조정 있을 때만 — IATA 탄력성 계수·수요변화·수익변화 console.table
  - `📈 최종 LF·수익 계산`: LF 변화량·수요 배수·가격 배수·최종 수익 계산식
  - `✅ 결과 요약`: 수익변화%·수요변화%·새 LF

---

## 2026-05-21 — 시뮬레이션 결과 팝업 등급별 탄력성 섹션 조건부 표시

**파일**: `frontend/src/components/Simulator.tsx`

### 변경 내용
- 등급별 가격탄력성 테이블: 자사 운임 조정 슬라이더가 0일 때 숨김
- 운임 조정 0일 때 대체 안내 문구 표시: "등급별 탄력성 영향은 자사 운임 조정 슬라이더를 0 이외로 설정할 때 표시됩니다"
- 이유: 탄력성은 가격 변화에만 반응하므로 운임 조정 없을 때 모두 0%로 표시되던 혼란 해소

---

## 2026-05-21 — 시뮬레이션 결과 요약 팝업 추가 및 IATA 기준 탄력성 적용

**파일**: `frontend/src/stores/simulationStore.ts`, `frontend/src/components/Simulator.tsx`, `frontend/src/types/index.ts`, `ai_engine/mock_simulation_engine.py`

### 변경 내용

#### simulationStore.ts — IATA 기준 탄력성 계수 적용
- 기존 단일 계수(`-0.6 / -0.4`) → IATA 단거리 아시아 국내선 기준 등급별 차등 적용:
  - C (프레스티지): `-0.45` / Y (일반 정상): `-0.95` / M (일반 할인): `-1.35` / V (특가): `-1.75`
- `CLASS_ELASTICITY` 상수 추가: 등급별 탄력성·수요비중 정의
- `calcImpact()` 개편: 외부요인(유가·환율) LF 변화 + 등급별 가중평균 수요 변화 분리 계산
- 기준선 차트 데이터: `Math.random()` → 시드 고정 의사난수(`Math.sin`) 사용 (매 실행 동일 결과)
- `buildRmRecommendation()` 함수 추가: LF·수익변화·운임조정 조건 기반 RM 권고 문구 생성
- `showModal` state 추가: 시뮬레이션 완료 시 `true`로 전환
- `closeModal()` 액션 추가

#### types/index.ts
- `ClassImpactDTO` 인터페이스 추가: `classCode`, `tier`, `elasticity`, `demandChangePct`, `revenueChangePct`
- `SimulationResultDTO`에 `classSummary: ClassImpactDTO[]`, `rmRecommendation: string` 필드 추가

#### Simulator.tsx — 결과 요약 팝업 추가
- `SimulationResultModal` 컴포넌트 신규 추가:
  - 결과 심각도(수익 -10% 이하 / +5% 이상 / 중립)에 따라 상단 바·배지 색상 변경
  - 핵심 지표 카드 3개: 수익 변화%, 수요 변화%, 입력 조건 요약
  - 등급별 가격탄력성 영향 테이블 (조건부 표시)
  - RM 권고사항 배지
  - 배경 클릭 또는 확인 버튼으로 닫기
- `MetricCard` 컴포넌트 신규 추가
- 시뮬레이션 실행 완료 시 `showModal=true` → 팝업 자동 표시

#### mock_simulation_engine.py — 탄력성 계수 동기화
- 기존 단일 `price_effect` → `CLASS_ELASTICITY` 등급별 가중평균 수요 변화로 교체
- `FUEL_LF_SENSITIVITY = -0.15`, `COMP_LF_PENALTY = -8.0` 상수화
- 기준선 차트 데이터: `random.seed(i)` → `math.sin(i * 1337)` 시드 고정

---

## 2026-05-21 — 등급별 평균 LF 차트 UI 개선 (수직 바 전환, 한글 레이블, 범례)

**파일**: `frontend/src/components/Dashboard.tsx`, `backend/app/routers/dashboard.py`

### 변경 내용

#### Dashboard.tsx
- `MOCK_CLASS_LF`: C/Y/M/V 4개 등급 × 노선별 mock 데이터로 통일 (P/B/H/K/L/Q 등 미사용 등급 제거)
- 등급별 평균 LF 차트 방향 전환: `layout="vertical"` (수평) → 수직 `BarChart` (default)
- X축: 등급 레이블, Y축: 0~100% — 이미지 기준 UI와 동일
- 막대 radius: `[0,4,4,0]` → `[4,4,0,0]` (상단 모서리 둥글게)
- 하단 색상 범례 추가: `85%+` (빨강) / `65–85%` (앰버) / `~65%` (파랑)

#### dashboard.py
- `class_lf` 집계 시 C/Y/M/V 4개 등급만 처리 (DB 실제 코드와 일치)
- 레이블 한글화: `"C"` → `"C (프레스티지)"`, `"Y"` → `"Y (일반 정상)"`, `"M"` → `"M (일반 할인)"`, `"V"` → `"V (특가)"`
- 순서 고정: C → Y → M → V

---

## 2026-05-21 — requirements_delta_v7.md 추가 요구사항 반영 및 requirements.md 통합 업데이트

**파일**: `aidlc-docs/inception/requirements/requirements_delta_v7.md`, `aidlc-docs/inception/requirements/requirements.md`

### requirements_delta_v7.md 추가 항목
- **전체 (라우팅)**: `/#/` 경로 제거 → `/fares`, `/report` 등 History API 경로 라우팅 요구사항 명시
- **대시보드**: 등급별 평균 LF 차트 복원 요구사항, 일자별 필터링 시 항공편별 LF 기간 연동 요구사항 추가

### requirements.md 업데이트
- **머릿말**: v7 Phase3~5 통합 기준 추가 (Proxy 포트 오류 수정, 등급별 LF 복원, History API 라우팅)
- **FR-04 대시보드**: 등급별 평균 LF 차트(v7 Phase4), 항공편별 LF 기간 필터 연동(v7 Phase4) 항목 추가
- **NFR-08 URL 라우팅**: 신규 섹션 추가 (History API, /api 접두어 통합, pushState/popstate, 폴백 규칙)
- **변경이력 테이블**: v7 Phase1~5 항목 추가

---

## 2026-05-21 — 대시보드 등급별 평균 LF 복원 및 항공편별 LF 기간 필터 연동

**파일**: `backend/app/schemas/schemas.py`, `backend/app/routers/dashboard.py`, `frontend/src/components/Dashboard.tsx`

### 문제 1 — "Load Factor 범례" 카드 (등급별 평균 LF → 단순 색상 범례로 교체됨)
- 오른쪽 카드가 바 차트에서 색상 설명 텍스트만 표시하는 정적 범례로 변경되어 있었음
- 수정: `class_lf` 필드(등급별 평균 LF 배열)를 스키마·백엔드·프론트에 추가하고 바 차트로 복원

### 문제 2 — 항공편별 LF가 기간 필터와 무관하게 고정 표시
- 백엔드 `route_lf` 쿼리가 `today` 하루 고정 → 1일/3일/7일 필터를 바꿔도 동일한 데이터 반환
- 수정: 기간 내 전체 항공편 LF를 flight_number 기준으로 평균 집계, 최대 10편 내림차순 정렬

### 변경 내용

#### schemas.py
- `ClassLfSchema` 추가 (`label: str`, `lf: float`)
- `DashboardSummarySchema`에 `class_lf: list[ClassLfSchema] = []` 필드 추가

#### dashboard.py
- `ClassLfSchema` import 추가
- `route_lf`: `today` 고정 쿼리 → `flights`(기간 내 전체) 기준 flight_number별 LF 평균 집계 (최대 10편)
- `class_lf`: 기간 내 `FareTier`에서 등급코드별 `sold_seats/total_seats` 평균 산출

#### Dashboard.tsx
- `DashboardSummary` 인터페이스에 `class_lf` 필드 추가
- `MOCK_CLASS_LF` 노선별 mock 데이터 추가 (P/C/Y/M/B/H/K/L/Q 9개 등급)
- `getMockSummary()` 반환에 `class_lf` 포함
- "Load Factor 범례" 카드 → "등급별 평균 LF" 수직 바 차트로 복원 (`classLfData` 사용)

---

## 2026-05-21 — Vite proxy 포트 오류 수정 (8080 → 8000)

**파일**: `frontend/vite.config.ts`

### 문제
- Vite proxy target이 `http://localhost:8080`으로 설정되어 있었으나 백엔드(FastAPI/uvicorn)는 포트 **8000**에서 실행됨
- 모든 API 호출(`/api/*`)이 8080으로 전달되어 Connection Refused → **502 Bad Gateway** 발생

### 수정
- `proxy['/api'].target`: `'http://localhost:8080'` → `'http://localhost:8000'`

---

## 2026-05-21 — Path 기반 탭 URL 라우팅 (/#/ 제거)

**파일**: `frontend/src/api/apiClient.ts`, `frontend/vite.config.ts`, `frontend/src/App.tsx`

### 변경 내용

#### apiClient.ts — API BASE_URL `/api` 접두어로 통합
- `BASE_URL` 기본값: `''` → `'/api'`
- 모든 API 호출이 `/api/*` 경로로 전송됨 (예: `/api/fares/GMP-CJU`)

#### vite.config.ts — 단일 proxy 항목으로 통합 + path rewrite
- 기존 7개 개별 proxy 항목(`/dashboard`, `/fares`, `/competitors`, `/reports`, `/recommendations`, `/simulation`, `/api`) → `/api` 단일 항목으로 교체
- `rewrite: (path) => path.replace(/^\/api/, '')` 추가: Vite가 `/api/fares/GMP-CJU` → `/fares/GMP-CJU`로 변환하여 백엔드(8080)에 전달
- 결과: `/fares`, `/report` 등 경로를 브라우저 URL로 사용해도 Vite proxy 충돌 없음

#### App.tsx — hash 라우팅 → History API 라우팅 전환
- `getInitialPage()`: `window.location.hash` → `window.location.pathname` 기반으로 탭 파싱
- `navigate()`: `window.location.hash = \`/${id}\`` → `window.history.pushState({}, "", \`/${id}\`)`
- `useEffect` 교체: `hashchange` + 초기 redirect 2개 → 단일 `popstate` 이벤트 리스너
- 탭별 URL: `/dashboard`, `/fares`, `/competitor`, `/simulator`, `/report`
- `/` 루트 진입 시 `dashboard` 폴백

---

## 2026-05-21 — Hash 기반 탭 URL 라우팅

**파일**: `frontend/src/App.tsx`

### 변경 내용
- `PAGE_IDS` Set 및 `getInitialPage()` 헬퍼 추가: 진입 시 `window.location.hash`에서 탭 ID 파싱 (예: `#/fares` → `"fares"`)
- `useState<PageId>(getInitialPage)`: 초기값을 hash 기반으로 변경 (이전: `"dashboard"` 하드코딩)
- `navigate()`: `window.location.hash = \`/${id}\`` 추가로 탭 전환 시 URL hash 동기화
- `useEffect` 2개 추가:
  - hash 없는 최초 진입 시 `#/dashboard`로 redirect
  - `hashchange` 이벤트 리스너로 브라우저 뒤로/앞으로 가기 지원
- 탭별 URL: `/#/dashboard`, `/#/fares`, `/#/competitor`, `/#/simulator`, `/#/report`
- Vite proxy 경로(`/dashboard`, `/fares` 등)와 충돌 없음 — hash `#` 이후는 서버로 전달되지 않음
- `react-router-dom` 설치 불필요, `vite.config.ts` 수정 불필요

---

## 2026-05-21 — v7 Phase 4: DB 연동 후 UI 이전 상태 복원

**파일**: `frontend/src/data/mockData.ts`, `frontend/src/components/FareManagement.tsx`, `frontend/src/components/Dashboard.tsx`, `frontend/src/components/Report.tsx`

### 문제 및 수정 내용

#### mockData.ts
- `FLIGHT_AIRCRAFT_MAP` 상수 export 추가: flightNo → aircraft 역조회 맵 (DB 응답에서 기종명 복원용)

#### FareManagement.tsx — apiFlightToDashboard() 4개 필드 누락 수정
- `FLIGHT_AIRCRAFT_MAP` import 추가
- `apiFlightToDashboard()` 반환 객체에 4개 필드 추가:
  - `aircraft`: FLIGHT_AIRCRAFT_MAP[f.flight_number] 로 기종명 역조회 (기본값 "B737-800")
  - `totalSeats`: classes 배열에서 합산 계산
  - `currentPrice`: Y클래스 price 또는 첫 클래스 price
  - `aiRecommended`: Y클래스 aiPrice 또는 currentPrice
- 수정 전: Step 2 헤더 기종명 공백, "총 undefined Seats", AI 추천 컬럼 오작동
- 수정 후: 모든 필드 정상 표시

#### Dashboard.tsx — avg_load_factor 이중 나눗셈 제거
- `avg_load_factor / 100` → `avg_load_factor` (백엔드는 이미 % 단위로 반환)
- KPI 카드: `(avgLoadFactor * 100).toFixed(1)%` → `avgLoadFactor.toFixed(1)%`
- 수정 전: DB 데이터 사용 시 "0.7%" 등 잘못된 LF 표시
- 수정 후: "74.5%" 등 정상 표시

#### Report.tsx — 평균단가 0 나누기 방어
- `Math.round(d.revenue / d.bookings)` → `d.bookings > 0 ? ... : "-"` 로 방어
- DB 데이터에 예약 없는 날짜(bookings=0) 있을 때 "Infinity원" 표시 방지

---

## 2026-05-21 — v7 Phase 3: Mock 폴백 복구 + Vite 프록시 설정

**파일**: `frontend/src/components/CompetitorMonitor.tsx`, `frontend/src/stores/reportStore.ts`, `frontend/vite.config.ts`

### 문제
백엔드 미실행 시 API 호출 실패 → catch 블록이 `null`로 상태를 설정하여 대시보드·경쟁사 모니터링·보고서 화면에 데이터가 전혀 표출되지 않는 문제 발생

### 수정 내용

#### CompetitorMonitor.tsx
- `useState<PriceComparison | null>(null)` → `useState<PriceComparison>(() => buildMockComparison(KE_DOMESTIC_ROUTES[0]))` 으로 초기값 Mock 데이터 적용
- catch 블록: `setComparison(null)` → `setComparison(buildMockComparison(selectedRoute))` 로 수정 (API 실패 시 Mock 폴백)
- `buildMockComparison()` 헬퍼 함수 wiring 완료 (이전에 선언만 되고 사용되지 않던 문제 해결)

#### reportStore.ts
- `generateReport()` catch 블록: `set({ reportStatus: 'idle' })` → `buildMockReport()` 결과를 `reportData`에 설정하고 `reportStatus: 'ready'`로 전환
- `buildMockReport(route, start, end)` 헬퍼 함수 추가: 노선별 ROUTE_REVENUE/ROUTE_LF 기반 Mock ReportDTO 생성, 기간 내 일별 수익 히스토리 동적 생성

#### vite.config.ts
- `server.proxy` 설정 추가: 백엔드 포트 8080 대상
  - `/dashboard`, `/fares`, `/competitors`, `/reports`, `/recommendations`, `/simulation`, `/api` 경로 모두 `http://localhost:8080`으로 프록시

---

## 2026-05-21 — v7 Phase 2: 가격·공급석 수정 즉시 DB 반영 + 경쟁사 C클래스 데이터

**파일**: `backend/app/routers/fare.py`, `backend/app/services/fare_service.py`, `backend/app/schemas/schemas.py`, `backend/seed_data.py`, `frontend/src/components/FareManagement.tsx`

### 백엔드 변경

#### schemas.py
- `SeatUpdateRequest` (class_code, new_total_seats, updated_by) 신규 추가
- `SeatUpdateResponse` (flight_id, class_code, old/new_total_seats, updated_at) 신규 추가

#### fare_service.py
- `update_seats()` 메서드 신규 추가: FareTier의 total_seats 업데이트 + sold_seats 기준 status 자동 재계산

#### fare.py
- `PUT /fares/{flight_id}/seats` 엔드포인트 신규 추가

#### seed_data.py + DB
- 경쟁사 COMPETITOR_BOOKING_CLASSES에 "C" 클래스 추가 (C 클래스 가격 = base × 1.75~2.15)
- 기존 DB에 C클래스 경쟁사 가격 2,430건 직접 INSERT (9개 노선 × 3개 항공사 × 90일)

### 프론트엔드 변경

#### FareManagement.tsx — commitEdit()
- **가격 수정 즉시 DB 저장**: price field 편집 완료(Enter/blur) 시 `PUT /fares/{flightId}` API 즉시 호출 (fire-and-forget, 실패 시 console.warn)
- **공급석 수정 즉시 DB 저장**: seats field 편집 완료 후 AI 재배분된 전 클래스에 대해 `PUT /fares/{flightId}/seats` API 즉시 호출 (fire-and-forget)

---

## 2026-05-21 — v7 DB 데이터 연동 (Mock → 실제 DB)

**파일**: `backend/app/routers/dashboard.py`, `backend/app/schemas/schemas.py`, `backend/app/services/report_service.py`, `frontend/src/components/Dashboard.tsx`, `frontend/src/components/CompetitorMonitor.tsx`, `frontend/src/stores/reportStore.ts`, `frontend/src/components/FareManagement.tsx`

### 백엔드 변경

#### dashboard.py
- `/dashboard/summary` 엔드포인트를 실제 DB 쿼리로 전면 개편
- `route_id` (기본값 "all"), `days` (기본값 1, max 30) 쿼리 파라미터 지원
- Flight + FareTier 테이블에서 총 수익·총 예약·평균 LF 집계
- 일별 수익 히스토리 및 항공편별 LF 목록 반환

#### schemas.py
- `RouteRevenuePointSchema`, `RouteLfSchema` 신규 추가
- `DashboardSummarySchema`에 `revenue_history`, `route_lf` 필드 추가

#### report_service.py
- `MOCK_ROUTE_PERFORMANCE`, `MOCK_YIELD_TREND`, `MOCK_REVENUE_HISTORY` 상수 제거
- 노선별 성과: Flight + FareTier DB 쿼리로 실제 수익·LF 계산
- Yield 추이: 최근 4개월 실제 판매 좌석 비율로 계산
- AI 통계: AiRecommendation 테이블에서 approved/rejected 카운트
- 일별 수익: 요청 기간 내 날짜별 DB 집계
- 노선별 일일 목표 수익 상수 테이블(`ROUTE_DAILY_TARGET`) 추가

### 프론트엔드 변경

#### Dashboard.tsx
- 하드코딩된 `ROUTE_REVENUE_HISTORY`, `ROUTE_PERIOD_KPI`, `ROUTE_LF_MAP` 제거
- `GET /dashboard/summary?route_id=X&days=N` API 호출로 대체
- `useCallback` + `useEffect`로 route/days 변경 시 자동 재조회

#### CompetitorMonitor.tsx
- `buildDashboardFlights()` + `competitorPrices` mock 제거
- `GET /competitors/{route}/comparison?date=2026-05-21` API 호출로 대체
- "AI Mock Data" 뱃지 → "DB 연동"으로 변경

#### reportStore.ts
- 로컬 mock 데이터(ALL_ROUTE_PERF, YIELD_BY_MONTH 등) 및 계산 함수 제거
- `POST /reports/generate` API 호출로 대체
- API 응답 snake_case → camelCase 매핑 처리

#### FareManagement.tsx
- 새로고침 버튼: `buildDashboardFlights()` → `GET /fares/{route}?date={date}` API 호출 (실패 시 mock fallback 유지)
- `applyCrossRoutes()`: 각 노선 항공편도 API에서 조회 (실패 시 mock fallback 유지)

---

## 2026-05-21 — v6 추가 요구사항 문서 반영

**파일**: `aidlc-docs/inception/requirements/requirements_delta_v6.md`, `aidlc-docs/inception/requirements/requirements.md`

### requirements_delta_v6.md 추가 항목

#### 운임 관리
- 공급석 input 표출 시 숫자 3자리 초과해도 숫자가 잘리지 않도록 input 너비를 자릿수에 맞게 충분히 확보 (기존 동적 너비 요구사항 보완)

#### 시뮬레이터
- 노선 선택 변경 시 슬라이더(유가 변동·환율 변동·자사 운임 조정) 값과 시뮬레이션 결과 유지
- '초기화' 버튼 클릭 시에만 노선 포함 모든 값 초기화 (노선은 '국내선 전체'로 복귀)

### requirements.md 반영
- FR-01: 좌석 input 동적 너비 명세 상세화 (계수 공식, 3자리 초과 시 온전히 표시 조건 명시)
- FR-06: 노선 변경 시 슬라이더·결과 유지 명세, 초기화 버튼 완전 초기화 명세 추가

---

## 2026-05-21 — 시뮬레이터 슬라이더 초기화 버그 수정

**파일**: `frontend/src/components/Simulator.tsx`, `frontend/src/stores/simulationStore.ts`

### 수정 내용
- `Simulator.tsx`: 노선 버튼 onClick에서 `reset()` 제거 — 노선 변경 시 슬라이더·결과값 유지
- `simulationStore.ts`: `reset()` 함수를 `defaultParams` 전체 초기화(route 포함)로 복원 — '초기화' 버튼 클릭 시만 모든 값(노선 포함) 초기화

---

## 2026-05-21 — 시뮬레이터 노선 선택 버그 수정

**파일**: `frontend/src/stores/simulationStore.ts`

### 버그 원인
노선 버튼 클릭 시 `setParams({ route: r }); reset();` 순서로 실행되는데, `reset()`이 `{ ...defaultParams }` 전체를 덮어써서 직전에 설정한 route가 `국내선 전체`로 되돌아가는 문제.

### 수정 내용
`reset()` 함수에서 현재 `state.params.route`를 보존하도록 수정:
- `params: { ...defaultParams }` → `params: { ...defaultParams, route: state.params.route }`
- result, isRunning은 기존과 동일하게 초기화

---

## 2026-05-21 — v6 미구현 항목 추가 코드 반영 (2차)

**파일**: `frontend/src/components/FareManagement.tsx`, `frontend/src/components/Simulator.tsx`, `frontend/src/components/Dashboard.tsx`, `frontend/src/components/Report.tsx`, `frontend/src/stores/reportStore.ts`

### 코드 구현

#### 운임 관리 (FareManagement.tsx)
- **L/F progress bar 굵기 2배**: ClassEditCard 판매율 바 `h-1.5 → h-3`으로 변경하여 가시성 향상
- **좌석 input 동적 너비**: 좌석 수 수정 input에 `style={{ width: ... }}` 동적 계산 적용 — 입력 자릿수에 따라 너비 자동 확장 (최소 3.5rem, 글자당 0.7rem 증가)

#### 시뮬레이터 (Simulator.tsx)
- **수익·예약 콤마 포맷**: '예상 수익 (일평균)' 및 '예상 일일 예약' ResultCard에 `toLocaleString()` 적용하여 1,000 단위 콤마 삽입

#### 대시보드 (Dashboard.tsx)
- **수익 KPI 콤마 포맷**: `fmt()` 함수의 만원 단위 계산에 `toLocaleString()` 적용하여 큰 숫자(예: 2,841만)에도 콤마 표시

#### 보고서 (Report.tsx, reportStore.ts)
- **월별 Yield 추이 막대 그래프**: `LineChart → BarChart` 재변경 — 목표 Yield(gray), 실제 Yield(violet) 병렬 막대로 가시성 향상
- **일별 수익 동적 생성**: `generateDailyRevenue()` 함수 신규 추가 — 기간 시작~종료 전체 날짜에 걸쳐 일별 수익 데이터를 동적 생성. 기간에 포함되지 않는 데이터 표출 없음
- **미사용 import 정리**: `revenueHistory` import 제거, `LineChart`/`Line` import 제거

### 요구사항 문서 업데이트 (requirements.md)
- FR-01: L/F bar 굵기 2배 명세 + 좌석 input 동적 너비 명세 추가
- FR-04: 수익 KPI 콤마 표기 명세 추가
- FR-06: 결과 카드 콤마 표기 명세 추가
- FR-08: 일별 수익 동적 생성 및 기간 내 데이터만 표출 명세 상세화, Yield 막대 그래프 명세 업데이트

---

## 2026-05-21 — v6 요구사항 반영 (requirements_delta_v6.md)

**파일**: `aidlc-docs/inception/requirements/requirements_delta_v6.md`, `aidlc-docs/inception/requirements/requirements.md`

### 요구사항 통합 (requirements_delta_v6.md → requirements.md)

#### 전체 (Global)
- **노선 선택 제한**: 실제 대한항공 국내선 운항 노선만 선택 가능 (미운항 노선 선택 불가) — FR-01에 반영
- **금액 콤마 표기**: 1,000 단위마다 콤마 삽입하여 가독성 향상 — NFR-07 신규 추가
- **모바일 반응형 강화**: 모바일 화면 및 텍스트 영역이 깨지지 않도록 반응형 구현 — NFR-06 보강

#### 대시보드 (FR-04)
- **노선별 수익 추이 데이터 연동**: 노선 변경 시 수익 추이 그래프 데이터가 해당 노선 기준으로 변동
- **일자 필터링 KPI 연동**: 1일/3일/7일/10일 필터 변경 시 '평균 Load Factor', 'AI 승인 대기' 등 KPI 데이터 변동

#### 운임 관리 (FR-01)
- **새로고침 마지막 시간 표출**: 새로고침 버튼 옆에 마지막 새로고침 시간 초 단위까지 표출
- **헤더 항공편명·출발시간 제거**: 새로고침 버튼 우측 항공편명·출발 시간 UI 제거
- **운항편 판매현황 하단 데이터 제거**: 좌측 운항편 판매현황 하단 기체·노선 정보 표출 제거
- **상세 페이지 날짜 추가**: Step 2 헤더에 DDMMM 형태 날짜 추가 (예: KE1207 09:30(오전) B737-800 21MAY)
- **좌석 공급석 수정 UI 개선**: 사용자 친화적으로 눈에 띄고 편리한 UI로 재설계
- **L/F progress bar 굵기 개선**: 더 굵게 수정하여 가시성 향상

#### 시뮬레이터 (FR-06)
- **국내선 전체 옵션 추가**: 노선 선택에 '국내선 전체' 옵션 추가, 기본값으로 설정
- **노선별 데이터 연동**: 노선 변경 시 '예상 수익', '예상 Load Factor', '예상 일일 예약' 등 데이터 변동

#### 보고서 (FR-08)
- **기간 필터링 기반 일별 수익**: 기간 필터 기준 날짜별 일별 수익 표출 ('최근 8일' 하드코딩 제거)
- **그래프 형태 최적화**: '노선별 수익 달성률', '월별 Yield 추이' 그래프를 데이터 특성에 맞는 형태로 변경

---

## 2026-05-19 — 기내 좌석 배치도 좌석 크기·간격 확대 및 특가 구역 전체 표시

**파일**: `frontend/src/components/FareManagement.tsx`

### 변경 전
- 좌석 크기: 프레스티지 22×18px, 이코노미 17×14px
- 좌석/행 간격: 2px
- `maxHeight: 400`으로 특가(V) 구역 일부 잘림

### 변경 후
- 좌석 크기: 프레스티지 **32×26px**, 이코노미 **24×20px** (약 40% 확대)
- 좌석 간격 gap: 2→**4px**, 통로 폭: 8/10→**12/16px**, 행 간격: `space-y-0.5`→`space-y-1`
- 카드 패딩: `px-3 pt-5 pb-4`→**`px-4 pt-6 pb-5`**
- `maxHeight` 제한 완전 제거 → 모든 등급 구역 전체 표시 (스크롤 없음)
- 열 헤더 폰트: `text-[7px]`→**`text-[9px]`**

---

## 2026-05-19 — 기내 좌석 배치도 세로형 복원 및 레이아웃 원복

**파일**: `frontend/src/components/FareManagement.tsx`

### 변경 전
- SeatMap이 가로형으로 변경된 상태
- 좌석 등급별 운임 관리와 SeatMap 배치 혼재

### 변경 후
- **세로형 SeatMap** 복원: 기수(▲) → PRESTIGE 2+2 → ECONOMY 3+3 연속 구역
- **레이아웃**: `col-span-12 lg:col-span-8` (좌) + `col-span-12 lg:col-span-4` (우)
- **좌측 상단**: 좌석 등급별 운임 관리 (ClassEditCard 목록)
- **좌측 하단**: 기내 좌석 배치도 (SeatMap)
- **우측**: Profit Analysis + AI 전략 분석

---

## 2026-05-19 — 기내 좌석 배치도 항공사 실제 화면 기준 재설계

**파일**: `frontend/src/components/FareManagement.tsx`

### 변경 전
- 단순 격자형 좌석 표시, 고정 위치 tooltip (fixed position)

### 변경 후
- **세로형 레이아웃**: 기수(▲) → PRESTIGE 2+2 → 점선 ECONOMY 구분 → Y/M/V 연속 3+3 배치
- **SeatBtn 색상**: 프레스티지=amber, 정상=blue, 할인=teal, 특가=violet / 판매석(짙은색) vs 여석(연한색)
- **Tooltip**: `position: absolute`, `bottom: calc(100% + 5px)` — 해당 좌석 바로 위 표시
- **RowLine**: 행번호 + 좌측 좌석 + 통로 + 우측 좌석
- **ColLabels**: A B C / D E F 열 헤더
- **우측 legend**: 등급별 색상 샘플 + LF 진행 바 + 잔여석/전체석 표시

---

## 2026-05-19 — EMSRb 알고리즘 기반 좌석 배분 구현 + 코드 배지 미표출

**파일**: `frontend/src/data/mockData.ts`, `frontend/src/components/FareManagement.tsx`

### 변경 전
- `buildDashboardFlights`: 고정 비율(`cfg.y`, `cfg.m`, `cfg.v`)로 좌석 수 결정
- `aiReallocateSeats`: 기회비용/수익기여 greedy 방식으로 좌석 재배분
- ClassEditCard: 우측 상단에 클래스 코드(C/Y/M/V) 배지 표시

### 변경 후
#### `frontend/src/data/mockData.ts`
- `_normInv()`: Abramowitz & Stegun 26.2.17 유리 근사식 기반 역정규분포 함수 추가
- `EMSRbInput` 인터페이스 export
- `emsrb(classes, totalSeats)` 함수 export:
  - 입력: 운임 내림차순 정렬 EMSRbInput 배열
  - Protection level: `y_k = μ_agg + σ_agg × normInv(1 − p_{k+1}/virtualFare_agg)`
  - 버킷 변환, minSeats 보장, 합계=totalSeats 정합성 보정
- `buildDashboardFlights()`:
  - Y/M/V 좌석 수 → EMSRb 산출값으로 교체
  - `ecoDemand = (lf/100) × total × 0.92`, 수요 분담: Y=20%, M=48%, V=32%
  - CV 가변: LF≥80→0.20, ≥60→0.25, <60→0.40

#### `frontend/src/components/FareManagement.tsx`
- `aiReallocateSeats()`: EMSRb 기반 재배분으로 전면 교체
  - pool = totalSeats − (프레스티지 + Closed + target 등급 신규 좌석수)
  - eligible 등급에만 EMSRb 결과 적용
  - Sold Out/Open 상태 자동 재계산
- `console.group` 로그: 방향별 이유 문장 + LF·CV·pool 분석 + `console.table` 등급별 결과
- `ClassEditCard`: 클래스 코드 배지(`w-8 h-8 rounded-lg` div) 삭제, 등급명만 표시

---

## 2026-05-19 — AI 전략 분석 실제 Claude API 기반 등급별 운임 추천 구현

**파일**: `ai_engine/claude_ai_engine.py`, `ai_engine/mock_ai_engine.py`, `backend/app/schemas/schemas.py`, `backend/app/services/ai_recommendation_service.py`, `backend/app/routers/ai_recommendation.py`, `frontend/src/components/FareManagement.tsx`

### 변경 전
- `analyze_strategy`가 단일 `price_factor`만 반환 (전체 운임 일괄 조정)
- 프론트에서 클래스 데이터를 백엔드에 전달하지 않음
- 팝업에 단일 권고 운임 하나만 표시

### 변경 후
- **모델**: `claude-sonnet-4-6` 사용
- **시스템 프롬프트**: RM 전문가 역할 정의, 등급별 조정 원칙, BR-03 규칙, 출력 스키마 명시
- **컨텍스트 강화**: 요청 시 선택 항공편의 전체 클래스 정보(코드·이름·좌석수·판매석·현재운임·상태) 전달
- **응답 구조**: `class_adjustments` 배열 — 등급별 권고가 + 이유 반환
- **BR-03 적용**: 현재 운임 ±30% 초과 추천 자동 클램핑
- **Mock fallback**: 동일 구조로 이슈 키워드 기반 등급 차별화 추천
- **UI**: 팝업에 등급별 추천가 테이블 (현재가 → 권고가, 변동률, 이유) 표시
- **적용**: "전략 승인 및 전체 적용" 클릭 시 등급별 추천가가 각 클래스에 반영

---

## 2026-05-19 — Closed 등급 좌석 수 변경 차단 버그 수정

**파일**: `frontend/src/components/FareManagement.tsx`

### 문제
- Closed 등급의 좌석 수가 다른 등급 좌석 수 변경 시 함께 변동됨
- 좌석 이관 시 Closed 등급이 자동으로 Open 상태로 전환됨
- Closed 등급의 좌석 수 직접 편집이 UI에서 차단되지 않음

### 수정
1. **`aiReallocateSeats` 함수**
   - `target.status === "Closed"` 조기 반환 추가 — 직접 편집 시 즉시 차단
   - `others` 필터에 `c.status !== "Closed"` 조건 추가 — 차감/이관 후보에서 Closed 제외
   - 이관받는 등급의 `status = "Open"` 자동 전환 코드 제거

2. **`commitEdit` 함수**
   - `targetCls.status === "Closed"` 방어 조건 추가

3. **`ClassEditCard` 컴포넌트**
   - `seatsLocked`: `isPrestige` → `isPrestige || isClosed`
   - 툴팁 메시지: 프레스티지/Closed 각각 별도 문구 표시

---

## 2026-05-18 (실제 대한항공 국내선 항공편 표출)

### 기능 구현: B737-900 고정 편성 → 실제 대한항공 국내선 스케줄 전면 반영

- `frontend/src/data/mockData.ts`
  - `DashboardFlight` 인터페이스에 `aircraft: string`, `totalSeats: number` 필드 추가
  - `AIRCRAFT_CONFIG` 상수 추가: B737-900ER(200석), B737-800(158석), A220-300(130석) 좌석 배분
  - `ROUTE_SCHEDULES` 상수 추가: 9개 노선 × 실제 KE 편명/출발시간/기종 (GMP-CJU 14편, GMP-PUS 6편, ICN-CJU 5편 등 총 45편)
  - `buildDashboardFlights()` 전면 재작성: 고정 4편 → `ROUTE_SCHEDULES` 기반 노선별 실제 편수/기종/좌석 동적 생성
- `frontend/src/components/FareManagement.tsx`
  - 운항 현황 서브타이틀: 하드코딩 `"B737-900 (C8 / Y165)"` → `"{selectedFlight.aircraft} ({selectedFlight.totalSeats}석)"` 동적 표시
  - 좌석 등급별 운임 관리 우측 배지: 하드코딩 `"C8 + Y165 = 173 Seats"` → 선택 항공편 실제 클래스별 좌석 수 합산 동적 표시
  - 미사용 `classTagColor` 함수 제거 (TypeScript strict 오류 해소)
- `backend/seed_data.py`
  - `ROUTE_SCHEDULES` 딕셔너리 추가: 9개 노선 × 실제 KE 편명/출발시각/time_slot/기종
  - `AIRCRAFT_CONFIG` 딕셔너리 추가: 기종별 C/Y/M/V/total 좌석 수
  - Seeding 루프 변경: 노선별 `ROUTE_SCHEDULES` 순회 → 편명/기종 그대로 DB 저장
  - `baseCost` 기종 크기 반영(B737-900ER +10%, A220-300 -12%)
  - DB 삭제 후 재시드: **4,050 flights, 16,200 fare tiers, 7,290 competitor prices**

## 2026-05-18 (requirement_report.md — 보고서 노선·기간 필터링)

### 보고서 생성 시 선택 필터 조건에 맞는 데이터만 표출

- `frontend/src/stores/reportStore.ts`
  - `ALL_ROUTE_PERF`: 8개 전 노선 성과 데이터로 확장 (기존 4개 → 8개)
  - `YIELD_BY_MONTH`: 월 번호 → Yield 데이터 맵 추가
  - `parseHistoryDate()`: "5/8" 형식 문자열 → Date 변환 헬퍼 추가
  - `getMonthsInRange()`: 기간 내 포함 월 목록 반환 헬퍼 추가
  - `scaleRevenue()`: 선택 기간 일 수 기준 수익 비례 스케일링 헬퍼 추가
  - `generateReport`: 노선 선택 시 해당 노선만 필터링, 미선택 시 전 노선 합산; 기간 비례 스케일링; 기간 내 월만 Yield 표시; 기간 내 일별 수익 필터링
- `aidlc-docs/inception/requirements/requirements_delta_v3.md` — `# 보고서` 섹션에 신규 항목 추가
- `aidlc-docs/inception/requirements/requirements.md` — FR-08 보고서 필터링 조건 명세 추가

---

## 2026-05-18 (DOCX 품질 개선 — PDF와 동등한 내용 구성)

### DOCX 다운로드 내용 전면 개선

- `frontend/src/stores/reportStore.ts`
  - `downloadDocx` 전면 재작성: 단순 텍스트 나열 → 구조화된 표 기반 문서
  - Executive Summary 표 (총 수익/목표 달성률/AI 기여도), 노선별 수익 표 (실적·목표·달성률·L/F), 월별 Yield 추이 표, AI 기여도 표, 최근 8일 일별 수익 표
  - 대한항공 네이비(#002561) 헤더 색상, 달성/미달 조건부 색상(emerald/amber) 적용
  - `makeCell` 헬퍼로 배경색·글자색·볼드·정렬 일괄 적용
  - 수익 최적화 결론 문단(회색 배경 강조) 추가
  - 폰트: Malgun Gothic

---

## 2026-05-18 (PDF html-to-image 교체 — oklch 완전 해결)

### PDF 생성 라이브러리 html2canvas → html-to-image 교체

- `frontend/src/stores/reportStore.ts`
  - `downloadPdf`: `html2canvas` 제거 → `html-to-image` `toPng()` 사용
  - html-to-image는 `getComputedStyle()`로 인라인화하여 oklch() CSS 변수를 완전히 우회
  - onclone 방식으로는 html2canvas가 `<style>` 파싱 단계에서 이미 oklch()를 만나기 때문에 해결 불가능
- `frontend/package.json` — `html-to-image` 패키지 추가

---

## 2026-05-18 (PDF oklch 색상 파싱 오류 수정)

### PDF 다운로드 시 oklch 색상 함수 파싱 오류 수정

- `frontend/src/stores/reportStore.ts`
  - `downloadPdf` `onclone` 콜백 개선: Tailwind CSS v4가 CSS 변수에 oklch() 색상 함수를 사용하는데 html2canvas가 이를 파싱하지 못해 `Error: Attempting to parse an unsupported color function "oklch"` 오류 발생
  - 원본 DOM 요소의 `window.getComputedStyle()`로 계산된 rgb/rgba 값을 클론 요소에 인라인 style로 직접 적용하여 oklch() 참조를 우회
  - 대상 속성: color, background-color, border-\*-color, outline-color

---

## 2026-05-15

### [Code Generation] 전체 시스템 초기 생성

- `frontend/src/types/index.ts` — 22개 DTO 타입 정의 신규 생성
- `frontend/src/api/apiClient.ts` — REST API 클라이언트 신규 생성
- `frontend/src/stores/dashboardStore.ts` — 대시보드 Zustand store 신규 생성
- `frontend/src/stores/fareStore.ts` — 운임 관리 Zustand store 신규 생성
- `frontend/src/stores/aiRecommendationStore.ts` — AI 추천 Zustand store 신규 생성
- `frontend/src/stores/simulationStore.ts` — 시뮬레이션 Zustand store 신규 생성
- `frontend/src/stores/reportStore.ts` — 보고서 Zustand store 신규 생성
- `frontend/src/components/Dashboard.tsx` — Zustand 연동, KPI 카드, 차트 완성
- `frontend/src/components/FareManagement.tsx` — FareStore 연동, 인라인 편집, AI 전략 분석
- `frontend/src/components/AiRecommendations.tsx` — 수동 승인 전용으로 재작성 (자동승인/비상잠금 제거)
- `frontend/src/components/Simulator.tsx` — SimulationStore 연동, 노선 선택, 결과 차트
- `frontend/src/components/Report.tsx` — ReportStore 연동, PDF/DOCX 다운로드, 이메일 전송
- `frontend/src/App.tsx` — 6탭 네비게이션 (대시보드/운임관리/AI추천/경쟁사/시뮬레이터/보고서)
- `frontend/package.json` — zustand ^5.0.5 의존성 추가
- `frontend/tsconfig.app.json` — strict: true 활성화
- `backend/` — FastAPI 백엔드 전체 생성 (models, schemas, repositories, services, routers, seed_data)
- `ai_engine/` — MockAiEngine, MockSimulationEngine, 인터페이스 생성
- `backend/tests/test_fare_invariants.py` — Hypothesis PBT 테스트 4개 (BR-01/04/08, 4/4 PASS)

### AI 추천 탭 제거 — FareManagement에 통합

- `frontend/src/App.tsx` — "AI 추천" 탭 제거 (6탭 → 5탭)
- `frontend/src/components/FareManagement.tsx` — 우측 Profit Analysis 패널 아래 AI 추천 목록 통합 (승인/거부 버튼 포함)

### AI 추천 상세 보기 팝업 개선

- `frontend/src/components/FareManagement.tsx`
  - 등급 카드의 "적용" 버튼 → "상세 보기" 버튼으로 교체
  - 클릭 시 dimmed 오버레이 + 중앙 모달 형태로 추천 상세 표시 (현재가/추천가/분석근거/판매율/닫기·적용 버튼)
  - 우측 하단 AI 추천 목록 중복 제거

### AI 전략 분석 결과 팝업 개선

- `frontend/src/components/FareManagement.tsx`
  - "AI 전략 분석 시작" 버튼 결과를 인라인 → dimmed 오버레이 + 중앙 모달로 변경

### 경쟁사 모니터링 — 항공사명 변경

- `frontend/src/components/CompetitorMonitor.tsx` — "우리 항공" → "대한항공"

### 경쟁사 모니터링 — 부킹 클래스 통일

- `frontend/src/data/mockData.ts` — 경쟁사 가격 데이터 Y/M/Q → F/C/Y/V 기준으로 전면 교체
- `frontend/src/components/CompetitorMonitor.tsx`
  - 클래스 정의 F/C/Y/V로 변경
  - 대한항공 운임 `buildDashboardFlights` 기반으로 노선 연동
  - 노선 탭 `KE_DOMESTIC_ROUTES` (9개)로 통일
  - 헤더에 클래스명 한글 표기 추가 (예: F (일등석))

---

## 2026-05-18

### Requirements 파일 구조 재편

- `aidlc-docs/inception/requirements/requirements.md` → `requirements_delta_v1.md` (이름 변경, git mv)
- `aidlc-docs/inception/requirements/requirements_v2.md` → `requirements_delta_v2.md` (이름 변경, git mv)
- `aidlc-docs/inception/requirements/requirements.md` 신규 생성 — v1 + v2 + changelog 반영 통합 전체 요구사항 파일

---

## 2026-05-18 (requirement_report.md — PDF Executive Summary 일치 출력)

### 보고서 PDF 다운로드 품질 개선

- `frontend/src/stores/reportStore.ts`
  - `downloadPdf`: html2canvas `onclone` 콜백에서 Recharts SVG `xmlns` 속성 보장 → SVG 차트 blank 문제 해결
  - 이미지 포맷 PNG → JPEG(0.95) 변환으로 jsPDF 임베드 안정성 향상
  - `allowTaint: true`, `logging: false`, `imageTimeout: 15000` 옵션 추가
  - 실패 시 텍스트를 `.pdf`로 저장하는 fallback 제거 → alert 안내로 대체 (잘못된 PDF 파일 생성 방지)
  - `buildTextContent`, `downloadBlob` 헬퍼 함수 제거
  - `downloadDocx` fallback도 동일하게 alert 안내로 교체
- `aidlc-docs/inception/requirements/requirements_delta_v3.md` — `# 보고서` 섹션에 신규 항목 추가
- `aidlc-docs/inception/requirements/requirements.md` — FR-08 PDF 캡처 명세 업데이트

---

## 2026-05-18 (requirement_report.md — 경쟁사 노선 선택 유지)

### 경쟁사 모니터링 새로고침 시 선택 노선 초기화 버그 수정

- `frontend/src/App.tsx`
  - `<CompetitorMonitor key={refreshKey} ...>` → `key` prop 제거
  - `refreshKey` prop만으로 갱신 연동 유지 → 새로고침 시 `selectedRoute` 상태 보존
- `aidlc-docs/inception/requirements/requirements_delta_v3.md` — `# 경쟁사 모니터링` 섹션에 신규 항목 추가
- `aidlc-docs/inception/requirements/requirements.md` — FR-05 새로고침 연동 명세에 "선택 노선 유지" 조건 추가

---

## 2026-05-18 (requirement_report.md — 경쟁사 새로고침 버튼 제거)

### 경쟁사 모니터링 별도 새로고침 버튼 제거

- `frontend/src/components/CompetitorMonitor.tsx`
  - 로컬 새로고침 버튼(`<button>새로고침</button>`) 및 `handleRefresh` 핸들러, `refreshing` state 제거
  - `useCallback` import 제거, `RefreshCw` icon import 제거
  - 앱 헤더 새로고침(`refreshKey` prop) 연동은 그대로 유지
- `aidlc-docs/inception/requirements/requirements_delta_v3.md` — `# 경쟁사 모니터링` 섹션에 신규 항목 추가
- `aidlc-docs/inception/requirements/requirements.md` — FR-05 앱 헤더 새로고침 연동 명세에 "별도 로컬 버튼 없음" 명시

---

## 2026-05-18 (노선 데이터 정정)

### 대한항공 미운항 노선 제거

- `frontend/src/data/mockData.ts`
  - `KE_DOMESTIC_ROUTES`에서 `"GMP-CJJ"` 제거 (9개 → 8개)
  - `buildDashboardFlights()` routeMultiplier에서 `"GMP-CJJ": 0.85` 항목 제거
- `aidlc-docs/inception/requirements/requirements.md`
  - FR-01, FR-05, FR-06 데이터 범위 노선 수 9개 → 8개, GMP-CJJ 제외 명시
- 사유: 대한항공 실제 홈페이지 확인 결과 김포-청주(GMP-CJJ), 인천-청주(ICN-CJJ) 노선 미운항

---

## 2026-05-18 (requirement_report.md 반영)

### Requirements 문서 업데이트 (requirement_report.md → v3 반영)

- `aidlc-docs/inception/requirements/requirements_delta_v3.md`
  - `# 보고서` 섹션에 신규 항목 2개 추가:
    1. PDF/DOCX 다운로드 시 'PDF 문서를 로드하지 못했습니다.' 오류 수정 필요
    2. 이메일 전송 시 pdf·docx 파일을 첨부파일로 포함하여 전송
- `aidlc-docs/inception/requirements/requirements.md`
  - FR-08 보고서 섹션: PDF 오류 미발생 보장 조건 추가, 이메일 전송 첨부파일 포함 명세로 변경
  - 마지막 통합 기준 주석 업데이트 (requirement_report.md 반영 일자 포함)
  - 변경 이력 테이블에 `report` 버전 항목 추가

---

## 2026-05-18 (v3 구현 완료)

### 반응형 레이아웃 전면 적용

- `frontend/src/App.tsx` — 사이드바 모바일 대응: `fixed h-full z-30 w-56`, 모바일 overlay, hamburger/X 버튼, navigate() 시 사이드바 닫기

### 좌석 등급 명칭 및 좌석 수 확정 (B737-900 기준)

- `frontend/src/data/mockData.ts`
  - 일등석(F, 4석) 제거
  - 프레스티지(C, 8석) / 일반석 정상(Y, 30석) / 일반석 할인(M, 85석) / 일반석 특가(V, 50석) = 173석
  - FlightStatus `"위험"` → `"매진임박"` 변경

### 운임 관리 (FareManagement) 개선

- `frontend/src/components/FareManagement.tsx` (전체 재작성)
  - buildWeekAroundDate(centerDate): 달력 선택 날짜 ±3일 7일 표시
  - aiSuggestionLabel(current, ai): "유지" / "가격을 올리세요" / "가격을 내리세요" 문구 생성
  - 운항현황 테이블 "현재가" 컬럼 제거
  - ClassEditCard: isRejected prop 추가 → 거부 시 회색 overlay + "AI 추천 거부됨" 배지 표시
  - rejectedClasses Set으로 거부 상태 영구 유지 (비활성화)
  - redistributeClosedSeats(): Closed 등급 잔여 좌석 마지막 Open 등급으로 자동 이관
  - handleConfirmInventory(): PUT /fares/{flightId} API 호출로 백엔드 저장
  - runAi(): POST /recommendations/strategy 실제 API 연동 (오류 시 mock fallback)
  - "AI 분석 근거" 섹션 하단에서 제거

### 경쟁사 모니터링 개선

- `frontend/src/components/CompetitorMonitor.tsx`
  - refreshKey prop 추가 → 앱 헤더 새로고침 버튼과 연동
  - "당일 날짜 기준" 배지 + Calendar 아이콘 + 현재 일시 표시
  - 로컬 새로고침 버튼 추가 (RefreshCw 스피너)
  - 클래스 목록 ["C","Y","M","V"]로 변경, CLASS_LABELS 한글명 업데이트
  - mapCompClass(): F→C 하위 호환 처리

### 시뮬레이터 개선

- `frontend/src/components/Simulator.tsx` — "신규 경쟁사 진입" 토글 → "환율 변동 (%)" 슬라이더 (-20%~+30%, 5% 단위)
- `frontend/src/stores/simulationStore.ts` — exchangeRatePercent 파라미터 추가, calcImpact() 환율 효과 반영
- `frontend/src/types/index.ts` — SimulationParamsDTO: newCompetitorEntry → exchangeRatePercent

### 보고서 기능 개선

- `frontend/src/stores/reportStore.ts`
  - downloadPdf: html2canvas로 미리보기 DOM 캡처 → jsPDF 멀티페이지 → .pdf 다운로드
  - downloadDocx: docx 라이브러리로 구조화된 .docx 파일 생성
  - sendEmail: mailto: 프로토콜로 기본 이메일 클라이언트 연동

### Vite 빌드 환경 수정

- Vite 8 → Vite 5 다운그레이드 (Node.js v18.17.1 호환)
- @vitejs/plugin-react 6 → 4 다운그레이드 (Vite 5 호환)
- npm run build 정상 완료 확인

### Requirements 문서 업데이트

- `aidlc-docs/inception/requirements/requirements.md` v3 내용 통합
  - 좌석 등급 명칭/수 확정, NFR-06 반응형 추가, FR-05/06/08 v3 반영, 기술 스택 업데이트

---

## 2026-05-18 (requirements_delta_jin.md 구현)

### 전체 — 여백·반응형 개선
- `frontend/src/components/FareManagement.tsx`
  - 운임관리 페이지 `-m-8` 제거, `p-4 sm:p-6 lg:p-8` 적용으로 여백 개선
  - 모바일 내부 햄버거 버튼(sidebarOpen/setSidebarOpen) 및 슬라이드 사이드바 완전 제거
  - 달력+AI 전략 분석 영역을 `col-span-12 lg:col-span-3` 인라인 aside로 항상 노출

### 운임관리 — 주간 피커 슬라이드 애니메이션
- `frontend/src/components/FareManagement.tsx`
  - `weekAnim` state + `changeDate(date, direction)` 함수 추가
  - CSS @keyframes slideInLeft/slideInRight (0.32s cubic-bezier) 인라인 주입
  - 날짜 클릭 방향(좌/우)에 따라 slide-left / slide-right 클래스 적용

### 운임관리 — Sold Out 완전 잠금
- `frontend/src/components/FareManagement.tsx` > `ClassEditCard`
  - `isSoldOut` 판별 → 운임 편집 버튼, 좌석 편집 버튼, 상태 토글 버튼 모두 disabled
  - Sold Out 카드: 회색 배경(`bg-slate-100 opacity-60`), 커서 not-allowed
  - AI 추천 상세 보기도 `!isSoldOut` 조건으로 숨김

### 운임관리 — AI 거부 음영 제거 (수동 편집 허용)
- `frontend/src/components/FareManagement.tsx` > `ClassEditCard`
  - 기존: `isRejected` 시 `opacity-60` 음영 + 모든 편집 비활성
  - 변경: 음영 제거, `editLocked`은 Sold Out/Closed 기준으로만 판단
  - 거부 배지 문구: "AI 추천 거부됨 — 수동 편집 가능"으로 변경

### 운임관리 — Closed 로직 세분화
- `frontend/src/components/FareManagement.tsx`
  - `toggleStatus()`: Sold Out 방어(early return), 일반석 Closed 시 `seats = sold` 처리
  - `redistributeClosedSeatsAI()`: 마지막 Open 등급 → L/F가 가장 낮은 Open 일반석 등급으로 이관
  - `ClassEditCard`: `editLocked = isSoldOut || isClosed` 기준 통일
  - Closed 안내 메시지: 프레스티지 vs 일반석 문구 구분

### 요구사항 문서 업데이트
- `requirements_delta_jin.md` 내용을 `requirements_delta_v3.md`에 병합
- `requirements.md` 버전 이력·FR-02·NFR-06 업데이트

---

## 2026-05-18 (requirements_delta_jin.md v2 구현)

### 운임관리 — Open/Closed/Sold Out 좌석 로직 전면 개편
- `frontend/src/components/FareManagement.tsx`
  - `redistributeClosedSeatsAI()` 함수 제거 — Closed 전환 시 자동 좌석 이관 로직 삭제
  - `toggleStatus()` 단순화: 상태만 전환 (seats 자동 변경 없음), Sold Out 토글 방어만 유지
  - `aiReallocateSeats()` 신규 함수 추가:
    - 총 좌석 불변 원칙 적용
    - 증가 시: 기회비용 최소(price×spare 최소) 일반석 등급에서 차감
    - 감소 시: 수익 기여 최대(price×spare 최대) 일반석 등급으로 이관
    - sold≥seats 조건 도달 시 Sold Out 자동 전환
    - 차감/이관 불가 시 error 메시지 반환
  - `commitEdit()` 좌석 수 처리 개편: 프레스티지 방어 → `aiReallocateSeats()` 호출 → error 시 alert 배너
  - `seatAlert` state 추가: 4초 자동 소멸 배너
  - `ClassEditCard`: `editLocked` 제거, `priceLocked=false` / `seatsLocked=isPrestige`로 분리
    - Sold Out도 운임·좌석 수 편집 허용
    - Closed 카드 배경 orange, Sold Out 카드 배경 red-50

### 요구사항 문서 업데이트
- `requirements_delta_v3.md` — jin v2 내용 병합
- `requirements.md` — FR-02 좌석 로직 최신화, 버전 이력 추가

---

## 2026-05-18 (Closed 운임 잠금)

### 운임관리 — Closed 상태 운임 수정 잠금
- `frontend/src/components/FareManagement.tsx` > `ClassEditCard`
  - `priceLocked = isClosed` 로 변경 (기존 `false`)
  - Closed 등급의 운임 버튼: disabled + 회색 처리 + "Closed 상태 — 운임 수정 불가" 툴팁

### 요구사항 문서 업데이트
- `requirements_delta_v3.md` — Closed 운임 잠금 내용 추가
- `requirements.md` — 동일 반영

---

## 2026-05-18 (Sold Out 좌석 증가 시 Open 복구 버그 수정)

### 운임관리 — Sold Out → Open 자동 복구 누락 수정
- `frontend/src/components/FareManagement.tsx` > `aiReallocateSeats()`
  - 버그: 좌석 증가(delta > 0) 시 변경 대상 등급의 seats > sold 조건에서 Sold Out → Open 복구 로직 누락
  - 수정: `updated[tidx].seats > updated[tidx].sold && status === "Sold Out"` 조건에서 Open으로 전환

---

## 2026-05-18 — requirements_delta_jin.md 검증 및 제거

### [Requirements] requirements_delta_jin.md 내용 검증 및 통합 완료
- `requirements_delta_v3.md` 검증: jin v1·v2·v2보완 내용 모두 반영 확인 (완전)
- `requirements.md` 검증: FR-01·FR-02·NFR-06 반영 확인. Section 11 버전이력에 누락된 2개 행 추가:
  - `jin v2 보완` — Closed 상태 운임 수정 잠금
  - `버그수정` — Sold Out → Open 자동 복구 누락 수정
- `requirements_delta_jin.md` 삭제 완료 (내용 전량 requirements_delta_v3.md에 보존)

---

## 2026-05-18 (커맨드 추가 수정)

### 버그 수정: FareTier not found — 클래스 코드 불일치 (B → M)

- `backend/seed_data.py`
  - `TIER_CONFIG`: `("B", TierCode.ECONOMY_DISCOUNT, 50)` → `("M", TierCode.ECONOMY_DISCOUNT, 85)` 수정
  - 좌석 수 프론트 기준으로 정렬: Y=30, M=85, V=50 (총 173석)
  - `COMPETITOR_BOOKING_CLASSES`: `["Y","B","V"]` → `["Y","M","V"]`
  - 경쟁사 가격 시딩 조건 `cls == "B"` → `cls == "M"` 수정
  - DB 초기화 후 재시드 (3240 flights, 12960 fare tiers)

### UI 개선: 부킹 클래스 코드(C/Y/M/V) 화면에서 숨김

- `frontend/src/components/FareManagement.tsx`
  - 좌석 등급 카드 헤더: 클래스 코드 태그(`C` 등) 제거, 등급명만 표시
  - AI 추천 상세 모달 서브타이틀: `cls.code` 제거
- `frontend/src/components/CompetitorMonitor.tsx`
  - 테이블 헤더: `C (프레스티지)` → `프레스티지` (한글명만 표시)
  - 클래스별 카드 제목: 동일하게 한글명만 표시

### UX 개선: 인벤토리 확정 시 AI 추천 버튼 처리

- `frontend/src/components/FareManagement.tsx`
  - `confirmedClasses` Set state 추가 (확정 처리된 클래스 추적)
  - `handleConfirmInventory` 성공 시: 미처리 AI 추천 영역을 배지 없이 조용히 숨김 (`confirmedClasses`에 추가)
  - `ClassEditCard.hasDiff` 조건에 `!isConfirmed` 추가
  - `ClassEditCard` props에 `isConfirmed` 추가

### UX 개선: AI 추천 없을 때 확정 버튼 숨김

- `frontend/src/components/FareManagement.tsx`
  - `hasPendingAi` 계산 추가: 선택 항공편에 미처리 AI 추천이 하나라도 있는지 여부
  - 확정 버튼 및 오류 메시지를 `hasPendingAi === true` 일 때만 렌더링

---

## 2026-05-18 (v3-hyunah 개발 구현)

### 버그 수정: 인벤토리 실시간 통제 확정 — FareTier not found 오류

- `backend/app/repositories/fare_repository.py` — `get_flight_by_number()` 메서드 추가 (편명으로 Flight 조회, 최근 날짜 기준)
- `backend/app/services/fare_service.py` — `_resolve_flight_id()` 추가: UUID가 아닌 편명(KE1211 등) 입력 시 DB flight.id로 자동 변환
- `backend/app/services/ai_recommendation_service.py` — `request_strategy_analysis()`에 동일 flight_number fallback 적용
- `frontend/src/components/FareManagement.tsx`
  - `confirmError` state 추가
  - `handleConfirmInventory`: 백엔드 오류 시 에러 메시지 표시, 성공/실패 케이스 분리 (기존: 오류 시에도 성공으로 처리)
  - 확정 버튼 상태 3단계: 기본(네이비) / 저장 완료(초록) / 저장 실패(빨강) + 오류 메시지 박스

### 기능 구현: AI 전략 분석 — Claude API 실제 호출

- `ai_engine/claude_ai_engine.py` 신규 생성 — Claude claude-sonnet-4-6 모델 호출, ANTHROPIC_API_KEY 없으면 MockAiEngine fallback
- `backend/app/services/ai_recommendation_service.py` — `MockAiEngine` → `ClaudeAiEngine` 교체
- `backend/app/main.py` — `load_dotenv()` 추가 (`.env` 파일 자동 로드)
- `backend/requirements.txt` — `anthropic>=0.50.0` 추가
- `backend/.env.example` 신규 생성 — ANTHROPIC_API_KEY 설정 안내
- `backend/seed_data.py` 실행 — DB 초기 데이터 생성 (3240 flights, 12960 fare tiers)

---

## 2026-05-18 (v3-hyunah 요구사항 반영)

### Requirements 문서 업데이트 (requirements_delta_v3_hyunah.md 반영)

- `aidlc-docs/inception/requirements/requirements_delta_v3.md`
  - Profit Analysis 영역: "FareTier not found: KE1211/C" 오류 버그 수정 요건 추가
  - AI 전략 분석 요청 영역: AI model 실제 호출 요건 명확화 ([hyunah] 태그로 기여자 표시)
- `aidlc-docs/inception/requirements/requirements.md`
  - FR-03 AI 전략 분석 요청: 'AI 전략 분석 시작' 버튼 클릭 시 AI model 실제 호출 요건 반영 (하드코딩 제거 명시)
  - FR-04 실시간 대시보드: 인벤토리 실시간 통제 확정 버튼 FareTier 미존재 오류 수정 요건 반영
  - 버전 이력 테이블에 v3-hyunah 항목 추가
  - 관리 정책 헤더 통합 기준에 v3-hyunah 명시

---

---

## 2026-05-19 (v4 구현)

### 운임관리 — Step1/Step2 화면 전환 구현
- `frontend/src/components/FareManagement.tsx`
  - `step` state 추가 (`"list"` | `"detail"`, 초기값 `"list"`)
  - 운항현황 테이블 row 클릭 시 `setStep("detail")` 전환
  - 중앙 section: step 분기 렌더링
    - `step === "list"`: 운항현황 테이블만 표시
    - `step === "detail"`: 뒤로가기 헤더 + SeatMap + ClassEditCard 그리드

### 운임관리 — 기내 좌석 배치도 (SeatMap) 신규 추가
- `frontend/src/components/FareManagement.tsx` 하단에 `SeatMap` 컴포넌트 추가
  - 클래스별 색상 시각화: 프레스티지=amber, 정상=blue, 할인=cyan, 특가=slate
  - 프레스티지 2+2 레이아웃 / 일반석 3+3 레이아웃
  - 행번호·열레이블·통로 표시
  - 마우스 호버 시 좌석번호·클래스·예약여부 툴팁
  - Closed 구역은 opacity-40 처리

### 백엔드 — EMSRb + Dynamic Pricing 알고리즘 신규 구현
- `backend/app/core/__init__.py` 신규 생성
- `backend/app/core/emsr.py` 신규 생성
  - EMSRb 알고리즘: FareClassInput(fare/mu/sigma) 입력 → Protection Level / Booking Limits 산정
  - scipy.stats.norm.ppf 활용 (미설치 시 수치 근사 fallback)
- `backend/app/core/pricing.py` 신규 생성
  - `logit_buy_probability()`: Logit WTP 구매 확률 모델
  - `prestige_dynamic_price()`: Pace-Based Continuous Pricing (잔여석 4석 이하 지수 상승)
  - `economy_uppricing()`: 특가 수요 급증 시 M 클래스 하한 Up-pricing
  - `recommend_prices()`: EMSRb + Dynamic Pricing 통합 추천 함수 (BR-01 클래스 가격 역전 방지 포함)
- `backend/app/routers/rm_optimize.py` 신규 생성
  - `POST /api/rm/optimize`: 통합 최적화 API
  - `POST /api/rm/simulate-scenario`: A/B/C 시나리오 시뮬레이션 API
- `backend/app/main.py` — rm_optimize 라우터 등록
- `backend/requirements.txt` — `scipy>=1.11.0` 추가

### Requirements 문서 업데이트
- `aidlc-docs/inception/requirements/requirements.md`
  - FR-01 Step1/2 화면 전환 및 기내 좌석 배치도 요건 추가
  - FR-01-1 다이나믹 프라이싱 알고리즘 요건 신규 추가
  - 버전 이력 v4 행 추가
  - 관리 정책 헤더 v4 반영

---
