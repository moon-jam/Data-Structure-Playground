import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  readImplementedRoutes,
  URL_LANGS,
  DEFAULT_LANG,
  SITE_URL,
  langToHreflang,
} from './_routes.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(__dirname, '..', 'dist');

if (!existsSync(distDir)) {
  mkdirSync(distDir, { recursive: true });
}

const today = new Date().toISOString().slice(0, 10);
const routes = readImplementedRoutes(); // ['/avl-tree', ...]

// Each "page" = one path that has versions in every language.
// pathSuffix '' is the homepage.
const pages = ['', ...routes];

const buildHreflangBlock = (pathSuffix) => {
  const links = URL_LANGS.map(
    (lang) =>
      `    <xhtml:link rel="alternate" hreflang="${langToHreflang(lang)}" href="${SITE_URL}/${lang}${pathSuffix}"/>`
  );
  links.push(
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE_URL}/${DEFAULT_LANG}${pathSuffix}"/>`
  );
  return links.join('\n');
};

const buildUrlEntry = (lang, pathSuffix) => {
  const isHome = pathSuffix === '';
  const priority = isHome ? '1.0' : '0.8';
  const changefreq = isHome ? 'weekly' : 'monthly';
  return `  <url>
    <loc>${SITE_URL}/${lang}${pathSuffix}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
${buildHreflangBlock(pathSuffix)}
  </url>`;
};

const entries = [];
for (const pathSuffix of pages) {
  for (const lang of URL_LANGS) {
    entries.push(buildUrlEntry(lang, pathSuffix));
  }
}

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.join('\n')}
</urlset>
`;

writeFileSync(resolve(distDir, 'sitemap.xml'), xml, 'utf8');
console.log(`[sitemap] Generated dist/sitemap.xml with ${entries.length} URL(s) (lastmod: ${today})`);
