"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Send, Search, Menu, ArrowLeft,
  MessageCircle, Lock, CheckCheck, Check,
  Circle, Loader2
} from "lucide-react";
import { motion } from "framer-motion";
import { db, auth } from "@/lib/firebase";
import {
  collection, query, where, onSnapshot, addDoc,
  serverTimestamp, orderBy, doc, updateDoc,
  getDocs, getDoc
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import WorkerSidebar from "@/components/sidebar/WorkerSidebar";

interface Chat {
  id: string;
  participants: string[];
  participantDetails?: Record<string, { name: string; role: string }>;
  lastMessage?: string;
  lastMessageAt?: { seconds: number };
  unreadCount?: Record<string, number>;
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
  system?: boolean;
}

function timeAgo(s?: number) {
  if (!s) return "";
  const d = new Date(s * 1000), now = new Date(), diff = now.getTime() - d.getTime();
  if (diff < 60000)   return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

const COLORS = ["bg-blue-500","bg-emerald-500","bg-violet-500","bg-orange-500","bg-rose-500","bg-cyan-500"];
const avatarColor = (name: string) => COLORS[(name || "?").charCodeAt(0) % COLORS.length];
const initials    = (name: string) => (name || "?").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

async function getOrCreateChat(workerId: string, clientId: string, workerName: string): Promise<string> {
  const snap = await getDocs(query(collection(db, "chats"), where("participants", "array-contains", workerId)));
  const existing = snap.docs.find(d => (d.data().participants as string[]).includes(clientId));
  if (existing) return existing.id;

  let clientName = "Client";
  try {
    const cSnap = await getDoc(doc(db, "users", clientId));
    if (cSnap.exists()) clientName = cSnap.data().displayName || cSnap.data().fullName || "Client";
  } catch {}

  const chatRef = await addDoc(collection(db, "chats"), {
    participants: [workerId, clientId],
    participantDetails: {
      [workerId]: { name: workerName, role: "worker" },
      [clientId]: { name: clientName, role: "client" },
    },
    paymentConfirmed: true,
    lastMessage:   "Chat started",
    lastMessageAt: serverTimestamp(),
    unreadCount:   { [workerId]: 0, [clientId]: 1 },
    createdAt:     serverTimestamp(),
  });

  await addDoc(collection(db, "messages"), {
    chatId:   chatRef.id,
    senderId: "system",
    text:     "✅ Chat started! You can now message each other about the job.",
    createdAt: serverTimestamp(),
    read:     true,
    system:   true,
  });

  return chatRef.id;
}

function WorkerMessagesPageInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const bottomRef    = useRef<HTMLDivElement>(null);
  const inputRef     = useRef<HTMLInputElement>(null);

  const [currentUser,  setCurrentUser]  = useState<{ uid: string; name: string } | null>(null);
  const [chats,        setChats]        = useState<Chat[]>([]);
  const [messages,     setMessages]     = useState<Message[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [inputText,    setInputText]    = useState("");
  const [sending,      setSending]      = useState(false);
  const [search,       setSearch]       = useState("");
  const [mobileOpen,   setMobileOpen]   = useState(false);
  const [showChatList, setShowChatList] = useState(true);
  const [loading,      setLoading]      = useState(true);
  const [creating,     setCreating]     = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      if (!user) { router.push("/login"); return; }
      setCurrentUser({ uid: user.uid, name: user.displayName || "Worker" });
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, "chats"), where("participants", "array-contains", currentUser.uid));
    const unsub = onSnapshot(q, async snap => {
      const data = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Chat))
        .sort((a, b) => (b.lastMessageAt?.seconds || 0) - (a.lastMessageAt?.seconds || 0));
      setChats(data);
      setLoading(false);

      const clientParam = searchParams.get("client");
      if (clientParam && !selectedChat) {
        const found = data.find(c => c.participants.includes(clientParam));
        if (found) {
          setSelectedChat(found);
          setShowChatList(false);
        } else {
          setCreating(true);
          try {
            await getOrCreateChat(currentUser.uid, clientParam, currentUser.name);
          } catch {}
          setCreating(false);
        }
      }
    });
    return () => unsub();
  }, [currentUser?.uid, searchParams.get("client")]);

  // Auto-select after new chat created
  useEffect(() => {
    const clientParam = searchParams.get("client");
    if (!clientParam || selectedChat || chats.length === 0) return;
    const found = chats.find(c => c.participants.includes(clientParam));
    if (found) { setSelectedChat(found); setShowChatList(false); }
  }, [chats, searchParams.get("client")]);

  useEffect(() => {
    if (!selectedChat) return;
    const q = query(
      collection(db, "messages"),
      where("chatId", "==", selectedChat.id),
      orderBy("createdAt", "asc")
    );
    const unsub = onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() } as Message)));
    });
    if (currentUser) {
      updateDoc(doc(db, "chats", selectedChat.id), {
        [`unreadCount.${currentUser.uid}`]: 0,
      }).catch(() => {});
    }
    return () => unsub();
  }, [selectedChat?.id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const getOtherName = (chat: Chat) => {
    if (!currentUser) return "Client";
    const otherId = chat.participants.find(p => p !== currentUser.uid) || "";
    return chat.participantDetails?.[otherId]?.name || "Client";
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !selectedChat || !currentUser || sending) return;
    const text = inputText.trim();
    setInputText("");
    setSending(true);
    const otherId = selectedChat.participants.find(p => p !== currentUser.uid) || "";
    try {
      await addDoc(collection(db, "messages"), {
        chatId: selectedChat.id, senderId: currentUser.uid,
        text, createdAt: serverTimestamp(), read: false,
      });
      await updateDoc(doc(db, "chats", selectedChat.id), {
        lastMessage:   text,
        lastMessageAt: serverTimestamp(),
        [`unreadCount.${otherId}`]: (selectedChat.unreadCount?.[otherId] || 0) + 1,
      });
    } catch (e) { console.error(e); }
    finally { setSending(false); inputRef.current?.focus(); }
  };

  const unreadFor = (chat: Chat) => currentUser ? (chat.unreadCount?.[currentUser.uid] || 0) : 0;
  const filtered  = chats.filter(c =>
    !search ||
    getOtherName(c).toLowerCase().includes(search.toLowerCase()) ||
    c.lastMessage?.toLowerCase().includes(search.toLowerCase())
  );
  const otherName = selectedChat ? getOtherName(selectedChat) : "";

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <WorkerSidebar />
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full [&>aside]:flex"><WorkerSidebar /></div>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="lg:hidden bg-white border-b border-gray-100 px-4 h-14 flex items-center justify-between shrink-0 shadow-sm">
          {!showChatList && selectedChat
            ? <button onClick={() => setShowChatList(true)} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100"><ArrowLeft className="w-5 h-5 text-[#0c4a6e]" /></button>
            : <button onClick={() => setMobileOpen(true)} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100"><Menu className="w-5 h-5 text-[#0c4a6e]" /></button>}
          <span className="text-base font-bold text-[#0c4a6e]">{!showChatList && selectedChat ? otherName : "Messages"}</span>
          <div className="w-9" />
        </header>

        <div className="flex-1 flex overflow-hidden">
          {/* Chat list */}
          <div className={`${showChatList ? "flex" : "hidden"} lg:flex flex-col w-full lg:w-80 xl:w-96 bg-white border-r border-gray-100 shrink-0`}>
            <div className="p-4 border-b border-gray-50">
              <h2 className="text-base font-bold text-[#0c4a6e] mb-3 hidden lg:block">Messages</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search conversations…"
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#10b981]" />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {creating && (
                <div className="flex items-center gap-3 px-4 py-3 bg-green-50 border-b border-green-100">
                  <Loader2 className="w-4 h-4 text-[#10b981] animate-spin shrink-0" />
                  <p className="text-xs text-[#10b981] font-medium">Opening conversation…</p>
                </div>
              )}
              {loading
                ? [...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3.5 animate-pulse">
                      <div className="w-11 h-11 bg-gray-100 rounded-full shrink-0" />
                      <div className="flex-1 space-y-2"><div className="h-3 bg-gray-100 rounded w-1/2" /><div className="h-2.5 bg-gray-100 rounded w-3/4" /></div>
                    </div>
                  ))
                : filtered.length > 0
                  ? filtered.map(chat => {
                      const name     = getOtherName(chat);
                      const isActive = selectedChat?.id === chat.id;
                      const unread   = unreadFor(chat);
                      return (
                        <button key={chat.id}
                          onClick={() => { setSelectedChat(chat); setShowChatList(false); }}
                          className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition border-b border-gray-50 last:border-0 ${isActive ? "bg-[#f0fdf4]" : "hover:bg-gray-50"}`}>
                          <div className="relative shrink-0">
                            <div className={`w-11 h-11 ${avatarColor(name)} rounded-full flex items-center justify-center text-white text-sm font-bold`}>{initials(name)}</div>
                            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-[#10b981] rounded-full border-2 border-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className={`text-sm font-semibold truncate ${isActive ? "text-[#10b981]" : "text-[#0c4a6e]"}`}>{name}</span>
                              <span className="text-[10px] text-gray-400 shrink-0 ml-2">{timeAgo(chat.lastMessageAt?.seconds)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <p className="text-xs text-gray-500 truncate flex-1">{chat.lastMessage || "Start a conversation"}</p>
                              {unread > 0 && (
                                <span className="ml-2 w-5 h-5 bg-[#10b981] text-white text-[10px] font-bold rounded-full flex items-center justify-center shrink-0">{unread}</span>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })
                  : (
                    <div className="flex flex-col items-center justify-center h-48 text-center px-4">
                      <MessageCircle className="w-10 h-10 text-gray-200 mb-3" />
                      <p className="text-sm font-medium text-gray-400">No conversations yet</p>
                      <p className="text-xs text-gray-300 mt-1">Chats appear after a job is assigned</p>
                    </div>
                  )}
            </div>
          </div>

          {/* Chat window */}
          <div className={`${!showChatList ? "flex" : "hidden"} lg:flex flex-col flex-1 overflow-hidden`}>
            {selectedChat ? (
              <>
                <div className="bg-white border-b border-gray-100 px-5 py-3.5 flex items-center justify-between shrink-0 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 ${avatarColor(otherName)} rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0`}>{initials(otherName)}</div>
                    <div>
                      <span className="text-sm font-bold text-[#0c4a6e]">{otherName}</span>
                      <div className="flex items-center gap-1 text-xs text-gray-400"><Circle className="w-2 h-2 text-[#10b981] fill-[#10b981]" /><span>Active</span></div>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-gray-50">
                  {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <div className="w-14 h-14 bg-[#dcfce7] rounded-2xl flex items-center justify-center mb-3">
                        <MessageCircle className="w-7 h-7 text-[#10b981]" />
                      </div>
                      <p className="text-sm font-semibold text-[#0c4a6e] mb-1">Start the conversation</p>
                      <p className="text-xs text-gray-400 max-w-xs">Introduce yourself and discuss the job details.</p>
                    </div>
                  )}
                  {messages.map((msg, i) => {
                    const isMe     = msg.senderId === currentUser?.uid;
                    const isSystem = msg.system === true || msg.senderId === "system";
                    const showTime = i === 0 || (msg.createdAt?.seconds || 0) - (messages[i-1]?.createdAt?.seconds || 0) > 300;
                    if (isSystem) return (
                      <div key={msg.id} className="flex justify-center">
                        <span className="text-[11px] text-gray-400 bg-white border border-gray-100 px-3 py-1 rounded-full">{msg.text}</span>
                      </div>
                    );
                    return (
                      <div key={msg.id}>
                        {showTime && msg.createdAt && (
                          <div className="text-center text-[10px] text-gray-400 py-1">{timeAgo(msg.createdAt.seconds)}</div>
                        )}
                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                          className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                          {!isMe && (
                            <div className={`w-7 h-7 ${avatarColor(otherName)} rounded-full flex items-center justify-center text-white text-[10px] font-bold mr-2 mt-1 shrink-0`}>
                              {initials(otherName)}
                            </div>
                          )}
                          <div className={`max-w-[72%] flex flex-col gap-1 ${isMe ? "items-end" : "items-start"}`}>
                            <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${isMe ? "bg-[#10b981] text-white rounded-br-sm shadow-sm" : "bg-white text-gray-700 rounded-bl-sm shadow-sm border border-gray-100"}`}>
                              {msg.text}
                            </div>
                            <div className="flex items-center gap-1">
                              {isMe && (msg.read ? <CheckCheck className="w-3 h-3 text-[#10b981]" /> : <Check className="w-3 h-3 text-gray-400" />)}
                              <span className="text-[10px] text-gray-400">{timeAgo(msg.createdAt?.seconds)}</span>
                            </div>
                          </div>
                        </motion.div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>

                <div className="bg-white border-t border-gray-100 p-4 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5">
                      <input ref={inputRef} type="text" value={inputText}
                        onChange={e => setInputText(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
                        placeholder="Type a message…"
                        className="w-full bg-transparent text-sm focus:outline-none" />
                    </div>
                    <button onClick={sendMessage} disabled={!inputText.trim() || sending}
                      className="w-11 h-11 bg-[#10b981] text-white rounded-2xl flex items-center justify-center hover:bg-[#059669] transition disabled:opacity-40 shrink-0 shadow-md">
                      {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-400 text-center mt-2 flex items-center justify-center gap-1">
                    <Lock className="w-2.5 h-2.5" /> Secured and monitored for your safety
                  </p>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-gray-50">
                <div className="w-20 h-20 bg-[#dcfce7] rounded-3xl flex items-center justify-center mb-5">
                  <MessageCircle className="w-10 h-10 text-[#10b981]" />
                </div>
                <h3 className="text-lg font-bold text-[#0c4a6e] mb-2">Your Messages</h3>
                <p className="text-sm text-gray-400 max-w-xs leading-relaxed">Select a conversation to chat with a client.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WorkerMessagesPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-[#10b981] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <WorkerMessagesPageInner />
    </Suspense>
  );
}