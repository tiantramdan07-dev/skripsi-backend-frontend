import { useEffect, useRef, useState, useCallback } from 'react'
import { API_URL, getToken } from '../utils/api'

interface Box {
  x: number; y: number; width: number; height: number
  label: string; confidence: number
}

interface Props {
  onDetection?: (label: string) => void
  /** 'browser' = webcam capture, 'esp32' = pakai frame dari ESP32-S3 cam via backend */
  mode?: 'browser' | 'esp32'
}

const ESP32_CLIENT_ID = 'esp32-cam-01'

function getClientId(): string {
  let id = localStorage.getItem('client_id')
  if (!id) { 
    // Cek apakah browser mengizinkan crypto.randomUUID (HTTPS/Localhost)
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      id = crypto.randomUUID();
    } else {
      // Fallback untuk akses via IP (HTTP) pada jaringan lokal
      id = 'client-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }
    localStorage.setItem('client_id', id) 
  }
  return id
}

export default function CameraClient({ onDetection, mode = 'esp32' }: Props) {
  const videoRef  = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const loopRef   = useRef(true)

  const [detection,   setDetection]   = useState('Menunggu ESP32...')
  const [loading,     setLoading]     = useState(true)
  const [annotated,   setAnnotated]   = useState<string | null>(null)
  const [lastTs,      setLastTs]      = useState<string>('')
  const [frameCount,  setFrameCount]  = useState(0)
  const [connected,   setConnected]   = useState(false)

  const client_id = getClientId()
  const token     = getToken()

  // ─── ESP32 Mode: poll /api/status setiap 400ms ──────
  useEffect(() => {
    if (mode !== 'esp32') return
    setLoading(false)

    let noFrameCount = 0

    const poll = async () => {
      try {
        const res = await fetch(`${API_URL}/api/status`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ client_id: ESP32_CLIENT_ID }),
        })
        if (!res.ok) return

        const data = await res.json()

        // Update annotated frame jika ada dan berbeda dari sebelumnya
        if (data.annotated_frame) {
          setAnnotated(data.annotated_frame)
          setConnected(true)
          noFrameCount = 0
          setFrameCount(c => c + 1)
        } else {
          noFrameCount++
          // Jika 5 poll berturut tanpa frame → tandai terputus
          if (noFrameCount > 5) setConnected(false)
        }

        const label = data.detection || '-'
        const disp  = label === '-' ? 'Tidak Ada Buah' : label
        setDetection(disp)
        setLastTs(data.ts || '')
        onDetection?.(disp)

      } catch {
        setConnected(false)
      }
    }

    // Poll langsung, lalu interval
    poll()
    const iv = setInterval(poll, 400)
    return () => clearInterval(iv)
  }, [mode, onDetection])

  // ─── Browser Mode: webcam → kirim ke backend ─────────
  const startCamera = useCallback(async () => {
    if (mode !== 'browser') return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }, audio: false,
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setLoading(false)
      loopRef.current = true
      loopDetection()
    } catch {
      setDetection('Izinkan akses kamera!')
      setLoading(false)
    }
  }, [mode])

  function stopCamera() {
    loopRef.current = false
    const v = videoRef.current
    if (v?.srcObject) {
      (v.srcObject as MediaStream).getTracks().forEach(t => t.stop())
    }
  }

  async function loopDetection() {
    if (!loopRef.current) return
    const video  = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    if (video.videoWidth === 0) { requestAnimationFrame(loopDetection); return }

    const ctx = canvas.getContext('2d')!
    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0)
    const frame = canvas.toDataURL('image/jpeg', 0.75)

    try {
      const ctrl = new AbortController()
      const t    = setTimeout(() => ctrl.abort(), 3000)
      const res  = await fetch(`${API_URL}/api/detect_frame`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ frame, client_id }),
        signal:  ctrl.signal,
      })
      clearTimeout(t)

      if (res.ok) {
        const data  = await res.json()
        const label = data.detection || ''
        const boxes: Box[] = data.boxes || []
        const disp  = (label && boxes.length > 0) ? label : 'Tidak Ada Buah'
        setDetection(disp)
        onDetection?.(disp)
        boxes.forEach(b => {
          ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 3
          ctx.strokeRect(b.x, b.y, b.width, b.height)
          ctx.fillStyle = '#22c55e'; ctx.font = 'bold 14px Arial'
          ctx.fillText(`${b.label} ${b.confidence}%`, b.x, b.y - 6)
        })
      }
    } catch { /* skip frame */ }

    setTimeout(() => requestAnimationFrame(loopDetection), 120)
  }

  useEffect(() => {
    if (mode === 'browser') {
      startCamera()
      return () => stopCamera()
    }
  }, [startCamera, mode])

  // ════════════════════════════════════════════════════
  // ── Render ESP32 Mode ────────────────────────────────
  // ════════════════════════════════════════════════════
  if (mode === 'esp32') {
    return (
      <div className="relative w-full bg-gray-950 rounded-xl overflow-hidden" style={{ minHeight: 320 }}>

        {/* Annotated Frame dari YOLO */}
        {annotated ? (
          <img
            src={annotated}
            className="w-full h-full object-contain"
            alt="ESP32-S3 Cam — YOLO Annotated"
            style={{ minHeight: 280, maxHeight: 500 }}
          />
        ) : (
          /* Placeholder saat menunggu ESP32 */
          <div className="flex flex-col items-center justify-center gap-3 py-16 px-4">
            <span className="text-5xl animate-pulse">📡</span>
            <p className="text-white text-sm font-semibold">Menunggu frame dari ESP32-S3...</p>
            <p className="text-gray-400 text-xs text-center">
              Pastikan ESP32 sudah terhubung WiFi dan IP server sudah benar
            </p>
            {loading && (
              <div className="mt-2 flex gap-1">
                {[0,1,2].map(i => (
                  <div
                    key={i}
                    className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Status bar bawah */}
        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-3 py-2 bg-black/60 backdrop-blur-sm">
          {/* Detection label */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-300">🎯</span>
            <span className="text-white text-xs font-bold">{detection}</span>
          </div>

          {/* Connection indicator + frame count */}
          <div className="flex items-center gap-2">
            {connected ? (
              <>
                <span className="text-xs text-green-400 font-mono">{frameCount} frame</span>
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" title="ESP32 terhubung" />
              </>
            ) : (
              <>
                <span className="text-xs text-yellow-400">Menunggu...</span>
                <span className="w-2 h-2 rounded-full bg-yellow-400" />
              </>
            )}
          </div>
        </div>

        {/* Badge mode */}
        <div className="absolute top-2 left-2 bg-blue-600/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur">
          ESP32-S3 CAM
        </div>
      </div>
    )
  }

  // ════════════════════════════════════════════════════
  // ── Render Browser Mode (webcam fallback) ────────────
  // ════════════════════════════════════════════════════
  return (
    <div className="relative w-full bg-gray-900 rounded-xl overflow-hidden" style={{ minHeight: 320 }}>
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <span className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm animate-pulse shadow">
            Memuat kamera...
          </span>
        </div>
      )}
      <video ref={videoRef} muted playsInline className="w-full h-full object-cover" style={{ maxHeight: 500 }} />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }} />
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-blue-700/90 backdrop-blur text-white px-4 py-1.5 rounded-full text-xs shadow font-medium whitespace-nowrap">
        🎯 Buah Terdeteksi: <b>{detection}</b>
      </div>
      <div className="absolute top-2 left-2 bg-gray-700/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
        BROWSER CAM
      </div>
    </div>
  )
}