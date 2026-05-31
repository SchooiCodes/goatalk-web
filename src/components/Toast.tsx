import { useState, useEffect } from 'react'
import Icon from './Icon'

interface ToastData {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

let toastListeners: Array<(toasts: ToastData[]) => void> = []
let toastQueue: ToastData[] = []
let toastId = 0

const ICONS = { success: '🌸' as const, error: '💔' as const, info: '💡' as const }

export function showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
  const id = String(++toastId)
  const toast: ToastData = { id, message, type }
  toastQueue = [...toastQueue, toast]
  toastListeners.forEach((fn) => fn(toastQueue))
  setTimeout(() => {
    toastQueue = toastQueue.filter((t) => t.id !== id)
    toastListeners.forEach((fn) => fn(toastQueue))
  }, type === 'error' ? 5000 : 3000)
}

function ToastItem({ toast }: { toast: ToastData }) {
  const bgMap = {
    success: 'bg-[var(--mint-light)] border-[var(--mint)]',
    error: 'bg-[var(--error-light)] border-[var(--error)]',
    info: 'bg-[var(--lavender-light)] border-[var(--lavender)]',
  }
  const textMap = {
    success: 'text-[var(--success)]',
    error: 'text-[var(--error)]',
    info: 'text-[var(--lavender)]',
  }

  return (
    <div
      className={`${bgMap[toast.type]} ${textMap[toast.type]} px-4 py-3 rounded-2xl shadow-lg text-sm font-semibold animate-slide-in-right max-w-xs break-words border flex items-center gap-2`}
    >
      <Icon emoji={ICONS[toast.type]} size={16} />
      <span>{toast.message}</span>
    </div>
  )
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastData[]>([])

  useEffect(() => {
    const listener = (t: ToastData[]) => setToasts([...t])
    toastListeners = [...toastListeners, listener]
    return () => { toastListeners = toastListeners.filter((fn) => fn !== listener) }
  }, [])

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 items-end pointer-events-none">
      {toasts.map((t) => <ToastItem key={t.id} toast={t} />)}
    </div>
  )
}
