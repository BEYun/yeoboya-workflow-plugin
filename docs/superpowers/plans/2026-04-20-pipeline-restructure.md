# Pipeline Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/dev` 파이프라인을 "작업 정의 → 기획 검토 → 설계 → 개발 → 테스트"의 5대분류 계층 구조로 재구성하고, 작업 종류(신규/변경/버그)에 따른 스텝 스킵을 도입한다.

**Architecture:** `/dev`는 얇은 라우터로 유지하고 신규 3개 스킬(work-define, spec-finalize, design-check)이 각자의 도메인 로직을 소유한다. state.json은 `"N.M"` 계층 키로 확장되고 stage-guard 파서는 이 형식만 지원한다. 마이그레이션은 하지 않는다.

**Tech Stack:** Claude Code skills (Markdown + YAML frontmatter), Node.js hooks, JSON state file, Notion MCP.

**Spec:** [docs/superpowers/specs/2026-04-20-pipeline-restructure-design.md](../specs/2026-04-20-pipeline-restructure-design.md)

---

## File Structure

| 파일 | 변경 유형 | 책임 |
|------|----------|------|
| `hooks/lib/state.js` | 수정 | 신 스키마(N.M 키, workType, finalSpec) 생성·로드 헬퍼 |
| `hooks/stage-guard.js` | 수정 | `activeStage` `"N.M"` 형식 파서, 타이틀→스텝 매핑 갱신 |
| `skills/planning/work-define/SKILL.md` | 신규 (skill-creator) | 작업 종류 선택 및 state.workType 기록 |
| `skills/planning/spec-finalize/SKILL.md` | 신규 (skill-creator) | 최종 기획서 Notion 업로드·정리 |
| `skills/development/design-check/SKILL.md` | 신규 (skill-creator) | 서비스별 디자인 소스 전략 판정 |
| `skills/blueprint/tech-spec/SKILL.md` | 수정 | 모드 분기를 state.workType 참조로 변경 |
| `skills/development/code-write/SKILL.md` | 수정 | state.stages["4.1"].result 참조 섹션 추가 |
| `skills/common/validate/SKILL.md` | 수정 | stage 키를 `"N.M"` 체계로 확장, 2.2/3.3 규칙 추가 |
| `skills/setting/dev/SKILL.md` | 재작성 | 계층 메뉴·workType 필터·N.M 라우팅 |

---

## Task 1: state.js 신 스키마 지원

**Files:**
- Modify: `hooks/lib/state.js:5` (NOTION_STAGES 상수)
- Modify: `hooks/lib/state.js:59-71` (newEmptyState 함수)

- [ ] **Step 1: NOTION_STAGES 상수 확장**

`hooks/lib/state.js:5`의 `NOTION_STAGES` 를 계층 키로 교체:

```javascript
// 기존:
// const NOTION_STAGES = ['1', '2', '3', '7'];

// 변경:
const NOTION_STAGES = ['2.1', '2.2', '3.1', '3.2', '3.3', '5.1'];
```

- [ ] **Step 2: newEmptyState 전면 재작성**

`hooks/lib/state.js:59-71`을 신 스키마로 교체:

```javascript
function newEmptyState(task) {
  const stages = {
    '1.1': { done: false, at: null },
    '2.1': { done: false, validated: false, artifactPageId: null },
    '2.2': { done: false, validated: false, artifactPageId: null },
    '3.1': { done: false, validated: false, artifactPageId: null },
    '3.2': { done: false, validated: false, artifactPageId: null },
    '3.3': { done: false, validated: false, artifactPageId: null },
    '4.1': { done: false, result: null },
    '4.2': { done: false },
    '4.3': { done: false },
    '5.1': { done: false, validated: false, artifactPageId: null },
  };
  return {
    task,
    workType: null,
    finalSpec: null,
    activeStage: null,
    activeSkill: null,
    stages,
    lastUpdated: new Date().toISOString(),
  };
}
```

- [ ] **Step 3: 변경 검증**

Run:
```bash
node -e "const s=require('./hooks/lib/state'); const st=s.newEmptyState('T-1'); console.log(JSON.stringify(st, null, 2));"
```

Expected output contains `"workType": null`, `"finalSpec": null`, and stages with keys `1.1, 2.1, 2.2, 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 5.1`. Stage `1.1` has `{done, at}`; stage `4.1` has `{done, result}`; stages `4.2`/`4.3` have `{done}`만; 나머지는 `{done, validated, artifactPageId}`.

- [ ] **Step 4: Commit**

```bash
git add hooks/lib/state.js
git commit -m "$(cat <<'EOF'
refactor(state): switch state schema to hierarchical N.M stages

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: stage-guard.js — N.M 파서와 타이틀 매핑 갱신

**Files:**
- Modify: `hooks/stage-guard.js:14-20` (TITLE_TO_STAGE 맵)
- Modify: `hooks/stage-guard.js:80-87` (activeStage 비교 로직)

- [ ] **Step 1: TITLE_TO_STAGE 맵 갱신**

`hooks/stage-guard.js:14-20`을 아래로 교체. 키는 Notion 산출물 서브페이지 제목, 값은 계층 스텝 번호.

```javascript
// Page title → expected stage number (string keys match state.json)
const TITLE_TO_STAGE = new Map([
  ['기획서 검토', '2.1'],
  ['최종 기획서', '2.2'],
  ['UI 흐름도', '3.1'],
  ['데이터 흐름도', '3.2'],
  ['기술 설계', '3.3'],
  ['QA 시트', '5.1'],
]);
```

- [ ] **Step 2: activeStage 비교 로직 단순화**

`hooks/stage-guard.js:80-87` 블록을 아래로 교체. 신 스키마만 지원하므로 분기 없이 문자열 비교 유지하되, `stages[activeStage].produced` 대신 신 스키마에 맞는 필드(`done`)를 쓴다:

```javascript
  const activeStage = String(state.activeStage);
  const bypass = process.env.DEV_GUARD_BYPASS === '1';

  if (activeStage === stageForTitle) {
    // Notion 산출물 스텝은 모두 done/validated/artifactPageId 구조
    if (!state.stages[stageForTitle]) state.stages[stageForTitle] = { done: false, validated: false, artifactPageId: null };
    state.stages[stageForTitle].done = true;
    writeState(root, task, state);
    return allow();
  }
```

- [ ] **Step 3: 수동 동작 확인 — 허용 경로**

임시 작업 디렉터리로 시나리오 실행:

```bash
TMP=$(mktemp -d)
mkdir -p "$TMP/.claude" "$TMP/.dev-work/T-1"
echo -n "T-1" > "$TMP/.claude/active-task"
node -e "const s=require('$(pwd)/hooks/lib/state'); s.writeState('$TMP','T-1',{...s.newEmptyState('T-1'), activeStage:'3.1', activeSkill:'skills/blueprint/ui-flow'})"
echo '{"tool_name":"mcp__claude_ai_Notion__notion-create-pages","tool_input":{"pages":[{"properties":{"title":"UI 흐름도"}}]}}' | YB_ROOT="$TMP" node hooks/stage-guard.js
echo "exit=$?"
```

Expected: `exit=0`. `cat "$TMP/.dev-work/T-1/state.json"` 에서 `stages["3.1"].done=true` 확인.

- [ ] **Step 4: 수동 동작 확인 — 차단 경로**

```bash
node -e "const s=require('$(pwd)/hooks/lib/state'); s.writeState('$TMP','T-1',{...s.newEmptyState('T-1'), activeStage:'2.1'})"
echo '{"tool_name":"mcp__claude_ai_Notion__notion-create-pages","tool_input":{"pages":[{"properties":{"title":"UI 흐름도"}}]}}' | YB_ROOT="$TMP" node hooks/stage-guard.js 2>&1
echo "exit=$?"
```

Expected: stderr에 `[stage-guard] 현재 /dev의 active stage는 2.1인데 3.1단계 산출물("UI 흐름도")을 쓰려 합니다.` 같은 메시지, `exit=2`.

- [ ] **Step 5: Commit**

```bash
git add hooks/stage-guard.js
git commit -m "$(cat <<'EOF'
refactor(hooks): stage-guard switches to N.M keys and new title mapping

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: work-define 스킬 생성 (/skill-creator 경유)

**Files:**
- Create: `skills/planning/work-define/SKILL.md`

- [ ] **Step 1: /skill-creator 호출**

`/skill-creator` (또는 `skill-creator:skill-creator`) 스킬을 호출해 아래 요구사항으로 신규 스킬을 생성한다.

**스킬 이름:** `work-define`
**배치 경로:** `skills/planning/work-define/SKILL.md`
**모델:** `claude-haiku-4-5-20251001`
**description:** `/dev 파이프라인 진입 시 작업 종류(신규 개발 / 변경·고도화 / 버그 수정)를 선택받고 state.json의 workType에 기록할 때 사용. 이미 workType이 설정된 작업에 대해서는 /dev가 자동 스킵한다. "작업 정의", "work define", "작업 종류"`

- [ ] **Step 2: 생성된 SKILL.md 본문 조정**

skill-creator가 생성한 파일을 열어 본문을 아래 내용으로 확정 반영:

````markdown
# work-define

/dev 파이프라인 진입 시 작업 종류를 선택받아 `.dev-work/<작업번호>/state.json`의 `workType` 필드를 채운다. 이 값은 이후 메뉴의 스텝 필터링과 tech-spec 모드 결정에 사용된다.

---

## 선행조건

- `.claude/active-task`에 작업번호가 기록되어 있어야 한다 (보통 /dev가 직전에 설정).
- `state.json`이 존재해야 한다.

둘 중 하나라도 없으면 "먼저 /dev를 실행하세요" 안내 후 종료.

---

## 동작

1. 사용자에게 다음 질문 표시:
   ```
   이번 작업의 종류를 선택해주세요.
   1. 신규 개발
   2. 변경 / 고도화
   3. 버그 수정
   ```
2. 선택 값을 workType으로 매핑:
   - `1` → `"new"`
   - `2` → `"change"`
   - `3` → `"bugfix"`
3. `state.json`을 읽어 `workType`에 매핑값을 기록하고 `stages["1.1"]`을 `{ done: true, at: <ISO 현재시각> }`으로 갱신, 파일을 원자적으로 다시 쓴다.
4. 사용자에게 확정 메시지 표시:
   ```
   작업 종류: <한글 라벨> 으로 설정되었습니다.
   ```

---

## 이미 설정된 경우

`state.workType`이 비어 있지 않으면 아래 메시지만 표시하고 변경 없이 종료:
```
이 작업(<작업번호>)의 종류는 이미 '<한글 라벨>'로 설정되어 있습니다.
변경이 필요하면 state.json을 수동 편집한 뒤 /dev를 다시 실행해주세요.
```

---

## Notion 저장

하지 않는다. workType은 순수 파이프라인 메타데이터이다.
````

- [ ] **Step 3: frontmatter 확인**

Run:
```bash
head -6 skills/planning/work-define/SKILL.md
```

Expected: 첫 줄과 다섯째 줄이 `---`, 그 사이에 `name: work-define`, `model: claude-haiku-4-5-20251001`, `description: ...` 가 있어야 한다.

- [ ] **Step 4: Commit**

```bash
git add skills/planning/work-define
git commit -m "$(cat <<'EOF'
feat(skills): add work-define for selecting work type and recording state

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: spec-finalize 스킬 생성 (/skill-creator 경유)

**Files:**
- Create: `skills/planning/spec-finalize/SKILL.md`

- [ ] **Step 1: /skill-creator 호출**

**스킬 이름:** `spec-finalize`
**배치 경로:** `skills/planning/spec-finalize/SKILL.md`
**모델:** `claude-sonnet-4-6`
**description:** `기획회의 이후 확정된 최종 기획서를 제출받아 Notion 작업번호 페이지 하위에 "최종 기획서" 서브페이지로 업로드·정리할 때 사용. 초안 대비 주요 변경점도 함께 기록한다. "최종 기획서", "spec finalize", "기획서 확정"`

- [ ] **Step 2: 생성된 SKILL.md 본문 조정**

````markdown
# spec-finalize

기획회의 이후 확정된 **최종 기획서**를 사용자로부터 제출받아 Notion 작업번호 페이지 하위에 "최종 기획서" 서브페이지로 업로드·정리한다. 초안 대비 변경점 요약도 함께 기록하여 다운스트림 설계 단계에서 참조할 수 있게 한다.

---

## 선행조건

- `stages["2.1"].validated === true` (기획서 검토 완료)
- `.claude/active-task`의 작업번호가 유효함

---

## 입력 수집

사용자에게 다음을 차례로 요청한다.

1. 최종 기획서 제출: "최종 기획서 파일 경로 또는 접근 링크를 제공해주세요."
   - 파일 경로(PDF 등) 또는 URL 둘 다 허용
2. 초안 대비 변경점 요약 (선택):
   ```
   기획회의에서 변경된 주요 항목을 3~5줄로 요약해주세요. 변경이 없다면 "없음"이라고 답해주세요.
   ```

제출이 없거나 사용자가 "나중에"로 응답하면 state 변경 없이 종료하고 다음 안내를 출력:
```
기획회의 후 최종 기획서가 준비되면 /dev에서 다시 2.2 단계를 선택해주세요.
```

---

## Notion 업로드

`skills/common/notion-writer` 스킬을 호출하여 작업번호 페이지 하위에 **"최종 기획서"** 서브페이지를 생성하거나 갱신한다. 페이지 본문은 다음 구조를 따른다.

```markdown
## [작업번호] 최종 기획서

- 업로드 일시: <ISO 타임스탬프>
- 업로드 작업자: <dev-config.json.worker>

### 원본 자료
- <파일명 또는 링크>
  (PDF라면 파일 첨부, URL이라면 링크 임베드)

### 초안 대비 변경점
<사용자가 제공한 요약. "없음"이면 "변경 없음"으로 기록>
```

notion-writer로부터 생성된 페이지의 `page_id`를 확보한다.

---

## state 반영

`.dev-work/<작업번호>/state.json`을 아래와 같이 갱신 (원자적 쓰기):

- `finalSpec = { pageId: <위에서 얻은 page_id>, uploadedAt: <ISO 타임스탬프> }`
- `stages["2.2"] = { done: true, validated: true, artifactPageId: <page_id> }`

---

## 완료 메시지

```
최종 기획서가 업로드되었습니다. 페이지: <Notion 링크>
이어서 설계 단계(3.1 UI 흐름도)로 진행할 수 있습니다.
```
````

- [ ] **Step 3: frontmatter 확인**

Run:
```bash
head -6 skills/planning/spec-finalize/SKILL.md
```

Expected: `name: spec-finalize`, `model: claude-sonnet-4-6`.

- [ ] **Step 4: Commit**

```bash
git add skills/planning/spec-finalize
git commit -m "$(cat <<'EOF'
feat(skills): add spec-finalize for uploading final spec to Notion

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: design-check 스킬 생성 (/skill-creator 경유)

**Files:**
- Create: `skills/development/design-check/SKILL.md`

- [ ] **Step 1: /skill-creator 호출**

**스킬 이름:** `design-check`
**배치 경로:** `skills/development/design-check/SKILL.md`
**모델:** `claude-sonnet-4-6`
**description:** `개발 진입 전 디자인 시안 존재 여부와 서비스별 디자인 소스 전략(Zeplin / Figma 스크린샷 / Figma MCP + 토큰)을 판정하고 code-write에 컨텍스트로 전달할 때 사용. 버그 수정 작업에서는 자동 스킵된다. "디자인 확인", "design check", "시안 확인"`

- [ ] **Step 2: 생성된 SKILL.md 본문 조정**

````markdown
# design-check

`code-write`에 앞서 이번 작업에 맞는 디자인 소스 전략을 판정한다. 작업 종류와 서비스에 따라 Zeplin 링크 / Figma 스크린샷 / Figma MCP + 디자인 토큰 중 하나로 라우팅하고, 결과를 state.json에 저장해 code-write가 참조하도록 한다.

---

## 서비스별 전략 (스킬 내부 상수)

| 서비스 (dev-config.json.service 값) | strategyId               | tokenized | 사용자 요구 자료      |
| ----------------------------------- | ------------------------ | --------- | --------------------- |
| `여보야`                            | `zeplin-manual`          | false     | Zeplin 링크           |
| `클럽5678`                          | `zeplin-manual`          | false     | Zeplin 링크           |
| `달라`                              | `figma-screenshot`       | false     | 스크린샷 업로드       |
| `클럽라이브`                        | `figma-screenshot`       | false     | 스크린샷 업로드       |
| `식단AI`                            | `figma-mcp-tokenized`    | true      | Figma 노드 URL        |

> 토큰화 상태가 실제로 변경되면 이 테이블과 해당 strategyId 블록만 수정한다.

---

## 동작

1. `.claude/active-task` 로 작업번호를 확보하고 `.dev-work/<작업번호>/state.json`을 로드한다. `state.workType`이 `"bugfix"`이면 아래 단축 경로:
   - `state.stages["4.1"] = { done: true, result: { strategyId: "skip-bugfix", designSource: null } }` 저장
   - 사용자에게 "버그 수정은 디자인 체크를 건너뜁니다." 출력 후 종료
2. 사용자에게 시안 존재 여부 확인:
   ```
   이 작업에 디자인 시안이 준비되어 있나요? (y/n)
   ```
3. `n` 응답 시:
   - 경고 출력: "디자이너에게 시안을 요청한 뒤 다시 실행해주세요."
   - state 변경 없이 종료 (4.1 미완료 유지)
4. `y` 응답 시:
   - `dev-config.json.service` 를 읽어 위 테이블에서 strategyId / tokenized / 요구 자료 조회
   - 사용자에게 요구 자료 요청:
     - `zeplin-manual` → "Zeplin 링크를 입력해주세요."
     - `figma-screenshot` → "스크린샷 파일 경로(여러 개면 줄바꿈으로 구분)를 입력해주세요."
     - `figma-mcp-tokenized` → "Figma 노드 URL을 입력해주세요."
5. 입력값을 `designSource`에 담아 저장:
   - `state.stages["4.1"] = { done: true, result: { strategyId, designSource, tokenized } }` (원자적 쓰기)
6. 완료 메시지:
   ```
   디자인 전략: <strategyId> (토큰화: <예/아니오>) 로 확정했습니다.
   code-write 단계에서 이 정보가 컨텍스트로 주입됩니다.
   ```

---

## dev-config.json에 없는 service 값 처리

테이블에 없는 service이면 아래 메시지 출력 후 state 변경 없이 종료:
```
서비스 '<service값>'은 design-check 전략 테이블에 정의되어 있지 않습니다.
skills/development/design-check/SKILL.md의 전략 테이블에 매핑을 추가해주세요.
```

---

## Notion 저장

하지 않는다. 디자인 전략은 파이프라인 메타데이터이므로 state.json에만 기록한다.
````

- [ ] **Step 3: frontmatter 확인**

Run:
```bash
head -6 skills/development/design-check/SKILL.md
```

Expected: `name: design-check`, `model: claude-sonnet-4-6`.

- [ ] **Step 4: Commit**

```bash
git add skills/development/design-check
git commit -m "$(cat <<'EOF'
feat(skills): add design-check for routing design source by service

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: tech-spec 모드 분기 — state.workType 참조

**Files:**
- Modify: `skills/blueprint/tech-spec/SKILL.md:39-45` (모드 선택 블록)

- [ ] **Step 1: 모드 선택 블록을 workType 참조로 교체**

`skills/blueprint/tech-spec/SKILL.md:29-45` 범위에서 "사용자에게 묻는다" 블록을 아래로 교체.

**기존 (제거 대상):**
```markdown
사용자에게 묻는다:
```
신규 개발인가요, 기존 기능 변경인가요?
1. 신규 개발
2. 기능 변경/고도화
```
```

**변경 후:**
```markdown
모드는 `.dev-work/<작업번호>/state.json`의 `workType`에서 결정된다:

- `workType === "new"` → 모드 A (신규 개발)
- `workType === "change"` → 모드 B (기능 변경/고도화)
- `workType === "bugfix"` → 해당 파이프라인은 /dev가 3.x 전체를 스킵하므로 tech-spec은 호출되지 않는다

`workType`이 비어 있으면 /dev 라우터가 먼저 `work-define` 스킬을 호출하도록 안내하고 종료:
```
state.workType이 비어 있습니다. /dev에서 1.1 단계(작업 정의)를 먼저 완료해주세요.
```
```

- [ ] **Step 2: 변경 확인**

Run:
```bash
grep -n "workType" skills/blueprint/tech-spec/SKILL.md
```

Expected: 최소 2줄 이상 매치. `신규 개발인가요, 기존 기능 변경인가요` 문자열은 더 이상 나오지 않아야 한다.

```bash
grep -c "신규 개발인가요" skills/blueprint/tech-spec/SKILL.md
```

Expected: `0`.

- [ ] **Step 3: Commit**

```bash
git add skills/blueprint/tech-spec/SKILL.md
git commit -m "$(cat <<'EOF'
refactor(tech-spec): read mode from state.workType instead of prompting

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: code-write — 4.1 design-check 결과 참조 섹션 추가

**Files:**
- Modify: `skills/development/code-write/SKILL.md:26-37` (입력 섹션)

- [ ] **Step 1: "입력" 섹션 아래에 "디자인 컨텍스트" 블록 추가**

`skills/development/code-write/SKILL.md`의 `## 입력` 섹션(27–37행) 맨 끝에 아래 블록을 추가:

```markdown

### 디자인 컨텍스트 (design-check 결과)

`state.stages["4.1"].result`를 읽어 디자인 소스 전략을 확인한다. 값에 따라 참조 방식이 달라진다.

| strategyId              | tokenized | 참조 방식                                                     |
| ----------------------- | --------- | ------------------------------------------------------------- |
| `zeplin-manual`         | false     | `designSource` Zeplin 링크를 열어 치수·색상·에셋을 수동 확인  |
| `figma-screenshot`      | false     | `designSource` 스크린샷 파일을 로드하여 비전 기반 해석        |
| `figma-mcp-tokenized`   | true      | Figma MCP로 노드 조회 + 서비스 디자인 토큰 매핑 사용          |
| `skip-bugfix`           | -         | 버그 수정 — 디자인 소스 참조 없이 기존 컨벤션으로 구현        |

`state.stages["4.1"].done === false`이면 "디자인 체크가 아직 완료되지 않았습니다. /dev에서 4.1 단계를 먼저 완료해주세요." 안내 후 종료.
```

- [ ] **Step 2: 변경 확인**

Run:
```bash
grep -n "design-check 결과" skills/development/code-write/SKILL.md
```

Expected: 1줄 매치.

```bash
grep -c "strategyId" skills/development/code-write/SKILL.md
```

Expected: `>=1`.

- [ ] **Step 3: Commit**

```bash
git add skills/development/code-write/SKILL.md
git commit -m "$(cat <<'EOF'
feat(code-write): consume design-check result from state.stages[4.1]

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: validate — N.M 키 체계 및 2.2/3.3 규칙 추가

**Files:**
- Modify: `skills/common/validate/SKILL.md:5` (argument-hint)
- Modify: `skills/common/validate/SKILL.md:12-28` (입력/절차의 스테이지 표)
- Modify: `skills/common/validate/SKILL.md:30-55` (단계별 규칙)

- [ ] **Step 1: frontmatter argument-hint 갱신**

파일 5행의 `argument-hint: <stage> (1 | 2 | 3 | 7)` 을 다음으로 교체:

```yaml
argument-hint: <stage> (2.1 | 2.2 | 3.1 | 3.2 | 3.3 | 5.1)
```

- [ ] **Step 2: 입력·절차의 스테이지 매핑 갱신**

본문의 `## 입력` 및 `## 절차` 섹션에서 언급되는 스테이지 번호·서브페이지 매핑을 아래 표와 동일하게 교체한다. 기존 4줄 (Stage 1 / 2 / 3 / 7) 을 6줄로 확장:

```markdown
- `stage` — 2.1 | 2.2 | 3.1 | 3.2 | 3.3 | 5.1
```

그리고 절차 2번의 매핑을:

```markdown
   - Stage 2.1 → "기획서 검토"
   - Stage 2.2 → "최종 기획서"
   - Stage 3.1 → "UI 흐름도"
   - Stage 3.2 → "데이터 흐름도"
   - Stage 3.3 → "기술 설계"
   - Stage 5.1 → "QA 시트"
```

- [ ] **Step 3: 단계별 규칙 블록 — 제목 번호 갱신 및 2.2, 3.3 블록 추가**

`## 단계별 규칙` 아래 섹션을 아래 내용으로 교체한다. 기존 Stage 1/2/3/7 본문 그대로 두되 제목 번호만 갱신하고, 없던 2.2·3.3 블록을 추가한다.

````markdown
## 단계별 규칙

### Stage 2.1 — 기획서 검토
spec-review는 4가지 관점 라벨을 포함해 페이지별 이슈를 기록한다. 본 규칙은 실제 출력 형식에 맞춰 느슨하게 검증한다.

- 페이지 본문이 비어 있지 않다
- 아래 중 하나 이상 만족:
  - 본문에 4가지 관점 라벨이 모두 최소 1회 등장: `상태 정의`, `엣지 케이스`, 그리고 `화면 흐름` 또는 `화면 흐름 완전성` 중 하나, `인터랙션` 또는 `인터랙션 명세` 중 하나.
  - 또는 본문에 `검토 통과` 문구가 있다 (이슈 없음 케이스).

### Stage 2.2 — 최종 기획서
- 페이지 본문이 비어 있지 않다
- 본문에 `업로드 일시` 문자열 또는 ISO 타임스탬프(정규식 `\d{4}-\d{2}-\d{2}T`) 포함
- `원본 자료` 섹션 또는 첨부 파일/링크 블록 최소 1개

### Stage 3.1 — UI 흐름도
- `mermaid` 코드 블록이 최소 1개 존재
- 블록 내용에 `stateDiagram` 또는 `stateDiagram-v2` 키워드 포함
- 상태 노드(화살표 `-->`로 연결된 식별자) 최소 2개

### Stage 3.2 — 데이터 흐름도
- `mermaid` 코드 블록이 최소 1개 존재
- 블록 내용에 `sequenceDiagram` 키워드 포함
- `participant` 선언 최소 2개

### Stage 3.3 — 기술 설계
- 페이지 본문이 비어 있지 않다
- 모드 A(신규) 또는 모드 B(변경) 중 하나의 헤딩 구조가 등장:
  - 모드 A: `화면 구조`, `데이터 모델`, `상태 관리`, `API 연동`, `비즈니스 로직`, `엣지 케이스` 중 최소 4개 섹션 헤딩
  - 모드 B: `변경 배경`, `기존 설계 요약`, `변경 사항`, `영향 범위` 중 최소 3개 섹션 헤딩

### Stage 5.1 — QA 시트
qa-scenario는 `정상 / 엣지 / 회귀` 3종으로 테스트 케이스를 도출한다.

- 본문에 3구분 키워드가 모두 등장: `정상`, `엣지`, `회귀` (섹션 헤딩이든 표 컬럼이든 형식 무관)
- 각 구분에 대응하는 시나리오 항목 최소 1개 (bullet, 번호 목록, 또는 표 행)
````

- [ ] **Step 4: 변경 확인**

Run:
```bash
grep -n "Stage" skills/common/validate/SKILL.md
```

Expected: `Stage 2.1`, `Stage 2.2`, `Stage 3.1`, `Stage 3.2`, `Stage 3.3`, `Stage 5.1` 이 모두 등장하고, `Stage 1`/`Stage 2`/`Stage 3`/`Stage 7` (점 없는 형태)은 사라져야 한다.

```bash
grep -cE "^### Stage (1|2|3|7) —" skills/common/validate/SKILL.md
```

Expected: `0`.

- [ ] **Step 5: Commit**

```bash
git add skills/common/validate/SKILL.md
git commit -m "$(cat <<'EOF'
feat(validate): extend rules to hierarchical N.M stages (add 2.2, 3.3)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: /dev 라우터 재작성

**Files:**
- Modify: `skills/setting/dev/SKILL.md` (전면 재작성)

- [ ] **Step 1: 파일 전체 교체**

`skills/setting/dev/SKILL.md` 전체를 아래 내용으로 교체한다.

````markdown
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
````

- [ ] **Step 2: 변경 확인**

Run:
```bash
head -6 skills/setting/dev/SKILL.md
```

Expected: `name: dev`, `model: claude-sonnet-4-6`, `argument-hint: [작업번호] (선택)`.

```bash
grep -cE "(기획 단계|\"1\. 기획서 검토\"|선택: 4\. 기능 신규 개발)" skills/setting/dev/SKILL.md
```

Expected: `0` (구 메뉴 흔적이 남지 않아야 함).

```bash
grep -c "workType" skills/setting/dev/SKILL.md
```

Expected: `>=5`.

- [ ] **Step 3: Commit**

```bash
git add skills/setting/dev/SKILL.md
git commit -m "$(cat <<'EOF'
refactor(dev): thin router with hierarchical N.M menu and workType filtering

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: 전체 검증 — 스키마·훅·스킬 교차 확인

- [ ] **Step 1: 신규 스킬 3개 파일 존재 및 frontmatter 모델 확인**

Run:
```bash
for f in skills/planning/work-define/SKILL.md skills/planning/spec-finalize/SKILL.md skills/development/design-check/SKILL.md; do echo "=== $f ==="; head -6 "$f"; done
```

Expected (각 파일):
- `skills/planning/work-define/SKILL.md` → `model: claude-haiku-4-5-20251001`
- `skills/planning/spec-finalize/SKILL.md` → `model: claude-sonnet-4-6`
- `skills/development/design-check/SKILL.md` → `model: claude-sonnet-4-6`

- [ ] **Step 2: state.js / stage-guard.js 단위 동작**

stage-guard 허용 경로 (Task 2 Step 3와 동일):

```bash
TMP=$(mktemp -d)
mkdir -p "$TMP/.claude" "$TMP/.dev-work/T-9"
echo -n "T-9" > "$TMP/.claude/active-task"
node -e "const s=require('$(pwd)/hooks/lib/state'); s.writeState('$TMP','T-9',{...s.newEmptyState('T-9'), workType:'new', activeStage:'2.2', activeSkill:'skills/planning/spec-finalize'})"
echo '{"tool_name":"mcp__claude_ai_Notion__notion-create-pages","tool_input":{"pages":[{"properties":{"title":"최종 기획서"}}]}}' | YB_ROOT="$TMP" node hooks/stage-guard.js
echo "exit=$?"
cat "$TMP/.dev-work/T-9/state.json" | grep -E '"done"|"2.2"'
```

Expected: `exit=0`, `stages["2.2"].done` 이 `true`.

차단 경로:
```bash
node -e "const s=require('$(pwd)/hooks/lib/state'); s.writeState('$TMP','T-9',{...s.newEmptyState('T-9'), workType:'new', activeStage:'3.1'})"
echo '{"tool_name":"mcp__claude_ai_Notion__notion-create-pages","tool_input":{"pages":[{"properties":{"title":"기술 설계"}}]}}' | YB_ROOT="$TMP" node hooks/stage-guard.js 2>&1
echo "exit=$?"
```

Expected: `exit=2`, stderr에 `active stage는 3.1인데 3.3단계 산출물` 언급.

- [ ] **Step 3: 구 스테이지 번호 잔존 스캔**

Run:
```bash
grep -rnE "Stage (1|2|3|7)[^\.]|stages\[\"?(1|2|3|7)\"?\]" skills/ hooks/ 2>/dev/null | grep -v "SKILL.md:3:model"
```

Expected: 빈 출력. (모든 잔존 참조는 `N.M` 형식으로 전환됨.)

- [ ] **Step 4: 계층 키 존재 스캔**

Run:
```bash
grep -rn "\"4.1\"\|2\.1\|3\.3\|5\.1" hooks/lib/state.js skills/common/validate/SKILL.md skills/setting/dev/SKILL.md | head -20
```

Expected: 세 파일 모두에서 매치가 나와야 한다.

- [ ] **Step 5: 최종 commit (전 단계 커밋으로 충분하므로 추가 커밋 불필요)**

`git status`를 실행해 `현재 브랜치 ... 커밋할 사항 없음, 작업 폴더 깨끗함` 임을 확인한다. 남아있는 변경이 있으면 어느 태스크에 속하는지 식별해 해당 태스크 커밋 규칙에 맞게 추가 커밋.
