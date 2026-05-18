# Frontend — Revenue Manager

React + TypeScript 기반의 항공 운임 수익 관리 시스템 프론트엔드입니다.

---

## 기술 스택

| 항목 | 버전 | 용도 |
|------|------|------|
| React | 19 | UI 프레임워크 |
| TypeScript | 6 | 타입 안전성 |
| Vite | 8 | 빌드 도구 / 개발 서버 |
| Tailwind CSS | 4 | 유틸리티 기반 스타일링 |
| Zustand | 5 | 전역 상태 관리 |
| Recharts | 3 | 차트 및 데이터 시각화 |
| Lucide React | 1.16 | 아이콘 |

---

## 디렉터리 구조

```
src/
├── App.tsx               # 루트 컴포넌트 (사이드바 네비게이션, 페이지 라우팅)
├── main.tsx              # 앱 진입점
├── components/
│   ├── Dashboard.tsx     # 대시보드 (수익·예약 현황, 차트)
│   ├── FareManagement.tsx# 운임 관리 (운임 조회·수정, AI 추천 적용)
│   ├── CompetitorMonitor.tsx # 경쟁사 모니터링
│   ├── Simulator.tsx     # 시나리오 시뮬레이터
│   ├── Report.tsx        # 수익 보고서
│   └── AiRecommendations.tsx # AI 추천 목록
├── stores/
│   ├── dashboardStore.ts
│   ├── fareStore.ts
│   ├── aiRecommendationStore.ts
│   ├── simulationStore.ts
│   └── reportStore.ts
├── api/
│   └── apiClient.ts      # Axios 기반 API 클라이언트
└── types/                # TypeScript 인터페이스 정의
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
| 대시보드 | `dashboard` | KPI 요약 카드, 수익·예약 추이 차트 |
| 운임 관리 | `fares` | 항공편·클래스별 운임 테이블, AI 추천 가격 비교 및 적용 |
| 경쟁사 모니터링 | `competitor` | 노선별 경쟁사 운임 현황 |
| 시뮬레이터 | `simulator` | 연료비 변동·신규 경쟁사 진입 시나리오 시뮬레이션 |
| 보고서 | `report` | 기간·노선별 수익 달성률 리포트 |
