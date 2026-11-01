import { useWeather } from '../context/WeatherContext'
import { iconUrl, fmtTemp, fmtLocalDate } from '../lib/format'

function Stat({ label, value }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] uppercase tracking-[0.14em] themed" style={{ color: 'var(--text-3)' }}>
        {label}
      </span>
      <span className="text-sm font-medium themed sm:text-base" style={{ color: 'var(--text-1)' }}>
        {value}
      </span>
    </div>
  )
}

export default function CurrentWeather() {
  const { data, unit } = useWeather()
  const { location, current } = data

  const wind = unit === 'F' ? `${Math.round(current.wind_mph)} mph` : `${Math.round(current.wind_kph)} km/h`
  const vis = unit === 'F' ? `${Math.round(current.vis_miles)} mi` : `${Math.round(current.vis_km)} km`

  return (
    <section className="glass themed rise-in rounded-3xl p-6 sm:p-8" aria-label="Current weather">
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-xl font-semibold themed sm:text-2xl" style={{ color: 'var(--text-1)' }}>
            {location.name}
            {location.country ? (
              <span className="ml-2 text-sm font-normal themed" style={{ color: 'var(--text-3)' }}>
                {location.region ? `${location.region}, ` : ''}
                {location.country}
              </span>
            ) : null}
          </h2>
          <p className="mt-1 text-sm themed" style={{ color: 'var(--text-2)' }}>
            {fmtLocalDate(location.localtime)} · updated {current.last_updated?.split(' ')[1]}
          </p>

          <div className="mt-5 flex items-center gap-4">
            <img src={iconUrl(current.condition)} alt="" className="wicon h-20 w-20 sm:h-24 sm:w-24" />
            <div>
              <div
                className="font-display text-7xl font-light leading-none tracking-tight themed sm:text-8xl"
                style={{ color: 'var(--text-1)' }}
              >
                {fmtTemp(current.temp_c, current.temp_f, unit)}
                <span className="align-top text-3xl sm:text-4xl" style={{ color: 'var(--text-2)' }}>
                  {unit}
                </span>
              </div>
              <p className="mt-2 text-base font-medium themed sm:text-lg" style={{ color: 'var(--text-2)' }}>
                {current.condition.text}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-x-8 gap-y-4 sm:grid-cols-3 md:max-w-xs md:grid-cols-2 md:pt-2">
          <Stat label="Feels like" value={fmtTemp(current.feelslike_c, current.feelslike_f, unit)} />
          <Stat label="Wind" value={`${wind} ${current.wind_dir}`} />
          <Stat label="Humidity" value={`${current.humidity}%`} />
          <Stat label="UV index" value={Math.round(current.uv)} />
          <Stat label="Visibility" value={vis} />
          <Stat label="Pressure" value={`${Math.round(current.pressure_mb)} mb`} />
        </div>
      </div>
    </section>
  )
}
