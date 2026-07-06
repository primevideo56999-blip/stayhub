"use client"
import { useQuery } from "@tanstack/react-query"
import { propertiesApi } from "@/lib/api"
import { AvailabilityCalendar } from "@/components/property/AvailabilityCalendar"
import { Property } from "@/types"
import { useState } from "react"
import { Home, ChevronDown } from "lucide-react"

export default function HostCalendarPage() {
  const [selectedProperty, setSelectedProperty] = useState<number | null>(null)

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ["my-properties"],
    queryFn:  () => propertiesApi.mine().then((r) => r.data),
  })

  const activeProperty = properties.find((p: Property) => p.id === selectedProperty)
    || properties[0]

  if (!selectedProperty && properties.length > 0) {
    setSelectedProperty(properties[0].id)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-gray-900">Availability Calendar</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Block or unblock dates across your listings
        </p>
      </div>

      {/* Property selector */}
      {properties.length > 1 && (
        <div className="relative mb-6 inline-block">
          <select
            value={selectedProperty || ""}
            onChange={(e) => setSelectedProperty(Number(e.target.value))}
            className="input pr-10 appearance-none font-medium cursor-pointer"
          >
            {properties.map((p: Property) => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      )}

      {isLoading ? (
        <div className="card p-8 animate-pulse">
          <div className="h-80 bg-gray-100 rounded-xl" />
        </div>
      ) : properties.length === 0 ? (
        <div className="card p-16 text-center text-gray-400">
          <Home className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium text-gray-600">No listings yet</p>
          <p className="text-sm mt-1">Create a listing first to manage its availability</p>
        </div>
      ) : activeProperty ? (
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
            <div className="w-12 h-12 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
              {activeProperty.cover_photo ? (
                <img src={activeProperty.cover_photo} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Home className="w-5 h-5 text-gray-300" />
                </div>
              )}
            </div>
            <div>
              <p className="font-semibold text-gray-900">{activeProperty.title}</p>
              <p className="text-sm text-gray-500">{activeProperty.city}, {activeProperty.country}</p>
            </div>
          </div>

          <AvailabilityCalendar
            propertyId={activeProperty.id}
            isHost={true}
          />
        </div>
      ) : null}
    </div>
  )
}
