"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Hero from "@/public/hero.jpg";
import {
  Bookmark, BookmarkX, Star, MapPin, ShieldCheck,
  Search, Menu, CalendarPlus, MessageCircle,
  ChevronRight, X, Heart, Zap, Filter
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { db, auth } from "@/lib/firebase";
import { doc, onSnapshot, updateDoc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import ClientSidebar from "@/components/sidebar/ClientSidebar";
import toast, { Toaster } from "react-hot-toast";

interface SavedWorker {
  id: string;
  fullName: string;
  service: string;
  rating: number;
  reviews: number;
  price: string;
  location?: string;
  verified?: boolean;
  bio?: string;
  completedJobs?: number;
  savedAt?: number;
  category?: string;
}

const categoryColors: Record<string, { bg: string; text: string }> = {
  plumbing:      { bg: "bg-blue-100",   text: "text-blue-700" },
  electrical:    { bg: "bg-yellow-100", text: "text-yellow-700" },
  carpentry:     { bg: "bg-orange-100", text: "text-orange-700" },
  painting:      { bg: "bg-green-100",  text: "text-green-700" },
  mechanics:     { bg: "bg-red-100",    text: "text-red-700" },
  "ac-technician":{ bg: "bg-cyan-100",  text: "text-cyan-700" },
  electrician:   { bg: "bg-purple-100", text: "text-purple-700" },
  other:         { bg: "bg-gray-100",   text: "text-gray-700" },
};

function WorkerCard({
  worker,
  onUnsave,
  onBook,
  onMessage,
}: {
  worker: SavedWorker;
  onUnsave: (id: string) => void;
  onBook: (id: string) => void;
  onMessage: (id: string) => void;
}) {
  const [removing, setRemoving] = useState(false);
  const cat = categoryColors[worker.category || "other"] || categoryColors.other;

  const handleUnsave = async () => {
    setRemoving(true);
    await new Promise(r => setTimeout(r, 300));
    onUnsave(worker.id);
  };

  return (
    <AnimatePresence>
      {!removing && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden group"
        >
          <div className="relative h-40">
            <Image
              src={Hero}
              alt={worker.fullName}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

            <button
              onClick={handleUnsave}
              className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition group/btn shadow-sm"
              title="Remove from saved"
            >
              <Heart className="w-4 h-4 text-red-500 fill-red-500 group-hover/btn:scale-110 transition-transform" />
            </button>

            {worker.verified && (
              <div className="absolute top-3 left-3 bg-[#10b981] text-white px-2 py-1 rounded-full text-[10px] font-bold flex items-center gap-1">
                <ShieldCheck className="w-2.5 h-2.5" /> Verified
              </div>
            )}

            <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full flex items-center gap-1 shadow-sm">
              <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
              <span className="text-xs font-bold text-gray-700">{worker.rating || "5.0"}</span>
            </div>
          </div>

          <div className="p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="min-w-0">
                <h3 className="font-bold text-[#0c4a6e] text-sm truncate">{worker.fullName}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{worker.service}</p>
              </div>
              {worker.category && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${cat.bg} ${cat.text}`}>
                  {worker.category}
                </span>
              )}
            </div>

            <div className="space-y-1.5 mb-4">
              {worker.location && (
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <MapPin className="w-3 h-3 text-gray-300 shrink-0" />
                  <span className="truncate">{worker.location}</span>
                </div>
              )}
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span>{worker.reviews || 0} reviews</span>
                {worker.completedJobs && <span>·</span>}
                {worker.completedJobs && <span>{worker.completedJobs} jobs done</span>}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gray-50">
              <span className="text-sm font-bold text-[#0284c7]">{worker.price}/hr</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onMessage(worker.id)}
                  className="w-8 h-8 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-center hover:bg-[#e0f2fe] hover:border-[#0284c7] transition"
                  title="Send message"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-gray-500 hover:text-[#0284c7]" />
                </button>
                <button
                  onClick={() => onBook(worker.id)}
                  className="flex items-center gap-1.5 bg-[#0284c7] text-white px-3.5 py-1.5 rounded-lg text-xs font-bold hover:bg-[#0369a1] transition shadow-sm"
                >
                  <CalendarPlus className="w-3.5 h-3.5" /> Rebook
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function SavedWorkersPage() {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [savedWorkers, setSavedWorkers] = useState<SavedWorker[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.push("/login"); return; }
      setUserId(user.uid);

      const unsubSnap = onSnapshot(doc(db, "bookmarks", user.uid), async (docSnap) => {
        if (!docSnap.exists()) { setLoading(false); return; }
        const items: Record<string, { savedAt: number }> = docSnap.data().items || {};
        const workerIds = Object.keys(items);

        if (workerIds.length === 0) { setSavedWorkers([]); setLoading(false); return; }

        const workers = await Promise.all(
          workerIds.map(async (wid) => {
            const wSnap = await getDoc(doc(db, "workers", wid));
            if (!wSnap.exists()) return null;
            return {
              id: wid,
              ...wSnap.data(),
              savedAt: items[wid].savedAt,
            } as SavedWorker;
          })
        );

        const valid = workers.filter(Boolean) as SavedWorker[];
        valid.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
        setSavedWorkers(valid);
        setLoading(false);
      });

      return () => unsubSnap();
    });
    return () => unsub();
  }, [router]);

  const handleUnsave = async (workerId: string) => {
    if (!userId) return;
    try {
      const ref = doc(db, "bookmarks", userId);
      const snap = await getDoc(ref);
      if (!snap.exists()) return;
      const items = { ...snap.data().items };
      delete items[workerId];
      await updateDoc(ref, { items });
      setSavedWorkers(prev => prev.filter(w => w.id !== workerId));
      toast.success("Worker removed from saved list.", {
        style: { border: "1px solid #fecaca", background: "#fff", color: "#264653" },
      });
    } catch {
      toast.error("Failed to remove worker.");
    }
  };

  const handleBook = (workerId: string) => router.push(`/client/book?worker=${workerId}`);
  const handleMessage = (workerId: string) => router.push(`/client/messages?worker=${workerId}`);

  const categories = ["all", ...Array.from(new Set(savedWorkers.map(w => w.category || "other")))];

  const filtered = savedWorkers.filter(w => {
    const matchSearch = !search || [w.fullName, w.service, w.location].some(f => f?.toLowerCase().includes(search.toLowerCase()));
    const matchCat = filterCat === "all" || w.category === filterCat;
    return matchSearch && matchCat;
  });

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Toaster position="top-center" />
      <ClientSidebar />

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full [&>aside]:flex"><ClientSidebar /></div>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="lg:hidden bg-white border-b border-gray-100 px-4 h-14 flex items-center justify-between shrink-0 shadow-sm">
          <button onClick={() => setMobileOpen(true)} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100">
            <Menu className="w-5 h-5 text-[#0c4a6e]" />
          </button>
          <span className="text-base font-bold text-[#0c4a6e]">Saved Workers</span>
          <div className="w-9" />
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-5xl mx-auto space-y-6">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-[#0c4a6e]">Saved Workers</h1>
                <p className="text-xs text-gray-400 mt-0.5">
                  {savedWorkers.length} worker{savedWorkers.length !== 1 ? "s" : ""} saved
                </p>
              </div>
              <Link
                href="/client/book"
                className="inline-flex items-center gap-2 bg-[#0284c7] text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#0369a1] transition shadow-md self-start sm:self-auto"
              >
                <Search className="w-4 h-4" /> Find More Workers
              </Link>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search saved workers…"
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>

            {/* Category filter pills */}
            {categories.length > 1 && (
              <div className="flex gap-2 flex-wrap">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setFilterCat(cat)}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold capitalize transition ${
                      filterCat === cat
                        ? "bg-[#0284c7] text-white shadow-sm"
                        : "bg-white border border-gray-200 text-gray-500 hover:border-gray-300"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

            {/* Content */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
                    <div className="h-40 bg-gray-100" />
                    <div className="p-4 space-y-3">
                      <div className="h-3 bg-gray-100 rounded w-3/4" />
                      <div className="h-2.5 bg-gray-100 rounded w-1/2" />
                      <div className="h-8 bg-gray-100 rounded-xl" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filtered.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {filtered.map(worker => (
                  <WorkerCard
                    key={worker.id}
                    worker={worker}
                    onUnsave={handleUnsave}
                    onBook={handleBook}
                    onMessage={handleMessage}
                  />
                ))}
              </div>
            ) : savedWorkers.length === 0 ? (
              /* No saved workers at all */
              <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-14 text-center">
                <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
                  <Heart className="w-8 h-8 text-red-300" />
                </div>
                <h3 className="text-base font-bold text-gray-400 mb-1">No saved workers yet</h3>
                <p className="text-sm text-gray-300 mb-5 max-w-xs mx-auto">
                  Save workers you like by tapping the heart icon on their profile. Easily rebook them anytime.
                </p>
                <Link
                  href="/client/book"
                  className="inline-flex items-center gap-2 bg-[#0284c7] text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-[#0369a1] transition"
                >
                  <Search className="w-4 h-4" /> Find Workers
                </Link>
              </div>
            ) : (
              /* Search returned nothing */
              <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center">
                <Search className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-400">No workers match your search</p>
                <button onClick={() => { setSearch(""); setFilterCat("all"); }} className="mt-3 text-xs text-[#0284c7] font-semibold hover:underline">
                  Clear filters
                </button>
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}