import { useWeather } from '../context/WeatherContext'
import { iconUrl, fmtTemp, dayName } from '../lib/format'

export default function DailyForecast() {
  const { data, unit } = useWeather()
  const days = data?.forecast?.forecastday ?? []
  if (days.length === 0) return null

  // Range bar scale across the whole week
  const weekMin = Math.min(...days.map((d) => d.day.mintemp_c))
  const weekMax = Math.max(...days.map((d) => d.day.maxtemp_c))
  const span = Math.max(1, weekMax - weekMin)

  return (
    <section
      className="glass themed rise-in h-full rounded-3xl p-5 sm:p-6"
      aria-label="Daily forecast"
      style={{ animationDelay: '160ms' }}
    >
      <h3 className="font-display text-lg font-medium themed" style={{ color: 'var(--text-1)' }}>
        {days.length}-day forecast
      </h3>
      <ul className="mt-3 flex flex-col">
        {days.map((d, i) => {
          const lo = d.day.mintemp_c
          const hi = d.day.maxtemp_c
          const left = ((lo - weekMin) / span) * 100
          const width = Math.max(6, ((hi - lo) / span) * 100)
          const precip =
            d.day.daily_chance_of_snow > d.day.daily_chance_of_rain
              ? { v: d.day.daily_chance_of_snow, icon: '❄' }
              : { v: d.day.daily_chance_of_rain, icon: '💧' }
          return (
            <li
              key={d.date}
              className="flex items-center gap-3 border-b py-2.5 last:border-b-0 sm:gap-4"
              style={{ borderColor: 'var(--border)' }}
            >
              <span className="w-14 shrink-0 text-sm font-medium themed" style={{ color: 'var(--text-1)' }}>
                {dayName(d.date, i)}
              </span>
              <img src={iconUrl(d.day.condition, 64)} alt={d.day.condition.text} title={d.day.condition.text} className="wicon h-8 w-8 shrink-0" />
              <span className="w-12 shrink-0 text-right text-xs tabular-nums themed" style={{ color: 'var(--text-3)' }}>
                {precip.v > 0 ? `${precip.icon} ${precip.v}%` : ''}
              </span>
              <span className="w-9 shrink-0 text-right text-sm tabular-nums themed" style={{ color: 'var(--text-2)' }}>
                {fmtTemp(d.day.mintemp_c, d.day.mintemp_f, unit)}
              </span>
              <div className="relative h-1.5 min-w-8 flex-1 rounded-full" style={{ background: 'var(--border)' }}>
                <div
                  className="absolute inset-y-0 rounded-full"
                  style={{
                    left: `${left}%`,
                    width: `${width}%`,
                    background: 'linear-gradient(90deg, var(--accent), var(--accent))',
                    opacity: 0.9,
                  }}
                />
              </div>
              <span className="w-9 shrink-0 text-right text-sm font-semibold tabular-nums themed" style={{ color: 'var(--text-1)' }}>
                {fmtTemp(d.day.maxtemp_c, d.day.maxtemp_f, unit)}
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
