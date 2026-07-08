"use client"
import { useQuery, useMutation } from "@tanstack/react-query"
import { propertiesApi, bookingsApi, reviewsApi } from "@/lib/api"
import { useParams, useRouter } from "next/navigation"
import { useState, useEffect, useCallback } from "react"
import { Star, Users, Bed, Bath, MapPin, ChevronLeft, ChevronRight, Heart, Share2, Wifi, X } from "lucide-react"
import Link from "next/link"
import { useAuthStore } from "@/store/auth"
import toast from "react-hot-toast"
import { ReviewsResponse, Property, PropertyPhoto } from "@/types"

const INR = (amount: string | number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(amount))

// ── Lightbox ──────────────────────────────────────────────────────────────────
function Lightbox({ photos, initialIndex, onClose }: {
  photos: PropertyPhoto[]
  initialIndex: number
  onClose: () => void
}) {
  const [current, setCurrent] = useState(initialIndex)

  const prev = useCallback(() => setCurrent((c) => (c - 1 + photos.length) % photos.length), [photos.length])
  const next = useCallback(() => setCurrent((c) => (c + 1) % photos.length), [photos.length])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft")  prev()
      if (e.key === "ArrowRight") next()
      if (e.key === "Escape")     onClose()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [prev, next, onClose])

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center" onClick={onClose}>
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition z-10"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Counter */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/70 text-sm">
        {current + 1} / {photos.length}
      </div>

      {/* Prev */}
      <button
        onClick={(e) => { e.stopPropagation(); prev() }}
        className="absolute left-4 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-3 transition z-10"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>

      {/* Image */}
      <div className="max-w-5xl max-h-[85vh] px-20" onClick={(e) => e.stopPropagation()}>
        <img
          src={photos[current]?.image}
          alt={`Photo ${current + 1}`}
          className="max-w-full max-h-[85vh] object-contain rounded-xl"
        />
      </div>

      {/* Next */}
      <button
        onClick={(e) => { e.stopPropagation(); next() }}
        className="absolute right-4 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-3 transition z-10"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Thumbnails */}
      {photos.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 overflow-x-auto max-w-lg px-4">
          {photos.map((p, i) => (
            <button
              key={p.id}
              onClick={(e) => { e.stopPropagation(); setCurrent(i) }}
              className={`flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition ${
                i === current ? "border-white" : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              <img src={p.image} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function PropertyDetailPage() {
  const { id }   = useParams<{ id: string }>()
  const router   = useRouter()
  const { isAuthenticated } = useAuthStore()

  const [checkIn,  setCheckIn]  = useState("")
  const [checkOut, setCheckOut] = useState("")
  const [guests,   setGuests]   = useState(1)
  const [preview,  setPreview]  = useState<any>(null)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const today = new Date().toISOString().split("T")[0]

  const { data: property, isLoading, error } = useQuery({
    queryKey: ["property", id],
    queryFn:  () => propertiesApi.detail(Number(id)).then((r) => r.data),
    enabled:  !!id,
  })

  const { data: reviews } = useQuery<ReviewsResponse>({
    queryKey: ["reviews", id],
    queryFn:  () => reviewsApi.forProperty(Number(id)).then((r) => r.data),
    enabled:  !!id,
  })

  const previewMutation = useMutation({
    mutationFn: () => bookingsApi.pricePreview({
      property_id: Number(id),
      check_in: checkIn,
      check_out: checkOut,
      num_guests: guests,
    }),
    onSuccess: (r) => setPreview(r.data),
    onError:   (e: any) => toast.error(e?.response?.data?.detail || "Invalid dates"),
  })

  const bookMutation = useMutation({
    mutationFn: () => bookingsApi.create({
      listing: Number(id),
      check_in: checkIn,
      check_out: checkOut,
      num_guests: guests,
    }),
    onSuccess: () => { toast.success("Booking request sent!"); router.push("/trips") },
    onError:   (e: any) => toast.error(e?.response?.data?.detail || "Booking failed. Please try again."),
  })

  if (isLoading) return (
    <div className="max-w-5xl mx-auto px-4 py-10 animate-pulse space-y-4">
      <div className="h-10 bg-gray-200 rounded w-2/3" />
      <div className="h-80 bg-gray-200 rounded-2xl" />
    </div>
  )

  if (error || !property) return (
    <div className="max-w-5xl mx-auto px-4 py-20 text-center">
      <p className="text-gray-500 text-lg">Property not found.</p>
      <Link href="/search" className="btn-primary mt-4 inline-block">Back to search</Link>
    </div>
  )

  const photos: PropertyPhoto[] = property.photos || []

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <Lightbox
          photos={photos}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}

      {/* Back */}
      <Link href="/search" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-4">
        <ChevronLeft className="w-4 h-4" /> Back to search
      </Link>

      {/* Title */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-gray-900 mb-1">{property.title}</h1>
          <div className="flex items-center gap-3 text-sm text-gray-500 flex-wrap">
            {parseFloat(property.avg_rating) > 0 && (
              <span className="flex items-center gap-1 font-medium text-gray-700">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                {parseFloat(property.avg_rating).toFixed(1)}
                <span className="text-gray-400 font-normal">({property.total_reviews} reviews)</span>
              </span>
            )}
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {property.city}, {property.state}, {property.country}
            </span>
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button className="btn-ghost text-sm flex items-center gap-1.5">
            <Share2 className="w-4 h-4" /> Share
          </button>
          <button className="btn-ghost text-sm flex items-center gap-1.5">
            <Heart className="w-4 h-4" /> Save
          </button>
        </div>
      </div>

      {/* Photo gallery */}
      {photos.length > 0 ? (
        <div className="mb-8">
          <div className="grid grid-cols-4 grid-rows-2 gap-2 rounded-2xl overflow-hidden h-80">
            {/* Main photo */}
            <div className="col-span-2 row-span-2 cursor-pointer relative group" onClick={() => setLightboxIndex(0)}>
              <img src={photos[0]?.image} alt={property.title}
                className="w-full h-full object-cover group-hover:brightness-90 transition" />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                <span className="bg-black/50 text-white text-xs px-3 py-1.5 rounded-full">View photos</span>
              </div>
            </div>
            {/* Side photos */}
            {photos.slice(1, 5).map((photo, i) => (
              <div key={photo.id} className="cursor-pointer relative group" onClick={() => setLightboxIndex(i + 1)}>
                <img src={photo.image} alt=""
                  className="w-full h-full object-cover group-hover:brightness-90 transition" />
                {i === 3 && photos.length > 5 && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">+{photos.length - 5} more</span>
                  </div>
                )}
              </div>
            ))}
            {photos.length < 5 && [...Array(5 - photos.length)].map((_, i) => (
              <div key={`empty-${i}`} className="bg-gray-100" />
            ))}
          </div>
          {/* Show all photos button */}
          <button
            onClick={() => setLightboxIndex(0)}
            className="mt-2 text-sm text-gray-600 underline hover:text-gray-900"
          >
            Show all {photos.length} photo{photos.length !== 1 ? "s" : ""}
          </button>
        </div>
      ) : (
        <div className="h-80 bg-gray-100 rounded-2xl flex items-center justify-center mb-8">
          <MapPin className="w-12 h-12 text-gray-300" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* ── Left: Details ───────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-8">
          <div className="flex items-center gap-6 pb-6 border-b border-gray-100">
            <div className="flex items-center gap-2 text-gray-600">
              <Users className="w-5 h-5 text-brand-400" />
              <span className="text-sm">{property.max_guests} guests</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Bed className="w-5 h-5 text-brand-400" />
              <span className="text-sm">{property.bedrooms} bedroom{property.bedrooms !== 1 ? "s" : ""}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Bed className="w-5 h-5 text-brand-400" />
              <span className="text-sm">{property.beds} bed{property.beds !== 1 ? "s" : ""}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Bath className="w-5 h-5 text-brand-400" />
              <span className="text-sm">{property.bathrooms} bath{property.bathrooms !== 1 ? "s" : ""}</span>
            </div>
          </div>

          {property.host && (
            <div className="flex items-center gap-4 pb-6 border-b border-gray-100">
              <div className="w-12 h-12 rounded-full bg-brand-100 overflow-hidden flex-shrink-0">
                {property.host.avatar
                  ? <img src={property.host.avatar} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center font-bold text-brand-600 text-lg">
                      {property.host.first_name?.charAt(0)}
                    </div>
                }
              </div>
              <div>
                <p className="font-semibold text-gray-900">Hosted by {property.host.first_name} {property.host.last_name}</p>
                {property.host.bio && <p className="text-sm text-gray-500 line-clamp-2 mt-0.5">{property.host.bio}</p>}
              </div>
            </div>
          )}

          <div>
            <h2 className="font-display font-semibold text-xl text-gray-900 mb-3">About this place</h2>
            <p className="text-gray-600 leading-relaxed whitespace-pre-line">{property.description}</p>
          </div>

          {property.amenities?.length > 0 && (
            <div>
              <h2 className="font-display font-semibold text-xl text-gray-900 mb-4">What this place offers</h2>
              <div className="grid grid-cols-2 gap-3">
                {property.amenities.map((a: any) => (
                  <div key={a.id} className="flex items-center gap-3 text-sm text-gray-600">
                    <Wifi className="w-4 h-4 text-brand-400 flex-shrink-0" />
                    {a.name}
                  </div>
                ))}
              </div>
            </div>
          )}

          {property.house_rules && (
            <div>
              <h2 className="font-display font-semibold text-xl text-gray-900 mb-3">House rules</h2>
              <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{property.house_rules}</p>
              <div className="flex gap-4 mt-3 text-sm">
                <span className={`flex items-center gap-1 ${property.allows_pets ? "text-green-600" : "text-gray-400 line-through"}`}>🐾 Pets {property.allows_pets ? "allowed" : "not allowed"}</span>
                <span className={`flex items-center gap-1 ${property.allows_smoking ? "text-green-600" : "text-gray-400 line-through"}`}>🚬 Smoking {property.allows_smoking ? "allowed" : "not allowed"}</span>
                <span className={`flex items-center gap-1 ${property.allows_parties ? "text-green-600" : "text-gray-400 line-through"}`}>🎉 Parties {property.allows_parties ? "allowed" : "not allowed"}</span>
              </div>
            </div>
          )}

          {reviews && reviews.count > 0 && (
            <div>
              <h2 className="font-display font-semibold text-xl text-gray-900 mb-2 flex items-center gap-2">
                <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                {parseFloat(property.avg_rating).toFixed(1)} · {reviews.count} review{reviews.count !== 1 ? "s" : ""}
              </h2>
              <div className="grid grid-cols-2 gap-x-8 gap-y-2 mb-6 text-sm">
                {[["Cleanliness", reviews.ratings.avg_cleanliness], ["Communication", reviews.ratings.avg_communication], ["Location", reviews.ratings.avg_location], ["Value", reviews.ratings.avg_value]].map(([label, val]) => (
                  <div key={label as string} className="flex items-center gap-3">
                    <span className="text-gray-600 w-28">{label}</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                      <div className="bg-gray-800 h-1.5 rounded-full" style={{ width: `${((Number(val) || 0) / 5) * 100}%` }} />
                    </div>
                    <span className="text-gray-700 font-medium w-6">{Number(val).toFixed(1)}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-5">
                {reviews.results.slice(0, 4).map((r) => (
                  <div key={r.id} className="border-b border-gray-100 pb-5 last:border-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-sm font-bold text-brand-600 flex-shrink-0">
                        {r.guest_name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900">{r.guest_name}</p>
                        <p className="text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</p>
                      </div>
                      <div className="flex items-center gap-1 text-xs font-semibold">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> {r.overall}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">{r.comment}</p>
                    {r.host_response && (
                      <div className="mt-3 bg-gray-50 rounded-xl p-3">
                        <p className="text-xs font-semibold text-gray-700 mb-1">Response from host</p>
                        <p className="text-xs text-gray-600">{r.host_response}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h2 className="font-display font-semibold text-xl text-gray-900 mb-2">Location</h2>
            <p className="text-gray-600 text-sm">
              {property.address_line1 && `${property.address_line1}, `}
              {property.city}, {property.state} {property.postal_code}, {property.country}
            </p>
            <div className="mt-3 h-48 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-400 text-sm">
              <MapPin className="w-5 h-5 mr-2" />{property.city}, {property.country}
            </div>
          </div>
        </div>

        {/* ── Right: Booking card ──────────────────────────────────────────── */}
        <div>
          <div className="card p-6 sticky top-20">
            <div className="flex items-baseline gap-1 mb-1">
              <span className="font-display text-2xl font-bold text-gray-900">{INR(property.price_per_night)}</span>
              <span className="text-gray-500 text-sm">/ night</span>
            </div>
            {parseFloat(property.avg_rating) > 0 && (
              <p className="text-xs text-gray-400 mb-5">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400 inline mr-0.5" />
                {parseFloat(property.avg_rating).toFixed(1)} · {property.total_reviews} review{property.total_reviews !== 1 ? "s" : ""}
              </p>
            )}
            <div className="border border-gray-200 rounded-xl overflow-hidden mb-4">
              <div className="grid grid-cols-2 divide-x divide-gray-200">
                <div className="p-3">
                  <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide block mb-1">Check-in</label>
                  <input type="date" value={checkIn} min={today}
                    onChange={(e) => { setCheckIn(e.target.value); setPreview(null) }}
                    className="w-full text-sm text-gray-800 focus:outline-none bg-transparent" />
                </div>
                <div className="p-3">
                  <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide block mb-1">Check-out</label>
                  <input type="date" value={checkOut} min={checkIn || today}
                    onChange={(e) => { setCheckOut(e.target.value); setPreview(null) }}
                    className="w-full text-sm text-gray-800 focus:outline-none bg-transparent" />
                </div>
              </div>
              <div className="border-t border-gray-200 p-3">
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide block mb-1">Guests</label>
                <select value={guests} onChange={(e) => setGuests(Number(e.target.value))}
                  className="w-full text-sm text-gray-800 focus:outline-none bg-transparent">
                  {[...Array(property.max_guests)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1} guest{i > 0 ? "s" : ""}</option>
                  ))}
                </select>
              </div>
            </div>
            {checkIn && checkOut && !preview && (
              <button onClick={() => previewMutation.mutate()} disabled={previewMutation.isPending}
                className="btn-secondary w-full text-sm mb-3">
                {previewMutation.isPending ? "Calculating…" : "Check price"}
              </button>
            )}
            {preview && (
              <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>{INR(preview.price_per_night)} × {preview.nights} night{preview.nights !== 1 ? "s" : ""}</span>
                  <span>{INR(preview.subtotal)}</span>
                </div>
                {parseFloat(preview.cleaning_fee) > 0 && (
                  <div className="flex justify-between text-gray-600"><span>Cleaning fee</span><span>{INR(preview.cleaning_fee)}</span></div>
                )}
                <div className="flex justify-between text-gray-600">
                  <span>Service fee ({preview.service_fee_pct}%)</span><span>{INR(preview.service_fee)}</span>
                </div>
                <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-200">
                  <span>Total</span><span>{INR(preview.total)}</span>
                </div>
              </div>
            )}
            <button
              onClick={() => {
                if (!isAuthenticated()) { toast.error("Please log in to book"); router.push("/login"); return }
                if (!checkIn || !checkOut) { toast.error("Select check-in and check-out dates"); return }
                bookMutation.mutate()
              }}
              disabled={bookMutation.isPending}
              className="btn-primary w-full text-base py-3"
            >
              {bookMutation.isPending ? "Requesting…" : checkIn && checkOut ? "Request to book" : "Check availability"}
            </button>
            <p className="text-xs text-center text-gray-400 mt-3">You won't be charged until the host accepts</p>
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-1 text-xs text-gray-500">
              <div className="flex justify-between"><span>Min. stay</span><span>{property.min_nights} night{property.min_nights !== 1 ? "s" : ""}</span></div>
              <div className="flex justify-between"><span>Check-in</span><span>from {property.check_in_time}</span></div>
              <div className="flex justify-between"><span>Check-out</span><span>by {property.check_out_time}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
