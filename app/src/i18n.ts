import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enCommon from './locales/en/common.json';
import zhTWCommon from './locales/zh-TW/common.json';
import enAvl from './locales/en/avl.json';
import zhTWAvl from './locales/zh-TW/avl.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: enCommon,
        avl: enAvl,
      },
      'zh-TW': {
        common: zhTWCommon,
        avl: zhTWAvl,
      },
    },
    fallbackLng: 'zh-TW', // Default to Traditional Chinese as requested
    interpolation: {
      escapeValue: false,
    },
    defaultNS: 'common',
  });

export default i18n;
