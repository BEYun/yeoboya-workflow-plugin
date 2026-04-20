# /dev 파이프라인 계층 재구성 설계

**날짜:** 2026-04-20
**작성자:** BEYun

---

## 목표

현재 `/dev` 메뉴는 "파이프라인 단계"와 "작업 종류(4: 신규, 5: 변경, 6: 버그)"가 한 메뉴에 섞여 있다. 이를 분리하여:

1. **작업 종류는 맨 처음 한 번** 정의하고
2. 이후 단계는 **대분류(5개) / 소분류** 계층으로 정돈하며
3. 작업 종류에 따라 필요 없는 스텝을 자동으로 숨겨
4. `/dev`는 얇은 라우터로만 유지한다.

---

## 파이프라인 계층 구조

대분류 번호는 `1~5`, 하위 스텝은 `대분류.소분류` 형식 (예: `3.1`).

| 대분류            | 소분류                                                          | 적용 대상                                   |
| ----------------- | --------------------------------------------------------------- | ------------------------------------------- |
| **1. 작업 정의**  | 1.1 작업 종류 선택 (신규/변경/버그)                             | 모든 작업                                   |
| **2. 기획 검토**  | 2.1 기획서 검토<br>2.2 최종 기획서 확인                         | 신규/변경: 2.1+2.2<br>버그: 2.1만           |
| **3. 설계**       | 3.1 UI 흐름도<br>3.2 데이터 흐름도<br>3.3 tech-spec             | 신규/변경만. 버그는 대분류 전체 스킵        |
| **4. 개발**       | 4.1 디자인 작업 유무 확인<br>4.2 코드 작성<br>4.3 코드 리뷰     | 모든 작업 (버그는 4.1 스킵, 4.2는 bug-fix)  |
| **5. 테스트**     | 5.1 QA 시나리오                                                 | 모든 작업                                   |

### 작업 종류별 숨김 스텝

| workType  | 숨기는 스텝                          |
| --------- | ------------------------------------ |
| `new`     | (없음)                               |
| `change`  | (없음)                               |
| `bugfix`  | `2.2`, `3.1`, `3.2`, `3.3`, `4.1`    |

### 메뉴 표시 예시 (신규 개발, `DCL-1351`, 1.1/2.1/2.2 완료)

```
[DCL-1351 · 신규 개발]

── 1. 작업 정의 ──
✓ 1.1 작업 종류 선택

── 2. 기획 검토 ──
✓ 2.1 기획서 검토
✓ 2.2 최종 기획서 확인

── 3. 설계 ──
  3.1 UI 흐름도
  3.2 데이터 흐름도
  3.3 tech-spec

── 4. 개발 ──
  4.1 디자인 작업 유무 확인
  4.2 코드 작성
  4.3 코드 리뷰

── 5. 테스트 ──
  5.1 QA 시나리오

번호를 선택하세요 (예: 3.1)
```

---

## 신규 스킬 3개

모든 신규 스킬은 `/skill-creator`를 통해 생성한다.

### `skills/planning/work-define`

**역할:** 작업 종류 선택, `state.workType` 기록.

**동작:** 사용자에게 1)신규 개발 2)변경/고도화 3)버그 수정 중 선택 받음. Notion 저장은 하지 않음 (순수 파이프라인 메타데이터). 한 번 결정되면 `/dev` 재진입 시 스킵됨.

**모델:** `claude-haiku-4-5-20251001`

### `skills/planning/spec-finalize`

**역할:** 기획회의 이후 확정된 **최종 기획서를 제출받아 Notion 작업번호 페이지에 업로드·정리**한다.

**동작:**
1. 사용자에게 최종 기획서 제출 요청 (PDF 파일 경로 또는 링크)
2. `notion-writer`로 작업번호 페이지 하위에 "최종 기획서" 서브페이지 생성/갱신 — 파일 첨부·링크 임베드, 업로드 일시·작업자 기재
3. 초안 대비 주요 변경점이 있으면 사용자에게 요약 입력을 받아 동일 페이지에 기록
4. `state.finalSpec` 에 `pageId`, `uploadedAt` 저장

**미제출 시:** "기획회의 후 최종 기획서가 준비되면 다시 실행하세요" 안내 후 종료 (state 변경 없음).

**모델:** `claude-sonnet-4-6`

### `skills/development/design-check`

**역할:** 디자인 소스 판정 + `code-write`에 컨텍스트 전달.

**동작:**
1. `state.workType`이 `bugfix`이면 즉시 스킵 플래그 반환
2. 사용자에게 "이 작업에 디자인 시안이 있나요?" 확인
3. `dev-config.json.service` 를 읽어 아래 테이블로 전략 선택
4. 판정 결과를 `state.stages["4.1"].result` 에 저장 → `code-write` 호출 시 컨텍스트로 주입

**서비스 → 전략 매핑 (스킬 내부 상수):**

| 서비스               | 전략 ID                | 사용자에게 요구할 정보  |
| -------------------- | ---------------------- | ----------------------- |
| 여보야, 클럽5678     | `zeplin-manual`        | Zeplin 링크             |
| 달라, 클럽라이브     | `figma-screenshot`     | 스크린샷 업로드         |
| 식단AI               | `figma-mcp-tokenized`  | Figma 노드 URL          |

토큰화 유무는 서비스별 상수로 내장(여보야·클럽5678: X, 달라·클럽라이브: X, 식단AI: O). 향후 토큰화 상태가 바뀌면 이 스킬만 수정하면 된다.

**모델:** `claude-sonnet-4-6`

---

## 기존 스킬 변경

| 스킬                                      | 변경 내용                                                             |
| ----------------------------------------- | --------------------------------------------------------------------- |
| `skills/blueprint/tech-spec`              | 모드 분기(신규/변경)를 자체 argument 입력 대신 `state.workType` 참조  |
| `skills/development/code-write`           | `state.stages["4.1"].result` 를 읽어 디자인 소스 전략 적용            |
| `skills/common/validate`                  | 스테이지 키를 `"N.M"` 계층 체계로 확장                                |
| `hooks/stage-guard.js`                    | `activeStage` 값이 `"N.M"` 형식만을 지원하도록 파서 갱신              |

**변경 없음:** `spec-review`, `ui-flow`, `data-flow`, `code-review`, `bug-fix`, `qa-scenario`, `notion-writer`, `dev-init`, `service-config`.

---

## state.json 스키마

```json
{
  "task": "DCL-1351",
  "workType": "new",
  "finalSpec": {
    "pageId": "abc123...",
    "uploadedAt": "2026-04-20T14:30:00Z"
  },
  "activeStage": "3.1",
  "activeSkill": "skills/blueprint/ui-flow",
  "stages": {
    "1.1": { "done": true,  "at": "2026-04-20T10:00:00Z" },
    "2.1": { "done": true,  "validated": true,  "artifactPageId": "xxx" },
    "2.2": { "done": true,  "validated": true,  "artifactPageId": "yyy" },
    "3.1": { "done": false, "validated": false, "artifactPageId": null },
    "3.2": { "done": false, "validated": false, "artifactPageId": null },
    "3.3": { "done": false, "validated": false, "artifactPageId": null },
    "4.1": { "done": false, "result": null },
    "4.2": { "done": false },
    "4.3": { "done": false },
    "5.1": { "done": false, "validated": false, "artifactPageId": null }
  },
  "lastUpdated": "2026-04-20T14:35:00Z"
}
```

### 필드 정의

- `workType` — `"new" | "change" | "bugfix"`. `work-define` 이 기록.
- `finalSpec` — `spec-finalize` 완료 시 기록. 스텝 `2.2` 완료 판정 근거.
- `activeStage` / `activeSkill` — 라우팅 직전 `/dev`가 채움. stage-guard의 Notion 쓰기 허용 판정에 사용.
- `stages["N.M"]` — 스텝별 상태. 스킬 종류에 따라 필드 구성이 다름:
  - **Notion 산출물 스텝** (2.1, 2.2, 3.1, 3.2, 3.3, 5.1): `done` + `validated` + `artifactPageId`
  - **메타 스텝** (1.1): `done` + `at`
  - **개발 스텝** (4.2, 4.3): `done`
  - **판정 스텝** (4.1): `done` + `result: { strategyId, designSource }`

### 마이그레이션

대응하지 않는다. 기존 `.dev-work/*` 디렉터리는 사용자가 직접 삭제 후 새로 시작한다. `/dev` 라우터와 `stage-guard`는 신 스키마(`"N.M"` 형식)만을 지원한다.

---

## `/dev` 라우터 재구성

`/dev`는 도메인 로직 없이 **상태 조회 → 메뉴 렌더 → 스킬 디스패치**만 수행한다.

### 실행 흐름

```
1. 설정 확인       : dev-config.json 없으면 dev-init 안내
2. 작업번호 확보   : argument 또는 사용자 입력
3. state 로드      : .dev-work/<번호>/state.json (없으면 신 스키마로 생성)
4. workType 확인   : 비어 있으면 work-define 스킬 자동 호출 → state 갱신 후 재로드
5. 완료 상태 조회  : state.stages 우선, validated=null이면 Notion fallback
6. 메뉴 렌더      : workType 기반 필터 적용, 계층 번호로 표시
7. 선택 수신      : "N.M" 형식 파싱
8. 선행조건 체크   : 미충족 시 미완료 스텝 목록 표시 후 6으로 복귀
9. 라우팅         : 스텝-스킬 매핑 테이블 조회 → activeStage/activeSkill 기록 → 스킬 호출
10. 사후 처리     : validate 스킬 호출(해당 스텝만) → activeStage/activeSkill null 초기화
11. 완료 메시지   : "다른 단계 진행?" → 6 또는 종료
```

### 스텝 ↔ 스킬 매핑 테이블

`/dev`는 이 테이블만 알고 있고, 각 스킬은 내부 로직을 자기 안에서 처리한다.

| 스텝 | 호출 스킬                                                | 사후 validate  |
| ---- | -------------------------------------------------------- | -------------- |
| 1.1  | `skills/planning/work-define`                            | 없음           |
| 2.1  | `skills/planning/spec-review`                            | stage=2.1      |
| 2.2  | `skills/planning/spec-finalize`                          | stage=2.2      |
| 3.1  | `skills/blueprint/ui-flow`                               | stage=3.1      |
| 3.2  | `skills/blueprint/data-flow`                             | stage=3.2      |
| 3.3  | `skills/blueprint/tech-spec`                             | stage=3.3      |
| 4.1  | `skills/development/design-check`                        | 없음           |
| 4.2  | `skills/development/code-write` (bugfix면 `bug-fix`)     | 경고 리포트    |
| 4.3  | `skills/development/code-review`                         | 경고 리포트    |
| 5.1  | `skills/testing/qa-scenario`                             | stage=5.1      |

### 선행조건

숨김 스텝은 "자동 충족"으로 간주된다. bugfix는 2.1 → 4.2(bug-fix) → 4.3 → 5.1로 자연스럽게 이어진다.

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

### 재작업 영향 전파

완료된 스텝을 재선택하면 기존 로직대로 후행 스텝에 `⚠` 표시한다. 번호 체계만 새로 적용:

| 재작업 스텝 | ⚠ 확인 필요로 표시되는 후행 스텝          |
| ----------- | ------------------------------------------ |
| 2.1         | 2.2, 3.1, 3.2, 3.3, 4.2, 4.3, 5.1          |
| 2.2         | 3.1, 3.2, 3.3, 4.2, 4.3, 5.1               |
| 3.1         | 3.3, 4.2, 4.3                              |
| 3.2         | 3.3, 4.2, 4.3                              |
| 3.3         | 4.2, 4.3                                   |
| 4.2         | 4.3, 5.1                                   |

재작업이 validate 통과 시, 후행 Notion 스텝의 `validated`를 `false`로 되돌린다. 개발 스텝(4.2, 4.3)은 메뉴 표시에서만 `⚠` 처리.

---

## 변경 범위 요약

| 구분        | 경로                                       | 변경 유형             |
| ----------- | ------------------------------------------ | --------------------- |
| 신규 스킬   | `skills/planning/work-define/SKILL.md`     | 신규 (skill-creator)  |
| 신규 스킬   | `skills/planning/spec-finalize/SKILL.md`   | 신규 (skill-creator)  |
| 신규 스킬   | `skills/development/design-check/SKILL.md` | 신규 (skill-creator)  |
| 수정        | `skills/setting/dev/SKILL.md`              | 라우터 재작성         |
| 수정        | `skills/blueprint/tech-spec/SKILL.md`      | workType 참조로 변경  |
| 수정        | `skills/development/code-write/SKILL.md`   | 4.1 결과 참조 로직    |
| 수정        | `skills/common/validate/SKILL.md`          | 스테이지 키 확장      |
| 수정        | `hooks/stage-guard.js`                     | activeStage 파서 갱신 |

---

## 리스크 및 대응

| 리스크                                                          | 영향 | 대응                                                          |
| --------------------------------------------------------------- | ---- | ------------------------------------------------------------- |
| design-check 서비스별 상수가 실제와 불일치 (토큰화 진행 시)     | 저   | 상수는 design-check SKILL.md 한 곳에만 두고 주석으로 갱신 가이드 |
| Notion "최종 기획서" 서브페이지 명명 관례 부재                  | 저   | spec-finalize가 고정 명칭 사용, notion-writer와 합의          |
| bugfix 메뉴에서 숨김 스텝을 사용자가 직접 요청                  | 저   | 선행조건 체크가 "숨김 스텝은 자동 충족"으로 간주 → 영향 없음  |

---

## 테스트·검증

- 수동 시나리오 3종: 신규 개발 / 변경·고도화 / 버그 수정 — 각각 `/dev` 진입부터 5.1까지 full path 실행
- stage-guard: `activeStage="N.M"` 형식으로 Notion 쓰기 허용·차단 동작 확인
- 재작업 플로우: 2.1 재실행 시 후행 스텝의 `⚠` 및 `validated=false` 전파 확인
