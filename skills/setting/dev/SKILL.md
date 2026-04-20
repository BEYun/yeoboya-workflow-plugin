---
name: dev
model: claude-sonnet-4-6
description: /dev 개발 파이프라인 — 작업 정의부터 QA 시나리오까지 전체 개발 워크플로우를 계층 메뉴로 라우팅하는 메인 진입점. 작업번호 단위로 state.json을 관리하고 workType에 따라 스텝을 필터링한다. "/dev", "개발 파이프라인", "작업 시작"
argument-hint: [작업번호] (선택)
---

# dev

/dev 파이프라인의 메인 진입점. 설정 확인 → 작업번호 입력 → workType 확보 → 계층 메뉴 → 스킬 라우팅 → 사후 validate의 흐름만 수행하는 **얇은 라우터**이다. 도메인 로직은 각 스킬이 소유한다.

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

## 2. 작업번호 확보

```
[서비스] / [플랫폼] / [작업자] 님으로 진행합니다.

작업번호를 입력해주세요. (예: DCL-1351)
```

argument로 작업번호가 전달된 경우 질문을 생략한다. 형식: 영문대문자-숫자.

### state.json 초기화 (신 스키마만 지원)

1. `.claude/active-task`를 입력값으로 원자적 갱신
2. `.dev-work/<작업번호>/` 없으면 생성
3. `state.json`이 없으면 `hooks/lib/state.js`의 `newEmptyState(task)` 구조로 생성
4. 이미 있으면 그대로 로드 (기존 state 덮어쓰지 않음)

---

## 3. workType 확보

`state.workType`이 `null`이면 곧바로 `skills/planning/work-define` 스킬을 호출하여 workType을 채운다. 완료 후 state를 다시 로드하여 이어서 진행.

`state.workType`이 이미 설정되어 있으면 이 단계 스킵.

---

## 4. 완료 상태 조회

Notion 산출물 스텝(`2.1, 2.2, 3.1, 3.2, 3.3, 5.1`)은 다음 순서로 상태를 판정:

1. `state.stages["N.M"].validated === true` → ✓ 완료
2. `validated === false && done === true` → ⚠ (이전 검증 실패 또는 재작업 대기)
3. `validated === false && done === false` → 미완료
4. `validated === null` → ⚠ (수동 확인됨, 검증 불가)

메타/개발/판정 스텝(`1.1, 4.1, 4.2, 4.3`)은 `done` 필드만으로 판정:
- `done === true` → ✓
- `done === false` → 미완료

### Git 사후 지표 (4.2/4.3 경고 리포트에만 사용)

`git log --grep='\[작업번호\]'` 커밋 유무는 메뉴 상태 판정에는 쓰지 않고, 사후 처리의 경고 리포트에서만 참조한다.

---

## 5. workType 기반 메뉴 필터

숨김 규칙:

| workType  | 숨기는 스텝                          |
| --------- | ------------------------------------ |
| `new`     | (없음)                               |
| `change`  | (없음)                               |
| `bugfix`  | `2.2`, `3.1`, `3.2`, `3.3`, `4.1`    |

숨긴 스텝은 선행조건 검사에서 "자동 충족"으로 간주한다.

---

## 6. 메뉴 표시

```
[<작업번호> · <workType 한글 라벨>]

── 1. 작업 정의 ──
✓ 1.1 작업 종류 선택

── 2. 기획 검토 ──
  2.1 기획서 검토
  2.2 최종 기획서 확인           ← bugfix면 표시 안 함

── 3. 설계 ──                    ← bugfix면 대분류 전체 숨김
  3.1 UI 흐름도
  3.2 데이터 흐름도
  3.3 tech-spec (기술 설계)

── 4. 개발 ──
  4.1 디자인 작업 유무 확인      ← bugfix면 표시 안 함
  4.2 코드 작성                  ← bugfix면 "4.2 버그 수정"으로 라벨 변경
  4.3 코드 리뷰

── 5. 테스트 ──
  5.1 QA 시나리오

번호를 선택하세요 (예: 3.1)
```

상태 마커: `✓` 완료, `⚠` 확인 필요, (빈칸) 미완료.

---

## 7. 선행조건

숨김 스텝은 자동 충족. 아래 표 중 "숨김"이 된 경우 다음 visible 스텝에서 해당 선행이 우회된다.

| 스텝 | 선행      |
| ---- | --------- |
| 1.1  | 없음      |
| 2.1  | 1.1       |
| 2.2  | 2.1       |
| 3.1  | 2.2       |
| 3.2  | 2.2       |
| 3.3  | 3.1, 3.2  |
| 4.1  | 3.3       |
| 4.2  | 4.1       |
| 4.3  | 4.2       |
| 5.1  | 4.3       |

선행 미충족 시:
```
[선택한 스텝]을 진행하려면 [미충족 스텝 목록]이 완료되어야 합니다.
어떤 단계부터 시작하시겠습니까?
→ 미완료 스텝 목록만 표시
```

---

## 8. 재작업 영향 전파

완료된 스텝을 다시 선택하면:

```
[스텝명]이 이미 완료되어 있습니다. [산출물명]이 수정되었나요?
→ "네" → 해당 스킬 재실행
→ "아니요" → 메뉴 복귀
```

재작업 완료 후 후행 영향 안내:

| 재작업 스텝 | ⚠ 후행 스텝                      |
| ----------- | -------------------------------- |
| 2.1         | 2.2, 3.1, 3.2, 3.3, 4.2, 4.3, 5.1 |
| 2.2         | 3.1, 3.2, 3.3, 4.2, 4.3, 5.1      |
| 3.1         | 3.3, 4.2, 4.3                     |
| 3.2         | 3.3, 4.2, 4.3                     |
| 3.3         | 4.2, 4.3                          |
| 4.2         | 4.3, 5.1                          |

재작업이 validate 통과 시 후행 Notion 스텝의 `validated=false`로 되돌린다. 개발 스텝(4.2, 4.3)은 메뉴 표시에서만 ⚠ 처리.

---

## 9. 스킬 라우팅

선택된 스텝에 대해 `state.activeStage = "N.M"`, `state.activeSkill = "<경로>"` 로 갱신한 뒤 스킬을 호출한다.

| 스텝 | 호출 스킬                                                | 사후 validate |
| ---- | -------------------------------------------------------- | ------------- |
| 1.1  | `skills/planning/work-define`                            | 없음          |
| 2.1  | `skills/planning/spec-review`                            | stage=2.1     |
| 2.2  | `skills/planning/spec-finalize`                          | stage=2.2     |
| 3.1  | `skills/blueprint/ui-flow`                               | stage=3.1     |
| 3.2  | `skills/blueprint/data-flow`                             | stage=3.2     |
| 3.3  | `skills/blueprint/tech-spec`                             | stage=3.3     |
| 4.1  | `skills/development/design-check`                        | 없음          |
| 4.2  | workType이 `bugfix`면 `skills/development/bug-fix`, 아니면 `skills/development/code-write` | 경고 리포트 |
| 4.3  | `skills/development/code-review`                         | 경고 리포트   |
| 5.1  | `skills/testing/qa-scenario`                             | stage=5.1     |

### 사후 처리

- validate가 지정된 스텝: `skills/common/validate` 호출 (`stage=N.M`)
- 4.2/4.3 경고 리포트 — 아래 조건 충족 여부를 점검해 미충족 항목을 콘솔에 출력:
  - `git log --grep='[<작업번호>]'` 결과 존재
  - 변경 파일에 테스트 파일 포함 여부
  - code-review 산출물(경로는 code-review 스킬 정의에 따름) 존재 여부
- 어떤 경로로든 완료 후 `activeStage`, `activeSkill`을 `null`로 복원

### 각 스킬에 전달할 컨텍스트

- 작업번호 (모든 스킬)
- 서비스/플랫폼/작업자 (dev-config.json)
- workType (모든 스킬이 `.dev-work/<작업번호>/state.json`에서 직접 읽어도 됨)

---

## 10. 단계 완료 후

```
[스텝명] 완료!
다른 단계를 진행하시겠습니까?
→ "네" → 4로 복귀
→ "아니요" → 종료
```
