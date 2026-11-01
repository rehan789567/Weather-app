import { useWeather } from '../context/WeatherContext'

export default function UnitToggle() {
  const { unit, setUnit } = useWeather()

  return (
    <div
      className="glass themed relative flex rounded-full p-1 text-sm font-medium"
      role="group"
      aria-label="Temperature unit"
    >
      {['C', 'F'].map((u) => {
        const selected = unit === u
        return (
          <button
            key={u}
            type="button"
            aria-pressed={selected}
            onClick={() => setUnit(u)}
            className="themed rounded-full px-3.5 py-1.5 transition-all"
            style={{
              background: selected ? 'var(--accent)' : 'transparent',
              color: selected ? 'var(--accent-contrast)' : 'var(--text-2)',
            }}
          >
            °{u}
          </button>
        )
      })}
    </div>
  )
}
