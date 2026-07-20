"use client"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { Property } from "@/types"
import Link from "next/link"
import { Heart, Home } from "lucide-react"
import { WishlistButton } from "@/components/ui/WishlistButton"
import { INR } from "@/lib/currency"

function SavedCard({ property }: { property: Property }) {
  return (
    <Link href={`/properties/${property.id}`} className="group">
      <div className="card overflow-hidden hover:shadow-card-hover transition-shadow">
        <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
          {property.cover_photo ? (
            <img src={property.cover_photo} alt={property.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Home className="w-10 h-10 text-gray-300" />
            </div>
          )}
          <div className="absolute top-3 right-3">
            <WishlistButton propertyId={property.id} initialSaved={true} />
          </div>
        </div>
        <div className="p-4">
          <h3 className="font-semibold text-gray-900 text-sm truncate">{property.title}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{property.city}, {property.country}</p>
          <p className="font-bold text-gray-900 mt-2">
            {INR(property.price_per_night)}
            <span className="text-xs font-normal text-gray-400"> / night</span>
          </p>
        </div>
      </div>
    </Link>
  )
}

export default function SavedPage() {
  const { data: properties = [], isLoading } = useQuery({
    queryKey: ["wishlist", "saved"],
    // DRF pagination wraps list responses in {results: [...]}
    queryFn: () =>
      api.get("/wishlist/saved/").then((r) =>
        Array.isArray(r.data) ? r.data : (r.data?.results ?? [])
      ),
  })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center gap-3 mb-8">
        <Heart className="w-6 h-6 text-red-500 fill-red-500" />
        <h1 className="font-display text-2xl font-bold text-gray-900">Saved properties</h1>
        {properties.length > 0 && (
          <span className="badge bg-gray-100 text-gray-600">{properties.length}</span>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card overflow-hidden animate-pulse">
              <div className="aspect-[4/3] bg-gray-200" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : properties.length === 0 ? (
        <div className="card p-20 text-center">
          <Heart className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <p className="font-display font-semibold text-gray-700 text-lg">No saved properties yet</p>
          <p className="text-gray-400 text-sm mt-1 mb-6">
            Tap the heart on any listing to save it here
          </p>
          <Link href="/search" className="btn-primary inline-block">Explore properties</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {properties.map((p: Property) => <SavedCard key={p.id} property={p} />)}
        </div>
      )}
    </div>
  )
}
