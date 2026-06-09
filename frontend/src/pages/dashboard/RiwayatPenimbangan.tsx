import React, { useEffect, useState, useMemo } from 'react'
import { DateRange } from 'react-date-range'
import 'react-date-range/dist/styles.css'
import 'react-date-range/dist/theme/default.css'
import ModalNotifikasi, { ModalStatus } from '../../components/modal/ModalNotifikasi'
import { apiFetch } from '../../utils/api'

interface Riwayat {
  id: number; nama_produk: string; berat: number
  harga_per_kg: number; total_harga: number; waktu: string
}

const defaultRange = () => [{ startDate: new Date(), endDate: new Date(), key: 'selection' }]

export default function RiwayatPenimbangan() {
  const [master,    setMaster]    = useState<Riwayat[]>([])
  const [displayed, setDisplayed] = useState<Riwayat[]>([])
  const [loading,   setLoading]   = useState(true)
  const [range,     setRange]     = useState<any>(defaultRange())
  const [activeRange,setActiveRange]= useState<any>(null)
  const [showPicker,setShowPicker]= useState(false)
  const [search,    setSearch]    = useState('')
  const [sortOrder, setSortOrder] = useState<'asc'|'desc'|''>('')
  const [page,      setPage]      = useState(1)
  const [rows,      setRows]      = useState(25)
  const [notif, setNotif] = useState<{open:boolean;msg:string;status:ModalStatus}>({open:false,msg:'',status:null})
  const notify = (msg:string, status:ModalStatus) => setNotif({open:true,msg,status})

  useEffect(() => { fetchRiwayat() }, [])

  const fetchRiwayat = async () => {
    setLoading(true)
    const res = await apiFetch('/api/riwayat')
    if (res.ok) {
      const data = await res.json()
      setMaster(data); setDisplayed(data)
      notify('Berhasil memuat riwayat!', 'success')
    } else {
      notify('Gagal memuat riwayat', 'error')
    }
    setLoading(false)
  }

  // Filter + sort
  useEffect(() => {
    let d = [...master]
    if (activeRange) {
      const s = activeRange[0].startDate
      const e = new Date(activeRange[0].endDate); e.setHours(23,59,59)
      d = d.filter(r => { const t = new Date(r.waktu); return t>=s && t<=e })
    }
    if (search.trim()) {
      d = d.filter(r => r.nama_produk.toLowerCase().includes(search.toLowerCase()))
    }
    if (sortOrder) {
      d.sort((a,b) => {
        const da = new Date(a.waktu).getTime(), db = new Date(b.waktu).getTime()
        return sortOrder === 'asc' ? da-db : db-da
      })
    }
    setDisplayed(d); setPage(1)
  }, [master, activeRange, search, sortOrder])

  const fmt = (w: string) => new Intl.DateTimeFormat('id-ID', {
    day:'2-digit',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit',
    timeZone:'Asia/Jakarta'
  }).format(new Date(w))

  const fmtDate = (d: Date) => d.toISOString().split('T')[0]

  const total      = displayed.length
  const first      = (page-1)*rows
  const paged      = displayed.slice(first, first+rows)
  const totalPages = Math.ceil(total/rows)

  const dateLabel = useMemo(() => {
    const r = activeRange || range
    const s = fmtDate(r[0].startDate), e = fmtDate(r[0].endDate)
    return <span className={activeRange ? 'text-blue-600 font-semibold' : ''}>📅 {s} — {e}</span>
  }, [range, activeRange])

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <span className="text-2xl">📋</span>
        <h2 className="text-xl font-bold dark:text-white">Riwayat Penimbangan</h2>
      </div>

      {/* Filter bar */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 mb-5 shadow-sm relative flex flex-wrap gap-3 items-center">
        <input
          type="text" placeholder="🔍 Cari produk..." value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-[160px] px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 dark:text-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
        />

        <button onClick={() => setShowPicker(s => !s)}
          className="px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 transition">
          {dateLabel}
        </button>

        <select value={sortOrder} onChange={e => setSortOrder(e.target.value as any)}
          className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white text-sm outline-none">
          <option value="">Urutan Default</option>
          <option value="desc">Terbaru Dulu</option>
          <option value="asc">Terlama Dulu</option>
        </select>

        <button onClick={() => { setSearch(''); setSortOrder(''); setRange(defaultRange()); setActiveRange(null); setShowPicker(false) }}
          className="flex items-center gap-1 px-4 py-2.5 border border-red-400 text-red-500 rounded-xl text-sm hover:bg-red-50 dark:hover:bg-red-900/20 transition">
          🔄 Reset
        </button>

        {showPicker && (
          <div className="absolute top-16 left-4 z-50 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-4 border border-gray-200 dark:border-gray-700">
            <DateRange
              editableDateInputs ranges={range}
              onChange={item => setRange([(item as any).selection])}
              rangeColors={['#2563EB']}
            />
            <button onClick={() => { setActiveRange(range); setShowPicker(false); notify('Filter diterapkan!','success') }}
              className="mt-2 w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold">
              Terapkan Filter
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">Memuat data...</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl shadow border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm bg-white dark:bg-gray-900">
            <thead className="bg-gray-100 dark:bg-gray-800 text-xs uppercase font-bold text-gray-500 dark:text-gray-400">
              <tr>
                {['No','Nama Produk','Berat (Kg)','Harga/Kg','Total Harga','Waktu'].map(h => (
                  <th key={h} className={`py-3 px-4 ${h==='Nama Produk'?'text-left':'text-center'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.length > 0 ? paged.map((r, i) => (
                <tr key={r.id} className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40">
                  <td className="py-2.5 px-4 text-center text-gray-400 text-xs">{first+i+1}</td>
                  <td className="py-2.5 px-4 font-medium dark:text-white">{r.nama_produk}</td>
                  <td className="py-2.5 px-4 text-center">{r.berat.toFixed(3)}</td>
                  <td className="py-2.5 px-4 text-center">Rp {r.harga_per_kg.toLocaleString('id-ID')}</td>
                  <td className="py-2.5 px-4 text-center font-bold text-blue-600 dark:text-blue-400">
                    Rp {r.total_harga.toLocaleString('id-ID')}
                  </td>
                  <td className="py-2.5 px-4 text-center text-xs text-gray-500 dark:text-gray-400">{fmt(r.waktu)}</td>
                </tr>
              )) : (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">Tidak ada data</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-4 pt-2 pb-6 gap-3 text-sm">
        <span className="text-gray-400 text-xs">
          Showing {paged.length>0?first+1:0}–{Math.min(first+rows,total)} of {total}
        </span>
        <div className="flex items-center gap-4 mx-auto sm:mx-0">
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            Rows:
            <select value={rows} onChange={e => { setRows(Number(e.target.value)); setPage(1) }}
              className="border dark:border-gray-700 rounded-lg px-2 py-1 bg-white dark:bg-gray-800 dark:text-white">
              {[10,25,50,100].map(n=><option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-1">
            <PBtn onClick={()=>setPage(p=>Math.max(p-1,1))} disabled={page===1}>‹</PBtn>
            {page>2 && <PBtn onClick={()=>setPage(1)}>1</PBtn>}
            {page>3 && <span className="px-1 text-gray-400 text-xs">…</span>}
            {[page-1,page,page+1].filter(p=>p>=1&&p<=totalPages).map(p=>(
              <PBtn key={p} onClick={()=>setPage(p)} active={page===p}>{p}</PBtn>
            ))}
            {page<totalPages-2 && <span className="px-1 text-gray-400 text-xs">…</span>}
            {page<totalPages-1 && totalPages>1 && <PBtn onClick={()=>setPage(totalPages)}>{totalPages}</PBtn>}
            <PBtn onClick={()=>setPage(p=>Math.min(p+1,totalPages))} disabled={page===totalPages}>›</PBtn>
          </div>
        </div>
      </div>

      <ModalNotifikasi isOpen={notif.open} message={notif.msg} status={notif.status}
        onClose={()=>setNotif(n=>({...n,open:false}))} />
    </div>
  )
}

function PBtn({ children, onClick, disabled, active }:
  {children:React.ReactNode;onClick:()=>void;disabled?:boolean;active?:boolean}) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`px-2.5 py-1 rounded-lg text-xs transition ${active?'bg-blue-600 text-white':'bg-gray-100 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'} ${disabled?'opacity-40 cursor-not-allowed':''}`}>
      {children}
    </button>
  )
}
