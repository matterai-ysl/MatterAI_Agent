/**
 * 国际化配置
 * 支持中英文切换
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import zh from './locales/zh.json';

// 根据当前路径确定默认语言
function getDefaultLanguage() {
  const savedLanguage = localStorage.getItem('language');
  if (savedLanguage) {
    return savedLanguage;
  }
  
  // 如果是MINDS路径，默认英文；否则默认中文
  if (window.location.pathname.startsWith('/minds')) {
    return 'en';
  }
  return 'zh';
}

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: en
      },
      zh: {
        translation: zh
      }
    },
    lng: getDefaultLanguage(),
    fallbackLng: 'zh',
    interpolation: {
      escapeValue: false // React 已经进行了 XSS 保护
    }
  });

export default i18n;