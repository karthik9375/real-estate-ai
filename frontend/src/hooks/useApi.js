import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Runs an async loader and tracks data / loading / error.
 * `deps` re-trigger the load; `reload()` re-runs it manually.
 * Responses from stale requests are ignored.
 */
export function useApi(loader, deps = []) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const requestId = useRef(0)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(loader, deps)

  const load = useCallback(
    async ({ silent = false } = {}) => {
      const id = ++requestId.current
      if (!silent) setLoading(true)
      setError(null)
      try {
        const result = await run()
        if (id === requestId.current) setData(result)
      } catch (err) {
        if (id === requestId.current) setError(err)
      } finally {
        if (id === requestId.current) setLoading(false)
      }
    },
    [run],
  )

  useEffect(() => {
    load()
  }, [load])

  return { data, setData, loading, error, reload: load }
}

export function useDebouncedValue(value, delay = 250) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}
