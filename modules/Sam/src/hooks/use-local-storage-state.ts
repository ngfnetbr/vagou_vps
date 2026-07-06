import { useEffect, useMemo, useState } from "react"

export function useLocalStorageState<T>(key: string, initialValue: T) {
  const storageKey = useMemo(() => `sam:${key}`, [key])

  const [value, setValue] = useState<T>(() => {
    try {
      const raw = window.localStorage.getItem(storageKey)
      if (raw == null) return initialValue
      return JSON.parse(raw) as T
    } catch {
      return initialValue
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(value))
    } catch {
      return
    }
  }, [storageKey, value])

  return [value, setValue] as const
}

