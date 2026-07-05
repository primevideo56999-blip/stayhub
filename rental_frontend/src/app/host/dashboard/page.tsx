"use client"
import { useQuery } from "@tanstack/react-query"
import { propertiesApi, authApi, bookingsApi } from "@/lib/api"
import Link from "next/link"
import { Plus, Home, Calendar, Star, AlertCircle, Clock } from "lucide-react"
import { Property, Booking } from "@/types"

const INR = (amount: string | number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0,
  }).format(Number(amount))

function ProfileIncompleteWarning({ missing }: { missing: string[] }) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 mb-6">
      <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-medium text-amber-800">Complete your profile to publish listings</p>
        <p className="text-sm text-amber-700 mt-0.5">
          Missing: {missing.join(", ")}.{" "}
          <Link href="/host/profile-setup" className="underline font-medium">Update profile →</Link>
        </p>
      </div>
    </div>
  )
}

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="card p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{label}</p>
          <p className="font-display text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center text-brand-500">
          {icon}
        </div>
      </div>
    </div>
  )
}

function PropertyRow({ property }: { property: Property }) {
  const statusClass: Record<string, string> = {
    active:   "badge-active",
    draft:    "badge-draft",
    paused:   "badge-pending",
    archived: "badge-cancelled",
  }
  return (
    <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100 hover:border-brand-200 transition">
      <div className="w-16 h-16 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
        {property.cover_photo ? (
          <img src={property.cover_photo} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Home className="w-6 h-6 text-gray-300" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 truncate">{property.title}</p>
        <p className="text-sm text-gray-500">{property.city}, {property.country}</p>
        <p className="text-sm text-gray-700 mt-0.5">{INR(property.price_per_night)}/night</p>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <span className={statusClass[property.status] || "badge"}>{property.status}</span>
        <Link href={`/host/properties/${property.id}/edit`} className="btn-ghost text-sm py-1.5 px-3">
          Edit
        </Link>
      </div>
    </div>
  )
}

function BookingRow({ booking }: { booking: Booking }) {
  const statusClass: Record<string, string> = {
    pending:   "badge-pending",
    confirmed: "badge-confirmed",
    cancelled: "badge-cancelled",
    completed: "badge-completed",
    rejected:  "badge-cancelled",
  }
  return (
    <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 truncate">{booking.guest?.full_name}</p>
        <p className="text-sm text-gray-500 truncate">{booking.listing?.title || booking.property?.title}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          {booking.check_in} → {booking.check_out} · {booking.nights} nights
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="font-semibold text-gray-900">{INR(booking.total_price)}</p>
        <span className={`${statusClass[booking.status]} mt-1`}>{booking.status}</span>
      </div>
      {booking.status === "pending" && (
        <div className="flex gap-2">
          <Link href={`/host/bookings/${booking.id}`} className="btn-primary text-xs py-1.5 px-3">
            Review
          </Link>
        </div>
      )}
    </div>
  )
}

export default function HostDashboardPage() {
  const { data: profileStatus } = useQuery({
    queryKey: ["host-profile-status"],
    queryFn:  () => authApi.hostProfileStatus().then((r) => r.data),
  })
  const { data: properties = [] } = useQuery({
    queryKey: ["my-properties"],
    queryFn:  () => propertiesApi.mine().then((r) => r.data),
  })
  const { data: bookings = [] } = useQuery({
    queryKey: ["host-bookings"],
    queryFn:  () => bookingsApi.hostBookings().then((r) => r.data),
  })

  const activeListings  = properties.filter((p: Property) => p.status === "active").length
  const pendingBookings = bookings.filter((b: Booking) => b.status === "pending").length
  const totalEarnings   = bookings
    .filter((b: Booking) => b.status === "completed")
    .reduce((sum: number, b: Booking) => sum + parseFloat(b.total_price), 0)
  const avgRating = properties.length
    ? (properties.reduce((s: number, p: Property) => s + parseFloat(p.avg_rating), 0) / properties.length).toFixed(1)
    : "—"

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">Host Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage your listings and bookings</p>
        </div>
        <Link href="/host/properties/new" className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add listing
        </Link>
      </div>

      {profileStatus && !profileStatus.is_complete && (
        <ProfileIncompleteWarning missing={profileStatus.missing} />
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Active listings"  value={activeListings}      icon={<Home className="w-5 h-5" />} />
        <StatCard label="Pending requests" value={pendingBookings}      icon={<Clock className="w-5 h-5" />} />
        <StatCard label="Total earned"     value={INR(totalEarnings)}   icon={<Calendar className="w-5 h-5" />} />
        <StatCard label="Avg. rating"      value={avgRating}            icon={<Star className="w-5 h-5" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-gray-900">Your listings</h2>
            <Link href="/host/properties" className="text-sm text-brand-600 hover:underline">View all</Link>
          </div>
          <div className="space-y-3">
            {properties.length === 0 ? (
              <div className="card p-8 text-center text-gray-400">
                <Home className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No listings yet.</p>
                <Link href="/host/properties/new" className="btn-primary text-sm mt-4 inline-block">
                  Add your first listing
                </Link>
              </div>
            ) : (
              properties.slice(0, 4).map((p: Property) => <PropertyRow key={p.id} property={p} />)
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-gray-900">Recent bookings</h2>
            <Link href="/host/bookings" className="text-sm text-brand-600 hover:underline">View all</Link>
          </div>
          <div className="space-y-3">
            {bookings.length === 0 ? (
              <div className="card p-8 text-center text-gray-400">
                <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No bookings yet.</p>
              </div>
            ) : (
              bookings.slice(0, 5).map((b: Booking) => <BookingRow key={b.id} booking={b} />)
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
