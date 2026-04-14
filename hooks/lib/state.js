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
