import { copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readImplementedRoutes } from './_routes.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(__dirname, '..', 'dist');
const indexHtml = resolve(distDir, 'index.html');

if (!existsSync(indexHtml)) {
  console.error(`[copy-routes] dist/index.html not found at ${indexHtml}`);
  process.exit(1);
}

const routes = readImplementedRoutes().map(path => path.slice(1));

console.log(`[copy-routes] Found ${routes.length} implemented route(s) from structures.ts`);

for (const route of routes) {
  const targetDir = resolve(distDir, route);
  mkdirSync(targetDir, { recursive: true });
  copyFileSync(indexHtml, resolve(targetDir, 'index.html'));
  console.log(`[copy-routes] /${route}/index.html`);
}

copyFileSync(indexHtml, resolve(distDir, '404.html'));
console.log(`[copy-routes] 404.html`);
