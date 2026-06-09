import React, { useEffect, useState } from 'react'
import ModalNotifikasi, { ModalStatus } from '../../components/modal/ModalNotifikasi'
import ModalKonfirmasi from '../../components/modal/ModalKonfirmasi'
import { apiFetch } from '../../utils/api'

interface User {
  id: number
  first_name: string
  last_name: string
  email: string
  role: 'admin' | 'operator'
  is_active: boolean
  created_at: string
}

interface FormState {
  first_name: string; last_name: string
  email: string; password: string; role: 'admin' | 'operator'
}

const emptyForm: FormState = { first_name: '', last_name: '', email: '', password: '', role: 'operator' }

export default function UserManagement() {
  const [users,      setUsers]      = useState<User[]>([])
  const [loading,    setLoading]    = useState(true)
  const [form,       setForm]       = useState<FormState>(emptyForm)
  const [editId,     setEditId]     = useState<number | null>(null)
  const [showForm,   setShowForm]   = useState(false)
  const [resetId,    setResetId]    = useState<number | null>(null)
  const [resetPw,    setResetPw]    = useState('')
  const [showReset,  setShowReset]  = useState(false)
  const [search,     setSearch]     = useState('')
  const [notif, setNotif] = useState<{ open: boolean; msg: string; status: ModalStatus }>({ open: false, msg: '', status: null })
  const [confirm, setConfirm] = useState<{ open: boolean; msg: string; id: number | null }>({ open: false, msg: '', id: null })

  const notify = (msg: string, status: ModalStatus) => setNotif({ open: true, msg, status })

  useEffect(() => { fetchUsers() }, [])

  const fetchUsers = async () => {
    setLoading(true)
    const res = await apiFetch('/api/users')
    if (res.ok) {
      const d = await res.json()
      setUsers(d)
    } else {
      notify('Gagal memuat daftar pengguna', 'error')
    }
    setLoading(false)
  }

  const handleSave = async () => {
    if (!form.email.trim()) { notify('Email wajib diisi', 'warning'); return }
    if (!editId && !form.password.trim()) { notify('Password wajib untuk pengguna baru', 'warning'); return }
    if (!editId && form.password.length < 6) { notify('Password minimal 6 karakter', 'warning'); return }

    const body: any = { first_name: form.first_name, last_name: form.last_name, role: form.role }
    if (!editId) { body.email = form.email; body.password = form.password }

    const res = editId
      ? await apiFetch(`/api/users/${editId}`, { method: 'PUT', body: JSON.stringify(body) })
      : await apiFetch('/api/users', { method: 'POST', body: JSON.stringify({ ...body, email: form.email, password: form.password }) })

    if (res.ok) {
      notify(editId ? 'Pengguna berhasil diperbarui' : 'Pengguna berhasil ditambahkan', 'success')
      setForm(emptyForm); setEditId(null); setShowForm(false)
      fetchUsers()
    } else {
      const d = await res.json()
      notify(d.error || 'Gagal simpan pengguna', 'error')
    }
  }

  const handleToggleActive = async (user: User) => {
    const res = await apiFetch(`/api/users/${user.id}`, {
      method: 'PUT',
      body: JSON.stringify({ is_active: !user.is_active }),
    })
    if (res.ok) {
      notify(`Akun ${user.is_active ? 'dinonaktifkan' : 'diaktifkan'}`, 'success')
      fetchUsers()
    } else {
      notify('Gagal mengubah status akun', 'error')
    }
  }

  const handleDelete = async () => {
    if (!confirm.id) return
    const res = await apiFetch(`/api/users/${confirm.id}`, { method: 'DELETE' })
    if (res.ok) {
      notify('Pengguna berhasil dihapus', 'success')
      setUsers(u => u.filter(x => x.id !== confirm.id))
    } else {
      const d = await res.json()
      notify(d.error || 'Gagal menghapus pengguna', 'error')
    }
    setConfirm({ open: false, msg: '', id: null })
  }

  const handleResetPassword = async () => {
    if (!resetId) return
    if (resetPw.length < 6) { notify('Password minimal 6 karakter', 'warning'); return }
    const res = await apiFetch(`/api/users/${resetId}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ password: resetPw }),
    })
    if (res.ok) {
      notify('Password berhasil direset', 'success')
      setShowReset(false); setResetId(null); setResetPw('')
    } else {
      const d = await res.json()
      notify(d.error || 'Gagal reset password', 'error')
    }
  }

  const startEdit = (u: User) => {
    setEditId(u.id)
    setForm({ first_name: u.first_name, last_name: u.last_name, email: u.email, password: '', role: u.role })
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const filtered = users.filter(u =>
    `${u.first_name} ${u.last_name} ${u.email}`.toLowerCase().includes(search.toLowerCase())
  )

  const fmtDate = (s: string) => new Intl.DateTimeFormat('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(s))

  const stats = {
    total:    users.length,
    admin:    users.filter(u => u.role === 'admin').length,
    operator: users.filter(u => u.role === 'operator').length,
    inactive: users.filter(u => !u.is_active).length,
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <span className="text-2xl">👥</span>
        <h2 className="text-xl font-bold dark:text-white">Manajemen Pengguna</h2>
        <span className="ml-2 px-2.5 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold rounded-full">
          Admin Only
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Pengguna', value: stats.total,    icon: '👤', color: 'blue' },
          { label: 'Admin',          value: stats.admin,    icon: '🛡️', color: 'purple' },
          { label: 'Operator',       value: stats.operator, icon: '🔧', color: 'green' },
          { label: 'Nonaktif',       value: stats.inactive, icon: '🚫', color: 'red' },
        ].map(s => (
          <div key={s.label}
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{s.icon}</span>
              <span className="text-xs text-gray-400 font-semibold">{s.label}</span>
            </div>
            <p className="text-2xl font-extrabold dark:text-white">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center mb-5">
        <input
          type="text" placeholder="🔍 Cari nama atau email..." value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={() => { setForm(emptyForm); setEditId(null); setShowForm(s => !s) }}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition shadow"
        >
          ➕ Tambah Pengguna
        </button>
      </div>

      {/* Form tambah/edit */}
      {showForm && (
        <div className="bg-white dark:bg-gray-900 border border-blue-200 dark:border-blue-700 rounded-2xl p-5 mb-6 shadow-sm">
          <h3 className="text-sm font-bold text-gray-600 dark:text-gray-400 mb-4">
            {editId ? '✏️ Edit Pengguna' : '➕ Tambah Pengguna Baru'}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">Nama Depan</label>
              <input type="text" value={form.first_name}
                onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 dark:text-white text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">Nama Belakang</label>
              <input type="text" value={form.last_name}
                onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 dark:text-white text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            {!editId && (
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">Email <span className="text-red-500">*</span></label>
                <input type="email" value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 dark:text-white text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            )}
            {!editId && (
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">Password <span className="text-red-500">*</span></label>
                <input type="password" value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Min. 6 karakter"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 dark:text-white text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            )}
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">Role</label>
              <select value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value as 'admin' | 'operator' }))}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 dark:text-white text-sm outline-none focus:ring-2 focus:ring-blue-500">
                <option value="operator">🔧 Operator</option>
                <option value="admin">🛡️ Admin</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleSave}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition shadow">
              {editId ? '💾 Simpan Perubahan' : '➕ Tambah Pengguna'}
            </button>
            <button onClick={() => { setShowForm(false); setEditId(null); setForm(emptyForm) }}
              className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-base font-bold dark:text-white mb-4">🔑 Reset Password</h3>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">Password Baru</label>
            <input type="password" value={resetPw}
              onChange={e => setResetPw(e.target.value)}
              placeholder="Min. 6 karakter"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 dark:text-white text-sm outline-none focus:ring-2 focus:ring-blue-500 mb-4" />
            <div className="flex gap-3">
              <button onClick={handleResetPassword}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition">
                Reset Password
              </button>
              <button onClick={() => { setShowReset(false); setResetId(null); setResetPw('') }}
                className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">Memuat data...</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl shadow border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm bg-white dark:bg-gray-900">
            <thead className="bg-gray-100 dark:bg-gray-800 text-xs uppercase font-bold text-gray-500 dark:text-gray-400">
              <tr>
                {['No', 'Nama', 'Email', 'Role', 'Status', 'Terdaftar', 'Aksi'].map(h => (
                  <th key={h} className={`py-3 px-4 ${h === 'Nama' || h === 'Email' ? 'text-left' : 'text-center'}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? filtered.map((u, i) => (
                <tr key={u.id} className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40">
                  <td className="py-3 px-4 text-center text-gray-400 text-xs">{i + 1}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {`${u.first_name?.[0] ?? ''}${u.last_name?.[0] ?? ''}`.toUpperCase() || '?'}
                      </div>
                      <span className="font-medium dark:text-white">
                        {`${u.first_name} ${u.last_name}`.trim() || '—'}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-600 dark:text-gray-300 text-xs">{u.email}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold
                      ${u.role === 'admin'
                        ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                        : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      }`}>
                      {u.role === 'admin' ? '🛡️ Admin' : '🔧 Operator'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => handleToggleActive(u)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition
                        ${u.is_active
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200'
                        }`}
                      title={u.is_active ? 'Klik untuk nonaktifkan' : 'Klik untuk aktifkan'}
                    >
                      {u.is_active ? '✅ Aktif' : '🚫 Nonaktif'}
                    </button>
                  </td>
                  <td className="py-3 px-4 text-center text-xs text-gray-400">{fmtDate(u.created_at)}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-center gap-1.5 flex-wrap">
                      <button
                        onClick={() => startEdit(u)}
                        className="px-2.5 py-1.5 border border-yellow-400 text-yellow-600 rounded-lg text-xs font-medium hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => { setResetId(u.id); setShowReset(true); setResetPw('') }}
                        className="px-2.5 py-1.5 border border-blue-400 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-50 dark:hover:bg-blue-900/20 transition"
                      >
                        🔑 Reset PW
                      </button>
                      <button
                        onClick={() => setConfirm({ open: true, msg: `Hapus akun "${u.email}"?`, id: u.id })}
                        className="px-2.5 py-1.5 border border-red-400 text-red-500 rounded-lg text-xs font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-gray-400">
                    {search ? 'Tidak ada pengguna yang cocok' : 'Belum ada pengguna'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Role Legend */}
      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-2xl">
        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-3">📖 Hak Akses</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-start gap-2">
            <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-bold rounded-full mt-0.5">🛡️ Admin</span>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Akses penuh: timbangan, data produk (CRUD), riwayat, laporan, manajemen pengguna
            </p>
          </div>
          <div className="flex items-start gap-2">
            <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-full mt-0.5">🔧 Operator</span>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Akses terbatas: timbangan, riwayat (read-only), laporan (read-only). Tidak bisa ubah produk atau pengguna.
            </p>
          </div>
        </div>
      </div>

      <ModalNotifikasi isOpen={notif.open} message={notif.msg} status={notif.status}
        onClose={() => setNotif(n => ({ ...n, open: false }))} />
      <ModalKonfirmasi isOpen={confirm.open} message={confirm.msg}
        onConfirm={handleDelete} onCancel={() => setConfirm({ open: false, msg: '', id: null })} />
    </div>
  )
}
