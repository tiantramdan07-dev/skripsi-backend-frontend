import React, { useEffect, useMemo, useState } from 'react'
import { DateRange } from 'react-date-range'
import 'react-date-range/dist/styles.css'
import 'react-date-range/dist/theme/default.css'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import ModalNotifikasi, { ModalStatus } from '../../components/modal/ModalNotifikasi'
import { apiFetch, API_URL, getToken } from '../../utils/api'

// Fix TypeScript autoTable
declare module 'jspdf' {
  interface jsPDF { lastAutoTable?: { finalY: number } }
}

interface Riwayat {
  id: number; nama_produk: string; berat: number
  harga_per_kg: number; total_harga: number; waktu: string
}

const defaultRange = () => [{ startDate: new Date(), endDate: new Date(), key: 'selection' }]

export default function LaporanPenimbangan() {
  const [data,       setData]       = useState<Riwayat[]>([])
  const [filtered,   setFiltered]   = useState<Riwayat[]>([])
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [showPicker, setShowPicker] = useState(false)
  const [range,      setRange]      = useState<any>(defaultRange())
  const [activeRange,setActiveRange]= useState<any>(null)
  const [page,       setPage]       = useState(1)
  const [rows,       setRows]       = useState(10)
  const [notif, setNotif] = useState<{open:boolean;msg:string;status:ModalStatus}>({open:false,msg:'',status:null})
  const notify = (msg:string, status:ModalStatus) => setNotif({open:true,msg,status})

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    setLoading(true)
    const res = await apiFetch('/api/riwayat')
    if (res.ok) { const d = await res.json(); setData(d); notify('Data berhasil dimuat!','success') }
    else notify('Gagal memuat data laporan','error')
    setLoading(false)
  }

  // Apply filters
  useEffect(() => {
    let d = [...data]
    if (activeRange) {
      const s = activeRange[0].startDate
      const e = new Date(activeRange[0].endDate); e.setHours(23,59,59)
      d = d.filter(r => { const t=new Date(r.waktu); return t>=s&&t<=e })
    }
    if (search.trim()) d = d.filter(r => r.nama_produk.toLowerCase().includes(search.toLowerCase()))
    setFiltered(d); setPage(1)
  }, [data, activeRange, search])

  const fmt = (w:string) => new Intl.DateTimeFormat('id-ID',{
    day:'2-digit',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit',
    timeZone:'Asia/Jakarta',
  }).format(new Date(w)) + ' WIB'

  const fmtDate = (d:Date) => d.toISOString().split('T')[0]

  const total      = filtered.length
  const first      = (page-1)*rows
  const paged      = filtered.slice(first, first+rows)
  const totalPages = Math.ceil(total/rows)

  // ─── Summary stats ──────────────────────────────────────
  const stats = useMemo(() => ({
    totalTrx:   filtered.length,
    totalBerat: filtered.reduce((s,r) => s+r.berat, 0),
    totalOmzet: filtered.reduce((s,r) => s+r.total_harga, 0),
  }), [filtered])

  // ─── Export Excel (client-side) ─────────────────────────
  const exportExcel = () => {
    const wsData = [
      ['No','Nama Produk','Berat (Kg)','Harga/Kg','Total Harga','Waktu'],
      ...filtered.map((r,i) => [
        i+1, r.nama_produk, r.berat.toFixed(3),
        r.harga_per_kg, r.total_harga, fmt(r.waktu)
      ])
    ]
    const ws = XLSX.utils.aoa_to_sheet(wsData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Laporan')
    XLSX.writeFile(wb, `laporan_${new Date().toISOString().slice(0,10)}.xlsx`)
    notify('File Excel berhasil diunduh!','success')
  }

  // ─── Export PDF (client-side) ───────────────────────────
  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' })
    doc.setFontSize(14)
    doc.text('Laporan Penimbangan — PT Interskala Mandiri Indonesia', 14, 16)
    doc.setFontSize(9)
    doc.text(`Dicetak: ${new Date().toLocaleString('id-ID')}   |   Total: ${total} transaksi`, 14, 23)

    autoTable(doc, {
      startY:       30,
      head:         [['No','Nama Produk','Berat (Kg)','Harga/Kg','Total Harga','Waktu']],
      body:         filtered.map((r,i) => [
        i+1, r.nama_produk, r.berat.toFixed(3),
        `Rp ${r.harga_per_kg.toLocaleString('id-ID')}`,
        `Rp ${r.total_harga.toLocaleString('id-ID')}`,
        fmt(r.waktu),
      ]),
      headStyles:   { fillColor: [31,78,121], fontStyle:'bold' },
      alternateRowStyles: { fillColor: [239,243,248] },
      styles:       { fontSize: 8 },
    })

    const finalY = (doc as any).lastAutoTable?.finalY ?? 180
    doc.setFontSize(9)
    doc.text(`Total Transaksi: ${stats.totalTrx}   |   Total Berat: ${stats.totalBerat.toFixed(3)} kg   |   Total Omzet: Rp ${stats.totalOmzet.toLocaleString('id-ID')}`, 14, finalY+10)
    doc.save(`laporan_${new Date().toISOString().slice(0,10)}.pdf`)
    notify('File PDF berhasil diunduh!','success')
  }

  const dateLabel = useMemo(() => {
    const r = activeRange || range
    return `${fmtDate(r[0].startDate)} - ${fmtDate(r[0].endDate)}`
  }, [range, activeRange])

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <span className="text-2xl">📊</span>
        <h2 className="text-xl font-bold dark:text-white">Laporan Penimbangan</h2>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label:'Total Transaksi', value: stats.totalTrx.toString(), icon:'🧾' },
          { label:'Total Berat',     value: `${stats.totalBerat.toFixed(3)} kg`, icon:'⚖️' },
          { label:'Total Omzet',     value: `Rp ${stats.totalOmzet.toLocaleString('id-ID')}`, icon:'💰', blue:true },
        ].map(c => (
          <div key={c.label} className={`rounded-2xl p-4 border shadow-sm ${c.blue ? 'bg-blue-600 text-white border-blue-500' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700'}`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">{c.icon}</span>
              <span className={`text-xs font-bold ${c.blue ? 'text-blue-100' : 'text-gray-400'}`}>{c.label}</span>
            </div>
            <p className={`text-2xl font-extrabold ${c.blue ? 'text-white' : 'dark:text-white'}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Filter + Export bar */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 mb-5 shadow-sm relative">
        <div className="flex flex-wrap gap-3 items-center">
          <input
            type="text" placeholder="🔍 Cari nama produk..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 min-w-[160px] px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 dark:text-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />

          <button onClick={() => setShowPicker(s => !s)}
            className={`px-4 py-2.5 border rounded-xl text-sm transition ${activeRange ? 'border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white'}`}>
            📅 {dateLabel}
          </button>

          <button onClick={() => { setSearch(''); setRange(defaultRange()); setActiveRange(null); setShowPicker(false) }}
            className="px-4 py-2.5 border border-red-400 text-red-500 rounded-xl text-sm hover:bg-red-50 dark:hover:bg-red-900/20 transition">
            🔄 Reset
          </button>

          <div className="flex gap-2 ml-auto">
            <button onClick={exportExcel}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold transition shadow">
              📥 Excel
            </button>
            <button onClick={exportPDF}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition shadow">
              📄 PDF
            </button>
          </div>
        </div>

        {showPicker && (
          <div className="absolute top-16 left-4 z-50 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-4 border border-gray-200 dark:border-gray-700">
            <DateRange editableDateInputs ranges={range}
              onChange={item => setRange([(item as any).selection])}
              rangeColors={['#2563EB']} />
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
                {['No','Nama Produk','Berat (Kg)','Harga (/Kg)','Total','Waktu'].map(h => (
                  <th key={h} className={`py-3 px-4 ${h==='Nama Produk'?'text-left':'text-center'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.length > 0 ? paged.map((r,i) => (
                <tr key={r.id} className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40">
                  <td className="py-2.5 px-4 text-center text-xs text-gray-400">{first+i+1}</td>
                  <td className="py-2.5 px-4 font-medium dark:text-white">{r.nama_produk}</td>
                  <td className="py-2.5 px-4 text-center">{r.berat.toFixed(3)}</td>
                  <td className="py-2.5 px-4 text-center">{r.harga_per_kg.toLocaleString('id-ID')}</td>
                  <td className="py-2.5 px-4 text-center font-bold text-blue-600 dark:text-blue-400">
                    Rp {r.total_harga.toLocaleString('id-ID')}
                  </td>
                  <td className="py-2.5 px-4 text-center text-xs text-gray-500 dark:text-gray-400">{fmt(r.waktu)}</td>
                </tr>
              )) : (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">Tidak ada data untuk periode ini</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-4 pb-6 gap-3 text-sm">
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
            {[...Array(Math.min(totalPages,5))].map((_,i) => {
              let p = i+1
              if (totalPages>5) {
                if (page<=3) p=i+1
                else if (page>=totalPages-2) p=totalPages-4+i
                else p=page-2+i
              }
              return <PBtn key={p} onClick={()=>setPage(p)} active={page===p}>{p}</PBtn>
            })}
            {totalPages>5 && page<totalPages-2 && <span className="px-1 text-gray-400 text-xs">…</span>}
            {totalPages>5 && page<totalPages-2 && <PBtn onClick={()=>setPage(totalPages)}>{totalPages}</PBtn>}
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
