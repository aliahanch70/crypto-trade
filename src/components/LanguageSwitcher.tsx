import React from 'react';
import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';


export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  // const changeLanguage = (lng: string) => {
  //   i18n.changeLanguage(lng);
  //   // اگر نیاز به RTL/LTR دارید (برای فارسی):
  //   document.body.dir = lng === 'fa' ? 'rtl' : 'ltr'; // جهت متن را تغییر دهید
  // };
    const changeLanguage = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const lng = e.target.value;
    i18n.changeLanguage(lng);
    // Set document direction based on language
    // document.documentElement.dir = lng === 'fa' ? 'rtl' : 'ltr';
    document.body.dir = lng === 'fa' ? 'rtl' : 'ltr'; // جهت متن را تغییر دهید

  };

  

  return (
    <div className="relative">
      <Languages className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
      <select
        value={i18n.language}
        onChange={changeLanguage}
        className="appearance-none bg-gray-700/50 border border-gray-600 text-white text-sm rounded-lg pl-9 pr-4 py-2 focus:outline-none focus:border-emerald-500"
      >
        <option value="en">English</option>
        <option value="fa">فارسی</option>
      </select>
    </div>
  );
}