import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readImplementedRoutes } from './_routes.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(__dirname, '..', 'dist');
const SITE_URL = 'https://ds-play.moon-jam.me';

if (!existsSync(distDir)) {
  mkdirSync(distDir, { recursive: true });
}

const today = new Date().toISOString().slice(0, 10);
const routes = readImplementedRoutes();

const urls = [
  { loc: `${SITE_URL}/`, priority: '1.0', changefreq: 'weekly' },
  ...routes.map(path => ({
    loc: `${SITE_URL}${path}`,
    priority: '0.8',
    changefreq: 'monthly',
  })),
];

const body = urls
  .map(u => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`)
  .join('\n');

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;

writeFileSync(resolve(distDir, 'sitemap.xml'), xml, 'utf8');
console.log(`[sitemap] Generated dist/sitemap.xml with ${urls.length} URL(s) (lastmod: ${today})`);
