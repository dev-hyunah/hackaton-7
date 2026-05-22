# 배포 정보 (AWS App Runner)

**배포일**: 2026-05-20  
**담당**: hackathon_user (AWS 계정: 362353307746)

---

## 서비스 접속 URL

```
https://up8msmtgyc.us-east-1.awsapprunner.com
```

---

## AWS 리소스 구성

### App Runner 서비스

| 항목 | 값 |
|------|-----|
| 서비스명 | `hackathon-app` |
| 리전 | `us-east-1` |
| 상태 | RUNNING |
| URL | `up8msmtgyc.us-east-1.awsapprunner.com` |
| 포트 | 8080 |
| CPU | 1 vCPU (1024) |
| 메모리 | 2 GB (2048) |
| ARN | `arn:aws:apprunner:us-east-1:362353307746:service/hackathon-app/b9b74b1f1b224f5883d9a309c7335543` |

### ECR 레포지토리

| 항목 | 값 |
|------|-----|
| 레포지토리명 | `hackathon-app` |
| 리전 | `us-east-1` |
| URI | `362353307746.dkr.ecr.us-east-1.amazonaws.com/hackathon-app` |
| 사용 태그 | `latest` |

---

## 아키텍처

```
사용자 브라우저
      │
      ▼
App Runner (us-east-1)
  └─ Docker 컨테이너 (포트 8080)
       ├─ FastAPI (백엔드 API)  /api/* 라우팅
       ├─ React SPA (정적 파일) /* → index.html
       └─ SQLite DB (컨테이너 내부, 휘발성)
```

### 단일 컨테이너 구조

React 빌드 결과물(`dist/`)이 FastAPI 서버가 정적 파일로 직접 서빙합니다.

- `/health` → 헬스 체크 엔드포인트
- `/assets/*` → React 정적 파일 (JS, CSS)
- `/*` → React `index.html` (SPA 라우팅)
- `/api/*` 이하 → FastAPI 라우터 처리

---

## Docker 이미지 빌드 구조

멀티스테이지 빌드 (`Dockerfile`):

```
Stage 1 (frontend-builder): node:20-slim
  - npm ci
  - npm run build → dist/

Stage 2 (production): python:3.11-slim
  - pip install requirements.txt
  - COPY backend/, ai_engine/
  - COPY dist/ → static/
  - CMD: seed_data.py 실행 후 uvicorn 시작
```

---

## 재배포 방법

이미지를 새로 빌드하고 ECR에 푸시하면 App Runner가 자동 또는 수동 트리거로 재배포됩니다.

```bash
# 1. ECR 로그인
aws --profile hackathon ecr get-login-password --region us-east-1 \
  | docker login --username AWS --password-stdin \
    362353307746.dkr.ecr.us-east-1.amazonaws.com

# 2. 이미지 빌드
docker build -t rm-system:latest .

# 3. 태그 및 푸시
docker tag rm-system:latest \
  362353307746.dkr.ecr.us-east-1.amazonaws.com/hackathon-app:latest
docker push \
  362353307746.dkr.ecr.us-east-1.amazonaws.com/hackathon-app:latest

# 4. App Runner 재배포 트리거
aws --profile hackathon apprunner start-deployment \
  --region us-east-1 \
  --service-arn arn:aws:apprunner:us-east-1:362353307746:service/hackathon-app/b9b74b1f1b224f5883d9a309c7335543
```

---

## 배포 이력

| 날짜 | 커밋 | 내용 | ECR 다이제스트 | 담당 | Operation ID |
|------|------|------|----------------|------|--------------|
| 2026-05-22 | `9077590` | 최신 코드 재배포 (버그 수정) | `sha256:abe6c704...2064a441` | ha.seo@hist.co.kr | `d64539dd9da14549b0f1c93ccffd82d7` |

---

## 주요 설정 변경 이력 (2026-05-20)

| 파일 | 변경 내용 |
|------|-----------|
| `frontend/src/api/apiClient.ts` | `BASE_URL`을 `http://localhost:8000` → `import.meta.env.VITE_API_URL ?? ''` (상대경로)로 변경 |
| `backend/app/main.py` | `StaticFiles` 마운트 및 SPA catch-all 라우팅 추가 |
| `Dockerfile` | 멀티스테이지 빌드로 전면 교체 (Node.js 빌드 스테이지 추가) |
| `.dockerignore` | `frontend/` 전체 제외 → `frontend/node_modules/`, `frontend/dist/`만 제외로 수정 |

---

## 참고

- App Runner는 Auto Scaling 기본 설정 적용 (최소 1 인스턴스)
- SQLite DB는 컨테이너 재시작 시 초기화됨 — `seed_data.py`로 데이터 재생성
- 영구 데이터 저장이 필요한 경우 RDS(PostgreSQL) 또는 EFS 연동 필요
