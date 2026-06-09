import React, { useEffect, useRef, useState } from 'react'
import ModalNotifikasi, { ModalStatus } from '../../components/modal/ModalNotifikasi'
import ModalKonfirmasi from '../../components/modal/ModalKonfirmasi'
import { API_URL, apiFetch } from '../../utils/api'

interface Produk {
  kode_produk: number; nama_produk: string
  harga_per_kg: number; path_gambar: string
}

const ROWS_OPTIONS = [10, 25, 50, 100]

export default function DataProduk() {
  const [products,   setProducts]   = useState<Produk[]>([])
  const [filtered,   setFiltered]   = useState<Produk[]>([])
  const [search,     setSearch]     = useState('')
  const [nama,       setNama]       = useState('')
  const [harga,      setHarga]      = useState('')
  const [file,       setFile]       = useState<File | null>(null)
  const [editing,    setEditing]    = useState<Produk | null>(null)
  const [page,       setPage]       = useState(1)
  const [rows,       setRows]       = useState(25)
  const fileRef = useRef<HTMLInputElement>(null)

  const [notif, setNotif] = useState<{ open:boolean; msg:string; status:ModalStatus }>({ open:false, msg:'', status:null })
  const [confirm, setConfirm] = useState<{ open:boolean; msg:string; id:number|null }>({ open:false, msg:'', id:null })
  const notify = (msg:string, status:ModalStatus) => setNotif({ open:true, msg, status })

  useEffect(() => { fetchProduk() }, [])
  useEffect(() => {
    setFiltered(products.filter(p => p.nama_produk.toLowerCase().includes(search.toLowerCase())))
    setPage(1)
  }, [search, products])

  const fetchProduk = async () => {
    const res  = await apiFetch('/api/produk')
    if (!res.ok) { notify('Gagal memuat produk', 'error'); return }
    const data = await res.json()
    setProducts(data)
  }

  const resetForm = () => {
    setNama(''); setHarga(''); setFile(null); setEditing(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleSave = async () => {
    if (!nama.trim() || !harga.trim()) { notify('Nama dan harga wajib diisi', 'warning'); return }
    if (!editing && !file) { notify('Gambar wajib dipilih untuk produk baru', 'warning'); return }

    const fd = new FormData()
    fd.append('nama_produk', nama)
    fd.append('harga_per_kg', harga)
    if (file) fd.append('gambar', file)

    const res = editing
      ? await apiFetch(`/api/produk/${editing.kode_produk}`, { method:'PUT', body:fd })
      : await apiFetch('/api/produk', { method:'POST', body:fd })

    if (res.ok) {
      notify(editing ? 'Produk berhasil diperbarui!' : 'Produk berhasil ditambahkan!', 'success')
      resetForm(); fetchProduk()
    } else {
      const d = await res.json()
      notify(d.error || 'Gagal simpan produk', 'error')
    }
  }

  const startEdit = (p: Produk) => {
    setEditing(p); setNama(p.nama_produk); setHarga(p.harga_per_kg.toString()); setFile(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async () => {
    if (!confirm.id) return
    const res = await apiFetch(`/api/produk/${confirm.id}`, { method:'DELETE' })
    if (res.ok) {
      notify('Produk berhasil dihapus!', 'success')
      setProducts(p => p.filter(x => x.kode_produk !== confirm.id))
    } else notify('Gagal menghapus produk', 'error')
    setConfirm({ open:false, msg:'', id:null })
  }

  const total = filtered.length
  const first = (page-1)*rows
  const paged = filtered.slice(first, first+rows)
  const totalPages = Math.ceil(total / rows)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <span className="text-2xl">📦</span>
        <h2 className="text-xl font-bold dark:text-white">Data Produk</h2>
      </div>

      {/* Form */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 mb-6 shadow-sm">
        <h3 className="text-sm font-bold text-gray-600 dark:text-gray-400 mb-4">
          {editing ? `✏️ Edit: ${editing.nama_produk}` : '➕ Tambah Produk Baru'}
        </h3>
        <div className="flex flex-wrap gap-3 items-end">
          <input
            type="text" placeholder="Nama Produk" value={nama} onChange={e => setNama(e.target.value)}
            className="flex-1 min-w-[180px] px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 dark:text-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="number" placeholder="Harga per Kg" value={harga} onChange={e => setHarga(e.target.value)}
            className="w-40 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 dark:text-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
          <label className="flex items-center gap-2 px-4 py-2.5 border rounded-xl cursor-pointer text-sm text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition">
            🖼️ {file ? file.name : 'Pilih Gambar'}
            <input ref={fileRef} id="file-input" type="file" accept="image/*" className="hidden"
              onChange={e => setFile(e.target.files?.[0] ?? null)} />
          </label>
          <button onClick={handleSave}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition shadow">
            {editing ? 'Simpan Perubahan' : '+ Tambah Produk'}
          </button>
          {editing && (
            <button onClick={resetForm}
              className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
              Batal
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-3 mb-4">
        <input
          type="text" placeholder="🔍 Cari produk berdasarkan nama..." value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
        />
        {search && (
          <button onClick={() => setSearch('')}
            className="px-4 py-2 bg-red-50 dark:bg-red-900/20 border border-red-300 text-red-500 rounded-xl text-sm font-medium hover:bg-red-100 transition">
            Reset
          </button>
        )}
      </div>

      <p className="text-xs mb-3 px-1">
        <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full font-semibold">
          Total Produk: {total}
        </span>
      </p>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl shadow border border-gray-200 dark:border-gray-700">
        <table className="w-full text-sm bg-white dark:bg-gray-900">
          <thead className="bg-gray-100 dark:bg-gray-800 text-xs uppercase font-bold text-gray-500 dark:text-gray-400">
            <tr>
              {['No','Nama Produk','Harga/Kg','Gambar','Aksi'].map(h => (
                <th key={h} className={`py-3 px-4 ${h==='Nama Produk'?'text-left':'text-center'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.length > 0 ? paged.map((p, i) => (
              <tr key={p.kode_produk} className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="py-3 px-4 text-center text-gray-400">{first+i+1}</td>
                <td className="py-3 px-4 font-medium dark:text-white">{p.nama_produk}</td>
                <td className="py-3 px-4 text-center">Rp {p.harga_per_kg.toLocaleString('id-ID')}</td>
                <td className="py-3 px-4 text-center">
                  <img src={`${API_URL}${p.path_gambar}`} alt={p.nama_produk}
                    className="w-12 h-12 object-contain mx-auto rounded-lg bg-gray-50"
                    onError={e => (e.currentTarget.style.display='none')} />
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center justify-center gap-2">
                    <button onClick={() => startEdit(p)}
                      className="px-3 py-1.5 border border-yellow-400 text-yellow-600 rounded-lg text-xs font-medium hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition">
                      ✏️ Edit
                    </button>
                    <button onClick={() => setConfirm({ open:true, msg:`Hapus "${p.nama_produk}"?`, id:p.kode_produk })}
                      className="px-3 py-1.5 border border-red-400 text-red-500 rounded-lg text-xs font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition">
                      🗑️ Hapus
                    </button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr><td colSpan={5} className="text-center py-10 text-gray-400">Tidak ada produk</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <Pagination page={page} totalPages={totalPages} rows={rows} total={total} first={first}
        shown={paged.length} setPage={setPage} setRows={n => { setRows(n); setPage(1) }} />

      <ModalNotifikasi isOpen={notif.open} message={notif.msg} status={notif.status}
        onClose={() => setNotif(n => ({ ...n, open:false }))} />
      <ModalKonfirmasi isOpen={confirm.open} message={confirm.msg}
        onConfirm={handleDelete} onCancel={() => setConfirm({ open:false, msg:'', id:null })} />
    </div>
  )
}

// ─── Pagination sub-component ──────────────────────────────
function Pagination({ page, totalPages, rows, total, first, shown, setPage, setRows }:
  { page:number; totalPages:number; rows:number; total:number; first:number; shown:number
    setPage: React.Dispatch<React.SetStateAction<number>>; setRows:(n:number)=>void }) {

  const pages = Array.from({ length: totalPages }, (_, i) => i+1)

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-4 pt-4 pb-6 gap-3 text-sm">
      <span className="text-gray-500 dark:text-gray-400 text-xs">
        Showing {shown>0?first+1:0} to {Math.min(first+rows,total)} of {total} rows
      </span>
      <div className="flex items-center gap-4 mx-auto sm:mx-0">
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          Rows:
          <select value={rows} onChange={e => setRows(Number(e.target.value))}
            className="border dark:border-gray-700 rounded-lg px-2 py-1 bg-white dark:bg-gray-800 dark:text-white">
            {[10,25,50,100].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-1">
          <PgBtn onClick={() => setPage(p => Math.max(p-1,1))} disabled={page===1}>‹</PgBtn>
          {pages.filter(p => p===1||p===totalPages||Math.abs(p-page)<=1).map((p, i, arr) => (
            <React.Fragment key={p}>
              {i>0 && arr[i-1]!==p-1 && <span className="px-1 text-gray-400">…</span>}
              <PgBtn onClick={() => setPage(p)} active={page===p}>{p}</PgBtn>
            </React.Fragment>
          ))}
          <PgBtn onClick={() => setPage(p => Math.min(p+1,totalPages))} disabled={page===totalPages}>›</PgBtn>
        </div>
      </div>
    </div>
  )
}

function PgBtn({ children, onClick, disabled, active }:
  { children: React.ReactNode; onClick:()=>void; disabled?:boolean; active?:boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`px-2.5 py-1 rounded-lg text-xs transition
        ${active ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}
        ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}>
      {children}
    </button>
  )
}
