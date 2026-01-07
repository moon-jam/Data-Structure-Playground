import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enCommon from './locales/en/common.json';
import zhTWCommon from './locales/zh-TW/common.json';
import enAvl from './locales/en/avl.json';
import zhTWAvl from './locales/zh-TW/avl.json';
import enFib from './locales/en/fib.json';
import zhTWFib from './locales/zh-TW/fib.json';
import enMinMax from './locales/en/minmax.json';
import zhTWMinMax from './locales/zh-TW/minmax.json';
import enDeap from './locales/en/deap.json';
import zhTWDeap from './locales/zh-TW/deap.json';
import enSmmh from './locales/en/smmh.json';
import zhTWSmmh from './locales/zh-TW/smmh.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: enCommon,
        avl: enAvl,
        fib: enFib,
        minmax: enMinMax,
        deap: enDeap,
        smmh: enSmmh,
      },
      'zh-TW': {
        common: zhTWCommon,
        avl: zhTWAvl,
        fib: zhTWFib,
        minmax: zhTWMinMax,
        deap: zhTWDeap,
        smmh: zhTWSmmh,
      },
    },
    fallbackLng: 'zh-TW', // Default to Traditional Chinese as requested
    interpolation: {
      escapeValue: false,
    },
    defaultNS: 'common',
  });

export default i18n;
