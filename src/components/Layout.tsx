import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, TrendingUp, User, Menu, X, BarChart2, Contact, LogIn, UserPlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from './LanguageSwitcher'; // ما این کامپوننت را در مرحله بعد می‌سازیم

type LayoutProps = {
  children: React.ReactNode;
};

export function Layout({ children }: LayoutProps) {
  const { t } = useTranslation('common');
  const { user, signOut } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleSignOut = async () => {
    setIsMenuOpen(false);
    await signOut();
  };

  return (
    <div className="min-h-screen bg-gray-900 ">
      <nav className="bg-gray-800/50 backdrop-blur-md border-b border-gray-700/50 sticky top-0 z-50 relative"> {/* (CHANGE 1) - `relative` اضافه شد */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <NavLink to={user ? "/" : "/"} className="flex items-center space-x-2">
              <TrendingUp className="h-8 w-8 text-emerald-400" />
              <span className="text-xl font-bold text-white">CryptoJournal</span>
            </NavLink>

            {/* Hamburger menu button for mobile */}
            <div className="flex items-center md:hidden">
              <LanguageSwitcher />
              <button 
                className="text-gray-300 hover:text-white p-2 ml-2"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>

            {/* Desktop navigation */}
            <div className="hidden md:flex md:items-center md:space-x-4">
              {user ? (
                <>
                  <NavLink to="/dashboard" className={({isActive}) => `px-3 py-2 rounded-md text-sm font-medium ${isActive ? 'text-emerald-400' : 'text-gray-300 hover:text-white'}`}>{t('nav_dashboard')}</NavLink>
                  <NavLink to="/analytics" className={({isActive}) => `px-3 py-2 rounded-md text-sm font-medium ${isActive ? 'text-emerald-400' : 'text-gray-300 hover:text-white'}`}>{t('nav_analysis')}</NavLink>
                  <LanguageSwitcher />
                  <div className="flex items-center space-x-2 text-gray-300 border-l border-gray-700 pl-4 ml-2">
                    <NavLink to="/profile" onClick={() => setIsMenuOpen(false)} className="text-gray-300 hover:text-white p-2 rounded-md flex items-center space-x-2">
                    <User className="h-4 w-4" /><span className="text-sm">{user.email}</span>
                    </NavLink>
                    <button onClick={handleSignOut} className="text-gray-300 hover:text-white p-2 rounded-md" title="Sign Out"><LogOut className="h-4 w-4" /></button>
                  </div>
                </>
              ) : (
                <>
                  <NavLink to="/login" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">{t('nav_login')}</NavLink>
                  <NavLink to="/signup" className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md text-sm font-medium">{t('nav_signup')}</NavLink>
                  <LanguageSwitcher />
                </>
              )}
            </div>
          </div>
        </div>

        {/* (CHANGE 2) - منوی موبایل اکنون `absolute` است */}
        {isMenuOpen && (
          <div className="md:hidden absolute w-full bg-gray-800 border-b border-gray-700 shadow-lg">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              {user ? (
                <>
                  <NavLink to="/dashboard" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:text-white hover:bg-gray-700">{t('nav_dashboard')}</NavLink>
                  <NavLink to="/analysis" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:text-white hover:bg-gray-700">{t('nav_analysis')}</NavLink>
                  <div className="border-t border-gray-700 my-2"></div>
                  <div className="flex items-center justify-between px-3 py-2">
                    <NavLink to="/profile" onClick={() => setIsMenuOpen(false)} className="text-gray-300 hover:text-white p-2 rounded-md flex items-center space-x-2">
                    <div className="flex items-center space-x-2 text-gray-300"><User className="h-4 w-4" /><span className="text-sm">{user.email}</span></div>
                    </NavLink>
                    <button onClick={handleSignOut} className="text-gray-300 hover:text-white p-2 rounded-md"><LogOut className="h-4 w-4" /></button>
                  </div>
                </>
              ) : (
                <>
                  <NavLink to="/login" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:text-white hover:bg-gray-700">{t('nav_login')}</NavLink>
                  <NavLink to="/signup" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:text-white hover:bg-gray-700">{t('nav_signup')}</NavLink>
                </>
              )}
            </div>
          </div>
        )}
      </nav>
      
      <main>
        {children}
      </main>
    </div>
  );
}