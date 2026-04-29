import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const structuresFile = resolve(__dirname, '..', 'src', 'data', 'structures.ts');

export const URL_LANGS = ['en', 'zh-tw'];
export const DEFAULT_LANG = 'en';
export const SITE_URL = 'https://ds-play.moon-jam.me';

export const langToHreflang = (lang) => (lang === 'zh-tw' ? 'zh-TW' : 'en');

// Source of truth for implemented routes: src/data/structures.ts.
// Each entry has the shape { id, name, description, path: '/x', implemented: true|false }.
// Split at object boundaries, keep only implemented:true, extract path.
export function readImplementedRoutes() {
  const text = readFileSync(structuresFile, 'utf8');
  const paths = text
    .split(/(?=\{\s*id:)/g)
    .filter(block => /implemented:\s*true/.test(block))
    .map(block => block.match(/path:\s*['"](\/[^'"]+)['"]/)?.[1])
    .filter(Boolean);

  if (paths.length === 0) {
    throw new Error('No implemented routes found in structures.ts — refusing to continue');
  }

  return paths;
}
