"use client"
import { useMemo, useRef, useState, useEffect } from "react"
import Map, { Marker, Popup, NavigationControl, MapRef } from "react-map-gl/maplibre"
import "maplibre-gl/dist/maplibre-gl.css"
import Link from "next/link"
import { Star, Navigation, Crosshair, Loader2 } from "lucide-react"
import { Property } from "@/types"
import { OSM_STYLE } from "./osm"

const INR = (amount: string | number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0,
  }).format(Number(amount))

interface Props {
  properties: Property[]
  userLocation?: { lat: number; lng: number } | null
  // Ask the parent to (re)request browser GPS — shown as a locate button on the map
  onLocate?: () => void
  locating?: boolean
}

export function SearchMap({ properties, userLocation, onLocate, locating }: Props) {
  const mapRef = useRef<MapRef>(null)
  const [selected, setSelected] = useState<Property | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)

  const located = useMemo(
    () => properties.filter((p) => p.latitude != null && p.longitude != null),
    [properties]
  )

  // GPS available → zoom straight into the guest's position (blue dot centred)
  useEffect(() => {
    if (!mapLoaded || !userLocation) return
    mapRef.current?.flyTo({
      center: [userLocation.lng, userLocation.lat],
      zoom: 13,
      duration: 1200,
    })
  }, [mapLoaded, userLocation])

  // No GPS → fall back to fitting the map around the listing pins
  useEffect(() => {
    if (!mapLoaded || userLocation) return
    const map = mapRef.current
    if (!map) return
    const points: [number, number][] = located.map((p) => [Number(p.longitude), Number(p.latitude)])
    if (points.length === 0) return
    if (points.length === 1) {
      map.flyTo({ center: points[0], zoom: 13, duration: 800 })
      return
    }
    const lngs = points.map((p) => p[0])
    const lats = points.map((p) => p[1])
    map.fitBounds(
      [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
      { padding: 60, maxZoom: 14, duration: 800 }
    )
  }, [mapLoaded, located, userLocation])

  const recenter = () => {
    if (userLocation) {
      mapRef.current?.flyTo({
        center: [userLocation.lng, userLocation.lat],
        zoom: 13,
        duration: 1000,
      })
    } else {
      onLocate?.()
    }
  }

  return (
    <div className="h-full w-full rounded-2xl overflow-hidden border border-gray-200 relative">
      <Map
        ref={mapRef}
        initialViewState={
          userLocation
            ? { latitude: userLocation.lat, longitude: userLocation.lng, zoom: 13 }
            : { latitude: 20.5937, longitude: 78.9629, zoom: 4 }
        }
        mapStyle={OSM_STYLE as any}
        style={{ width: "100%", height: "100%" }}
        onClick={() => setSelected(null)}
        onLoad={() => setMapLoaded(true)}
      >
        <NavigationControl position="top-right" showCompass={false} />

        {/* Guest's own position */}
        {userLocation && (
          <Marker latitude={userLocation.lat} longitude={userLocation.lng} anchor="center">
            <div className="relative flex items-center justify-center">
              <span className="absolute w-6 h-6 rounded-full bg-blue-400/30 animate-ping" />
              <span className="w-3.5 h-3.5 rounded-full bg-blue-500 border-2 border-white shadow" />
            </div>
          </Marker>
        )}

        {/* Listing price pins */}
        {located.map((p) => (
          <Marker
            key={p.id}
            latitude={Number(p.latitude)}
            longitude={Number(p.longitude)}
            anchor="bottom"
          >
            <button
              onClick={(e) => { e.stopPropagation(); setSelected(p) }}
              className={`px-2.5 py-1 rounded-full text-xs font-bold shadow-card border transition-transform hover:scale-110 ${
                selected?.id === p.id
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-900 border-gray-200"
              }`}
            >
              {INR(p.price_per_night)}
            </button>
          </Marker>
        ))}

        {selected && selected.latitude != null && (
          <Popup
            latitude={Number(selected.latitude)}
            longitude={Number(selected.longitude)}
            anchor="bottom"
            offset={30}
            closeButton={false}
            onClose={() => setSelected(null)}
            maxWidth="260px"
          >
            <Link href={`/properties/${selected.id}`} className="block w-56">
              {selected.cover_photo && (
                <img
                  src={selected.cover_photo}
                  alt={selected.title}
                  className="w-full h-28 object-cover rounded-lg mb-2"
                />
              )}
              <p className="text-sm font-semibold text-gray-900 line-clamp-2">{selected.title}</p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-sm font-bold text-gray-900">
                  {INR(selected.price_per_night)}
                  <span className="text-xs font-normal text-gray-400"> / night</span>
                </span>
                {parseFloat(selected.avg_rating) > 0 && (
                  <span className="flex items-center gap-0.5 text-xs font-medium text-gray-700">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    {parseFloat(selected.avg_rating).toFixed(1)}
                  </span>
                )}
              </div>
              {(selected as any).distance_km != null && (
                <p className="flex items-center gap-1 text-xs text-brand-600 mt-1">
                  <Navigation className="w-3 h-3" />
                  {(selected as any).distance_km} km away
                </p>
              )}
            </Link>
          </Popup>
        )}
      </Map>

      {/* Locate-me button — recenters on the blue dot, or requests GPS if not granted yet */}
      <button
        onClick={recenter}
        disabled={locating}
        aria-label="Show my location"
        title={userLocation ? "Center on my location" : "Use my location"}
        className="absolute bottom-4 right-4 w-11 h-11 rounded-full bg-white shadow-float border border-gray-200
                   flex items-center justify-center text-gray-700 hover:text-brand-600 hover:border-brand-300
                   focus:outline-none focus:ring-2 focus:ring-brand-400 disabled:opacity-60"
      >
        {locating
          ? <Loader2 className="w-5 h-5 animate-spin" />
          : <Crosshair className={`w-5 h-5 ${userLocation ? "text-blue-500" : ""}`} />
        }
      </button>
    </div>
  )
}
