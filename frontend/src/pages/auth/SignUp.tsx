import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { API_URL } from '../../utils/api'

export default function SignUp() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ first_name:'', last_name:'', email:'', password:'' })
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const onChange = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const res  = await fetch(`${API_URL}/auth/signup`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Registrasi gagal'); return }
      navigate('/signin')
    } catch { setError('Tidak dapat terhubung ke server') }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8">
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-3xl shadow mb-2">⚖</div>
          <h1 className="text-2xl font-extrabold dark:text-white">Buat Akun</h1>
          <p className="text-xs text-gray-400 mt-1">Timbangan Digital AI</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/30 border border-red-300 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-3">
            {(['first_name','last_name'] as const).map(k => (
              <div key={k} className="flex-1">
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block">
                  {k === 'first_name' ? 'Nama Depan' : 'Nama Belakang'}
                </label>
                <input
                  type="text" value={form[k]} onChange={onChange(k)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            ))}
          </div>

          {[
            { k:'email',    label:'Email',    type:'email',    req:true },
            { k:'password', label:'Password', type:'password', req:true },
          ].map(({ k, label, type, req }) => (
            <div key={k}>
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block">
                {label} {req && <span className="text-red-500">*</span>}
              </label>
              <input
                type={type} required={req}
                value={(form as any)[k]} onChange={onChange(k)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          ))}

          <button
            type="submit" disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl font-bold text-sm transition"
          >
            {loading ? 'Mendaftar...' : 'Daftar Sekarang'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-5">
          Sudah punya akun?{' '}
          <Link to="/signin" className="text-blue-600 font-semibold hover:underline">Sign In</Link>
        </p>
      </div>
    </div>
  )
}
