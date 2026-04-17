# 단계별 모델 라우팅 설계

**날짜:** 2026-04-17
**작성자:** BEYun

---

## 목표

/dev 파이프라인의 각 단계(스킬)에 최적의 Claude 모델을 배정한다.
설계 단계는 Opus, 코드 개발은 Sonnet, 문서 생성은 Haiku를 사용하여 품질과 비용을 동시에 최적화한다.

---

## 구현 방식

각 SKILL.md의 frontmatter에 `model:` 필드를 추가한다.
Claude Code 플러그인 시스템이 스킬 호출 시 해당 모델로 자동 전환한다.

```yaml
---
name: tech-spec
model: claude-opus-4-7
description: ...
---
```

/dev 코드나 hooks 변경 없이 스킬 파일 수정만으로 완성된다.

---

## 모델 매핑

### 설계 → `claude-opus-4-7`

복잡한 추론과 기획 해석이 필요한 단계.

| 스킬 파일 | 단계 |
|----------|------|
| `skills/planning/spec-review/SKILL.md` | 1. 기획서 검토 |
| `skills/blueprint/ui-flow/SKILL.md` | 2. UI 흐름도 |
| `skills/blueprint/data-flow/SKILL.md` | 3. 데이터 흐름도 |
| `skills/blueprint/tech-spec/SKILL.md` | 4/5. 기술 설계 |

### 코드 개발 → `claude-sonnet-4-6`

코드 작성·리뷰·버그 수정 및 파이프라인 오케스트레이션.

| 스킬 파일 | 단계 |
|----------|------|
| `skills/development/code-write/SKILL.md` | 4/5. 코드 작성 |
| `skills/development/code-review/SKILL.md` | 4/5/6. 코드 리뷰 |
| `skills/development/bug-fix/SKILL.md` | 6. 버그 수정 |
| `skills/setting/dev/SKILL.md` | 오케스트레이터 |
| `skills/setting/dev-init/SKILL.md`* | 초기 설정 |
| `skills/setting/service-config/SKILL.md`* | 서비스 설정 |

> *dev-init, service-config는 단순 설정이나 Haiku보다 Sonnet이 더 안정적으로 판단.

### 문서 생성 → `claude-haiku-4-5-20251001`

구조화된 출력·Notion 쓰기·검증 등 단순 반복 작업.

| 스킬 파일 | 단계 |
|----------|------|
| `skills/testing/qa-scenario/SKILL.md` | 7. QA 시나리오 |
| `skills/common/notion-writer/SKILL.md` | 공통: Notion 저장 |
| `skills/common/validate/SKILL.md` | 공통: 산출물 검증 |

---

## 변경 범위

- **변경 파일:** 13개 SKILL.md
- **변경 내용:** 각 파일 frontmatter에 `model: <model-id>` 한 줄 추가
- **변경 없음:** /dev 오케스트레이터 로직, hooks, state.json 구조

---

## 고려 사항

- `notion-writer`는 여러 단계에서 호출되지만 Notion API 쓰기가 주 역할이므로 Haiku로 충분하다.
- `validate`는 Notion 블록 내용을 패턴 매칭으로 검증하는 단순 작업이므로 Haiku로 충분하다.
- 모델 ID는 현재 시점(2026-04) 기준이며, 새 모델 출시 시 frontmatter만 업데이트하면 된다.
