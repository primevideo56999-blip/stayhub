// Free raster style using OpenStreetMap's public tile servers — no API key.
// Fine for development / low-traffic use per OSM tile usage policy.
export const OSM_STYLE = {
  version: 8 as const,
  sources: {
    osm: {
      type: "raster" as const,
      tiles: [
        "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [{ id: "osm", type: "raster" as const, source: "osm" }],
}

export interface GeocodeResult {
  display_name: string
  lat: number
  lon: number
}

// Nominatim (OpenStreetMap) — free geocoding, no key required
export async function geocodeSearch(query: string, limit = 6): Promise<GeocodeResult[]> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=${limit}`,
    { headers: { "Accept-Language": "en" } }
  )
  if (!res.ok) return []
  const data = await res.json()
  return data.map((d: any) => ({
    display_name: d.display_name,
    lat: parseFloat(d.lat),
    lon: parseFloat(d.lon),
  }))
}
