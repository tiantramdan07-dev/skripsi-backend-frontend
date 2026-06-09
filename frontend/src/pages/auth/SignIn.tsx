import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { API_URL } from '../../utils/api'

export default function SignIn() {
  const navigate = useNavigate()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [showPw, setShowPw]     = useState(false)
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res  = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Login gagal'); return }

      const storage = remember ? localStorage : sessionStorage
      storage.setItem('token',      data.token)
      storage.setItem('user_email', data.email)
      storage.setItem('user_role',  data.role)

      // Clear the other storage to avoid conflicts
      if (remember) sessionStorage.removeItem('token')
      else          localStorage.removeItem('token')

      navigate('/dashboard')
    } catch {
      setError('Tidak dapat terhubung ke server')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Form pane */}
      <div className="flex flex-col justify-center items-center w-full md:w-1/2 px-8 bg-white dark:bg-gray-900">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-3xl shadow-lg mb-3">⚖</div>
            <p className="text-xs text-gray-400 font-semibold tracking-widest uppercase">Timbangan Digital AI</p>
          </div>

          <h1 className="text-3xl font-extrabold mb-1 dark:text-white">Sign In</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-7">Masukkan email dan password Anda</p>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/30 border border-red-300 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 block">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email" autoComplete="email" required
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder="nama@email.com"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-sm"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 block">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password" required
                  value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-sm"
                />
                <button
                  type="button" onClick={() => setShowPw(s => !s)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl"
                >
                  {showPw ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}
                className="w-4 h-4 rounded accent-blue-600"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">Keep me logged in</span>
            </label>

            <button
              type="submit" disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-200 dark:shadow-none transition"
            >
              {loading ? 'Masuk...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
            Belum punya akun?{' '}
            <Link to="/signup" className="text-blue-600 font-semibold hover:underline">Sign Up</Link>
          </p>
        </div>
      </div>

      {/* Hero pane (desktop only) */}
      <div className="hidden md:flex flex-col justify-center items-center w-1/2 bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 text-white px-12">
        <div className="text-7xl mb-6">⚖️</div>
        <h2 className="text-3xl font-extrabold mb-3 text-center">PT Interskala Mandiri Indonesia</h2>
        <p className="text-blue-200 text-center text-sm leading-relaxed max-w-xs">
          Importer · Distributor · Manufacturer Scale<br />
          Sistem Timbangan Digital berbasis Kecerdasan Buatan
        </p>
        <div className="mt-10 grid grid-cols-3 gap-4 text-center">
          {[['⚡','Realtime'],['🎯','AI Detection'],['🖨️','Auto Print']].map(([icon, label]) => (
            <div key={label} className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm">
              <div className="text-3xl mb-1">{icon}</div>
              <div className="text-xs font-semibold">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
