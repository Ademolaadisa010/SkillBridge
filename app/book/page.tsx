"use client";

import { useState, useEffect, ChangeEvent } from "react";
import ClientSidebar from "@/components/sidebar/ClientSidebar";
import Image from "next/image";
import Hero from "@/public/hero-sec.jpg";
import { db, auth } from "@/lib/firebase";
import { collection, getDocs, doc, setDoc, getDoc, Timestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";

interface Worker {
  id: string;
  fullName: string;
  service: string;
  location: string;
  rating: number;
  reviews: number;
  price: string;
  verified: boolean;
}

export default function Book() {
  const [serviceQuery, setServiceQuery] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();

  // 🔥 Get authenticated user
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) setUserId(user.uid);
    });
    return () => unsub();
  }, []);

  // 🔥 Fetch workers from Firestore
  useEffect(() => {
    const fetchWorkers = async () => {
      try {
        const snapshot = await getDocs(collection(db, "workers"));
        const data: Worker[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          fullName: doc.data().fullName || "Unnamed Worker",
          service: doc.data().category || "Unknown",
          location: doc.data().location || "Unknown",
          rating: doc.data().rating || 0,
          reviews: doc.data().reviews || 0,
          price: doc.data().hourlyRate ? `₦ ${doc.data().hourlyRate}/hr` : "N/A",
          verified: doc.data().verified || false,
        }));
        setWorkers(data);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching workers:", error);
        setLoading(false);
      }
    };

    fetchWorkers();
  }, []);

  // 🔥 Save worker to bookmarks
  const handleBookmark = async (worker: Worker) => {
    if (!userId) {
      alert("Please login to save bookmarks");
      return;
    }
    try {
      const bookmarkRef = doc(db, "bookmarks", userId);
      await setDoc(bookmarkRef, { items: { [worker.id]: worker } }, { merge: true });
      alert(`${worker.fullName} added to bookmarks`);
    } catch (error) {
      console.error("Error saving bookmark:", error);
      alert("Failed to save bookmark. Try again.");
    }
  };

  // 🔥 Navigate to chat page with worker info, create chat if not exists
  const handleChatNow = async (worker: Worker) => {
    if (!userId) {
      alert("Please login to chat with a worker");
      return;
    }

    try {
      // Use a consistent ID format
      const chatId = userId < worker.id ? `${userId}_${worker.id}` : `${worker.id}_${userId}`;
      const chatRef = doc(db, "chats", chatId);

      // 1. We skip the 'getDoc' check because it triggers a "Permission Denied" 
      //    if the user isn't already a participant of a non-existent doc.
      
      // 2. We use setDoc with merge: true. 
      //    If it's new, it creates it. If it exists, it won't overwrite participants.
      await setDoc(chatRef, {
        participants: [userId, worker.id],
        lastMsg: "",
        time: Timestamp.now(), // Better to have a timestamp here
        unread: 0,
        createdAt: Timestamp.now(),
      }, { merge: true });

      router.push(
        `/message?chatId=${chatId}&workerName=${encodeURIComponent(worker.fullName)}`
      );
    } catch (error) {
      console.error("Error creating/checking chat:", error);
      alert("Failed to start chat. This might be a permission issue.");
    }
  };

  const filteredWorkers = workers.filter((worker) =>
    worker.service.toLowerCase().includes(serviceQuery.toLowerCase()) &&
    worker.location.toLowerCase().includes(locationQuery.toLowerCase())
  );

  if (loading) return <div className="p-8">Loading workers...</div>;

  return (
    <div className="flex">
      <ClientSidebar />

      <div className="flex-1 my-6 sm:mb-8 px-4">
        <p className="text-3xl text-gray-600 mb-4">Find and book skilled workers</p>

        {/* SEARCH BAR */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
            <input
              type="text"
              placeholder="What service do you need?"
              value={serviceQuery}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setServiceQuery(e.target.value)
              }
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
            />
          </div>

          <div className="flex-1 relative">
            <i className="fas fa-map-marker-alt absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
            <input
              type="text"
              placeholder="Location"
              value={locationQuery}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setLocationQuery(e.target.value)
              }
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
            />
          </div>
        </div>

        {/* WORKERS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
          {filteredWorkers.map((worker) => (
            <div
              key={worker.id}
              className="border border-gray-200 rounded-xl p-4 hover:shadow-lg transition"
            >
              <div className="flex items-start gap-3 mb-3">
                <Image
                  src={Hero}
                  alt="Worker"
                  className="w-16 h-16 rounded-full object-cover"
                />

                <div className="flex-1">
                  <h4 className="font-bold text-dark">{worker.fullName}</h4>
                  <p className="text-sm text-gray-600">
                    {worker.service} • {worker.location}
                  </p>

                  <p
                    className={`text-xs mt-1 font-semibold ${
                      worker.verified ? "text-green-600" : "text-yellow-600"
                    }`}
                  >
                    {worker.verified
                      ? "✔ Verified service provider"
                      : "⏳ Verification pending"}
                  </p>

                  <div className="flex items-center gap-1 mt-2">
                    <i className="fas fa-star text-yellow-400 text-xs"></i>
                    <span className="text-sm font-semibold">{worker.rating}</span>
                    <span className="text-xs text-gray-500">({worker.reviews})</span>
                  </div>
                </div>

                <button
                  onClick={() => handleBookmark(worker)}
                  className="text-gray-400 hover:text-primary"
                >
                  <i className="fas fa-heart"></i>
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-primary font-bold">{worker.price}</span>
                <button
                  onClick={() => handleChatNow(worker)}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-opacity-90 transition"
                >
                  Chat Now
                </button>
              </div>
            </div>
          ))}

          {filteredWorkers.length === 0 && (
            <p className="text-gray-500 col-span-full text-center">
              No service providers found.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
