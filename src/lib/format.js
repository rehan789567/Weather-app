export function iconUrl(condition, size = 128) {
  const raw = condition?.icon ?? ''
  const url = raw.startsWith('//') ? `https:${raw}` : raw
  return url.replace('64x64', `${size}x${size}`)
}

export function fmtTemp(c, f, unit) {
  const v = unit === 'F' ? f : c
  return `${Math.round(v ?? 0)}°`
}

export function fmtHour(epoch, tzOffsetHint) {
  const d = new Date(epoch * 1000)
  return d.toLocaleTimeString([], { hour: 'numeric', hour12: true })
}

export function dayName(dateStr, index) {
  if (index === 0) return 'Today'
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString([], { weekday: 'short' })
}

export function fmtLocalDate(localtime) {
  // "2026-07-16 15:45"
  const [datePart] = (localtime ?? '').split(' ')
  if (!datePart) return ''
  const [y, m, d] = datePart.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

export const EPA_LEVELS = [
  { label: 'Good', color: '#22c55e' },
  { label: 'Moderate', color: '#eab308' },
  { label: 'Unhealthy for sensitive groups', color: '#f97316' },
  { label: 'Unhealthy', color: '#ef4444' },
  { label: 'Very unhealthy', color: '#a855f7' },
  { label: 'Hazardous', color: '#9f1239' },
]

export function epaInfo(index) {
  const i = Math.min(6, Math.max(1, Math.round(index ?? 1))) - 1
  return { ...EPA_LEVELS[i], index: i + 1 }
}
