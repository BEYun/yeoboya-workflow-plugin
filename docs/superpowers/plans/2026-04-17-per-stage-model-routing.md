# Per-Stage Model Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 각 SKILL.md frontmatter에 `model:` 필드를 추가하여 /dev 파이프라인 단계별로 다른 Claude 모델을 사용한다.

**Architecture:** Claude Code 플러그인 시스템이 스킬 호출 시 frontmatter의 `model:` 필드를 읽어 해당 모델로 자동 전환한다. /dev 오케스트레이터나 hooks 변경 없이 SKILL.md 파일 13개에 한 줄씩 추가하는 것으로 완성된다.

**Tech Stack:** YAML frontmatter (SKILL.md), Claude Code plugin model routing

---

## File Structure

| 파일 | 변경 내용 | 배정 모델 |
|------|----------|---------|
| `skills/planning/spec-review/SKILL.md` | frontmatter에 `model:` 추가 | `claude-opus-4-7` |
| `skills/blueprint/ui-flow/SKILL.md` | frontmatter에 `model:` 추가 | `claude-opus-4-7` |
| `skills/blueprint/data-flow/SKILL.md` | frontmatter에 `model:` 추가 | `claude-opus-4-7` |
| `skills/blueprint/tech-spec/SKILL.md` | frontmatter에 `model:` 추가 | `claude-opus-4-7` |
| `skills/development/code-write/SKILL.md` | frontmatter에 `model:` 추가 | `claude-sonnet-4-6` |
| `skills/development/code-review/SKILL.md` | frontmatter에 `model:` 추가 | `claude-sonnet-4-6` |
| `skills/development/bug-fix/SKILL.md` | frontmatter에 `model:` 추가 | `claude-sonnet-4-6` |
| `skills/setting/dev/SKILL.md` | frontmatter에 `model:` 추가 | `claude-sonnet-4-6` |
| `skills/setting/dev-init/SKILL.md` | frontmatter에 `model:` 추가 | `claude-sonnet-4-6` |
| `skills/setting/service-config/SKILL.md` | frontmatter에 `model:` 추가 | `claude-sonnet-4-6` |
| `skills/testing/qa-scenario/SKILL.md` | frontmatter에 `model:` 추가 | `claude-haiku-4-5-20251001` |
| `skills/common/notion-writer/SKILL.md` | frontmatter에 `model:` 추가 | `claude-haiku-4-5-20251001` |
| `skills/common/validate/SKILL.md` | frontmatter에 `model:` 추가 | `claude-haiku-4-5-20251001` |

---

## Task 1: Opus 모델 배정 — 설계 스킬 4개

**Files:**
- Modify: `skills/planning/spec-review/SKILL.md:1-5`
- Modify: `skills/blueprint/ui-flow/SKILL.md:1-5`
- Modify: `skills/blueprint/data-flow/SKILL.md:1-5`
- Modify: `skills/blueprint/tech-spec/SKILL.md:1-5`

- [ ] **Step 1: spec-review frontmatter에 model 추가**

`skills/planning/spec-review/SKILL.md` 의 frontmatter를:

```yaml
---
name: spec-review
description: 기획서 PDF를 4가지 관점(화면 흐름, 상태 정의, 엣지 케이스, 인터랙션)으로 검토하고 피드백 문서를 생성할 때 사용. 기획서를 받으면 반드시 이 스킬로 검토해야 한다. "기획서 검토", "spec review", "PDF 검토", "기획서 분석"
version: 0.2.0
---
```

아래로 수정:

```yaml
---
name: spec-review
model: claude-opus-4-7
description: 기획서 PDF를 4가지 관점(화면 흐름, 상태 정의, 엣지 케이스, 인터랙션)으로 검토하고 피드백 문서를 생성할 때 사용. 기획서를 받으면 반드시 이 스킬로 검토해야 한다. "기획서 검토", "spec review", "PDF 검토", "기획서 분석"
version: 0.2.0
---
```

- [ ] **Step 2: ui-flow frontmatter에 model 추가**

`skills/blueprint/ui-flow/SKILL.md` 의 frontmatter를:

```yaml
---
name: ui-flow
description: 기획서를 기반으로 UI 흐름도를 Mermaid 다이어그램으로 작성하고 Notion에 저장할 때 사용. 화면 간 전환 관계, 엣지 케이스 분기, 상태별 화면을 정리한다. "UI 흐름도", "화면 흐름", "UI flow", "화면 전환"
version: 0.1.0
---
```

아래로 수정:

```yaml
---
name: ui-flow
model: claude-opus-4-7
description: 기획서를 기반으로 UI 흐름도를 Mermaid 다이어그램으로 작성하고 Notion에 저장할 때 사용. 화면 간 전환 관계, 엣지 케이스 분기, 상태별 화면을 정리한다. "UI 흐름도", "화면 흐름", "UI flow", "화면 전환"
version: 0.1.0
---
```

- [ ] **Step 3: data-flow frontmatter에 model 추가**

`skills/blueprint/data-flow/SKILL.md` 의 frontmatter를:

```yaml
---
name: data-flow
description: 기획서를 기반으로 데이터 흐름도를 Mermaid 시퀀스 다이어그램으로 작성하고 Notion에 저장할 때 사용. 데이터 모델, API 엔드포인트, 파트별 책임을 정리한다. "데이터 흐름도", "data flow", "API 설계", "데이터 모델"
version: 0.1.0
---
```

아래로 수정:

```yaml
---
name: data-flow
model: claude-opus-4-7
description: 기획서를 기반으로 데이터 흐름도를 Mermaid 시퀀스 다이어그램으로 작성하고 Notion에 저장할 때 사용. 데이터 모델, API 엔드포인트, 파트별 책임을 정리한다. "데이터 흐름도", "data flow", "API 설계", "데이터 모델"
version: 0.1.0
---
```

- [ ] **Step 4: tech-spec frontmatter에 model 추가**

`skills/blueprint/tech-spec/SKILL.md` 의 frontmatter를:

```yaml
---
name: tech-spec
description: 플랫폼 공통 기술 설계를 작성할 때 사용. UI 흐름도와 데이터 흐름도를 기반으로 화면 구조, 데이터 모델, 상태 관리, API 연동, 비즈니스 로직, 엣지 케이스를 플랫폼 무관하게 설계한다. 신규 개발과 기능 변경 두 가지 모드를 지원한다. "기술 설계", "tech spec", "설계 작성", "플랫폼 공통"
version: 0.1.0
---
```

아래로 수정:

```yaml
---
name: tech-spec
model: claude-opus-4-7
description: 플랫폼 공통 기술 설계를 작성할 때 사용. UI 흐름도와 데이터 흐름도를 기반으로 화면 구조, 데이터 모델, 상태 관리, API 연동, 비즈니스 로직, 엣지 케이스를 플랫폼 무관하게 설계한다. 신규 개발과 기능 변경 두 가지 모드를 지원한다. "기술 설계", "tech spec", "설계 작성", "플랫폼 공통"
version: 0.1.0
---
```

- [ ] **Step 5: 4개 파일 변경사항 확인**

Run:
```bash
grep -n "model:" skills/planning/spec-review/SKILL.md skills/blueprint/ui-flow/SKILL.md skills/blueprint/data-flow/SKILL.md skills/blueprint/tech-spec/SKILL.md
```

Expected:
```
skills/planning/spec-review/SKILL.md:3:model: claude-opus-4-7
skills/blueprint/ui-flow/SKILL.md:3:model: claude-opus-4-7
skills/blueprint/data-flow/SKILL.md:3:model: claude-opus-4-7
skills/blueprint/tech-spec/SKILL.md:3:model: claude-opus-4-7
```

- [ ] **Step 6: Commit**

```bash
git add skills/planning/spec-review/SKILL.md skills/blueprint/ui-flow/SKILL.md skills/blueprint/data-flow/SKILL.md skills/blueprint/tech-spec/SKILL.md
git commit -m "feat(skills): assign claude-opus-4-7 to design stage skills"
```

---

## Task 2: Sonnet 모델 배정 — 코드 개발 및 오케스트레이터 스킬 6개

**Files:**
- Modify: `skills/development/code-write/SKILL.md:1-5`
- Modify: `skills/development/code-review/SKILL.md:1-5`
- Modify: `skills/development/bug-fix/SKILL.md:1-5`
- Modify: `skills/setting/dev/SKILL.md:1-5`
- Modify: `skills/setting/dev-init/SKILL.md:1-5`
- Modify: `skills/setting/service-config/SKILL.md:1-5`

- [ ] **Step 1: code-write frontmatter에 model 추가**

`skills/development/code-write/SKILL.md` 의 frontmatter를:

```yaml
---
name: code-write
description: 확정된 blueprint를 기반으로 플랫폼별 코드를 작성할 때 사용. superpowers의 brainstorming → writing-plans → test-driven-development 체인을 필수 선행으로 수행하고, 프로젝트 CLAUDE.md의 아키텍처와 컨벤션을 따른다. 작성 완료 후 code-review 스킬을 트리거한다. "코드 작성", "개발", "플랫폼 구현", "code-write"
version: 0.1.0
---
```

아래로 수정:

```yaml
---
name: code-write
model: claude-sonnet-4-6
description: 확정된 blueprint를 기반으로 플랫폼별 코드를 작성할 때 사용. superpowers의 brainstorming → writing-plans → test-driven-development 체인을 필수 선행으로 수행하고, 프로젝트 CLAUDE.md의 아키텍처와 컨벤션을 따른다. 작성 완료 후 code-review 스킬을 트리거한다. "코드 작성", "개발", "플랫폼 구현", "code-write"
version: 0.1.0
---
```

- [ ] **Step 2: code-review frontmatter에 model 추가**

`skills/development/code-review/SKILL.md` 의 frontmatter를:

```yaml
---
name: code-review
description: 구현된 코드를 공통 설계 및 CLAUDE.md 기반으로 4가지 관점에서 리뷰할 때 사용. Claude가 1차 리뷰 후 사용자가 최종 확인한다. superpowers:requesting-code-review 스킬을 활용한다. "코드리뷰", "code review", "리뷰 요청"
version: 0.1.0
---
```

아래로 수정:

```yaml
---
name: code-review
model: claude-sonnet-4-6
description: 구현된 코드를 공통 설계 및 CLAUDE.md 기반으로 4가지 관점에서 리뷰할 때 사용. Claude가 1차 리뷰 후 사용자가 최종 확인한다. superpowers:requesting-code-review 스킬을 활용한다. "코드리뷰", "code review", "리뷰 요청"
version: 0.1.0
---
```

- [ ] **Step 3: bug-fix frontmatter에 model 추가**

`skills/development/bug-fix/SKILL.md` 의 frontmatter를:

```yaml
---
name: bug-fix
description: 버그를 대화형으로 분석하고 수정할 때 사용. 정보 수집, 유형 분류, 원인 파트 특정 후 범위 내 버그는 TDD로 수정하고 범위 밖 버그는 원인 리포트를 Notion에 저장한다. superpowers:systematic-debugging 스킬을 활용한다. "버그 수정", "bug fix", "버그 분석", "크래시"
version: 0.1.0
---
```

아래로 수정:

```yaml
---
name: bug-fix
model: claude-sonnet-4-6
description: 버그를 대화형으로 분석하고 수정할 때 사용. 정보 수집, 유형 분류, 원인 파트 특정 후 범위 내 버그는 TDD로 수정하고 범위 밖 버그는 원인 리포트를 Notion에 저장한다. superpowers:systematic-debugging 스킬을 활용한다. "버그 수정", "bug fix", "버그 분석", "크래시"
version: 0.1.0
---
```

- [ ] **Step 4: dev frontmatter에 model 추가**

`skills/setting/dev/SKILL.md` 의 frontmatter를:

```yaml
---
name: dev
description: /dev 개발 파이프라인 — 기획서 검토부터 QA 시나리오까지 전체 개발 워크플로우를 자동화하는 메인 진입점. 작업번호 기반으로 산출물 완료 상태를 자동 검증하고, 선행조건을 체크하여 단계별 스킬을 라우팅한다. "/dev", "개발 파이프라인", "작업 시작"
argument-hint: [작업번호] (선택)
---
```

아래로 수정:

```yaml
---
name: dev
model: claude-sonnet-4-6
description: /dev 개발 파이프라인 — 기획서 검토부터 QA 시나리오까지 전체 개발 워크플로우를 자동화하는 메인 진입점. 작업번호 기반으로 산출물 완료 상태를 자동 검증하고, 선행조건을 체크하여 단계별 스킬을 라우팅한다. "/dev", "개발 파이프라인", "작업 시작"
argument-hint: [작업번호] (선택)
---
```

- [ ] **Step 5: dev-init frontmatter에 model 추가**

`skills/setting/dev-init/SKILL.md` 의 frontmatter를:

```yaml
---
name: dev-init
description: /dev 파이프라인 초기 설정. 서비스, 플랫폼, 작업자를 설정하고 Notion MCP 연결을 검증한다. 처음 /dev를 사용하기 전에 반드시 실행해야 한다. "/dev init", "초기 설정", "서비스 설정", "플랫폼 설정"
argument-hint: (인자 없음)
---
```

아래로 수정:

```yaml
---
name: dev-init
model: claude-sonnet-4-6
description: /dev 파이프라인 초기 설정. 서비스, 플랫폼, 작업자를 설정하고 Notion MCP 연결을 검증한다. 처음 /dev를 사용하기 전에 반드시 실행해야 한다. "/dev init", "초기 설정", "서비스 설정", "플랫폼 설정"
argument-hint: (인자 없음)
---
```

- [ ] **Step 6: service-config frontmatter에 model 추가**

`skills/setting/service-config/SKILL.md` 의 frontmatter를:

```yaml
---
name: service-config
description: 서비스별 Notion 페이지 ID 매핑 및 dev-config.json 설정을 조회하는 기반 스킬. 다른 스킬이 서비스 설정, Notion 페이지 ID, 작업번호 접두사, 설정 파일을 필요로 할 때 반드시 이 스킬을 참조해야 한다. "서비스 설정", "Notion 페이지", "dev-config", "서비스 매핑"
version: 0.1.0
---
```

아래로 수정:

```yaml
---
name: service-config
model: claude-sonnet-4-6
description: 서비스별 Notion 페이지 ID 매핑 및 dev-config.json 설정을 조회하는 기반 스킬. 다른 스킬이 서비스 설정, Notion 페이지 ID, 작업번호 접두사, 설정 파일을 필요로 할 때 반드시 이 스킬을 참조해야 한다. "서비스 설정", "Notion 페이지", "dev-config", "서비스 매핑"
version: 0.1.0
---
```

- [ ] **Step 7: 6개 파일 변경사항 확인**

Run:
```bash
grep -n "model:" skills/development/code-write/SKILL.md skills/development/code-review/SKILL.md skills/development/bug-fix/SKILL.md skills/setting/dev/SKILL.md skills/setting/dev-init/SKILL.md skills/setting/service-config/SKILL.md
```

Expected:
```
skills/development/code-write/SKILL.md:3:model: claude-sonnet-4-6
skills/development/code-review/SKILL.md:3:model: claude-sonnet-4-6
skills/development/bug-fix/SKILL.md:3:model: claude-sonnet-4-6
skills/setting/dev/SKILL.md:3:model: claude-sonnet-4-6
skills/setting/dev-init/SKILL.md:3:model: claude-sonnet-4-6
skills/setting/service-config/SKILL.md:3:model: claude-sonnet-4-6
```

- [ ] **Step 8: Commit**

```bash
git add skills/development/code-write/SKILL.md skills/development/code-review/SKILL.md skills/development/bug-fix/SKILL.md skills/setting/dev/SKILL.md skills/setting/dev-init/SKILL.md skills/setting/service-config/SKILL.md
git commit -m "feat(skills): assign claude-sonnet-4-6 to code and orchestrator skills"
```

---

## Task 3: Haiku 모델 배정 — 문서 생성 스킬 3개

**Files:**
- Modify: `skills/testing/qa-scenario/SKILL.md:1-5`
- Modify: `skills/common/notion-writer/SKILL.md:1-5`
- Modify: `skills/common/validate/SKILL.md:1-5`

- [ ] **Step 1: qa-scenario frontmatter에 model 추가**

`skills/testing/qa-scenario/SKILL.md` 의 frontmatter를:

```yaml
---
name: qa-scenario
description: QA용 테스트 시나리오를 기획서, 공통 설계, 구현 코드를 기반으로 작성하고 Notion QA 보드에 저장할 때 사용. 정상/엣지/회귀 3종 테스트 케이스를 도출한다. "QA 시나리오", "테스트 시나리오", "QA 시트", "통합 테스트"
version: 0.1.0
---
```

아래로 수정:

```yaml
---
name: qa-scenario
model: claude-haiku-4-5-20251001
description: QA용 테스트 시나리오를 기획서, 공통 설계, 구현 코드를 기반으로 작성하고 Notion QA 보드에 저장할 때 사용. 정상/엣지/회귀 3종 테스트 케이스를 도출한다. "QA 시나리오", "테스트 시나리오", "QA 시트", "통합 테스트"
version: 0.1.0
---
```

- [ ] **Step 2: notion-writer frontmatter에 model 추가**

`skills/common/notion-writer/SKILL.md` 의 frontmatter를:

```yaml
---
name: notion-writer
description: Notion에 산출물을 읽거나 쓸 때 반드시 사용하는 공통 스킬. 작업번호 페이지 관리, 서브페이지 생성/업데이트, 산출물 완료 여부 확인, QA 보드 저장 등 모든 Notion 작업은 이 스킬의 규칙을 따라야 한다. "Notion", "서브페이지", "산출물 저장", "페이지 생성"
version: 0.1.0
---
```

아래로 수정:

```yaml
---
name: notion-writer
model: claude-haiku-4-5-20251001
description: Notion에 산출물을 읽거나 쓸 때 반드시 사용하는 공통 스킬. 작업번호 페이지 관리, 서브페이지 생성/업데이트, 산출물 완료 여부 확인, QA 보드 저장 등 모든 Notion 작업은 이 스킬의 규칙을 따라야 한다. "Notion", "서브페이지", "산출물 저장", "페이지 생성"
version: 0.1.0
---
```

- [ ] **Step 3: validate frontmatter에 model 추가**

`skills/common/validate/SKILL.md` 의 frontmatter를:

```yaml
---
name: validate
description: 각 워크플로우 단계의 산출물이 기대 구조를 따르는지 자동 검증한다. /dev 파이프라인이 생성 스킬 실행 직후 자동 호출한다. "validate", "검증", "산출물 검증"
argument-hint: <stage> (1 | 2 | 3 | 7)
---
```

아래로 수정:

```yaml
---
name: validate
model: claude-haiku-4-5-20251001
description: 각 워크플로우 단계의 산출물이 기대 구조를 따르는지 자동 검증한다. /dev 파이프라인이 생성 스킬 실행 직후 자동 호출한다. "validate", "검증", "산출물 검증"
argument-hint: <stage> (1 | 2 | 3 | 7)
---
```

- [ ] **Step 4: 3개 파일 변경사항 확인**

Run:
```bash
grep -n "model:" skills/testing/qa-scenario/SKILL.md skills/common/notion-writer/SKILL.md skills/common/validate/SKILL.md
```

Expected:
```
skills/testing/qa-scenario/SKILL.md:3:model: claude-haiku-4-5-20251001
skills/common/notion-writer/SKILL.md:3:model: claude-haiku-4-5-20251001
skills/common/validate/SKILL.md:3:model: claude-haiku-4-5-20251001
```

- [ ] **Step 5: Commit**

```bash
git add skills/testing/qa-scenario/SKILL.md skills/common/notion-writer/SKILL.md skills/common/validate/SKILL.md
git commit -m "feat(skills): assign claude-haiku-4-5-20251001 to document generation skills"
```

---

## Task 4: 전체 검증

- [ ] **Step 1: 13개 파일 전체 model 필드 확인**

Run:
```bash
grep -rn "model:" skills/
```

Expected (순서는 다를 수 있음):
```
skills/planning/spec-review/SKILL.md:3:model: claude-opus-4-7
skills/blueprint/ui-flow/SKILL.md:3:model: claude-opus-4-7
skills/blueprint/data-flow/SKILL.md:3:model: claude-opus-4-7
skills/blueprint/tech-spec/SKILL.md:3:model: claude-opus-4-7
skills/development/code-write/SKILL.md:3:model: claude-sonnet-4-6
skills/development/code-review/SKILL.md:3:model: claude-sonnet-4-6
skills/development/bug-fix/SKILL.md:3:model: claude-sonnet-4-6
skills/setting/dev/SKILL.md:3:model: claude-sonnet-4-6
skills/setting/dev-init/SKILL.md:3:model: claude-sonnet-4-6
skills/setting/service-config/SKILL.md:3:model: claude-sonnet-4-6
skills/testing/qa-scenario/SKILL.md:3:model: claude-haiku-4-5-20251001
skills/common/notion-writer/SKILL.md:3:model: claude-haiku-4-5-20251001
skills/common/validate/SKILL.md:3:model: claude-haiku-4-5-20251001
```

총 13줄이 나와야 한다. 그 외 파일에 `model:` 필드가 없어야 한다.

- [ ] **Step 2: model 필드가 frontmatter 내부에 있는지 확인**

Run:
```bash
for f in skills/planning/spec-review/SKILL.md skills/blueprint/ui-flow/SKILL.md skills/blueprint/data-flow/SKILL.md skills/blueprint/tech-spec/SKILL.md skills/development/code-write/SKILL.md skills/development/code-review/SKILL.md skills/development/bug-fix/SKILL.md skills/setting/dev/SKILL.md skills/setting/dev-init/SKILL.md skills/setting/service-config/SKILL.md skills/testing/qa-scenario/SKILL.md skills/common/notion-writer/SKILL.md skills/common/validate/SKILL.md; do echo "=== $f ==="; head -6 "$f"; done
```

각 파일의 첫 6줄에서 `---` 사이에 `model:` 필드가 있어야 한다.
