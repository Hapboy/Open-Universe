// Thin wrapper around window.localStorage: every read/write goes through here
// so JSON parsing, quota errors, and corruption checks are handled in one
// place instead of being reimplemented per context. Kept synchronous (the
// app boots its contexts synchronously from localStorage today); swapping to
// a backend later only means changing this module's internals, not every
// call site.

export function readJSON<T>(
  key: string,
  fallback: T,
  isValid?: (value: unknown) => value is T,
  onInvalid?: () => void
): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    if (isValid && !isValid(parsed)) {
      onInvalid?.()
      return fallback
    }
    return parsed as T
  } catch {
    return fallback
  }
}

export function writeJSON(key: string, value: unknown, onError?: (error: unknown) => void): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    onError?.(error)
  }
}

export function readRaw(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeRaw(key: string, value: string, onError?: (error: unknown) => void): void {
  try {
    localStorage.setItem(key, value)
  } catch (error) {
    onError?.(error)
  }
}

export function removeKey(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    // ignore
  }
}
