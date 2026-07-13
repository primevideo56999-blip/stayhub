"use client"
import { Suspense } from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuthStore } from "@/store/auth"
import { AuthGuard } from "@/components/auth/AuthGuard"
import { ChatWindow } from "@/components/chat/ChatWindow"
import { api } from "@/lib/api"
import { MessageCircle, Search, Loader2 } from "lucide-react"

interface Conversation {
  id:           number
  property:     { id: number; title: string; city: string; cover_photo?: string }
  guest:        { id: number; full_name: string; avatar: string | null }
  host:         { id: number; full_name: string; avatar: string | null }
  other_user:   { id: number; full_name: string; avatar: string | null }
  last_message: { body: string; created_at: string; sender_id: number } | null
  unread_count: number
  updated_at:   string
}

function ChatInner() {
  const { user } = useAuthStore()
  const searchParams    = useSearchParams()
  const [activeConvId, setActiveConvId]     = useState<number | null>(null)
  const [conversations, setConversations]   = useState<Conversation[]>([])
  const [search, setSearch]                 = useState("")
  const [loading, setLoading]               = useState(true)
  const intervalRef = useRef<NodeJS.Timeout>()

  // Auto-open conversation from URL param
  useEffect(() => {
    const convId = searchParams.get("conversation")
    if (convId) setActiveConvId(Number(convId))
  }, [searchParams])

  // Fetch conversations manually — no refetchInterval to avoid re-renders
  const fetchConversations = useCallback(async () => {
    try {
      const res  = await api.get("/chat/conversations/")
      const data = Array.isArray(res.data) ? res.data : (res.data?.results ?? [])
      setConversations(data)
      setLoading(false)
    } catch {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchConversations()
    intervalRef.current = setInterval(fetchConversations, 10000)
    return () => clearInterval(intervalRef.current)
  }, [fetchConversations])

  const activeConv = conversations.find((c) => c.id === activeConvId)
  const otherUser  = activeConv?.other_user || null

  const filtered = conversations.filter((c) => {
    const name = c.other_user?.full_name?.toLowerCase() || ""
    const prop = c.property?.title?.toLowerCase() || ""
    const q    = search.toLowerCase()
    return name.includes(q) || prop.includes(q)
  })

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <h1 className="font-display text-2xl font-bold text-gray-900 mb-6">Messages</h1>

      <div className="flex gap-4 h-[calc(100vh-12rem)]">

        {/* ── Sidebar ───────────────────────────────────────────────── */}
        <div className="w-80 flex-shrink-0 flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9 text-sm"
              placeholder="Search conversations…"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-1">
            {loading ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="card p-4 h-20 animate-pulse bg-gray-100" />
              ))
            ) : filtered.length === 0 ? (
              <div className="card p-8 text-center text-gray-400">
                <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No conversations yet</p>
                <p className="text-xs mt-1 text-gray-300">
                  Start a chat from any property page
                </p>
              </div>
            ) : (
              filtered.map((conv) => {
                const other    = conv.other_user
                const isActive = conv.id === activeConvId
                const timeStr  = conv.last_message
                  ? new Date(conv.last_message.created_at).toLocaleTimeString("en-IN", {
                      hour: "2-digit", minute: "2-digit",
                    })
                  : ""

                return (
                  <button
                    key={conv.id}
                    onClick={() => setActiveConvId(conv.id)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                      isActive
                        ? "border-brand-300 bg-brand-50"
                        : "border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-brand-100 overflow-hidden flex-shrink-0">
                        {other?.avatar ? (
                          <img src={other.avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-bold text-brand-600 text-sm">
                            {other?.full_name?.charAt(0) || "?"}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className={`text-sm font-semibold truncate ${
                            isActive ? "text-brand-700" : "text-gray-900"
                          }`}>
                            {other?.full_name || "Unknown"}
                          </p>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {conv.unread_count > 0 && (
                              <span className="w-5 h-5 rounded-full bg-brand-600 text-white text-xs flex items-center justify-center font-bold">
                                {conv.unread_count > 9 ? "9+" : conv.unread_count}
                              </span>
                            )}
                            <span className="text-xs text-gray-400">{timeStr}</span>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          {conv.property?.title}
                        </p>
                        {conv.last_message && (
                          <p className={`text-xs truncate mt-0.5 ${
                            conv.unread_count > 0 ? "font-medium text-gray-700" : "text-gray-400"
                          }`}>
                            {conv.last_message.sender_id === user?.id ? "You: " : ""}
                            {conv.last_message.body}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* ── Chat window ───────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          {activeConvId && otherUser ? (
            <ChatWindow
              conversationId={activeConvId}
              otherUserName={otherUser.full_name}
              otherUserAvatar={otherUser.avatar}
            />
          ) : (
            <div className="h-full card flex flex-col items-center justify-center text-center p-10">
              <MessageCircle className="w-14 h-14 text-gray-200 mb-4" />
              <p className="font-display font-semibold text-gray-600 text-lg">
                Select a conversation
              </p>
              <p className="text-gray-400 text-sm mt-1">
                Choose a conversation from the left to start messaging
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ChatPage() {
  return (
    <AuthGuard>
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <Loader2 className="w-8 h-8 text-gray-300 animate-spin" />
        </div>
      }>
        <ChatInner />
      </Suspense>
    </AuthGuard>
  )
}
