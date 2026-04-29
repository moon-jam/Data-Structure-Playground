import { copyFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(__dirname, '..', 'dist');
const indexHtml = resolve(distDir, 'index.html');
const structuresFile = resolve(__dirname, '..', 'src', 'data', 'structures.ts');

if (!existsSync(indexHtml)) {
  console.error(`[copy-routes] dist/index.html not found at ${indexHtml}`);
  process.exit(1);
}

if (!existsSync(structuresFile)) {
  console.error(`[copy-routes] structures.ts not found at ${structuresFile}`);
  process.exit(1);
}

// Source of truth: src/data/structures.ts
// Each entry has the shape { id, name, description, path: '/x', implemented: true|false }.
// Split at object boundaries, keep only implemented:true, extract path.
const text = readFileSync(structuresFile, 'utf8');
const routes = text
  .split(/(?=\{\s*id:)/g)
  .filter(block => /implemented:\s*true/.test(block))
  .map(block => block.match(/path:\s*['"](\/[^'"]+)['"]/)?.[1])
  .filter(Boolean)
  .map(path => path.slice(1));

if (routes.length === 0) {
  console.error('[copy-routes] No implemented routes found in structures.ts — refusing to continue');
  process.exit(1);
}

console.log(`[copy-routes] Found ${routes.length} implemented route(s) from structures.ts`);

for (const route of routes) {
  const targetDir = resolve(distDir, route);
  mkdirSync(targetDir, { recursive: true });
  copyFileSync(indexHtml, resolve(targetDir, 'index.html'));
  console.log(`[copy-routes] /${route}/index.html`);
}

copyFileSync(indexHtml, resolve(distDir, '404.html'));
console.log(`[copy-routes] 404.html`);
