"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Hero from "@/public/hero-sec.jpg";
import { db, auth } from "@/lib/firebase";
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  getDocs, 
  limit,
  doc
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

interface Worker {
  id: string;
  fullName: string;
  service: string;
  rating: number;
  reviews: number;
  price: string;
}

export default function ClientDashboard() {
  const [stats, setStats] = useState({
    activeBookings: 0,
    completedJobs: 0,
    savedWorkers: 0,
    newMessages: 0,
  });
  const [recommendedWorkers, setRecommendedWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const userId = user.uid;

        // 1. Listen for Jobs (Active vs Completed)
        const jobsQuery = query(collection(db, "jobs"), where("clientId", "==", userId));
        const unsubJobs = onSnapshot(jobsQuery, (snapshot) => {
          const docs = snapshot.docs.map(d => d.data());
          setStats(prev => ({
            ...prev,
            activeBookings: docs.filter(j => j.status === "active" || j.status === "pending").length,
            completedJobs: docs.filter(j => j.status === "completed").length,
          }));
        });

        // 2. Listen for Saved Workers (Bookmarks)
        const unsubBookmarks = onSnapshot(doc(db, "bookmarks", userId), (docSnap) => {
          if (docSnap.exists()) {
            const items = docSnap.data().items || {};
            setStats(prev => ({ ...prev, savedWorkers: Object.keys(items).length }));
          }
        });

        // 3. Listen for Chats (New Messages/Unread)
        const chatQuery = query(collection(db, "chats"), where("participants", "array-contains", userId));
        const unsubChats = onSnapshot(chatQuery, (snapshot) => {
          const totalUnread = snapshot.docs.reduce((acc, doc) => acc + (doc.data().unread || 0), 0);
          setStats(prev => ({ ...prev, newMessages: totalUnread }));
        });

        // 4. Fetch Recommended Workers (Just fetching first 3 from workers collection)
        const fetchWorkers = async () => {
          const q = query(collection(db, "workers"), limit(3));
          const snap = await getDocs(q);
          const workers = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Worker));
          setRecommendedWorkers(workers);
          setLoading(false);
        };

        fetchWorkers();

        return () => {
          unsubJobs();
          unsubBookmarks();
          unsubChats();
        };
      }
    });

    return () => unsubAuth();
  }, []);

  return (
    <section className="animate-in fade-in duration-500">
      <div className="text-center mb-8 sm:mb-12">
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-dark mb-3 sm:mb-4">
          Welcome back, {auth.currentUser?.displayName?.split(" ")[0] || "Client"}
        </h2>
      </div>

      {/* Real-time Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 sm:mb-8">
        <StatCard color="blue" label="Active Bookings" value={stats.activeBookings} />
        <StatCard color="green" label="Completed Jobs" value={stats.completedJobs} />
        <StatCard color="purple" label="Saved Workers" value={stats.savedWorkers} />
        <StatCard color="orange" label="New Messages" value={stats.newMessages} />
      </div>

      {/* Recommended Workers Section */}
      <div className="mb-6 sm:mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg sm:text-xl font-bold text-dark">Recommended for You</h3>
          <button className="text-[#FF6B35] font-semibold text-sm hover:underline">View All</button>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {recommendedWorkers.length > 0 ? (
            recommendedWorkers.map((worker) => (
              <div key={worker.id} className="border border-gray-200 bg-white rounded-xl p-4 hover:shadow-lg transition">
                <div className="flex items-start gap-3 mb-3">
                  <Image src={Hero} alt="Worker" className="w-16 h-16 rounded-full object-cover" />
                  <div className="flex-1">
                    <h4 className="font-bold text-dark">{worker.fullName}</h4>
                    <p className="text-sm text-gray-600">{worker.service}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <i className="fas fa-star text-yellow-400 text-xs"></i>
                      <span className="text-sm font-semibold">{worker.rating || 5.0}</span>
                      <span className="text-xs text-gray-500">({worker.reviews || 0})</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#FF6B35] font-bold">{worker.price}</span>
                  <button className="bg-[#FF6B35] text-white px-4 py-2 rounded-lg text-sm hover:bg-opacity-90 transition">
                    View Profile
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-400 text-sm italic">Finding workers near you...</p>
          )}
        </div>
      </div>

      {/* Static Activity - Can be dynamic later by fetching a 'notifications' collection */}
      <div>
        <h3 className="text-lg sm:text-xl font-bold text-dark mb-4">Recent Activity</h3>
        <div className="space-y-3">
          <ActivityItem icon="fa-check" color="green" text="Dashboard synced with Firebase" time="Just now" />
          <ActivityItem icon="fa-calendar" color="blue" text="System check complete" time="Recently" />
        </div>
      </div>
    </section>
  );
}

// --- Helper Components for cleaner code ---

function StatCard({ color, label, value }: { color: string; label: string; value: number }) {
  const colors: any = {
    blue: "from-blue-50 to-blue-100 text-blue-600",
    green: "from-green-50 to-green-100 text-green-600",
    purple: "from-purple-50 to-purple-100 text-purple-600",
    orange: "from-orange-50 to-orange-100 text-orange-600",
  };
  return (
    <div className={`bg-gradient-to-br ${colors[color]} p-4 rounded-xl border border-white/50 shadow-sm`}>
      <div className="text-2xl font-bold mb-1">{value}</div>
      <div className="text-sm text-gray-600">{label}</div>
    </div>
  );
}

function ActivityItem({ icon, color, text, time }: { icon: string; color: string; text: string; time: string }) {
  const colors: any = {
    green: "bg-green-100 text-green-600",
    blue: "bg-blue-100 text-blue-600",
    purple: "bg-purple-100 text-purple-600",
  };
  return (
    <div className="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-lg shadow-sm">
      <div className={`w-10 h-10 ${colors[color]} rounded-full flex items-center justify-center`}>
        <i className={`fas ${icon}`}></i>
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-dark">{text}</p>
        <p className="text-xs text-gray-500">{time}</p>
      </div>
    </div>
  );
}