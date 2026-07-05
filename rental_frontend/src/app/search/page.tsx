"use client"
import { useState, useCallback } from "react"
import { useQuery } from "@tanstack/react-query"
import { propertiesApi } from "@/lib/api"
import { Property } from "@/types"
import Link from "next/link"
import { Search, SlidersHorizontal, Star, Users, Bed, Home, MapPin, X } from "lucide-react"
import { WishlistButton } from "@/components/ui/WishlistButton"
import { useAuthStore } from "@/store/auth"

function PropertyCard({ property }: { property: Property }) {
  const { isAuthenticated } = useAuthStore()
  return (
    <Link href={`/properties/${property.id}`} className="group">
      <div className="card overflow-hidden hover:shadow-card-hover transition-shadow duration-200">
        <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
          {property.cover_photo ? (
            <img src={property.cover_photo} alt={property.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Home className="w-10 h-10 text-gray-300" />
            </div>
          )}
          <div className="absolute top-3 left-3 bg-white/90 backdrop-blur rounded-lg px-2 py-1 text-xs font-medium capitalize text-gray-600">
            {property.property_type?.replace("_", " ")}
          </div>
          {isAuthenticated() && (
            <div className="absolute top-3 right-3">
              <WishlistButton propertyId={property.id} />
            </div>
          )}
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
            <MapPin className="w-3 h-3" /> {property.city}, {property.country}
          </p>
          <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
            <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {property.max_guests}</span>
            <span className="flex items-center gap-1"><Bed className="w-3.5 h-3.5" /> {property.beds} bed{property.beds !== 1 ? "s" : ""}</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="font-bold text-gray-900">${property.price_per_night}</span>
            <span className="text-xs text-gray-400">/ night</span>
          </div>
        </div>
      </div>
    </Link>
  )
}

const PROPERTY_TYPES = ["apartment","house","villa","studio","cabin","hotel_room","hostel"]

export default function SearchPage() {
  const today = new Date().toISOString().split("T")[0]
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

  const { data, isLoading } = useQuery({
    queryKey: ["properties", applied],
    queryFn:  () => propertiesApi.list({
      search:        applied.search || undefined,
      city:          applied.city || undefined,
      check_in:      applied.check_in || undefined,
      check_out:     applied.check_out || undefined,
      min_price:     applied.min_price || undefined,
      max_price:     applied.max_price || undefined,
      min_guests:    applied.min_guests || undefined,
      property_type: applied.property_type || undefined,
      allows_pets:   applied.allows_pets || undefined,
    }).then((r) => r.data),
  })

  const properties: Property[] = data?.results || data || []
  const applyFilters = () => setApplied({ ...filters })
  const clearFilters = () => {
    const empty = { search:"",city:"",check_in:"",check_out:"",min_price:"",max_price:"",min_guests:"",property_type:"",allows_pets:false }
    setFilters(empty); setApplied(empty)
  }
  const hasFilters = Object.entries(applied).some(([k, v]) => k !== "search" && Boolean(v))

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

      {/* Search bar */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && applyFilters()}
            className="input pl-9"
            placeholder="Search by city, title…"
          />
        </div>

        {/* Date pickers inline */}
        <input type="date" min={today} value={filters.check_in}
          onChange={(e) => setFilters((f) => ({ ...f, check_in: e.target.value }))}
          className="input w-36 text-sm" placeholder="Check-in" />
        <input type="date" min={filters.check_in || today} value={filters.check_out}
          onChange={(e) => setFilters((f) => ({ ...f, check_out: e.target.value }))}
          className="input w-36 text-sm" placeholder="Check-out" />

        <button onClick={() => setShowFilters((s) => !s)}
          className={`btn-secondary flex items-center gap-2 ${showFilters ? "border-brand-400 text-brand-600" : ""}`}>
          <SlidersHorizontal className="w-4 h-4" />
          Filters
          {hasFilters && <span className="w-2 h-2 rounded-full bg-brand-500" />}
        </button>

        <button onClick={applyFilters} className="btn-primary flex items-center gap-2">
          <Search className="w-4 h-4" /> Search
        </button>
      </div>

      {/* Expanded filters */}
      {showFilters && (
        <div className="card p-5 mb-5 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
          <div>
            <label className="label">City</label>
            <input value={filters.city} onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value }))} className="input" placeholder="e.g. Paris" />
          </div>
          <div>
            <label className="label">Type</label>
            <select value={filters.property_type} onChange={(e) => setFilters((f) => ({ ...f, property_type: e.target.value }))} className="input">
              <option value="">Any</option>
              {PROPERTY_TYPES.map((t) => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1).replace("_"," ")}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Min price $</label>
            <input type="number" value={filters.min_price} onChange={(e) => setFilters((f) => ({ ...f, min_price: e.target.value }))} className="input" placeholder="0" />
          </div>
          <div>
            <label className="label">Max price $</label>
            <input type="number" value={filters.max_price} onChange={(e) => setFilters((f) => ({ ...f, max_price: e.target.value }))} className="input" placeholder="Any" />
          </div>
          <div>
            <label className="label">Min guests</label>
            <input type="number" min={1} value={filters.min_guests} onChange={(e) => setFilters((f) => ({ ...f, min_guests: e.target.value }))} className="input" placeholder="1" />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={filters.allows_pets} onChange={(e) => setFilters((f) => ({ ...f, allows_pets: e.target.checked }))} className="w-4 h-4 accent-brand-600" />
              <span className="text-sm font-medium text-gray-700">Pets OK</span>
            </label>
          </div>
          <div className="col-span-full flex justify-end gap-2">
            <button onClick={clearFilters} className="btn-ghost text-sm flex items-center gap-1">
              <X className="w-3.5 h-3.5" /> Clear
            </button>
            <button onClick={applyFilters} className="btn-primary text-sm">Apply</button>
          </div>
        </div>
      )}

      {/* Applied date badge */}
      {(applied.check_in || applied.check_out) && (
        <div className="flex items-center gap-2 mb-4">
          <span className="badge bg-brand-100 text-brand-700 text-xs">
            {applied.check_in} → {applied.check_out}
          </span>
          <button onClick={() => { setFilters((f) => ({...f,check_in:"",check_out:""})); setApplied((f) => ({...f,check_in:"",check_out:""})) }}
            className="text-xs text-gray-400 hover:text-gray-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Results count */}
      <p className="text-sm text-gray-500 mb-5">
        {isLoading ? "Searching…" : `${properties.length} place${properties.length !== 1 ? "s" : ""} found`}
        {applied.check_in && ` available ${applied.check_in} → ${applied.check_out}`}
      </p>

      {/* Grid */}
      {isLoading ? (
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
          <p className="text-sm text-gray-400 mt-1">Try adjusting your dates or filters</p>
          <button onClick={clearFilters} className="btn-secondary text-sm mt-5">Clear all filters</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {properties.map((p: Property) => <PropertyCard key={p.id} property={p} />)}
        </div>
      )}
    </div>
  )
}
