# Changelog

코드 변경 이력입니다. 날짜 기준 최신순으로 기록합니다.

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
