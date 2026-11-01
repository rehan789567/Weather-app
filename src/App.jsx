import { WeatherProvider, useWeather } from './context/WeatherContext'
import SkyScene from './three/SkyScene'
import Header from './components/Header'
import AlertsBanner from './components/AlertsBanner'
import CurrentWeather from './components/CurrentWeather'
import HourlyStrip from './components/HourlyStrip'
import DailyForecast from './components/DailyForecast'
import AirQuality from './components/AirQuality'
import Astronomy from './components/Astronomy'
import { LoadingView, ErrorView } from './components/StatusViews'

function Dashboard() {
  const { status } = useWeather()

  return (
    <div className="relative min-h-screen">
      <SkyScene />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 pb-16 sm:px-6 lg:px-8">
        <Header />
        <AlertsBanner />

        {status === 'loading' && <LoadingView />}
        {status === 'error' && <ErrorView />}

        {status === 'ready' && (
          <main className="flex flex-col gap-5 sm:gap-6">
            <CurrentWeather />
            <HourlyStrip />
            <div className="grid grid-cols-1 gap-5 sm:gap-6 lg:grid-cols-5">
              <div className="lg:col-span-3">
                <DailyForecast />
              </div>
              <div className="flex flex-col gap-5 sm:gap-6 lg:col-span-2">
                <AirQuality />
                <Astronomy />
              </div>
            </div>
          </main>
        )}

        <footer className="mt-auto pt-10 text-center text-xs themed" style={{ color: 'var(--text-3)' }}>
          Weather by <a href="https://open-meteo.com/" target="_blank" rel="noreferrer" className="underline underline-offset-2">Open-Meteo</a>
          {' · Location by '}
          <a href="https://freeipapi.com/" target="_blank" rel="noreferrer" className="underline underline-offset-2">freeipapi</a>
          {' · My Weather'}
        </footer>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <WeatherProvider>
      <Dashboard />
    </WeatherProvider>
  )
}
