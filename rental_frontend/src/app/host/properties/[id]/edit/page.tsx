"use client"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { propertiesApi } from "@/lib/api"
import { useParams, useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { useEffect, useState } from "react"
import { Upload, X, Trash2, Eye, EyeOff, Save, ChevronLeft } from "lucide-react"
import toast from "react-hot-toast"
import Link from "next/link"

export default function EditPropertyPage() {
  const { id }   = useParams<{ id: string }>()
  const router   = useRouter()
  const qc       = useQueryClient()
  const [newPhotos, setNewPhotos]     = useState<File[]>([])
  const [newPreviews, setNewPreviews] = useState<string[]>([])

  const { data: amenities = [] } = useQuery({
    queryKey: ["amenities"],
    queryFn:  () => propertiesApi.amenities().then((r) => r.data),
  })
  const [selectedAmenities, setSelectedAmenities] = useState<number[]>([])

  const { data: property, isLoading } = useQuery({
    queryKey: ["property-edit", id],
    queryFn:  () => propertiesApi.detail(Number(id)).then((r) => r.data),
  })

  const { register, handleSubmit, reset } = useForm()

  useEffect(() => {
    if (property) {
      reset({
        title: property.title, description: property.description,
        property_type: property.property_type,
        address_line1: property.address_line1, city: property.city,
        state: property.state, country: property.country, postal_code: property.postal_code,
        max_guests: property.max_guests, bedrooms: property.bedrooms,
        beds: property.beds, bathrooms: property.bathrooms,
        price_per_night: property.price_per_night, cleaning_fee: property.cleaning_fee,
        min_nights: property.min_nights, max_nights: property.max_nights,
        check_in_time: property.check_in_time, check_out_time: property.check_out_time,
        house_rules: property.house_rules,
        allows_pets: property.allows_pets, allows_smoking: property.allows_smoking,
        allows_parties: property.allows_parties,
      })
      setSelectedAmenities(property.amenities?.map((a: any) => a.id) || [])
    }
  }, [property, reset])

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      await propertiesApi.update(Number(id), { ...data, amenity_ids: selectedAmenities })
      for (const photo of newPhotos) {
        const fd = new FormData(); fd.append("image", photo)
        await propertiesApi.uploadPhoto(Number(id), fd)
      }
    },
    onSuccess: () => {
      toast.success("Listing updated!")
      qc.invalidateQueries({ queryKey: ["property-edit", id] })
      setNewPhotos([]); setNewPreviews([])
    },
    onError: () => toast.error("Failed to update listing"),
  })

  const deleteMutation = useMutation({
    mutationFn: (photoId: number) => propertiesApi.deletePhoto(photoId),
    onSuccess: () => { toast.success("Photo removed"); qc.invalidateQueries({ queryKey: ["property-edit", id] }) },
  })

  const publishMutation = useMutation({
    mutationFn: () => propertiesApi.publish(Number(id)),
    onSuccess: () => { toast.success("Listing published!"); qc.invalidateQueries({ queryKey: ["property-edit", id] }) },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Failed to publish"),
  })

  const unpublishMutation = useMutation({
    mutationFn: () => propertiesApi.unpublish(Number(id)),
    onSuccess: () => { toast.success("Listing paused"); qc.invalidateQueries({ queryKey: ["property-edit", id] }) },
  })

  const addPhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setNewPhotos((p) => [...p, ...files])
    setNewPreviews((p) => [...p, ...files.map((f) => URL.createObjectURL(f))])
  }

  if (isLoading) return <div className="max-w-3xl mx-auto px-4 py-10 animate-pulse"><div className="h-10 bg-gray-200 rounded mb-4 w-48" /></div>
  if (!property) return null

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/host/dashboard" className="btn-ghost p-2">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-display text-xl font-bold text-gray-900">Edit listing</h1>
            <p className="text-sm text-gray-500 truncate max-w-xs">{property.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`badge ${property.status === "active" ? "badge-active" : "badge-draft"}`}>
            {property.status}
          </span>
          {property.status === "active" ? (
            <button onClick={() => unpublishMutation.mutate()} disabled={unpublishMutation.isPending}
              className="btn-secondary flex items-center gap-1.5 text-sm py-2">
              <EyeOff className="w-3.5 h-3.5" />
              {unpublishMutation.isPending ? "Pausing…" : "Pause"}
            </button>
          ) : (
            <button onClick={() => publishMutation.mutate()} disabled={publishMutation.isPending}
              className="btn-primary flex items-center gap-1.5 text-sm py-2">
              <Eye className="w-3.5 h-3.5" />
              {publishMutation.isPending ? "Publishing…" : "Publish"}
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit((d) => updateMutation.mutate(d))} className="space-y-6">

        {/* Photos section */}
        <div className="card p-6">
          <h2 className="font-display font-semibold text-gray-900 mb-4">Photos</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-4">
            {property.photos?.map((photo: any) => (
              <div key={photo.id} className="relative aspect-square rounded-xl overflow-hidden group">
                <img src={photo.image} alt="" className="w-full h-full object-cover" />
                {photo.is_cover && (
                  <div className="absolute top-1 left-1 bg-brand-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                    Cover
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => deleteMutation.mutate(photo.id)}
                  className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
            {newPreviews.map((src, i) => (
              <div key={`new-${i}`} className="relative aspect-square rounded-xl overflow-hidden group ring-2 ring-brand-400">
                <img src={src} alt="" className="w-full h-full object-cover" />
                <div className="absolute top-1 left-1 bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full">New</div>
                <button type="button"
                  onClick={() => { setNewPhotos((p) => p.filter((_, idx) => idx !== i)); setNewPreviews((p) => p.filter((_, idx) => idx !== i)) }}
                  className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            <label className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-brand-300 hover:bg-brand-50 transition-all">
              <Upload className="w-5 h-5 text-gray-300 mb-1" />
              <span className="text-xs text-gray-400">Add</span>
              <input type="file" accept="image/*" multiple className="hidden" onChange={addPhotos} />
            </label>
          </div>
        </div>

        {/* Basic info */}
        <div className="card p-6 space-y-4">
          <h2 className="font-display font-semibold text-gray-900">Basic info</h2>
          <div>
            <label className="label">Title</label>
            <input {...register("title")} className="input" />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea {...register("description")} rows={6} className="input resize-none" />
          </div>
          <div>
            <label className="label">Property type</label>
            <select {...register("property_type")} className="input">
              {["apartment","house","villa","studio","cabin","hotel_room","hostel","other"].map((t) => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1).replace("_"," ")}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {["max_guests","bedrooms","beds","bathrooms"].map((f) => (
              <div key={f}>
                <label className="label capitalize">{f.replace("_"," ")}</label>
                <input {...register(f)} type="number" min={0} step={f === "bathrooms" ? 0.5 : 1} className="input" />
              </div>
            ))}
          </div>
        </div>

        {/* Amenities */}
        {amenities.length > 0 && (
          <div className="card p-6">
            <h2 className="font-display font-semibold text-gray-900 mb-4">Amenities</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {amenities.map((a: any) => (
                <button key={a.id} type="button"
                  onClick={() => setSelectedAmenities((prev) => prev.includes(a.id) ? prev.filter((x) => x !== a.id) : [...prev, a.id])}
                  className={`text-sm py-2 px-3 rounded-xl border text-left transition-all ${
                    selectedAmenities.includes(a.id)
                      ? "border-brand-500 bg-brand-50 text-brand-700 font-medium"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}>{a.name}</button>
              ))}
            </div>
          </div>
        )}

        {/* Pricing */}
        <div className="card p-6 space-y-4">
          <h2 className="font-display font-semibold text-gray-900">Pricing</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Nightly price ($)</label>
              <input {...register("price_per_night")} type="number" step="0.01" min={1} className="input" />
            </div>
            <div>
              <label className="label">Cleaning fee ($)</label>
              <input {...register("cleaning_fee")} type="number" step="0.01" min={0} className="input" />
            </div>
            <div>
              <label className="label">Min nights</label>
              <input {...register("min_nights")} type="number" min={1} className="input" />
            </div>
            <div>
              <label className="label">Max nights</label>
              <input {...register("max_nights")} type="number" min={1} className="input" />
            </div>
          </div>
        </div>

        {/* Rules */}
        <div className="card p-6 space-y-4">
          <h2 className="font-display font-semibold text-gray-900">Rules & check-in</h2>
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
            <textarea {...register("house_rules")} rows={3} className="input resize-none" />
          </div>
          <div className="space-y-2">
            {[
              { name: "allows_pets",    label: "Pets allowed" },
              { name: "allows_smoking", label: "Smoking allowed" },
              { name: "allows_parties", label: "Parties allowed" },
            ].map(({ name, label }) => (
              <label key={name} className="flex items-center justify-between p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50">
                <span className="text-sm font-medium text-gray-700">{label}</span>
                <input {...register(name)} type="checkbox" className="w-4 h-4 accent-brand-600" />
              </label>
            ))}
          </div>
        </div>

        <button type="submit" disabled={updateMutation.isPending} className="btn-primary w-full flex items-center justify-center gap-2">
          <Save className="w-4 h-4" />
          {updateMutation.isPending ? "Saving…" : "Save all changes"}
        </button>
      </form>
    </div>
  )
}
