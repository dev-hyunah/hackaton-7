# Requirements Delta v9

**날짜**: 2026-05-22  
**작성자**: JHan  
**반영 파일**: `requirements.md` (v9 통합)

---

## 변경 배경

AI 전략 분석 기능이 MockAiEngine(규칙 기반)으로만 동작하고 있어 실제 자연어 이해가 불가능했다.
AWS App Runner 배포 환경에서 외부 API를 무료로 사용할 수 있는 Groq API를 연동하여 실제 LLM 호출을 구현했다.

---

## 변경 사항

### FR-03 변경: AI 전략 분석 실제 LLM 연동

**이전**: MockAiEngine (규칙 기반 키워드 매칭)  
**이후**: GroqAiEngine — Groq 무료 API (`llama-3.3-70b-versatile`) 실호출

- `ai_engine/groq_ai_engine.py` 신규 추가
  - Groq API (`https://api.groq.com/openai/v1/chat/completions`) 호출
  - 기존 ClaudeAiEngine과 동일한 시스템 프롬프트 재사용
  - Step 1: 이슈-항공편 날짜·노선 관련성 판단 (`irrelevant` 여부)
  - Step 2: 관련 있을 때만 4개 등급별 최적 운임 추천
  - BR-03 ±30% 클램핑 적용
  - `GROQ_API_KEY` 미설정 또는 API 오류 시 MockAiEngine 자동 fallback
  - 환경변수: `GROQ_API_KEY`, `GROQ_MODEL` (기본값: `llama-3.3-70b-versatile`)

- `ai_engine/ollama_ai_engine.py` 신규 추가
  - 로컬 Ollama 서버 연동 (`http://localhost:11434`)
  - 기본 모델: `exaone3.5:7.8b` (한국어 특화)
  - 환경변수: `OLLAMA_BASE_URL`, `OLLAMA_MODEL`
  - Ollama 연결 실패 시 MockAiEngine 자동 fallback

- `backend/app/services/ai_recommendation_service.py` 수정
  - `ClaudeAiEngine` → `GroqAiEngine` 교체

### 로깅 추가

- AI 분석 요청/응답 내역을 `backend/logs/ai_strategy.log` 및 콘솔에 동시 기록
- 기록 항목: 모델명, 편명, 노선, 출발일, 탑승률, 이슈 텍스트, 좌석 등급별 현황, 소요시간, 토큰 사용량, 등급별 추천가 변동폭

### backend/app/main.py 수정

- `load_dotenv()` 경로를 `Path(__file__).resolve().parent.parent / ".env"` 로 명시
- `override=True` 추가 — 기존 환경변수 덮어쓰기 허용
- `groq_ai_engine` 로거 설정 (파일 핸들러 + 스트림 핸들러)

---

## 환경변수

| 변수명 | 설명 | 기본값 |
|--------|------|--------|
| `GROQ_API_KEY` | Groq API 인증 키 (무료 발급 가능) | 미설정 시 MockAiEngine fallback |
| `GROQ_MODEL` | Groq 모델 ID | `llama-3.3-70b-versatile` |
| `OLLAMA_BASE_URL` | Ollama 서버 주소 (OllamaAiEngine 사용 시) | `http://localhost:11434` |
| `OLLAMA_MODEL` | Ollama 모델 ID (OllamaAiEngine 사용 시) | `exaone3.5:7.8b` |

---

## AWS 배포 적용 방법

App Runner 콘솔 → 서비스 선택 → **구성** 탭 → **편집** → **환경 변수** 섹션에서 추가:

- 소스: 일반 텍스트
- 환경 변수 이름: `GROQ_API_KEY`
- 환경 변수 값: 발급받은 Groq API 키
