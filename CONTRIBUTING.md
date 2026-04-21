# 기여자 가이드 (Contributor README)

## 플러그인 구조

```
.claude-plugin/plugin.json          # 플러그인 메타데이터 + 훅 등록 포인터
hooks/
  hooks.json                        # PreToolUse / PostToolUse 훅 바인딩
  stage-guard.js                    # Notion 쓰기 단계 검증 (PreToolUse)
  validate-guard.js                 # 산출물 포맷 검증 (PreToolUse)
  pageid-capture.js                 # page_id 캡처 (PostToolUse)
  lib/state.js                      # active-task / state.json 읽기·쓰기 라이브러리
skills/
  setting/                          # 초기 설정 및 /dev 파이프라인 진입
    dev/SKILL.md                    # /dev 메인 라우터
    dev-init/SKILL.md               # 최초 초기 설정
    service-config/SKILL.md         # 서비스별 Notion 페이지 매핑
  planning/                         # 기획 관련 (1.1, 2.1, 2.2)
    work-define/SKILL.md            # 작업 종류 선택 (1.1)
    spec-review/SKILL.md            # 기획서 검토 (2.1)
    spec-finalize/SKILL.md          # 최종 기획서 확인 (2.2)
  blueprint/                        # 설계 관련 (3.1, 3.2, 3.3)
    ui-flow/SKILL.md                # UI 흐름도 (3.1)
    data-flow/SKILL.md              # 데이터 흐름도 (3.2)
    tech-spec/SKILL.md              # 기술 설계 (3.3)
  development/                      # 개발 관련 (4.1, 4.2, 4.3, 5.2)
    design-check/SKILL.md           # 디자인 유무 확인 (4.1)
    code-write/SKILL.md             # 코드 작성 (4.2)
    code-review/SKILL.md            # 코드 리뷰 (4.3)
    bug-fix/SKILL.md                # 버그 수정 (4.2 bugfix / 5.2)
  testing/                          # 테스트 관련 (5.1, 5.3)
    qa-scenario/SKILL.md            # QA 시나리오 (5.1)
    task-complete/SKILL.md          # 작업 완료 (5.3)
  common/                           # 공통 유틸
    notion-writer/SKILL.md
docs/superpowers/                   # 스펙(specs/) 및 구현 계획(plans/)
.dev-work/<작업번호>/               # 런타임 작업별 상태 (gitignored)
.claude/active-task                 # 현재 작업번호 포인터 (gitignored)
.claude/dev-config.json             # 서비스/플랫폼/작업자 설정 (gitignored)
```

## 외부 의존성

### Notion MCP

훅과 스킬이 Notion MCP 서버의 아래 툴을 사용한다. MCP 서버 ID는 환경에 따라 다를 수 있으며, hooks.json의 `matcher`가 실제 ID와 일치해야 한다.

| 툴 | 사용 위치 | 용도 |
| -- | --------- | ---- |
| `notion-create-pages` | hooks (stage-guard, validate-guard, pageid-capture), notion-writer | 산출물 페이지 신규 생성 |
| `notion-update-page` | hooks (stage-guard, validate-guard, pageid-capture), notion-writer | 산출물 페이지 수정 |
| `notion-fetch` | notion-writer, dev (공유 단계 확인) | 기존 페이지 내용 조회 |
| `notion-search` | dev (공유 단계 Notion 확인) | 작업번호 기반 페이지 탐색 |

> **MCP ID 확인**: `hooks/hooks.json`의 `matcher` 값(`mcp__claude_ai_Notion__notion-create-pages` 등)이 실제 연결된 Notion MCP 서버 ID와 일치해야 훅이 동작한다. `/mcp`로 확인한 실제 ID에 맞게 수정한다.

### superpowers 플러그인

개발 단계 스킬이 superpowers 스킬을 필수 선행으로 호출한다. superpowers 플러그인이 설치되어 있지 않으면 해당 스킬 호출 시 오류가 발생한다.

| superpowers 스킬 | 호출하는 스킬 | 용도 |
| --------------- | ------------- | ---- |
| `brainstorming` | code-write | 코드 작성 전 세부 설계 재점검 및 활용 스킬 결정 |
| `writing-plans` | code-write | brainstorming 결과를 plan으로 구체화 |
| `test-driven-development` | code-write, bug-fix | Red → Green → Refactor TDD 사이클 |
| `systematic-debugging` | bug-fix | 버그 원인 체계적 분석 |
| `requesting-code-review` | code-review | 리뷰 리거·체크리스트 확보 |
| `verification-before-completion` | code-write, bug-fix | "완료" 주장 전 검증 게이트 |

선택적으로 brainstorming 시 `subagent-driven-development`, `dispatching-parallel-agents` 등도 활용할 수 있다.

## 스킬 작성 규칙

모든 스킬은 `SKILL.md`에 프론트매터를 가진다:

```markdown
---
name: <skill-name>
description: <한 줄 설명, 트리거 키워드 포함>
argument-hint: <선택>
---
```

- `description`은 스킬이 호출되어야 할 상황의 키워드를 포함해야 한다.
- 스킬 간 의존 관계가 있다면 본문에 명시한다 (예: "이 스킬은 `skills/common/notion-writer`를 호출한다").
- 신규 스킬은 반드시 `/skill-creator`(anthropic-skills:skill-creator)를 경유해 생성한다. 직접 Write 금지.

## 워크플로우 아키텍처

```
/dev → 스킬 라우팅 → state.json 업데이트
          ▲                ▲
          │                │
  hooks/stage-guard.js   hooks/validate-guard.js   hooks/pageid-capture.js
  (PreToolUse)           (PreToolUse)               (PostToolUse)
```

### 상태 모델

- `.claude/active-task`: 현재 `/dev`가 작업 중인 작업번호 하나만 담긴 텍스트 파일.
- `.claude/dev-config.json`: `service`, `platform`, `worker` 등 전역 설정.
- `.dev-work/<작업번호>/state.json`: 작업별 진행 상태.
  ```json
  {
    "task": "DCL-1351",
    "workType": "new",
    "finalSpec": null,
    "activeStage": "3.1",
    "activeSkill": "skills/blueprint/ui-flow",
    "stages": {
      "1.1": { "done": false, "at": null },
      "2.1": { "done": false, "validated": false, "artifactPageId": null },
      "2.2": { "done": false, "validated": false, "artifactPageId": null },
      "3.1": { "done": false, "validated": false, "artifactPageId": null },
      "3.2": { "done": false, "validated": false, "artifactPageId": null },
      "3.3": { "done": false, "validated": false, "artifactPageId": null },
      "4.1": { "done": false, "result": null },
      "4.2": { "done": false },
      "4.3": { "done": false },
      "5.1": { "done": false, "validated": false, "artifactPageId": null }
    },
    "lastUpdated": "..."
  }
  ```
- Notion 산출물이 있는 스텝(`NOTION_STAGES`): `['2.1', '2.2', '3.1', '3.2', '3.3', '5.1']`
- 개발 스텝(4.2, 4.3)은 `git log --grep='[작업번호]'` 기반으로 사후 리포트에서만 참조.

### 훅 로직

**`hooks/stage-guard.js`** (PreToolUse): Notion 쓰기(`notion-create-pages`, `notion-update-page`)를 가로채 단계를 검증한다. 규칙:

1. `.claude/active-task`가 비어 있으면 허용.
2. 쓰려는 페이지 제목이 아는 산출물 제목(`TITLE_TO_STAGE`)에 없으면 허용.
3. 아는 제목이지만 해당 단계가 `activeStage`와 다르면 차단.
4. 일치하면 허용.
5. `DEV_GUARD_BYPASS=1` 환경변수가 있으면 경고만 찍고 통과.

현재 `TITLE_TO_STAGE` 매핑:

| 페이지 제목   | 단계  |
| ----------- | ----- |
| 최종 기획서  | 2.2   |
| UI 흐름도    | 3.1   |
| 데이터 흐름도 | 3.2  |
| 기술 설계    | 3.3   |
| QA 시트      | 5.1   |

**`hooks/validate-guard.js`** (PreToolUse): 산출물 저장 전 단계별 포맷 규칙을 검증하고 미충족 시 차단.

**`hooks/pageid-capture.js`** (PostToolUse): Notion 쓰기 성공 후 반환된 `page_id`를 `state.json`의 `validated` 및 `artifactPageId` 필드에 반영.

## 새 단계 스킬 추가 체크리스트

- [ ] `skills/<category>/<name>/SKILL.md` 작성 (프론트매터 포함) — `/skill-creator` 경유
- [ ] `hooks/validate-guard.js`에 새 단계의 검증 규칙 블록 추가
- [ ] `skills/setting/dev/SKILL.md` 수정:
  - [ ] 단계 메뉴에 항목 추가
  - [ ] 선행조건 테이블 업데이트
  - [ ] 스킬 라우팅 테이블 업데이트
  - [ ] 재작업 영향 전파 테이블 업데이트
  - [ ] workType 숨김 규칙 업데이트
- [ ] `hooks/stage-guard.js`의 `TITLE_TO_STAGE` 매핑에 새 산출물 제목 추가 (Notion 쓰기가 있는 경우)
- [ ] `hooks/pageid-capture.js`의 `TITLE_TO_STAGE` 매핑에도 동일하게 추가
- [ ] `hooks/lib/state.js`의 `NOTION_STAGES` 배열 및 `newEmptyState()` 스키마에 새 단계 추가 (Notion 산출물일 경우)
- [ ] `README.md`의 워크플로우 단계 표와 예시 시나리오 업데이트
- [ ] 본 `CONTRIBUTING.md`의 플러그인 구조 트리 및 `TITLE_TO_STAGE` 표에 반영

## 검증 규칙 수정 가이드

`hooks/validate-guard.js`의 단계별 규칙 블록을 직접 편집한다. 기존 작업번호의 `state.json`에는 이전 규칙 기준의 `validated=true`가 남아 있을 수 있으므로, 호환성을 깨는 규칙 변경 시 해당 작업들을 재검증해야 함을 PR 설명에 명시한다.

## 테스트

### 훅 및 라이브러리

```bash
node hooks/lib/state.js   # state 라이브러리 단독 확인
```

### 스킬 단독 실행 / `/dev` 파이프라인

`.dev-work/DCL-TEST/`를 샌드박스 작업번호로 사용한다. 자세한 수동 검증 절차는 각 스킬 카테고리의 README를 참고.

## 커밋 컨벤션

개발 단계(4.2, 4.3)에서 생성되는 커밋은 `[작업번호]` 접두사를 포함해야 한다(`git log --grep` 기반 사후 리포트에 필요).

예시: `[DCL-1351] feat: add login screen`
