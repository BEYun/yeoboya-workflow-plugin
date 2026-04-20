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
  ['기획서 검토', '2.1'],
  ['최종 기획서', '2.2'],
  ['UI 흐름도', '3.1'],
  ['데이터 흐름도', '3.2'],
  ['기술 설계', '3.3'],
  ['QA 시트', '5.1'],
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
    // Notion 산출물 스텝은 모두 done/validated/artifactPageId 구조
    if (!state.stages[stageForTitle]) state.stages[stageForTitle] = { done: false, validated: false, artifactPageId: null };
    state.stages[stageForTitle].done = true;
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
