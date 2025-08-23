import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpApi from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(HttpApi) // For loading translations from json files
  .use(LanguageDetector) // For detecting user language
  .use(initReactI18next) // For connecting to React
  .init({
    // Default language if user's language is not available
    fallbackLng: 'en',
    
    // Supported languages
    supportedLngs: ['en', 'fa'],

    // Namespaces (your JSON files)
    ns: ['common', 'dashboard', 'analysis', 'auth'],
    
    // Default namespace to use
    defaultNS: 'common',

    // Backend options for HttpApi
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },

    // Language detector options
    detection: {
      order: ['localStorage', 'cookie', 'navigator'],
      caches: ['localStorage'],
    },
  });

export default i18n;