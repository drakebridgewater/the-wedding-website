import { useEffect } from 'react'

/**
 * Submit a modal/form when the user presses Enter anywhere on the page,
 * unless focus is in an element that uses Enter itself.
 */
export function useEnterSubmit(onSubmit: () => void, disabled?: boolean) {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key !== 'Enter' || disabled) return
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON' || tag === 'A') return
      e.preventDefault()
      onSubmit()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onSubmit, disabled])
}
