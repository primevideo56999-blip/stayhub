"use client"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { useQuery, useMutation } from "@tanstack/react-query"
import { propertiesApi } from "@/lib/api"
import toast from "react-hot-toast"
import { Upload, X, ChevronRight, ChevronLeft, Check, Home, Image, DollarSign, Settings, MapPin } from "lucide-react"

const LocationPicker = dynamic(
  () => import("@/components/map/LocationPicker").then((m) => m.LocationPicker),
  { ssr: false, loading: () => <div className="h-72 sm:h-80 rounded-2xl bg-gray-100 animate-pulse" /> }
)

const schema = z.object({
  title:          z.string().min(10, "At least 10 characters"),
  description:    z.string().min(100, "At least 100 characters — help guests understand your space"),
  property_type:  z.string().min(1, "Select a property type"),
  address_line1:  z.string().min(5, "Required"),
  city:           z.string().min(2, "Required"),
  state:          z.string().min(2, "Required"),
  country:        z.string().min(2, "Required"),
  postal_code:    z.string().min(3, "Required"),
  max_guests:     z.coerce.number().min(1),
  bedrooms:       z.coerce.number().min(0),
  beds:           z.coerce.number().min(1),
  bathrooms:      z.coerce.number().min(0.5),
  price_per_night:z.coerce.number().min(1, "Set a nightly price"),
  cleaning_fee:   z.coerce.number().min(0).default(0),
  min_nights:     z.coerce.number().min(1).default(1),
  max_nights:     z.coerce.number().min(1).default(365),
  check_in_time:  z.string().default("15:00"),
  check_out_time: z.string().default("11:00"),
  house_rules:    z.string().optional(),
  allows_pets:    z.boolean().default(false),
  allows_smoking: z.boolean().default(false),
  allows_parties: z.boolean().default(false),
})

type FormData = z.infer<typeof schema>

const STEPS = [
  { id: 1, label: "Basics",   icon: <Home className="w-4 h-4" /> },
  { id: 2, label: "Photos",   icon: <Image className="w-4 h-4" /> },
  { id: 3, label: "Pricing",  icon: <DollarSign className="w-4 h-4" /> },
  { id: 4, label: "Rules",    icon: <Settings className="w-4 h-4" /> },
]

export default function NewPropertyPage() {
  const router = useRouter()
  const [step, setStep]         = useState(1)
  const [photos, setPhotos]     = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [createdId, setCreatedId] = useState<number | null>(null)

  const { data: amenities = [] } = useQuery({
    queryKey: ["amenities"],
    queryFn:  () => propertiesApi.amenities().then((r) => r.data),
  })
  const [selectedAmenities, setSelectedAmenities] = useState<number[]>([])
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null)

  const { register, handleSubmit, trigger, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      allows_pets: false, allows_smoking: false, allows_parties: false,
      min_nights: 1, max_nights: 365, check_in_time: "15:00", check_out_time: "11:00",
      cleaning_fee: 0,
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: FormData) =>
      propertiesApi.create({
        ...data,
        amenity_ids: selectedAmenities,
        latitude:  pin ? pin.lat.toFixed(6) : null,
        longitude: pin ? pin.lng.toFixed(6) : null,
      }),
    onSuccess: async (res) => {
      const id = res.data.id
      setCreatedId(id)
      // Upload all photos
      for (const photo of photos) {
        const fd = new FormData()
        fd.append("image", photo)
        try { await propertiesApi.uploadPhoto(id, fd) } catch {}
      }
      setStep(5) // done step
    },
    onError: (e: any) => {
      const errs = e?.response?.data
      if (errs) Object.values(errs).flat().forEach((m: any) => toast.error(m))
      else toast.error("Failed to create listing.")
    },
  })

  const handlePhotoAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setPhotos((p) => [...p, ...files])
    setPreviews((p) => [...p, ...files.map((f) => URL.createObjectURL(f))])
  }

  const removePhoto = (i: number) => {
    setPhotos((p) => p.filter((_, idx) => idx !== i))
    setPreviews((p) => p.filter((_, idx) => idx !== i))
  }

  const nextStep = async () => {
    let fields: (keyof FormData)[] = []
    if (step === 1) fields = ["title","description","property_type","address_line1","city","state","country","postal_code","max_guests","bedrooms","beds","bathrooms"]
    if (step === 3) fields = ["price_per_night","cleaning_fee","min_nights","max_nights"]
    const ok = fields.length ? await trigger(fields) : true
    if (step === 1 && ok && !pin) {
      toast.error("Pin your property's exact location on the map")
      return
    }
    if (ok) setStep((s) => s + 1)
  }

  const onSubmit = (data: FormData) => {
    if (photos.length === 0) { toast.error("Add at least one photo."); setStep(2); return }
    createMutation.mutate(data)
  }

  const toggleAmenity = (id: number) =>
    setSelectedAmenities((a) => a.includes(id) ? a.filter((x) => x !== id) : [...a, id])

  // ── Done screen ────────────────────────────────────────────────────────────
  if (step === 5) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
        <div className="card p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="font-display text-2xl font-bold text-gray-900 mb-2">Listing created!</h2>
          <p className="text-gray-500 text-sm mb-8">
            Your property has been saved as a draft. Publish it to make it visible to guests.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => propertiesApi.publish(createdId!).then(() => { toast.success("Published!"); router.push("/host/dashboard") })}
              className="btn-primary"
            >
              Publish now
            </button>
            <button onClick={() => router.push("/host/dashboard")} className="btn-secondary">
              Save as draft
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      {/* Progress steps */}
      <div className="flex items-center justify-between mb-10">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                step > s.id  ? "bg-green-500 text-white" :
                step === s.id ? "bg-brand-600 text-white ring-4 ring-brand-100" :
                "bg-gray-100 text-gray-400"
              }`}>
                {step > s.id ? <Check className="w-4 h-4" /> : s.icon}
              </div>
              <span className={`text-xs mt-1.5 font-medium ${step === s.id ? "text-brand-600" : "text-gray-400"}`}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 mb-4 rounded ${step > s.id ? "bg-green-400" : "bg-gray-200"}`} />
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>

        {/* ── Step 1: Basics ──────────────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-xl font-bold text-gray-900 mb-1">Tell us about your place</h2>
              <p className="text-gray-500 text-sm">Start with the basics — you can always edit later.</p>
            </div>

            <div>
              <label className="label">Property type</label>
              <select {...register("property_type")} className="input">
                <option value="">Select type…</option>
                {["apartment","house","villa","studio","cabin","hotel_room","hostel","other"].map((t) => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1).replace("_"," ")}</option>
                ))}
              </select>
              {errors.property_type && <p className="error-text">{errors.property_type.message}</p>}
            </div>

            <div>
              <label className="label">Listing title</label>
              <input {...register("title")} className="input" placeholder="e.g. Cosy studio in the heart of Paris" />
              {errors.title && <p className="error-text">{errors.title.message}</p>}
            </div>

            <div>
              <label className="label">Description</label>
              <textarea {...register("description")} rows={6} className="input resize-none"
                placeholder="Describe your space, neighbourhood, and what makes it special…" />
              {errors.description && <p className="error-text">{errors.description.message}</p>}
              <p className="text-xs text-gray-400 mt-1">Minimum 100 characters</p>
            </div>

            <div>
              <label className="label">Address</label>
              <input {...register("address_line1")} className="input mb-2" placeholder="Street address" />
              {errors.address_line1 && <p className="error-text">{errors.address_line1.message}</p>}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <input {...register("city")} className="input" placeholder="City" />
                  {errors.city && <p className="error-text">{errors.city.message}</p>}
                </div>
                <div>
                  <input {...register("state")} className="input" placeholder="State / Province" />
                  {errors.state && <p className="error-text">{errors.state.message}</p>}
                </div>
                <div>
                  <input {...register("country")} className="input" placeholder="Country" />
                  {errors.country && <p className="error-text">{errors.country.message}</p>}
                </div>
                <div>
                  <input {...register("postal_code")} className="input" placeholder="Postal code" />
                  {errors.postal_code && <p className="error-text">{errors.postal_code.message}</p>}
                </div>
              </div>
            </div>

            {/* Exact location pin */}
            <div>
              <label className="label flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-brand-500" />
                Pin exact location
              </label>
              <p className="text-xs text-gray-400 mb-3">
                Search for your address or use your current location, then fine-tune the pin.
              </p>
              <LocationPicker
                latitude={pin?.lat ?? null}
                longitude={pin?.lng ?? null}
                onChange={(lat, lng) => setPin({ lat, lng })}
                addressHint={[watch("address_line1"), watch("city"), watch("country")]
                  .filter(Boolean).join(", ")}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Max guests", name: "max_guests", min: 1 },
                { label: "Bedrooms",   name: "bedrooms",   min: 0 },
                { label: "Beds",       name: "beds",       min: 1 },
                { label: "Bathrooms",  name: "bathrooms",  min: 0.5, step: 0.5 },
              ].map(({ label, name, min, step: s }) => (
                <div key={name}>
                  <label className="label">{label}</label>
                  <input {...register(name as keyof FormData)} type="number" min={min} step={s || 1} className="input" />
                  {errors[name as keyof FormData] && <p className="error-text">{(errors[name as keyof FormData] as any)?.message}</p>}
                </div>
              ))}
            </div>

            {/* Amenities */}
            {amenities.length > 0 && (
              <div>
                <label className="label">Amenities</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {amenities.map((a: any) => (
                    <button
                      key={a.id} type="button"
                      onClick={() => toggleAmenity(a.id)}
                      className={`text-sm py-2 px-3 rounded-xl border text-left transition-all ${
                        selectedAmenities.includes(a.id)
                          ? "border-brand-500 bg-brand-50 text-brand-700 font-medium"
                          : "border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      {a.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Step 2: Photos ───────────────────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-xl font-bold text-gray-900 mb-1">Add photos</h2>
              <p className="text-gray-500 text-sm">At least 1 required. First photo becomes the cover. Add up to 20.</p>
            </div>

            <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-10 cursor-pointer transition-all ${
              photos.length === 0 ? "border-brand-300 bg-brand-50 hover:bg-brand-100" : "border-gray-200 hover:border-gray-300"
            }`}>
              <Upload className={`w-8 h-8 mb-3 ${photos.length === 0 ? "text-brand-400" : "text-gray-300"}`} />
              <p className="text-sm font-medium text-gray-700">Click to upload photos</p>
              <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 10MB each</p>
              <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoAdd} />
            </label>

            {previews.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {previews.map((src, i) => (
                  <div key={i} className="relative aspect-square rounded-xl overflow-hidden group">
                    <img src={src} alt="" className="w-full h-full object-cover" />
                    {i === 0 && (
                      <div className="absolute top-2 left-2 bg-brand-600 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                        Cover
                      </div>
                    )}
                    <button
                      type="button" onClick={() => removePhoto(i)}
                      className="absolute top-2 right-2 w-7 h-7 bg-black/60 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <label className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-brand-300 hover:bg-brand-50 transition-all">
                  <Upload className="w-5 h-5 text-gray-300 mb-1" />
                  <span className="text-xs text-gray-400">Add more</span>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoAdd} />
                </label>
              </div>
            )}
          </div>
        )}

        {/* ── Step 3: Pricing ──────────────────────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-xl font-bold text-gray-900 mb-1">Set your price</h2>
              <p className="text-gray-500 text-sm">You can change this anytime. Guests see the total including fees.</p>
            </div>

            <div className="card p-6 space-y-5">
              <div>
                <label className="label">Nightly price (USD)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
                  <input {...register("price_per_night")} type="number" min={1} step="0.01" className="input pl-7" placeholder="0.00" />
                </div>
                {errors.price_per_night && <p className="error-text">{errors.price_per_night.message}</p>}
              </div>

              <div>
                <label className="label">Cleaning fee (USD)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
                  <input {...register("cleaning_fee")} type="number" min={0} step="0.01" className="input pl-7" placeholder="0.00" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Min. nights</label>
                  <input {...register("min_nights")} type="number" min={1} className="input" />
                </div>
                <div>
                  <label className="label">Max. nights</label>
                  <input {...register("max_nights")} type="number" min={1} className="input" />
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700">
              <strong>Platform service fee:</strong> A 12% service fee is added on top of your nightly rate and charged to the guest. You keep 100% of the nightly price + cleaning fee.
            </div>
          </div>
        )}

        {/* ── Step 4: Rules ────────────────────────────────────────────────── */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-xl font-bold text-gray-900 mb-1">House rules & check-in</h2>
              <p className="text-gray-500 text-sm">Set expectations so guests know what to expect.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Check-in time</label>
                <input {...register("check_in_time")} type="time" className="input" />
              </div>
              <div>
                <label className="label">Check-out time</label>
                <input {...register("check_out_time")} type="time" className="input" />
              </div>
            </div>

            <div>
              <label className="label">House rules</label>
              <textarea {...register("house_rules")} rows={4} className="input resize-none"
                placeholder="e.g. No shoes indoors, quiet hours after 10pm, please recycle…" />
            </div>

            <div className="space-y-3">
              <p className="label">Guest permissions</p>
              {[
                { name: "allows_pets",    label: "Pets allowed" },
                { name: "allows_smoking", label: "Smoking allowed" },
                { name: "allows_parties", label: "Parties / events allowed" },
              ].map(({ name, label }) => (
                <label key={name} className="flex items-center justify-between p-4 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50">
                  <span className="text-sm font-medium text-gray-700">{label}</span>
                  <input {...register(name as keyof FormData)} type="checkbox" className="w-4 h-4 accent-brand-600" />
                </label>
              ))}
            </div>
          </div>
        )}

        {/* ── Navigation ───────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
          {step > 1 ? (
            <button type="button" onClick={() => setStep((s) => s - 1)} className="btn-secondary flex items-center gap-2">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
          ) : <div />}

          {step < 4 ? (
            <button type="button" onClick={nextStep} className="btn-primary flex items-center gap-2">
              Next <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button type="submit" disabled={createMutation.isPending} className="btn-primary flex items-center gap-2">
              {createMutation.isPending ? "Creating…" : "Create listing"}
              <Check className="w-4 h-4" />
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
