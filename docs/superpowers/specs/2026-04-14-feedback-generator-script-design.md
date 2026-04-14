# feedback-generator 스크립트 전환 설계

## 배경

현재 feedback-generator는 SKILL.md로 구현되어 있다. Claude가 매번 200줄 이상의 HTML을 처음부터 생성하는 방식이라 결과물이 미묘하게 달라지고, 불필요한 토큰을 소모한다.

디자인은 이미 확정되어 있고, 입력 포맷도 정형화되어 있어 창의적 판단이 필요 없다. 데이터를 템플릿에 끼워넣는 작업이므로 스크립트로 전환한다.

## 결정 사항

- Node.js 스크립트 (순수 Node.js, npm 의존성 없음)
- JSON 파일 인터페이스 (spec-review → JSON 저장 → 스크립트가 읽어서 HTML 생성)
- spec-review 흐름에 통합 (feedback-generator 독립 스킬 삭제)
- PDF는 수동 (브라우저 Cmd+P)
- Node.js 필수, 미설치 시 안내

## 전체 흐름

```
spec-review 실행
  ↓
검토 완료 → 사용자 확인
  ↓
JSON 저장: .dev-work/[작업번호]/review-data.json
  ↓
node scripts/feedback-generator.js .dev-work/[작업번호]/review-data.json
  ↓
HTML 생성: .dev-work/[작업번호]/[작업번호]-feedback.html
```

## JSON 스키마

```json
{
  "taskId": "DCL-1351",
  "title": "달라 쿠킹클래스",
  "subtitle": "26.05 이벤트 기획서 v0.2 — UI/UX 명세 완성도 검토",
  "reviewer": "윤병은",
  "reviewDate": "2026. 04. 13",
  "source": "26.05_달라_쿠킹클래스ver0.2.pdf",
  "pages": [
    {
      "pageNumber": "p.1–2",
      "title": "표지 / 버전관리",
      "pass": true,
      "passReason": "문서 버전, 작성자, 변경 내용 명확히 기술됨",
      "issues": []
    },
    {
      "pageNumber": "p.3",
      "title": "이벤트 내용 — 재료 획득 / 케이크 만들기",
      "pass": false,
      "issues": [
        {
          "type": "state",
          "severity": "critical",
          "title": "재료 획득 시 UI 상태 미정의",
          "problem": "재료 랜덤 지급 시 어떤 화면이 표시되는지 없음.",
          "suggestion": "재료 획득 결과 팝업/토스트 UI 정의."
        }
      ]
    }
  ]
}
```

### 필드 설명

**최상위:**

| 필드 | 타입 | 설명 |
|------|------|------|
| taskId | string | 작업번호 (예: DCL-1351) |
| title | string | 문서 제목 |
| subtitle | string | 부제목 (버전, 검토 목적 등) |
| reviewer | string | 검토자 이름 (dev-config.json에서) |
| reviewDate | string | 검토일 |
| source | string | 원본 PDF 파일명 |
| pages | array | 페이지별 검토 결과 |

**pages[]:**

| 필드 | 타입 | 설명 |
|------|------|------|
| pageNumber | string | 페이지 번호 (예: "p.3", "p.1–2") |
| title | string | 화면/섹션 이름 |
| pass | boolean | 통과 여부 |
| passReason | string | 통과 시 사유 (pass=true일 때만) |
| issues | array | 이슈 목록 (pass=true면 빈 배열) |

**pages[].issues[]:**

| 필드 | 타입 | 설명 |
|------|------|------|
| type | string | `state` / `edge` / `flow` / `interaction` |
| severity | string | `critical` / `warn` / `info` |
| title | string | 이슈 제목 |
| problem | string | 문제점 |
| suggestion | string | 권장 수정사항 |

### type → 표시 매핑

| type | 한글 라벨 | CSS tag class | 색상 |
|------|----------|---------------|------|
| state | 상태 정의 | tag-state | #ff6b6b (빨강) |
| edge | 엣지 케이스 | tag-edge | #ffa94d (주황) |
| flow | 화면 흐름 | tag-flow | #74c0fc (파랑) |
| interaction | 인터랙션 | tag-interaction | #da77f2 (보라) |

### severity → 카드 매핑

| severity | CSS class | border 색상 |
|----------|-----------|-------------|
| critical | critical | 빨강 |
| warn | warn | 주황 |
| info | info | 파랑 |

## 스크립트 구조

**위치:** `scripts/feedback-generator.js`

**실행:** `node scripts/feedback-generator.js <json-path>`

**단일 파일, ~200줄.** CSS는 스크립트 내에 하드코딩하여 self-contained HTML을 생성한다.

**처리 순서:**
1. CLI 인자에서 JSON 경로 읽기
2. JSON 파일 파싱
3. 통계 계산 (이슈 수, 통과 수, 발견율, 유형별 분포)
4. HTML 문자열 조립 (Hero → Stats → Pages → Summary → Footer)
5. `.dev-work/[taskId]/[taskId]-feedback.html` 저장
6. stdout에 결과 경로 출력

**에러 처리:**
- JSON 파일 없음 → `"Error: File not found: <path>"` + exit 1
- JSON 파싱 실패 → `"Error: Invalid JSON: <path>"` + exit 1

**HTML 디자인:** 기존 `.dev-work/DCL-TEST/DCL-TEST-feedback-v2.html`과 동일한 다크 에디토리얼 스타일을 그대로 사용한다. 색상, 폰트, 레이아웃, 애니메이션 모두 동일.

## spec-review SKILL.md 수정

"사용자 확인 후 > 피드백 PDF 생성" 섹션을 다음으로 교체:

```markdown
### 피드백 HTML 생성
1. 검토 결과를 JSON 스키마에 맞춰 저장
   → .dev-work/[작업번호]/review-data.json
2. Node.js 존재 확인 (which node)
3. 스크립트 실행
   → node scripts/feedback-generator.js .dev-work/[작업번호]/review-data.json
4. Node.js 미설치 시 안내:
   "Node.js가 필요합니다. https://nodejs.org 에서 설치하세요."
5. 생성 완료 안내:
   "피드백 HTML이 생성되었습니다: .dev-work/[작업번호]/[작업번호]-feedback.html
    브라우저에서 열어 Cmd+P로 PDF 변환할 수 있습니다."
```

## 삭제 대상

- `skills/planning/feedback-generator/SKILL.md` — 스크립트로 대체됨
- `skills/planning/feedback-generator/` 디렉토리 전체

## 검증 결과

기존 HTML(DCL-TEST-feedback-v2.html)의 모든 동적 데이터 포인트를 JSON 스키마와 대조 완료. 누락 없음.

- Hero 6개 필드 ✅
- Stats 4개 값 (전부 계산 가능) ✅
- Page 섹션 반복 + 배지 ✅
- Pass 카드 + 사유 ✅
- Issue 카드 (severity, type, title, problem, suggestion) ✅
- Summary 유형별 집계 + 진행 바 % ✅
- Animation delay (index 기반 계산) ✅
