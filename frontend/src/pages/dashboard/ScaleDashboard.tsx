import React, { useEffect, useState, useCallback } from 'react'
import CameraClient from '../../components/CameraClient'
import ModalNotifikasi, { ModalStatus } from '../../components/modal/ModalNotifikasi'
import { API_URL, apiFetch } from '../../utils/api'

interface Produk {
  kode_produk:  number
  nama_produk:  string
  harga_per_kg: number
  path_gambar:  string
}

const ESP32_CLIENT_ID = 'esp32-cam-01'

async function triggerRawBTPrint(
  nama_produk: string,
  berat_kg: number,
  harga_per_kg: number,
  total_harga: number
): Promise<{ ok: boolean; msg: string }> {
  try {
    const formatRp = (num: number) => 'Rp' + num.toLocaleString('id-ID')
    const now      = new Date()
    const timeStr  = now.toLocaleTimeString('id-ID', { hour12: false })
    const dateStr  = now.toLocaleDateString('id-ID', {
      day: '2-digit', month: '2-digit', year: '2-digit',
    })

    const LEBAR = 30
    const garis = '-'.repeat(LEBAR)

    // Helper: tengah manual pakai spasi
    const center = (text: string) => {
      const pad = Math.floor((LEBAR - text.length) / 2)
      return ' '.repeat(Math.max(pad, 0)) + text
    }

    // Waktu kiri, tanggal kanan
    const sisa       = LEBAR - timeStr.length - dateStr.length
    const barisWaktu = timeStr + ' '.repeat(Math.max(sisa, 1)) + dateStr

    let struk = ''
    struk += center('PT INTERSKALA MANDIRI INDONESIA') + '\n'
    struk += garis + '\n'
    struk += `Buah  : ${nama_produk}\n`
    struk += `Berat : ${berat_kg.toFixed(3)} Kg\n`
    struk += `Harga : ${formatRp(harga_per_kg)}/kg\n`
    struk += garis + '\n'
    struk += `Total : ${formatRp(total_harga)}\n`
    struk += garis + '\n'
    struk += '\n'

    window.location.href = `rawbt:${encodeURIComponent(struk)}`

    return { ok: true, msg: '🖨️ Struk dikirim ke RawBT' }
  } catch (err) {
    console.error(err)
    return { ok: false, msg: 'Gagal mencetak ke RawBT' }
  }
}

export default function ScaleDashboard() {
  const [products,       setProducts]       = useState<Produk[]>([])
  const [currentProduct, setCurrentProduct] = useState<Produk | null>(null)
  const [weight,         setWeight]         = useState(0)
  const [detection,      setDetection]      = useState('-')
  const [totalPrice,     setTotalPrice]     = useState(0)
  const [now,            setNow]            = useState(new Date())
  const [saving,         setSaving]         = useState(false)
  const [weightStable,   setWeightStable]   = useState(false)
  const [prevWeight,     setPrevWeight]     = useState(0)
  const [stableCount,    setStableCount]    = useState(0)

  const [modal, setModal] = useState<{ open: boolean; msg: string; status: ModalStatus }>({
    open: false, msg: '', status: null,
  })
  const notify = (msg: string, status: ModalStatus) => setModal({ open: true, msg, status })

  // Clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // Load products
  useEffect(() => {
    fetch(`${API_URL}/api/produk`)
      .then(r => r.json())
      .then(setProducts)
      .catch(() => {})
  }, [])

  // Poll status ESP32 setiap 500ms
  useEffect(() => {
    const iv = setInterval(async () => {
      try {
        const res  = await fetch(`${API_URL}/api/status`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ client_id: ESP32_CLIENT_ID }),
        })
        const data = await res.json()
        const w    = parseFloat(data.weight ?? 0)
        setWeight(w)

        // Deteksi berat stabil (sama 3x berturut) untuk indikator visual
        setStableCount(prev => {
          if (Math.abs(w - prevWeight) < 0.003) return prev + 1
          setPrevWeight(w)
          return 0
        })
        setWeightStable(stableCount >= 3 && w > 0)

        const detLabel = data.detection ?? '-'
        setDetection(detLabel)
        const found = products.find(p =>
          p.nama_produk?.toLowerCase() === detLabel.toLowerCase()
        )
        setCurrentProduct(found ?? null)
        setTotalPrice(found ? Math.round(w * found.harga_per_kg) : 0)
      } catch {}
    }, 500)
    return () => clearInterval(iv)
  }, [products, prevWeight, stableCount])

  const handleDetection = useCallback((label: string) => {
    setDetection(label)
    const found = products.find(p => p.nama_produk?.toLowerCase() === label.toLowerCase())
    setCurrentProduct(found ?? null)
  }, [products])

  const handleSaveAndPrint = async () => {
    if (!currentProduct || weight <= 0) {
      notify('Belum ada buah terdeteksi atau berat belum valid!', 'warning')
      return
    }
    setSaving(true)
    try {
      // 1. Simpan transaksi
      const res  = await apiFetch('/cetak', {
        method: 'POST',
        body: JSON.stringify({
          nama_produk:  currentProduct.nama_produk,
          berat_kg:     weight,
          harga_per_kg: currentProduct.harga_per_kg,
          total_harga:  totalPrice,
        }),
      })
      const data = await res.json()
      if (!res.ok) { notify(data.status || 'Gagal simpan transaksi', 'error'); return }

      notify('💾 Transaksi tersimpan! Membuka RawBT...', 'success')

      // 2. Print via RawBT setelah 800ms (beri waktu modal muncul)
      setTimeout(async () => {
        const print = await triggerRawBTPrint(
          currentProduct.nama_produk, weight,
          currentProduct.harga_per_kg, totalPrice
        )
        notify(print.msg, print.ok ? 'success' : 'warning')
      }, 800)
    } catch {
      notify('Gagal terhubung ke server', 'error')
    } finally {
      setSaving(false)
    }
  }

  const formatRp = (n: number) => 'Rp ' + n.toLocaleString('id-ID')

  // Format berat dengan warna berdasarkan status
  const formatWeight = (w: number) => {
    if (w <= 0) return '0'

    // kalau bilangan bulat (misal 2.000)
    if (Math.floor(w) === w) {
      return w.toString()
    }

    return w.toFixed(3)
  }

  const weightDisplay = formatWeight(weight)
  const weightColor = weight <= 0
    ? 'text-gray-400 dark:text-gray-500'
    : weightStable
      ? 'text-green-600 dark:text-green-400'
      : 'text-blue-700 dark:text-blue-300'

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
        <div className="flex items-center gap-3">
          <span className="text-3xl">⚖️</span>
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold text-blue-800 dark:text-blue-300">
              TIMBANGAN DIGITAL AI
            </h1>
            <p className="text-xs text-gray-400 dark:text-gray-500">PT Interskala Mandiri Indonesia</p>
          </div>
        </div>
        <span className="text-sm text-gray-500 dark:text-gray-400 font-semibold tabular-nums">
          {now.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB
        </span>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">

        {/* Kamera ESP32-S3 */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shadow">
          <CameraClient onDetection={handleDetection} mode="esp32" />
        </div>

        {/* Info panel */}
        <div className="flex flex-col gap-3">

          {/* BERAT — card utama, ukuran besar */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-700 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-bold text-blue-400 dark:text-blue-400 tracking-widest uppercase">BERAT</p>
              {/* Indikator stabil */}
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${
                  weight <= 0
                    ? 'bg-gray-300 dark:bg-gray-600'
                    : weightStable
                      ? 'bg-green-400 animate-pulse'
                      : 'bg-yellow-400 animate-pulse'
                }`} />
                <span className="text-[10px] font-semibold text-gray-400">
                  {weight <= 0 ? 'kosong' : weightStable ? 'stabil' : 'berubah'}
                </span>
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <p className={`text-5xl font-black tabular-nums tracking-tight ${weightColor}`}>
                {weightDisplay}
              </p>
              <span className="text-xl font-bold text-blue-400 dark:text-blue-500">kg</span>
            </div>
            {/* Bar visual berat */}
            <div className="mt-3 h-2 bg-blue-100 dark:bg-blue-900/40 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(weight * 33.33, 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-blue-300 dark:text-blue-600 mt-1">maks. 3 kg</p>
          </div>

          {/* Buah Terdeteksi */}
          <InfoCard label="BUAH TERDETEKSI" value={detection === '-' || detection === 'Tidak Ada Buah' ? 'Tidak Ada' : detection} />

          {/* Harga per kg */}
          <InfoCard
            label="HARGA / KG"
            value={currentProduct ? formatRp(currentProduct.harga_per_kg) : '-'}
          />

          {/* Total Harga */}
          <div className="bg-blue-600 text-white rounded-2xl p-4 shadow-lg shadow-blue-200 dark:shadow-none">
            <p className="text-xs font-bold mb-1 opacity-80 tracking-widest uppercase">Total Harga</p>
            <p className="text-3xl font-extrabold">{formatRp(totalPrice)}</p>
            {currentProduct && weight > 0 && (
              <p className="text-xs opacity-70 mt-1">
                {weight.toFixed(3)} kg × {formatRp(currentProduct.harga_per_kg)}
              </p>
            )}
          </div>

          {/* Simpan & Cetak */}
          <button
            onClick={handleSaveAndPrint}
            disabled={!currentProduct || weight <= 0 || saving}
            className="
              flex items-center justify-center gap-2
              py-3.5 px-5 rounded-2xl font-bold text-sm
              bg-gray-200 dark:bg-gray-800
              hover:bg-green-600 hover:text-white
              disabled:opacity-40 disabled:cursor-not-allowed
              dark:text-white transition shadow
              text-gray-700
            "
          >
            🖨️ {saving ? 'Menyimpan...' : 'SIMPAN & CETAK STRUK'}
          </button>

          <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center">
            Struk dikirim ke RawBT via Android
          </p>
        </div>
      </div>

      {/* Daftar Produk */}
      <div className="mt-8">
        <h2 className="text-base font-bold mb-3 text-gray-800 dark:text-gray-100">
          Daftar Produk ({products.length})
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {products.map(p => {
            const active = currentProduct?.kode_produk === p.kode_produk
            return (
              <div
                key={p.kode_produk}
                className={`
                  flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 cursor-default
                  ${active
                    ? 'bg-green-50 dark:bg-green-900/30 border-green-400 scale-105 shadow-md ring-1 ring-green-400'
                    : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:scale-102'}
                `}
              >
                <img
                  src={`${API_URL}${p.path_gambar}`}
                  alt={p.nama_produk}
                  className="w-12 h-12 object-contain flex-shrink-0"
                  onError={e => (e.currentTarget.style.display = 'none')}
                />
                <div className="min-w-0">
                  <p className={`text-xs font-semibold truncate ${active ? 'text-green-800 dark:text-green-300' : 'text-gray-800 dark:text-white'}`}>
                    {p.nama_produk}
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    {formatRp(p.harga_per_kg)}/kg
                  </p>
                  {active && (
                    <span className="text-[10px] text-green-600 dark:text-green-400 font-bold">✓ Terdeteksi</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <ModalNotifikasi
        isOpen={modal.open}
        message={modal.msg}
        status={modal.status}
        onClose={() => setModal(m => ({ ...m, open: false }))}
      />
    </div>
  )
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 rounded-2xl border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 shadow-sm">
      <p className="text-xs font-bold text-gray-400 dark:text-gray-500 mb-1 tracking-widest uppercase">{label}</p>
      <p className="text-xl font-extrabold text-gray-900 dark:text-white">{value}</p>
    </div>
  )
}