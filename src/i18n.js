// src/i18n.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpApi from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(HttpApi) // فایل‌های ترجمه را از سرور/پوشه public بارگذاری می‌کند
  .use(LanguageDetector) // زبان مرورگر کاربر را تشخیص می‌دهد
  .use(initReactI18next) // به React متصل می‌شود
  .init({
    // زبان پیش‌فرض در صورتی که زبان کاربر شناسایی نشود
    fallbackLng: 'en',
    
    // Namespace های تعریف شده
    ns: ['common', 'dashboard', 'analysis', 'auth'],
    
    // Namespace پیش‌فرض
    defaultNS: 'common',
    
    // برای دیباگ کردن در کنسول
    debug: true,

    // تنظیمات مربوط به بارگذاری فایل‌ها از پوشه public
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },

    // تنظیمات تشخیص زبان
    detection: {
      order: ['localStorage', 'cookie', 'navigator'], // اولویت تشخیص
      caches: ['localStorage'], // ذخیره انتخاب کاربر
    },
    
    interpolation: {
      escapeValue: false, // React از قبل در برابر XSS امن است
    }
  });

export default i18n;