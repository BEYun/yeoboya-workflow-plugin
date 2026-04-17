---
name: dev
model: claude-sonnet-4-6
description: /dev 개발 파이프라인 — 기획서 검토부터 QA 시나리오까지 전체 개발 워크플로우를 자동화하는 메인 진입점. 작업번호 기반으로 산출물 완료 상태를 자동 검증하고, 선행조건을 체크하여 단계별 스킬을 라우팅한다. "/dev", "개발 파이프라인", "작업 시작"
argument-hint: [작업번호] (선택)
---

# dev

/dev 파이프라인의 메인 진입점. 설정 확인 → 작업번호 입력 → 산출물 자동 검증 → 단계 메뉴 → 스킬 라우팅까지의 전체 흐름을 관리한다.

---

## 1. 설정 확인

`.claude/dev-config.json` 존재 여부를 확인한다.

**없으면:**
```
'/setting/dev-init'을 먼저 실행하여 초기 설정을 완료해주세요.
```
여기서 종료.

**있으면:** service, platform, worker 값을 읽는다.

---

## 2. 진입 메시지 및 작업번호

```
[서비스] / [플랫폼] / [작업자] 님으로 진행합니다.

작업번호를 입력해주세요. (예: DCL-1351)
```

argument로 작업번호가 전달된 경우 질문을 생략한다.
작업번호 형식: 영문대문자-숫자 (예: `DCL-1351`, `YBY-42`)

작업번호는 이후 모든 스킬에 컨텍스트로 전달한다.

### 상태 파일 초기화

작업번호 입력 후:

1. `.claude/active-task` 파일을 입력된 작업번호로 갱신 (atomic write).
2. `.dev-work/<작업번호>/` 디렉토리가 없으면 생성.
3. `.dev-work/<작업번호>/state.json`이 없으면 아래 초기 구조로 생성:
   ```json
   {
     "task": "<작업번호>",
     "activeStage": null,
     "activeSkill": null,
     "stages": {
       "1": { "produced": false, "validated": false, "artifactPageId": null },
       "2": { "produced": false, "validated": false, "artifactPageId": null },
       "3": { "produced": false, "validated": false, "artifactPageId": null },
       "7": { "produced": false, "validated": false, "artifactPageId": null }
     },
     "lastUpdated": "<ISO 타임스탬프>"
   }
   ```
4. 이미 존재하면 그대로 로드(작업 재개). 기존 state를 덮어쓰지 않는다.

---

## 3. 산출물 기반 자동 검증

작업번호 입력 후 **모든 단계의 완료 상태**를 한번에 확인한다.

### Notion 검증 (skills/common/notion-writer 스킬 사용)

작업번호 페이지 하위 서브페이지 존재 여부로 확인:

| 단계 | 확인할 서브페이지 |
|------|-----------------|
| 1. 기획서 검토 | "기획서 검토" (정책서/설계서 페이지 > 작업번호) |
| 2. UI 흐름도 | "UI 흐름도" (정책서/설계서 페이지 > 작업번호) |
| 3. 데이터 흐름도 | "데이터 흐름도" (정책서/설계서 페이지 > 작업번호) |
| 7. 테스트 시나리오 | "QA 시트" (QA 보드 페이지 > 작업번호) |

### state.json 우선 조회

Notion 조회 전에 `.dev-work/<작업번호>/state.json`의 `stages[n].validated`를 먼저 읽는다:

- `validated=true` → ✓ 완료로 간주, Notion 재조회 생략
- `validated=false` 이지만 `produced=true` → 이전 검증 실패 또는 재작업 대기. ⚠로 표시
- `validated=false` 이고 `produced=false` → 미완료로 표시
- `validated=null` → "검증 불가(수동 확인됨)" 상태로 ⚠ 표시

state.json에 없는 작업번호이거나 파일 손상 시, 기존 Notion 서브페이지 존재 조회로 fallback.

### Git 검증

```bash
git log --grep='\[작업번호\]'
```

커밋이 존재하면 개발 단계(4/5/6) 완료로 판단.

---

## 4. 단계 메뉴 표시

검증 결과를 반영하여 메뉴를 표시한다:

```
── 기획 단계 ──
✓ 1. 기획서 검토
✓ 2. UI 흐름도 작성
  3. 데이터 흐름도 작성

── 개발 단계 ──
  4. 기능 신규 개발
  5. 기능 변경 및 고도화
  6. 버그 수정

── 테스트 단계 ──
  7. 테스트 시나리오 작성 (QA용)

번호를 선택하세요.
```

상태 표시:
- `✓` — 완료
- `⚠` — 확인 필요 (재작업으로 후행 단계 영향)
- (빈칸) — 미완료

---

## 5. 선행조건 체인

| 선택 | 선행조건 |
|------|---------|
| 1 | 없음 |
| 2 | 1번 완료 |
| 3 | 1번 완료 |
| 4 | 1, 2, 3번 완료 |
| 5 | 1, 2, 3번 완료 |
| 6 | 1번 완료 (긴급 시 스킵 가능 — 사용자에게 확인) |
| 7 | 4번 또는 5번 완료 |

미충족 시:
```
"[선택한 단계]를 진행하려면 [미충족 단계 목록]이 완료되어야 합니다.
어떤 단계부터 시작하시겠습니까?"
→ 미완료 단계 목록만 보여준다
```

---

## 6. 재작업 플로우

이미 완료된 단계를 다시 선택한 경우:

```
"[단계명]이 이미 완료되어 있습니다. [산출물명]이 수정되었나요?"
→ "네" → 해당 스킬 재실행
→ "아니요" → 메뉴로 복귀
```

재작업 완료 후 후행 단계에 영향 안내:

```
"[단계명]이 변경되었습니다. 다음 산출물도 업데이트가 필요할 수 있습니다:"
"  - [후행 단계] (✓ 완료 → ⚠ 확인 필요)"
"어떤 단계를 업데이트하시겠습니까?"
```

### 영향 전파 규칙

| 재작업 단계 | ⚠ 확인 필요로 표시되는 단계 |
|------------|--------------------------|
| 1. 기획서 검토 | 2, 3, 4, 5, 7 |
| 2. UI 흐름도 | 4, 5 |
| 3. 데이터 흐름도 | 4, 5 |
| 4/5. 기능 개발/변경 | 7 |

### state.json 반영

재작업이 validate 통과 시, 표의 ⚠ 대상 단계들 중 Notion 단계(1,2,3,7)에 대해 `state.json`의 `stages[n].validated`를 `false`로 되돌린다. 개발 단계(4,5)는 `state.json`에 필드가 없으므로 메뉴 표시에서만 ⚠ 처리.

---

## 7. 스킬 라우팅

| 선택 | 호출 스킬 |
|------|----------|
| 1 | `skills/planning/spec-review` |
| 2 | `skills/blueprint/ui-flow` |
| 3 | `skills/blueprint/data-flow` |
| 4 | `skills/blueprint/tech-spec` → `skills/development/code-write` → `skills/development/code-review` (순차 실행) |
| 5 | `skills/blueprint/tech-spec` (변경 모드) → `skills/development/code-write` → `skills/development/code-review` (순차 실행) |
| 6 | `skills/development/bug-fix` (내부에서 skills/development/code-review 호출) |
| 7 | `skills/testing/qa-scenario` |

4번과 5번은 4개 스킬을 순차 실행한다. 각 스킬이 완료된 후 다음으로 자동 진행한다.

### 라우팅 직전 상태 기록

선택된 단계에 대해 `.dev-work/<작업번호>/state.json`을 아래처럼 갱신:

- `activeStage` = 선택된 단계 번호
- `activeSkill` = 라우팅 대상 스킬 경로 (4/5번처럼 다중이면 첫 스킬)

이 기록이 있어야 `hooks/stage-guard.js`가 해당 단계의 Notion 쓰기를 허용한다.

### 라우팅 직후 자동 검증

생성 스킬이 완료되면 단계별로 아래 자동 조치:

- 1번: `skills/common/validate` 를 `stage=1`로 호출
- 2번: `skills/common/validate` 를 `stage=2`로 호출
- 3번: `skills/common/validate` 를 `stage=3`로 호출
- 4/5번: 개발 단계. code-review 완료 후 state 정리만(검증 스킬 호출 안 함). 경고 리포트 출력:
  - `git log --grep='[작업번호]'` 결과
  - 변경 파일에 테스트 파일 포함 여부
  - code-review 산출물 존재 여부
  하나라도 없으면 `[작업번호] [단계]단계 검증 경고: ...` 콘솔 출력.
- 6번: 4/5와 동일한 경고 리포트
- 7번: `skills/common/validate` 를 `stage=7`로 호출

검증 결과에 따라 `state.json`의 `stages[n].validated`가 갱신된다. 어떤 경로로든 완료 후 `activeStage` / `activeSkill`을 `null`로 초기화.

각 스킬에 전달해야 하는 컨텍스트:
- **작업번호** — 모든 스킬에 전달
- **서비스/플랫폼/작업자** — dev-config.json에서 읽은 값
- **신규/변경 구분** — 4번이면 신규, 5번이면 변경 (skills/blueprint/tech-spec에 전달)

### artifactPageId 캐싱

validate 스킬이 notion-writer로 산출물 페이지를 찾을 때 page_id를 알아내므로, validate가 이 값을 `state.json`의 `stages[n].artifactPageId`에 기록하도록 내부적으로 위임한다. `/dev`는 이 필드를 직접 관리하지 않는다.

---

## 8. 단계 완료 후

```
"[단계명] 완료!
다른 단계를 진행하시겠습니까?"
→ "네" → 산출물 검증 갱신 후 메뉴로 복귀
→ "아니요" → 종료
```
