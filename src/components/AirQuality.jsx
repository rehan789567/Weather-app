import { useWeather } from '../context/WeatherContext'
import { epaInfo, EPA_LEVELS } from '../lib/format'

function Pollutant({ name, value, unitLabel = 'µg/m³' }) {
  if (value == null) return null
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-xs themed" style={{ color: 'var(--text-3)' }}>
        {name}
      </span>
      <span className="text-sm font-medium tabular-nums themed" style={{ color: 'var(--text-1)' }}>
        {value.toFixed(1)}
        <span className="ml-1 text-[10px] font-normal" style={{ color: 'var(--text-3)' }}>
          {unitLabel}
        </span>
      </span>
    </div>
  )
}

export default function AirQuality() {
  const { data } = useWeather()
  const aq = data?.current?.air_quality
  if (!aq || aq['us-epa-index'] == null) return null

  const info = epaInfo(aq['us-epa-index'])
  const pct = ((info.index - 0.5) / 6) * 100

  return (
    <section className="glass themed rise-in rounded-3xl p-5 sm:p-6" aria-label="Air quality" style={{ animationDelay: '240ms' }}>
      <h3 className="font-display text-lg font-medium themed" style={{ color: 'var(--text-1)' }}>
        Air quality
      </h3>

      <div className="mt-3 flex items-center gap-3">
        <span
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white"
          style={{ background: info.color }}
        >
          {info.index}
        </span>
        <div>
          <p className="text-sm font-semibold themed" style={{ color: 'var(--text-1)' }}>
            {info.label}
          </p>
          <p className="text-xs themed" style={{ color: 'var(--text-3)' }}>
            US EPA index
          </p>
        </div>
      </div>

      {/* Scale bar */}
      <div className="relative mt-4">
        <div
          className="flex h-2 overflow-hidden rounded-full"
          role="img"
          aria-label={`Air quality level ${info.index} of 6: ${info.label}`}
        >
          {EPA_LEVELS.map((l) => (
            <div key={l.label} className="h-full flex-1" style={{ background: l.color, opacity: 0.85 }} />
          ))}
        </div>
        <div
          className="absolute -top-1 h-4 w-4 -translate-x-1/2 rounded-full border-2 border-white shadow-md"
          style={{ left: `${pct}%`, background: info.color }}
        />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-2.5">
        <Pollutant name="PM2.5" value={aq.pm2_5} />
        <Pollutant name="PM10" value={aq.pm10} />
        <Pollutant name="Ozone" value={aq.o3} />
        <Pollutant name="NO₂" value={aq.no2} />
        <Pollutant name="SO₂" value={aq.so2} />
        <Pollutant name="CO" value={aq.co} />
      </div>
    </section>
  )
}
