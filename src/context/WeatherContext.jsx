import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { fetchForecast } from '../api/weather'
import { classifyCondition, computeCelestial, sceneTargets } from '../lib/conditions'
import { themeKeyFor, applyTheme, THEMES } from '../lib/themes'

const WeatherContext = createContext(null)

const REFRESH_MS = 10 * 60 * 1000

export function WeatherProvider({ children }) {
  const [data, setData] = useState(null)
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [error, setError] = useState(null)
  const [unit, setUnit] = useState(() => localStorage.getItem('mw-unit') ?? 'C')
  const queryRef = useRef(null)

  const load = useCallback(async (q, { silent = false } = {}) => {
    if (!silent) setStatus('loading')
    try {
      const result = await fetchForecast(q)
      queryRef.current = q
      try {
        localStorage.setItem('mw-last-q', q)
      } catch { /* ignore */ }
      setData(result)
      setError(null)
      setStatus('ready')
    } catch (e) {
      if (!silent) {
        setError(e.message ?? 'Could not load the weather.')
        setStatus('error')
      }
    }
  }, [])

  // Initial location: browser geolocation -> last search -> IP lookup
  useEffect(() => {
    let cancelled = false
    const fallback = () => {
      if (cancelled) return
      const last = localStorage.getItem('mw-last-q')
      load(last || 'auto:ip')
    }
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (cancelled) return
          load(`${pos.coords.latitude.toFixed(4)},${pos.coords.longitude.toFixed(4)}`)
        },
        fallback,
        { timeout: 6000, maximumAge: 10 * 60 * 1000 },
      )
    } else {
      fallback()
    }
    return () => {
      cancelled = true
    }
  }, [load])

  // Refresh every 10 minutes so the scene, theme, and data stay in sync
  useEffect(() => {
    const id = setInterval(() => {
      if (queryRef.current) load(queryRef.current, { silent: true })
    }, REFRESH_MS)
    return () => clearInterval(id)
  }, [load])

  const setUnitPersist = useCallback((u) => {
    setUnit(u)
    try {
      localStorage.setItem('mw-unit', u)
    } catch { /* ignore */ }
  }, [])

  // Derived: condition classification, celestial positions, theme, 3D targets
  const derived = useMemo(() => {
    if (!data) {
      return { cond: null, celestial: null, themeKey: 'neutral', scene: null }
    }
    const cond = classifyCondition(data.current)
    const celestial = computeCelestial(data)
    const themeKey = themeKeyFor(cond.kind, celestial.isDay)
    const scene = sceneTargets(cond, celestial)
    return { cond, celestial, themeKey, scene }
  }, [data])

  useEffect(() => {
    applyTheme(status === 'ready' ? derived.themeKey : 'neutral')
  }, [derived.themeKey, status])

  const value = useMemo(
    () => ({
      data,
      status,
      error,
      unit,
      setUnit: setUnitPersist,
      search: (q) => load(q),
      retry: () => load(queryRef.current ?? 'auto:ip'),
      ...derived,
      theme: THEMES[status === 'ready' ? derived.themeKey : 'neutral'],
    }),
    [data, status, error, unit, setUnitPersist, load, derived],
  )

  return <WeatherContext.Provider value={value}>{children}</WeatherContext.Provider>
}

export function useWeather() {
  const ctx = useContext(WeatherContext)
  if (!ctx) throw new Error('useWeather must be used inside WeatherProvider')
  return ctx
}
