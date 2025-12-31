"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import ClientSidebar from "@/components/sidebar/ClientSidebar";
import { db, auth } from "@/lib/firebase";
import { 
  collection, 
  doc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  Timestamp 
} from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import { useSearchParams, useRouter } from "next/navigation";

interface Chat {
  id: string;
  name: string;
  lastMsg: string;
  time: string;
  unread: number;
}

interface Message {
  id?: string;
  senderId: string;
  text: string;
  createdAt: Timestamp;
}

// 1. Separate the chat logic into a internal component
function MessageContent() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  const searchParams = useSearchParams();
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Get active chatId from URL
  const activeChatId = searchParams.get("chatId") || "";

  // Handle Auth State
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsub();
  }, []);

  // Listen for Chat List (Sidebar)
  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, "chats"),
      where("participants", "array-contains", currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatList = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          name: data.workerName || data.name || "Worker", 
          lastMsg: data.lastMsg || "",
          time: data.time?.toDate 
            ? data.time.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
            : "",
          unread: data.unread || 0,
        } as Chat;
      });
      setChats(chatList);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Listen for Messages in Active Chat
  useEffect(() => {
    if (!activeChatId || !currentUser) return;

    const messagesRef = collection(db, "chats", activeChatId, "messages");
    const q = query(messagesRef, orderBy("createdAt", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: Message[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Message),
      }));
      setMessages(msgs);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });

    return () => unsubscribe();
  }, [activeChatId, currentUser]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !currentUser || !activeChatId) return;

    try {
      const messagesRef = collection(db, "chats", activeChatId, "messages");
      const chatRef = doc(db, "chats", activeChatId);
      
      const textToSave = newMessage;
      setNewMessage("");

      await addDoc(messagesRef, {
        senderId: currentUser.uid,
        text: textToSave,
        createdAt: Timestamp.now(),
      });

      await updateDoc(chatRef, {
        lastMsg: textToSave,
        time: Timestamp.now(),
      });
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const switchChat = (id: string, name: string) => {
    router.push(`/message?chatId=${id}&workerName=${encodeURIComponent(name)}`);
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <ClientSidebar />

      {/* Chat List Sidebar */}
      <div className="w-80 lg:w-96 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-100 bg-white">
          <h1 className="text-xl font-bold text-gray-800">My Messages</h1>
        </div>
        <div className="flex-1 overflow-y-auto">
          {chats.map((chat) => (
            <div
              key={chat.id}
              onClick={() => switchChat(chat.id, chat.name)}
              className={`flex items-center p-4 cursor-pointer transition-colors border-b border-gray-50 ${
                activeChatId === chat.id ? "bg-orange-50 border-r-4 border-r-[#FF6B35]" : "hover:bg-gray-50"
              }`}
            >
              <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center font-bold text-gray-500">
                {chat.name[0]}
              </div>
              <div className="ml-3 flex-1 min-w-0">
                <div className="flex justify-between items-baseline">
                  <h3 className="text-sm font-semibold text-gray-900 truncate">{chat.name}</h3>
                  <span className="text-xs text-gray-500">{chat.time}</span>
                </div>
                <p className="text-xs truncate text-gray-500">{chat.lastMsg}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Window */}
      <div className="flex-1 flex flex-col bg-[#F0F2F5]">
        {activeChatId ? (
          <>
            <div className="p-4 bg-white border-b border-gray-200 shadow-sm flex items-center">
              <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center font-bold text-white">
                {chats.find(c => c.id === activeChatId)?.name[0] || "W"}
              </div>
              <div className="ml-3">
                <h2 className="text-sm font-bold text-gray-800">
                  {chats.find(c => c.id === activeChatId)?.name || "Worker"}
                </h2>
                <p className="text-xs text-green-500 font-medium">Online</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.senderId === currentUser?.uid ? "justify-end" : "justify-start"}`}
                >
                  <div className={`p-3 rounded-2xl shadow-sm max-w-md ${
                    msg.senderId === currentUser?.uid ? "bg-[#FF6B35] text-white rounded-tr-none" : "bg-white rounded-tl-none"
                  }`}>
                    <p className="text-sm">{msg.text}</p>
                    <span className="text-[10px] block mt-1 opacity-70">
                      {msg.createdAt?.toDate?.().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef}></div>
            </div>

            <div className="p-4 bg-white border-t border-gray-200">
              <div className="flex items-center space-x-3 bg-gray-50 p-2 rounded-2xl">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 bg-transparent border-none py-2 px-2 focus:ring-0"
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                />
                <button
                  onClick={handleSendMessage}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    newMessage.trim() ? "bg-[#FF6B35] text-white" : "bg-gray-200 text-gray-400"
                  }`}
                >
                  <i className="fas fa-paper-plane"></i>
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            Select a conversation to start messaging
          </div>
        )}
      </div>
    </div>
  );
}

// 2. Main Page component that wraps everything in Suspense
export default function MessagePage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-gray-500 animate-pulse">Loading Messages...</div>
      </div>
    }>
      <MessageContent />
    </Suspense>
  );
}