# Deployment Architecture — rm-system (UOW-01)

**작성일**: 2026-05-21

---

## 전체 아키텍처 다이어그램

```
┌─────────────────────────────────────────────────────────────┐
│                         Internet                            │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS (443)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              AWS App Runner (us-east-1)                     │
│         up8msmtgyc.us-east-1.awsapprunner.com               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │          Docker Container (Port 8080)                 │  │
│  │                                                       │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │              FastAPI (uvicorn)                  │  │  │
│  │  │                                                 │  │  │
│  │  │  /api/*  ──► Router ──► Service ──► Repository │  │  │
│  │  │  /health ──► Health Check                      │  │  │
│  │  │  /*      ──► React SPA (index.html)            │  │  │
│  │  │  /assets ──► Static Files (dist/)              │  │  │
│  │  └──────────────────┬──────────────────────────────┘  │  │
│  │                     │                                  │  │
│  │  ┌──────────────────▼──────────────────────────────┐  │  │
│  │  │          SQLite (컨테이너 파일시스템)             │  │  │
│  │  │  항공편 4,050 / 좌석 16,200 / 경쟁사 2,430      │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  │                                                       │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │            AI Engine (Strategy Pattern)         │  │  │
│  │  │  ClaudeAiEngine ──► Anthropic API (외부)        │  │  │
│  │  │  MockAiEngine   ──► Fallback (오프라인)          │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  CPU: 1 vCPU  |  Memory: 2 GB  |  Auto Deploy: OFF         │
└──────────────────────────┬──────────────────────────────────┘
                           │ ECR Pull (IAM Role)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              AWS ECR (us-east-1)                            │
│         hackathon-app:latest                                │
│         362353307746.dkr.ecr.us-east-1.amazonaws.com       │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
                  외부 호출: Anthropic API
                  (ANTHROPIC_API_KEY 환경변수)
```

---

## 배포 흐름

```
개발자 로컬 머신
  │
  │ docker build --platform linux/amd64
  ▼
Docker Image (linux/amd64)
  │
  │ docker push
  ▼
AWS ECR — hackathon-app:latest
  │
  │ apprunner start-deployment
  ▼
AWS App Runner
  │ 이미지 Pull → 컨테이너 교체 (약 2~3분)
  ▼
서비스 운영 재개 (RUNNING)
```

---

## 요청 처리 흐름

```
브라우저 요청
    │
    ├─ GET /               → React index.html (SPA 진입)
    ├─ GET /assets/*.js    → React 번들 파일
    ├─ GET /api/flights    → FastAPI → FareService → FareRepository → SQLite
    ├─ POST /api/ai/...    → FastAPI → AiService → ClaudeAiEngine → Anthropic API
    └─ GET /health         → FastAPI HealthCheck → 200 OK
```

---

## AWS 리소스 목록

| 리소스 | 이름/ID | 용도 |
|---|---|---|
| App Runner Service | `hackathon-app` | 애플리케이션 실행 |
| ECR Repository | `hackathon-app` | Docker 이미지 저장 |
| IAM Role | `hackathon-apprunner-ecr-role` | App Runner → ECR Pull 권한 |
| AWS Account | `362353307746` | hackathon_user |

---

## 환경변수

| 변수명 | 값 | 용도 |
|---|---|---|
| `PYTHONPATH` | `/app:/app/backend` | Python 모듈 경로 |
| `ANTHROPIC_API_KEY` | `(비공개)` | Claude API 인증 |

---

## 포트 매핑

| 레이어 | 포트 | 프로토콜 |
|---|---|---|
| App Runner 외부 | 443 | HTTPS (자동 TLS) |
| 컨테이너 내부 | 8080 | HTTP |
| uvicorn 바인딩 | 0.0.0.0:8080 | HTTP |

---

## 데이터 생명주기

```
컨테이너 시작
  └─ seed_data.py 실행
       └─ SQLite 초기화 + 시드 데이터 삽입
            (항공편 4,050 / 좌석 16,200 / 경쟁사 2,430)
  └─ uvicorn 시작 → 서비스 운영

운영 중
  └─ 운임 수정 / AI 추천 적용 → SQLite에 즉시 반영

컨테이너 재시작 (재배포 등)
  └─ SQLite 데이터 초기화 → seed_data.py 재실행
       ※ 운영 중 변경한 운임 데이터는 소실됨
```

---

## 현재 상태 요약

| 항목 | 상태 |
|---|---|
| 서비스 상태 | RUNNING |
| 배포 URL | https://up8msmtgyc.us-east-1.awsapprunner.com |
| 마지막 배포 | 2026-05-21 (수동) |
| Operation ID | ed2c30b744454e44995ca2f36ec79e29 |
