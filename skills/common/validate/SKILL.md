---
name: validate
description: 각 워크플로우 단계의 산출물이 기대 구조를 따르는지 자동 검증한다. /dev 파이프라인이 생성 스킬 실행 직후 자동 호출한다. "validate", "검증", "산출물 검증"
argument-hint: <stage> (1 | 2 | 3 | 7)
---

# validate

/dev 파이프라인이 각 단계의 생성 스킬을 실행한 직후 호출한다. 입력으로 받은 단계의 Notion 산출물을 로드하고 아래 중앙화된 규칙을 적용한다. 결과는 `.dev-work/<task>/state.json`의 `stages[stage].validated`에 반영된다.

## 입력

- `task` — `.claude/active-task`에서 자동으로 읽는다
- `stage` — 1 | 2 | 3 | 7

## 절차

1. `.claude/active-task`에서 현재 작업번호 조회. 없으면 "active task 없음" 에러로 종료.
2. `.dev-work/<task>/state.json`에서 `stages[stage].artifactPageId` 조회. 없으면 "산출물 페이지 ID 없음"으로 fail.
3. `skills/common/notion-writer`로 해당 페이지 블록을 로드.
4. 아래 단계별 규칙을 적용. 모두 통과하면 `validated=true`로 업데이트, 실패하면 `false` 유지 + 실패한 규칙 이름을 사용자에게 리포트.
5. Notion 읽기 실패 시 최대 3회 재시도. 3회 모두 실패 → "검증 불가, 수동 확인 후 진행하시겠습니까?" 경로 제공.

## 단계별 규칙

### Stage 1 — 기획서 검토
- 필수 헤딩 4개가 모두 존재: "화면 흐름", "상태 정의", "엣지 케이스", "인터랙션"
- 각 섹션이 비어 있지 않음 (최소 1개의 bullet 또는 문단)

### Stage 2 — UI 흐름도
- `mermaid` 코드 블록이 최소 1개 존재
- 블록 내용에 `stateDiagram` 또는 `stateDiagram-v2` 키워드 포함
- 상태 노드(화살표 `-->`로 연결된 식별자) 최소 2개

### Stage 3 — 데이터 흐름도
- `mermaid` 코드 블록이 최소 1개 존재
- 블록 내용에 `sequenceDiagram` 키워드 포함
- `participant` 선언 최소 2개

### Stage 7 — QA 시트
- 3구분 헤딩이 존재 (예: "정상" / "경계" / "에러", 또는 동등 의미의 3구분)
- 각 구분에 최소 1개의 시나리오 행

## 실패 처리

- 규칙 실패: `stages[stage].validated=false` 유지. `/dev`는 후행 단계 진입을 선행조건 미충족으로 차단. 사용자에게 실패한 규칙 이름과 생성 스킬 재실행 옵션 제시.
- Notion 읽기 실패 3회: 사용자 확인 후 `validated=null`로 기록하고 수동 진행 허용.

## 재작업 영향 전파

1단계 재검증 통과 시, `state.json`에서 후행 단계(2, 3, 7)의 `validated`를 `false`로 되돌린다. 2/3단계 재검증 통과 시 4, 5는 git 기반이므로 `state.json` 업데이트 없음. `/dev` 메뉴 표시에서 ⚠ 상태로 나타난다.

---

> 본 스킬의 규칙은 생성 스킬들의 출력 포맷에 강하게 결합된다. 생성 스킬이 포맷을 변경하면 이 파일의 해당 규칙 블록을 동기화해야 한다.
