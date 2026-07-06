"use client"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useMutation } from "@tanstack/react-query"
import { authApi } from "@/lib/api"
import { useAuthStore } from "@/store/auth"
import toast from "react-hot-toast"
import { Camera, Save, Lock } from "lucide-react"

const profileSchema = z.object({
  first_name: z.string().min(1, "Required"),
  last_name:  z.string().min(1, "Required"),
  phone:      z.string().optional(),
  bio:        z.string().optional(),
})
const passwordSchema = z.object({
  old_password: z.string().min(1, "Required"),
  new_password: z.string().min(8, "At least 8 characters"),
})

type ProfileForm   = z.infer<typeof profileSchema>
type PasswordForm  = z.infer<typeof passwordSchema>

export default function ProfilePage() {
  const { user, fetchMe } = useAuthStore()
  const [avatar, setAvatar]   = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(user?.avatar || null)

  const { register: rp, handleSubmit: hp, formState: { errors: ep } } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: user?.first_name || "",
      last_name:  user?.last_name  || "",
      phone:      user?.phone      || "",
      bio:        user?.bio        || "",
    },
  })
  const { register: rw, handleSubmit: hw, reset: resetPw, formState: { errors: ew } } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  })

  const profileMutation = useMutation({
    mutationFn: async (data: ProfileForm) => {
      const fd = new FormData()
      Object.entries(data).forEach(([k, v]) => v && fd.append(k, v))
      if (avatar) fd.append("avatar_upload", avatar)
      return authApi.updateMeForm(fd)
    },
    onSuccess: async () => { await fetchMe(); toast.success("Profile updated!") },
    onError:   () => toast.error("Failed to update profile"),
  })

  const passwordMutation = useMutation({
    mutationFn: (data: PasswordForm) => authApi.changePassword(data),
    onSuccess: () => { toast.success("Password changed!"); resetPw() },
    onError:   (e: any) => toast.error(e?.response?.data?.old_password?.[0] || "Failed to change password"),
  })

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatar(file)
    setPreview(URL.createObjectURL(file))
  }

  if (!user) return null

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-900">Your profile</h1>
        <p className="text-gray-500 text-sm mt-0.5">Manage your account details</p>
      </div>

      {/* Profile form */}
      <div className="card p-6">
        <h2 className="font-display font-semibold text-gray-900 mb-5 flex items-center gap-2">
          <Camera className="w-4 h-4 text-brand-500" /> Personal information
        </h2>

        {/* Avatar */}
        <div className="flex items-center gap-5 mb-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100 border-4 border-white shadow">
              {preview
                ? <img src={preview} alt="Avatar" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-brand-300">
                    {user.first_name?.charAt(0)}
                  </div>
              }
            </div>
            <label className="absolute -bottom-1 -right-1 w-7 h-7 bg-brand-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-brand-700 transition shadow">
              <Camera className="w-3.5 h-3.5 text-white" />
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </label>
          </div>
          <div>
            <p className="font-medium text-gray-900">{user.full_name}</p>
            <p className="text-sm text-gray-500">{user.email}</p>
            <span className="badge badge-active capitalize mt-1">{user.role}</span>
          </div>
        </div>

        <form onSubmit={hp((data) => profileMutation.mutate(data))} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">First name</label>
              <input {...rp("first_name")} className="input" />
              {ep.first_name && <p className="error-text">{ep.first_name.message}</p>}
            </div>
            <div>
              <label className="label">Last name</label>
              <input {...rp("last_name")} className="input" />
              {ep.last_name && <p className="error-text">{ep.last_name.message}</p>}
            </div>
          </div>

          <div>
            <label className="label">Phone number</label>
            <input {...rp("phone")} className="input" placeholder="+1 555 000 0000" />
          </div>

          <div>
            <label className="label">Bio</label>
            <textarea {...rp("bio")} rows={4} className="input resize-none"
              placeholder="Tell hosts and guests a bit about yourself…" />
          </div>

          <button type="submit" disabled={profileMutation.isPending} className="btn-primary flex items-center gap-2">
            <Save className="w-4 h-4" />
            {profileMutation.isPending ? "Saving…" : "Save changes"}
          </button>
        </form>
      </div>

      {/* Password form */}
      <div className="card p-6">
        <h2 className="font-display font-semibold text-gray-900 mb-5 flex items-center gap-2">
          <Lock className="w-4 h-4 text-brand-500" /> Change password
        </h2>
        <form onSubmit={hw((data) => passwordMutation.mutate(data))} className="space-y-4">
          <div>
            <label className="label">Current password</label>
            <input {...rw("old_password")} type="password" className="input" placeholder="••••••••" />
            {ew.old_password && <p className="error-text">{ew.old_password.message}</p>}
          </div>
          <div>
            <label className="label">New password</label>
            <input {...rw("new_password")} type="password" className="input" placeholder="Min. 8 characters" />
            {ew.new_password && <p className="error-text">{ew.new_password.message}</p>}
          </div>
          <button type="submit" disabled={passwordMutation.isPending} className="btn-primary flex items-center gap-2">
            <Lock className="w-4 h-4" />
            {passwordMutation.isPending ? "Updating…" : "Update password"}
          </button>
        </form>
      </div>
    </div>
  )
}
