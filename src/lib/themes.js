// Adaptive color themes — the theme is chosen automatically from the live
// weather condition (no manual toggle). Each theme sets CSS custom properties
// consumed by Tailwind arbitrary values and the glass card styles.

export const THEMES = {
  neutral: {
    bgFrom: '#f8fafc',
    bgTo: '#e8edf4',
    surface: 'rgba(255,255,255,0.55)',
    surfaceStrong: 'rgba(255,255,255,0.78)',
    border: 'rgba(30,41,59,0.10)',
    text1: '#1e293b',
    text2: 'rgba(30,41,59,0.72)',
    text3: 'rgba(30,41,59,0.50)',
    accent: '#3b82f6',
    accentContrast: '#ffffff',
    iconShadow: 'rgba(30,41,59,0.25)',
    dark: false,
  },

  // Sunny → warm blues + gold accents
  sunny: {
    bgFrom: '#3b82f6',
    bgTo: '#93c5fd',
    surface: 'rgba(255,255,255,0.16)',
    surfaceStrong: 'rgba(255,255,255,0.26)',
    border: 'rgba(255,255,255,0.28)',
    text1: '#ffffff',
    text2: 'rgba(255,255,255,0.82)',
    text3: 'rgba(255,255,255,0.62)',
    accent: '#fbbf24',
    accentContrast: '#42300b',
    iconShadow: 'rgba(30,58,138,0.45)',
    dark: true,
  },

  // Cloudy daytime → softened blue-grays (between sunny and rainy)
  cloudy: {
    bgFrom: '#7c8ea6',
    bgTo: '#b7c3d2',
    surface: 'rgba(255,255,255,0.18)',
    surfaceStrong: 'rgba(255,255,255,0.30)',
    border: 'rgba(255,255,255,0.30)',
    text1: '#ffffff',
    text2: 'rgba(255,255,255,0.84)',
    text3: 'rgba(255,255,255,0.62)',
    accent: '#e2e8f0',
    accentContrast: '#334155',
    iconShadow: 'rgba(51,65,85,0.45)',
    dark: true,
  },

  // Rainy → cool grays + muted steel blue
  rain: {
    bgFrom: '#64748b',
    bgTo: '#94a3b8',
    surface: 'rgba(226,232,240,0.14)',
    surfaceStrong: 'rgba(226,232,240,0.24)',
    border: 'rgba(226,232,240,0.26)',
    text1: '#f1f5f9',
    text2: 'rgba(241,245,249,0.80)',
    text3: 'rgba(241,245,249,0.58)',
    accent: '#7dd3fc',
    accentContrast: '#0c4a6e',
    iconShadow: 'rgba(15,23,42,0.5)',
    dark: true,
  },

  // Storm → deepest grays, electric accent
  storm: {
    bgFrom: '#374151',
    bgTo: '#6b7280',
    surface: 'rgba(226,232,240,0.12)',
    surfaceStrong: 'rgba(226,232,240,0.20)',
    border: 'rgba(226,232,240,0.22)',
    text1: '#f8fafc',
    text2: 'rgba(248,250,252,0.80)',
    text3: 'rgba(248,250,252,0.56)',
    accent: '#fde047',
    accentContrast: '#422006',
    iconShadow: 'rgba(0,0,0,0.55)',
    dark: true,
  },

  // Snow → pale blue + white + silver (a light theme)
  snow: {
    bgFrom: '#93c5fd',
    bgTo: '#e2e8f0',
    surface: 'rgba(255,255,255,0.50)',
    surfaceStrong: 'rgba(255,255,255,0.72)',
    border: 'rgba(255,255,255,0.65)',
    text1: '#1e3a5f',
    text2: 'rgba(30,58,95,0.75)',
    text3: 'rgba(30,58,95,0.52)',
    accent: '#3b82f6',
    accentContrast: '#ffffff',
    iconShadow: 'rgba(30,58,95,0.30)',
    dark: false,
  },

  // Night → deep navy + soft purple/silver
  night: {
    bgFrom: '#0f172a',
    bgTo: '#1e1b4b',
    surface: 'rgba(167,139,250,0.10)',
    surfaceStrong: 'rgba(167,139,250,0.16)',
    border: 'rgba(226,232,240,0.16)',
    text1: '#e2e8f0',
    text2: 'rgba(226,232,240,0.75)',
    text3: 'rgba(226,232,240,0.52)',
    accent: '#a78bfa',
    accentContrast: '#1e1b4b',
    iconShadow: 'rgba(0,0,0,0.6)',
    dark: true,
  },
}

// Pick a theme key from the current condition + day/night flag.
export function themeKeyFor(kind, isDay) {
  if (!isDay) return 'night'
  switch (kind) {
    case 'clear':
    case 'partly':
      return 'sunny'
    case 'cloudy':
    case 'overcast':
    case 'mist':
      return 'cloudy'
    case 'rain':
      return 'rain'
    case 'storm':
      return 'storm'
    case 'snow':
      return 'snow'
    default:
      return 'neutral'
  }
}

export function applyTheme(key) {
  const t = THEMES[key] ?? THEMES.neutral
  const r = document.documentElement.style
  r.setProperty('--bg-from', t.bgFrom)
  r.setProperty('--bg-to', t.bgTo)
  r.setProperty('--surface', t.surface)
  r.setProperty('--surface-strong', t.surfaceStrong)
  r.setProperty('--border', t.border)
  r.setProperty('--text-1', t.text1)
  r.setProperty('--text-2', t.text2)
  r.setProperty('--text-3', t.text3)
  r.setProperty('--accent', t.accent)
  r.setProperty('--accent-contrast', t.accentContrast)
  r.setProperty('--icon-shadow', t.iconShadow)
}
