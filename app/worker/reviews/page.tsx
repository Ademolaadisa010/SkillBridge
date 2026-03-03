"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Star, Menu, TrendingUp, MessageCircle, ThumbsUp, User, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import { db, auth } from "@/lib/firebase";
import { collection, query, where, onSnapshot, doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import WorkerSidebar from "@/components/sidebar/WorkerSidebar";

interface Review { id: string; clientId?: string; clientName?: string; jobId?: string; service?: string; rating: number; comment: string; createdAt?: { seconds: number }; }

function StarRating({ rating, size = "sm" }: { rating: number; size?: "sm" | "lg" }) {
  const s = size === "lg" ? "w-5 h-5" : "w-3.5 h-3.5";
  return <div className="flex gap-0.5">{[1,2,3,4,5].map(i => <Star key={i} className={`${s} ${i <= rating ? "text-yellow-400 fill-yellow-400" : "text-gray-200 fill-gray-200"}`} />)}</div>;
}

export default function ReviewsPage() {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [overallRating, setOverallRating] = useState(0);
  const [filter, setFilter] = useState(0);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async user => {
      if (!user) { router.push("/login"); return; }
      const q = query(collection(db, "reviews"), where("workerId", "==", user.uid));
      const unsubSnap = onSnapshot(q, snap => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Review)).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setReviews(data);
        setOverallRating(data.length ? Math.round((data.reduce((s, r) => s + r.rating, 0) / data.length) * 10) / 10 : 0);
        setLoading(false);
      });
      return () => unsubSnap();
    });
    return () => unsub();
  }, [router]);

  const DIST = [5,4,3,2,1].map(n => ({ rating: n, count: reviews.filter(r => r.rating === n).length }));
  const filtered = filter === 0 ? reviews : reviews.filter(r => r.rating === filter);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <WorkerSidebar />
      {mobileOpen && <div className="fixed inset-0 z-50 lg:hidden"><div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} /><div className="absolute left-0 top-0 h-full [&>aside]:flex"><WorkerSidebar /></div></div>}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="lg:hidden bg-white border-b border-gray-100 px-4 h-14 flex items-center justify-between shrink-0 shadow-sm">
          <button onClick={() => setMobileOpen(true)} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100"><Menu className="w-5 h-5 text-[#0c4a6e]" /></button>
          <span className="text-base font-bold text-[#0c4a6e]">Reviews</span>
          <div className="w-9" />
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-3xl mx-auto space-y-6">
            <div><h1 className="text-xl font-bold text-[#0c4a6e]">My Reviews</h1><p className="text-xs text-gray-400 mt-0.5">{reviews.length} review{reviews.length !== 1 ? "s" : ""} from clients</p></div>

            {/* Rating summary */}
            {reviews.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex flex-col sm:flex-row gap-6 items-start">
                  <div className="text-center sm:pr-6 sm:border-r sm:border-gray-100">
                    <p className="text-6xl font-bold text-[#0c4a6e] mb-2">{overallRating}</p>
                    <StarRating rating={Math.round(overallRating)} size="lg" />
                    <p className="text-xs text-gray-400 mt-2">{reviews.length} review{reviews.length !== 1 ? "s" : ""}</p>
                  </div>
                  <div className="flex-1 space-y-2 w-full">
                    {DIST.map(({ rating, count }) => (
                      <div key={rating} className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 w-4">{rating}</span>
                        <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400 shrink-0" />
                        <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div className="h-full bg-yellow-400 rounded-full transition-all" style={{ width: reviews.length ? `${(count / reviews.length) * 100}%` : "0%" }} />
                        </div>
                        <span className="text-xs text-gray-400 w-6 text-right">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Filter pills */}
            <div className="flex gap-2 flex-wrap">
              {[0,5,4,3,2,1].map(n => (
                <button key={n} onClick={() => setFilter(n)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition ${filter === n ? "bg-[#10b981] text-white" : "bg-white border border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                  {n === 0 ? "All" : <>{n} <Star className="w-3 h-3 fill-current" /></>}
                </button>
              ))}
            </div>

            {/* Reviews list */}
            {loading ? (
              <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse"><div className="flex gap-3 mb-3"><div className="w-10 h-10 bg-gray-100 rounded-full" /><div className="flex-1 space-y-2"><div className="h-3 bg-gray-100 rounded w-1/3" /><div className="h-2.5 bg-gray-100 rounded w-1/4" /></div></div><div className="h-12 bg-gray-100 rounded-xl" /></div>)}</div>
            ) : filtered.length > 0 ? (
              <div className="space-y-4">
                {filtered.map(review => (
                  <motion.div key={review.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#f5f3ff] rounded-full flex items-center justify-center shrink-0"><User className="w-5 h-5 text-[#7c3aed]" /></div>
                        <div><p className="text-sm font-bold text-[#0c4a6e]">{review.clientName || "Anonymous Client"}</p><p className="text-xs text-gray-400">{review.service || "Service"}</p></div>
                      </div>
                      <div className="text-right shrink-0">
                        <StarRating rating={review.rating} />
                        <p className="text-[10px] text-gray-400 mt-1">{review.createdAt ? new Date(review.createdAt.seconds * 1000).toLocaleDateString("en-NG", { month: "short", day: "numeric", year: "numeric" }) : "—"}</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-xl px-4 py-3">"{review.comment}"</p>
                    <div className="flex items-center gap-2 mt-3">
                      <button className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-[#10b981] transition"><ThumbsUp className="w-3.5 h-3.5" /> Helpful</button>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
                <Star className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                <h3 className="text-base font-bold text-gray-400 mb-1">{filter > 0 ? `No ${filter}-star reviews` : "No reviews yet"}</h3>
                <p className="text-sm text-gray-300">Complete jobs well and clients will leave you great reviews</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}