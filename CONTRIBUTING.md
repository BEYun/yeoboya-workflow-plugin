# 기여자 가이드 (Contributor README)

## 플러그인 구조

```
.claude-plugin/plugin.json       # 플러그인 메타데이터 + 훅 등록 포인터
hooks/
  hooks.json                     # PreToolUse 훅 바인딩
  stage-guard.js                 # Notion 쓰기 차단 훅
  lib/state.js                   # active-task / state.json 읽기·쓰기 라이브러리
skills/
  setting/                       # 초기 설정 및 /dev 파이프라인 메인
  planning/                      # 기획서 검토 (stage 1)
  blueprint/                     # UI/데이터/tech-spec (stage 2, 3, 4/5 설계)
  development/                   # 구현, 리뷰, 버그 수정 (stage 4, 5, 6)
  testing/                       # TDD 가이드, QA 시나리오 (stage 7)
  common/                        # notion-writer, validate
docs/superpowers/                # 스펙(specs/) 및 구현 계획(plans/)
.dev-work/<작업번호>/             # 런타임 작업별 상태 (gitignored)
.claude/active-task              # 현재 작업번호 포인터 (gitignored)
```

## 스킬 작성 규칙

모든 스킬은 `SKILL.md`에 프론트매터를 가진다:

```markdown
---
name: <skill-name>
description: <한 줄 설명, 트리거 키워드 포함>
argument-hint: <선택>
---
```

- `description`은 스킬이 호출되어야 할 상황의 키워드를 포함해야 한다. 예: `"spec-review", "기획서 검토", "정책서 피드백"`.
- 스킬 간 의존 관계가 있다면 본문에 명시한다(예: "이 스킬은 `skills/common/notion-writer`를 호출한다").

## 워크플로우 아키텍처

```
/dev → 생성 스킬 → state.json 업데이트
          ▲                ▲
          │                │
  hooks/stage-guard.js   hooks/validate-guard.js   hooks/pageid-capture.js
  (PreToolUse)           (PreToolUse)               (PostToolUse)
```

### 상태 모델

- `.claude/active-task`: 현재 `/dev`가 작업 중인 작업번호 하나만 담긴 텍스트 파일.
- `.dev-work/<작업번호>/state.json`: 작업별 진행 상태.
  ```json
  {
    "task": "DCL-1351",
    "activeStage": 2,
    "activeSkill": "skills/blueprint/ui-flow",
    "stages": {
      "1": { "produced": true, "validated": true, "artifactPageId": "..." },
      "2": { "produced": false, "validated": false, "artifactPageId": null },
      "3": { "produced": false, "validated": false, "artifactPageId": null },
      "7": { "produced": false, "validated": false, "artifactPageId": null }
    },
    "lastUpdated": "..."
  }
  ```
- `stages`는 Notion 산출물이 있는 단계(1/2/3/7)만 추적. 개발 단계(4/5/6)는 `git log --grep='[작업번호]'` 기반.

### 훅 로직

`hooks/stage-guard.js`는 PreToolUse 훅으로 Notion MCP 쓰기(`notion-create-pages`, `notion-update-page`)만 본다. 규칙:

1. `.claude/active-task`가 비어 있으면 허용.
2. 쓰려는 페이지 제목이 우리가 아는 산출물(`기획서 검토`, `UI 흐름도`, `데이터 흐름도`, `QA 시트`)이 아니면 허용.
3. 아는 제목이지만 해당 단계가 `activeStage`와 다르면 차단.
4. 일치하면 허용하고 `stages[stage].produced=true`로 업데이트.
5. `DEV_GUARD_BYPASS=1` 환경변수가 있으면 경고만 찍고 통과.

### 검증 훅

단계별 산출물 검증은 `hooks/validate-guard.js`(PreToolUse)가 자동 처리한다. Notion 쓰기 직전에 포맷 규칙을 확인하고 미충족 시 저장을 차단한다. 검증 통과 후 `hooks/pageid-capture.js`(PostToolUse)가 반환된 `page_id`를 `state.json`의 `validated` 및 `artifactPageId` 필드에 반영한다.

## 새 단계 스킬 추가 체크리스트

- [ ] `skills/<category>/<name>/SKILL.md` 작성 (프론트매터 포함)
- [ ] `hooks/validate-guard.js`에 새 단계의 검증 규칙 블록 추가
- [ ] `skills/setting/dev/SKILL.md` 수정:
  - [ ] 단계 메뉴에 항목 추가
  - [ ] 선행조건 테이블 업데이트
  - [ ] 스킬 라우팅 테이블 업데이트
  - [ ] 영향 전파 규칙 업데이트
- [ ] `hooks/stage-guard.js`의 `TITLE_TO_STAGE` 매핑에 새 산출물 제목 추가
- [ ] `hooks/lib/state.js`의 `NOTION_STAGES` 배열에 새 단계 번호 추가 (Notion 산출물일 경우)
- [ ] `README.md`의 "워크플로우 7단계" 표와 예시 시나리오 업데이트
- [ ] 본 CONTRIBUTING.md의 플러그인 구조 트리에 반영

## 검증 규칙 수정 가이드

`hooks/validate-guard.js`의 단계별 규칙 블록을 직접 편집한다. 기존 작업번호의 `state.json`에는 이전 규칙 기준의 `validated=true`가 남아 있을 수 있으므로, 호환성을 깨는 규칙 변경 시 해당 작업들을 재검증해야 함을 PR 설명에 명시한다.

## 테스트

### 훅 및 라이브러리

```
node hooks/lib/state.test.js
node hooks/stage-guard.test.js
```

### 스킬 단독 실행 / `/dev` 파이프라인

`.dev-work/DCL-TEST/`를 샌드박스 작업번호로 사용한다. 자세한 수동 검증 절차는 각 스킬 카테고리의 README를 참고.

## 커밋 컨벤션

개발 단계(4/5/6)에서 생성되는 커밋은 `[작업번호]` 접두사를 포함해야 한다(`git log --grep` 기반 자동 검증에 필요).

예시: `[DCL-1351] feat: add login screen`
