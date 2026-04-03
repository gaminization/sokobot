import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

import { Icon } from '../components/ui'

type ToastTone = 'info' | 'success' | 'error'

interface ToastItem {
  id: number
  title: string
  description?: string
  tone: ToastTone
}

interface ToastContextValue {
  showToast: (payload: Omit<ToastItem, 'id'>) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

function toneStyles(tone: ToastTone) {
  if (tone === 'success') {
    return {
      border: 'border-tertiary/30',
      icon: 'check_circle',
      iconColor: 'text-tertiary',
    }
  }

  if (tone === 'error') {
    return {
      border: 'border-error/30',
      icon: 'error',
      iconColor: 'text-error',
    }
  }

  return {
    border: 'border-primary/25',
    icon: 'info',
    iconColor: 'text-primary',
  }
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const showToast = useCallback((payload: Omit<ToastItem, 'id'>) => {
    const id = Date.now() + Math.floor(Math.random() * 1000)
    setToasts((current) => [...current, { ...payload, id }])
  }, [])

  useEffect(() => {
    if (!toasts.length) {
      return undefined
    }

    const timers = toasts.map((toast) =>
      window.setTimeout(() => {
        dismissToast(toast.id)
      }, 4200),
    )

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer))
    }
  }, [dismissToast, toasts])

  const value = useMemo<ToastContextValue>(
    () => ({
      showToast,
    }),
    [showToast],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[120] flex justify-end px-4 pb-4 sm:px-6 sm:pb-6">
        <div className="flex w-full max-w-sm flex-col gap-3">
          {toasts.map((toast) => {
            const styles = toneStyles(toast.tone)
            return (
              <div
                key={toast.id}
                className={`pointer-events-auto rounded-xl border ${styles.border} bg-surface-container-low px-4 py-4`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 ${styles.iconColor}`}>
                    <Icon name={styles.icon} className="text-lg" filled />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-on-surface">{toast.title}</p>
                    {toast.description ? <p className="mt-1 text-xs leading-6 text-on-surface-variant">{toast.description}</p> : null}
                  </div>
                  <button
                    type="button"
                    className="text-on-surface-variant transition-colors hover:text-on-surface"
                    onClick={() => dismissToast(toast.id)}
                  >
                    <Icon name="close" className="text-base" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used inside ToastProvider')
  }
  return context
}
