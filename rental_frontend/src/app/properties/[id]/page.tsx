"use client"
import { useQuery, useMutation } from "@tanstack/react-query"
import { propertiesApi, bookingsApi, reviewsApi } from "@/lib/api"
import { useParams, useRouter } from "next/navigation"
import { useState } from "react"
import { Star, Users, Bed, Bath, MapPin, ChevronLeft, Heart, Share2, Wifi } from "lucide-react"
import Link from "next/link"
import { useAuthStore } from "@/store/auth"
import toast from "react-hot-toast"
import { ReviewsResponse, PropertyPhoto } from "@/types"
import { AvailabilityCalendar } from "@/components/property/AvailabilityCalendar"
import { PhotoGallery } from "@/components/property/PhotoGallery"
import { ChatButton } from "@/components/chat/ChatButton"

const INR = (amount: string | number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0,
  }).format(Number(amount))

export default function PropertyDetailPage() {
  const { id }   = useParams<{ id: string }>()
  const router   = useRouter()
  const { isAuthenticated, user } = useAuthStore()

  const [checkIn,  setCheckIn]  = useState("")
  const [checkOut, setCheckOut] = useState("")
  const [guests,   setGuests]   = useState(1)
  const [preview,  setPreview]  = useState<any>(null)

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
      listing:    Number(id),
      check_in:   checkIn,
      check_out:  checkOut,
      num_guests: guests,
    }),
    onSuccess: () => { toast.success("Booking request sent!"); router.push("/trips") },
    onError:   (e: any) => toast.error(e?.response?.data?.detail || "Booking failed."),
  })

  // Handle date selection from calendar
  const handleRangeSelect = (ci: string, co: string) => {
    setCheckIn(ci)
    setCheckOut(co)
    setPreview(null)
  }

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
  const isOwner = user?.id === property.host?.id

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      <Link href="/search" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-4">
        <ChevronLeft className="w-4 h-4" /> Back to search
      </Link>

      {/* Title row */}
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

      {/* Photos */}
      <PhotoGallery photos={photos} title={property.title} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

        {/* ── Left: Details ──────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-8">

          {/* Key stats */}
          <div className="flex items-center gap-6 pb-6 border-b border-gray-100 flex-wrap">
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

          {/* Host info */}
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
                <p className="font-semibold text-gray-900">
                  Hosted by {property.host.first_name} {property.host.last_name}
                </p>
                {property.host.bio && (
                  <p className="text-sm text-gray-500 line-clamp-2 mt-0.5">{property.host.bio}</p>
                )}
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <h2 className="font-display font-semibold text-xl text-gray-900 mb-3">About this place</h2>
            <p className="text-gray-600 leading-relaxed whitespace-pre-line">{property.description}</p>
          </div>

          {/* Amenities */}
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

          {/* House rules */}
          {property.house_rules && (
            <div>
              <h2 className="font-display font-semibold text-xl text-gray-900 mb-3">House rules</h2>
              <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{property.house_rules}</p>
              <div className="flex gap-4 mt-3 text-sm flex-wrap">
                <span className={property.allows_pets ? "text-green-600" : "text-gray-400 line-through"}>
                  🐾 Pets {property.allows_pets ? "allowed" : "not allowed"}
                </span>
                <span className={property.allows_smoking ? "text-green-600" : "text-gray-400 line-through"}>
                  🚬 Smoking {property.allows_smoking ? "allowed" : "not allowed"}
                </span>
                <span className={property.allows_parties ? "text-green-600" : "text-gray-400 line-through"}>
                  🎉 Parties {property.allows_parties ? "allowed" : "not allowed"}
                </span>
              </div>
            </div>
          )}

          {/* ── AVAILABILITY CALENDAR — visible to everyone, no login needed ── */}
          <div>
            <h2 className="font-display font-semibold text-xl text-gray-900 mb-2">Availability</h2>
            <p className="text-sm text-gray-500 mb-4">
              {isAuthenticated()
                ? "Select your check-in and check-out dates below"
                : "Grey dates are unavailable. Log in to make a booking."}
            </p>
            <AvailabilityCalendar
              propertyId={property.id}
              isHost={false}
              onRangeSelect={isAuthenticated() ? handleRangeSelect : undefined}
              selectedCheckIn={checkIn}
              selectedCheckOut={checkOut}
            />
            {!isAuthenticated() && (
              <div className="mt-4 bg-brand-50 border border-brand-200 rounded-xl p-4 flex items-center justify-between gap-4">
                <p className="text-sm text-brand-700">Log in to book this property</p>
                <Link href="/login" className="btn-primary text-sm flex-shrink-0">Log in</Link>
              </div>
            )}
          </div>

          {/* Reviews */}
          {reviews && reviews.count > 0 && (
            <div>
              <h2 className="font-display font-semibold text-xl text-gray-900 mb-2 flex items-center gap-2">
                <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                {parseFloat(property.avg_rating).toFixed(1)} · {reviews.count} review{reviews.count !== 1 ? "s" : ""}
              </h2>

              {/* Rating breakdown */}
              <div className="grid grid-cols-2 gap-x-8 gap-y-2 mb-6 text-sm">
                {[
                  ["Cleanliness",   reviews.ratings.avg_cleanliness],
                  ["Communication", reviews.ratings.avg_communication],
                  ["Location",      reviews.ratings.avg_location],
                  ["Value",         reviews.ratings.avg_value],
                ].map(([label, val]) => (
                  <div key={label as string} className="flex items-center gap-3">
                    <span className="text-gray-600 w-28">{label}</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                      <div className="bg-gray-800 h-1.5 rounded-full"
                        style={{ width: `${((Number(val) || 0) / 5) * 100}%` }} />
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
                        <p className="text-xs text-gray-400">
                          {new Date(r.created_at).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
                        </p>
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

          {/* Location */}
          <div>
            <h2 className="font-display font-semibold text-xl text-gray-900 mb-2">Location</h2>
            <p className="text-gray-600 text-sm">
              {property.address_line1 && `${property.address_line1}, `}
              {property.city}, {property.state} {property.postal_code}, {property.country}
            </p>
            <div className="mt-3 h-48 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-400 text-sm">
              <MapPin className="w-5 h-5 mr-2" /> {property.city}, {property.country}
            </div>
          </div>
        </div>

        {/* ── Right: Booking card ─────────────────────────────────────────── */}
        <div>
          <div className="card p-6 sticky top-20 space-y-4">
            <div className="flex items-baseline gap-1">
              <span className="font-display text-2xl font-bold text-gray-900">
                {INR(property.price_per_night)}
              </span>
              <span className="text-gray-500 text-sm">/ night</span>
            </div>

            {parseFloat(property.avg_rating) > 0 && (
              <p className="text-xs text-gray-400">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400 inline mr-0.5" />
                {parseFloat(property.avg_rating).toFixed(1)} · {property.total_reviews} review{property.total_reviews !== 1 ? "s" : ""}
              </p>
            )}

            {/* Dates — only show if logged in */}
            {isAuthenticated() ? (
              <>
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="grid grid-cols-2 divide-x divide-gray-200">
                    <div className="p-3">
                      <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide block mb-1">
                        Check-in
                      </label>
                      <input type="date" value={checkIn} min={today}
                        onChange={(e) => { setCheckIn(e.target.value); setPreview(null) }}
                        className="w-full text-sm text-gray-800 focus:outline-none bg-transparent" />
                    </div>
                    <div className="p-3">
                      <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide block mb-1">
                        Check-out
                      </label>
                      <input type="date" value={checkOut} min={checkIn || today}
                        onChange={(e) => { setCheckOut(e.target.value); setPreview(null) }}
                        className="w-full text-sm text-gray-800 focus:outline-none bg-transparent" />
                    </div>
                  </div>
                  <div className="border-t border-gray-200 p-3">
                    <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide block mb-1">
                      Guests
                    </label>
                    <select value={guests} onChange={(e) => setGuests(Number(e.target.value))}
                      className="w-full text-sm text-gray-800 focus:outline-none bg-transparent">
                      {[...Array(property.max_guests)].map((_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {i + 1} guest{i > 0 ? "s" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {checkIn && checkOut && !preview && (
                  <button onClick={() => previewMutation.mutate()}
                    disabled={previewMutation.isPending}
                    className="btn-secondary w-full text-sm">
                    {previewMutation.isPending ? "Calculating…" : "Check price"}
                  </button>
                )}

                {preview && (
                  <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                    <div className="flex justify-between text-gray-600">
                      <span>{INR(preview.price_per_night)} × {preview.nights} night{preview.nights !== 1 ? "s" : ""}</span>
                      <span>{INR(preview.subtotal)}</span>
                    </div>
                    {parseFloat(preview.cleaning_fee) > 0 && (
                      <div className="flex justify-between text-gray-600">
                        <span>Cleaning fee</span><span>{INR(preview.cleaning_fee)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-gray-600">
                      <span>Service fee ({preview.service_fee_pct}%)</span>
                      <span>{INR(preview.service_fee)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-200">
                      <span>Total</span><span>{INR(preview.total)}</span>
                    </div>
                  </div>
                )}

                {!isOwner && (
                  <>
                    <button
                      onClick={() => bookMutation.mutate()}
                      disabled={!checkIn || !checkOut || bookMutation.isPending}
                      className="btn-primary w-full text-base py-3"
                    >
                      {bookMutation.isPending ? "Requesting…" : checkIn && checkOut ? "Request to book" : "Select dates above"}
                    </button>

                    <ChatButton
                      propertyId={property.id}
                      hostName={property.host?.first_name || "host"}
                      className="w-full"
                    />
                  </>
                )}

                {isOwner && (
                  <Link href={`/host/properties/${property.id}/edit`} className="btn-secondary w-full text-center block">
                    Edit your listing
                  </Link>
                )}

                <p className="text-xs text-center text-gray-400">
                  You won't be charged until the host accepts
                </p>
              </>
            ) : (
              /* Not logged in — show login prompt */
              <div className="space-y-3">
                <p className="text-sm text-gray-600 text-center">
                  Log in to book this property or message the host
                </p>
                <Link href="/login" className="btn-primary w-full text-center block">
                  Log in to book
                </Link>
                <Link href="/register" className="btn-secondary w-full text-center block">
                  Create account
                </Link>
              </div>
            )}

            {/* Always visible info */}
            <div className="pt-2 border-t border-gray-100 space-y-1 text-xs text-gray-500">
              <div className="flex justify-between">
                <span>Min. stay</span>
                <span>{property.min_nights} night{property.min_nights !== 1 ? "s" : ""}</span>
              </div>
              <div className="flex justify-between">
                <span>Check-in from</span><span>{property.check_in_time}</span>
              </div>
              <div className="flex justify-between">
                <span>Check-out by</span><span>{property.check_out_time}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
