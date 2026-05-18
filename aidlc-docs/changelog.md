# Changelog

코드 변경 이력입니다. 날짜 기준 최신순으로 기록합니다.

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
