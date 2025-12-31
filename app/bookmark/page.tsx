"use client";

import { useState, useEffect } from "react";
import ClientSidebar from "@/components/sidebar/ClientSidebar";
import Image from "next/image";
import Hero from "@/public/hero-sec.jpg";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
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

export default function Bookmark() {
  const [bookmarks, setBookmarks] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchBookmarks = async () => {
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;
    const docRef = doc(db, "bookmarks", userId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const bookmarkedWorkers = docSnap.data().items || {};
      const workerData: Worker[] = [];

      for (const key in bookmarkedWorkers) {
        const data = bookmarkedWorkers[key];
        workerData.push({
          id: data.id,
          fullName: data.fullName,
          service: data.service,
          location: data.location,
          rating: data.rating,
          reviews: data.reviews,
          price: data.price,
          verified: data.verified,
        });
      }

      setBookmarks(workerData);
    }

    setLoading(false);
  };

  const removeBookmark = async (id: string) => {
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;
    const docRef = doc(db, "bookmarks", userId);

    const docSnap = await getDoc(docRef);
    const updatedBookmarks = { ...(docSnap.data()?.items || {}) };
    delete updatedBookmarks[id];
    await setDoc(docRef, { items: updatedBookmarks }, { merge: true });

    setBookmarks(bookmarks.filter((worker) => worker.id !== id));
  };

  // Logic to handle Chat Navigation
  const handleChat = async (worker: Worker) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    // Create a unique Chat ID (e.g., combining both UIDs alphabetically)
    const chatId = [currentUser.uid, worker.id].sort().join("_");
    const chatRef = doc(db, "chats", chatId);

    // Check if chat document already exists
    const chatSnap = await getDoc(chatRef);

    if (!chatSnap.exists()) {
      // Create the chat document if it's the first time
      await setDoc(chatRef, {
        participants: [currentUser.uid, worker.id],
        workerName: worker.fullName,
        clientName: currentUser.displayName || "Client",
        lastMsg: "",
        time: Timestamp.now(),
        createdAt: Timestamp.now(),
      });
    }

    // Navigate to the message page with the chatId and name
    router.push(`/message?chatId=${chatId}&workerName=${encodeURIComponent(worker.fullName)}`);
  };

  useEffect(() => {
    fetchBookmarks();
  }, []);

  if (loading) return <div className="p-8">Loading bookmarks...</div>;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <ClientSidebar />

      <main className="flex-1 my-6 sm:mb-8 px-4">
        <p className="text-3xl text-gray-600 mb-4">Saved Bookmarks</p>

        {bookmarks.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {bookmarks.map((worker) => (
              <div
                key={worker.id}
                className="border border-gray-200 rounded-xl p-4 bg-white hover:shadow-lg transition"
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
                    onClick={() => removeBookmark(worker.id)}
                    className="text-gray-400 hover:text-red-500"
                    title="Remove Bookmark"
                  >
                    <i className="fas fa-trash-can"></i>
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-primary font-bold">{worker.price}</span>
                  <button 
                    onClick={() => handleChat(worker)}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-opacity-90 transition font-medium"
                  >
                    Chat Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-200">
            <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mb-4">
              <i className="fa-solid fa-bookmark text-[#FF6B35] text-3xl"></i>
            </div>
            <h2 className="text-xl font-semibold text-gray-800">No bookmarks yet</h2>
            <p className="text-gray-500 mt-2 text-center max-w-sm">
              You haven't saved any services. Browse our marketplace to find skills you're interested in!
            </p>
          </div>
        )}
      </main>
    </div>
  );
}