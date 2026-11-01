const API_KEY = import.meta.env.VITE_WEATHER_API_KEY
const BASE = 'https://api.weatherapi.com/v1'
const CACHE_TTL = 8 * 60 * 1000 // 8 minutes
const memCache = new Map()

function cacheKey(q) {
  return `mw-cache:${q.toLowerCase()}`
}

function readCache(q) {
  const key = cacheKey(q)
  const hit = memCache.get(key)
  if (hit && Date.now() - hit.t < CACHE_TTL) return hit.data
  try {
    const raw = localStorage.getItem(key)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Date.now() - parsed.t < CACHE_TTL) {
        memCache.set(key, parsed)
        return parsed.data
      }
      localStorage.removeItem(key)
    }
  } catch {
    /* storage unavailable — ignore */
  }
  return null
}

function writeCache(q, data) {
  const entry = { t: Date.now(), data }
  memCache.set(cacheKey(q), entry)
  try {
    localStorage.setItem(cacheKey(q), JSON.stringify(entry))
  } catch {
    /* quota — ignore */
  }
}

export async function fetchForecast(q, { days = 7 } = {}) {
  const cached = readCache(q)
  if (cached) return cached

  const url = `${BASE}/forecast.json?key=${API_KEY}&q=${encodeURIComponent(q)}&days=${days}&aqi=yes&alerts=yes`
  const res = await fetch(url)
  const body = await res.json().catch(() => null)

  if (!res.ok) {
    const msg = body?.error?.message ?? `Weather service error (${res.status})`
    // Plan restrictions on aqi/alerts: retry once without extras, fewer days
    if (res.status === 400 || res.status === 403) {
      const retry = await fetch(
        `${BASE}/forecast.json?key=${API_KEY}&q=${encodeURIComponent(q)}&days=3`,
      )
      if (retry.ok) {
        const data = await retry.json()
        writeCache(q, data)
        return data
      }
    }
    const err = new Error(msg)
    err.code = body?.error?.code
    throw err
  }

  writeCache(q, body)
  return body
}

export async function searchLocations(query) {
  if (!query || query.trim().length < 2) return []
  const url = `${BASE}/search.json?key=${API_KEY}&q=${encodeURIComponent(query.trim())}`
  const res = await fetch(url)
  if (!res.ok) return []
  return res.json()
}
