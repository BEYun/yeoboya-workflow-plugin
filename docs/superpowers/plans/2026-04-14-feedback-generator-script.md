# feedback-generator Script Conversion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert feedback-generator from SKILL.md (Claude generates HTML each time) to a Node.js script (deterministic HTML output from JSON input).

**Architecture:** Pure Node.js script (no npm dependencies) reads JSON from `.dev-work/<taskId>/review-data.json`, assembles HTML string from hardcoded template, writes to `.dev-work/<taskId>/<taskId>-feedback.html`. spec-review SKILL.md is updated to save JSON and invoke the script. The old feedback-generator skill directory is deleted.

**Tech Stack:** Node.js (fs, path only). No test framework — verification is done by running the script against a fixture JSON and diffing the output against the existing reference HTML.

**Reference design:** `docs/superpowers/specs/2026-04-14-feedback-generator-script-design.md`

**Reference HTML output:** `.dev-work/DCL-TEST/DCL-TEST-feedback-v2.html`

---

## File Structure

**Create:**
- `scripts/feedback-generator.js` — Main script. Reads JSON arg, assembles HTML, writes file.
- `.dev-work/DCL-TEST/review-data.json` — Fixture. Reverse-engineered from the reference HTML. Used for verification.

**Modify:**
- `skills/planning/spec-review/SKILL.md` — Replace the "피드백 PDF 생성" section with JSON-save + script-invocation instructions.

**Delete:**
- `skills/planning/feedback-generator/` — Entire directory (SKILL.md).

---

## Task 1: Create the fixture JSON from reference HTML

**Files:**
- Create: `.dev-work/DCL-TEST/review-data.json`

This fixture mirrors the 15 issues + 3 passes across 8 page sections shown in `.dev-work/DCL-TEST/DCL-TEST-feedback-v2.html`. It's used to verify the script produces matching output.

- [ ] **Step 1: Write the fixture JSON**

Create `.dev-work/DCL-TEST/review-data.json` with this exact content:

```json
{
  "taskId": "DCL-TEST",
  "title": "달라 쿠킹클래스",
  "subtitle": "26.05 이벤트 기획서 v0.2 — UI/UX 명세 완성도 검토",
  "reviewer": "윤병은",
  "reviewDate": "2026. 04. 13",
  "source": "26.05_달라_쿠킹클래스ver0.2.pdf",
  "pages": [
    {
      "pageNumber": "p.1–2",
      "title": "표지 / 버전관리",
      "pass": true,
      "passReason": "문서 버전, 작성자, 변경 내용 명확히 기술됨",
      "issues": []
    },
    {
      "pageNumber": "p.3",
      "title": "이벤트 내용 — 재료 획득 / 케이크 만들기 / 랭킹 / 선물",
      "pass": false,
      "issues": [
        {
          "type": "state",
          "severity": "critical",
          "title": "재료 획득 시 UI 상태 미정의",
          "problem": "재료 랜덤 지급 시 어떤 화면이 표시되는지 없음. 획득 결과(어떤 재료를 얻었는지), 조건 미달 시 안내 화면이 정의되지 않음.",
          "suggestion": "재료 획득 결과 팝업/토스트 UI 정의. 조건 미달(좋아요 10개 미만 등) 시 안내 화면 추가."
        },
        {
          "type": "edge",
          "severity": "warn",
          "title": "선물 수령 제한 초과 시 동작 미정의",
          "problem": "\"1일 1케이크까지 선물 받을 수 있음\"이지만, 이미 오늘 선물 받은 사용자에게 보낼 때 어떤 일이 일어나는지 없음.",
          "suggestion": "선물 버튼 비활성화 또는 \"이미 오늘 케이크를 받은 사용자입니다\" 안내 팝업 정의."
        },
        {
          "type": "edge",
          "severity": "warn",
          "title": "재료 부족 시 케이크 만들기 동작",
          "problem": "\"재료 10개씩 모았을 때 수동 생성\"이지만, 부족한 상태의 만들기 버튼 동작이 없음.",
          "suggestion": "만들기 버튼 비활성화 + \"재료가 부족합니다 (밀가루 3/10)\" 부족 현황 표시."
        },
        {
          "type": "interaction",
          "severity": "info",
          "title": "교차 선물 UI 흐름 미기술",
          "problem": "\"BJ/팬 부문 교차 선물 가능\"이지만, 선물 대상 선택 → 확인 → 결과 흐름이 없음.",
          "suggestion": "대상 선택(팔로워/팔로잉) → 케이크 선택 → 확인 팝업 → 성공/실패 화면 흐름 추가."
        }
      ]
    },
    {
      "pageNumber": "p.4",
      "title": "추가 보너스 지급 / 보상 구조",
      "pass": false,
      "issues": [
        {
          "type": "state",
          "severity": "critical",
          "title": "스탬프 미달 상태 표시 미정의",
          "problem": "\"7개 이상 스탬프 시 보너스\"이지만, 7개 미만일 때 사용자에게 어떻게 보이는지(진행률, 남은 일수 안내) 없음.",
          "suggestion": "스탬프 진행 바 또는 \"3/7일 달성! 4일 더 참여하면 보너스!\" 동기부여 UI 정의."
        },
        {
          "type": "edge",
          "severity": "warn",
          "title": "스탬프 조건 \"n개\" — placeholder 미확정",
          "problem": "\"직접 만든 케이크가 n개 이상일 때 스탬프\"에서 n값이 미정. 개발 시 기준값을 알 수 없음.",
          "suggestion": "확정값 기재, 또는 어드민에서 설정 가능한 값인지 명시."
        }
      ]
    },
    {
      "pageNumber": "p.5",
      "title": "메인 화면 UI — BJ 부문 / FAN 부문",
      "pass": false,
      "issues": [
        {
          "type": "flow",
          "severity": "info",
          "title": "탭 전환 시 데이터 갱신 방식 미정의",
          "problem": "BJ/FAN 부문 탭 전환 시 데이터 새로고침인지 캐시 유지인지 정의 없음.",
          "suggestion": "탭 전환 시 데이터 로딩 정책 명시 (매번 새로고침 / 캐시 유지 시간)."
        },
        {
          "type": "state",
          "severity": "critical",
          "title": "이벤트 시작 전 / 종료 후 화면 미정의",
          "problem": "이벤트 기간이 placeholder이며, 기간 밖에서 접근 시 화면 상태가 없음.",
          "suggestion": "시작 전(카운트다운 또는 \"곧 시작\"), 종료 후(\"이벤트 종료\" 결과 확인) 화면 정의."
        },
        {
          "type": "state",
          "severity": "critical",
          "title": "로딩 / 에러 / 빈 상태 미정의",
          "problem": "메인 화면의 로딩(스켈레톤? 스피너?), 네트워크 에러, 랭킹 데이터 없음 상태 전부 없음.",
          "suggestion": "로딩 스켈레톤 UI, 네트워크 에러 시 재시도 화면, 랭킹 빈 상태 화면 정의."
        }
      ]
    },
    {
      "pageNumber": "p.6",
      "title": "랭킹 화면 / 유의사항",
      "pass": true,
      "passReason": "유의사항 항목 명확히 기술됨",
      "issues": []
    },
    {
      "pageNumber": "p.7",
      "title": "미니 챌린지 — 매일 매일 케이크 만들기",
      "pass": false,
      "issues": [
        {
          "type": "interaction",
          "severity": "info",
          "title": "케이크 만들기 인터랙션 미정의",
          "problem": "만들기 버튼 탭 시 어떤 인터랙션이 발생하는지(애니메이션? 즉시? 확인 팝업?) 없음.",
          "suggestion": "버튼 탭 → 제작 애니메이션(선택) → 완성 결과 화면 흐름 정의."
        },
        {
          "type": "edge",
          "severity": "warn",
          "title": "\"n판\" placeholder 미확정",
          "problem": "\"하루에 n판 이상 케이크를 만들면 참여 완료\"에서 n값 미정.",
          "suggestion": "확정값 기재 또는 어드민 설정 여부 명시."
        }
      ]
    },
    {
      "pageNumber": "p.8",
      "title": "방송방 보너스 타임",
      "pass": false,
      "issues": [
        {
          "type": "flow",
          "severity": "info",
          "title": "보너스 타임 발동 → 재료 획득 흐름 미정의",
          "problem": "\"1,000달 마다 보너스 타임 발동\" 시 화면 표시 방식과 재료 12개 \"뿌리는\" UI 형태가 없음.",
          "suggestion": "발동 알림(배너? 팝업? 오버레이?), 재료 획득 애니메이션/인터랙션 정의."
        },
        {
          "type": "interaction",
          "severity": "info",
          "title": "재료 획득 방법 미명세",
          "problem": "\"인원수에 관계 없이 각각 획득\"이지만, 탭 수령인지 자동 지급인지 없음.",
          "suggestion": "자동 지급 / 화면 내 재료 아이콘 탭 방식 중 택 1 명확히 정의."
        }
      ]
    },
    {
      "pageNumber": "p.9",
      "title": "재료 디자인 — 기본 / 1주차 / 2주차",
      "pass": true,
      "passReason": "디자인 리소스 정의 완료",
      "issues": []
    },
    {
      "pageNumber": "p.10–12",
      "title": "어드민 — 회차 등록 / 통계 / 데이터 필드",
      "pass": false,
      "issues": [
        {
          "type": "flow",
          "severity": "info",
          "title": "회차 등록 상세 흐름 미정의",
          "problem": "\"4회차, 5회차 등록\" 화면이 있지만, 입력 필드, 저장 확인, 결과 피드백 없음.",
          "suggestion": "등록 입력 폼 필드 목록, 저장 확인 팝업, 성공/실패 피드백 추가."
        },
        {
          "type": "state",
          "severity": "critical",
          "title": "어드민 통계 화면 상태 미정의",
          "problem": "통계 데이터 로딩 중, 데이터 없음, 에러 시 화면 상태 없음.",
          "suggestion": "로딩 상태, \"데이터가 없습니다\" 빈 상태, 에러 시 안내 화면 정의."
        }
      ]
    }
  ]
}
```

- [ ] **Step 2: Validate JSON parses**

Run: `node -e "JSON.parse(require('fs').readFileSync('.dev-work/DCL-TEST/review-data.json', 'utf8')); console.log('OK')"`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add .dev-work/DCL-TEST/review-data.json
git commit -m "test: add review-data fixture for feedback-generator script"
```

---

## Task 2: Create the script skeleton (CLI arg parsing + error handling)

**Files:**
- Create: `scripts/feedback-generator.js`

Sets up the script entry point with arg validation and error handling. Does not yet emit HTML — that's added in Task 3.

- [ ] **Step 1: Create the script skeleton**

Create `scripts/feedback-generator.js`:

```javascript
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

  const html = renderHTML(data);

  const outDir = path.dirname(jsonPath);
  const outPath = path.join(outDir, `${data.taskId}-feedback.html`);
  fs.writeFileSync(outPath, html, 'utf8');
  console.log(outPath);
}

function renderHTML(data) {
  // TODO: implemented in Task 3
  return '<!DOCTYPE html><html><body>placeholder</body></html>';
}

main();
```

- [ ] **Step 2: Verify missing-arg error**

Run: `node scripts/feedback-generator.js`
Expected: stderr `Usage: node scripts/feedback-generator.js <review-data.json>`, exit 1

- [ ] **Step 3: Verify missing-file error**

Run: `node scripts/feedback-generator.js /tmp/does-not-exist.json`
Expected: stderr `Error: File not found: /tmp/does-not-exist.json`, exit 1

- [ ] **Step 4: Verify invalid-JSON error**

Run:
```bash
echo '{ broken' > /tmp/bad.json && node scripts/feedback-generator.js /tmp/bad.json; rm /tmp/bad.json
```
Expected: stderr starts with `Error: Invalid JSON: /tmp/bad.json`, exit 1

- [ ] **Step 5: Verify happy path (with placeholder HTML)**

Run: `node scripts/feedback-generator.js .dev-work/DCL-TEST/review-data.json`
Expected: stdout `.dev-work/DCL-TEST/DCL-TEST-feedback.html`, exit 0. Verify the file was created:
```bash
test -f .dev-work/DCL-TEST/DCL-TEST-feedback.html && echo EXISTS
```
Expected: `EXISTS`

- [ ] **Step 6: Commit**

```bash
git add scripts/feedback-generator.js
git commit -m "feat: add feedback-generator script skeleton with arg handling"
```

---

## Task 3: Implement HTML rendering

**Files:**
- Modify: `scripts/feedback-generator.js` (replace `renderHTML` stub)

Implements the full HTML assembly. The output must match `.dev-work/DCL-TEST/DCL-TEST-feedback-v2.html` when given the Task 1 fixture as input.

**Design mapping (from spec):**

| JSON `type` | 한글 label | CSS tag class |
|-------------|-----------|---------------|
| state | 상태 정의 | tag-state |
| edge | 엣지 케이스 | tag-edge |
| flow | 화면 흐름 | tag-flow |
| interaction | 인터랙션 | tag-interaction |

| JSON `severity` | Issue card class |
|-----------------|------------------|
| critical | critical |
| warn | warn |
| info | info |

**Stats computation:**
- `issues` = sum of `issues.length` across all pages
- `passes` = count of pages where `pass === true`
- `pagesCount` = `pages.length`
- `rate` = `Math.round(pagesWithIssues / pagesCount * 100)` where `pagesWithIssues = pagesCount - passes`

**Summary computation:** For each of the 4 types, count issues with that `type`. Each bar's `width` = `Math.round(count / totalIssues * 100)%`.

**Escaping:** All user-provided strings (title, subtitle, problem, suggestion, etc.) must be HTML-escaped. Issue/page data can contain characters like `<`, `>`, `&`, `"`.

- [ ] **Step 1: Replace the stub with the full renderHTML implementation**

Replace the `renderHTML` function in `scripts/feedback-generator.js` with this implementation. Keep the rest of the file identical to Task 2.

```javascript
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
```

- [ ] **Step 2: Generate HTML from the fixture**

Run: `node scripts/feedback-generator.js .dev-work/DCL-TEST/review-data.json`
Expected: stdout `.dev-work/DCL-TEST/DCL-TEST-feedback.html`, exit 0.

- [ ] **Step 3: Verify generated HTML has expected structure**

Run these checks:
```bash
grep -c 'class="page-section"' .dev-work/DCL-TEST/DCL-TEST-feedback.html
```
Expected: `9` (8 content sections + 1 CSS keyframe ref — actually check: 8, since keyframe doesn't contain class="page-section"). Adjust expectation to `8`.

```bash
grep -c 'class="issue ' .dev-work/DCL-TEST/DCL-TEST-feedback.html
```
Expected: `15`

```bash
grep -c 'class="pass-card"' .dev-work/DCL-TEST/DCL-TEST-feedback.html
```
Expected: `3`

```bash
grep -E 'stat-number issues">[0-9]+' .dev-work/DCL-TEST/DCL-TEST-feedback.html
```
Expected: matches `<div class="stat-number issues">15</div>`

```bash
grep -E 'stat-number passes">[0-9]+' .dev-work/DCL-TEST/DCL-TEST-feedback.html
```
Expected: matches `<div class="stat-number passes">3</div>`

```bash
grep -E 'stat-number pages">[0-9]+' .dev-work/DCL-TEST/DCL-TEST-feedback.html
```
Expected: matches `<div class="stat-number pages">9</div>` (9 page entries in fixture).

```bash
grep -E 'stat-number rate">[0-9]+%' .dev-work/DCL-TEST/DCL-TEST-feedback.html
```
Expected: matches `67%` (6 pages with issues out of 9 = 66.67% → rounds to 67%).

Note: the reference HTML shows 12 pages / 83% because it lists `p.10-12` as one entry but counts as 3 pages. Our fixture treats it as 1 entry → 9 total. This is a known, intentional simplification.

- [ ] **Step 4: Visually compare in browser (manual)**

Run: `open .dev-work/DCL-TEST/DCL-TEST-feedback.html`
Visually compare against `open .dev-work/DCL-TEST/DCL-TEST-feedback-v2.html`. Both should look identical except the stats numbers (15/3/9/67% vs 15/3/12/83%). Layout, colors, fonts, animations must match exactly.

If anything visually differs beyond the stats numbers, fix it and re-run Step 2-4.

- [ ] **Step 5: Commit**

```bash
git add scripts/feedback-generator.js .dev-work/DCL-TEST/DCL-TEST-feedback.html
git commit -m "feat: implement HTML rendering in feedback-generator script"
```

---

## Task 4: Update spec-review SKILL.md

**Files:**
- Modify: `skills/planning/spec-review/SKILL.md` (lines 74-78 region, within "사용자 확인 후" section)

Replace the feedback-generator-skill invocation with JSON-save + script-invocation instructions.

- [ ] **Step 1: Replace the "피드백 PDF 생성" section**

In `skills/planning/spec-review/SKILL.md`, find this block:

```markdown
### 피드백 PDF 생성
**skills/planning/feedback-generator** 스킬을 사용하여:
- 검토 결과를 다크 에디토리얼 스타일 HTML로 생성
- `.dev-work/[작업번호]/[작업번호]-feedback.html` 저장
- PDF 변환 시도
```

Replace it with:

```markdown
### 피드백 HTML 생성

1. 검토 결과를 JSON 스키마(아래)에 맞춰 `.dev-work/[작업번호]/review-data.json`에 저장한다.
2. Node.js 설치 여부를 확인한다 (`which node`).
3. Node.js가 없으면 사용자에게 안내:
   ```
   Node.js가 필요합니다. https://nodejs.org 에서 설치 후 다시 시도하세요.
   ```
4. 스크립트를 실행한다:
   ```bash
   node scripts/feedback-generator.js .dev-work/[작업번호]/review-data.json
   ```
5. 생성 완료를 사용자에게 안내:
   ```
   피드백 HTML이 생성되었습니다: .dev-work/[작업번호]/[작업번호]-feedback.html
   브라우저에서 열어 Cmd+P로 PDF 변환할 수 있습니다.
   ```

#### review-data.json 스키마

```json
{
  "taskId": "DCL-1351",
  "title": "문서 제목",
  "subtitle": "부제목 (버전, 검토 목적)",
  "reviewer": "검토자 이름 (dev-config.json의 worker)",
  "reviewDate": "YYYY. MM. DD",
  "source": "원본 PDF 파일명",
  "pages": [
    {
      "pageNumber": "p.3",
      "title": "화면/섹션 이름",
      "pass": false,
      "issues": [
        {
          "type": "state|edge|flow|interaction",
          "severity": "critical|warn|info",
          "title": "이슈 제목",
          "problem": "문제점 설명",
          "suggestion": "권장 수정사항"
        }
      ]
    },
    {
      "pageNumber": "p.5",
      "title": "화면/섹션 이름",
      "pass": true,
      "passReason": "통과 사유",
      "issues": []
    }
  ]
}
```

**type → severity 권장 매핑:** `state` → `critical`, `edge` → `warn`, `flow`/`interaction` → `info`
```

- [ ] **Step 2: Verify the edit**

Run:
```bash
grep -c "node scripts/feedback-generator.js" skills/planning/spec-review/SKILL.md
```
Expected: `1`

```bash
grep -c "feedback-generator 스킬" skills/planning/spec-review/SKILL.md
```
Expected: `0` (old reference removed)

- [ ] **Step 3: Commit**

```bash
git add skills/planning/spec-review/SKILL.md
git commit -m "refactor: update spec-review to invoke feedback-generator script"
```

---

## Task 5: Delete the old feedback-generator skill

**Files:**
- Delete: `skills/planning/feedback-generator/` (entire directory)

The skill has been replaced by the script. Any README in the planning category that references it should be checked.

- [ ] **Step 1: Check for references to feedback-generator skill outside the skill dir**

Run:
```bash
grep -rn "skills/planning/feedback-generator" . --include="*.md" | grep -v "^./skills/planning/feedback-generator/" | grep -v "^./docs/superpowers/"
```
Expected: either no results, OR results only in README files that should be updated.

If the planning category README (`skills/planning/README.md`) references feedback-generator, note the file paths — they'll be updated in Step 2.

- [ ] **Step 2: Update planning/README.md if it lists feedback-generator**

Read `skills/planning/README.md`. If it contains an entry for feedback-generator, remove that entry and any description referencing it. If the file doesn't reference it, skip this step.

- [ ] **Step 3: Delete the skill directory**

Run:
```bash
rm -rf skills/planning/feedback-generator
```

Verify:
```bash
test ! -d skills/planning/feedback-generator && echo DELETED
```
Expected: `DELETED`

- [ ] **Step 4: Commit**

```bash
git add -A skills/planning/
git commit -m "refactor: remove feedback-generator skill (replaced by script)"
```

---

## Task 6: End-to-end verification

- [ ] **Step 1: Simulate the full flow from a clean state**

Remove the generated HTML and re-run:
```bash
rm .dev-work/DCL-TEST/DCL-TEST-feedback.html
node scripts/feedback-generator.js .dev-work/DCL-TEST/review-data.json
test -f .dev-work/DCL-TEST/DCL-TEST-feedback.html && echo OK
```
Expected: `.dev-work/DCL-TEST/DCL-TEST-feedback.html` then `OK`

- [ ] **Step 2: Check determinism — run twice and diff**

```bash
node scripts/feedback-generator.js .dev-work/DCL-TEST/review-data.json
cp .dev-work/DCL-TEST/DCL-TEST-feedback.html /tmp/run1.html
node scripts/feedback-generator.js .dev-work/DCL-TEST/review-data.json
diff /tmp/run1.html .dev-work/DCL-TEST/DCL-TEST-feedback.html && echo DETERMINISTIC
rm /tmp/run1.html
```
Expected: `DETERMINISTIC` (no diff output)

- [ ] **Step 3: Spot-check with modified fixture**

Temporarily modify a field in the fixture and verify it propagates:
```bash
node -e "const f='.dev-work/DCL-TEST/review-data.json';const d=JSON.parse(require('fs').readFileSync(f));d.reviewer='테스트작업자';require('fs').writeFileSync('/tmp/review-data-mod.json',JSON.stringify(d))"
node scripts/feedback-generator.js /tmp/review-data-mod.json
grep -c "테스트작업자" .dev-work/DCL-TEST/DCL-TEST-feedback.html
rm /tmp/review-data-mod.json
```
Expected: output shows path, grep shows `1`.

After verification, restore the original output:
```bash
node scripts/feedback-generator.js .dev-work/DCL-TEST/review-data.json
```

- [ ] **Step 4: Final commit (if anything changed)**

```bash
git status
```
If `.dev-work/DCL-TEST/DCL-TEST-feedback.html` was modified:
```bash
git add .dev-work/DCL-TEST/DCL-TEST-feedback.html
git commit -m "test: regenerate feedback HTML fixture"
```
Otherwise skip.

---

## Self-Review Checklist (completed inline)

**Spec coverage:**
- JSON schema (Task 1 fixture, Task 4 SKILL.md schema block) ✅
- Node.js script + error handling (Task 2) ✅
- HTML rendering with all dynamic data (Task 3) ✅
- spec-review SKILL.md update (Task 4) ✅
- Delete old skill dir (Task 5) ✅
- End-to-end verification (Task 6) ✅

**Placeholder scan:** No TBD/TODO strings. The `renderHTML` stub in Task 2 is explicitly marked and replaced in Task 3. ✅

**Type consistency:** `type` values (state/edge/flow/interaction) and `severity` values (critical/warn/info) used consistently across Tasks 1, 3, 4. Function names (`renderHTML`, `computeStats`, etc.) appear only in Task 3. ✅

**Known deviation from reference HTML:** The reference HTML used `pages: 12, rate: 83%` because `p.10–12` counts as 3 pages. Our JSON fixture treats it as 1 entry, producing `pages: 9, rate: 67%`. This is intentional — the input data is what it is, and spec-review can split `p.10–12` into three entries if they want the original behavior. Task 3 Step 3/4 notes this explicitly.
