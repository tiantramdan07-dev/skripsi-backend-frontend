import React from 'react'

interface Props {
  isOpen: boolean
  message: string
  onConfirm: () => void
  onCancel: () => void
}

const ModalKonfirmasi: React.FC<Props> = ({ isOpen, message, onConfirm, onCancel }) => {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-[90%] max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 text-center">
        <div className="text-4xl mb-3">🗑️</div>
        <h3 className="text-lg font-bold mb-2 dark:text-white">Konfirmasi Hapus</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">{message}</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={onCancel}
            className="px-5 py-2 border rounded-xl text-gray-700 dark:text-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 font-medium transition"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition"
          >
            Hapus
          </button>
        </div>
      </div>
    </div>
  )
}

export default ModalKonfirmasi
