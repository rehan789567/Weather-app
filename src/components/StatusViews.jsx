import { useWeather } from '../context/WeatherContext'

export function LoadingView() {
  return (
    <div className="flex flex-col gap-5 sm:gap-6" aria-label="Loading weather" role="status">
      <div className="shimmer h-56 rounded-3xl" />
      <div className="shimmer h-36 rounded-3xl" />
      <div className="grid grid-cols-1 gap-5 sm:gap-6 lg:grid-cols-5">
        <div className="shimmer h-72 rounded-3xl lg:col-span-3" />
        <div className="flex flex-col gap-5 sm:gap-6 lg:col-span-2">
          <div className="shimmer h-44 rounded-3xl" />
          <div className="shimmer h-44 rounded-3xl" />
        </div>
      </div>
      <p className="text-center text-sm themed" style={{ color: 'var(--text-3)' }}>
        Finding your sky…
      </p>
    </div>
  )
}

export function ErrorView() {
  const { error, retry } = useWeather()
  return (
    <div className="glass themed mx-auto mt-16 max-w-md rounded-3xl p-8 text-center" role="alert">
      <p className="font-display text-xl font-medium themed" style={{ color: 'var(--text-1)' }}>
        Couldn't load the weather
      </p>
      <p className="mt-2 text-sm themed" style={{ color: 'var(--text-2)' }}>
        {error ?? 'Something went wrong.'}
      </p>
      <p className="mt-1 text-xs themed" style={{ color: 'var(--text-3)' }}>
        Try searching for a city above, or retry.
      </p>
      <button
        type="button"
        onClick={retry}
        className="themed mt-5 rounded-full px-5 py-2 text-sm font-medium transition-transform hover:scale-105"
        style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
      >
        Retry
      </button>
    </div>
  )
}
