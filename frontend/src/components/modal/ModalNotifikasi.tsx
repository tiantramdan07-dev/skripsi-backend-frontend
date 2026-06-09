import React, { useEffect } from 'react'

export type ModalStatus = 'success' | 'error' | 'warning' | 'info' | null

interface Props {
  isOpen: boolean
  message: string
  status: ModalStatus
  onClose: () => void
  autoClose?: number // ms, 0 = no auto close
}

const cfg: Record<NonNullable<ModalStatus>, { bg: string; border: string; icon: string; title: string }> = {
  success: { bg: 'bg-green-50 dark:bg-green-900/30',  border: 'border-green-400', icon: '✅', title: 'Berhasil'   },
  error:   { bg: 'bg-red-50 dark:bg-red-900/30',     border: 'border-red-400',   icon: '❌', title: 'Error'      },
  warning: { bg: 'bg-yellow-50 dark:bg-yellow-900/30',border: 'border-yellow-400',icon: '⚠️', title: 'Perhatian'  },
  info:    { bg: 'bg-blue-50 dark:bg-blue-900/30',   border: 'border-blue-400',  icon: 'ℹ️', title: 'Informasi'  },
}

const ModalNotifikasi: React.FC<Props> = ({ isOpen, message, status, onClose, autoClose = 2500 }) => {
  useEffect(() => {
    if (!isOpen || !autoClose) return
    const t = setTimeout(onClose, autoClose)
    return () => clearTimeout(t)
  }, [isOpen, autoClose, onClose])

  if (!isOpen || !status) return null
  const c = cfg[status]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className={`w-[90%] max-w-sm rounded-2xl border-2 ${c.border} ${c.bg} shadow-2xl p-6 text-center`}>
        <div className="text-4xl mb-3">{c.icon}</div>
        <h3 className="text-lg font-bold mb-2 dark:text-white">{c.title}</h3>
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-5">{message}</p>
        <button
          onClick={onClose}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition"
        >
          OK
        </button>
      </div>
    </div>
  )
}

export default ModalNotifikasi
