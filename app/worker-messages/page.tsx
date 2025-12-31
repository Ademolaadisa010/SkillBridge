"use client";

import { useState, useEffect, useRef } from "react";
import WorkerSidebar from "@/components/sidebar/WorkerSidebar";
import { db, auth } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  Timestamp,
} from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";

interface Chat {
  id: string;
  clientId: string;
  name: string;
  lastMsg: string;
  time: string;
  unread: number;
  online: boolean;
}

interface Message {
  id?: string;
  senderId: string;
  text: string;
  createdAt: Timestamp;
}

export default function WorkerMessages() {
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // 1. Properly track Auth State
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsub();
  }, []);

  // 2. Fetch chats using a FILTERED query (Fixes Permission Error)
  useEffect(() => {
    if (!currentUser) return;

    // RULE: You must query with 'where' to match security rules
    const chatsRef = collection(db, "chats");
    const q = query(
      chatsRef, 
      where("participants", "array-contains", currentUser.uid)
    );

    // Using onSnapshot so the sidebar updates in real-time
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatList = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          clientId: data.clientId || "",
          name: data.clientName || "Client",
          lastMsg: data.lastMsg || "",
          time: data.time?.toDate 
            ? data.time.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
            : "",
          unread: data.unread || 0,
          online: data.online || false,
        } as Chat;
      });

      setChats(chatList);
      if (chatList.length > 0 && !activeChatId) setActiveChatId(chatList[0].id);
    }, (error) => {
      console.error("Chat Query Error:", error);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // 3. Listen to messages for the active chat
  useEffect(() => {
    if (!activeChatId) return;

    const messagesRef = collection(db, "chats", activeChatId, "messages");
    const q = query(messagesRef, orderBy("createdAt", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: Message[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Message),
      }));
      setMessages(msgs);
      setTimeout(scrollToBottom, 100);
    });

    return () => unsubscribe();
  }, [activeChatId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !currentUser || !activeChatId) return;

    try {
      const chatRef = doc(db, "chats", activeChatId);
      const messagesRef = collection(db, "chats", activeChatId, "messages");
      
      const textToSave = newMessage;
      setNewMessage(""); 

      // Add message
      await addDoc(messagesRef, {
        senderId: currentUser.uid,
        text: textToSave,
        createdAt: Timestamp.now(),
      });

      // Update parent chat for sidebar preview
      await updateDoc(chatRef, {
        lastMsg: textToSave,
        time: Timestamp.now(),
      });
    } catch (err) {
      console.error("Send Error:", err);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <WorkerSidebar />

      {/* Chat List */}
      <div className="w-80 lg:w-96 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-100 bg-white">
          <h1 className="text-xl font-bold text-gray-800">Client Chats</h1>
        </div>

        <div className="flex-1 overflow-y-auto">
          {chats.length === 0 ? (
            <p className="p-4 text-gray-400 text-sm">No chats found.</p>
          ) : (
            chats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => setActiveChatId(chat.id)}
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
            ))
          )}
        </div>
      </div>

      {/* Chat Window */}
      <div className="flex-1 flex flex-col bg-[#F0F2F5]">
        {activeChatId ? (
          <>
            <div className="p-4 bg-white border-b border-gray-200 shadow-sm">
               <h2 className="text-sm font-bold text-gray-800">
                {chats.find(c => c.id === activeChatId)?.name || "Chat"}
               </h2>
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
                  placeholder="Type your reply..."
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
            Select a client to start chatting
          </div>
        )}
      </div>
    </div>
  );
}