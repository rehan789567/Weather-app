const FORECAST_BASE = 'https://api.open-meteo.com/v1/forecast'
const GEOCODING_BASE = 'https://geocoding-api.open-meteo.com/v1/search'
const AIR_QUALITY_BASE = 'https://air-quality-api.open-meteo.com/v1/air-quality'
const CACHE_TTL = 8 * 60 * 1000 // 8 minutes
const memCache = new Map()
const locationHints = new Map()

const CONDITIONS = {
  0: [1000, 'Clear', 113],
  1: [1003, 'Mainly clear', 116],
  2: [1006, 'Partly cloudy', 119],
  3: [1009, 'Overcast', 122],
  45: [1135, 'Fog', 248],
  48: [1147, 'Rime fog', 260],
  51: [1150, 'Light drizzle', 263],
  53: [1153, 'Drizzle', 266],
  55: [1180, 'Dense drizzle', 266],
  56: [1168, 'Freezing drizzle', 281],
  57: [1171, 'Dense freezing drizzle', 284],
  61: [1180, 'Light rain', 296],
  63: [1183, 'Moderate rain', 302],
  65: [1195, 'Heavy rain', 308],
  66: [1198, 'Freezing rain', 311],
  67: [1201, 'Heavy freezing rain', 314],
  71: [1210, 'Light snow', 326],
  73: [1213, 'Moderate snow', 332],
  75: [1225, 'Heavy snow', 338],
  77: [1210, 'Snow grains', 323],
  80: [1240, 'Light rain showers', 353],
  81: [1243, 'Rain showers', 356],
  82: [1246, 'Heavy rain showers', 359],
  85: [1255, 'Light snow showers', 368],
  86: [1258, 'Heavy snow showers', 371],
  95: [1087, 'Thunderstorm', 386],
  96: [1276, 'Thunderstorm with hail', 389],
  99: [1282, 'Heavy thunderstorm with hail', 389],
}

const MOON_PHASES = [
  'New Moon',
  'Waxing Crescent',
  'First Quarter',
  'Waxing Gibbous',
  'Full Moon',
  'Waning Gibbous',
  'Last Quarter',
  'Waning Crescent',
]

async function fetchJson(url) {
  const response = await fetch(url)
  const body = await response.json().catch(() => null)
  if (!response.ok) throw new Error(body?.reason ?? `Weather service error (${response.status})`)
  return body
}

function coordinateKey(latitude, longitude) {
  return `${Number(latitude).toFixed(4)},${Number(longitude).toFixed(4)}`
}

function localEpoch(localTime, offsetSeconds) {
  return Math.floor(Date.parse(`${localTime}:00Z`) / 1000) - offsetSeconds
}

function clockTime(dateTime) {
  const time = dateTime?.split('T')[1]?.slice(0, 5)
  if (!time) return null
  const [hours, minutes] = time.split(':').map(Number)
  return `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${hours >= 12 ? 'PM' : 'AM'}`
}

function moonDetails(date) {
  const [year, month, day] = date.split('-').map(Number)
  const timestamp = Date.UTC(year, month - 1, day, 12)
  const knownNewMoon = Date.UTC(2000, 0, 6, 18, 14)
  const synodicMonth = 29.530588853
  const age = (((timestamp - knownNewMoon) / 86400000) % synodicMonth + synodicMonth) % synodicMonth
  const phase = age / synodicMonth
  const phaseIndex = Math.round(phase * 8) % 8
  return {
    moon_phase: MOON_PHASES[phaseIndex],
    moon_illumination: Math.round(((1 - Math.cos(phase * 2 * Math.PI)) / 2) * 100),
  }
}

function conditionFor(code, isDay = 1) {
  const [weatherCode, text, icon] = CONDITIONS[code] ?? [1000, 'Unknown conditions', 113]
  const timeOfDay = isDay ? 'day' : 'night'
  return {
    code: weatherCode,
    text,
    icon: `//cdn.weatherapi.com/weather/64x64/${timeOfDay}/${icon}.png`,
  }
}

function fahrenheit(celsius) {
  return (celsius * 9) / 5 + 32
}

function compassDirection(degrees) {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
  return directions[Math.round(degrees / 22.5) % 16]
}

async function resolveLocation(query) {
  const coordinateMatch = query.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/)
  if (coordinateMatch) {
    const latitude = Number(coordinateMatch[1])
    const longitude = Number(coordinateMatch[2])
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      throw new Error('Those coordinates are outside the valid range.')
    }
    const hint = locationHints.get(coordinateKey(latitude, longitude))
    return {
      latitude,
      longitude,
      name: hint?.name ?? 'Your location',
      region: hint?.region ?? '',
      country: hint?.country ?? '',
    }
  }

  if (query.toLowerCase() === 'auto:ip') {
    const place = await fetchJson('https://freeipapi.com/api/json/')
    if (place.latitude == null || place.longitude == null) {
      throw new Error('Could not determine your location. Search for a city instead.')
    }
    return {
      latitude: place.latitude,
      longitude: place.longitude,
      name: place.cityName || 'Your location',
      region: place.regionName || '',
      country: place.countryName || '',
    }
  }

  const url = new URL(GEOCODING_BASE)
  url.searchParams.set('name', query.trim())
  url.searchParams.set('count', '1')
  url.searchParams.set('language', 'en')
  url.searchParams.set('format', 'json')
  const result = await fetchJson(url)
  const place = result.results?.[0]
  if (!place) throw new Error('Location not found. Try another city.')
  const location = {
    latitude: place.latitude,
    longitude: place.longitude,
    name: place.name,
    region: place.admin1 || '',
    country: place.country || '',
  }
  locationHints.set(coordinateKey(location.latitude, location.longitude), location)
  return location
}

function mapForecast(weather, air, place, query) {
  const offset = weather.utc_offset_seconds ?? 0
  const currentTime = weather.current.time
  const currentLocalTime = currentTime.replace('T', ' ')
  const currentData = weather.current
  const hourlyByDate = new Map()

  weather.hourly.time.forEach((time, index) => {
    const date = time.slice(0, 10)
    const hour = {
      time: `${date} ${time.slice(11, 16)}`,
      time_epoch: localEpoch(time, offset),
      temp_c: weather.hourly.temperature_2m[index],
      temp_f: fahrenheit(weather.hourly.temperature_2m[index]),
      condition: conditionFor(weather.hourly.weather_code[index]),
      chance_of_rain: weather.hourly.precipitation_probability[index] ?? 0,
      chance_of_snow: weather.hourly.snowfall[index] > 0 ? weather.hourly.precipitation_probability[index] ?? 0 : 0,
    }
    if (!hourlyByDate.has(date)) hourlyByDate.set(date, [])
    hourlyByDate.get(date).push(hour)
  })

  const forecastday = weather.daily.time.map((date, index) => {
    const chanceOfPrecipitation = weather.daily.precipitation_probability_max[index] ?? 0
    const moon = moonDetails(date)
    return {
      date,
      day: {
        maxtemp_c: weather.daily.temperature_2m_max[index],
        maxtemp_f: fahrenheit(weather.daily.temperature_2m_max[index]),
        mintemp_c: weather.daily.temperature_2m_min[index],
        mintemp_f: fahrenheit(weather.daily.temperature_2m_min[index]),
        condition: conditionFor(weather.daily.weather_code[index]),
        daily_chance_of_rain: chanceOfPrecipitation,
        daily_chance_of_snow: 0,
      },
      astro: {
        sunrise: clockTime(weather.daily.sunrise[index]),
        sunset: clockTime(weather.daily.sunset[index]),
        ...moon,
      },
      hour: hourlyByDate.get(date) ?? [],
    }
  })

  const airCurrent = air?.current
  const airQuality = airCurrent
    ? {
        'us-epa-index': airCurrent.us_aqi == null
          ? null
          : airCurrent.us_aqi <= 50
            ? 1
            : airCurrent.us_aqi <= 100
              ? 2
              : airCurrent.us_aqi <= 150
                ? 3
                : airCurrent.us_aqi <= 200
                  ? 4
                  : airCurrent.us_aqi <= 300
                    ? 5
                    : 6,
        pm2_5: airCurrent.pm2_5,
        pm10: airCurrent.pm10,
        o3: airCurrent.ozone,
        no2: airCurrent.nitrogen_dioxide,
        so2: airCurrent.sulphur_dioxide,
        co: airCurrent.carbon_monoxide,
      }
    : undefined

  const location = {
    name: place.name,
    region: place.region,
    country: place.country,
    lat: place.latitude,
    lon: place.longitude,
    localtime: currentLocalTime,
    localtime_epoch: localEpoch(currentTime, offset),
    tz_id: weather.timezone,
  }
  const current = {
    temp_c: currentData.temperature_2m,
    temp_f: fahrenheit(currentData.temperature_2m),
    feelslike_c: currentData.apparent_temperature,
    feelslike_f: fahrenheit(currentData.apparent_temperature),
    condition: conditionFor(currentData.weather_code, currentData.is_day),
    wind_kph: currentData.wind_speed_10m,
    wind_mph: currentData.wind_speed_10m * 0.621371,
    wind_dir: compassDirection(currentData.wind_direction_10m),
    humidity: currentData.relative_humidity_2m,
    uv: currentData.uv_index,
    vis_km: currentData.visibility / 1000,
    vis_miles: currentData.visibility / 1609.344,
    pressure_mb: currentData.pressure_msl,
    cloud: currentData.cloud_cover,
    precip_mm: currentData.precipitation,
    is_day: currentData.is_day,
    last_updated: currentLocalTime,
    air_quality: airQuality,
  }

  return {
    location,
    current,
    forecast: { forecastday },
    alerts: { alert: [] },
    query,
  }
}

function cacheKey(q) {
  return `mw-cache:v2:${q.toLowerCase()}`
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

  const place = await resolveLocation(q)
  const forecastUrl = new URL(FORECAST_BASE)
  forecastUrl.searchParams.set('latitude', place.latitude)
  forecastUrl.searchParams.set('longitude', place.longitude)
  forecastUrl.searchParams.set('current', 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,uv_index,visibility')
  forecastUrl.searchParams.set('hourly', 'temperature_2m,precipitation_probability,weather_code,snowfall')
  forecastUrl.searchParams.set('daily', 'weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max')
  forecastUrl.searchParams.set('timezone', 'auto')
  forecastUrl.searchParams.set('forecast_days', String(Math.min(16, Math.max(1, days))))
  forecastUrl.searchParams.set('wind_speed_unit', 'kmh')

  const airUrl = new URL(AIR_QUALITY_BASE)
  airUrl.searchParams.set('latitude', place.latitude)
  airUrl.searchParams.set('longitude', place.longitude)
  airUrl.searchParams.set('current', 'pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,us_aqi')
  airUrl.searchParams.set('timezone', 'auto')

  const [weather, air] = await Promise.all([
    fetchJson(forecastUrl),
    fetchJson(airUrl).catch(() => null),
  ])
  const data = mapForecast(weather, air, place, q)
  writeCache(q, data)
  return data
}

export async function searchLocations(query) {
  if (!query || query.trim().length < 2) return []
  const url = new URL(GEOCODING_BASE)
  url.searchParams.set('name', query.trim())
  url.searchParams.set('count', '6')
  url.searchParams.set('language', 'en')
  url.searchParams.set('format', 'json')
  const result = await fetchJson(url)
  return (result.results ?? []).map((place) => {
    const location = {
      id: place.id,
      name: place.name,
      region: place.admin1 || '',
      country: place.country || '',
      lat: place.latitude,
      lon: place.longitude,
    }
    locationHints.set(coordinateKey(location.lat, location.lon), {
      ...location,
      latitude: location.lat,
      longitude: location.lon,
    })
    return location
  })
}
