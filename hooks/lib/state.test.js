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
