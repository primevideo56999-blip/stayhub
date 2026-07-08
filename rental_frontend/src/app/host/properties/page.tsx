"use client"
import { useQuery } from "@tanstack/react-query"
import { propertiesApi } from "@/lib/api"
import Link from "next/link"
import { Plus, Home, Star, Eye, Edit } from "lucide-react"

export default function HostPropertiesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["my-properties"],
    queryFn: () => propertiesApi.mine().then(r => r.data),
  })

  const properties = data?.results || data || []

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">My Properties</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage your listings</p>
        </div>
        <Link href="/host/properties/new" className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add listing
        </Link>
      </div>

      {isLoading ? (
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card p-5 animate-pulse flex gap-4">
              <div className="w-24 h-24 bg-gray-200 rounded-xl flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
                <div className="h-3 bg-gray-200 rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : properties.length === 0 ? (
        <div className="card p-20 text-center">
          <Home className="w-10 h-10 mx-auto mb-3 text-gray-200" />
          <p className="font-medium text-gray-600">No properties yet</p>
          <p className="text-sm text-gray-400 mt-1">Add your first listing to get started</p>
          <Link href="/host/properties/new" className="btn-primary text-sm mt-5 inline-flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add listing
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {properties.map((p: any) => (
            <div key={p.id} className="card p-5 flex gap-4 items-center">
              <div className="w-24 h-24 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                {p.cover_photo ? (
                  <img src={p.cover_photo} alt={p.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Home className="w-8 h-8 text-gray-300" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 truncate">{p.title}</h3>
                <p className="text-sm text-gray-500">{p.city}, {p.country}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    p.status === 'active' ? 'bg-green-100 text-green-700' :
                    p.status === 'draft' ? 'bg-gray-100 text-gray-600' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>{p.status}</span>
                  {parseFloat(p.avg_rating) > 0 && (
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      {parseFloat(p.avg_rating).toFixed(1)}
                    </span>
                  )}
                  <span className="text-xs text-gray-400">₹{p.price_per_night}/night</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Link href={`/properties/${p.id}`} className="btn-ghost p-2" title="View">
                  <Eye className="w-4 h-4" />
                </Link>
                <Link href={`/host/properties/${p.id}/edit`} className="btn-ghost p-2" title="Edit">
                  <Edit className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
