import { useEffect, type RefObject } from 'react'

/** Call `onOutside` when a pointer-down lands outside every given ref. */
export function useClickOutside(
  refs: RefObject<HTMLElement | null>[] | RefObject<HTMLElement | null>,
  onOutside: () => void,
  enabled = true,
) {
  useEffect(() => {
    if (!enabled) return
    const list = Array.isArray(refs) ? refs : [refs]
    function handler(e: MouseEvent | TouchEvent) {
      const target = e.target as Node
      if (list.some((r) => r.current?.contains(target))) return
      onOutside()
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onOutside, enabled])
}
