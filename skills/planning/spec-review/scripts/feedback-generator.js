#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

function main() {
  const jsonPath = process.argv[2];
  if (!jsonPath) {
    console.error('Usage: node scripts/feedback-generator.js <review-data.json>');
    process.exit(1);
  }

  if (!fs.existsSync(jsonPath)) {
    console.error(`Error: File not found: ${jsonPath}`);
    process.exit(1);
  }

  let data;
  try {
    data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  } catch (e) {
    console.error(`Error: Invalid JSON: ${jsonPath}`);
    console.error(e.message);
    process.exit(1);
  }

  const errors = validate(data);
  if (errors.length > 0) {
    console.error(`Error: review-data.json schema validation failed (${errors.length}):`);
    for (const err of errors) console.error(`  - ${err}`);
    process.exit(1);
  }

  const html = renderHTML(data);

  const outDir = path.dirname(jsonPath);
  const outPath = path.join(outDir, `${data.taskId}-feedback.html`);
  fs.writeFileSync(outPath, html, 'utf8');
  console.log(outPath);
}

const REQUIRED_ROOT = ['taskId', 'title', 'subtitle', 'reviewer', 'reviewDate', 'source', 'pages'];
const REQUIRED_PAGE = ['pageNumber', 'title', 'pass'];
const REQUIRED_ISSUE = ['type', 'severity', 'title', 'problem', 'suggestion'];
const VALID_TYPES = new Set(['state', 'edge', 'flow', 'interaction']);
const VALID_SEVERITIES = new Set(['critical', 'warn', 'info']);

function validate(data) {
  const errors = [];
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return ['root must be an object'];
  }
  for (const field of REQUIRED_ROOT) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      errors.push(`missing required field: ${field}`);
    }
  }
  if (!Array.isArray(data.pages)) {
    errors.push('pages must be an array');
    return errors;
  }
  data.pages.forEach((page, i) => {
    const loc = `pages[${i}]`;
    if (!page || typeof page !== 'object') {
      errors.push(`${loc}: must be an object`);
      return;
    }
    for (const field of REQUIRED_PAGE) {
      if (page[field] === undefined || page[field] === null || page[field] === '') {
        errors.push(`${loc}.${field}: missing`);
      }
    }
    if (typeof page.pass !== 'boolean') {
      errors.push(`${loc}.pass: must be boolean`);
    }
    if (page.pass === false) {
      if (!Array.isArray(page.issues) || page.issues.length === 0) {
        errors.push(`${loc}: pass=false requires at least one issue`);
      }
    }
    if (Array.isArray(page.issues)) {
      page.issues.forEach((issue, j) => {
        const iloc = `${loc}.issues[${j}]`;
        if (!issue || typeof issue !== 'object') {
          errors.push(`${iloc}: must be an object`);
          return;
        }
        for (const field of REQUIRED_ISSUE) {
          if (issue[field] === undefined || issue[field] === null || issue[field] === '') {
            errors.push(`${iloc}.${field}: missing`);
          }
        }
        if (issue.type && !VALID_TYPES.has(issue.type)) {
          errors.push(`${iloc}.type: must be one of ${[...VALID_TYPES].join('|')} (got "${issue.type}")`);
        }
        if (issue.severity && !VALID_SEVERITIES.has(issue.severity)) {
          errors.push(`${iloc}.severity: must be one of ${[...VALID_SEVERITIES].join('|')} (got "${issue.severity}")`);
        }
      });
    }
  });
  return errors;
}

const TYPE_META = {
  state:       { label: '상태 정의',   tagClass: 'tag-state',       countClass: 'count-state',       fillClass: 'fill-state',       summaryLabel: '상태 정의 미흡' },
  edge:        { label: '엣지 케이스', tagClass: 'tag-edge',        countClass: 'count-edge',        fillClass: 'fill-edge',        summaryLabel: '엣지 케이스 누락' },
  flow:        { label: '화면 흐름',   tagClass: 'tag-flow',        countClass: 'count-flow',        fillClass: 'fill-flow',        summaryLabel: '화면 흐름 미정의' },
  interaction: { label: '인터랙션',    tagClass: 'tag-interaction', countClass: 'count-interaction', fillClass: 'fill-interaction', summaryLabel: '인터랙션 미정의' },
};

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function computeStats(data) {
  const pagesCount = data.pages.length;
  const passes = data.pages.filter(p => p.pass).length;
  const issues = data.pages.reduce((sum, p) => sum + (p.issues ? p.issues.length : 0), 0);
  const pagesWithIssues = pagesCount - passes;
  const rate = pagesCount === 0 ? 0 : Math.round(pagesWithIssues / pagesCount * 100);
  return { issues, passes, pagesCount, rate };
}

function computeSummary(data) {
  const counts = { state: 0, edge: 0, flow: 0, interaction: 0 };
  for (const page of data.pages) {
    for (const issue of (page.issues || [])) {
      if (counts[issue.type] != null) counts[issue.type]++;
    }
  }
  const total = counts.state + counts.edge + counts.flow + counts.interaction;
  const pct = n => total === 0 ? 0 : Math.round(n / total * 100);
  return {
    state:       { count: counts.state,       width: pct(counts.state) },
    edge:        { count: counts.edge,        width: pct(counts.edge) },
    flow:        { count: counts.flow,        width: pct(counts.flow) },
    interaction: { count: counts.interaction, width: pct(counts.interaction) },
  };
}

function renderIssue(issue) {
  const meta = TYPE_META[issue.type] || TYPE_META.state;
  return `
      <div class="issue ${escapeHtml(issue.severity)}">
        <div class="issue-top">
          <span class="issue-tag ${meta.tagClass}">${escapeHtml(meta.label)}</span>
          <span class="issue-title">${escapeHtml(issue.title)}</span>
        </div>
        <div class="issue-problem">${escapeHtml(issue.problem)}</div>
        <div class="issue-suggestion"><strong>권장 →</strong> ${escapeHtml(issue.suggestion)}</div>
      </div>`;
}

function renderPage(page, index) {
  const delay = (0.05 + index * 0.05).toFixed(2);
  const badge = page.pass
    ? `<span class="page-badge badge-pass">PASS</span>`
    : `<span class="page-badge badge-issues">${page.issues.length}건</span>`;
  const body = page.pass
    ? `
      <div class="pass-card">
        <div class="pass-icon">✓</div>
        검토 통과 — ${escapeHtml(page.passReason || '')}
      </div>`
    : page.issues.map(renderIssue).join('\n');
  return `
    <section class="page-section" style="animation-delay: ${delay}s">
      <div class="page-header">
        <span class="page-number">${escapeHtml(page.pageNumber)}</span>
        <span class="page-title">${escapeHtml(page.title)}</span>
        ${badge}
      </div>${body}
    </section>`;
}

function renderSummaryItem(type, summary) {
  const meta = TYPE_META[type];
  const s = summary[type];
  return `
        <div class="summary-item">
          <div class="summary-item-header">
            <span class="summary-item-label">${escapeHtml(meta.summaryLabel)}</span>
            <span class="summary-item-count ${meta.countClass}">${s.count}건</span>
          </div>
          <div class="summary-bar"><div class="summary-bar-fill ${meta.fillClass}" style="width: ${s.width}%"></div></div>
        </div>`;
}

function renderHTML(data) {
  const stats = computeStats(data);
  const summary = computeSummary(data);
  const pagesHtml = data.pages.map((p, i) => renderPage(p, i)).join('\n');
  const summaryHtml = ['state', 'edge', 'flow', 'interaction']
    .map(t => renderSummaryItem(t, summary))
    .join('\n');

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(data.taskId)} 기획서 검토 피드백</title>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700;900&family=Playfair+Display:wght@700;900&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0a0a0b;
      --surface: #141416;
      --surface-raised: #1c1c20;
      --border: #2a2a30;
      --text: #e8e6e3;
      --text-muted: #8a8a8f;
      --text-dim: #5a5a60;
      --accent: #f0c040;
      --accent-glow: rgba(240, 192, 64, 0.15);
      --issue-critical: #ff6b6b;
      --issue-critical-bg: rgba(255, 107, 107, 0.08);
      --issue-critical-border: rgba(255, 107, 107, 0.3);
      --issue-warn: #ffa94d;
      --issue-warn-bg: rgba(255, 169, 77, 0.08);
      --issue-warn-border: rgba(255, 169, 77, 0.3);
      --issue-info: #74c0fc;
      --issue-info-bg: rgba(116, 192, 252, 0.08);
      --issue-info-border: rgba(116, 192, 252, 0.3);
      --pass: #51cf66;
      --pass-bg: rgba(81, 207, 102, 0.08);
      --pass-border: rgba(81, 207, 102, 0.3);
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Noto Sans KR', sans-serif; background: var(--bg); color: var(--text); line-height: 1.7; -webkit-font-smoothing: antialiased; }
    .hero { position: relative; padding: 80px 60px 60px; overflow: hidden; border-bottom: 1px solid var(--border); }
    .hero::before { content: ''; position: absolute; top: -200px; right: -100px; width: 600px; height: 600px; background: radial-gradient(circle, var(--accent-glow) 0%, transparent 70%); pointer-events: none; }
    .hero-label { font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: var(--accent); margin-bottom: 16px; }
    .hero-title { font-family: 'Playfair Display', serif; font-size: 48px; font-weight: 900; line-height: 1.1; margin-bottom: 12px; background: linear-gradient(135deg, var(--text) 0%, var(--text-muted) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .hero-subtitle { font-size: 18px; color: var(--text-muted); font-weight: 300; margin-bottom: 40px; }
    .hero-meta { display: flex; gap: 40px; font-size: 13px; color: var(--text-dim); }
    .hero-meta span { display: flex; align-items: center; gap: 8px; }
    .hero-meta .label { color: var(--text-muted); font-weight: 500; }
    .stats-bar { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; background: var(--border); border-bottom: 1px solid var(--border); }
    .stat { background: var(--surface); padding: 28px 32px; text-align: center; }
    .stat-number { font-family: 'Playfair Display', serif; font-size: 36px; font-weight: 900; margin-bottom: 4px; }
    .stat-number.issues { color: var(--issue-critical); }
    .stat-number.passes { color: var(--pass); }
    .stat-number.pages { color: var(--accent); }
    .stat-number.rate { color: var(--issue-warn); }
    .stat-label { font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: var(--text-dim); }
    .content { max-width: 920px; margin: 0 auto; padding: 60px 40px; }
    .page-section { margin-bottom: 48px; animation: fadeUp 0.5s ease-out both; }
    @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    .page-header { display: flex; align-items: baseline; gap: 16px; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 1px solid var(--border); }
    .page-number { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--accent); background: var(--accent-glow); padding: 4px 10px; border-radius: 4px; white-space: nowrap; }
    .page-title { font-size: 16px; font-weight: 700; color: var(--text); }
    .page-badge { margin-left: auto; font-family: 'JetBrains Mono', monospace; font-size: 11px; padding: 3px 10px; border-radius: 20px; white-space: nowrap; }
    .badge-issues { color: var(--issue-critical); background: var(--issue-critical-bg); border: 1px solid var(--issue-critical-border); }
    .badge-pass { color: var(--pass); background: var(--pass-bg); border: 1px solid var(--pass-border); }
    .issue { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 20px 24px; margin-bottom: 12px; position: relative; transition: border-color 0.2s; }
    .issue:hover { border-color: var(--text-dim); }
    .issue::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; border-radius: 8px 0 0 8px; }
    .issue.critical::before { background: var(--issue-critical); }
    .issue.warn::before { background: var(--issue-warn); }
    .issue.info::before { background: var(--issue-info); }
    .issue-top { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
    .issue-tag { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 1px; text-transform: uppercase; padding: 3px 8px; border-radius: 3px; font-weight: 500; }
    .tag-state { color: var(--issue-critical); background: var(--issue-critical-bg); }
    .tag-edge { color: var(--issue-warn); background: var(--issue-warn-bg); }
    .tag-flow { color: var(--issue-info); background: var(--issue-info-bg); }
    .tag-interaction { color: #da77f2; background: rgba(218, 119, 242, 0.08); }
    .issue-title { font-size: 14px; font-weight: 700; color: var(--text); }
    .issue-problem { font-size: 13px; color: var(--text-muted); margin-bottom: 12px; padding-left: 16px; border-left: 2px solid var(--border); }
    .issue-suggestion { font-size: 13px; color: var(--pass); background: var(--pass-bg); border: 1px solid var(--pass-border); padding: 12px 16px; border-radius: 6px; }
    .issue-suggestion strong { color: var(--pass); font-weight: 700; }
    .pass-card { background: var(--surface); border: 1px solid var(--pass-border); border-radius: 8px; padding: 16px 24px; display: flex; align-items: center; gap: 12px; color: var(--pass); font-weight: 500; }
    .pass-icon { width: 24px; height: 24px; border-radius: 50%; background: var(--pass-bg); border: 2px solid var(--pass); display: flex; align-items: center; justify-content: center; font-size: 12px; flex-shrink: 0; }
    .summary-section { margin-top: 60px; padding-top: 40px; border-top: 1px solid var(--border); }
    .summary-title { font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: var(--accent); margin-bottom: 24px; }
    .summary-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
    .summary-item { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 20px; }
    .summary-item-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
    .summary-item-label { font-size: 13px; color: var(--text-muted); }
    .summary-item-count { font-family: 'JetBrains Mono', monospace; font-size: 20px; font-weight: 700; }
    .count-state { color: var(--issue-critical); }
    .count-edge { color: var(--issue-warn); }
    .count-flow { color: var(--issue-info); }
    .count-interaction { color: #da77f2; }
    .summary-bar { height: 3px; background: var(--border); border-radius: 2px; overflow: hidden; }
    .summary-bar-fill { height: 100%; border-radius: 2px; transition: width 1s ease; }
    .fill-state { background: var(--issue-critical); }
    .fill-edge { background: var(--issue-warn); }
    .fill-flow { background: var(--issue-info); }
    .fill-interaction { background: #da77f2; }
    .footer { text-align: center; padding: 40px; font-size: 12px; color: var(--text-dim); border-top: 1px solid var(--border); }
    @media print { body { background: white; color: #1a1a1a; } .hero::before { display: none; } .issue { break-inside: avoid; } }
  </style>
</head>
<body>

  <header class="hero">
    <div class="hero-label">Spec Review Feedback</div>
    <h1 class="hero-title">${escapeHtml(data.title)}</h1>
    <p class="hero-subtitle">${escapeHtml(data.subtitle)}</p>
    <div class="hero-meta">
      <span><span class="label">작업번호</span> ${escapeHtml(data.taskId)}</span>
      <span><span class="label">검토자</span> ${escapeHtml(data.reviewer)}</span>
      <span><span class="label">검토일</span> ${escapeHtml(data.reviewDate)}</span>
      <span><span class="label">원본</span> ${escapeHtml(data.source)}</span>
    </div>
  </header>

  <div class="stats-bar">
    <div class="stat"><div class="stat-number issues">${stats.issues}</div><div class="stat-label">이슈</div></div>
    <div class="stat"><div class="stat-number passes">${stats.passes}</div><div class="stat-label">통과</div></div>
    <div class="stat"><div class="stat-number pages">${stats.pagesCount}</div><div class="stat-label">검토 페이지</div></div>
    <div class="stat"><div class="stat-number rate">${stats.rate}%</div><div class="stat-label">이슈 발견율</div></div>
  </div>

  <main class="content">
${pagesHtml}

    <section class="summary-section">
      <div class="summary-title">이슈 유형별 분포</div>
      <div class="summary-grid">
${summaryHtml}
      </div>
    </section>

  </main>

  <footer class="footer">
    Generated by /dev spec-review · yeoboya-workflow plugin
  </footer>

</body>
</html>`;
}

main();
