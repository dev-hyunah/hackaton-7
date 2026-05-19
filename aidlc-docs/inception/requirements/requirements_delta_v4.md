# 운임관리 — v4 초기 요구사항

- 현재 나오고 있는 좌석 등급별 운임 관리 세부현황을 제거해주고, 운항 현황(step1)에서 특정 운항편을 선택시에 다음 화면으로 전환되면서 해당 운항편의 좌석 등급별 운임 관리 세부 현황(step2)을 보여줘.
- 세부현황(step2)에서는 각 운항편의 좌석 배치에 맞도록 인터렉티브 기내 좌석 배치도를 활용하여 예약현황을 클래스별 색상으로 시각화해줘.
- 세부현황(step2)에서는 좌석 등급별 운임 관리에 기존에 개발된 기능은 유지해줘.
- 좌석 인벤토리 제어와 좌석의 가격을 제시하는 모델은 첨부된 dynamic_pricing_guide.md, system_prompt_guide.md 파일을 참고해서 알고리즘을 만들고 적용해줘.

---

# 운임관리 — v4 추가 수정 이력 (2026-05-19)

## [jin] EMSRb 알고리즘 기반 좌석 배분

**일시**: 2026-05-19

### 요구사항
- 좌석 수가 처음에 정해질 때(buildDashboardFlights)와 수동 수정이 될 때(aiReallocateSeats)마다 EMSRb(Expected Marginal Seat Revenue-b) 알고리즘을 따라야 함
- AI 좌석 재배분 로그에 이유에 대한 설명을 문장으로 정리하여 출력

### 구현 내용

#### `frontend/src/data/mockData.ts`
- `_normInv()` 함수 추가: Abramowitz & Stegun 26.2.17 유리 근사식 기반 역정규분포 함수
- `EMSRbInput` 인터페이스 export: `{ code, price, meanDemand, stdDemand, minSeats }`
- `emsrb()` 함수 export: EMSRb 알고리즘 구현
  - 입력: 운임 내림차순 정렬된 EMSRbInput 배열 + 총 좌석 수
  - 보호 수준(protection level) 산정: `y_k = μ_agg + σ_agg × normInv(1 − p_{k+1} / virtualFare_agg)`
  - 예약 제한량(booking limits) → 버킷 좌석 수 변환
  - minSeats 강제 보장, 합계=totalSeats 정합성 보정
- `buildDashboardFlights()` Y/M/V 좌석 배분 → EMSRb 방식으로 교체
  - `econTotal = cfg.total - cfg.c`
  - `ecoDemand = (lf/100) × cfg.total × 0.92`
  - CV 가변: LF≥80→0.20, LF≥60→0.25, LF<60→0.40 (예측 신뢰도 반영)
  - V 클래스 Closed 조건(lf≥82 또는 peakMul≥1.25): V 고정, Y/M만 EMSRb

#### `frontend/src/components/FareManagement.tsx`
- `aiReallocateSeats()` 내부 재배분 로직 → EMSRb 호출로 전면 교체
  - fixedSeats = 프레스티지 + Closed 등급 + target 등급(newSeats)
  - pool = totalSeats − fixedSeats
  - eligible: 비프레스티지, 비Closed, 비target 등급
  - μ = max(c.sold×1.3, pool×demandShare), σ = μ×CV
  - EMSRb 결과를 eligible 등급에 적용, Sold Out/Open 상태 재계산
- `console.group` 상세 로그 추가:
  - 증가/감소 방향 및 이유 문장
  - LF·CV·pool 분석 조건 설명
  - `console.table`: 등급명/운임/μ/σ/판매/기존좌석/배분결과/변동/조정이유

---

## [jin] 좌석 등급 코드(C/Y/M/V) UI 미표출

**일시**: 2026-05-19

### 요구사항
- 좌석 등급별 운임 관리 카드에서 클래스 코드(C, Y, M, V) 배지를 숨김 처리

### 구현 내용
#### `frontend/src/components/FareManagement.tsx`
- `ClassEditCard`: 우측 상단 클래스 코드 배지(`w-8 h-8 rounded-lg`) div 삭제
- 등급명(프레스티지, 일반석 정상, 일반석 할인, 일반석 특가)만 표시

---

## [jin] 기내 좌석 배치도 — 항공사 실제 국내선 화면 기준 재설계

**일시**: 2026-05-19

### 요구사항
- 항공사 국내선 좌석 선택 화면을 참고한 세로형 레이아웃
- 일반석(정상/할인/특가)은 하나의 연속 영역에 색상만 달리하여 표현
- 색상 legend는 오른쪽에 별도 배치
- 마우스 hover 시 해당 좌석 위에 말풍선(tooltip) 표시

### 구현 내용
#### `frontend/src/components/FareManagement.tsx` — `SeatMap` 컴포넌트 재작성
- `SeatInfo` 타입: `{ sold, seatId, clsName, clsCode, price, closed, rowNo, colLabel }`
- `SeatBtn`: `position: absolute` 기반 툴팁, `bottom: calc(100% + 5px)` 좌석 바로 위 표시
  - 프레스티지: amber 계열 / 정상: blue / 할인: teal / 특가: violet
  - 판매석(짙은색) vs 여석(연한색) 색상 구분
- `SeatMap`:
  - 세로형: 기수(▲) → PRESTIGE(2+2) → ECONOMY 구분선 → Y→M→V 연속 영역(3+3)
  - `RowLine`: 행번호 + 좌측 좌석 + 통로 + 우측 좌석
  - `ColLabels`: A B C / D E F 열 헤더
  - 우측 legend: 등급별 색상 샘플 + LF 바 + 잔여석/전체석
- 기내도 카드 좌측 8/12 상단 배치, 아래에 SeatMap — 우측 4/12: Profit Analysis + AI 전략

---

## [jin] 기내 좌석 배치도 — 레이아웃 원복 및 좌석 등급별 운임 관리 상단 배치

**일시**: 2026-05-19

### 요구사항
- 가로형으로 변경된 SeatMap을 세로형으로 복원
- 전체 레이아웃 원복: 좌측 8/12 + 우측 4/12
- 좌석 등급별 운임 관리를 좌측 상단, SeatMap을 하단에 배치

### 구현 내용
#### `frontend/src/components/FareManagement.tsx`
- 레이아웃: `col-span-12 lg:col-span-8` (좌) + `col-span-12 lg:col-span-4` (우)
- 좌측 상단: 좌석 등급별 운임 관리 (ClassEditCard 목록)
- 좌측 하단: 기내 좌석 배치도 (SeatMap)
- 우측: Profit Analysis + AI 전략 분석

---

## [jin] 기내 좌석 배치도 — 좌석 크기·간격 확대 및 특가 구역 전체 표시

**일시**: 2026-05-19

### 요구사항
- 좌석 크기와 간격을 카드 영역에 적절하게 확대
- 특가(V) 구역이 잘려서 표시되는 문제 해결 — 전체가 보이도록 수정

### 구현 내용
#### `frontend/src/components/FareManagement.tsx` — `SeatBtn`, `RowLine`, `ColLabels`, `SeatMap`
- 좌석 크기: 프레스티지 22×18 → **32×26px**, 이코노미 17×14 → **24×20px**
- 좌석 간격(gap): 2px → **4px**, 통로 폭: 8/10px → **12/16px**
- 행 간격(`space-y-0.5`) → **`space-y-1`**
- `maxHeight: 400` 제한 제거 → 모든 좌석 구역 전체 표시 (스크롤 없음)
- 카드 내부 패딩: `px-3 pt-5 pb-4` → **`px-4 pt-6 pb-5`**
- 열 헤더 폰트: `text-[7px]` → `text-[9px]`



