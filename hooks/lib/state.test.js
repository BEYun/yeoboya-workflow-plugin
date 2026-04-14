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
  const leftover = fs.readdirSync(dir).filter((n) => n.startsWith('state.json.tmp-'));
  assert.strictEqual(leftover.length, 0);

  console.log('state.test.js: OK');
});

// writeState must not mutate caller's object
withTempRoot((root) => {
  const s = newEmptyState('DCL-2');
  // Pin lastUpdated to a known past value so it is guaranteed distinct from the
  // timestamp writeState will stamp on the written copy.
  s.lastUpdated = '2000-01-01T00:00:00.000Z';
  const beforeStamp = s.lastUpdated;
  const beforeKeys = Object.keys(s).slice();
  writeState(root, 'DCL-2', s);
  assert.strictEqual(s.lastUpdated, beforeStamp, 'caller object lastUpdated was mutated');
  assert.deepStrictEqual(Object.keys(s), beforeKeys, 'caller object key set was mutated');
  // And the file on disk should have a fresh timestamp
  const loaded = readState(root, 'DCL-2');
  assert.notStrictEqual(loaded.lastUpdated, beforeStamp, 'file should have fresh timestamp');
});

// readState returns null on corrupt JSON (spec §7: fail open)
withTempRoot((root) => {
  const dir = path.join(root, '.dev-work', 'DCL-3');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'state.json'), '{ not valid json');
  assert.strictEqual(readState(root, 'DCL-3'), null);
});
