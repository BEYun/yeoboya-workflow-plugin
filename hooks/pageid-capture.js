#!/usr/bin/env node
// hooks/pageid-capture.js
// PostToolUse hook: Notion 산출물 저장 성공 후 page_id를 state.json에 기록한다.
const { readActiveTask, readState, writeState } = require('./lib/state');

const TITLE_TO_STAGE = new Map([
  ['최종 기획서',  '2.2'],
  ['UI 흐름도',    '3.1'],
  ['데이터 흐름도','3.2'],
  ['기술 설계',    '3.3'],
  ['QA 시트',      '5.1'],
]);

function normalizeTitle(raw) {
  return typeof raw === 'string' ? raw.trim() : '';
}

function extractTitle(toolName, toolInput) {
  if (toolName === 'mcp__claude_ai_Notion__notion-create-pages') {
    const pages = Array.isArray(toolInput?.pages) ? toolInput.pages
                : toolInput?.page ? [toolInput.page] : [];
    const p = pages[0] ?? {};
    return normalizeTitle(p?.properties?.title ?? p?.title ?? p?.name ?? '');
  }
  if (toolName === 'mcp__claude_ai_Notion__notion-update-page') {
    return normalizeTitle(toolInput?.properties?.title ?? toolInput?.title ?? '');
  }
  return '';
}

function extractPageId(toolResponse) {
  try {
    const r = typeof toolResponse === 'string' ? JSON.parse(toolResponse) : toolResponse;
    return r?.id ?? r?.page_id ?? r?.results?.[0]?.id ?? null;
  } catch { return null; }
}

function readStdin() {
  return new Promise(resolve => {
    let data = '';
    process.stdin.on('data', c => (data += c));
    process.stdin.on('end', () => resolve(data));
  });
}

(async () => {
  const root = process.env.YB_ROOT || process.cwd();
  const raw  = await readStdin();
  let payload;
  try { payload = JSON.parse(raw); } catch { process.exit(0); }

  const toolName = payload.tool_name ?? '';
  if (!toolName.includes('notion-create-pages') && !toolName.includes('notion-update-page')) {
    process.exit(0);
  }

  const title = extractTitle(toolName, payload.tool_input);
  const stage = TITLE_TO_STAGE.get(title);
  if (!stage) process.exit(0);

  const pageId = extractPageId(payload.tool_response);
  if (!pageId) process.exit(0);

  const task  = readActiveTask(root);
  if (!task)  process.exit(0);

  const state = readState(root, task);
  if (!state) process.exit(0);

  state.stages[stage] = state.stages[stage] ?? {};
  state.stages[stage].done           = true;
  state.stages[stage].artifactPageId = pageId;
  writeState(root, task, state);

  process.exit(0);
})();
