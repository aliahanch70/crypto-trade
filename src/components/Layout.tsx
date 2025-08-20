import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { LogOut, TrendingUp, User, Menu, X } from 'lucide-react'
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';

function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const changeLanguage = (lng: string | undefined) => {
    i18n.changeLanguage(lng);
  };
  
  return (
    <div>
      <button onClick={() => changeLanguage('fa')} disabled={i18n.language === 'fa'}>FA</button>
      <button onClick={() => changeLanguage('en')} disabled={i18n.language === 'en'}>EN</button>
    </div>
  );
}

type LayoutProps = {
  children: React.ReactNode
  showNav?: boolean
}

export function Layout({ children, showNav = true }: LayoutProps) {
    const { t } = useTranslation('common'); // Namespace 'common' را مشخص می‌کنیم

  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
    setIsMenuOpen(false)
  }

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {showNav && (
        <nav className="bg-gray-800/50 backdrop-blur-md border-b border-gray-700/50 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <Link to={user ? "/" : "/"} className="flex items-center space-x-2">
                <TrendingUp className="h-8 w-8 text-emerald-400" />
                <span className="text-xl font-bold text-white">CryptoJournal</span>
              </Link>

              {/* Hamburger menu button for mobile */}
              <button 
                className="md:hidden text-gray-300 hover:text-white p-2"
                onClick={toggleMenu}
              >
                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>

              {/* Desktop navigation */}
              <div className="hidden md:flex md:items-center md:space-x-4">
                {user ? (
                  <>
                    <Link 
                      to="/dashboard" 
                      className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      Dashboard
                    </Link>
                    <Link 
                      to="/analytics" 
                      className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      Analytics
                    </Link>
                                          <LanguageSwitcher />

                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2 text-gray-300">
                        <User className="h-4 w-4" />
                        <span className="text-sm truncate max-w-[150px]">{user.email}</span>
                      </div>
                      <button
                        onClick={handleSignOut}
                        className="text-gray-300 hover:text-white p-2 rounded-md transition-colors"
                        title="Sign Out"
                      >
                        <LogOut className="h-4 w-4" />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <Link 
                      to="/how-it-works" 
                      className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      How It Works
                    </Link>
                    <Link 
                      to="/contact" 
                      className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      Contact
                    </Link>
                    <Link 
                      to="/login" 
                      className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      Login
                    </Link>
                    <Link 
                      to="/signup" 
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      Sign Up
                    </Link>
                  </>
                )}
              </div>
            </div>

            {/* Mobile menu */}
            {isMenuOpen && (
              <div className="md:hidden pb-4">
                <div className="flex flex-col space-y-2 mt-4">
                  {user ? (
                    <>
                      <Link 
                        to="/dashboard" 
                        className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-base font-medium transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        {t('nav_dashboard')}
                      </Link>
                      <Link 
                        to="/analytics" 
                        className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-base font-medium transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        {t('nav_analysis')}
                      </Link>

                      <LanguageSwitcher />
                      <div className="flex items-center justify-between px-3 py-2">
                        <div className="flex items-center space-x-2 text-gray-300">
                          <User className="h-4 w-4" />
                          <span className="text-sm truncate max-w-[200px]">{user.email}</span>
                        </div>
                        <button
                          onClick={handleSignOut}
                          className="text-gray-300 hover:text-white p-2 rounded-md transition-colors"
                          title="Sign Out"
                        >
                          <LogOut className="h-4 w-4" />
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <Link 
                        to="/how-it-works" 
                        className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-base font-medium transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        How It Works
                      </Link>
                      <Link 
                        to="/contact" 
                        className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-base font-medium transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Contact
                      </Link>
                      <Link 
                        to="/login" 
                        className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-base font-medium transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Login
                      </Link>
                      <Link 
                        to="/signup" 
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md text-base font-medium transition-colors mx-3"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Sign Up
                      </Link>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </nav>
      )}
      
      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  )
}