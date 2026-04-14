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
