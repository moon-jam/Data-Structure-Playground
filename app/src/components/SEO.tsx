import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import {
  DEFAULT_LANG,
  SITE_URL,
  htmlLang,
  i18nToUrlLang,
  ogLocale,
  stripLangFromPath,
  type UrlLang,
} from '../lib/locale';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string[];
  canonicalUrl?: string;
  jsonLd?: Record<string, unknown>;
  image?: string;
}

export const SEO: React.FC<SEOProps> = ({
  title,
  description,
  keywords,
  canonicalUrl,
  jsonLd,
  image,
}) => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const siteTitle = 'Data Structure Playground';
  const lang: UrlLang = i18nToUrlLang(i18n.language || '') || DEFAULT_LANG;
  const otherLang: UrlLang = lang === 'zh-tw' ? 'en' : 'zh-tw';

  const pathSuffix = stripLangFromPath(location.pathname);
  const cleanSuffix = pathSuffix === '/' ? '' : pathSuffix;
  const currentUrl = canonicalUrl || `${SITE_URL}/${lang}${cleanSuffix}`;
  const alternateUrl = `${SITE_URL}/${otherLang}${cleanSuffix}`;
  const enUrl = lang === 'en' ? currentUrl : alternateUrl;

  const fullTitle = title ? `${title} | ${siteTitle}` : siteTitle;
  const finalDescription = description || t('home.description');
  const finalJsonLd = jsonLd ? { ...jsonLd, url: currentUrl, inLanguage: lang === 'zh-tw' ? 'zh-TW' : 'en' } : undefined;

  return (
    <Helmet>
      <html lang={htmlLang(lang)} />

      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={finalDescription} />
      {keywords && <meta name="keywords" content={keywords.join(', ')} />}
      <link rel="canonical" href={currentUrl} />

      {/* hreflang */}
      <link rel="alternate" hrefLang="en" href={lang === 'en' ? currentUrl : alternateUrl} />
      <link rel="alternate" hrefLang="zh-TW" href={lang === 'zh-tw' ? currentUrl : alternateUrl} />
      <link rel="alternate" hrefLang="x-default" href={enUrl} />

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={finalDescription} />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:locale" content={ogLocale(lang)} />
      <meta property="og:locale:alternate" content={ogLocale(otherLang)} />
      {image && <meta property="og:image" content={image} />}

      {/* Structured Data (JSON-LD) */}
      {finalJsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(finalJsonLd)}
        </script>
      )}
    </Helmet>
  );
};
