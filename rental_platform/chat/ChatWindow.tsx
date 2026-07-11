"use client"
import { useState, useEffect, useRef, useCallback } from "react"
import { useAuthStore } from "@/store/auth"
import { Send, Loader2, Lock } from "lucide-react"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"

interface Message {
  id:            number
  body:          string
  sender_id:     number
  sender_name:   string
  sender_avatar: string | null
  is_read:       boolean
  created_at:    string
}

interface Props {
  conversationId: number
  otherUserName:  string
  otherUserAvatar?: string | null
}

export function ChatWindow({ conversationId, otherUserName, otherUserAvatar }: Props) {
  const { user, isAuthenticated, accessToken } = useAuthStore()
  const router   = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [input,    setInput]    = useState("")
  const [connected, setConnected] = useState(false)
  const [loading,   setLoading]   = useState(true)
  const wsRef      = useRef<WebSocket | null>(null)
  const bottomRef  = useRef<HTMLDivElement>(null)

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const connectWS = useCallback(() => {
    if (!isAuthenticated() || !accessToken) return

    const WS_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1")
      .replace("http://", "ws://")
      .replace("https://", "wss://")
      .replace("/api/v1", "")

    const ws = new WebSocket(
      `${WS_BASE}/ws/chat/${conversationId}/?token=${accessToken}`
    )

    ws.onopen = () => {
      setConnected(true)
      setLoading(false)
    }

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.type === "history") {
        setMessages(data.messages)
        setLoading(false)
      } else if (data.type === "message") {
        setMessages((prev) => [...prev, data.message])
        // Mark as read if we're looking at the window
        ws.send(JSON.stringify({ type: "read" }))
      }
    }

    ws.onclose = (e) => {
      setConnected(false)
      if (e.code === 4001) {
        toast.error("Please log in to chat")
        router.push("/login")
      } else if (e.code !== 1000) {
        // Auto-reconnect after 3 seconds
        setTimeout(connectWS, 3000)
      }
    }

    ws.onerror = () => setConnected(false)
    wsRef.current = ws
  }, [conversationId, accessToken, isAuthenticated, router])

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push(`/login?redirect=/chat/${conversationId}`)
      return
    }
    connectWS()
    return () => {
      wsRef.current?.close(1000)
    }
  }, [conversationId, connectWS, isAuthenticated, router])

  const sendMessage = () => {
    const body = input.trim()
    if (!body || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
    wsRef.current.send(JSON.stringify({ type: "message", body }))
    setInput("")
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (!isAuthenticated()) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Lock className="w-10 h-10 text-gray-300" />
        <p className="text-gray-500 text-sm">Please log in to chat</p>
        <button onClick={() => router.push("/login")} className="btn-primary text-sm">
          Log in
        </button>
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
            <div className={`w-2 h-2 rounded-full ${connected ? "bg-green-400" : "bg-gray-300"}`} />
            <p className="text-xs text-gray-400">{connected ? "Online" : "Connecting…"}</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-gray-400 text-sm">No messages yet</p>
            <p className="text-gray-300 text-xs mt-1">Say hello to get the conversation started!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === user?.id
            return (
              <div key={msg.id} className={`flex gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                {!isMe && (
                  <div className="w-7 h-7 rounded-full bg-brand-100 flex-shrink-0 overflow-hidden mt-1">
                    {msg.sender_avatar ? (
                      <img src={msg.sender_avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs font-bold text-brand-600">
                        {msg.sender_name.charAt(0)}
                      </div>
                    )}
                  </div>
                )}
                <div className={`max-w-[70%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-1`}>
                  <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    isMe
                      ? "bg-brand-600 text-white rounded-tr-sm"
                      : "bg-white text-gray-800 shadow-sm rounded-tl-sm border border-gray-100"
                  }`}>
                    {msg.body}
                  </div>
                  <p className="text-xs text-gray-400 px-1">
                    {new Date(msg.created_at).toLocaleTimeString("en-IN", {
                      hour: "2-digit", minute: "2-digit"
                    })}
                    {isMe && (
                      <span className="ml-1">{msg.is_read ? " ✓✓" : " ✓"}</span>
                    )}
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
            className="flex-1 input resize-none py-2.5 text-sm max-h-32"
            style={{ overflowY: input.split("\n").length > 3 ? "auto" : "hidden" }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || !connected}
            className="btn-primary p-2.5 rounded-xl flex-shrink-0 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1.5 text-center">
          Press Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}
