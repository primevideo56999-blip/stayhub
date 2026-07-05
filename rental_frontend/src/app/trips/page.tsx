"use client"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { bookingsApi } from "@/lib/api"
import { Booking } from "@/types"
import { Calendar, MapPin } from "lucide-react"
import toast from "react-hot-toast"

function BookingCard({ booking }: { booking: Booking }) {
  const qc = useQueryClient()
  const cancel = useMutation({
    mutationFn: () => bookingsApi.cancel(booking.id),
    onSuccess: () => { toast.success("Booking cancelled"); qc.invalidateQueries({ queryKey: ["my-trips"] }) },
    onError:   () => toast.error("Failed to cancel booking"),
  })
  const statusClass: Record<string, string> = {
    pending: "badge-pending", confirmed: "badge-confirmed",
    cancelled: "badge-cancelled", completed: "badge-completed", rejected: "badge-cancelled",
  }
  return (
    <div className="card p-5 flex gap-4">
      <div className="w-20 h-20 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
        {booking.property?.cover_photo
          ? <img src={booking.property.cover_photo} className="w-full h-full object-cover" alt="" />
          : <div className="w-full h-full flex items-center justify-center text-gray-300"><Calendar className="w-6 h-6" /></div>
        }
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-gray-900 truncate">{booking.property?.title}</h3>
          <span className={statusClass[booking.status]}>{booking.status}</span>
        </div>
        <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
          <MapPin className="w-3.5 h-3.5" />
          {booking.property?.city}, {booking.property?.country}
        </p>
        <p className="text-sm text-gray-600 mt-1">
          {booking.check_in} → {booking.check_out} · {booking.nights} nights · {booking.num_guests} guest{booking.num_guests !== 1 ? "s" : ""}
        </p>
        <div className="flex items-center justify-between mt-3">
          <p className="font-semibold text-gray-900">${booking.total_price}</p>
          {["pending", "confirmed"].includes(booking.status) && (
            <button
              onClick={() => cancel.mutate()}
              disabled={cancel.isPending}
              className="text-xs text-red-500 hover:underline disabled:opacity-50"
            >
              {cancel.isPending ? "Cancelling…" : "Cancel booking"}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function TripsPage() {
  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["my-trips"],
    queryFn:  () => bookingsApi.myTrips().then((r) => r.data),
  })
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="font-display text-2xl font-bold text-gray-900 mb-6">My trips</h1>
      {isLoading ? (
        <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="card p-5 h-28 animate-pulse bg-gray-100" />)}</div>
      ) : bookings.length === 0 ? (
        <div className="card p-16 text-center text-gray-400">
          <Calendar className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium text-gray-600">No trips yet</p>
          <p className="text-sm mt-1">Start exploring and book your first stay</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((b: Booking) => <BookingCard key={b.id} booking={b} />)}
        </div>
      )}
    </div>
  )
}
