// Fail the build when a page's WM_BUILD_ID does not match version.json.
// Why: on 2026-11-06 the songs page kept a 20261103 stamp while version.json said
// 20261106-try-again, so every open song page showed an update box forever
// (Jay, in class). A mismatch must fail here, not in the classroom.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const version = JSON.parse(readFileSync(join(root, 'version.json'), 'utf8'));
const build = String(version.build || '');
if (!build) {
  console.error('FAIL: version.json has no build');
  process.exit(1);
}

const pages = ['songs/play.html', 'index.html', 'day3/index.html'].filter((p) => existsSync(join(root, p)));
if (!pages.length) {
  console.error('FAIL: no page files found to check');
  process.exit(1);
}

let bad = 0;
for (const page of pages) {
  const html = readFileSync(join(root, page), 'utf8');
  const m = html.match(/WM_BUILD_ID\s*=\s*"([^"]*)"/);
  if (!m) {
    console.log(`${page}: no WM_BUILD_ID (skipped)`);
    continue;
  }
  if (m[1] !== build) {
    console.error(`FAIL: ${page} WM_BUILD_ID=${m[1]} but version.json build=${build}`);
    bad++;
  } else {
    console.log(`${page}: ${m[1]} OK`);
  }
}
if (bad) process.exit(1);
