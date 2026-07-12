"use client"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { bookingsApi, reviewsApi, api } from "@/lib/api"
import { Booking } from "@/types"
import { Calendar, MapPin, Star } from "lucide-react"
import { useState } from "react"
import toast from "react-hot-toast"

const INR = (amount: string | number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0,
  }).format(Number(amount))

// ── Star Rating Input ─────────────────────────────────────────────────────────
function StarInput({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-600 w-32">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            className="focus:outline-none"
          >
            <Star
              className={`w-6 h-6 transition-colors ${
                star <= (hover || value)
                  ? "fill-amber-400 text-amber-400"
                  : "text-gray-200"
              }`}
            />
          </button>
        ))}
      </div>
      {value > 0 && <span className="text-xs text-gray-400">{value}/5</span>}
    </div>
  )
}

// ── Review Form ───────────────────────────────────────────────────────────────
function ReviewForm({ booking, onDone }: { booking: Booking; onDone: () => void }) {
  const [ratings, setRatings] = useState({
    overall: 0, cleanliness: 0, communication: 0, location: 0, value: 0,
  })
  const [comment, setComment] = useState("")
  const qc = useQueryClient()

  const submit = useMutation({
    mutationFn: () => reviewsApi.create({
      booking: booking.id,
      property: (booking as any).listing?.id || (booking as any).property?.id,
      ...ratings,
      comment,
    }),
    onSuccess: () => {
      toast.success("Review submitted!")
      qc.invalidateQueries({ queryKey: ["my-trips"] })
      onDone()
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.booking?.[0] ||
                  e?.response?.data?.detail ||
                  "Failed to submit review"
      toast.error(msg)
    },
  })

  const allRated = Object.values(ratings).every((v) => v > 0)

  return (
    <div className="mt-4 border-t border-gray-100 pt-4 space-y-4">
      <h4 className="font-semibold text-gray-900 text-sm">Leave a review</h4>
      <div className="space-y-3">
        <StarInput label="Overall" value={ratings.overall} onChange={(v) => setRatings((r) => ({ ...r, overall: v }))} />
        <StarInput label="Cleanliness" value={ratings.cleanliness} onChange={(v) => setRatings((r) => ({ ...r, cleanliness: v }))} />
        <StarInput label="Communication" value={ratings.communication} onChange={(v) => setRatings((r) => ({ ...r, communication: v }))} />
        <StarInput label="Location" value={ratings.location} onChange={(v) => setRatings((r) => ({ ...r, location: v }))} />
        <StarInput label="Value" value={ratings.value} onChange={(v) => setRatings((r) => ({ ...r, value: v }))} />
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Share your experience…"
        rows={3}
        className="input w-full resize-none text-sm"
      />
      <div className="flex gap-2">
        <button
          onClick={() => submit.mutate()}
          disabled={!allRated || !comment.trim() || submit.isPending}
          className="btn-primary text-sm disabled:opacity-50"
        >
          {submit.isPending ? "Submitting…" : "Submit review"}
        </button>
        <button onClick={onDone} className="btn-ghost text-sm">Cancel</button>
      </div>
    </div>
  )
}

// ── Booking Card ──────────────────────────────────────────────────────────────
function BookingCard({ booking }: { booking: Booking }) {
  const qc = useQueryClient()
  const [showReview, setShowReview] = useState(false)

  const cancel = useMutation({
    mutationFn: () => bookingsApi.cancel(booking.id),
    onSuccess: () => {
      toast.success("Booking cancelled")
      qc.invalidateQueries({ queryKey: ["my-trips"] })
    },
    onError: () => toast.error("Failed to cancel booking"),
  })

  const statusClass: Record<string, string> = {
    pending:   "badge-pending",
    confirmed: "badge-confirmed",
    cancelled: "badge-cancelled",
    completed: "badge-completed",
    rejected:  "badge-cancelled",
  }

  const prop = (booking as any).listing || booking.property
  const today = new Date().toISOString().split("T")[0]
  const isCompleted = booking.status === "completed"
  const hasReview = !!(booking as any).review

  return (
    <div className="card p-5">
      <div className="flex gap-4">
        <div className="w-20 h-20 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
          {prop?.cover_photo ? (
            <img src={prop.cover_photo} className="w-full h-full object-cover" alt="" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300">
              <Calendar className="w-6 h-6" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-gray-900 truncate">{prop?.title}</h3>
            <span className={statusClass[booking.status]}>{booking.status}</span>
          </div>
          <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
            <MapPin className="w-3.5 h-3.5" />
            {prop?.city}, {prop?.country}
          </p>
          <p className="text-sm text-gray-600 mt-1">
            {booking.check_in} → {booking.check_out} · {booking.nights} night{booking.nights !== 1 ? "s" : ""} · {booking.num_guests} guest{booking.num_guests !== 1 ? "s" : ""}
          </p>
          <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
            <p className="font-semibold text-gray-900">{INR(booking.total_price)}</p>
            <div className="flex items-center gap-3">
              {isCompleted && !hasReview && !showReview && (
                <button
                  onClick={() => setShowReview(true)}
                  className="text-xs text-brand-600 font-medium hover:underline flex items-center gap-1"
                >
                  <Star className="w-3.5 h-3.5" /> Leave a review
                </button>
              )}
              {isCompleted && hasReview && (
                <span className="text-xs text-green-600 flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> Reviewed
                </span>
              )}
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
      </div>

      {/* Review form */}
      {showReview && (
        <ReviewForm booking={booking} onDone={() => setShowReview(false)} />
      )}

      {/* Show existing review */}
      {isCompleted && hasReview && (
        <div className="mt-4 border-t border-gray-100 pt-4">
          <div className="flex items-center gap-2 mb-1">
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            <span className="text-sm font-semibold text-gray-900">{(booking as any).review?.overall}/5</span>
            <span className="text-xs text-gray-400">Your review</span>
          </div>
          <p className="text-sm text-gray-600">{(booking as any).review?.comment}</p>
        </div>
      )}
    </div>
  )
}

// ── Trips Page ────────────────────────────────────────────────────────────────
type Tab = "upcoming" | "past" | "all"

export default function TripsPage() {
  const [tab, setTab] = useState<Tab>("upcoming")

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["my-trips"],
    queryFn: () => bookingsApi.myTrips().then((r) => {
      const data = r.data
      return Array.isArray(data) ? data : (data.results || [])
    }),
  })

  const today = new Date().toISOString().split("T")[0]

  const filtered = bookings.filter((b: Booking) => {
    if (tab === "upcoming") return ["pending", "confirmed"].includes(b.status) && b.check_out >= today
    if (tab === "past") return ["completed", "cancelled", "rejected"].includes(b.status) || b.check_out < today
    return true
  })

  const tabs: { key: Tab; label: string }[] = [
    { key: "upcoming", label: "Upcoming" },
    { key: "past",     label: "Past" },
    { key: "all",      label: "All" },
  ]

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="font-display text-2xl font-bold text-gray-900 mb-6">My trips</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              tab === t.key
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card p-5 h-28 animate-pulse bg-gray-100" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-16 text-center text-gray-400">
          <Calendar className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium text-gray-600">
            {tab === "upcoming" ? "No upcoming trips" : tab === "past" ? "No past trips" : "No trips yet"}
          </p>
          <p className="text-sm mt-1">
            {tab === "upcoming" ? "Start exploring and book your first stay" : "Your completed trips will appear here"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((b: Booking) => <BookingCard key={b.id} booking={b} />)}
        </div>
      )}
    </div>
  )
}