# 스킬 카테고리 분리 구현 플랜

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 14개 스킬을 6개 카테고리(setting/planning/blueprint/development/testing/common)로 재구성하고, 스킬 간 참조를 상대 경로 기반으로 변경한다.

**Architecture:** 디렉토리 이동 → 리네이밍 → 참조 변경 → README 생성 순서로 진행. evals 삭제는 가장 먼저 수행하여 이동할 파일을 줄인다.

**Tech Stack:** git, bash (파일 이동), markdown (SKILL.md, README.md)

---

### Task 1: evals 디렉토리 전체 삭제

**Files:**
- Delete: `skills/*/evals/` (14개 디렉토리)

- [ ] **Step 1: evals 디렉토리 삭제**

```bash
find skills/ -type d -name "evals" -exec rm -rf {} +
```

- [ ] **Step 2: 삭제 확인**

```bash
find skills/ -name "evals" -type d
```

Expected: 출력 없음 (모든 evals 삭제됨)

- [ ] **Step 3: 커밋**

```bash
git add -A skills/
git commit -m "chore: remove all evals directories from skills"
```

---

### Task 2: 카테고리 디렉토리 생성 및 스킬 이동

**Files:**
- Create: `skills/setting/`, `skills/planning/`, `skills/blueprint/`, `skills/development/`, `skills/testing/`, `skills/common/`
- Move: 14개 스킬 디렉토리를 각 카테고리 하위로 이동
- Rename: `skills/common-design/` → `skills/blueprint/tech-spec/`

- [ ] **Step 1: 카테고리 디렉토리 생성**

```bash
mkdir -p skills/setting skills/planning skills/blueprint skills/development skills/testing skills/common
```

- [ ] **Step 2: setting 카테고리로 이동**

```bash
mv skills/dev skills/setting/dev
mv skills/dev-init skills/setting/dev-init
mv skills/service-config skills/setting/service-config
```

- [ ] **Step 3: planning 카테고리로 이동**

```bash
mv skills/planning 에는 이미 디렉토리가 있으므로 스킬을 이동:
mv skills/spec-review skills/planning/spec-review
mv skills/feedback-generator skills/planning/feedback-generator
```

- [ ] **Step 4: blueprint 카테고리로 이동 (common-design → tech-spec 리네이밍 포함)**

```bash
mv skills/ui-flow skills/blueprint/ui-flow
mv skills/data-flow skills/blueprint/data-flow
mv skills/common-design skills/blueprint/tech-spec
```

- [ ] **Step 5: development 카테고리로 이동**

```bash
mv skills/development 에는 이미 디렉토리가 있으므로 스킬을 이동:
mv skills/implement skills/development/implement
mv skills/code-review skills/development/code-review
mv skills/bug-fix skills/development/bug-fix
```

- [ ] **Step 6: testing 카테고리로 이동**

```bash
mv skills/tdd-guide skills/testing/tdd-guide
mv skills/qa-scenario skills/testing/qa-scenario
```

- [ ] **Step 7: common 카테고리로 이동**

```bash
mv skills/notion-writer skills/common/notion-writer
```

- [ ] **Step 8: 이동 확인**

```bash
find skills/ -name "SKILL.md" | sort
```

Expected:
```
skills/blueprint/data-flow/SKILL.md
skills/blueprint/tech-spec/SKILL.md
skills/blueprint/ui-flow/SKILL.md
skills/common/notion-writer/SKILL.md
skills/development/bug-fix/SKILL.md
skills/development/code-review/SKILL.md
skills/development/implement/SKILL.md
skills/planning/feedback-generator/SKILL.md
skills/planning/spec-review/SKILL.md
skills/setting/dev-init/SKILL.md
skills/setting/dev/SKILL.md
skills/setting/service-config/SKILL.md
skills/testing/qa-scenario/SKILL.md
skills/testing/tdd-guide/SKILL.md
```

- [ ] **Step 9: 커밋**

```bash
git add -A skills/
git commit -m "refactor: reorganize skills into 6 category directories"
```

---

### Task 3: tech-spec SKILL.md 내부 이름 변경

**Files:**
- Modify: `skills/blueprint/tech-spec/SKILL.md`

- [ ] **Step 1: name 필드 변경**

`skills/blueprint/tech-spec/SKILL.md`의 frontmatter에서:

```yaml
# AS-IS
name: common-design

# TO-BE
name: tech-spec
```

- [ ] **Step 2: description 필드 변경**

```yaml
# AS-IS
description: 플랫폼 공통 설계를 작성할 때 사용. UI 흐름도와 데이터 흐름도를 기반으로 화면 구조, 데이터 모델, 상태 관리, API 연동, 비즈니스 로직, 엣지 케이스를 플랫폼 무관하게 설계한다. 신규 개발과 기능 변경 두 가지 모드를 지원한다. "공통 설계", "common design", "설계 작성", "플랫폼 공통"

# TO-BE
description: 플랫폼 공통 기술 설계를 작성할 때 사용. UI 흐름도와 데이터 흐름도를 기반으로 화면 구조, 데이터 모델, 상태 관리, API 연동, 비즈니스 로직, 엣지 케이스를 플랫폼 무관하게 설계한다. 신규 개발과 기능 변경 두 가지 모드를 지원한다. "기술 설계", "tech spec", "설계 작성", "플랫폼 공통"
```

- [ ] **Step 3: 제목 변경**

```markdown
# AS-IS
# common-design

# TO-BE
# tech-spec
```

- [ ] **Step 4: 커밋**

```bash
git add skills/blueprint/tech-spec/SKILL.md
git commit -m "refactor: rename common-design to tech-spec in SKILL.md"
```

---

### Task 4: dev SKILL.md 참조 변경 (오케스트레이터)

**Files:**
- Modify: `skills/setting/dev/SKILL.md`

이 스킬은 가장 많은 참조(11개 스킬)를 갖고 있으므로 별도 태스크로 분리한다.

- [ ] **Step 1: dev-init 참조 변경**

```markdown
# AS-IS
'/dev-init'을 먼저 실행하여 초기 설정을 완료해주세요.

# TO-BE
'/setting/dev-init'을 먼저 실행하여 초기 설정을 완료해주세요.
```

- [ ] **Step 2: notion-writer 참조 변경**

```markdown
# AS-IS
### Notion 검증 (notion-writer 스킬 사용)

# TO-BE
### Notion 검증 (skills/common/notion-writer 스킬 사용)
```

- [ ] **Step 3: 스킬 라우팅 테이블 변경**

```markdown
# AS-IS
| 1 | `spec-review` |
| 2 | `ui-flow` |
| 3 | `data-flow` |
| 4 | `common-design` → `tdd-guide` → `implement` → `code-review` (순차 실행) |
| 5 | `common-design` (변경 모드) → `tdd-guide` → `implement` → `code-review` (순차 실행) |
| 6 | `bug-fix` (내부에서 code-review 호출) |
| 7 | `qa-scenario` |

# TO-BE
| 1 | `skills/planning/spec-review` |
| 2 | `skills/blueprint/ui-flow` |
| 3 | `skills/blueprint/data-flow` |
| 4 | `skills/blueprint/tech-spec` → `skills/testing/tdd-guide` → `skills/development/implement` → `skills/development/code-review` (순차 실행) |
| 5 | `skills/blueprint/tech-spec` (변경 모드) → `skills/testing/tdd-guide` → `skills/development/implement` → `skills/development/code-review` (순차 실행) |
| 6 | `skills/development/bug-fix` (내부에서 skills/development/code-review 호출) |
| 7 | `skills/testing/qa-scenario` |
```

- [ ] **Step 4: 커밋**

```bash
git add skills/setting/dev/SKILL.md
git commit -m "refactor: update dev skill references to category paths"
```

---

### Task 5: notion-writer를 참조하는 스킬들 경로 변경

**Files:**
- Modify: `skills/planning/spec-review/SKILL.md`
- Modify: `skills/blueprint/ui-flow/SKILL.md`
- Modify: `skills/blueprint/data-flow/SKILL.md`
- Modify: `skills/blueprint/tech-spec/SKILL.md`
- Modify: `skills/testing/tdd-guide/SKILL.md`
- Modify: `skills/development/code-review/SKILL.md`
- Modify: `skills/development/implement/SKILL.md`
- Modify: `skills/testing/qa-scenario/SKILL.md`
- Modify: `skills/development/bug-fix/SKILL.md`

모든 파일에서 `notion-writer` → `skills/common/notion-writer`로 변경한다.

- [ ] **Step 1: spec-review 변경**

`skills/planning/spec-review/SKILL.md`에서:

```markdown
# AS-IS
**notion-writer** 스킬을 사용하여:

# TO-BE
**skills/common/notion-writer** 스킬을 사용하여:
```

- [ ] **Step 2: ui-flow 변경**

`skills/blueprint/ui-flow/SKILL.md`에서:

```markdown
# AS-IS (2곳)
**notion-writer** 스킬로 "기획서 검토" 서브페이지 존재 여부를 확인한다.
**notion-writer** 스킬을 사용하여 작업번호 페이지 하위에

# TO-BE
**skills/common/notion-writer** 스킬로 "기획서 검토" 서브페이지 존재 여부를 확인한다.
**skills/common/notion-writer** 스킬을 사용하여 작업번호 페이지 하위에
```

- [ ] **Step 3: data-flow 변경**

`skills/blueprint/data-flow/SKILL.md`에서:

```markdown
# AS-IS (2곳)
**notion-writer** 스킬로 "기획서 검토" 서브페이지 존재 여부를 확인한다.
**notion-writer** 스킬을 사용하여 작업번호 페이지 하위에

# TO-BE
**skills/common/notion-writer** 스킬로 "기획서 검토" 서브페이지 존재 여부를 확인한다.
**skills/common/notion-writer** 스킬을 사용하여 작업번호 페이지 하위에
```

- [ ] **Step 4: tech-spec 변경**

`skills/blueprint/tech-spec/SKILL.md`에서:

```markdown
# AS-IS (4곳)
**notion-writer** 스킬로 세 서브페이지 존재 여부를 확인한다.
Notion에서 산출물을 읽는다 (**notion-writer** 스킬 사용):
기존 정책서/설계서가 있는지 **notion-writer**로 검색
**notion-writer** 스킬을 사용하여 작업번호 페이지 하위에

# TO-BE
**skills/common/notion-writer** 스킬로 세 서브페이지 존재 여부를 확인한다.
Notion에서 산출물을 읽는다 (**skills/common/notion-writer** 스킬 사용):
기존 정책서/설계서가 있는지 **skills/common/notion-writer**로 검색
**skills/common/notion-writer** 스킬을 사용하여 작업번호 페이지 하위에
```

- [ ] **Step 5: tdd-guide 변경**

`skills/testing/tdd-guide/SKILL.md`에서:

```markdown
# AS-IS
Notion에서 **notion-writer** 스킬로 "공통 설계" 서브페이지를 읽는다

# TO-BE
Notion에서 **skills/common/notion-writer** 스킬로 "공통 설계" 서브페이지를 읽는다
```

- [ ] **Step 6: code-review 변경**

`skills/development/code-review/SKILL.md`에서:

```markdown
# AS-IS
Notion에서 **notion-writer** 스킬로 "공통 설계" 서브페이지를 읽는다

# TO-BE
Notion에서 **skills/common/notion-writer** 스킬로 "공통 설계" 서브페이지를 읽는다
```

- [ ] **Step 7: implement 변경**

`skills/development/implement/SKILL.md`에서:

```markdown
# AS-IS
Notion에서 **notion-writer** 스킬로 읽거나

# TO-BE
Notion에서 **skills/common/notion-writer** 스킬로 읽거나
```

- [ ] **Step 8: qa-scenario 변경**

`skills/testing/qa-scenario/SKILL.md`에서:

```markdown
# AS-IS (2곳)
Notion에서 **notion-writer** 스킬로 "공통 설계" 서브페이지를 읽는다
**notion-writer** 스킬을 사용한다.

# TO-BE
Notion에서 **skills/common/notion-writer** 스킬로 "공통 설계" 서브페이지를 읽는다
**skills/common/notion-writer** 스킬을 사용한다.
```

- [ ] **Step 9: bug-fix 변경**

`skills/development/bug-fix/SKILL.md`에서:

```markdown
# AS-IS
`notion-writer` 스킬을 사용하여 작업번호 페이지 하위에

# TO-BE
`skills/common/notion-writer` 스킬을 사용하여 작업번호 페이지 하위에
```

- [ ] **Step 10: 커밋**

```bash
git add skills/planning/spec-review/SKILL.md \
       skills/blueprint/ui-flow/SKILL.md \
       skills/blueprint/data-flow/SKILL.md \
       skills/blueprint/tech-spec/SKILL.md \
       skills/testing/tdd-guide/SKILL.md \
       skills/development/code-review/SKILL.md \
       skills/development/implement/SKILL.md \
       skills/testing/qa-scenario/SKILL.md \
       skills/development/bug-fix/SKILL.md
git commit -m "refactor: update notion-writer references to skills/common/notion-writer"
```

---

### Task 6: 나머지 스킬 간 참조 변경

**Files:**
- Modify: `skills/planning/spec-review/SKILL.md` — feedback-generator 참조
- Modify: `skills/development/implement/SKILL.md` — tdd-guide, code-review 참조
- Modify: `skills/development/code-review/SKILL.md` — implement 참조
- Modify: `skills/development/bug-fix/SKILL.md` — code-review 참조
- Modify: `skills/testing/tdd-guide/SKILL.md` — common-design 참조
- Modify: `skills/common/notion-writer/SKILL.md` — service-config 참조
- Modify: `skills/setting/service-config/SKILL.md` — /dev-init 참조

- [ ] **Step 1: spec-review — feedback-generator 참조**

`skills/planning/spec-review/SKILL.md`에서:

```markdown
# AS-IS
**feedback-generator** 스킬을 사용하여:

# TO-BE
**skills/planning/feedback-generator** 스킬을 사용하여:
```

- [ ] **Step 2: implement — tdd-guide 참조**

`skills/development/implement/SKILL.md`에서:

```markdown
# AS-IS
**tdd-guide**에서 작성한 실패 테스트를 통과시키는 코드를 작성한다.
**tdd-guide** 스킬에서 작성한 Red 상태의 테스트

# TO-BE
**skills/testing/tdd-guide**에서 작성한 실패 테스트를 통과시키는 코드를 작성한다.
**skills/testing/tdd-guide** 스킬에서 작성한 Red 상태의 테스트
```

- [ ] **Step 3: implement — code-review 참조**

`skills/development/implement/SKILL.md`에서:

```markdown
# AS-IS
모든 테스트가 통과하면 **code-review** 스킬을 트리거한다:
→ code-review 스킬 호출

# TO-BE
모든 테스트가 통과하면 **skills/development/code-review** 스킬을 트리거한다:
→ skills/development/code-review 스킬 호출
```

- [ ] **Step 4: code-review — implement 참조**

`skills/development/code-review/SKILL.md`에서:

```markdown
# AS-IS
(**implement** 스킬에서 자동 전달되거나 사용자가 경로 지정)

# TO-BE
(**skills/development/implement** 스킬에서 자동 전달되거나 사용자가 경로 지정)
```

- [ ] **Step 5: bug-fix — code-review 참조**

`skills/development/bug-fix/SKILL.md`에서:

```markdown
# AS-IS
`code-review` 스킬을 호출하여 수정된 코드를 리뷰한다.

# TO-BE
`skills/development/code-review` 스킬을 호출하여 수정된 코드를 리뷰한다.
```

- [ ] **Step 6: tdd-guide — common-design 참조**

`skills/testing/tdd-guide/SKILL.md`에서:

```markdown
# AS-IS
공통 설계(**common-design**)의 각 섹션을 기반으로

# TO-BE
공통 설계(**skills/blueprint/tech-spec**)의 각 섹션을 기반으로
```

- [ ] **Step 7: notion-writer — service-config 참조**

`skills/common/notion-writer/SKILL.md`에서:

```markdown
# AS-IS
1. service-config 스킬에서 현재 서비스의 정책서/설계서 페이지 ID 조회

# TO-BE
1. skills/setting/service-config 스킬에서 현재 서비스의 정책서/설계서 페이지 ID 조회
```

또한 QA 보드 저장 섹션에서:

```markdown
# AS-IS
1. service-config에서 현재 서비스의 qa 페이지 ID 조회

# TO-BE
1. skills/setting/service-config에서 현재 서비스의 qa 페이지 ID 조회
```

- [ ] **Step 8: service-config — /dev-init 참조**

`skills/setting/service-config/SKILL.md`에서:

```markdown
# AS-IS
`/dev-init` 스킬이 생성하는 개인 설정 파일.

# TO-BE
`/setting/dev-init` 스킬이 생성하는 개인 설정 파일.
```

- [ ] **Step 9: 커밋**

```bash
git add skills/planning/spec-review/SKILL.md \
       skills/development/implement/SKILL.md \
       skills/development/code-review/SKILL.md \
       skills/development/bug-fix/SKILL.md \
       skills/testing/tdd-guide/SKILL.md \
       skills/common/notion-writer/SKILL.md \
       skills/setting/service-config/SKILL.md
git commit -m "refactor: update all remaining skill cross-references to category paths"
```

---

### Task 7: 카테고리 README.md 생성

**Files:**
- Create: `skills/setting/README.md`
- Create: `skills/planning/README.md`
- Create: `skills/blueprint/README.md`
- Create: `skills/development/README.md`
- Create: `skills/testing/README.md`
- Create: `skills/common/README.md`

- [ ] **Step 1: setting/README.md 생성**

```markdown
# Setting (세팅)

프로젝트 초기 설정 및 파이프라인 관리.

## 스킬 목록

| 스킬 | 설명 |
|------|------|
| dev | /dev 파이프라인 메인 진입점. 산출물 검증 → 단계 메뉴 → 스킬 라우팅 |
| dev-init | 서비스/플랫폼/작업자 설정 및 Notion MCP 연결 검증 |
| service-config | 서비스별 Notion 페이지 ID 매핑 및 작업번호 접두사 정의 |

## 실행 순서

```
dev-init → service-config → dev
```
```

- [ ] **Step 2: planning/README.md 생성**

```markdown
# Planning (기획)

기획 산출물 검토 및 피드백 생성.

## 스킬 목록

| 스킬 | 설명 |
|------|------|
| spec-review | 기획서 PDF를 4가지 관점으로 검토 (화면 흐름, 상태 정의, 엣지 케이스, 인터랙션) |
| feedback-generator | 검토 결과를 다크 에디토리얼 스타일 HTML/PDF로 변환 |

## 실행 순서

```
spec-review → feedback-generator
```
```

- [ ] **Step 3: blueprint/README.md 생성**

```markdown
# Blueprint (설계)

UI/데이터 흐름 설계 및 플랫폼 공통 기술 명세 작성.

## 스킬 목록

| 스킬 | 설명 |
|------|------|
| ui-flow | 기획서 기반 화면 전환 Mermaid 상태 다이어그램 작성 |
| data-flow | 기획서 기반 API/데이터 모델 Mermaid 시퀀스 다이어그램 작성 |
| tech-spec | UI/데이터 흐름도를 종합한 플랫폼 공통 기술 설계 |

## 실행 순서

```
ui-flow, data-flow → tech-spec
```
```

- [ ] **Step 4: development/README.md 생성**

```markdown
# Development (개발)

프로덕션 코드 구현, 리뷰, 버그 수정.

## 스킬 목록

| 스킬 | 설명 |
|------|------|
| implement | 설계 + 테스트 기반 플랫폼별 코드 작성 |
| code-review | 공통 설계/CLAUDE.md 기준 4가지 관점 코드 리뷰 |
| bug-fix | 대화형 버그 분석 → 범위 판단 → TDD 수정 또는 리포트 |

## 실행 순서

```
implement → code-review
bug-fix → code-review
```
```

- [ ] **Step 5: testing/README.md 생성**

```markdown
# Testing (테스트)

테스트 케이스 생성 및 QA 시나리오 관리.

## 스킬 목록

| 스킬 | 설명 |
|------|------|
| tdd-guide | 설계 기반 테스트 케이스 도출, Red-Green-Refactor 사이클 가이드 |
| qa-scenario | 기획서/설계/코드 기반 3단계 QA 테스트 매트릭스 생성 |

## 실행 순서

```
tdd-guide (개발 전) → qa-scenario (개발 후)
```
```

- [ ] **Step 6: common/README.md 생성**

```markdown
# Common (공통)

전 단계에서 공통으로 사용하는 인프라 스킬.

## 스킬 목록

| 스킬 | 설명 |
|------|------|
| notion-writer | 모든 Notion 읽기/쓰기 공통 인터페이스. 서브페이지 생성/업데이트, 산출물 완료 확인 |
```

- [ ] **Step 7: 커밋**

```bash
git add skills/setting/README.md \
       skills/planning/README.md \
       skills/blueprint/README.md \
       skills/development/README.md \
       skills/testing/README.md \
       skills/common/README.md
git commit -m "docs: add category README.md for each skill group"
```

---

### Task 8: notion-writer 내부의 "공통 설계" 서브페이지 제목 참조 확인

**Files:**
- Modify: `skills/common/notion-writer/SKILL.md`

notion-writer의 서브페이지 완료 여부 확인 테이블에서 "공통 설계"라는 서브페이지 제목이 있다. 이것은 Notion 페이지 제목이므로 스킬 이름 변경과 무관하게 유지해야 할 수도 있지만, 확인이 필요하다.

- [ ] **Step 1: Notion 서브페이지 제목 확인 및 판단**

`skills/common/notion-writer/SKILL.md`의 서브페이지 완료 여부 확인 테이블:

```markdown
| 4/5. 공통 설계 | 공통 설계 | 정책서/설계서 페이지 > 작업번호 |
```

이것은 Notion 페이지 제목이다. 스킬 이름은 `tech-spec`으로 변경했지만, Notion 서브페이지 제목도 일관성을 위해 변경한다:

```markdown
# AS-IS
| 4/5. 공통 설계 | 공통 설계 | 정책서/설계서 페이지 > 작업번호 |

# TO-BE
| 4/5. 기술 설계 | 기술 설계 | 정책서/설계서 페이지 > 작업번호 |
```

- [ ] **Step 2: tech-spec SKILL.md에서 Notion 서브페이지 제목도 변경**

`skills/blueprint/tech-spec/SKILL.md`에서:

```markdown
# AS-IS
**"공통 설계"** 서브페이지를 생성한다.

# TO-BE
**"기술 설계"** 서브페이지를 생성한다.
```

- [ ] **Step 3: 다른 스킬에서 "공통 설계" 서브페이지 제목 참조 변경**

tdd-guide, code-review, implement, qa-scenario에서 Notion "공통 설계" 서브페이지를 읽는 참조가 있다:

`skills/testing/tdd-guide/SKILL.md`:
```markdown
# AS-IS
"공통 설계" 서브페이지를 읽는다

# TO-BE
"기술 설계" 서브페이지를 읽는다
```

`skills/development/code-review/SKILL.md`:
```markdown
# AS-IS
"공통 설계" 서브페이지를 읽는다

# TO-BE
"기술 설계" 서브페이지를 읽는다
```

`skills/testing/qa-scenario/SKILL.md`:
```markdown
# AS-IS
"공통 설계" 서브페이지를 읽는다

# TO-BE
"기술 설계" 서브페이지를 읽는다
```

- [ ] **Step 4: 커밋**

```bash
git add skills/common/notion-writer/SKILL.md \
       skills/blueprint/tech-spec/SKILL.md \
       skills/testing/tdd-guide/SKILL.md \
       skills/development/code-review/SKILL.md \
       skills/testing/qa-scenario/SKILL.md
git commit -m "refactor: rename Notion subpage title from 공통 설계 to 기술 설계"
```

---

### Task 9: 최종 검증

- [ ] **Step 1: 디렉토리 구조 확인**

```bash
find skills/ -type f -name "*.md" | sort
```

Expected: 6개 카테고리 하위에 14개 SKILL.md + 6개 README.md = 20개 파일

- [ ] **Step 2: 잔존 참조 검색 — 경로 없는 스킬 이름 참조가 남아있는지 확인**

```bash
# notion-writer가 skills/common/notion-writer로 변경되었는지
grep -r "notion-writer" skills/ --include="*.md" | grep -v "skills/common/notion-writer"

# common-design이 tech-spec으로 변경되었는지
grep -r "common-design" skills/ --include="*.md"

# service-config가 skills/setting/service-config로 변경되었는지
grep -r "service-config" skills/ --include="*.md" | grep -v "skills/setting/service-config"
```

Expected: 각 grep에서 매칭 없음 (README의 스킬 목록 테이블 제외)

- [ ] **Step 3: evals 잔존 확인**

```bash
find skills/ -name "evals" -type d
```

Expected: 출력 없음

- [ ] **Step 4: .DS_Store 정리**

```bash
find skills/ -name ".DS_Store" -delete
```

- [ ] **Step 5: 최종 커밋 (필요 시)**

정리 사항이 있으면:

```bash
git add -A skills/
git commit -m "chore: final cleanup after skill categorization"
```
