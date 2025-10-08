import { useState, useCallback } from 'react'

interface ConfirmOptions {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'danger' | 'warning' | 'info'
}

interface ConfirmState extends ConfirmOptions {
  isOpen: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function useConfirm() {
  const [confirmState, setConfirmState] = useState<ConfirmState>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    onCancel: () => {},
  })

  const confirm = useCallback(
    (options: ConfirmOptions): Promise<boolean> => {
      return new Promise((resolve) => {
        setConfirmState({
          ...options,
          isOpen: true,
          onConfirm: () => {
            setConfirmState((prev) => ({ ...prev, isOpen: false }))
            resolve(true)
          },
          onCancel: () => {
            setConfirmState((prev) => ({ ...prev, isOpen: false }))
            resolve(false)
          },
        })
      })
    },
    []
  )

  return {
    confirmState,
    confirm,
  }
}
