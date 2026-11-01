// Maps WeatherAPI condition codes to a normalized weather "kind" plus
// intensity data the 3D scene and theme system share.

const SNOW_CODES = new Set([
  1066, 1069, 1072, 1114, 1117, 1204, 1207, 1210, 1213, 1216, 1219, 1222,
  1225, 1237, 1249, 1252, 1255, 1258, 1261, 1264,
])
const HEAVY_CODES = new Set([1117, 1192, 1195, 1243, 1246, 1225, 1222, 1258, 1264, 1276, 1282])
const LIGHT_CODES = new Set([1063, 1066, 1069, 1072, 1150, 1153, 1180, 1183, 1198, 1204, 1210, 1213, 1240, 1249, 1255, 1261, 1273, 1279])
const STORM_CODES = new Set([1087, 1273, 1276, 1279, 1282])
const MIST_CODES = new Set([1030, 1135, 1147])

export function classifyCondition(current) {
  const code = current?.condition?.code ?? 1000
  const cloud = (current?.cloud ?? 0) / 100
  const precipMm = current?.precip_mm ?? 0

  const isStorm = STORM_CODES.has(code)
  const isSnow = SNOW_CODES.has(code)
  const isMist = MIST_CODES.has(code)
  const isRain =
    !isSnow && ((code >= 1150 && code <= 1246) || code === 1063 || isStorm)

  let intensity = 0.5
  if (LIGHT_CODES.has(code)) intensity = 0.3
  if (HEAVY_CODES.has(code)) intensity = 1.0
  if (precipMm > 4) intensity = Math.max(intensity, 0.9)

  let kind = 'clear'
  if (isStorm) kind = 'storm'
  else if (isSnow) kind = 'snow'
  else if (isRain) kind = 'rain'
  else if (isMist) kind = 'mist'
  else if (code === 1009) kind = 'overcast'
  else if (code === 1006) kind = 'cloudy'
  else if (code === 1003) kind = 'partly'

  // Cloud cover estimate for the 3D scene (0..1)
  let cloudCover = cloud
  if (kind === 'clear') cloudCover = Math.min(cloud, 0.12)
  if (kind === 'partly') cloudCover = Math.max(cloud, 0.35)
  if (kind === 'cloudy') cloudCover = Math.max(cloud, 0.6)
  if (kind === 'overcast' || kind === 'rain' || kind === 'snow')
    cloudCover = Math.max(cloud, 0.85)
  if (kind === 'storm') cloudCover = 1
  if (kind === 'mist') cloudCover = Math.max(cloud, 0.5)

  return {
    kind,
    code,
    cloudCover,
    rain: isRain ? intensity : 0,
    snow: isSnow ? intensity : 0,
    thunder: isStorm,
    fog: isMist ? (code === 1147 || code === 1135 ? 0.85 : 0.5) : 0,
  }
}

// --- Celestial position from real astronomy data -------------------------

function parseClockTime(str) {
  // "05:02 AM" -> minutes since midnight, or null
  if (!str || typeof str !== 'string') return null
  const m = str.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (!m) return null
  let h = parseInt(m[1], 10) % 12
  if (/pm/i.test(m[3])) h += 12
  return h * 60 + parseInt(m[2], 10)
}

function parseLocalMinutes(localtime) {
  // "2026-07-16 15:45" -> minutes since midnight
  const m = /(\d{1,2}):(\d{2})$/.exec(localtime ?? '')
  if (!m) return 12 * 60
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10)
}

/**
 * Computes sun + moon arc progress from the API's astronomy block.
 * Progress 0 = rising at the horizon, 0.5 = zenith, 1 = setting.
 */
export function computeCelestial(data) {
  const astro = data?.forecast?.forecastday?.[0]?.astro ?? {}
  const now = parseLocalMinutes(data?.location?.localtime)
  const sunrise = parseClockTime(astro.sunrise) ?? 6 * 60
  const sunset = parseClockTime(astro.sunset) ?? 18 * 60
  const isDay = data?.current?.is_day === 1

  let sunProgress
  if (sunset > sunrise) {
    sunProgress = (now - sunrise) / (sunset - sunrise)
  } else {
    sunProgress = (now / (24 * 60)) // degenerate (polar) fallback
  }

  // Night progress runs sunset -> next sunrise
  const nightLen = 24 * 60 - (sunset - sunrise)
  let sinceSunset = now - sunset
  if (sinceSunset < 0) sinceSunset += 24 * 60
  const moonProgress = nightLen > 0 ? sinceSunset / nightLen : 0.5

  return {
    isDay,
    sunProgress: Math.min(1.05, Math.max(-0.05, sunProgress)),
    moonProgress: Math.min(1.05, Math.max(-0.05, moonProgress)),
    moonIllumination: Number(astro.moon_illumination ?? 50) / 100,
    moonPhase: astro.moon_phase ?? 'Full Moon',
    sunrise: astro.sunrise,
    sunset: astro.sunset,
  }
}

/**
 * Target parameters for the 3D scene. Everything here is lerped toward each
 * frame, so changing weather cross-fades smoothly.
 */
export function sceneTargets(cond, celestial) {
  const { kind, cloudCover, rain, snow, thunder, fog } = cond
  const { isDay, sunProgress, moonProgress, moonIllumination } = celestial

  const progress = isDay ? sunProgress : moonProgress
  const clamped = Math.min(1, Math.max(0, progress))
  const elev = Math.sin(clamped * Math.PI) // 0 horizon .. 1 zenith
  // How "golden" the light is — strong near sunrise/sunset
  const golden = isDay ? Math.pow(1 - elev, 3) : 0

  // Sky palettes per kind (day)
  const dayPalettes = {
    clear: { zen: '#2f6fe4', hor: '#aecdf6' },
    partly: { zen: '#3b82f6', hor: '#bcd6f5' },
    cloudy: { zen: '#6d84a3', hor: '#c3cedb' },
    overcast: { zen: '#5c6b80', hor: '#a8b3c2' },
    mist: { zen: '#8d9aab', hor: '#d8dee6' },
    rain: { zen: '#4b596d', hor: '#8b98a9' },
    storm: { zen: '#2c3644', hor: '#5c6878' },
    snow: { zen: '#7fa8dc', hor: '#e8eef6' },
  }
  const nightPalettes = {
    clear: { zen: '#070b1c', hor: '#231d4e' },
    partly: { zen: '#0a0f24', hor: '#241f4c' },
    cloudy: { zen: '#0e1322', hor: '#232840' },
    overcast: { zen: '#10141f', hor: '#20263a' },
    mist: { zen: '#151a28', hor: '#2c3244' },
    rain: { zen: '#0d1119', hor: '#1d2430' },
    storm: { zen: '#080b12', hor: '#161c26' },
    snow: { zen: '#131a2e', hor: '#2d3a54' },
  }
  const pal = (isDay ? dayPalettes : nightPalettes)[kind] ?? dayPalettes.clear

  // Sunset warmth bleeds into the horizon on clear-ish days
  const warmth = golden * (1 - cloudCover * 0.75)

  // Light colors
  const sunHigh = '#fff5e0'
  const sunLow = '#ff9d5c'
  const moonCol = '#aebbdd'

  return {
    zenith: pal.zen,
    horizon: pal.hor,
    warmth, // 0..1, shader mixes horizon toward sunset orange
    elev,
    progress: clamped,
    isDay,
    // Directional light
    lightColor: isDay ? mixHex(sunLow, sunHigh, Math.min(1, elev * 2)) : moonCol,
    lightIntensity: isDay
      ? (0.7 + elev * 2.3) * (1 - cloudCover * 0.62)
      : 0.35 * (0.35 + moonIllumination * 0.65),
    ambient: isDay ? 0.55 + elev * 0.5 - cloudCover * 0.22 : 0.16,
    exposure: isDay ? 1.05 - cloudCover * 0.12 : 0.9,
    // Atmosphere
    fogDensity: fog > 0 ? 0.02 + fog * 0.035 : kind === 'storm' ? 0.006 : 0.002,
    fogColor: pal.hor,
    // Elements
    cloudCover,
    cloudColor: isDay
      ? kind === 'storm'
        ? '#39404d'
        : cloudCover > 0.7
          ? '#aab4c0'
          : '#ffffff'
      : '#2a3046',
    cloudDark: isDay ? (kind === 'storm' ? '#1f242e' : '#7a8698') : '#12162a',
    rain,
    snow,
    thunder,
    stars: !isDay ? Math.max(0, 1 - cloudCover * 1.4) : 0,
    moonIllumination,
  }
}

function mixHex(a, b, t) {
  const pa = parseInt(a.slice(1), 16)
  const pb = parseInt(b.slice(1), 16)
  const r = Math.round(((pa >> 16) & 255) * (1 - t) + ((pb >> 16) & 255) * t)
  const g = Math.round(((pa >> 8) & 255) * (1 - t) + ((pb >> 8) & 255) * t)
  const bl = Math.round((pa & 255) * (1 - t) + (pb & 255) * t)
  return `#${((r << 16) | (g << 8) | bl).toString(16).padStart(6, '0')}`
}
