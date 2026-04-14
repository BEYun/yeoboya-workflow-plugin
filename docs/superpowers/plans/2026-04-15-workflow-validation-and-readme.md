# Workflow Stage Validation and Dual README Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a centralized validation skill + PreToolUse hook that verifies workflow stage outputs are produced by the correct skill and match the expected structure, and ship two READMEs (user-facing, contributor-facing).

**Architecture:** `.claude/active-task` points to the current task; per-task state lives at `.dev-work/<task>/state.json`. The `/dev` skill writes state before routing to a generator skill, then invokes `skills/common/validate` afterward. A Node.js PreToolUse hook (`hooks/stage-guard.js`) blocks Notion writes whose page title does not match the currently active stage. Generator skills (spec-review, ui-flow, etc.) are untouched except for a one-line pointer note.

**Tech Stack:** Node.js (hook and lib, following the existing `feedback-generator.js` precedent), Markdown (skill definitions and READMEs), Claude Code plugin hooks, Notion MCP tools (consumed).

**Spec:** `docs/superpowers/specs/2026-04-15-workflow-validation-and-readme-design.md`

---

## File Structure

**New files**
- `hooks/lib/state.js` — pure functions for reading/writing `.claude/active-task` and `.dev-work/<task>/state.json` (atomic writes)
- `hooks/lib/state.test.js` — unit tests for state lib
- `hooks/stage-guard.js` — PreToolUse hook entry point; reads stdin JSON, delegates to state lib, exits 0 (allow) or 2 (block)
- `hooks/stage-guard.test.js` — tests driving the hook via stdin/stderr
- `hooks/hooks.json` — Claude Code hook registration (PreToolUse bindings)
- `skills/common/validate/SKILL.md` — validation skill with centralized stage rules
- `README.md` — user-facing root README
- `CONTRIBUTING.md` — contributor-facing root README

**Modified files**
- `.claude-plugin/plugin.json` — add `"hooks": "./hooks/hooks.json"` reference
- `skills/setting/dev/SKILL.md` — state management + validate auto-call
- `skills/planning/spec-review/SKILL.md` — append validation cross-reference note
- `skills/blueprint/ui-flow/SKILL.md` — append validation cross-reference note
- `skills/blueprint/data-flow/SKILL.md` — append validation cross-reference note
- `skills/blueprint/tech-spec/SKILL.md` — append validation cross-reference note
- `skills/testing/qa-scenario/SKILL.md` — append validation cross-reference note

**Runtime state (gitignored, documented)**
- `.claude/active-task` — single-line text file with current task id
- `.dev-work/<task>/state.json` — per-task state

---

### Task 1: State library (`hooks/lib/state.js`)

**Files:**
- Create: `hooks/lib/state.js`
- Test: `hooks/lib/state.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
// hooks/lib/state.test.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const {
  readActiveTask,
  writeActiveTask,
  clearActiveTask,
  readState,
  writeState,
  newEmptyState,
} = require('./state');

function withTempRoot(fn) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'yb-state-'));
  try { fn(root); } finally { fs.rmSync(root, { recursive: true, force: true }); }
}

withTempRoot((root) => {
  // active-task round trip
  assert.strictEqual(readActiveTask(root), null);
  writeActiveTask(root, 'DCL-1351');
  assert.strictEqual(readActiveTask(root), 'DCL-1351');
  clearActiveTask(root);
  assert.strictEqual(readActiveTask(root), null);

  // state round trip
  assert.strictEqual(readState(root, 'DCL-1351'), null);
  const fresh = newEmptyState('DCL-1351');
  assert.strictEqual(fresh.task, 'DCL-1351');
  assert.strictEqual(fresh.activeStage, null);
  assert.deepStrictEqual(Object.keys(fresh.stages).sort(), ['1', '2', '3', '7']);
  writeState(root, 'DCL-1351', fresh);
  const loaded = readState(root, 'DCL-1351');
  assert.strictEqual(loaded.task, 'DCL-1351');
  assert.strictEqual(loaded.stages['1'].produced, false);

  // atomic write: no tmp file lingers
  const dir = path.join(root, '.dev-work', 'DCL-1351');
  const leftover = fs.readdirSync(dir).filter((n) => n.startsWith('.state.json.tmp'));
  assert.strictEqual(leftover.length, 0);

  console.log('state.test.js: OK');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node hooks/lib/state.test.js`
Expected: `Cannot find module './state'` (module does not exist yet)

- [ ] **Step 3: Write minimal implementation**

```javascript
// hooks/lib/state.js
const fs = require('fs');
const path = require('path');

const NOTION_STAGES = ['1', '2', '3', '7'];

function activeTaskPath(root) {
  return path.join(root, '.claude', 'active-task');
}

function statePath(root, task) {
  return path.join(root, '.dev-work', task, 'state.json');
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function atomicWrite(filePath, contents) {
  ensureDir(path.dirname(filePath));
  const tmp = filePath + '.tmp-' + process.pid + '-' + Date.now();
  fs.writeFileSync(tmp, contents);
  fs.renameSync(tmp, filePath);
}

function readActiveTask(root) {
  try {
    const raw = fs.readFileSync(activeTaskPath(root), 'utf8').trim();
    return raw || null;
  } catch (e) {
    if (e.code === 'ENOENT') return null;
    throw e;
  }
}

function writeActiveTask(root, task) {
  atomicWrite(activeTaskPath(root), task + '\n');
}

function clearActiveTask(root) {
  try { fs.unlinkSync(activeTaskPath(root)); } catch (e) { if (e.code !== 'ENOENT') throw e; }
}

function readState(root, task) {
  try {
    return JSON.parse(fs.readFileSync(statePath(root, task), 'utf8'));
  } catch (e) {
    if (e.code === 'ENOENT') return null;
    if (e instanceof SyntaxError) return null;
    throw e;
  }
}

function writeState(root, task, state) {
  state.lastUpdated = new Date().toISOString();
  atomicWrite(statePath(root, task), JSON.stringify(state, null, 2) + '\n');
}

function newEmptyState(task) {
  const stages = {};
  for (const n of NOTION_STAGES) {
    stages[n] = { produced: false, validated: false, artifactPageId: null };
  }
  return {
    task,
    activeStage: null,
    activeSkill: null,
    stages,
    lastUpdated: new Date().toISOString(),
  };
}

module.exports = {
  NOTION_STAGES,
  activeTaskPath,
  statePath,
  readActiveTask,
  writeActiveTask,
  clearActiveTask,
  readState,
  writeState,
  newEmptyState,
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node hooks/lib/state.test.js`
Expected: `state.test.js: OK`

- [ ] **Step 5: Commit**

```bash
git add hooks/lib/state.js hooks/lib/state.test.js
git commit -m "feat(hooks): add state library for active-task pointer and per-task state.json"
```

---

### Task 2: Stage guard hook (`hooks/stage-guard.js`)

**Files:**
- Create: `hooks/stage-guard.js`
- Test: `hooks/stage-guard.test.js`

Reference spec §5.3. The hook reads PreToolUse JSON from stdin, checks whether the current Notion write matches the active stage, and exits 0 (allow) or 2 (block). On block, it writes a reason to stderr.

- [ ] **Step 1: Write the failing test**

```javascript
// hooks/stage-guard.test.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const { spawnSync } = require('child_process');
const {
  writeActiveTask,
  writeState,
  newEmptyState,
} = require('./lib/state');

const HOOK = path.resolve(__dirname, 'stage-guard.js');

function runHook(root, input, env = {}) {
  return spawnSync('node', [HOOK], {
    input: JSON.stringify(input),
    env: { ...process.env, YB_ROOT: root, ...env },
    encoding: 'utf8',
  });
}

function makeNotionInput(title) {
  return {
    tool_name: 'mcp__claude_ai_Notion__notion-create-pages',
    tool_input: { pages: [{ properties: { title } }] },
  };
}

function withTempRoot(fn) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'yb-guard-'));
  try { fn(root); } finally { fs.rmSync(root, { recursive: true, force: true }); }
}

// Case A: no active-task → allow
withTempRoot((root) => {
  const r = runHook(root, makeNotionInput('UI 흐름도'));
  assert.strictEqual(r.status, 0, 'no active task should allow');
});

// Case B: activeStage null → allow
withTempRoot((root) => {
  writeActiveTask(root, 'DCL-1351');
  writeState(root, 'DCL-1351', newEmptyState('DCL-1351'));
  const r = runHook(root, makeNotionInput('UI 흐름도'));
  assert.strictEqual(r.status, 0, 'null activeStage should allow');
});

// Case C: title matches activeStage → allow + mark produced
withTempRoot((root) => {
  writeActiveTask(root, 'DCL-1351');
  const s = newEmptyState('DCL-1351');
  s.activeStage = 2;
  s.activeSkill = 'skills/blueprint/ui-flow';
  writeState(root, 'DCL-1351', s);
  const r = runHook(root, makeNotionInput('UI 흐름도'));
  assert.strictEqual(r.status, 0, 'matching stage should allow');
  const after = JSON.parse(fs.readFileSync(
    path.join(root, '.dev-work', 'DCL-1351', 'state.json'), 'utf8'));
  assert.strictEqual(after.stages['2'].produced, true);
});

// Case D: title is stage 2 but activeStage is 1 → block
withTempRoot((root) => {
  writeActiveTask(root, 'DCL-1351');
  const s = newEmptyState('DCL-1351');
  s.activeStage = 1;
  writeState(root, 'DCL-1351', s);
  const r = runHook(root, makeNotionInput('UI 흐름도'));
  assert.strictEqual(r.status, 2, 'mismatched stage should block');
  assert.ok(/active stage/.test(r.stderr), 'stderr should explain');
});

// Case E: unrecognized title → allow (pass-through)
withTempRoot((root) => {
  writeActiveTask(root, 'DCL-1351');
  const s = newEmptyState('DCL-1351');
  s.activeStage = 2;
  writeState(root, 'DCL-1351', s);
  const r = runHook(root, makeNotionInput('회의록'));
  assert.strictEqual(r.status, 0, 'unrecognized title should allow');
});

// Case F: DEV_GUARD_BYPASS=1 → allow even on mismatch
withTempRoot((root) => {
  writeActiveTask(root, 'DCL-1351');
  const s = newEmptyState('DCL-1351');
  s.activeStage = 1;
  writeState(root, 'DCL-1351', s);
  const r = runHook(root, makeNotionInput('UI 흐름도'), { DEV_GUARD_BYPASS: '1' });
  assert.strictEqual(r.status, 0, 'bypass should allow');
  assert.ok(/bypass/i.test(r.stderr), 'bypass should warn on stderr');
});

// Case G: non-Notion tool → allow (ignored)
withTempRoot((root) => {
  writeActiveTask(root, 'DCL-1351');
  const s = newEmptyState('DCL-1351');
  s.activeStage = 1;
  writeState(root, 'DCL-1351', s);
  const r = runHook(root, { tool_name: 'Read', tool_input: { file_path: '/x' } });
  assert.strictEqual(r.status, 0, 'non-notion tool should allow');
});

console.log('stage-guard.test.js: OK');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node hooks/stage-guard.test.js`
Expected: Node exits non-zero with "Cannot find module './stage-guard'" or assertion failure because the hook does not exist.

- [ ] **Step 3: Write minimal implementation**

```javascript
#!/usr/bin/env node
// hooks/stage-guard.js
const {
  readActiveTask,
  readState,
  writeState,
} = require('./lib/state');

const NOTION_WRITE_TOOLS = new Set([
  'mcp__claude_ai_Notion__notion-create-pages',
  'mcp__claude_ai_Notion__notion-update-page',
]);

// Page title → expected stage number (string keys match state.json)
const TITLE_TO_STAGE = new Map([
  ['기획서 검토', '1'],
  ['UI 흐름도', '2'],
  ['데이터 흐름도', '3'],
  ['QA 시트', '7'],
]);

function normalizeTitle(raw) {
  if (!raw || typeof raw !== 'string') return '';
  return raw.trim();
}

// Best-effort extraction across notion MCP tool shapes.
function extractTitle(toolName, toolInput) {
  if (!toolInput) return '';
  if (toolName === 'mcp__claude_ai_Notion__notion-create-pages') {
    const pages = toolInput.pages || toolInput.page || [];
    const list = Array.isArray(pages) ? pages : [pages];
    for (const p of list) {
      const t = p?.properties?.title || p?.title || p?.name;
      if (t) return normalizeTitle(t);
    }
  }
  if (toolName === 'mcp__claude_ai_Notion__notion-update-page') {
    const t = toolInput?.properties?.title
      || toolInput?.title
      || toolInput?.page?.properties?.title;
    if (t) return normalizeTitle(t);
  }
  return '';
}

function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.on('data', (c) => (data += c));
    process.stdin.on('end', () => resolve(data));
  });
}

function allow() { process.exit(0); }
function block(msg) {
  process.stderr.write(msg + '\n');
  process.exit(2);
}

(async () => {
  const root = process.env.YB_ROOT || process.cwd();
  const raw = await readStdin();
  let payload;
  try { payload = JSON.parse(raw); } catch { return allow(); }

  const toolName = payload.tool_name || '';
  if (!NOTION_WRITE_TOOLS.has(toolName)) return allow();

  const title = extractTitle(toolName, payload.tool_input);
  const stageForTitle = TITLE_TO_STAGE.get(title);
  if (!stageForTitle) return allow(); // unrecognized artifact, not our concern

  const task = readActiveTask(root);
  if (!task) return allow();

  const state = readState(root, task);
  if (!state || state.activeStage == null) return allow();

  const activeStage = String(state.activeStage);
  const bypass = process.env.DEV_GUARD_BYPASS === '1';

  if (activeStage === stageForTitle) {
    state.stages[stageForTitle].produced = true;
    writeState(root, task, state);
    return allow();
  }

  const msg =
    `[stage-guard] 현재 /dev의 active stage는 ${activeStage}인데 ` +
    `${stageForTitle}단계 산출물("${title}")을 쓰려 합니다. ` +
    `올바른 스킬을 먼저 호출하거나 /dev에서 해당 단계를 선택하세요.`;

  if (bypass) {
    process.stderr.write(`[stage-guard] bypass enabled — ${msg}\n`);
    return allow();
  }
  return block(msg);
})();
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node hooks/stage-guard.test.js`
Expected: `stage-guard.test.js: OK`

- [ ] **Step 5: Make hook executable and commit**

```bash
chmod +x hooks/stage-guard.js
git add hooks/stage-guard.js hooks/stage-guard.test.js
git commit -m "feat(hooks): add stage-guard PreToolUse hook for Notion writes"
```

---

### Task 3: Register hook in plugin config

**Files:**
- Create: `hooks/hooks.json`
- Modify: `.claude-plugin/plugin.json`

- [ ] **Step 1: Write hook registration file**

Create `hooks/hooks.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "mcp__claude_ai_Notion__notion-create-pages|mcp__claude_ai_Notion__notion-update-page",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/stage-guard.js"
          }
        ]
      }
    ]
  }
}
```

- [ ] **Step 2: Reference from plugin.json**

Update `.claude-plugin/plugin.json` to add the `hooks` field alongside existing metadata:

```json
{
  "name": "yeoboya-workflow",
  "description": "여보야 솔루션개발부 /dev 개발 파이프라인 플러그인 — 5개 서비스(달라, 클럽라이브, 여보야, 클럽5678, AI식단)의 iOS/Android 개발 워크플로우 자동화",
  "version": "0.1.0",
  "author": {
    "name": "윤병은"
  },
  "hooks": "./hooks/hooks.json"
}
```

- [ ] **Step 3: Verify JSON is valid**

Run: `node -e "JSON.parse(require('fs').readFileSync('hooks/hooks.json','utf8')); JSON.parse(require('fs').readFileSync('.claude-plugin/plugin.json','utf8')); console.log('OK')"`
Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add hooks/hooks.json .claude-plugin/plugin.json
git commit -m "feat(plugin): register stage-guard PreToolUse hook"
```

---

### Task 4: Validate skill (`skills/common/validate/SKILL.md`)

**Files:**
- Create: `skills/common/validate/SKILL.md`

- [ ] **Step 1: Write the skill definition**

```markdown
---
name: validate
description: 각 워크플로우 단계의 산출물이 기대 구조를 따르는지 자동 검증한다. /dev 파이프라인이 생성 스킬 실행 직후 자동 호출한다. "validate", "검증", "산출물 검증"
argument-hint: <stage> (1 | 2 | 3 | 7)
---

# validate

/dev 파이프라인이 각 단계의 생성 스킬을 실행한 직후 호출한다. 입력으로 받은 단계의 Notion 산출물을 로드하고 아래 중앙화된 규칙을 적용한다. 결과는 `.dev-work/<task>/state.json`의 `stages[stage].validated`에 반영된다.

## 입력

- `task` — `.claude/active-task`에서 자동으로 읽는다
- `stage` — 1 | 2 | 3 | 7

## 절차

1. `.claude/active-task`에서 현재 작업번호 조회. 없으면 "active task 없음" 에러로 종료.
2. `.dev-work/<task>/state.json`에서 `stages[stage].artifactPageId` 조회. 없으면 "산출물 페이지 ID 없음"으로 fail.
3. `skills/common/notion-writer`로 해당 페이지 블록을 로드.
4. 아래 단계별 규칙을 적용. 모두 통과하면 `validated=true`로 업데이트, 실패하면 `false` 유지 + 실패한 규칙 이름을 사용자에게 리포트.
5. Notion 읽기 실패 시 최대 3회 재시도. 3회 모두 실패 → "검증 불가, 수동 확인 후 진행하시겠습니까?" 경로 제공.

## 단계별 규칙

### Stage 1 — 기획서 검토
- 필수 헤딩 4개가 모두 존재: "화면 흐름", "상태 정의", "엣지 케이스", "인터랙션"
- 각 섹션이 비어 있지 않음 (최소 1개의 bullet 또는 문단)

### Stage 2 — UI 흐름도
- `mermaid` 코드 블록이 최소 1개 존재
- 블록 내용에 `stateDiagram` 또는 `stateDiagram-v2` 키워드 포함
- 상태 노드(화살표 `-->`로 연결된 식별자) 최소 2개

### Stage 3 — 데이터 흐름도
- `mermaid` 코드 블록이 최소 1개 존재
- 블록 내용에 `sequenceDiagram` 키워드 포함
- `participant` 선언 최소 2개

### Stage 7 — QA 시트
- 3구분 헤딩이 존재 (예: "정상" / "경계" / "에러", 또는 동등 의미의 3구분)
- 각 구분에 최소 1개의 시나리오 행

## 실패 처리

- 규칙 실패: `stages[stage].validated=false` 유지. `/dev`는 후행 단계 진입을 선행조건 미충족으로 차단. 사용자에게 실패한 규칙 이름과 생성 스킬 재실행 옵션 제시.
- Notion 읽기 실패 3회: 사용자 확인 후 `validated=null`로 기록하고 수동 진행 허용.

## 재작업 영향 전파

1단계 재검증 통과 시, `state.json`에서 후행 단계(2, 3, 7)의 `validated`를 `false`로 되돌린다. 2/3단계 재검증 통과 시 4, 5는 git 기반이므로 `state.json` 업데이트 없음. `/dev` 메뉴 표시에서 ⚠ 상태로 나타난다.

---

> 본 스킬의 규칙은 생성 스킬들의 출력 포맷에 강하게 결합된다. 생성 스킬이 포맷을 변경하면 이 파일의 해당 규칙 블록을 동기화해야 한다.
```

- [ ] **Step 2: Verify file was created correctly**

Run: `head -5 skills/common/validate/SKILL.md`
Expected: Shows frontmatter with `name: validate`

- [ ] **Step 3: Commit**

```bash
git add skills/common/validate/SKILL.md
git commit -m "feat(skills): add validate skill with centralized stage rules"
```

---

### Task 5: Modify `/dev` skill for state management

**Files:**
- Modify: `skills/setting/dev/SKILL.md`

The existing `/dev` skill routes to generator skills. We need to: (a) write `.claude/active-task` and initialize/load `state.json` on task-number entry, (b) set `activeStage` / `activeSkill` before routing, (c) invoke `skills/common/validate` after the generator skill completes, (d) update the menu status display to use `state.json` as the source of truth for stages 1/2/3/7 (stages 4/5/6 keep the existing git-based check).

- [ ] **Step 1: Read the current file**

Read `skills/setting/dev/SKILL.md` end to end so the edits land in the right places.

- [ ] **Step 2: Extend section 2 (작업번호 입력)**

After the current "작업번호는 이후 모든 스킬에 컨텍스트로 전달한다." line, append:

```markdown

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
```

- [ ] **Step 3: Extend section 3 (산출물 기반 자동 검증)**

Replace the existing table-only "Notion 검증" content with a `state.json`-first approach. After the `| 단계 | 확인할 서브페이지 |` table, append:

```markdown

### state.json 우선 조회

Notion 조회 전에 `.dev-work/<작업번호>/state.json`의 `stages[n].validated`를 먼저 읽는다:

- `validated=true` → ✓ 완료로 간주, Notion 재조회 생략
- `validated=false` 이지만 `produced=true` → 이전 검증 실패 또는 재작업 대기. ⚠로 표시
- `validated=false` 이고 `produced=false` → 미완료로 표시
- `validated=null` → "검증 불가(수동 확인됨)" 상태로 ⚠ 표시

state.json에 없는 작업번호이거나 파일 손상 시, 기존 Notion 서브페이지 존재 조회로 fallback.
```

- [ ] **Step 4: Modify section 7 (스킬 라우팅)**

Before the existing "각 스킬에 전달해야 하는 컨텍스트:" line, insert:

```markdown

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
```

- [ ] **Step 5: Extend section 6 (재작업 플로우)**

After the existing 영향 전파 규칙 table, append:

```markdown

### state.json 반영

재작업이 validate 통과 시, 표의 ⚠ 대상 단계들 중 Notion 단계(1,2,3,7)에 대해 `state.json`의 `stages[n].validated`를 `false`로 되돌린다. 개발 단계(4,5)는 `state.json`에 필드가 없으므로 메뉴 표시에서만 ⚠ 처리.
```

- [ ] **Step 6: Commit**

```bash
git add skills/setting/dev/SKILL.md
git commit -m "feat(dev): integrate state.json management and auto-validate"
```

---

### Task 6: Cross-reference notes in generator skills

**Files:**
- Modify: `skills/planning/spec-review/SKILL.md`
- Modify: `skills/blueprint/ui-flow/SKILL.md`
- Modify: `skills/blueprint/data-flow/SKILL.md`
- Modify: `skills/blueprint/tech-spec/SKILL.md`
- Modify: `skills/testing/qa-scenario/SKILL.md`

- [ ] **Step 1: Append the same note to each of the five files**

Append to the end of each file listed above (after any existing trailing content, on a new line):

```markdown

---

> 이 스킬의 산출물은 `skills/common/validate` 규칙에 따라 검증됩니다.
> 출력 포맷 변경 시 해당 규칙 블록을 동기화해야 합니다.
```

- [ ] **Step 2: Verify the note is present in all 5 files**

Run: `grep -l "skills/common/validate" skills/planning/spec-review/SKILL.md skills/blueprint/ui-flow/SKILL.md skills/blueprint/data-flow/SKILL.md skills/blueprint/tech-spec/SKILL.md skills/testing/qa-scenario/SKILL.md | wc -l`
Expected: `5`

- [ ] **Step 3: Commit**

```bash
git add skills/planning/spec-review/SKILL.md skills/blueprint/ui-flow/SKILL.md skills/blueprint/data-flow/SKILL.md skills/blueprint/tech-spec/SKILL.md skills/testing/qa-scenario/SKILL.md
git commit -m "docs(skills): add validation cross-reference note to generator skills"
```

---

### Task 7: Root `README.md` (user-facing)

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write README.md**

```markdown
# 여보야 워크플로우 플러그인

플랫폼 불일치 · 코드 품질 및 일관성 · 설계 공통 기준 부재 · QA 시나리오 부재 —
솔루션개발부의 4가지 문제를 해결하는 Claude Code 워크플로우 플러그인.

## 한마디로

**/dev 단일 명령어로 기획 → 개발 → QA 파이프라인.**

## 설치

Claude Code에서 플러그인을 추가한다. Notion MCP 연결이 사전에 필요하다.

1. Claude Code 설정에서 이 저장소를 플러그인으로 등록
2. Notion MCP 서버가 연결되어 있는지 확인 (`/mcp` 명령으로 점검)
3. 최초 1회 초기 설정 실행 (아래 Quick Start 참고)

## 빠른 시작

```
/setting/dev-init            # 서비스 / 플랫폼 / 작업자 설정
/setting/service-config      # 서비스별 Notion 페이지 매핑
/dev DCL-1351                # 작업번호로 파이프라인 시작
```

## 워크플로우 7단계

| 단계 | 스킬 | 산출물 | 선행조건 |
| --- | --- | --- | --- |
| 1 | spec-review | 기획서 검토 | 없음 |
| 2 | ui-flow | UI 흐름도 | 1 |
| 3 | data-flow | 데이터 흐름도 | 1 |
| 4 | tech-spec → tdd-guide → implement → code-review | 신규 구현 | 1, 2, 3 |
| 5 | tech-spec(변경) → tdd-guide → implement → code-review | 수정/고도화 | 1, 2, 3 |
| 6 | bug-fix → code-review | 버그 수정 | 1 (긴급 시 스킵) |
| 7 | qa-scenario | QA 시트 | 4 또는 5 |

## 예시 시나리오

- **시나리오 1 — 기능 신규 개발:** 1 → 2 → 3 → 4 → 7
- **시나리오 2 — 기능 수정 및 고도화:** 1 → 2 → 3 → 5 → 7
- **시나리오 3 — 버그 수정:** 1 → 6 (회귀 테스트는 기존 QA 시나리오를 재사용)

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

- **Notion MCP 연결 실패** — `/mcp` 로 상태를 확인하고 토큰/권한을 재설정하세요.
- **state 파일을 초기화하고 싶다** — 해당 작업의 `.dev-work/<작업번호>/state.json`을 삭제하세요. `/dev`가 다시 실행되면 초기 구조로 재생성합니다.
- **작업번호 전환** — `/dev <다른_작업번호>` 를 실행하면 `.claude/active-task`만 갱신되고 기존 작업의 state는 유지됩니다.
```

- [ ] **Step 2: Verify file**

Run: `head -3 README.md`
Expected: `# 여보야 워크플로우 플러그인`

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add user-facing README with quick start and workflow stages"
```

---

### Task 8: `CONTRIBUTING.md` (contributor-facing)

**Files:**
- Create: `CONTRIBUTING.md`

- [ ] **Step 1: Write CONTRIBUTING.md**

```markdown
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
/dev → 생성 스킬 → skills/common/validate → state.json 업데이트
                     ▲
                     │
            hooks/stage-guard.js (PreToolUse: Notion 쓰기 가로채기)
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

### 검증 스킬

`skills/common/validate/SKILL.md`에 단계별 구조 규칙이 중앙화되어 있다. `/dev`가 생성 스킬 실행 직후 자동 호출한다. 검증 결과는 `state.json`의 `validated` 필드에 반영된다.

## 새 단계 스킬 추가 체크리스트

- [ ] `skills/<category>/<name>/SKILL.md` 작성 (프론트매터 포함)
- [ ] `skills/common/validate/SKILL.md`에 새 단계의 검증 규칙 블록 추가
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

`skills/common/validate/SKILL.md`의 "단계별 규칙" 섹션을 직접 편집한다. 기존 작업번호의 `state.json`에는 이전 규칙 기준의 `validated=true`가 남아 있을 수 있으므로, 호환성을 깨는 규칙 변경 시 해당 작업들을 재검증해야 함을 PR 설명에 명시한다.

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
```

- [ ] **Step 2: Verify file**

Run: `head -3 CONTRIBUTING.md`
Expected: `# 기여자 가이드 (Contributor README)`

- [ ] **Step 3: Commit**

```bash
git add CONTRIBUTING.md
git commit -m "docs: add contributor guide with architecture and checklists"
```

---

### Task 9: Manual integration test with DCL-TEST

**Files:**
- None created/modified; this task validates the end-to-end flow manually.

- [ ] **Step 1: Clean baseline**

```bash
rm -rf .dev-work/DCL-TEST/state.json .claude/active-task
node hooks/lib/state.test.js
node hooks/stage-guard.test.js
```
Expected: both test scripts print `OK`.

- [ ] **Step 2: Dry-run the hook with a simulated PreToolUse payload (no active task)**

```bash
printf '%s' '{"tool_name":"mcp__claude_ai_Notion__notion-create-pages","tool_input":{"pages":[{"properties":{"title":"UI 흐름도"}}]}}' | node hooks/stage-guard.js; echo "exit=$?"
```
Expected: `exit=0` (no active task → allow).

- [ ] **Step 3: Simulate an active mismatched stage and confirm block**

```bash
mkdir -p .claude .dev-work/DCL-TEST
printf 'DCL-TEST\n' > .claude/active-task
cat > .dev-work/DCL-TEST/state.json <<'JSON'
{"task":"DCL-TEST","activeStage":1,"activeSkill":"skills/planning/spec-review","stages":{"1":{"produced":false,"validated":false,"artifactPageId":null},"2":{"produced":false,"validated":false,"artifactPageId":null},"3":{"produced":false,"validated":false,"artifactPageId":null},"7":{"produced":false,"validated":false,"artifactPageId":null}},"lastUpdated":"2026-04-15T00:00:00Z"}
JSON
printf '%s' '{"tool_name":"mcp__claude_ai_Notion__notion-create-pages","tool_input":{"pages":[{"properties":{"title":"UI 흐름도"}}]}}' | node hooks/stage-guard.js; echo "exit=$?"
```
Expected: `exit=2` and a stderr message mentioning "active stage는 1인데 2단계 산출물".

- [ ] **Step 4: Confirm bypass works**

```bash
printf '%s' '{"tool_name":"mcp__claude_ai_Notion__notion-create-pages","tool_input":{"pages":[{"properties":{"title":"UI 흐름도"}}]}}' | DEV_GUARD_BYPASS=1 node hooks/stage-guard.js; echo "exit=$?"
```
Expected: `exit=0` with a `bypass` warning on stderr.

- [ ] **Step 5: Confirm matching stage allows and updates produced**

```bash
node -e "const s=require('./hooks/lib/state');const r=process.cwd();const st=s.readState(r,'DCL-TEST');st.activeStage=2;st.activeSkill='skills/blueprint/ui-flow';s.writeState(r,'DCL-TEST',st);"
printf '%s' '{"tool_name":"mcp__claude_ai_Notion__notion-create-pages","tool_input":{"pages":[{"properties":{"title":"UI 흐름도"}}]}}' | node hooks/stage-guard.js; echo "exit=$?"
node -e "console.log(require('./hooks/lib/state').readState(process.cwd(),'DCL-TEST').stages['2'].produced)"
```
Expected: `exit=0`, then the last line prints `true`.

- [ ] **Step 6: Clean up test state**

```bash
rm -f .claude/active-task
rm -f .dev-work/DCL-TEST/state.json
```

- [ ] **Step 7: Note any discrepancies**

If any step's observed behavior diverges from expected, stop and open a bug task with the discrepancy before marking the plan complete. Do not patch silently.

---

## Self-Review Notes

**Spec coverage**
- §4 Architecture → Tasks 1, 2, 3, 5 wire it up end-to-end.
- §5.1 state files → Task 1 (lib), Task 5 (/dev writes), Task 2 (hook reads).
- §5.2 validate skill → Task 4 (full centralized rules).
- §5.3 hook logic → Task 2 + Task 3 (registration).
- §5.4 /dev modifications → Task 5.
- §5.5 cross-reference notes → Task 6.
- §6 flows → exercised in Task 9.
- §7 edge cases → covered by Task 2 tests (cases A, B, G = fail open; D = block; F = bypass) and Task 9 steps 2–5.
- §8 READMEs → Tasks 7 and 8.

**No placeholders**
- Every step ships runnable code or concrete prose. Large edits to `/dev` SKILL.md are specified as append/insert at named anchors rather than "TBD".

**Type / name consistency**
- Hook functions: `readActiveTask`, `writeActiveTask`, `clearActiveTask`, `readState`, `writeState`, `newEmptyState` — used identically across Tasks 1, 2, 9.
- `NOTION_STAGES = ['1','2','3','7']` (string keys) matches state.json shape throughout.
- `TITLE_TO_STAGE` entries: `기획서 검토→1`, `UI 흐름도→2`, `데이터 흐름도→3`, `QA 시트→7` — matches spec §5.3 table and validate skill rules.
