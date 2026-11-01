import SearchBar from './SearchBar'
import UnitToggle from './UnitToggle'

export default function Header() {
  return (
    <header className="flex flex-wrap items-center gap-x-6 gap-y-4 py-6 sm:py-8">
      <h1
        className="font-display text-3xl font-medium italic tracking-tight themed sm:text-4xl"
        style={{ color: 'var(--text-1)' }}
      >
        My&nbsp;Weather
      </h1>

      <div className="order-3 w-full sm:order-none sm:ml-auto sm:w-auto sm:flex-1 sm:max-w-md">
        <SearchBar />
      </div>

      <UnitToggle />
    </header>
  )
}
