"use client"
import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { useAuthStore } from "@/store/auth"
import { useRouter } from "next/navigation"
import { MessageCircle, Loader2 } from "lucide-react"
import toast from "react-hot-toast"

interface Props {
  propertyId:   number
  hostName:     string
  className?:   string
}

export function ChatButton({ propertyId, hostName, className = "" }: Props) {
  const { isAuthenticated } = useAuthStore()
  const router = useRouter()

  const mutation = useMutation({
    mutationFn: () => api.post("/chat/start/", { property_id: propertyId }),
    onSuccess: (res) => {
      router.push(`/chat?conversation=${res.data.conversation_id}`)
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Could not start chat"),
  })

  const handleClick = () => {
    if (!isAuthenticated()) {
      toast.error("Please log in to message the host")
      router.push("/login")
      return
    }
    mutation.mutate()
  }

  return (
    <button
      onClick={handleClick}
      disabled={mutation.isPending}
      className={`btn-secondary flex items-center justify-center gap-2 ${className}`}
    >
      {mutation.isPending
        ? <Loader2 className="w-4 h-4 animate-spin" />
        : <MessageCircle className="w-4 h-4" />
      }
      {mutation.isPending ? "Opening chat…" : `Message ${hostName}`}
    </button>
  )
}
