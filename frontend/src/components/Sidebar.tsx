import React, { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { clearToken } from '../utils/api'

interface Props {
  isOpen: boolean
  onClose: () => void
}

function getUserRole(): string {
  return (
    localStorage.getItem('user_role') ||
    sessionStorage.getItem('user_role') ||
    'operator'
  )
}

const operatorNav = [
  { to: '/dashboard', icon: '⚖️',  label: 'Timbangan'  },
  { to: '/riwayat',   icon: '📋',  label: 'Riwayat'    },
  { to: '/laporan',   icon: '📊',  label: 'Laporan'    },
]

const adminNav = [
  { to: '/dashboard', icon: '⚖️',  label: 'Timbangan'  },
  { to: '/produk',    icon: '📦',  label: 'Data Produk' },
  { to: '/riwayat',   icon: '📋',  label: 'Riwayat'    },
  { to: '/laporan',   icon: '📊',  label: 'Laporan'    },
  { to: '/users',     icon: '👥',  label: 'Pengguna'   },
]

const Sidebar: React.FC<Props> = ({ isOpen, onClose }) => {
  const navigate  = useNavigate()
  const [role, setRole] = useState(getUserRole())

  // Sync role dari storage saat sidebar buka
  useEffect(() => {
    setRole(getUserRole())
  }, [isOpen])

  const navItems = role === 'admin' ? adminNav : operatorNav

  const handleLogout = () => {
    clearToken()
    localStorage.removeItem('user_role')
    sessionStorage.removeItem('user_role')
    navigate('/signin')
  }

  return (
    <>
      {/* Overlay mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 h-full z-40 w-64
          bg-white dark:bg-gray-900
          border-r border-gray-200 dark:border-gray-700
          flex flex-col shadow-lg
          transition-transform duration-300
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0 md:static md:z-auto md:shadow-none
        `}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-100 dark:border-gray-700">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white text-xl font-bold shadow">
            ⚖
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">Timbangan</p>
            <p className="text-xs text-blue-600 font-semibold">Digital AI</p>
          </div>
          <button onClick={onClose}
            className="ml-auto text-gray-400 hover:text-gray-700 dark:hover:text-white md:hidden text-2xl">
            ✕
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <p className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 px-3 mb-2 tracking-wider">
            Menu Utama
          </p>
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                ${isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-200 dark:shadow-none'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`
              }
            >
              <span className="text-lg w-6 text-center">{item.icon}</span>
              {item.label}
              {item.to === '/users' && (
                <span className="ml-auto text-[10px] bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded-full font-bold">
                  Admin
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Role badge + Logout */}
        <div className="px-3 py-4 border-t border-gray-100 dark:border-gray-700 space-y-2">
          {/* Role indicator */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800">
            <span className="text-sm">{role === 'admin' ? '🛡️' : '🔧'}</span>
            <div>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold uppercase tracking-wide">Role</p>
              <p className="text-xs font-bold text-gray-700 dark:text-gray-200 capitalize">{role}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
          >
            <span className="text-lg w-6 text-center">🚪</span>
            Logout
          </button>
        </div>
      </aside>
    </>
  )
}

export default Sidebar
