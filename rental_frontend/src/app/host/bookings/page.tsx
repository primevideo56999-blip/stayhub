"use client"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { bookingsApi } from "@/lib/api"
import { Booking } from "@/types"
import { useState } from "react"
import { Calendar, MapPin, User, Check, X, ChevronDown } from "lucide-react"
import toast from "react-hot-toast"

const STATUS_TABS = ["all", "pending", "confirmed", "completed", "cancelled"] as const
type Tab = typeof STATUS_TABS[number]

function BookingCard({ booking }: { booking: Booking }) {
  const qc = useQueryClient()
  const [showCancel, setShowCancel] = useState(false)
  const [reason, setReason]         = useState("")

  const confirm = useMutation({
    mutationFn: () => bookingsApi.confirm(booking.id),
    onSuccess: () => { toast.success("Booking confirmed!"); qc.invalidateQueries({ queryKey: ["host-bookings"] }) },
    onError:   (e: any) => toast.error(e?.response?.data?.detail || "Failed"),
  })
  const reject = useMutation({
    mutationFn: () => bookingsApi.reject(booking.id),
    onSuccess: () => { toast.success("Booking rejected"); qc.invalidateQueries({ queryKey: ["host-bookings"] }) },
    onError:   (e: any) => toast.error(e?.response?.data?.detail || "Failed"),
  })
  const cancel = useMutation({
    mutationFn: () => bookingsApi.hostCancel(booking.id, reason),
    onSuccess: () => { toast.success("Booking cancelled. Guest will be refunded."); qc.invalidateQueries({ queryKey: ["host-bookings"] }); setShowCancel(false) },
    onError:   (e: any) => toast.error(e?.response?.data?.detail || "Failed"),
  })

  const statusColor: Record<string, string> = {
    pending:   "bg-amber-100 text-amber-700",
    confirmed: "bg-blue-100 text-blue-700",
    cancelled: "bg-red-100 text-red-700",
    completed: "bg-gray-100 text-gray-600",
    rejected:  "bg-red-100 text-red-700",
  }

  return (
    <div className="card p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
            <User className="w-5 h-5 text-brand-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">{booking.guest?.full_name}</p>
            <p className="text-xs text-gray-400">{booking.guest?.email}</p>
          </div>
        </div>
        <span className={`badge ${statusColor[booking.status]}`}>{booking.status}</span>
      </div>

      {/* Property + dates */}
      <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
        <p className="font-medium text-gray-900">{booking.property?.title}</p>
        <div className="flex items-center gap-1.5 text-gray-500">
          <Calendar className="w-3.5 h-3.5" />
          {booking.check_in} → {booking.check_out} · {booking.nights} night{booking.nights !== 1 ? "s" : ""}
        </div>
        <div className="flex items-center gap-1.5 text-gray-500">
          <User className="w-3.5 h-3.5" />
          {booking.num_guests} guest{booking.num_guests !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Price breakdown */}
      <div className="text-sm space-y-1">
        <div className="flex justify-between text-gray-500">
          <span>${booking.price_per_night} × {booking.nights} nights</span>
          <span>${booking.subtotal}</span>
        </div>
        {parseFloat(booking.cleaning_fee) > 0 && (
          <div className="flex justify-between text-gray-500">
            <span>Cleaning fee</span><span>${booking.cleaning_fee}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-gray-900 pt-1 border-t border-gray-100">
          <span>Total</span><span>${booking.total_price}</span>
        </div>
      </div>

      {/* Actions */}
      {booking.status === "pending" && (
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => confirm.mutate()}
            disabled={confirm.isPending}
            className="btn-primary flex-1 flex items-center justify-center gap-1.5 text-sm py-2"
          >
            <Check className="w-4 h-4" />
            {confirm.isPending ? "Confirming…" : "Accept"}
          </button>
          <button
            onClick={() => reject.mutate()}
            disabled={reject.isPending}
            className="btn-secondary flex-1 flex items-center justify-center gap-1.5 text-sm py-2 text-red-600 border-red-200 hover:bg-red-50"
          >
            <X className="w-4 h-4" />
            {reject.isPending ? "Rejecting…" : "Decline"}
          </button>
        </div>
      )}

      {booking.status === "confirmed" && (
        <div>
          <button
            onClick={() => setShowCancel((s) => !s)}
            className="text-sm text-red-500 hover:underline flex items-center gap-1"
          >
            Cancel booking <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showCancel ? "rotate-180" : ""}`} />
          </button>
          {showCancel && (
            <div className="mt-3 space-y-2">
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="input resize-none text-sm"
                rows={3}
                placeholder="Reason for cancellation (optional)"
              />
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
                Guest will receive a full refund when you cancel.
              </div>
              <button
                onClick={() => cancel.mutate()}
                disabled={cancel.isPending}
                className="w-full py-2 text-sm font-medium text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                {cancel.isPending ? "Cancelling…" : "Confirm cancellation"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function HostBookingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("all")
  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["host-bookings", activeTab],
    queryFn:  () => bookingsApi.hostBookings(activeTab === "all" ? undefined : activeTab).then((r) => r.data),
  })

  const counts = bookings.reduce((acc: Record<string, number>, b: Booking) => {
    acc[b.status] = (acc[b.status] || 0) + 1
    return acc
  }, {})

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">Bookings</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage guest booking requests</p>
        </div>
        {counts["pending"] > 0 && (
          <span className="badge badge-pending">{counts["pending"]} pending</span>
        )}
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 overflow-x-auto">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 min-w-fit px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            {tab !== "all" && counts[tab] ? ` (${counts[tab]})` : ""}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card p-5 h-48 animate-pulse bg-gray-100" />
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <div className="card p-16 text-center text-gray-400">
          <Calendar className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium text-gray-600">No {activeTab === "all" ? "" : activeTab} bookings yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((b: Booking) => <BookingCard key={b.id} booking={b} />)}
        </div>
      )}
    </div>
  )
}
