# Revenue Manager — 항공 운임 수익 관리 시스템

대한항공 Revenue Management(RM) 시스템 프로토타입입니다.
항공편 운임 관리, AI 가격 추천, 경쟁사 모니터링, 시뮬레이션, 보고서 기능을 제공합니다.

---

## 주요 기능

| 기능 | 설명 |
|------|------|
| **대시보드** | 전체 수익, 예약 현황, 평균 탑승률, AI 추천 건수 요약 |
| **운임 관리** | 항공편별 좌석 클래스(Prestige/Economy) 운임 조회·수정 및 AI 추천 가격 적용 |
| **경쟁사 모니터링** | 노선별 타 항공사 운임 데이터 조회 |
| **시뮬레이터** | 연료비 변동·신규 경쟁사 진입 등 외부 요인에 따른 수요·수익 시뮬레이션 |
| **보고서** | 기간별·노선별 수익 달성률 리포트 |

---

## 기술 스택

### Backend
- **Python 3.11+** / **FastAPI 0.115**
- **SQLAlchemy 2.0** (ORM) + **SQLite** (개발용 DB)
- **Pydantic 2.10** (데이터 검증)
- **Uvicorn** (ASGI 서버)

### Frontend
- **React 19** + **TypeScript 6**
- **Vite 8** (빌드 도구)
- **Tailwind CSS 4** (스타일링)
- **Zustand 5** (상태 관리)
- **Recharts 3** (차트)

### AI Engine
- **Mock AI Engine** — 탑승률 기반 운임 추천 로직 (±30% 제한 규칙 적용)
- 인터페이스(`AbstractAiEngine`)로 추상화되어 실제 AI 모델로 교체 가능

---

## 디렉터리 구조

```
hackaton-7/
├── backend/              # FastAPI 백엔드
│   ├── app/
│   │   ├── main.py       # 앱 진입점 & 라우터 등록
│   │   ├── database.py   # DB 연결 설정
│   │   ├── models/       # SQLAlchemy ORM 모델
│   │   ├── schemas/      # Pydantic 스키마
│   │   ├── repositories/ # DB 접근 레이어
│   │   ├── services/     # 비즈니스 로직
│   │   └── routers/      # API 엔드포인트
│   ├── requirements.txt
│   └── seed_data.py      # 초기 샘플 데이터 삽입
├── frontend/             # React 프론트엔드
│   ├── src/
│   │   ├── App.tsx       # 앱 루트 & 네비게이션
│   │   ├── components/   # 페이지 컴포넌트
│   │   ├── stores/       # Zustand 스토어
│   │   ├── api/          # API 클라이언트
│   │   └── types/        # TypeScript 타입 정의
│   └── package.json
└── ai_engine/            # AI 추천 엔진
    ├── interfaces.py     # AbstractAiEngine 인터페이스
    ├── mock_ai_engine.py # Mock 구현체
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

백엔드가 실행되면 다음 주소에서 접근 가능합니다.

- API: `http://localhost:8000`
- API 문서 (Swagger): `http://localhost:8000/docs`
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
| GET | `/dashboard/summary` | 대시보드 요약 데이터 |
| GET | `/fares` | 운임 목록 조회 |
| PUT | `/fares/{id}` | 운임 수정 |
| GET | `/ai-recommendation` | AI 추천 목록 조회 |
| POST | `/ai-recommendation/generate` | AI 추천 생성 |
| PATCH | `/ai-recommendation/{id}/approve` | AI 추천 승인 |
| PATCH | `/ai-recommendation/{id}/reject` | AI 추천 거절 |
| GET | `/competitor` | 경쟁사 운임 조회 |
| POST | `/simulation/run` | 시뮬레이션 실행 |
| GET | `/report` | 보고서 조회 |

전체 API 명세는 서버 실행 후 `/docs` 에서 확인하세요.

---

## 테스트 실행

```bash
cd backend
pytest tests/
```

---

## 데이터 모델 개요

- **Route** — 노선 (출발지 → 도착지)
- **Flight** — 항공편 (노선, 출발일, 탑승률, 페이스)
- **FareTier** — 좌석 등급별 운임 (Prestige / Economy Full / Economy Discount / Economy Special)
- **PriceHistory** — 운임 변경 이력 (수동/AI 구분)
- **AiRecommendation** — AI 추천 내역 (대기/승인/거절 상태)
- **CompetitorPrice** — 경쟁사 운임 데이터
- **SimulationResult** — 시뮬레이션 결과
- **Report** — 수익 보고서
