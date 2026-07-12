"use client"
import { useState, useEffect, useRef } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { useAuthStore } from "@/store/auth"
import { Send, Loader2, Lock, RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"

interface Message {
  id:            number
  body:          string
  sender:        { id: number; full_name: string; avatar: string | null }
  is_read:       boolean
  created_at:    string
}

interface Props {
  conversationId: number
  otherUserName:  string
  otherUserAvatar?: string | null
}

const INR_TIME = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })

export function ChatWindow({ conversationId, otherUserName, otherUserAvatar }: Props) {
  const { user, isAuthenticated } = useAuthStore()
  const router    = useRouter()
  const qc        = useQueryClient()
  const [input, setInput] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)

  // ── Fetch messages — poll every 3 seconds ────────────────────────────────
  const { data: rawMessages, isLoading } = useQuery({
    queryKey:      ["messages", conversationId],
    queryFn:       () => api.get(`/chat/conversations/${conversationId}/messages/`).then((r) => r.data),
    enabled:       !!conversationId && isAuthenticated(),
    refetchInterval: 3000,   // poll every 3s — works on Render free tier
    refetchIntervalInBackground: true,
  })

  const messages: Message[] = Array.isArray(rawMessages)
    ? rawMessages
    : (rawMessages?.results ?? [])

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length])

  // ── Send message ─────────────────────────────────────────────────────────
  const sendMutation = useMutation({
    mutationFn: (body: string) =>
      api.post(`/chat/conversations/${conversationId}/send/`, { body }),
    onSuccess: () => {
      setInput("")
      qc.invalidateQueries({ queryKey: ["messages", conversationId] })
      qc.invalidateQueries({ queryKey: ["conversations"] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Failed to send message"),
  })

  const handleSend = () => {
    const body = input.trim()
    if (!body) return
    sendMutation.mutate(body)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (!isAuthenticated()) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Lock className="w-10 h-10 text-gray-300" />
        <p className="text-gray-500 text-sm">Please log in to chat</p>
        <button onClick={() => router.push("/login")} className="btn-primary text-sm">Log in</button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-gray-100 overflow-hidden">

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white">
        <div className="w-9 h-9 rounded-full bg-brand-100 overflow-hidden flex-shrink-0">
          {otherUserAvatar ? (
            <img src={otherUserAvatar} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center font-bold text-brand-600 text-sm">
              {otherUserName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex-1">
          <p className="font-semibold text-gray-900 text-sm">{otherUserName}</p>
          <div className="flex items-center gap-1.5">
            <RefreshCw className="w-3 h-3 text-green-400 animate-spin" style={{ animationDuration: "3s" }} />
            <p className="text-xs text-gray-400">Auto-refreshing every 3s</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-gray-400 text-sm">No messages yet</p>
            <p className="text-gray-300 text-xs mt-1">Say hello to get started!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender.id === user?.id
            return (
              <div key={msg.id} className={`flex gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                {!isMe && (
                  <div className="w-7 h-7 rounded-full bg-brand-100 flex-shrink-0 overflow-hidden mt-1">
                    {msg.sender.avatar ? (
                      <img src={msg.sender.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs font-bold text-brand-600">
                        {msg.sender.full_name.charAt(0)}
                      </div>
                    )}
                  </div>
                )}
                <div className={`max-w-[70%] flex flex-col gap-1 ${isMe ? "items-end" : "items-start"}`}>
                  <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    isMe
                      ? "bg-brand-600 text-white rounded-tr-sm"
                      : "bg-white text-gray-800 shadow-sm rounded-tl-sm border border-gray-100"
                  }`}>
                    {msg.body}
                  </div>
                  <p className="text-xs text-gray-400 px-1">
                    {INR_TIME(msg.created_at)}
                    {isMe && <span className="ml-1">{msg.is_read ? " ✓✓" : " ✓"}</span>}
                  </p>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-gray-100 bg-white">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message… (Enter to send)"
            rows={1}
            className="flex-1 input resize-none py-2.5 text-sm"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sendMutation.isPending}
            className="btn-primary p-2.5 rounded-xl flex-shrink-0 disabled:opacity-50"
          >
            {sendMutation.isPending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Send className="w-4 h-4" />
            }
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1.5 text-center">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}
