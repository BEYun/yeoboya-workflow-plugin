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
