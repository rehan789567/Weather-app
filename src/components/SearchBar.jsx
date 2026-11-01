import { useEffect, useRef, useState } from 'react'
import { searchLocations } from '../api/weather'
import { useWeather } from '../context/WeatherContext'

export default function SearchBar() {
  const { search } = useWeather()
  const [value, setValue] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const boxRef = useRef(null)
  const debounceRef = useRef(null)

  useEffect(() => {
    clearTimeout(debounceRef.current)
    if (value.trim().length < 2) {
      setResults([])
      setOpen(false)
      return
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const r = await searchLocations(value)
        setResults(r.slice(0, 6))
        setOpen(r.length > 0)
        setActive(-1)
      } catch {
        setResults([])
      }
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [value])

  useEffect(() => {
    const onClick = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const choose = (loc) => {
    setOpen(false)
    setValue('')
    setResults([])
    search(`${loc.lat},${loc.lon}`)
  }

  const submit = () => {
    if (active >= 0 && results[active]) return choose(results[active])
    if (value.trim()) {
      setOpen(false)
      search(value.trim())
      setValue('')
    }
  }

  return (
    <div ref={boxRef} className="relative">
      <div className="glass themed flex items-center gap-2 rounded-full px-4 py-2.5">
        <svg
          className="h-4 w-4 shrink-0 themed"
          style={{ color: 'var(--text-3)' }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" />
        </svg>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit()
            else if (e.key === 'Escape') setOpen(false)
            else if (e.key === 'ArrowDown') {
              e.preventDefault()
              setActive((a) => Math.min(results.length - 1, a + 1))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setActive((a) => Math.max(-1, a - 1))
            }
          }}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search city or place…"
          aria-label="Search for a city"
          className="w-full bg-transparent text-sm outline-none themed placeholder:opacity-60"
          style={{ color: 'var(--text-1)' }}
        />
      </div>

      {open && (
        <ul
          className="glass-strong themed absolute z-30 mt-2 w-full overflow-hidden rounded-2xl py-1 text-sm shadow-xl"
          role="listbox"
        >
          {results.map((r, i) => (
            <li key={r.id ?? `${r.lat},${r.lon}`}>
              <button
                type="button"
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(r)}
                className="block w-full px-4 py-2.5 text-left transition-colors"
                style={{
                  color: 'var(--text-1)',
                  background: i === active ? 'var(--surface)' : 'transparent',
                }}
              >
                <span className="font-medium">{r.name}</span>
                <span style={{ color: 'var(--text-3)' }}>
                  {r.region ? ` · ${r.region}` : ''} · {r.country}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
