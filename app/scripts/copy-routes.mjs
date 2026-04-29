import { copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readImplementedRoutes, URL_LANGS } from './_routes.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(__dirname, '..', 'dist');
const indexHtml = resolve(distDir, 'index.html');

if (!existsSync(indexHtml)) {
  console.error(`[copy-routes] dist/index.html not found at ${indexHtml}`);
  process.exit(1);
}

const routes = readImplementedRoutes().map(path => path.slice(1));

console.log(`[copy-routes] ${routes.length} route(s) × ${URL_LANGS.length} language(s)`);

for (const lang of URL_LANGS) {
  const langDir = resolve(distDir, lang);
  mkdirSync(langDir, { recursive: true });
  copyFileSync(indexHtml, resolve(langDir, 'index.html'));
  console.log(`[copy-routes] /${lang}/index.html`);

  for (const route of routes) {
    const routeDir = resolve(langDir, route);
    mkdirSync(routeDir, { recursive: true });
    copyFileSync(indexHtml, resolve(routeDir, 'index.html'));
    console.log(`[copy-routes] /${lang}/${route}/index.html`);
  }
}

copyFileSync(indexHtml, resolve(distDir, '404.html'));
console.log(`[copy-routes] 404.html`);
