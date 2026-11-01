import { useMemo } from 'react'
import { useWeather } from '../context/WeatherContext'
import { iconUrl, fmtTemp, fmtHour } from '../lib/format'

export default function HourlyStrip() {
  const { data, unit } = useWeather()

  const hours = useMemo(() => {
    const days = data?.forecast?.forecastday ?? []
    const all = days.flatMap((d) => d.hour ?? [])
    const nowEpoch = (data?.location?.localtime_epoch ?? Date.now() / 1000) - 30 * 60
    return all.filter((h) => h.time_epoch >= nowEpoch).slice(0, 24)
  }, [data])

  if (hours.length === 0) return null

  return (
    <section className="glass themed rise-in rounded-3xl p-5 sm:p-6" aria-label="Hourly forecast" style={{ animationDelay: '80ms' }}>
      <h3 className="font-display text-lg font-medium themed" style={{ color: 'var(--text-1)' }}>
        Next 24 hours
      </h3>
      <div className="scroll-thin -mx-2 mt-4 flex snap-x gap-1 overflow-x-auto px-2 pb-2">
        {hours.map((h, i) => (
          <div
            key={h.time_epoch}
            className="flex min-w-[4.6rem] snap-start flex-col items-center gap-1.5 rounded-2xl px-2 py-3 transition-colors"
            style={i === 0 ? { background: 'var(--surface)' } : undefined}
          >
            <span className="text-xs font-medium themed" style={{ color: 'var(--text-3)' }}>
              {i === 0 ? 'Now' : fmtHour(h.time_epoch)}
            </span>
            <img src={iconUrl(h.condition, 64)} alt={h.condition.text} className="wicon h-9 w-9" />
            <span className="text-sm font-semibold themed" style={{ color: 'var(--text-1)' }}>
              {fmtTemp(h.temp_c, h.temp_f, unit)}
            </span>
            <span className="flex items-center gap-0.5 text-[11px] themed" style={{ color: 'var(--text-3)' }}>
              {h.chance_of_snow > h.chance_of_rain ? (
                <>❄ {h.chance_of_snow}%</>
              ) : h.chance_of_rain > 0 ? (
                <>
                  <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 2.1C9 6.4 5.5 10.5 5.5 14.5a6.5 6.5 0 1013 0c0-4-3.5-8.1-6.5-12.4z" />
                  </svg>
                  {h.chance_of_rain}%
                </>
              ) : (
                <span className="opacity-0">·</span>
              )}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
