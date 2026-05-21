# Frontend — Revenue Manager

React + TypeScript 기반의 항공 운임 수익 관리 시스템 프론트엔드입니다.
EMSRb 알고리즘으로 산출된 좌석 인벤토리 데이터를 시각화하고, 노선별 탑승률·수익을 실시간으로 모니터링합니다.

---

## 기술 스택

| 항목 | 버전 | 용도 |
|------|------|------|
| React | 19 | UI 프레임워크 |
| TypeScript | 6 | 타입 안전성 |
| Vite | 8 | 빌드 도구 / 개발 서버 |
| Tailwind CSS | 4 | 유틸리티 기반 스타일링 |
| Zustand | 5 | 전역 상태 관리 (노선별 flights 실시간 공유) |
| Recharts | 3 | 차트 및 데이터 시각화 |
| Lucide React | 1.16 | 아이콘 |
| jsPDF | 4 | 보고서 PDF 내보내기 |
| docx | 9 | 보고서 DOCX 내보내기 |
| html2canvas | 1 | 화면 캡처 (보고서 이미지) |

---

## 디렉터리 구조

```
src/
├── App.tsx                    # 루트 컴포넌트 (사이드바 네비게이션, 전역 새로고침)
├── main.tsx                   # 앱 진입점
├── components/
│   ├── Dashboard.tsx          # 대시보드 (KPI 카드, 수익·LF 추이 차트, 실시간 연동)
│   ├── FareManagement.tsx     # 운임 관리 (항공편·클래스별 운임 테이블, AI 추천, EMSRb)
│   ├── CompetitorMonitor.tsx  # 경쟁사 모니터링
│   ├── Simulator.tsx          # 시나리오 시뮬레이터 (수요 탄력성 기반)
│   ├── Report.tsx             # 수익 보고서 (PDF/DOCX 내보내기)
│   └── AiRecommendations.tsx  # AI 추천 목록
├── stores/
│   ├── flightsStore.ts        # 노선별 DashboardFlight 공유 (운임관리 ↔ 대시보드 연동)
│   ├── dashboardStore.ts
│   ├── fareStore.ts
│   ├── aiRecommendationStore.ts
│   ├── simulationStore.ts
│   └── reportStore.ts
├── data/
│   └── mockData.ts            # EMSRb 시뮬레이션, 기종별 좌석 구성, 노선·스케줄 데이터
├── api/
│   └── apiClient.ts           # Axios 기반 API 클라이언트
└── types/
    └── index.ts               # TypeScript 인터페이스 정의
```

---

## 실행 환경

- Node.js 18 이상
- npm 9 이상

---

## 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행 (기본 포트: 5173)
npm run dev

# 프로덕션 빌드
npm run build

# 빌드 결과물 미리보기
npm run preview
```

---

## 환경 설정

기본적으로 백엔드 API는 `http://localhost:8000` 을 바라봅니다.
URL을 변경하려면 `src/api/apiClient.ts` 의 `baseURL` 을 수정하세요.

---

## 페이지 구성

| 페이지 | 경로 ID | 설명 |
|--------|---------|------|
| 대시보드 | `dashboard` | KPI 요약 카드, 수익·예약·LF 추이 차트, 노선별/등급별 탑승률 |
| 운임 관리 | `fares` | 항공편·클래스별 운임 테이블, EMSRb 인벤토리, AI 추천 적용 |
| 경쟁사 모니터링 | `competitor` | 노선별 경쟁사 운임 현황 |
| 시뮬레이터 | `simulator` | 연료비·신규 경쟁사·가격 변동 시나리오 시뮬레이션 |
| 보고서 | `report` | 기간·노선별 수익 달성률 리포트, PDF/DOCX 내보내기 |

---

## 핵심 상태 관리

### flightsStore (Zustand)

운임관리 탭과 대시보드 탭 간 실시간 데이터 연동을 담당합니다.

```typescript
// 운임관리에서 LF 변경 시 → flightsStore 업데이트
setFlightsForRoute(selectedRoute, updatedFlights);

// 대시보드에서 읽기 → useMemo로 KPI 자동 계산
const liveStats = useMemo(() => {
  // flightsByRoute에서 routeLf, classLf, avgLf, todayRevenue 집계
}, [flightsByRoute]);
```

### 전역 새로고침

우측 상단 🔄 버튼은 `refreshKey`를 증가시켜 모든 탭에 전파합니다.

- `<Dashboard key={refreshKey} />` — 완전 리마운트
- `<FareManagement refreshKey={refreshKey} />` — useEffect로 재시뮬레이션
- `<CompetitorMonitor refreshKey={refreshKey} />` — 데이터 재조회
- `<Simulator key={refreshKey} />`, `<Report key={refreshKey} />` — 완전 리마운트

---

## mockData.ts 핵심 데이터

### 대상 노선 (KE_DOMESTIC_ROUTES)

`GMP-CJU`, `GMP-PUS`, `GMP-TAE`, `GMP-KWJ`, `ICN-CJU`, `ICN-PUS`, `GMP-KPO`, `GMP-RSU`

### 기종별 좌석 구성 (AIRCRAFT_CONFIG)

| 기종 | C (프레스티지) | Y (정상) | M (할인) | V (특가) | 합계 |
|------|---------------|----------|----------|----------|------|
| B737-900ER | 8 | 52 | 120 | 20 | 200석 |
| B737-800 | 8 | 41 | 94 | 15 | 158석 |
| A220-300 | 4 | 31 | 83 | 12 | 130석 |

### EMSRb 적용 방식

- V(특가)는 EMSRb 풀 분리 — `cfg.v` 고정 할당, `vFillRate`(탑승률 기반)로 판매량 산출
- Y/M만 `ymPool = totalEcon - cfg.v` 범위에서 EMSRb 적용
- 탑승률 85% 이상 시 V 거의 매진, 탑승률 낮을수록 V 잔여 좌석 유지
