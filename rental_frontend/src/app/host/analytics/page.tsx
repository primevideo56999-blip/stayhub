"use client"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { TrendingUp, DollarSign, Calendar, Star, Home, Users } from "lucide-react"

function StatCard({ label, value, sub, icon, color = "brand" }: {
  label: string; value: string; sub?: string
  icon: React.ReactNode; color?: string
}) {
  const colors: Record<string, string> = {
    brand:  "bg-brand-50 text-brand-500",
    green:  "bg-green-50 text-green-500",
    amber:  "bg-amber-50 text-amber-500",
    purple: "bg-purple-50 text-purple-500",
  }
  return (
    <div className="card p-6">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[color]}`}>
          {icon}
        </div>
      </div>
      <p className="font-display text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm font-medium text-gray-600 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

function EarningsChart({ data }: { data: { month: string; earnings: number }[] }) {
  const max = Math.max(...data.map((d) => d.earnings), 1)
  return (
    <div className="card p-6">
      <h3 className="font-display font-semibold text-gray-900 mb-6">Earnings — last 6 months</h3>
      <div className="flex items-end gap-3 h-40">
        {data.map((d) => (
          <div key={d.month} className="flex-1 flex flex-col items-center gap-2">
            <p className="text-xs font-medium text-gray-700">
              {d.earnings > 0 ? `$${Math.round(d.earnings)}` : ""}
            </p>
            <div className="w-full rounded-t-lg bg-brand-100 relative overflow-hidden" style={{ height: "100px" }}>
              <div
                className="absolute bottom-0 w-full bg-brand-500 rounded-t-lg transition-all duration-700"
                style={{ height: `${(d.earnings / max) * 100}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 text-center leading-tight">
              {d.month.split(" ")[0]}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

function PropertyRow({ prop }: { prop: any }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{prop.title}</p>
        <div className="flex items-center gap-3 mt-0.5">
          <span className={`badge ${prop.status === "active" ? "badge-active" : "badge-draft"}`}>
            {prop.status}
          </span>
          {parseFloat(prop.avg_rating) > 0 && (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              {parseFloat(prop.avg_rating).toFixed(1)} ({prop.total_reviews})
            </span>
          )}
        </div>
      </div>
      <div className="text-right flex-shrink-0 ml-4">
        <p className="text-sm font-bold text-gray-900">${prop.earnings.toFixed(0)}</p>
        <p className="text-xs text-gray-400">{prop.total_bookings} stays</p>
      </div>
    </div>
  )
}

export default function AnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["host-analytics"],
    queryFn:  () => api.get("/analytics/host/").then((r) => r.data),
  })

  if (isLoading) return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => <div key={i} className="card p-6 h-28 animate-pulse bg-gray-100" />)}
      </div>
    </div>
  )

  if (!data) return null

  const { earnings, bookings, properties, reviews } = data

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-500 text-sm mt-0.5">Your hosting performance overview</p>
      </div>

      {/* Key stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total earned"
          value={`$${earnings.total.toFixed(0)}`}
          sub={`$${earnings.this_month.toFixed(0)} this month`}
          icon={<DollarSign className="w-5 h-5" />}
          color="green"
        />
        <StatCard
          label="Total bookings"
          value={bookings.total}
          sub={`${bookings.by_status?.confirmed || 0} confirmed`}
          icon={<Calendar className="w-5 h-5" />}
          color="brand"
        />
        <StatCard
          label="Avg. rating"
          value={reviews.avg_rating > 0 ? `${reviews.avg_rating} ★` : "—"}
          sub={`${reviews.total} reviews`}
          icon={<Star className="w-5 h-5" />}
          color="amber"
        />
        <StatCard
          label="Active listings"
          value={properties.active}
          sub={`${properties.total} total`}
          icon={<Home className="w-5 h-5" />}
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Earnings chart */}
        <div className="lg:col-span-2">
          <EarningsChart data={earnings.monthly_chart} />
        </div>

        {/* Booking status breakdown */}
        <div className="card p-6">
          <h3 className="font-display font-semibold text-gray-900 mb-4">Bookings by status</h3>
          <div className="space-y-3">
            {Object.entries(bookings.by_status || {}).map(([status, count]: [string, any]) => (
              <div key={status} className="flex items-center justify-between">
                <span className={`badge badge-${status}`}>{status}</span>
                <span className="font-semibold text-gray-900 text-sm">{count}</span>
              </div>
            ))}
            {Object.keys(bookings.by_status || {}).length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">No bookings yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Upcoming stays */}
      {bookings.upcoming?.length > 0 && (
        <div className="card p-6">
          <h3 className="font-display font-semibold text-gray-900 mb-4">Upcoming check-ins</h3>
          <div className="space-y-3">
            {bookings.upcoming.map((b: any) => (
              <div key={b.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">{b.guest_name}</p>
                  <p className="text-xs text-gray-500">{b.property}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{b.check_in}</p>
                  <p className="text-xs text-gray-400">{b.nights} nights · ${b.total}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Per-property breakdown */}
      {properties.stats?.length > 0 && (
        <div className="card p-6">
          <h3 className="font-display font-semibold text-gray-900 mb-2">Per-property earnings</h3>
          <p className="text-xs text-gray-400 mb-4">Completed bookings only</p>
          {properties.stats.map((p: any) => <PropertyRow key={p.id} prop={p} />)}
        </div>
      )}
    </div>
  )
}
