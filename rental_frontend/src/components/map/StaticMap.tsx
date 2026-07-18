"use client"
import Map, { Marker, NavigationControl } from "react-map-gl/maplibre"
import "maplibre-gl/dist/maplibre-gl.css"
import { MapPin } from "lucide-react"
import { OSM_STYLE } from "./osm"

interface Props {
  latitude:  number
  longitude: number
  label?:    string
}

export function StaticMap({ latitude, longitude, label }: Props) {
  return (
    <div className="h-64 rounded-2xl overflow-hidden border border-gray-200">
      <Map
        initialViewState={{ latitude, longitude, zoom: 14 }}
        mapStyle={OSM_STYLE as any}
        style={{ width: "100%", height: "100%" }}
      >
        <NavigationControl position="top-right" showCompass={false} />
        <Marker latitude={latitude} longitude={longitude} anchor="bottom">
          <div className="flex flex-col items-center">
            <MapPin className="w-9 h-9 text-brand-600 fill-brand-200 drop-shadow-lg" />
            {label && (
              <span className="bg-white text-gray-800 text-xs font-medium px-2 py-0.5 rounded-lg shadow-card border border-gray-200 -mt-1">
                {label}
              </span>
            )}
          </div>
        </Marker>
      </Map>
    </div>
  )
}
