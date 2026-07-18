"use client"
import { useState, useEffect, useRef, useCallback } from "react"
import { useQuery } from "@tanstack/react-query"
import { propertiesApi } from "@/lib/api"
import { Property } from "@/types"
import Link from "next/link"
import dynamic from "next/dynamic"
import {
  Search, SlidersHorizontal, Star, Users, Bed,
  Home, MapPin, X, Navigation, Loader2, Map as MapIcon, List
} from "lucide-react"
import { useAuthStore } from "@/store/auth"

const SearchMap = dynamic(
  () => import("@/components/map/SearchMap").then((m) => m.SearchMap),
  { ssr: false, loading: () => <div className="h-full w-full rounded-2xl bg-gray-100 animate-pulse" /> }
)

// ── Currency formatter ────────────────────────────────────────────────────────
const INR = (amount: string | number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0,
  }).format(Number(amount))

// ── Location suggestion type ──────────────────────────────────────────────────
interface LocationSuggestion {
  display_name: string
  city: string
  lat: string
  lon: string
}

// ── Property Card ─────────────────────────────────────────────────────────────
function PropertyCard({ property }: { property: Property }) {
  const { isAuthenticated } = useAuthStore()
  return (
    <Link href={`/properties/${property.id}`} className="group">
      <div className="card overflow-hidden hover:shadow-card-hover transition-shadow duration-200">
        <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
          {property.cover_photo ? (
            <img
              src={property.cover_photo}
              alt={property.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Home className="w-10 h-10 text-gray-300" />
            </div>
          )}
          <div className="absolute top-3 left-3 bg-white/90 backdrop-blur rounded-lg px-2 py-1 text-xs font-medium capitalize text-gray-600">
            {property.property_type?.replace("_", " ")}
          </div>
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2 flex-1">
              {property.title}
            </h3>
            {parseFloat(property.avg_rating) > 0 && (
              <div className="flex items-center gap-1 text-xs font-medium text-gray-700 flex-shrink-0">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                {parseFloat(property.avg_rating).toFixed(1)}
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500 mb-3 flex items-center gap-1">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            {property.city}, {property.country}
            {property.distance_km != null && (
              <span className="text-brand-600 font-medium ml-1">
                · {property.distance_km < 1
                    ? `${Math.round(property.distance_km * 1000)} m`
                    : `${property.distance_km} km`} away
              </span>
            )}
          </p>
          <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" /> {property.max_guests}
            </span>
            <span className="flex items-center gap-1">
              <Bed className="w-3.5 h-3.5" /> {property.beds} bed{property.beds !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="font-bold text-gray-900">{INR(property.price_per_night)}</span>
            <span className="text-xs text-gray-400">/ night</span>
          </div>
        </div>
      </div>
    </Link>
  )
}

// ── Location search input with suggestions ────────────────────────────────────
function LocationInput({
  value,
  onChange,
  onSelect,
}: {
  value: string
  onChange: (v: string) => void
  onSelect: (city: string) => void
}) {
  const [suggestions, setSuggestions]   = useState<LocationSuggestion[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading]           = useState(false)
  const debounceRef = useRef<NodeJS.Timeout>()

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 2) { setSuggestions([]); return }
    setLoading(true)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=6&featuretype=city`,
        { headers: { "Accept-Language": "en" } }
      )
      const data = await res.json()
      const mapped: LocationSuggestion[] = data.map((item: any) => ({
        display_name: item.display_name,
        city: item.address?.city
          || item.address?.town
          || item.address?.village
          || item.address?.county
          || item.name,
        lat: item.lat,
        lon: item.lon,
      }))
      setSuggestions(mapped)
      setShowDropdown(true)
    } catch {
      setSuggestions([])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleChange = (v: string) => {
    onChange(v)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchSuggestions(v), 350)
  }

  const handleSelect = (s: LocationSuggestion) => {
    onChange(s.city)
    onSelect(s.city)
    setShowDropdown(false)
    setSuggestions([])
  }

  return (
    <div className="relative flex-1">
      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
      {loading && (
        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin z-10" />
      )}
      <input
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
        className="input pl-9 pr-9"
        placeholder="Search city or area…"
      />
      {showDropdown && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-float z-50 overflow-hidden">
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              onMouseDown={() => handleSelect(s)}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-start gap-3 border-b border-gray-50 last:border-0"
            >
              <MapPin className="w-4 h-4 text-brand-400 flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{s.city}</p>
                <p className="text-xs text-gray-400 truncate">{s.display_name}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main Search Page ──────────────────────────────────────────────────────────
const PROPERTY_TYPES = [
  "apartment","house","villa","studio","cabin","hotel_room","hostel"
]

export default function SearchPage() {
  const today = new Date().toISOString().split("T")[0]

  const [locationCity, setLocationCity]         = useState("")
  const [locationDetected, setLocationDetected] = useState(false)
  const [locationLoading, setLocationLoading]   = useState(false)
  const [locationBanner, setLocationBanner]     = useState(false)
  const [userCoords, setUserCoords]             = useState<{ lat: number; lng: number } | null>(null)
  const [view, setView]                         = useState<"list" | "map">("list")

  const [filters, setFilters] = useState({
    search:        "",
    city:          "",
    check_in:      "",
    check_out:     "",
    min_price:     "",
    max_price:     "",
    min_guests:    "",
    property_type: "",
    allows_pets:   false,
  })
  const [applied, setApplied] = useState<typeof filters>(filters)
  const [showFilters, setShowFilters] = useState(false)

  // ── GPS detection — store coords for nearest-first sorting, and reverse
  //    geocode just for the "near <city>" label ────────────────────────────
  const detectLocation = useCallback(() => {
    if (!navigator.geolocation) return
    setLocationLoading(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        setUserCoords({ lat: latitude, lng: longitude })
        setLocationDetected(true)
        setLocationBanner(true)
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: { "Accept-Language": "en" } }
          )
          const data = await res.json()
          const city =
            data.address?.city ||
            data.address?.town ||
            data.address?.village ||
            data.address?.county ||
            ""
          if (city) setLocationCity(city)
        } catch {}
        setLocationLoading(false)
      },
      () => setLocationLoading(false),
      { timeout: 5000 }
    )
  }, [])

  // Auto-detect on mount
  useEffect(() => { detectLocation() }, [detectLocation])

  // Switching to map view: if we don't have GPS yet (denied/skipped earlier),
  // ask again so the map can zoom to the guest's position
  const openMapView = () => {
    setView("map")
    if (!userCoords && !locationLoading) detectLocation()
  }

  const { data, isLoading } = useQuery({
    queryKey: ["properties", applied, userCoords],
    queryFn: () =>
      propertiesApi.list({
        search:        applied.search || undefined,
        city:          applied.city || undefined,
        check_in:      applied.check_in || undefined,
        check_out:     applied.check_out || undefined,
        min_price:     applied.min_price || undefined,
        max_price:     applied.max_price || undefined,
        min_guests:    applied.min_guests || undefined,
        property_type: applied.property_type || undefined,
        allows_pets:   applied.allows_pets || undefined,
        near_lat:      userCoords?.lat,
        near_lng:      userCoords?.lng,
      }).then((r) => r.data),
  })

  const properties: Property[] = data?.results || data || []

  const applyFilters = () => setApplied({ ...filters })

  const clearFilters = () => {
    const empty = {
      search:"", city:"", check_in:"", check_out:"",
      min_price:"", max_price:"", min_guests:"",
      property_type:"", allows_pets: false,
    }
    setFilters(empty)
    setApplied(empty)
    setLocationBanner(false)
  }

  const hasActiveFilters = Object.entries(applied).some(([k, v]) =>
    k !== "search" && Boolean(v)
  )

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

      {/* Location detected banner */}
      {locationBanner && locationDetected && (
        <div className="flex items-center gap-3 bg-brand-50 border border-brand-200 rounded-xl px-4 py-3 mb-4">
          <Navigation className="w-4 h-4 text-brand-500 flex-shrink-0" />
          <p className="text-sm text-brand-700 flex-1">
            Showing places nearest to you{locationCity && <> — near <strong>{locationCity}</strong></>}
          </p>
          <button
            onClick={() => {
              setLocationBanner(false)
              setUserCoords(null)
              setLocationDetected(false)
            }}
            className="text-brand-400 hover:text-brand-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Loading location */}
      {locationLoading && (
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Loader2 className="w-4 h-4 animate-spin" />
          Detecting your location…
        </div>
      )}

      {/* Search bar */}
      <div className="flex gap-2 mb-4 flex-wrap sm:flex-nowrap">
        {/* Location input with suggestions */}
        <LocationInput
          value={filters.city}
          onChange={(v) => setFilters((f) => ({ ...f, city: v }))}
          onSelect={(city) => {
            const newFilters = { ...filters, city }
            setFilters(newFilters)
            setApplied(newFilters)
          }}
        />

        {/* Keyword search */}
        <div className="relative flex-1 sm:flex-none sm:w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && applyFilters()}
            className="input pl-9 w-full"
            placeholder="Keyword…"
          />
        </div>

        {/* Dates */}
        <input
          type="date" min={today} value={filters.check_in}
          onChange={(e) => setFilters((f) => ({ ...f, check_in: e.target.value, check_out: "" }))}
          className="input w-36 text-sm flex-shrink-0"
        />
        <input
          type="date" min={filters.check_in || today} value={filters.check_out}
          onChange={(e) => setFilters((f) => ({ ...f, check_out: e.target.value }))}
          className="input w-36 text-sm flex-shrink-0"
        />

        <button
          onClick={() => setShowFilters((s) => !s)}
          className={`btn-secondary flex items-center gap-2 flex-shrink-0 ${showFilters ? "border-brand-400 text-brand-600" : ""}`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters
          {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-brand-500" />}
        </button>

        <button onClick={applyFilters} className="btn-primary flex items-center gap-2 flex-shrink-0">
          <Search className="w-4 h-4" /> Search
        </button>
      </div>

      {/* Expanded filters */}
      {showFilters && (
        <div className="card p-5 mb-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <label className="label">Property type</label>
            <select
              value={filters.property_type}
              onChange={(e) => setFilters((f) => ({ ...f, property_type: e.target.value }))}
              className="input"
            >
              <option value="">Any</option>
              {PROPERTY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1).replace("_", " ")}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Min price (₹)</label>
            <input
              type="number" value={filters.min_price}
              onChange={(e) => setFilters((f) => ({ ...f, min_price: e.target.value }))}
              className="input" placeholder="0"
            />
          </div>
          <div>
            <label className="label">Max price (₹)</label>
            <input
              type="number" value={filters.max_price}
              onChange={(e) => setFilters((f) => ({ ...f, max_price: e.target.value }))}
              className="input" placeholder="Any"
            />
          </div>
          <div>
            <label className="label">Min guests</label>
            <input
              type="number" min={1} value={filters.min_guests}
              onChange={(e) => setFilters((f) => ({ ...f, min_guests: e.target.value }))}
              className="input" placeholder="1"
            />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox" checked={filters.allows_pets}
                onChange={(e) => setFilters((f) => ({ ...f, allows_pets: e.target.checked }))}
                className="w-4 h-4 accent-brand-600"
              />
              <span className="text-sm font-medium text-gray-700">Pets OK</span>
            </label>
          </div>
          <div className="flex items-end gap-2">
            <button onClick={clearFilters} className="btn-ghost text-sm flex items-center gap-1 flex-1">
              <X className="w-3.5 h-3.5" /> Clear
            </button>
            <button onClick={applyFilters} className="btn-primary text-sm flex-1">Apply</button>
          </div>
        </div>
      )}

      {/* Active date badge */}
      {(applied.check_in || applied.check_out) && (
        <div className="flex items-center gap-2 mb-4">
          <span className="badge bg-brand-100 text-brand-700 text-xs">
            {applied.check_in} → {applied.check_out}
          </span>
          <button
            onClick={() => {
              setFilters((f) => ({ ...f, check_in: "", check_out: "" }))
              setApplied((f) => ({ ...f, check_in: "", check_out: "" }))
            }}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Results header */}
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <p className="text-sm text-gray-500">
          {isLoading
            ? "Searching…"
            : `${properties.length} place${properties.length !== 1 ? "s" : ""} found`}
          {applied.city && ` in ${applied.city}`}
          {!applied.city && locationDetected && " · nearest first"}
          {applied.check_in && ` · ${applied.check_in} → ${applied.check_out}`}
        </p>
        <div className="flex items-center gap-2">
          {!locationDetected && !locationLoading && (
            <button
              onClick={detectLocation}
              className="btn-ghost text-sm flex items-center gap-1.5 text-brand-600"
            >
              <Navigation className="w-3.5 h-3.5" />
              Use my location
            </button>
          )}
          {/* List / map toggle */}
          <div className="flex rounded-xl border border-gray-200 overflow-hidden">
            <button
              onClick={() => setView("list")}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
                view === "list" ? "bg-gray-900 text-white" : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              <List className="w-4 h-4" /> List
            </button>
            <button
              onClick={openMapView}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
                view === "map" ? "bg-gray-900 text-white" : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              <MapIcon className="w-4 h-4" /> Map
            </button>
          </div>
        </div>
      </div>

      {/* Results — list or map */}
      {view === "map" ? (
        <div className="h-[calc(100dvh-16rem)] min-h-[24rem]">
          <SearchMap
            properties={properties}
            userLocation={userCoords}
            onLocate={detectLocation}
            locating={locationLoading}
          />
        </div>
      ) : isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="card overflow-hidden animate-pulse">
              <div className="aspect-[4/3] bg-gray-200" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
                <div className="h-4 bg-gray-200 rounded w-1/4 mt-3" />
              </div>
            </div>
          ))}
        </div>
      ) : properties.length === 0 ? (
        <div className="card p-20 text-center">
          <Home className="w-10 h-10 mx-auto mb-3 text-gray-200" />
          <p className="font-medium text-gray-600">No properties found</p>
          <p className="text-sm text-gray-400 mt-1">
            {applied.city
              ? `No listings in ${applied.city} yet. Try a nearby city or clear filters.`
              : "Try adjusting your search or filters"}
          </p>
          <button onClick={clearFilters} className="btn-secondary text-sm mt-5">
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {properties.map((p: Property) => (
            <PropertyCard key={p.id} property={p} />
          ))}
        </div>
      )}
    </div>
  )
}
