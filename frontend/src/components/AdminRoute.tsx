import { Navigate } from 'react-router-dom'
import { ReactNode } from 'react'
import { getToken } from '../utils/api'

function getUserRole(): string {
  return (
    localStorage.getItem('user_role') ||
    sessionStorage.getItem('user_role') ||
    'operator'
  )
}

export default function AdminRoute({ children }: { children: ReactNode }) {
  if (!getToken()) return <Navigate to="/signin" replace />
  if (getUserRole() !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <span className="text-5xl">🚫</span>
        <h2 className="text-xl font-bold text-gray-700 dark:text-white">Akses Ditolak</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-xs">
          Halaman ini hanya dapat diakses oleh <strong>Admin</strong>.
          Hubungi administrator untuk mendapatkan akses.
        </p>
        <a href="/dashboard"
          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition">
          ← Kembali ke Dashboard
        </a>
      </div>
    )
  }
  return <>{children}</>
}
