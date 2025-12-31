"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { db, auth } from "@/lib/firebase";
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  limit 
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

interface ChatLead {
  id: string;
  client: string;
  service: string;
  lastMessage: string;
  time: string;
  status: string;
  unreadCount: number;
}

export default function WorkerDashboard() {
  const [leads, setLeads] = useState<ChatLead[]>([]);
  const [stats, setStats] = useState({
    activeChats: 0,
    unreadTotal: 0,
    totalEarnings: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        // 1. Fetch Active Chats (Negotiations)
        const q = query(
          collection(db, "chats"),
          where("participants", "array-contains", user.uid),
          orderBy("time", "desc"),
          limit(5)
        );

        const unsubChats = onSnapshot(q, (snapshot) => {
          let unread = 0;
          const chatLeads = snapshot.docs.map(docSnap => {
            const data = docSnap.data();
            unread += (data.unread || 0);
            
            return {
              id: docSnap.id,
              client: data.clientName || "Client",
              service: data.serviceType || "Service Request",
              lastMessage: data.lastMsg || "No messages yet",
              time: data.time?.toDate() ? data.time.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now",
              status: data.status || "New Inquiry",
              unreadCount: data.unread || 0
            };
          });

          setLeads(chatLeads);
          setStats(prev => ({ 
            ...prev, 
            activeChats: snapshot.size, 
            unreadTotal: unread 
          }));
          setLoading(false);
        });

        // 2. Optional: Fetch Earnings (from a 'jobs' collection)
        const jobsQuery = query(
            collection(db, "jobs"), 
            where("workerId", "==", user.uid), 
            where("status", "==", "completed")
        );
        const unsubJobs = onSnapshot(jobsQuery, (snap) => {
            const total = snap.docs.reduce((sum, doc) => sum + (doc.data().amount || 0), 0);
            setStats(prev => ({ ...prev, totalEarnings: total }));
        });

        return () => {
          unsubChats();
          unsubJobs();
        };
      }
    });

    return () => unsubAuth();
  }, []);

  return (
    <section className="p-4 lg:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Worker Dashboard</h1>
            <p className="text-gray-500">
                {stats.unreadTotal > 0 
                    ? `You have ${stats.unreadTotal} unread messages.` 
                    : "You're all caught up!"}
            </p>
          </div>
          <Link 
            href="/worker-messages" 
            className="hidden md:block bg-[#FF6B35] text-white px-5 py-2 rounded-lg font-bold hover:bg-[#e85a20] transition-all"
          >
            Open Inbox
          </Link>
        </header>

        {/* Live Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500 font-medium">Response Rate</p>
            <h3 className="text-2xl font-bold text-gray-800">98%</h3>
            <div className="w-full bg-gray-100 h-1.5 mt-3 rounded-full">
              <div className="bg-[#2A9D8F] h-full w-[98%] rounded-full"></div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500 font-medium">Active Chats</p>
            <h3 className="text-2xl font-bold text-gray-800">{stats.activeChats}</h3>
            <p className="text-xs text-[#FF6B35] mt-2 font-bold">{stats.unreadTotal} require reply</p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500 font-medium">Earnings (Completed)</p>
            <h3 className="text-2xl font-bold text-gray-800">₦{stats.totalEarnings.toLocaleString()}</h3>
            <p className="text-xs text-green-600 mt-2">Verified Balance</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Active Conversations */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-lg font-bold text-gray-800">Active Negotiations</h2>

            <div className="space-y-4">
              {leads.length > 0 ? leads.map((lead) => (
                <div key={lead.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center text-[#FF6B35] font-bold text-xl">
                            {lead.client[0]}
                        </div>
                        {lead.unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                                {lead.unreadCount}
                            </span>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-gray-800">{lead.client}</h4>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            lead.status === 'New Inquiry' ? 'bg-orange-100 text-[#FF6B35]' : 'bg-teal-100 text-[#2A9D8F]'
                          }`}>
                            {lead.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 font-medium italic truncate max-w-[200px] md:max-w-xs">
                            "{lead.lastMessage}"
                        </p>
                        <p className="text-xs text-gray-400 mt-1 uppercase">
                          {lead.service}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 pt-4 md:pt-0">
                      <span className="text-xs text-gray-400 font-medium">{lead.time}</span>
                      <Link 
                        href={`/worker/messages?chatId=${lead.id}`}
                        className="flex items-center gap-2 bg-gray-800 text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-black transition-colors"
                      >
                        <i className="fa-solid fa-comment-dots"></i>
                        Open Chat
                      </Link>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="bg-white p-10 rounded-2xl border border-dashed border-gray-200 text-center">
                    <p className="text-gray-400">No active negotiations found.</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-gray-800">Quick Actions</h2>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
               <button className="w-full flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-orange-50 group transition-all">
                  <div className="flex items-center gap-3">
                    <i className="fa-solid fa-clock text-gray-400 group-hover:text-[#FF6B35]"></i>
                    <span className="text-sm font-medium text-gray-700">Set Availability</span>
                  </div>
                  <i className="fa-solid fa-chevron-right text-xs text-gray-300"></i>
               </button>
               <Link href="/worker/invoices" className="w-full flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-orange-50 group transition-all">
                  <div className="flex items-center gap-3">
                    <i className="fa-solid fa-file-invoice text-gray-400 group-hover:text-[#FF6B35]"></i>
                    <span className="text-sm font-medium text-gray-700">Generate Invoice</span>
                  </div>
                  <i className="fa-solid fa-chevron-right text-xs text-gray-300"></i>
               </Link>
            </div>
            
            <div className="bg-[#2A9D8F] rounded-2xl p-6 text-white shadow-lg">
              <h3 className="font-bold mb-2">Pro Tip</h3>
              <p className="text-sm text-teal-50 opacity-90">
                Workers who reply within 15 minutes are 3x more likely to secure the job!
              </p>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}