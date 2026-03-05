"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Send, Search, Menu, ArrowLeft, MoreVertical,
  CheckCheck, Check, Lock, AlertCircle, Phone,
  ImageIcon, Paperclip, Smile, X, Circle,
  MessageCircle, ShieldCheck, Clock
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { db, auth } from "@/lib/firebase";
import {
  collection, query, where, onSnapshot, addDoc,
  serverTimestamp, orderBy, doc, updateDoc, getDocs
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import ClientSidebar from "@/components/sidebar/ClientSidebar";

// ─── Types ─────────────────────────────────────────────────────────────────────
interface Participant {
  uid: string;
  name: string;
  role: string;
  verified?: boolean;
}

interface Chat {
  id: string;
  participants: string[];
  participantDetails?: Record<string, { name: string; role: string }>;
  lastMessage?: string;
  lastMessageAt?: { seconds: number };
  unread?: number;
  bookingId?: string;
  bookingService?: string;
  paymentConfirmed?: boolean;
}

interface Message {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  createdAt?: { seconds: number };
  read?: boolean;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function formatTime(seconds?: number) {
  if (!seconds) return "";
  const d = new Date(seconds * 1000);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

const avatarColors = [
  "bg-blue-500", "bg-emerald-500", "bg-violet-500",
  "bg-orange-500", "bg-rose-500", "bg-cyan-500",
];

function getAvatarColor(name: string) {
  const idx = name.charCodeAt(0) % avatarColors.length;
  return avatarColors[idx];
}

// ─── Main Page ──────────────────────────────────────────────────────────────────
function MessagesPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [currentUser, setCurrentUser] = useState<{ uid: string; name: string } | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showChatList, setShowChatList] = useState(true);
  const [loading, setLoading] = useState(true);

  // Auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) { router.push("/login"); return; }
      setCurrentUser({ uid: user.uid, name: user.displayName || "Client" });
    });
    return () => unsub();
  }, [router]);

  // Load chats
  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, "chats"),
      where("participants", "array-contains", currentUser.uid)
    );
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Chat));
      data.sort((a, b) => (b.lastMessageAt?.seconds || 0) - (a.lastMessageAt?.seconds || 0));
      setChats(data);
      setLoading(false);

      // Auto-select from query param
      const workerParam = searchParams.get("worker");
      if (workerParam && !selectedChat) {
        const found = data.find(c => c.participants.includes(workerParam));
        if (found) { setSelectedChat(found); setShowChatList(false); }
      }
    });
    return () => unsub();
  }, [currentUser, searchParams]);

  // Load messages for selected chat
  useEffect(() => {
    if (!selectedChat) return;
    const q = query(
      collection(db, "messages"),
      where("chatId", "==", selectedChat.id),
      orderBy("createdAt", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() } as Message)));
    });
    return () => unsub();
  }, [selectedChat?.id]);

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const getOtherParticipantName = (chat: Chat) => {
    if (!currentUser) return "Worker";
    const other = chat.participants.find(p => p !== currentUser.uid);
    return chat.participantDetails?.[other || ""]?.name || "Worker";
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !selectedChat || !currentUser || sending) return;
    const text = inputText.trim();
    setInputText("");
    setSending(true);
    try {
      await addDoc(collection(db, "messages"), {
        chatId: selectedChat.id,
        senderId: currentUser.uid,
        text,
        createdAt: serverTimestamp(),
        read: false,
      });
      await updateDoc(doc(db, "chats", selectedChat.id), {
        lastMessage: text,
        lastMessageAt: serverTimestamp(),
      });
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  const filteredChats = chats.filter(c =>
    !search || getOtherParticipantName(c).toLowerCase().includes(search.toLowerCase()) ||
    c.lastMessage?.toLowerCase().includes(search.toLowerCase())
  );

  const otherName = selectedChat ? getOtherParticipantName(selectedChat) : "";
  const otherDetails = selectedChat
    ? selectedChat.participantDetails?.[selectedChat.participants.find(p => p !== currentUser?.uid) || ""]
    : null;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <ClientSidebar />

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full [&>aside]:flex"><ClientSidebar /></div>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile nav bar */}
        <header className="lg:hidden bg-white border-b border-gray-100 px-4 h-14 flex items-center justify-between shrink-0 shadow-sm">
          {!showChatList && selectedChat ? (
            <button onClick={() => setShowChatList(true)} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100">
              <ArrowLeft className="w-5 h-5 text-[#0c4a6e]" />
            </button>
          ) : (
            <button onClick={() => setMobileOpen(true)} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100">
              <Menu className="w-5 h-5 text-[#0c4a6e]" />
            </button>
          )}
          <span className="text-base font-bold text-[#0c4a6e]">
            {!showChatList && selectedChat ? otherName : "Messages"}
          </span>
          <div className="w-9" />
        </header>

        {/* Main messaging area */}
        <div className="flex-1 flex overflow-hidden">

          {/* ── Chat List Panel ── */}
          <div className={`${showChatList ? "flex" : "hidden"} lg:flex flex-col w-full lg:w-80 xl:w-96 bg-white border-r border-gray-100 shrink-0`}>
            {/* List header */}
            <div className="p-4 border-b border-gray-50">
              <h2 className="text-base font-bold text-[#0c4a6e] mb-3 hidden lg:block">Messages</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search conversations…"
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0284c7] transition"
                />
              </div>
            </div>

            {/* Chat list */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="space-y-0">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3.5 animate-pulse">
                      <div className="w-11 h-11 bg-gray-100 rounded-full shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-gray-100 rounded w-1/2" />
                        <div className="h-2.5 bg-gray-100 rounded w-3/4" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredChats.length > 0 ? (
                filteredChats.map(chat => {
                  const name = getOtherParticipantName(chat);
                  const isActive = selectedChat?.id === chat.id;
                  return (
                    <button
                      key={chat.id}
                      onClick={() => { setSelectedChat(chat); setShowChatList(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition border-b border-gray-50 last:border-0 ${
                        isActive ? "bg-[#e0f2fe]" : "hover:bg-gray-50"
                      }`}
                    >
                      <div className="relative shrink-0">
                        <div className={`w-11 h-11 ${getAvatarColor(name)} rounded-full flex items-center justify-center text-white text-sm font-bold`}>
                          {getInitials(name)}
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-[#10b981] rounded-full border-2 border-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className={`text-sm font-semibold truncate ${isActive ? "text-[#0284c7]" : "text-[#0c4a6e]"}`}>{name}</span>
                          <span className="text-[10px] text-gray-400 shrink-0 ml-2">{formatTime(chat.lastMessageAt?.seconds)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-gray-500 truncate flex-1">
                            {chat.bookingService && <span className="text-[#0284c7] font-medium">[{chat.bookingService}] </span>}
                            {chat.lastMessage || "Start a conversation"}
                          </p>
                          {chat.unread && chat.unread > 0 && (
                            <span className="ml-2 w-5 h-5 bg-[#0284c7] text-white text-[10px] font-bold rounded-full flex items-center justify-center shrink-0">
                              {chat.unread}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center h-48 text-center px-4">
                  <MessageCircle className="w-10 h-10 text-gray-200 mb-3" />
                  <p className="text-sm font-medium text-gray-400">No conversations yet</p>
                  <p className="text-xs text-gray-300 mt-1">Messages appear here after you book a service</p>
                </div>
              )}
            </div>
          </div>

          {/* ── Chat Window ── */}
          <div className={`${!showChatList ? "flex" : "hidden"} lg:flex flex-col flex-1 overflow-hidden`}>
            {selectedChat ? (
              <>
                {/* Chat header */}
                <div className="bg-white border-b border-gray-100 px-5 py-3.5 flex items-center justify-between shrink-0 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 ${getAvatarColor(otherName)} rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0`}>
                      {getInitials(otherName)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-[#0c4a6e]">{otherName}</span>
                        {otherDetails?.role === "worker" && (
                          <ShieldCheck className="w-3.5 h-3.5 text-[#10b981]" />
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <Circle className="w-2 h-2 text-[#10b981] fill-[#10b981]" />
                        <span>Online</span>
                        {selectedChat.bookingService && (
                          <span className="text-gray-300 ml-1">· {selectedChat.bookingService}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center hover:bg-gray-100 transition">
                    <MoreVertical className="w-4 h-4 text-gray-400" />
                  </button>
                </div>

                {/* Payment gate notice */}
                {!selectedChat.paymentConfirmed && (
                  <div className="bg-amber-50 border-b border-amber-100 px-5 py-2.5 flex items-center gap-2.5">
                    <Lock className="w-4 h-4 text-amber-500 shrink-0" />
                    <p className="text-xs text-amber-700 font-medium">
                      Contact details are hidden until payment is confirmed. Discuss the job through this secure chat.
                    </p>
                  </div>
                )}

                {/* Messages area */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-gray-50">
                  {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <div className="w-14 h-14 bg-[#e0f2fe] rounded-2xl flex items-center justify-center mb-3">
                        <MessageCircle className="w-7 h-7 text-[#0284c7]" />
                      </div>
                      <p className="text-sm font-semibold text-[#0c4a6e] mb-1">Start the conversation</p>
                      <p className="text-xs text-gray-400 max-w-xs">Discuss the job details, ask questions, and agree on pricing before work begins.</p>
                    </div>
                  )}

                  {messages.map((msg, i) => {
                    const isMe = msg.senderId === currentUser?.uid;
                    const showTime = i === 0 || (msg.createdAt?.seconds || 0) - (messages[i - 1]?.createdAt?.seconds || 0) > 300;

                    return (
                      <div key={msg.id}>
                        {showTime && msg.createdAt && (
                          <div className="text-center text-[10px] text-gray-400 py-1">
                            {formatTime(msg.createdAt.seconds)}
                          </div>
                        )}
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                        >
                          {!isMe && (
                            <div className={`w-7 h-7 ${getAvatarColor(otherName)} rounded-full flex items-center justify-center text-white text-[10px] font-bold mr-2 mt-1 shrink-0`}>
                              {getInitials(otherName)}
                            </div>
                          )}
                          <div className={`max-w-[72%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-1`}>
                            <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                              isMe
                                ? "bg-[#0284c7] text-white rounded-br-sm shadow-sm"
                                : "bg-white text-gray-700 rounded-bl-sm shadow-sm border border-gray-100"
                            }`}>
                              {msg.text}
                            </div>
                            <div className="flex items-center gap-1">
                              {isMe && (
                                msg.read
                                  ? <CheckCheck className="w-3 h-3 text-[#10b981]" />
                                  : <Check className="w-3 h-3 text-gray-400" />
                              )}
                              <span className="text-[10px] text-gray-400">
                                {formatTime(msg.createdAt?.seconds)}
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>

                {/* Input area */}
                <div className="bg-white border-t border-gray-100 p-4 shrink-0">
                  <div className="flex items-end gap-3">
                    <div className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 flex items-end gap-2">
                      <input
                        ref={inputRef}
                        type="text"
                        value={inputText}
                        onChange={e => setInputText(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
                        placeholder="Type a message…"
                        className="flex-1 bg-transparent text-sm focus:outline-none resize-none"
                      />
                    </div>
                    <button
                      onClick={sendMessage}
                      disabled={!inputText.trim() || sending}
                      className="w-11 h-11 bg-[#0284c7] text-white rounded-2xl flex items-center justify-center hover:bg-[#0369a1] transition disabled:opacity-40 shrink-0 shadow-md"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-400 text-center mt-2 flex items-center justify-center gap-1">
                    <Lock className="w-2.5 h-2.5" /> Messages are secured and monitored for your safety
                  </p>
                </div>
              </>
            ) : (
              /* Empty state */
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-gray-50">
                <div className="w-20 h-20 bg-[#e0f2fe] rounded-3xl flex items-center justify-center mb-5">
                  <MessageCircle className="w-10 h-10 text-[#0284c7]" />
                </div>
                <h3 className="text-lg font-bold text-[#0c4a6e] mb-2">Your Messages</h3>
                <p className="text-sm text-gray-400 max-w-xs leading-relaxed">
                  Select a conversation from the list, or book a service to start chatting with a worker.
                </p>
                <Link
                  href="/client/book"
                  className="mt-6 inline-flex items-center gap-2 bg-[#0284c7] text-white text-sm font-semibold px-6 py-2.5 rounded-xl hover:bg-[#0369a1] transition shadow-md"
                >
                  Book a Service
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
// ─── Suspense wrapper (required for useSearchParams in Next.js) ───────────────
export default function MessagesPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-[#0284c7] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400 font-medium">Loading…</p>
        </div>
      </div>
    }>
      <MessagesPageInner />
    </Suspense>
  );
}