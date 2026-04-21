# 여보야 워크플로우 플러그인

플랫폼 불일치 · 코드 품질 및 일관성 · 설계 공통 기준 부재 · QA 시나리오 부재 —
솔루션개발부의 4가지 문제를 해결하는 Claude Code 워크플로우 플러그인.

## 한마디로

**/dev 단일 명령어로 기획 → 설계 → 개발 → QA 파이프라인.**

## 의존성

### Notion MCP (필수)

Notion MCP 서버가 연결되어 있어야 한다. 산출물(최종 기획서, UI 흐름도, 데이터 흐름도, 기술 설계, QA 시트) 저장·조회에 아래 툴을 사용한다.

| 툴 | 용도 |
| -- | ---- |
| `notion-create-pages` | 산출물 페이지 신규 생성 |
| `notion-update-page` | 산출물 페이지 수정 |
| `notion-fetch` | 기존 산출물 및 기획서 조회 |
| `notion-search` | 작업번호 기반 페이지 탐색 |

### superpowers 플러그인 (필수)

개발 단계 스킬이 아래 superpowers 스킬을 필수 선행으로 호출한다.

| superpowers 스킬 | 호출하는 스킬 | 용도 |
| --------------- | ------------- | ---- |
| `brainstorming` | code-write | 코드 작성 전 세부 설계 재점검 |
| `writing-plans` | code-write | brainstorming 이후 작성 plan 수립 |
| `test-driven-development` | code-write, bug-fix | Red → Green → Refactor TDD 사이클 |
| `systematic-debugging` | bug-fix | 버그 원인 체계적 분석 |
| `requesting-code-review` | code-review | 리뷰 체크리스트 확보 |
| `verification-before-completion` | code-write, bug-fix | "완료" 주장 전 검증 게이트 |

> **`.gitignore` 권고**: superpowers 플러그인은 런타임 중 프로젝트의 `docs/superpowers/` 디렉토리에 스펙·플랜 파일을 생성합니다. 이 디렉토리를 커밋하지 않으려면 프로젝트 `.gitignore`에 아래를 추가하세요.
> ```
> docs/superpowers/
> ```

## 설치

Claude Code에서 플러그인을 추가한다. Notion MCP와 Figma 또는 Zeplin MCP 연결이 사전에 필요하다.

1. Claude Code 설정에서 이 저장소를 플러그인으로 등록
2. Notion MCP, Figma 또는 Zeplin MCP 서버가 연결되어 있는지 확인 (`/mcp` 명령으로 점검)
3. 최초 1회 초기 설정 실행 (아래 Quick Start 참고)

## 빠른 시작

```
/dev-init                    # 서비스 / 플랫폼 / 작업자 / MCP 연결 설정
/setting/service-config      # 서비스별 Notion 페이지 매핑
/dev DCL-1351                # 작업번호로 파이프라인 시작
```

## 워크플로우 단계

| 단계 | 스킬 | 산출물 | 선행 |
| ---- | ---- | ------ | ---- |
| 1.1  | work-define    | 작업 종류 선택       | 없음       |
| 2.1  | spec-review    | 기획서 검토          | 1.1        |
| 2.2  | spec-finalize  | 최종 기획서          | 2.1        |
| 3.1  | ui-flow        | UI 흐름도            | 2.2        |
| 3.2  | data-flow      | 데이터 흐름도        | 2.2        |
| 3.3  | tech-spec      | 기술 설계            | 3.1, 3.2   |
| 4.1  | design-check   | 디자인 유무 확인     | 3.3        |
| 4.2  | code-write / bug-fix | 코드 작성 / 버그 수정 | 4.1   |
| 4.3  | code-review    | 코드 리뷰            | 4.2        |
| 5.1  | qa-scenario    | QA 시트              | 4.3        |
| 5.2  | bug-fix        | 테스트 버그 수정 (선택) | 없음    |
| 5.3  | task-complete  | 작업 완료            | 5.1        |

## 예시 시나리오

- **신규 개발:** 1.1 → 2.1 → 2.2 → 3.1 → 3.2 → 3.3 → 4.1 → 4.2 → 4.3 → 5.1 → 5.3
- **수정·고도화:** 1.1 → 2.1 → 2.2 → 3.1 → 3.2 → 3.3 → 4.1 → 4.2 → 4.3 → 5.1 → 5.3
- **버그 수정:** 1.1 → 2.1 → 4.2 → 4.3 → 5.3 (bugfix는 3.x · 4.1 스킵)

## workType별 숨김 스텝

| workType | 숨기는 스텝 |
| -------- | ----------- |
| `new`    | (없음) |
| `change` | (없음) |
| `bugfix` | 2.2, 3.1, 3.2, 3.3, 4.1 |

## 검증 시스템

각 단계의 산출물은 자동으로 구조 검증되며, 잘못된 단계에서 산출물을 쓰려 하면 훅이 차단한다.

- **왜 막혔는지 메시지를 확인하세요.** 보통 `/dev`의 현재 단계와 다른 단계의 산출물을 쓰려 할 때 발생합니다. 올바른 단계를 `/dev` 메뉴에서 선택하세요.
- **수동 편집이 불가피할 때만 우회하세요.**
  ```bash
  DEV_GUARD_BYPASS=1 <claude code 실행>
  ```

## 작업 전환 / 병렬 작업

각 작업번호는 자기 디렉토리(`.dev-work/<작업번호>/`)에 상태를 보관한다. 다른 작업번호로 전환해도 기존 작업의 상태는 그대로 보존되며, 언제든 다시 `/dev <작업번호>`로 재개할 수 있다.

## FAQ / 트러블슈팅

- **Notion / Figma / Zeplin MCP 연결 실패** — `/mcp` 로 상태를 확인하고 토큰/권한을 재설정하세요.
- **state 파일을 초기화하고 싶다** — 해당 작업의 `.dev-work/<작업번호>/state.json`을 삭제하세요. `/dev`가 다시 실행되면 초기 구조로 재생성합니다.
- **작업번호 전환** — `/dev <다른_작업번호>` 를 실행하면 `.claude/active-task`만 갱신되고 기존 작업의 state는 유지됩니다.
- **초기 설정 변경** — `/dev-init`을 다시 실행하거나 `.claude/dev-config.json`을 직접 편집하세요.
