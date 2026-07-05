"use client"
import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { Heart } from "lucide-react"
import toast from "react-hot-toast"
import { useAuthStore } from "@/store/auth"
import { useRouter } from "next/navigation"

interface Props {
  propertyId: number
  initialSaved?: boolean
  className?: string
}

export function WishlistButton({ propertyId, initialSaved = false, className = "" }: Props) {
  const [saved, setSaved] = useState(initialSaved)
  const { isAuthenticated } = useAuthStore()
  const router = useRouter()
  const qc = useQueryClient()

  const mutation = useMutation({
    mutationFn: () => api.post("/wishlist/toggle/", { property_id: propertyId }),
    onMutate: () => setSaved((s) => !s), // optimistic
    onSuccess: (res) => {
      setSaved(res.data.saved)
      qc.invalidateQueries({ queryKey: ["wishlist"] })
      toast.success(res.data.saved ? "Saved to wishlist" : "Removed from wishlist")
    },
    onError: () => {
      setSaved((s) => !s) // revert
      toast.error("Failed to update wishlist")
    },
  })

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isAuthenticated()) {
      toast.error("Log in to save properties")
      router.push("/login")
      return
    }
    mutation.mutate()
  }

  return (
    <button
      onClick={handleClick}
      className={`group flex items-center justify-center w-9 h-9 rounded-full bg-white/90 backdrop-blur shadow-sm hover:scale-110 transition-transform ${className}`}
      aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
    >
      <Heart className={`w-5 h-5 transition-colors ${
        saved ? "fill-red-500 text-red-500" : "text-gray-400 group-hover:text-red-400"
      }`} />
    </button>
  )
}
