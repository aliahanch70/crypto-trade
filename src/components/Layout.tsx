import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { LogOut, TrendingUp, User } from 'lucide-react'

type LayoutProps = {
  children: React.ReactNode
  showNav?: boolean
}

export function Layout({ children, showNav = true }: LayoutProps) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {showNav && (
        <nav className="bg-gray-800/50 backdrop-blur-md border-b border-gray-700/50 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <Link to={user ? "/dashboard" : "/"} className="flex items-center space-x-2">
                <TrendingUp className="h-8 w-8 text-emerald-400" />
                <span className="text-xl font-bold text-white">CryptoJournal</span>
              </Link>
              
              <div className="flex items-center space-x-4">
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
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2 text-gray-300">
                        <User className="h-4 w-4" />
                        <span className="text-sm">{user.email}</span>
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
          </div>
        </nav>
      )}
      
      <main className="flex-1">
        {children}
      </main>
    </div>
  )
}