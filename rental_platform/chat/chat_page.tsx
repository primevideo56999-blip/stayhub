"use client"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { useAuthStore } from "@/store/auth"
import { ChatWindow } from "@/components/chat/ChatWindow"
import { useState } from "react"
import { MessageCircle, Home, Search } from "lucide-react"
import { useRouter } from "next/navigation"

interface Conversation {
  id:           number
  property:     { id: number; title: string; city: string; cover_photo?: string }
  guest:        { id: number; full_name: string; avatar: string | null }
  host:         { id: number; full_name: string; avatar: string | null }
  last_message: { body: string; created_at: string; sender_id: number } | null
  unread_count: number
  updated_at:   string
}

export default function ChatPage() {
  const { user, isAuthenticated } = useAuthStore()
  const router = useRouter()
  const [activeConvId, setActiveConvId] = useState<number | null>(null)
  const [search, setSearch] = useState("")

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ["conversations"],
    queryFn:  () => api.get("/chat/conversations/").then((r) => r.data),
    enabled:  isAuthenticated(),
    refetchInterval: 10000, // poll every 10s for new convos
  })

  if (!isAuthenticated()) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <MessageCircle className="w-12 h-12 text-gray-200 mx-auto mb-4" />
        <h2 className="font-display text-xl font-bold text-gray-900 mb-2">Log in to chat</h2>
        <p className="text-gray-500 text-sm mb-6">You need to be logged in to send and receive messages.</p>
        <button onClick={() => router.push("/login")} className="btn-primary">Log in</button>
      </div>
    )
  }

  const activeConv = conversations.find((c: Conversation) => c.id === activeConvId)
  const otherUser  = activeConv
    ? (user?.id === activeConv.guest.id ? activeConv.host : activeConv.guest)
    : null

  const filtered = conversations.filter((c: Conversation) => {
    const other = user?.id === c.guest.id ? c.host : c.guest
    return (
      other.full_name.toLowerCase().includes(search.toLowerCase()) ||
      c.property.title.toLowerCase().includes(search.toLowerCase())
    )
  })

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold text-gray-900">Messages</h1>
      </div>

      <div className="flex gap-4 h-[calc(100vh-12rem)]">

        {/* ── Sidebar: conversation list ─────────────────────────────── */}
        <div className="w-80 flex-shrink-0 flex flex-col gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9 text-sm"
              placeholder="Search conversations…"
            />
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto space-y-1">
            {isLoading ? (
              [...Array(4)].map((_, i) => (
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
              filtered.map((conv: Conversation) => {
                const other   = user?.id === conv.guest.id ? conv.host : conv.guest
                const isActive = conv.id === activeConvId
                const timeAgo  = conv.last_message
                  ? new Date(conv.last_message.created_at).toLocaleTimeString("en-IN", {
                      hour: "2-digit", minute: "2-digit"
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
                        {other.avatar ? (
                          <img src={other.avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-bold text-brand-600 text-sm">
                            {other.full_name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className={`text-sm font-semibold truncate ${isActive ? "text-brand-700" : "text-gray-900"}`}>
                            {other.full_name}
                          </p>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {conv.unread_count > 0 && (
                              <span className="w-5 h-5 rounded-full bg-brand-600 text-white text-xs flex items-center justify-center font-bold">
                                {conv.unread_count > 9 ? "9+" : conv.unread_count}
                              </span>
                            )}
                            <span className="text-xs text-gray-400">{timeAgo}</span>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 truncate mt-0.5">{conv.property.title}</p>
                        {conv.last_message && (
                          <p className={`text-xs truncate mt-0.5 ${conv.unread_count > 0 ? "font-medium text-gray-700" : "text-gray-400"}`}>
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

        {/* ── Main: chat window ──────────────────────────────────────── */}
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
