"use client"
import { useState, useRef, useCallback } from "react"
import Map, { Marker, NavigationControl, MapRef } from "react-map-gl/maplibre"
import "maplibre-gl/dist/maplibre-gl.css"
import { MapPin, Search, Loader2, Crosshair } from "lucide-react"
import toast from "react-hot-toast"
import { OSM_STYLE, geocodeSearch, GeocodeResult } from "./osm"

interface Props {
  latitude:  number | null
  longitude: number | null
  onChange:  (lat: number, lng: number) => void
  // Used to pre-fill the search box, e.g. "12 Main St, Mumbai, India"
  addressHint?: string
}

const DEFAULT_CENTER = { latitude: 20.5937, longitude: 78.9629, zoom: 4 } // India

export function LocationPicker({ latitude, longitude, onChange, addressHint }: Props) {
  const mapRef = useRef<MapRef>(null)
  const [query, setQuery]             = useState("")
  const [results, setResults]         = useState<GeocodeResult[]>([])
  const [searching, setSearching]     = useState(false)
  const [locating, setLocating]       = useState(false)
  const [showResults, setShowResults] = useState(false)

  const hasPin = latitude !== null && longitude !== null

  const flyTo = useCallback((lat: number, lng: number, zoom = 16) => {
    mapRef.current?.flyTo({ center: [lng, lat], zoom, duration: 1200 })
  }, [])

  const runSearch = useCallback(async (q: string) => {
    const term = q.trim() || addressHint?.trim()
    if (!term) return
    setSearching(true)
    try {
      const found = await geocodeSearch(term)
      setResults(found)
      setShowResults(true)
      if (found.length === 0) toast.error("No places found — try a broader search")
    } catch {
      toast.error("Location search failed — try again")
    } finally {
      setSearching(false)
    }
  }, [addressHint])

  const pickResult = (r: GeocodeResult) => {
    onChange(r.lat, r.lon)
    setShowResults(false)
    setQuery(r.display_name.split(",").slice(0, 2).join(","))
    flyTo(r.lat, r.lon)
  }

  const useMyLocation = () => {
    if (!navigator.geolocation) { toast.error("Geolocation is not supported by this browser"); return }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange(pos.coords.latitude, pos.coords.longitude)
        flyTo(pos.coords.latitude, pos.coords.longitude)
        setLocating(false)
      },
      () => { toast.error("Could not get your location"); setLocating(false) },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  return (
    <div className="space-y-3">
      {/* Search + locate row */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); runSearch(query) }
            }}
            className="input pl-9 text-base sm:text-sm"
            placeholder={addressHint ? "Search address or press Find" : "Search address…"}
          />
          {showResults && results.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-float z-20 overflow-hidden max-h-64 overflow-y-auto">
              {results.map((r, i) => (
                <button
                  key={i}
                  type="button"
                  onMouseDown={() => pickResult(r)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-start gap-2.5 border-b border-gray-50 last:border-0"
                >
                  <MapPin className="w-4 h-4 text-brand-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700 line-clamp-2">{r.display_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => runSearch(query)}
          disabled={searching}
          className="btn-secondary text-sm flex items-center gap-1.5 flex-shrink-0"
        >
          {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Find
        </button>
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          title="Use my current location"
          className="btn-secondary text-sm flex items-center gap-1.5 flex-shrink-0"
        >
          {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crosshair className="w-4 h-4" />}
          <span className="hidden sm:inline">My location</span>
        </button>
      </div>

      {/* Map */}
      <div className="h-72 sm:h-80 rounded-2xl overflow-hidden border border-gray-200 relative">
        <Map
          ref={mapRef}
          initialViewState={
            hasPin
              ? { latitude: latitude!, longitude: longitude!, zoom: 15 }
              : DEFAULT_CENTER
          }
          mapStyle={OSM_STYLE as any}
          onClick={(e) => onChange(e.lngLat.lat, e.lngLat.lng)}
          style={{ width: "100%", height: "100%" }}
        >
          <NavigationControl position="top-right" showCompass={false} />
          {hasPin && (
            <Marker
              latitude={latitude!}
              longitude={longitude!}
              anchor="bottom"
              draggable
              onDragEnd={(e) => onChange(e.lngLat.lat, e.lngLat.lng)}
            >
              <MapPin className="w-9 h-9 text-brand-600 fill-brand-200 drop-shadow-lg cursor-grab" />
            </Marker>
          )}
        </Map>
        {!hasPin && (
          <div className="absolute inset-x-0 bottom-3 flex justify-center pointer-events-none">
            <span className="bg-white/95 text-gray-700 text-xs font-medium px-3 py-1.5 rounded-lg shadow-card border border-gray-200">
              Search your address, then tap the map to drop the pin
            </span>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400">
        {hasPin
          ? `Pinned at ${latitude!.toFixed(5)}, ${longitude!.toFixed(5)} — drag the pin or tap the map to adjust`
          : "Guests see the exact pin after booking; search results show the approximate area"}
      </p>
    </div>
  )
}
