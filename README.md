# Revenue Manager — 항공 운임 수익 관리 시스템

대한항공 Revenue Management(RM) 시스템 프로토타입입니다.
EMSRb 알고리즘 기반 좌석 인벤토리 최적화, AI 운임 전략 분석, 경쟁사 모니터링, 시뮬레이션, 보고서 기능을 제공합니다.

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
- **Groq API** (AI 전략 분석 — `llama-3.3-70b-versatile`, 무료 티어, 현재 활성)
- **SciPy** (EMSRb 정규분포 계산)

### Frontend
- **React 19** + **TypeScript**
- **Vite 6+** (빌드 도구)
- **Tailwind CSS 4** (스타일링)
- **Zustand 5** (전역 상태 관리 — 노선별 실시간 flights 공유)
- **Recharts 3** (차트)
- **jsPDF + html-to-image** (보고서 PDF 내보내기, oklch 색상 호환)
- **docx** (보고서 DOCX 내보내기)

### AI Engine
- **GroqAiEngine** — `GROQ_API_KEY` 설정 시 `llama-3.3-70b-versatile` 실호출 (무료 티어). **현재 활성**
- **OllamaAiEngine** — 로컬 Ollama 서버 연동 (기본 모델: `exaone3.5:7.8b`). 로컬 실행 전용
- **ClaudeAiEngine** — `ANTHROPIC_API_KEY` 설정 시 Claude Sonnet 4.6 실호출. 현재 미사용
- **MockAiEngine** — 탑승률 기반 규칙형 운임 추천 (±30% BR-03 제한 적용). Fallback 구현체
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
│   │   ├── api/              # API 클라이언트 (fetch 기반)
│   │   └── types/            # TypeScript 타입 정의
│   └── package.json
└── ai_engine/                # AI 추천 엔진 (backend/ 외부에 위치)
    ├── interfaces.py         # AbstractAiEngine / AbstractSimulationEngine
    ├── groq_ai_engine.py     # Groq API 기반 AI 엔진 (현재 활성, 무료 티어)
    ├── ollama_ai_engine.py   # 로컬 Ollama 기반 AI 엔진 (로컬 전용)
    ├── claude_ai_engine.py   # Claude 기반 AI 엔진 (analyze_strategy 구현 완료, 미사용)
    ├── mock_ai_engine.py     # 규칙형 Mock 구현체 (Fallback)
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

백엔드는 **반드시 `backend/` 디렉터리에서** 실행해야 합니다. `ai_engine/` 모듈이 프로젝트 루트에 위치하므로 `PYTHONPATH`를 설정해야 합니다.

```bash
cd backend

# 가상환경 생성 및 활성화
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

# 의존성 설치
pip install -r requirements.txt

# 샘플 데이터 삽입 (최초 1회, DB가 비어있을 때만 실행됨)
python seed_data.py

# 서버 시작 (PYTHONPATH 설정 필수)
PYTHONPATH=..:/Users/$(whoami)/Desktop/hackaton-7 uvicorn app.main:app --reload --port 8000
```

> **Windows PowerShell**:
> ```powershell
> $env:PYTHONPATH = ".."
> uvicorn app.main:app --reload --port 8000
> ```

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

# 개발 서버 시작 (기본 포트: 5173)
npm run dev
```

브라우저에서 `http://localhost:5173` 에 접속합니다.

> 프론트엔드는 `/api/*` 경로를 Vite proxy를 통해 `http://localhost:8000`으로 전달합니다. 백엔드가 먼저 실행되어 있어야 합니다.

---

## API 엔드포인트 요약

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/health` | 헬스 체크 |
| GET | `/dashboard/summary` | 대시보드 KPI 요약 |
| GET | `/fares/{route_id}?date=YYYY-MM-DD` | 노선·날짜별 운임 조회 |
| PUT | `/fares/{flight_id}` | 운임 수정 |
| PUT | `/fares/{flight_id}/seats` | 공급석 수정 |
| GET | `/fares/{flight_id}/history` | 운임 변경 이력 |
| GET | `/recommendations` | AI 추천 목록 조회 |
| POST | `/recommendations/{id}/approve` | AI 추천 승인 |
| POST | `/recommendations/{id}/reject` | AI 추천 거절 |
| POST | `/recommendations/strategy` | AI 전략 분석 요청 |
| GET | `/competitors/{route_id}/comparison` | 경쟁사 운임 비교 |
| POST | `/simulation/run` | 시뮬레이션 실행 |
| POST | `/reports/generate` | 보고서 생성 |
| POST | `/api/rm/optimize` | EMSRb 기반 인벤토리 최적화 |

전체 API 명세는 서버 실행 후 `/docs` 에서 확인하세요.

---

## 테스트 실행

```bash
cd backend
source .venv/bin/activate
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
| 일반석 특가 | V | 특가 이코노미 |

### 기종별 좌석 수 (seed_data.py 기준)

| 기종 | C | Y | M | V | 합계 |
|------|---|---|---|---|------|
| B737-900ER | 8 | 35 | 95 | 62 | 200석 |
| B737-800 | 8 | 28 | 76 | 46 | 158석 |
| A220-300 | 4 | 22 | 62 | 42 | 130석 |

### EMSRb 알고리즘

- 일반석 클래스별 보호 수준(Protection Level) 및 예약 제한량(Booking Limits) 산정
- CV(변동계수): LF ≥ 80% → 0.20, LF ≥ 60% → 0.25, LF < 60% → 0.40

### 시뮬레이터 수요 탄력성

| 클래스 | 탄력성 계수 |
|--------|-------------|
| C (프레스티지) | -0.45 |
| Y (정상) | -0.95 |
| M (할인) | -1.35 |
| V (특가) | -1.75 |

### 주요 비즈니스 규칙

- **BR-03**: AI 추천 가격은 현재 가격 대비 ±30% 범위 내로 제한
- **BR-10**: Sold Out 등급은 가격 수정 불가, 좌석 수만 수정 가능
- **BR-11**: 등급별 좌석 수 합계는 항공편 전체 좌석 수를 초과할 수 없음

---

## AI Engine 현재 상태

**Groq API 연결 완료** — `llama-3.3-70b-versatile` 모델로 AI 전략 분석 실제 동작 중입니다.

| 기능 | 구현 엔진 | 현재 동작 |
|------|----------|----------|
| AI 전략 분석 (이슈 텍스트 입력) | GroqAiEngine | llama-3.3-70b-versatile 실호출 |
| 등급별 운임 추천 생성 | MockAiEngine | 규칙형 Mock 동작 |

**Groq API 설정**: `backend/.env` 파일에 아래를 추가하세요.

```
GROQ_API_KEY=gsk_...
```

**AWS 배포 시**: App Runner 콘솔 → 서비스 → 구성 → 환경 변수에 `GROQ_API_KEY` 추가

**로그 확인**: `backend/logs/ai_strategy.log` (로컬) 또는 App Runner 로그 탭 (AWS)

---

## 실시간 데이터 연동

프론트엔드 Zustand `flightsStore`를 통해 운임관리 탭에서 변경한 내용이 대시보드 차트에 실시간으로 반영됩니다.

- 우측 상단 새로고침 버튼: 전체 탭 데이터 동시 갱신
- 운임관리에서 LF 변경 → `flightsStore` 업데이트 → 대시보드 KPI 자동 반영

---

## 배포 (AWS App Runner)

프로젝트 루트의 `Dockerfile`을 이용한 멀티스테이지 빌드:

```bash
# 이미지 빌드 (Apple Silicon은 --platform linux/amd64 필요)
docker build --platform linux/amd64 -t hackathon-app:latest .

# ECR 푸시 후 App Runner 배포
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 362353307746.dkr.ecr.us-east-1.amazonaws.com
docker tag hackathon-app:latest 362353307746.dkr.ecr.us-east-1.amazonaws.com/hackathon-app:latest
docker push 362353307746.dkr.ecr.us-east-1.amazonaws.com/hackathon-app:latest
```

App Runner 서비스 URL: `https://up8msmtgyc.us-east-1.awsapprunner.com`

---

## 데이터 모델 개요

- **Route** — 노선 (출발지 → 도착지, 8개 국내선)
- **Flight** — 항공편 (노선, 출발일, 탑승률, 페이스)
- **FareTier** — 좌석 등급별 운임 (C / Y / M / V, 상태: open/closed/sold_out)
- **PriceHistory** — 운임 변경 이력 (MANUAL / AI 구분)
- **AiRecommendation** — AI 추천 내역 (PENDING / APPROVED / REJECTED)
- **CompetitorPrice** — 경쟁사 운임 데이터
- **SimulationResult** — 시뮬레이션 결과
- **Report** — 수익 보고서
