import React from 'react';
import { useTranslation } from 'react-i18next';

const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    // اگر نیاز به RTL/LTR دارید (برای فارسی):
    document.body.dir = lng === 'fa' ? 'rtl' : 'ltr'; // جهت متن را تغییر دهید
  };

  return (
    <div className="language-switcher">
      <button onClick={() => changeLanguage('en')} className={i18n.language === 'en' ? 'active' : ''}>
        English
      </button>
      <button onClick={() => changeLanguage('fa')} className={i18n.language === 'fa' ? 'active' : ''}>
        فارسی
      </button>
    </div>
  );
};

export default LanguageSwitcher;
