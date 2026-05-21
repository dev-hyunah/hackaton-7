# Infrastructure Design Plan — rm-system

## 현황 파악
- **Unit**: rm-system (UOW-01)
- **선행 완료**: Functional Design ✓, NFR Requirements ✓, NFR Design ✓
- **배포 현황**: AWS App Runner (us-east-1) 이미 운영 중
- **참고 문서**: `aidlc-docs/operations/deployment.md`

## Plan 체크리스트

- [x] Step 1: 기존 설계 산출물 분석 (Functional Design, NFR Design)
- [x] Step 2: 논리 컴포넌트 → 인프라 서비스 매핑
- [x] Step 3: 질문 수집 및 답변 (현재 프로젝트 상태 기반 자동 결정)
- [x] Step 4: infrastructure-design.md 생성
- [x] Step 5: deployment-architecture.md 생성
- [x] Step 6: aidlc-state.md 업데이트
- [x] Step 7: audit.md 기록

---

## Step 3: 인프라 설계 질문

아래 질문에 [Answer]: 태그 안에 답변을 작성해 주세요.

---

### Q1. 배포 환경 (Deployment Environment)

현재 AWS App Runner에 이미 배포되어 있습니다.
추가적인 환경(스테이징, 개발 서버 등)이 필요한가요?

[Answer]: 

---

### Q2. 컴퓨팅 (Compute)

현재 App Runner 설정: 1 vCPU, 2GB RAM.
현재 데모 트래픽 기준으로 이 사이즈가 적절한가요, 아니면 조정이 필요한가요?

[Answer]: 

---

### Q3. 데이터베이스 (Storage)

현재 SQLite를 컨테이너 내부에서 사용 중 (재시작 시 seed_data.py로 재생성).
- A) 현재 SQLite 유지 (데모/해커톤 용도)
- B) RDS PostgreSQL 등 영구 스토리지로 전환

어느 방향이 맞나요?

[Answer]: 

---

### Q4. 외부 API 연동 (External Services)

Claude API (Anthropic) 키가 컨테이너 환경변수로 주입되어야 합니다.
현재 어떻게 관리하고 있나요? (직접 환경변수 설정 / AWS Secrets Manager / 기타)

[Answer]: 

---

### Q5. 네트워킹 (Networking)

현재 App Runner가 퍼블릭 인터넷에 직접 노출되어 있습니다.
별도 도메인 연결, CloudFront CDN, 또는 WAF 적용이 필요한가요?

[Answer]: 

---

### Q6. 모니터링 (Monitoring)

현재 별도 모니터링 설정이 없습니다.
- A) 현재 상태 유지 (해커톤 수준)
- B) CloudWatch 로그 / 알람 설정
- C) 기타 APM 도구 (Datadog 등)

어느 수준이 필요한가요?

[Answer]: 

---

### Q7. CI/CD 파이프라인

현재 배포는 수동 스크립트(docker build → ECR push → App Runner trigger) 방식입니다.
자동화된 CI/CD 파이프라인 구축이 필요한가요? (GitHub Actions 등)

[Answer]: 

---

### Q8. 스케일링 전략

App Runner 기본 Auto Scaling 설정 사용 중입니다.
특별한 스케일링 요구사항(최대 인스턴스 수, 최소 인스턴스 유지 등)이 있나요?

[Answer]: 
