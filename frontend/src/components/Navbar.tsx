import React, { useEffect, useState } from 'react'
import { apiFetch } from '../utils/api'

interface Props {
  onToggleSidebar: () => void
}

interface UserInfo {
  first_name: string
  last_name: string
  email: string
  role: string
}

const Navbar: React.FC<Props> = ({ onToggleSidebar }) => {
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark')
  const [user, setUser] = useState<UserInfo | null>(null)

  useEffect(() => {
    if (dark) document.documentElement.classList.add('dark')
    else      document.documentElement.classList.remove('dark')
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  useEffect(() => {
    apiFetch('/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setUser(d))
      .catch(() => {})
  }, [])

  const initials = user
    ? `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase() || '?'
    : '?'

  return (
    <header className="h-14 flex items-center justify-between px-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm sticky top-0 z-20">
      {/* Hamburger */}
      <button
        onClick={onToggleSidebar}
        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition md:hidden"
        aria-label="Toggle sidebar"
      >
        <span className="block w-5 h-0.5 bg-gray-600 dark:bg-gray-300 mb-1.5 rounded" />
        <span className="block w-5 h-0.5 bg-gray-600 dark:bg-gray-300 mb-1.5 rounded" />
        <span className="block w-5 h-0.5 bg-gray-600 dark:bg-gray-300 rounded" />
      </button>

      {/* Brand (visible on md+) */}
      <div className="hidden md:flex items-center gap-2">
        <span className="text-blue-700 dark:text-blue-400 font-bold text-sm">
          PT Interskala Mandiri Indonesia
        </span>
      </div>

      <div className="flex items-center gap-3 ml-auto">
        {/* Dark mode */}
        <button
          onClick={() => setDark(d => !d)}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-500 dark:text-yellow-300 text-xl"
          title="Toggle Dark Mode"
        >
          {dark ? '☀️' : '🌙'}
        </button>

        {/* User avatar */}
        <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-xl px-3 py-1.5">
          <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
            {initials}
          </div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 hidden sm:block">
            {user ? `${user.first_name} ${user.last_name}`.trim() || user.email : 'Loading...'}
          </span>
        </div>
      </div>
    </header>
  )
}

export default Navbar
