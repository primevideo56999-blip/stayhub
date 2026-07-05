"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { authApi } from "@/lib/api"
import { useAuthStore } from "@/store/auth"
import toast from "react-hot-toast"
import { Upload, CheckCircle, User } from "lucide-react"

const schema = z.object({
  bio:           z.string().min(50, "Write at least 50 characters about yourself"),
  first_name:    z.string().min(1, "Required"),
  last_name:     z.string().min(1, "Required"),
})
type FormData = z.infer<typeof schema>

export default function HostProfileSetupPage() {
  const { user, fetchMe } = useAuthStore()
  const router = useRouter()
  const [avatar, setAvatar]   = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(user?.avatar || null)
  const [loading, setLoading] = useState(false)
  const [step, setStep]       = useState<1 | 2>(1)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      first_name: user?.first_name || "",
      last_name:  user?.last_name  || "",
      bio:        user?.bio        || "",
    },
  })

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatar(file)
    setPreview(URL.createObjectURL(file))
  }

  const onSubmit = async (data: FormData) => {
    if (!avatar && !user?.avatar) {
      toast.error("Please upload a profile photo before continuing.")
      return
    }
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append("first_name", data.first_name)
      formData.append("last_name",  data.last_name)
      formData.append("bio",        data.bio)
      if (avatar) formData.append("avatar", avatar)
      await authApi.updateMeForm(formData)
      await fetchMe()
      toast.success("Profile complete! Now let's list your first property.")
      router.push("/host/dashboard")
    } catch (err: any) {
      toast.error("Failed to update profile. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 bg-sand-50">
      <div className="card w-full max-w-lg p-8">

        {/* Progress */}
        <div className="flex items-center gap-3 mb-8">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-3 flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                s < step ? "bg-green-500 text-white" :
                s === step ? "bg-brand-600 text-white" :
                "bg-gray-200 text-gray-400"
              }`}>
                {s < step ? <CheckCircle className="w-4 h-4" /> : s}
              </div>
              {s < 2 && <div className={`flex-1 h-1 rounded ${s < step ? "bg-green-400" : "bg-gray-200"}`} />}
            </div>
          ))}
        </div>

        <h1 className="font-display text-2xl font-bold text-gray-900 mb-1">Set up your host profile</h1>
        <p className="text-gray-500 text-sm mb-8">
          Guests see your profile when deciding to book. A complete profile with a photo and bio builds trust.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

          {/* Avatar upload */}
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gray-100 overflow-hidden border-4 border-white shadow-card flex items-center justify-center">
                {preview ? (
                  <img src={preview} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-10 h-10 text-gray-300" />
                )}
              </div>
              <label className="absolute -bottom-1 -right-1 w-8 h-8 bg-brand-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-brand-700 transition shadow">
                <Upload className="w-4 h-4 text-white" />
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </label>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700">Profile photo</p>
              <p className="text-xs text-gray-400">Required — hosts without a photo get 60% fewer bookings</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">First name</label>
              <input {...register("first_name")} className="input" />
              {errors.first_name && <p className="error-text">{errors.first_name.message}</p>}
            </div>
            <div>
              <label className="label">Last name</label>
              <input {...register("last_name")} className="input" />
              {errors.last_name && <p className="error-text">{errors.last_name.message}</p>}
            </div>
          </div>

          <div>
            <label className="label">About you</label>
            <textarea
              {...register("bio")}
              rows={5}
              className="input resize-none"
              placeholder="Tell guests a bit about yourself — your interests, why you host, what makes your place special…"
            />
            {errors.bio && <p className="error-text">{errors.bio.message}</p>}
            <p className="text-xs text-gray-400 mt-1">Minimum 50 characters</p>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Saving…" : "Save profile & go to dashboard →"}
          </button>
        </form>
      </div>
    </div>
  )
}
