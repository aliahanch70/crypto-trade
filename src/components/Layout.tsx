// src/components/Layout.tsx

import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom'; // یا هر ابزار ناوبری دیگر
import { Menu, X, Bot } from 'lucide-react'; // Bot icon for branding

type Props = {
  children: React.ReactNode;
};

export function Layout({ children }: Props) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navLinks = [
    { name: 'Dashboard', path: '/' },
    { name: 'Analysis', path: '/analysis' },
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <header className="bg-gray-800/50 backdrop-blur-md border-b border-gray-700/50 sticky top-0 z-40">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* بخش برند و لوگو */}
            <div className="flex items-center">
              <NavLink to="/" className="flex-shrink-0 flex items-center space-x-2">
                <Bot className="h-8 w-8 text-emerald-400" />
                <span className="text-xl font-bold text-white">TradeJournal</span>
              </NavLink>
            </div>

            {/* لینک‌های دسکتاپ */}
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                {navLinks.map((link) => (
                  <NavLink
                    key={link.name}
                    to={link.path}
                    className={({ isActive }) =>
                      `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        isActive
                          ? ' text-white'
                          : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                      }`
                    }
                  >
                    {link.name}
                  </NavLink>
                ))}
              </div>
            </div>

            {/* دکمه منوی همبرگری برای موبایل */}
            <div className="-mr-2 flex md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none"
              >
                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </nav>

        {/* منوی بازشونده موبایل */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              {navLinks.map((link) => (
                <NavLink
                  key={link.name}
                  to={link.path}
                  onClick={() => setIsMenuOpen(false)} // بستن منو بعد از کلیک
                  className={({ isActive }) =>
                    `block px-3 py-2 rounded-md text-base font-medium ${
                      isActive
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`
                  }
                >
                  {link.name}
                </NavLink>
              ))}
            </div>
          </div>
        )}
      </header>
      <main>
        {/* این بخش محتوای اصلی صفحات شما را نمایش می‌دهد */}
        {children}
      </main>
    </div>
  );
}