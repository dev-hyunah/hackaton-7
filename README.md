# Revenue Manager — 항공 운임 수익 관리 시스템

대한항공 Revenue Management(RM) 시스템 프로토타입입니다.
EMSRb 알고리즘 기반 좌석 인벤토리 최적화, AI 운임 추천, 경쟁사 모니터링, 시뮬레이션, 보고서 기능을 제공합니다.

---

## 주요 기능

| 기능 | 설명 |
|------|------|
| **대시보드** | 노선·등급별 탑승률(LF), 수익 추이, AI 추천 건수 실시간 요약 |
| **운임 관리** | 항공편별 4개 좌석 클래스(C/Y/M/V) 운임 조회·수정, AI 추천 가격 적용, EMSRb 인벤토리 최적화 |
| **경쟁사 모니터링** | 노선별 타 항공사 운임 데이터 조회 |
| **시뮬레이터** | 연료비 변동·신규 경쟁사 진입·가격 조정 등 외부 요인에 따른 수요·수익 시뮬레이션 (IATA 수요 탄력성 적용) |
| **보고서** | 기간별·노선별 수익 달성률 리포트 (PDF/DOCX 내보내기 지원) |

---

## 기술 스택

### Backend
- **Python 3.11+** / **FastAPI 0.115**
- **SQLAlchemy 2.0** (ORM) + **SQLite** (개발용 DB)
- **Pydantic 2.10** (데이터 검증)
- **Uvicorn 0.32** (ASGI 서버)
- **Anthropic SDK** (Claude AI 엔진 연동)
- **SciPy** (EMSRb 정규분포 계산)

### Frontend
- **React 19** + **TypeScript 6**
- **Vite 8** (빌드 도구)
- **Tailwind CSS 4** (스타일링)
- **Zustand 5** (전역 상태 관리 — 노선별 실시간 flights 공유)
- **Recharts 3** (차트)
- **jsPDF / docx / html2canvas** (보고서 내보내기)

### AI Engine
- **ClaudeAiEngine** — Anthropic Claude 기반 자연어 이슈 분석 및 운임 전략 추천
- **MockAiEngine** — 탑승률 기반 규칙형 운임 추천 (±30% BR-03 제한 적용)
- `AbstractAiEngine` 인터페이스로 추상화되어 교체 가능

---

## 디렉터리 구조

```
hackaton-7/
├── backend/                  # FastAPI 백엔드
│   ├── app/
│   │   ├── main.py           # 앱 진입점, 미들웨어, 라우터 등록
│   │   ├── database.py       # DB 연결 설정 (SQLite)
│   │   ├── core/
│   │   │   └── pricing.py    # EMSRb 기반 운임 최적화 로직
│   │   ├── models/           # SQLAlchemy ORM 모델
│   │   ├── schemas/          # Pydantic 요청/응답 스키마
│   │   ├── repositories/     # DB 접근 레이어
│   │   ├── services/         # 비즈니스 로직
│   │   └── routers/          # API 엔드포인트
│   ├── tests/
│   ├── requirements.txt
│   └── seed_data.py          # 초기 샘플 데이터 삽입
├── frontend/                 # React 프론트엔드
│   ├── src/
│   │   ├── App.tsx           # 앱 루트, 사이드바 네비게이션, 전역 새로고침
│   │   ├── components/       # 페이지 컴포넌트
│   │   ├── stores/           # Zustand 스토어 (flightsStore 포함)
│   │   ├── data/             # mockData.ts (EMSRb 시뮬레이션, 노선·기종 데이터)
│   │   ├── api/              # API 클라이언트
│   │   └── types/            # TypeScript 타입 정의
│   └── package.json
└── ai_engine/                # AI 추천 엔진
    ├── interfaces.py         # AbstractAiEngine / AbstractSimulationEngine
    ├── claude_ai_engine.py   # Claude 기반 AI 엔진
    ├── mock_ai_engine.py     # 규칙형 Mock 구현체
    └── mock_simulation_engine.py
```

---

## 실행 환경

| 항목 | 요구 사항 |
|------|-----------|
| Python | 3.11 이상 |
| Node.js | 18 이상 |
| npm | 9 이상 |
| OS | macOS / Linux / Windows |

---

## 실행 방법

### 1. 저장소 클론

```bash
git clone <repository-url>
cd hackaton-7
```

### 2. 백엔드 실행

```bash
cd backend

# 가상환경 생성 및 활성화
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

# 의존성 설치
pip install -r requirements.txt

# (선택) 샘플 데이터 삽입
python seed_data.py

# 서버 시작
uvicorn app.main:app --reload --port 8000
```

백엔드 실행 후 접근 주소:

- API: `http://localhost:8000`
- Swagger 문서: `http://localhost:8000/docs`
- 헬스 체크: `http://localhost:8000/health`

### 3. 프론트엔드 실행

```bash
# 새 터미널에서
cd frontend

# 의존성 설치
npm install

# 개발 서버 시작
npm run dev
```

브라우저에서 `http://localhost:5173` 에 접속합니다.

---

## API 엔드포인트 요약

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/health` | 헬스 체크 |
| GET | `/dashboard/summary` | 대시보드 KPI 요약 |
| GET | `/fares/{route_id}` | 노선·날짜별 운임 조회 |
| PUT | `/fares/{flight_id}` | 운임 수정 |
| GET | `/fares/{flight_id}/history` | 운임 변경 이력 |
| GET | `/ai-recommendation` | AI 추천 목록 조회 |
| POST | `/ai-recommendation/generate` | AI 추천 생성 |
| PATCH | `/ai-recommendation/{id}/approve` | AI 추천 승인 |
| PATCH | `/ai-recommendation/{id}/reject` | AI 추천 거절 |
| GET | `/competitor` | 경쟁사 운임 조회 |
| POST | `/simulation/run` | 시뮬레이션 실행 |
| GET | `/report` | 보고서 조회 |
| POST | `/api/rm/optimize` | EMSRb 기반 인벤토리 최적화 |

전체 API 명세는 서버 실행 후 `/docs` 에서 확인하세요.

---

## 테스트 실행

```bash
cd backend
pytest tests/
```

---

## 핵심 비즈니스 로직

### 좌석 클래스 구성 (4-class)

| 클래스 | 코드 | 설명 |
|--------|------|------|
| 프레스티지 | C | 비즈니스 클래스 |
| 일반석 정상 | Y | 정상가 이코노미 |
| 일반석 할인 | M | 할인 이코노미 (EMSRb 적용) |
| 일반석 특가 | V | 특가 이코노미 (적게 열고 빠르게 소진) |

### 기종별 좌석 수

| 기종 | C | Y | M | V | 합계 |
|------|---|---|---|---|------|
| B737-900ER | 8 | 52 | 120 | 20 | 200석 |
| B737-800 | 8 | 41 | 94 | 15 | 158석 |
| A220-300 | 4 | 31 | 83 | 12 | 130석 |

### EMSRb 알고리즘

- Y/M 클래스에 EMSRb(Expected Marginal Seat Revenue b) 적용하여 인벤토리 최적화
- V(특가)는 EMSRb 풀에서 분리 — `cfg.v` 고정 할당 후 탑승률 기반 `vFillRate`로 판매량 산출
- `ymPool = totalEcon - cfg.v` 만을 Y/M EMSRb 입력으로 사용

### 시뮬레이터 수요 탄력성

| 클래스 | 탄력성 계수 |
|--------|-------------|
| C (프레스티지) | -0.45 |
| Y (정상) | -0.95 |
| M (할인) | -1.35 |
| V (특가) | -1.75 |

### 주요 비즈니스 규칙

- **BR-01**: 운임 수정 시 변경 이력(`PriceHistory`)이 자동 기록됩니다.
- **BR-02**: AI 추천 승인 시 해당 운임이 추천 가격으로 즉시 갱신됩니다.
- **BR-03**: AI 추천 가격은 현재 가격 대비 ±30% 범위 내로 제한됩니다.

---

## 실시간 데이터 연동

프론트엔드 Zustand `flightsStore`를 통해 운임관리 탭에서 새로고침 시 대시보드 차트가 실시간으로 갱신됩니다.

- 우측 상단 새로고침 버튼(🔄): 전체 탭(대시보드·운임관리·경쟁사·시뮬레이터·보고서) 동시 갱신
- 운임관리에서 LF 변경 → `flightsStore` 업데이트 → 대시보드 KPI 및 차트 자동 반영

---

## 배포 (AWS App Runner)

`apprunner.yaml` 기준 배포 설정:

```yaml
runtime: python311
run:
  command: uvicorn app.main:app --host 0.0.0.0 --port 8080
```

프론트엔드 빌드 결과물(`dist/`)은 `static/` 디렉터리에 복사하면 백엔드가 SPA로 서빙합니다.

---

## 데이터 모델 개요

- **Route** — 노선 (출발지 → 도착지)
- **Flight** — 항공편 (노선, 출발일, 탑승률, 페이스)
- **FareTier** — 좌석 등급별 운임 (C / Y / M / V)
- **PriceHistory** — 운임 변경 이력 (수동/AI 구분)
- **AiRecommendation** — AI 추천 내역 (대기/승인/거절 상태)
- **CompetitorPrice** — 경쟁사 운임 데이터
- **SimulationResult** — 시뮬레이션 결과
- **Report** — 수익 보고서
