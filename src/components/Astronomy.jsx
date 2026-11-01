import { useWeather } from '../context/WeatherContext'

function ArcIcon({ progress, isSun }) {
  // Small semicircle arc with the body positioned along it
  const p = Math.min(1, Math.max(0, progress))
  const angle = Math.PI * (1 - p)
  const cx = 60 + 48 * Math.cos(angle)
  const cy = 54 - 44 * Math.sin(angle)
  return (
    <svg viewBox="0 0 120 60" className="w-full" aria-hidden="true">
      <path
        d="M 12 54 A 48 44 0 0 1 108 54"
        fill="none"
        stroke="var(--border)"
        strokeWidth="2"
        strokeDasharray="3 5"
        strokeLinecap="round"
      />
      <line x1="4" y1="54" x2="116" y2="54" stroke="var(--border)" strokeWidth="1.5" />
      <circle
        cx={cx}
        cy={cy}
        r="7"
        fill={isSun ? '#fbbf24' : '#cbd5e1'}
        style={{ filter: `drop-shadow(0 0 8px ${isSun ? 'rgba(251,191,36,0.8)' : 'rgba(203,213,225,0.7)'})` }}
      />
    </svg>
  )
}

export default function Astronomy() {
  const { celestial } = useWeather()
  if (!celestial) return null

  const { isDay, sunProgress, moonProgress, sunrise, sunset, moonPhase, moonIllumination } = celestial

  return (
    <section className="glass themed rise-in rounded-3xl p-5 sm:p-6" aria-label="Sun and moon" style={{ animationDelay: '320ms' }}>
      <h3 className="font-display text-lg font-medium themed" style={{ color: 'var(--text-1)' }}>
        {isDay ? 'Sun' : 'Moon'}
      </h3>

      <div className="mx-auto mt-2 max-w-[240px]">
        <ArcIcon progress={isDay ? sunProgress : moonProgress} isSun={isDay} />
      </div>

      <div className="mt-3 flex justify-between text-sm">
        <div>
          <p className="text-[11px] uppercase tracking-[0.14em] themed" style={{ color: 'var(--text-3)' }}>
            Sunrise
          </p>
          <p className="font-medium themed" style={{ color: 'var(--text-1)' }}>
            {sunrise ?? '—'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] uppercase tracking-[0.14em] themed" style={{ color: 'var(--text-3)' }}>
            Sunset
          </p>
          <p className="font-medium themed" style={{ color: 'var(--text-1)' }}>
            {sunset ?? '—'}
          </p>
        </div>
      </div>

      <p className="mt-3 border-t pt-3 text-xs themed" style={{ borderColor: 'var(--border)', color: 'var(--text-3)' }}>
        {moonPhase} · {Math.round(moonIllumination * 100)}% illuminated
      </p>
    </section>
  )
}
