# 워크플로우 단계 검증 시스템 + 두 README 설계

- 작성일: 2026-04-15
- 작성자: BEYun
- 상태: Draft (사용자 리뷰 대기)

---

## 1. 배경과 목표

여보야 워크플로우 플러그인(`/dev` 파이프라인)은 기획→설계→개발→QA를 7단계로 자동화한다. 그러나 현재 구조에는 두 가지 공백이 있다.

1. **프로세스 이탈 검출 부재** — Claude가 지정된 스킬(예: `spec-review`, `ui-flow`)을 거치지 않고 프리스타일로 산출물을 생성해도 막을 방법이 없다.
2. **산출물 구조 검증 부재** — 생성된 문서가 해당 단계 스킬이 요구하는 포맷(필수 섹션, Mermaid 블록 등)을 충족하는지 확인하지 않는다.

본 설계는 위 두 공백을 각각 **PreToolUse 훅(프로세스 검증)**과 **`validate` 스킬(산출물 검증)**로 메운다. 또한 플러그인 사용자·기여자 각각을 위한 **두 개의 README**를 추가한다.

## 2. 범위

**포함**
- `skills/common/validate` 신규 스킬 (단계별 산출물 구조 검증)
- `hooks/stage-guard.sh` 신규 훅 (Notion 쓰기 PreToolUse 차단)
- `.claude/dev-state.json` 상태 파일 포맷 정의
- `skills/setting/dev/SKILL.md` 최소 수정 (state 기록 + validate 자동 호출)
- `README.md`(루트, 사용자용) 신규 작성
- `CONTRIBUTING.md`(루트, 기여자용) 신규 작성

**미포함 (YAGNI)**
- 병렬 작업번호 동시 진행
- `/dev` 외부에서 스킬 직접 호출 시 강제 차단
- CI에서 스킬 정합성 자동 감사(meta-validation)
- 개발 단계(4/5/6)의 훅 기반 차단(경고만)

## 3. 설계 원칙

- **Single Source of Truth**: 검증 규칙은 `skills/common/validate/SKILL.md` 한 곳에 중앙화한다. 생성 스킬(spec-review 등) SKILL.md 말미에 "검증 규칙은 `skills/common/validate` 참조" 한 줄을 추가해 드리프트 위험을 상기시킨다.
- **Fail Open**: 훅/검증 인프라 자체가 깨졌을 때 작업을 완전히 봉쇄하지 않는다. 상태 파일 부재·손상 시 훅은 통과시킨다.
- **Self-enforcing Convention**: 새 스킬이 추가되고 검증 규칙 동기화를 빠뜨리면, 훅이 Notion 쓰기를 차단하면서 즉시 드러난다. 시스템이 자기 자신을 강제한다.
- **최소 변경**: 기존 생성 스킬 6~7개의 SKILL.md는 본문을 건드리지 않는다(말미 한 줄만 추가).

## 4. 아키텍처 개요

```
┌────────────────────────────────────────────────────────┐
│  /dev 파이프라인                                         │
│   ├── 단계 선택                                          │
│   ├── dev-state.json에 activeStage / activeSkill 기록   │
│   ├── 생성 스킬 호출(spec-review, ui-flow, ...)         │
│   └── 완료 후 skills/common/validate 자동 호출          │
└─────────────────┬──────────────────────────────────────┘
                  │
                  ▼
        .claude/dev-state.json
        (작업번호 · activeStage · stages[n].produced/validated)
                  ▲
        ┌─────────┼────────────┐
        │         │            │
        ▼         ▼            ▼
   PreToolUse   validate     /dev 메뉴
     훅(차단)     스킬         (✓/⚠ 표시)
```

## 5. 컴포넌트 명세

### 5.1 `.claude/dev-state.json`

단일 파일, 단일 active task 전제.

```json
{
  "task": "DCL-1351",
  "activeStage": 2,
  "activeSkill": "skills/blueprint/ui-flow",
  "stages": {
    "1": { "produced": true,  "validated": true,  "artifactPageId": "..." },
    "2": { "produced": false, "validated": false, "artifactPageId": null },
    "3": { "produced": false, "validated": false, "artifactPageId": null },
    "7": { "produced": false, "validated": false, "artifactPageId": null }
  },
  "lastUpdated": "2026-04-15T10:00:00Z"
}
```

필드:
- `task` — 현재 작업번호 (예: `DCL-1351`)
- `activeStage` — 진행 중인 단계 번호(숫자). 스킬+validate 완료 시 `null`로 초기화
- `activeSkill` — 진행 중인 스킬 경로. 훅이 참고 가능
- `stages[n].produced` — 해당 단계 산출물이 Notion에 작성됨
- `stages[n].validated` — validate 스킬이 구조 검사를 통과시킴. 재작업 시 후행 단계는 `false`로 되돌림
- `stages[n].artifactPageId` — 산출물 Notion 페이지 ID
- `lastUpdated` — ISO 8601 타임스탬프

**주의**: `stages`는 Notion 산출물이 있는 단계(1, 2, 3, 7)만 추적한다. 개발 단계(4, 5, 6)는 기존 `/dev` 방식대로 `git log --grep='[작업번호]'`로 판단하며 `dev-state.json`에 별도 필드를 두지 않는다.

### 5.2 `skills/common/validate/SKILL.md`

**입력**: `task`, `stage` (1 | 2 | 3 | 7)

**절차**
1. `dev-state.json`에서 `stages[stage].artifactPageId` 조회
2. `skills/common/notion-writer`로 Notion 페이지 내용 로드
3. 단계별 규칙(아래) 적용
4. 결과를 `dev-state.json`의 `stages[stage].validated`에 기록 (통과 시 `true`)
5. 실패 시 어떤 규칙이 실패했는지 사용자에게 리포트하고 `false` 유지

**단계별 규칙 (중앙화)**

- **Stage 1 — 기획서 검토**
  - 필수 헤딩 4개 존재: "화면 흐름", "상태 정의", "엣지 케이스", "인터랙션"
  - 각 섹션에 최소 1개 이상 항목(bullet 또는 문단)

- **Stage 2 — UI 흐름도**
  - `mermaid` 코드 블록 존재, `stateDiagram` 또는 `stateDiagram-v2` 포함
  - 최소 2개 이상 상태 노드

- **Stage 3 — 데이터 흐름도**
  - `mermaid` 코드 블록 존재, `sequenceDiagram` 포함
  - `participant` 최소 2개

- **Stage 7 — QA 시트**
  - 3단계 매트릭스 헤딩 존재(예: 정상 / 경계 / 에러 또는 동등 의미의 3구분)
  - 각 구분에 최소 1개 시나리오 행

**실패 처리**
- Notion 읽기 실패(네트워크/권한) → `validated` 변경 없이 "검증 불가" 리턴. 3회 재시도 후 사용자에게 "수동 확인 후 진행" 경로 제공.
- 규칙 실패 → `validated=false`. `/dev`는 후행 단계 진입을 선행조건 미충족으로 차단.

### 5.3 `hooks/stage-guard.sh`

PreToolUse 훅. Notion MCP 쓰기 도구를 가로챈다.

**대상 도구**
- `mcp__claude_ai_Notion__notion-create-pages`
- `mcp__claude_ai_Notion__notion-update-page`

**로직**
1. tool_input에서 page title(또는 parent의 title) 추출
2. `.claude/dev-state.json` 없거나 `activeStage`가 `null` → **허용** (/dev 외부 작업)
3. title이 아래 매핑에 해당하는지 확인
   | 페이지 제목 | 기대 stage |
   |------------|-----------|
   | "기획서 검토" | 1 |
   | "UI 흐름도" | 2 |
   | "데이터 흐름도" | 3 |
   | "QA 시트" | 7 |
4. 매칭된 stage ≠ `activeStage` → **차단**, 메시지:
   ```
   현재 /dev의 active stage는 [N]인데 [M]단계 산출물을 쓰려 합니다.
   올바른 스킬을 먼저 호출하거나 /dev에서 해당 단계를 선택하세요.
   ```
5. 매칭된 stage == `activeStage` → **허용**, `stages[stage].produced=true`로 업데이트

**Bypass**
- 환경변수 `DEV_GUARD_BYPASS=1` 설정 시 훅은 경고만 출력하고 통과. 수동 편집 불가피한 경우 사용.

**개발 단계 (4/5/6)**
- 훅은 git 커밋을 차단하지 않는다. 대신 `/dev` 단계 완료 시점에 경고 리포트 출력:
  - `git log --grep='[작업번호]'` 존재 여부
  - 변경 파일에 테스트 파일 포함 여부
  - code-review 리포트 존재 여부
- 하나라도 없으면 `[작업번호] N단계 검증 경고: ...` 콘솔 출력. 진행은 허용.

### 5.4 `skills/setting/dev/SKILL.md` 수정

최소 3개 지점:

1. **섹션 2(작업번호 입력) 후**: `dev-state.json`의 `task` 필드 갱신. 기존 task와 다르면 "현재 X 진행 중인데 Y로 전환하시겠습니까?" 확인.
2. **섹션 7(스킬 라우팅) 직전**: 선택한 단계의 `activeStage` / `activeSkill` 기록.
3. **섹션 7(스킬 라우팅) 직후**: 생성 스킬 완료 시 `skills/common/validate`를 해당 stage로 자동 호출. 검증 통과 시 `activeStage=null`로 초기화 후 메뉴 복귀.

섹션 6(재작업 플로우)의 영향 전파 규칙을 `dev-state.json`에 반영: 재작업 통과 시 후행 단계의 `validated`를 `false`로 되돌림.

### 5.5 생성 스킬 상호참조 한 줄

각 생성 스킬(`spec-review`, `ui-flow`, `data-flow`, `qa-scenario`) SKILL.md 말미에 추가:

```
> 이 스킬의 산출물은 `skills/common/validate` 규칙에 따라 검증됩니다.
> 출력 포맷 변경 시 검증 규칙 동기화가 필요합니다.
```

## 6. 데이터 / 제어 흐름

**정상 플로우 (단계 2 예시)**
1. 사용자 `/dev DCL-1351` → 메뉴에서 "2. UI 흐름도" 선택
2. `/dev`가 `dev-state.json`에 `activeStage=2, activeSkill="skills/blueprint/ui-flow"` 기록
3. `skills/blueprint/ui-flow` 실행 → Mermaid stateDiagram 생성 후 Notion "UI 흐름도" 페이지 쓰기 시도
4. `hooks/stage-guard.sh`가 PreToolUse에서 검사: title="UI 흐름도" → stage 2, `activeStage`=2 → 일치 → 허용, `stages[2].produced=true`
5. 쓰기 완료, ui-flow 스킬 종료
6. `/dev`가 `skills/common/validate`를 `stage=2`로 자동 호출 → 페이지 로드 → stateDiagram 존재·상태 노드 2개 이상 확인 → `stages[2].validated=true`
7. `/dev`가 `activeStage=null` 초기화 후 메뉴 복귀, "✓ 2. UI 흐름도 작성" 표시

**이탈 플로우 (프리스타일 시도)**
1. Claude가 `/dev` 없이, 또는 잘못된 단계에서 Notion에 "UI 흐름도" 쓰기 시도
2. 훅이 `activeStage`를 확인: `null`이거나 2가 아님 → **차단**
3. Claude는 에러 메시지를 받고 올바른 경로로 재시도

## 7. 에러 처리 / 엣지 케이스

- **상태 파일 부재/JSON 손상**: 훅은 허용(fail open). validate도 "검증 불가" 리턴.
- **Notion 읽기 실패**: validate 3회 재시도 후 수동 확인 경로 제공.
- **재작업**: 1 재실행 통과 → `stages[{2,3,4,5,7}].validated=false`로 되돌림(기존 영향 전파 규칙 반영).
- **수동 편집 필요**: `DEV_GUARD_BYPASS=1`로 1회 우회.
- **개발 단계 경고**: 차단 없음, 경고만.
- **병렬 작업**: 미지원. 새 작업번호 입력 시 기존 state를 덮어쓰기 전 확인 프롬프트.

## 8. 두 README 명세

### 8.1 `README.md` (루트, 사용자용)

```
# 여보야 워크플로우 플러그인

플랫폼 불일치 · 코드 품질 및 일관성 · 설계 공통 기준 부재 · QA 시나리오 부재 —
솔루션개발부의 4가지 문제를 해결하는 Claude Code 워크플로우 플러그인.

## 한마디로
**/dev 단일 명령어로 기획 → 개발 → QA 파이프라인.**

## 설치
- Claude Code plugin install 절차
- Notion MCP 연결 전제조건

## 빠른 시작
1. /setting/dev-init
2. /setting/service-config
3. /dev DCL-1351

## 워크플로우 7단계 한눈에 보기
| 단계 | 스킬 | 산출물 | 선행조건 |
| --- | --- | --- | --- |
| 1 | spec-review | 기획서 검토 | 없음 |
| 2 | ui-flow | UI 흐름도 | 1 |
| 3 | data-flow | 데이터 흐름도 | 1 |
| 4 | tech-spec→tdd-guide→implement→code-review | 신규 구현 | 1,2,3 |
| 5 | tech-spec(변경)→tdd-guide→implement→code-review | 수정/고도화 | 1,2,3 |
| 6 | bug-fix→code-review | 버그 수정 | 1 |
| 7 | qa-scenario | QA 시트 | 4 또는 5 |

## 예시 시나리오
- 시나리오 1 — 기능 신규 개발: 1 → 2 → 3 → 4 → 7
- 시나리오 2 — 기능 수정 및 고도화: 1 → 2 → 3 → 5 → 7
- 시나리오 3 — 버그 수정: 1 → 6 (회귀 테스트는 기존 QA 시나리오를 재사용)

## 검증 시스템
- 각 단계 산출물은 자동 구조 검증
- 잘못된 단계에 쓰면 훅이 차단하는 이유와 해결법
- 수동 편집 필요 시 `DEV_GUARD_BYPASS=1` 사용법

## FAQ / 트러블슈팅
- Notion MCP 연결 실패
- dev-state.json 초기화 방법
- 작업번호 전환
```

### 8.2 `CONTRIBUTING.md` (루트, 기여자용)

```
# 기여자 가이드 (Contributor README)

## 플러그인 구조
- .claude-plugin/plugin.json — 메타데이터
- skills/ — 카테고리별(setting/planning/blueprint/development/testing/common)
- hooks/ — PreToolUse / Stop 훅
- 디렉토리 트리 다이어그램

## 스킬 작성 규칙
- SKILL.md frontmatter(name, description, argument-hint)
- description에 트리거 키워드 포함
- 스킬 간 의존성 명시

## 워크플로우 아키텍처
- /dev → 생성 스킬 → validate → dev-state.json 라이프사이클
- dev-state.json 스키마
- 훅 PreToolUse 차단 로직
- validate 스킬의 단계별 규칙 위치

## 새 단계 스킬 추가 체크리스트
- [ ] skills/<category>/<name>/SKILL.md 작성
- [ ] skills/common/validate/SKILL.md에 검증 규칙 추가
- [ ] skills/setting/dev/SKILL.md의 라우팅·선행조건·영향전파 갱신
- [ ] hooks/stage-guard.sh의 title→stage 매핑 갱신
- [ ] README.md 7단계 표 갱신

## 검증 규칙 수정 가이드
- validate 스킬의 단계별 블록 수정
- 기존 작업번호 dev-state.json 호환성 주의

## 테스트
- 스킬 단독 실행
- /dev 파이프라인 수동 검증 절차

## 커밋 컨벤션
- [작업번호] 접두사
```

## 9. 구현 시 주의

- 훅 스크립트는 Claude Code 훅 시스템의 입력 포맷(JSON via stdin)을 사용한다. 반환은 exit code + stderr 메시지.
- `dev-state.json` 쓰기는 원자적(atomic) — 임시 파일 생성 후 rename.
- 한국어 페이지 제목 매칭은 정확 일치 기본, 공백/대소문자 정규화 후 비교. 부분 매칭은 금지(false positive 위험).
- validate 스킬은 Notion 페이지 구조를 읽을 때 마크다운 렌더링이 아닌 블록 API로 직접 탐색해야 정확도가 높다.

## 10. 향후 확장 (out of scope)

- 병렬 작업번호 지원 (`dev-state.json`을 task별 파일로 분리)
- CI에서 스킬 정합성 감사(meta-validation)
- 개발 단계(4/5/6) 훅 기반 차단 강화
- 검증 규칙 JSON 스키마화 및 외부화
