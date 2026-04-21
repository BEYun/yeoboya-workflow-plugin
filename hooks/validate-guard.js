#!/usr/bin/env node
// hooks/validate-guard.js
// PreToolUse hook: Notion 산출물 저장 전 단계별 규칙을 검증한다.
// 실패 시 exit 2로 쓰기를 차단해 불필요한 Notion API 호출을 막는다.
// page_id 캡처는 pageid-capture.js(PostToolUse)가 담당한다.
const { readActiveTask, readState, writeState } = require('./lib/state');

const TITLE_TO_STAGE = new Map([
  ['최종 기획서',  '2.2'],
  ['UI 흐름도',    '3.1'],
  ['데이터 흐름도','3.2'],
  ['기술 설계',    '3.3'],
  ['QA 시트',      '5.1'],
]);

// ── 텍스트·코드 추출 ────────────────────────────────────────────────────────

function extractText(blocks) {
  if (!Array.isArray(blocks)) return '';
  return blocks.map(block => {
    const type = block.type;
    let text = '';
    if (type && block[type]) {
      const c = block[type];
      if (Array.isArray(c.rich_text)) text += c.rich_text.map(t => t.plain_text ?? t.text?.content ?? '').join('');
      if (Array.isArray(c.text))      text += c.text.map(t => t.plain_text ?? t.text?.content ?? '').join('');
    }
    if (Array.isArray(block.children)) text += '\n' + extractText(block.children);
    return text;
  }).join('\n');
}

function extractCodeBlocks(blocks) {
  if (!Array.isArray(blocks)) return [];
  const result = [];
  for (const block of blocks) {
    if (block.type === 'code' && block.code) {
      const lang    = block.code.language ?? '';
      const content = (block.code.rich_text ?? []).map(t => t.plain_text ?? '').join('');
      result.push({ lang, content });
    }
    if (Array.isArray(block.children)) result.push(...extractCodeBlocks(block.children));
  }
  return result;
}

// ── 단계별 검증 규칙 ─────────────────────────────────────────────────────────

const VALIDATORS = {
  '2.1'(text) {
    if (!text.trim()) return fail('본문이 비어 있음');
    if (text.includes('검토 통과')) return pass();
    const ok =
      text.includes('상태 정의') &&
      text.includes('엣지 케이스') &&
      (text.includes('화면 흐름') || text.includes('화면 흐름 완전성')) &&
      (text.includes('인터랙션') || text.includes('인터랙션 명세'));
    return ok ? pass() : fail('4가지 관점 라벨 미충족 (상태 정의 / 엣지 케이스 / 화면 흐름 / 인터랙션)');
  },
  '2.2'(text) {
    if (!text.trim()) return fail('본문이 비어 있음');
    if (!text.includes('업로드 일시') && !/\d{4}-\d{2}-\d{2}T/.test(text))
      return fail('업로드 일시 또는 ISO 타임스탬프 없음');
    if (!text.includes('원본 자료'))
      return fail('원본 자료 섹션 없음');
    return pass();
  },
  '3.1'(text, codes) {
    const mermaid = codes.filter(c => c.lang === 'mermaid');
    if (!mermaid.length) return fail('mermaid 코드 블록 없음');
    if (!mermaid.some(c => c.content.includes('stateDiagram')))
      return fail('stateDiagram 키워드 없음');
    const arrows = (mermaid[0].content.match(/-->/g) ?? []).length;
    if (arrows < 1) return fail('상태 노드 연결(-->) 부족');
    return pass();
  },
  '3.2'(text, codes) {
    const mermaid = codes.filter(c => c.lang === 'mermaid');
    if (!mermaid.length) return fail('mermaid 코드 블록 없음');
    if (!mermaid.some(c => c.content.includes('sequenceDiagram')))
      return fail('sequenceDiagram 키워드 없음');
    const participants = (mermaid[0].content.match(/participant /g) ?? []).length;
    if (participants < 2) return fail('participant 선언 2개 미만');
    return pass();
  },
  '3.3'(text) {
    if (!text.trim()) return fail('본문이 비어 있음');
    const modeA = ['화면 구조', '데이터 모델', '상태 관리', 'API 연동', '비즈니스 로직', '엣지 케이스']
      .filter(h => text.includes(h)).length;
    const modeB = ['변경 배경', '기존 설계 요약', '변경 사항', '영향 범위']
      .filter(h => text.includes(h)).length;
    if (modeA >= 4 || modeB >= 3) return pass();
    return fail(`섹션 헤딩 부족 (모드A: ${modeA}/4, 모드B: ${modeB}/3)`);
  },
  '5.1'(text) {
    const missing = ['정상', '엣지', '회귀'].filter(k => !text.includes(k));
    if (!missing.length) return pass();
    return fail(`누락된 구분 키워드: ${missing.join(', ')}`);
  },
};

const pass = ()     => ({ pass: true });
const fail = (rule) => ({ pass: false, rule });

// ── 입력 파싱 ────────────────────────────────────────────────────────────────

function normalizeTitle(raw) {
  return typeof raw === 'string' ? raw.trim() : '';
}

function extractFromInput(toolName, toolInput) {
  if (toolName === 'mcp__claude_ai_Notion__notion-create-pages') {
    const pages = Array.isArray(toolInput?.pages) ? toolInput.pages
                : toolInput?.page ? [toolInput.page] : [];
    const p = pages[0] ?? {};
    return {
      title:  normalizeTitle(p?.properties?.title ?? p?.title ?? p?.name ?? ''),
      blocks: p?.children ?? [],
    };
  }
  if (toolName === 'mcp__claude_ai_Notion__notion-update-page') {
    return {
      title:  normalizeTitle(toolInput?.properties?.title ?? toolInput?.title ?? ''),
      blocks: toolInput?.children ?? [],
    };
  }
  return { title: '', blocks: [] };
}

// ── stdin 읽기 ───────────────────────────────────────────────────────────────

function readStdin() {
  return new Promise(resolve => {
    let data = '';
    process.stdin.on('data', c => (data += c));
    process.stdin.on('end', () => resolve(data));
  });
}

// ── 메인 ────────────────────────────────────────────────────────────────────

(async () => {
  const root = process.env.YB_ROOT || process.cwd();
  const raw  = await readStdin();
  let payload;
  try { payload = JSON.parse(raw); } catch { process.exit(0); }

  const toolName = payload.tool_name ?? '';
  if (!toolName.includes('notion-create-pages') && !toolName.includes('notion-update-page')) {
    process.exit(0);
  }

  const { title, blocks } = extractFromInput(toolName, payload.tool_input);
  const stage = TITLE_TO_STAGE.get(title);
  if (!stage) process.exit(0);

  const task  = readActiveTask(root);
  if (!task)  process.exit(0);

  const state = readState(root, task);
  if (!state) process.exit(0);

  const text   = extractText(blocks);
  const codes  = extractCodeBlocks(blocks);
  const validator = VALIDATORS[stage];
  const result = validator ? validator(text, codes) : { pass: true };

  if (result.pass) {
    state.stages[stage] = state.stages[stage] ?? {};
    state.stages[stage].validated = true;
    writeState(root, task, state);
    process.exit(0);
  }

  // 검증 실패 → Notion 쓰기 차단
  process.stderr.write(
    `[validate-guard] ${stage} 산출물 검증 실패 — ${result.rule}\n` +
    `내용을 수정한 뒤 다시 시도하세요.\n`
  );
  process.exit(2);
})();
