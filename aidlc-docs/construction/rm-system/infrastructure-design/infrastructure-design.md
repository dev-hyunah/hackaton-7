# Infrastructure Design — rm-system (UOW-01)

**작성일**: 2026-05-21  
**단계**: CONSTRUCTION PHASE — Infrastructure Design  
**프로젝트 성격**: 해커톤 데모 (단일 사용자, 단기 운영)

---

## 설계 원칙

현재 프로젝트는 **해커톤 데모** 목적으로 이미 운영 중인 AWS 환경을 기준으로 문서화한다.
코드 수정 없이 현재 인프라 구성을 그대로 유지하며, 향후 확장을 위한 권고사항만 별도 명시한다.

---

## 논리 컴포넌트 → 인프라 매핑

| 논리 컴포넌트 | 역할 | 인프라 서비스 | 비고 |
|---|---|---|---|
| React SPA | 프론트엔드 UI | FastAPI StaticFiles 서빙 | 별도 CDN 없음 |
| FastAPI API Server | REST API 처리 | AWS App Runner (포트 8080) | 단일 컨테이너 |
| SQLite DB | 데이터 저장 | 컨테이너 내부 파일 | 재시작 시 seed_data.py 재생성 |
| AI Engine (Claude) | 가격 추천 | 외부 Anthropic API 호출 | 환경변수로 API Key 주입 |
| Docker Image | 컨테이너 이미지 | AWS ECR (hackathon-app:latest) | AES256 암호화 |
| IAM Role | ECR 접근 권한 | hackathon-apprunner-ecr-role | App Runner → ECR Pull 권한 |

---

## 컴퓨팅 (Compute)

### AWS App Runner

| 항목 | 현재 값 | 결정 근거 |
|---|---|---|
| 서비스명 | `hackathon-app` | - |
| 리전 | `us-east-1` | 해커톤 계정 기본 리전 |
| CPU | 1 vCPU (1024) | 단일 사용자 데모 → 충분 |
| Memory | 2 GB (2048) | SQLite + FastAPI + Python → 충분 |
| Auto Deploy | Disabled | 수동 트리거 방식으로 운영 |
| 최소 인스턴스 | 1 (기본값) | Cold Start 방지 |
| ARN | `arn:aws:apprunner:us-east-1:362353307746:service/hackathon-app/b9b74b1f1b224f5883d9a309c7335543` | - |

### 컨테이너 빌드 전략: 멀티스테이지 Docker

```
Stage 1 — frontend-builder (node:20-slim)
  ├─ npm ci
  └─ npm run build → dist/

Stage 2 — production (python:3.11-slim)
  ├─ pip install -r requirements.txt
  ├─ COPY backend/, ai_engine/
  ├─ COPY dist/ → static/
  └─ CMD: seed_data.py → uvicorn :8080
```

- 프론트엔드 빌드 산출물(`dist/`)이 FastAPI `StaticFiles`로 서빙됨
- 단일 포트(8080)로 프론트엔드 + 백엔드 통합 제공

---

## 스토리지 (Storage)

### SQLite (컨테이너 내부)

| 항목 | 현재 값 | 결정 근거 |
|---|---|---|
| 엔진 | SQLite | 해커톤 데모, 외부 DB 불필요 |
| 위치 | 컨테이너 파일시스템 | 영구 스토리지 불필요 |
| 초기화 | `seed_data.py` 자동 실행 | 재시작 시 데이터 복원 |
| 데이터 규모 | 항공편 4,050개, 좌석 16,200개, 경쟁사 가격 2,430개 | 메모리 내 처리 가능 |

> **⚠️ 제약사항**: 컨테이너 재시작 시 모든 데이터 변경사항(운임 수정 등)이 초기화됨.
> 데모 시연 중 재배포 금지.

### AWS ECR (Container Registry)

| 항목 | 값 |
|---|---|
| 레포지토리 | `hackathon-app` |
| URI | `362353307746.dkr.ecr.us-east-1.amazonaws.com/hackathon-app` |
| 태그 전략 | `latest` 단일 태그 (롤백 전략 없음) |
| 이미지 암호화 | AES256 (기본값) |
| 취약점 스캔 | Disabled (해커톤 수준) |

---

## 네트워킹 (Networking)

### 라우팅 구조

```
HTTPS 443
  └─ App Runner Public Endpoint
       └─ Docker Container :8080
            ├─ /api/*        → FastAPI Router
            ├─ /health       → Health Check
            ├─ /assets/*     → React Static Files
            └─ /*            → index.html (SPA Fallback)
```

| 항목 | 현재 값 | 결정 근거 |
|---|---|---|
| 퍼블릭 URL | `https://up8msmtgyc.us-east-1.awsapprunner.com` | App Runner 자동 생성 |
| TLS/SSL | App Runner 자동 관리 (HTTPS) | 별도 인증서 불필요 |
| 커스텀 도메인 | 없음 | 해커톤 데모 → 불필요 |
| CDN (CloudFront) | 없음 | 단일 리전, 소규모 트래픽 |
| WAF | 없음 | 인증 없는 데모 환경 |
| CORS | `allow_origins=["*"]` | 전체 오리진 허용 (NFR-03) |

---

## 외부 서비스 연동 (External Services)

### Anthropic Claude API

| 항목 | 현재 값 |
|---|---|
| 연동 방식 | HTTP 외부 호출 (Anthropic SDK) |
| 모델 | Claude Sonnet 4.6 |
| API Key 주입 | App Runner 환경변수 (ANTHROPIC_API_KEY) |
| Fallback | MockAiEngine (Strategy Pattern) |
| 관리 수준 | 직접 환경변수 설정 (Secrets Manager 미사용) |

---

## 보안 (Security)

| 항목 | 현재 값 | 결정 근거 |
|---|---|---|
| 인증/인가 | 없음 | NFR-03: 모든 API 공개 접근 허용 |
| IAM Role | `hackathon-apprunner-ecr-role` | App Runner → ECR Pull 최소 권한 |
| TLS | App Runner 자동 (HTTPS) | 전송 암호화 자동 적용 |
| ECR 암호화 | AES256 | 이미지 저장 암호화 |
| SQL Injection | SQLAlchemy ORM 자동 방지 | 별도 처리 불필요 |

---

## 모니터링 (Monitoring)

| 항목 | 현재 값 | 결정 근거 |
|---|---|---|
| 모니터링 | CloudWatch 기본 로그만 | 해커톤 데모 수준 |
| 알람 | 없음 | 불필요 |
| APM | 없음 | 불필요 |
| 헬스 체크 | `/health` 엔드포인트 | App Runner 기본 설정 |

---

## 배포 파이프라인 (CI/CD)

현재 **수동 배포** 방식을 사용한다. 코드 수정 후 아래 절차로 재배포한다.

```bash
# 1. ECR 로그인
aws --profile hackathon ecr get-login-password --region us-east-1 \
  | docker login --username AWS --password-stdin \
    362353307746.dkr.ecr.us-east-1.amazonaws.com

# 2. 이미지 빌드
docker build --platform linux/amd64 -t hackathon-app:latest .

# 3. 태그 및 푸시
docker tag hackathon-app:latest \
  362353307746.dkr.ecr.us-east-1.amazonaws.com/hackathon-app:latest
docker push 362353307746.dkr.ecr.us-east-1.amazonaws.com/hackathon-app:latest

# 4. App Runner 재배포 트리거
aws --profile hackathon apprunner start-deployment \
  --region us-east-1 \
  --service-arn arn:aws:apprunner:us-east-1:362353307746:service/hackathon-app/b9b74b1f1b224f5883d9a309c7335543
```

| 항목 | 현재 값 |
|---|---|
| 방식 | 수동 스크립트 |
| Auto Deploy | Disabled |
| 배포 소요 시간 | 약 2~3분 |
| 롤백 | 없음 (latest 태그 단일 운용) |

---

## 확장성 고려사항 (참고 — 현재 미적용)

> 아래는 프로덕션 전환 시 고려할 항목이며, 현재 해커톤 프로젝트에는 적용하지 않는다.

| 항목 | 현재 | 프로덕션 권고 |
|---|---|---|
| DB | SQLite (휘발성) | RDS PostgreSQL + EFS 마운트 |
| 인증 | 없음 | Cognito 또는 JWT 기반 인증 |
| CI/CD | 수동 | GitHub Actions → ECR → App Runner |
| 모니터링 | 없음 | CloudWatch Dashboard + 알람 |
| CDN | 없음 | CloudFront (정적 파일 캐싱) |
| 비밀 관리 | 환경변수 직접 설정 | AWS Secrets Manager |
| 이미지 스캔 | 없음 | ECR scanOnPush: true |
