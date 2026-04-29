export const URL_LANGS = ['en', 'zh-tw'] as const;
export type UrlLang = typeof URL_LANGS[number];

export const SITE_URL = 'https://ds-play.moon-jam.me';
export const DEFAULT_LANG: UrlLang = 'en';

export const isUrlLang = (s: string | undefined): s is UrlLang =>
  s === 'en' || s === 'zh-tw';

export const urlLangToI18n = (l: UrlLang): 'en' | 'zh-TW' =>
  l === 'zh-tw' ? 'zh-TW' : 'en';

export const i18nToUrlLang = (l: string): UrlLang =>
  l === 'zh-TW' ? 'zh-tw' : 'en';

export const detectBrowserLang = (): UrlLang => {
  if (typeof navigator === 'undefined') return DEFAULT_LANG;
  const lang = (navigator.language || '').toLowerCase();
  return lang.startsWith('zh') ? 'zh-tw' : 'en';
};

export const readLangFromPath = (pathname: string): UrlLang | null => {
  const seg = pathname.split('/').filter(Boolean)[0];
  return isUrlLang(seg) ? seg : null;
};

export const stripLangFromPath = (pathname: string): string => {
  const stripped = pathname.replace(/^\/(en|zh-tw)(?=\/|$)/, '');
  return stripped || '/';
};

export const ogLocale = (lang: UrlLang): string =>
  lang === 'zh-tw' ? 'zh_TW' : 'en_US';

export const htmlLang = (lang: UrlLang): string =>
  lang === 'zh-tw' ? 'zh-TW' : 'en';
