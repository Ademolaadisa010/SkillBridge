"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Inbox, MapPin, Send, X, Menu, Search, Calendar,
  Image as ImageIcon, Loader2, Zap
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { db, auth } from "@/lib/firebase";
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import WorkerSidebar from "@/components/sidebar/WorkerSidebar";
import toast, { Toaster } from "react-hot-toast";

interface JobRequest { id: string; clientId?: string; clientName?: string; service?: string; category?: string; description: string; address: string; date: string; urgency?: string; imageCount?: number; status: string; createdAt?: { seconds: number }; }

const CAT_COLOR: Record<string, string> = { plumbing: "bg-blue-100 text-blue-700", electrical: "bg-yellow-100 text-yellow-700", carpentry: "bg-orange-100 text-orange-700", painting: "bg-green-100 text-green-700", mechanics: "bg-red-100 text-red-700", other: "bg-gray-100 text-gray-600" };

function timeAgo(s?: number) { if (!s) return ""; const d = (Date.now() - s * 1000); if (d < 3600000) return `${Math.floor(d / 60000)}m ago`; if (d < 86400000) return `${Math.floor(d / 3600000)}h ago`; return `${Math.floor(d / 86400000)}d ago`; }

function OfferModal({ job, onClose, onSubmit }: { job: JobRequest; onClose: () => void; onSubmit: (price: number, msg: string) => Promise<void>; }) {
  const [price, setPrice] = useState(""); const [message, setMessage] = useState(""); const [submitting, setSubmitting] = useState(false);
  const ok = price && Number(price) > 0 && message.length >= 20;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-[#10b981] to-[#059669] p-5 text-white flex items-start justify-between">
          <div><h3 className="font-bold text-base">Send Offer</h3><p className="text-green-100 text-xs mt-0.5">{job.service || job.category || "Service Request"}</p></div>
          <button onClick={onClose} className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center hover:bg-white/20 transition"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-gray-50 rounded-xl p-3.5">
            <p className="text-xs text-gray-500 line-clamp-3">{job.description}</p>
            <div className="flex gap-4 mt-2 text-xs text-gray-400">
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.address}</span>
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{job.date}</span>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Your Price (₦) *</label>
            <div className="relative"><span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">₦</span><input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="e.g. 5000" className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#10b981]" /></div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Message to Client *</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={4} placeholder="Describe your approach and why you're the right person for this job..." className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#10b981] resize-none" />
            <p className={`text-xs text-right ${message.length >= 20 ? "text-[#10b981]" : "text-gray-400"}`}>{message.length}/20 min</p>
          </div>
        </div>
        <div className="px-5 pb-5">
          <button onClick={async () => { setSubmitting(true); await onSubmit(Number(price), message); setSubmitting(false); }} disabled={!ok || submitting}
            className="w-full bg-[#10b981] text-white py-3 rounded-xl text-sm font-bold hover:bg-[#059669] transition disabled:opacity-40 flex items-center justify-center gap-2 shadow-md">
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : <><Send className="w-4 h-4" /> Send Offer</>}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function JobRequestsPage() {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [jobs, setJobs] = useState<JobRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [filterUrgency, setFilterUrgency] = useState("all");
  const [selected, setSelected] = useState<JobRequest | null>(null);
  const [userId, setUserId] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      if (!user) { router.push("/login"); return; }
      setUserId(user.uid);
      const q = query(collection(db, "jobs"), where("status", "==", "pending"));
      const unsubSnap = onSnapshot(q, snap => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as JobRequest)).filter(j => j.clientId !== user.uid);
        data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setJobs(data); setLoading(false);
      });
      return () => unsubSnap();
    });
    return () => unsub();
  }, [router]);

  const handleOffer = async (price: number, message: string) => {
    if (!selected) return;
    try {
      await addDoc(collection(db, "offers"), { jobId: selected.id, workerId: userId, clientId: selected.clientId, price, message, status: "pending", createdAt: serverTimestamp() });
      toast.success("Offer sent! The client will review it shortly.", { iconTheme: { primary: "#10b981", secondary: "#fff" } });
      setSelected(null);
    } catch { toast.error("Failed to send offer."); }
  };

  const categories = ["all", ...Array.from(new Set(jobs.map(j => j.category || "other")))];
  const filtered = jobs.filter(j => {
    const s = search.toLowerCase();
    return (!search || [j.service, j.category, j.description, j.address].some(f => f?.toLowerCase().includes(s))) &&
      (filterCat === "all" || j.category === filterCat) &&
      (filterUrgency === "all" || j.urgency === filterUrgency);
  });

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Toaster position="top-center" />
      <WorkerSidebar />
      {mobileOpen && <div className="fixed inset-0 z-50 lg:hidden"><div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} /><div className="absolute left-0 top-0 h-full [&>aside]:flex"><WorkerSidebar /></div></div>}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="lg:hidden bg-white border-b border-gray-100 px-4 h-14 flex items-center justify-between shrink-0 shadow-sm">
          <button onClick={() => setMobileOpen(true)} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100"><Menu className="w-5 h-5 text-[#0c4a6e]" /></button>
          <span className="text-base font-bold text-[#0c4a6e]">Job Requests</span>
          <div className="w-9" />
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-4xl mx-auto space-y-6">
            <div>
              <h1 className="text-xl font-bold text-[#0c4a6e]">Job Requests</h1>
              <p className="text-xs text-gray-400 mt-0.5">{jobs.length} open request{jobs.length !== 1 ? "s" : ""}</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1"><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search description, location..." className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#10b981]" /></div>
              <select value={filterUrgency} onChange={e => setFilterUrgency(e.target.value)} className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#10b981] text-gray-600">
                <option value="all">All Urgency</option><option value="urgent">Urgent</option><option value="normal">Normal</option>
              </select>
            </div>

            {categories.length > 1 && (
              <div className="flex gap-2 flex-wrap">
                {categories.map(cat => <button key={cat} onClick={() => setFilterCat(cat)} className={`px-3.5 py-1.5 rounded-full text-xs font-semibold capitalize transition ${filterCat === cat ? "bg-[#10b981] text-white" : "bg-white border border-gray-200 text-gray-500 hover:border-gray-300"}`}>{cat}</button>)}
              </div>
            )}

            {loading ? (
              <div className="space-y-4">{[...Array(4)].map((_, i) => <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse"><div className="flex gap-3 mb-4"><div className="w-10 h-10 bg-gray-100 rounded-xl" /><div className="flex-1 space-y-2"><div className="h-3 bg-gray-100 rounded w-1/3" /><div className="h-2.5 bg-gray-100 rounded w-2/3" /></div></div><div className="h-8 bg-gray-100 rounded-xl" /></div>)}</div>
            ) : filtered.length > 0 ? (
              <div className="space-y-4">
                <AnimatePresence>
                  {filtered.map(job => (
                    <motion.div key={job.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition overflow-hidden">
                      <div className="p-5">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm shrink-0 ${CAT_COLOR[job.category || "other"]}`}><i className="fas fa-tools" /></div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <h3 className="text-sm font-bold text-[#0c4a6e]">{job.service || job.category || "Service Request"}</h3>
                                {job.urgency === "urgent" && <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-600"><Zap className="w-2.5 h-2.5" /> Urgent</span>}
                              </div>
                              <p className="text-xs text-gray-500 line-clamp-2">{job.description}</p>
                            </div>
                          </div>
                          <span className="text-[10px] text-gray-400 shrink-0">{timeAgo(job.createdAt?.seconds)}</span>
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-4">
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-gray-300" />{job.address}</span>
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3 text-gray-300" />{job.date}</span>
                          {(job.imageCount || 0) > 0 && <span className="flex items-center gap-1"><ImageIcon className="w-3 h-3 text-gray-300" />{job.imageCount} photo{(job.imageCount || 0) > 1 ? "s" : ""}</span>}
                        </div>
                        <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                          <span className="text-xs text-gray-400">{job.clientName || "Client"}</span>
                          <button onClick={() => setSelected(job)} className="flex items-center gap-2 bg-[#10b981] text-white px-5 py-2 rounded-xl text-xs font-bold hover:bg-[#059669] transition shadow-sm"><Send className="w-3.5 h-3.5" /> Send Offer</button>
                        </div>
                      </div>
                      <div className={`h-0.5 ${job.urgency === "urgent" ? "bg-orange-400" : "bg-[#10b981]/30"}`} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
                <Inbox className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                <h3 className="text-base font-bold text-gray-400 mb-1">No job requests found</h3>
                <p className="text-sm text-gray-300">New requests are posted regularly. Check back soon.</p>
              </div>
            )}
          </div>
        </main>
      </div>
      <AnimatePresence>{selected && <OfferModal job={selected} onClose={() => setSelected(null)} onSubmit={handleOffer} />}</AnimatePresence>
    </div>
  );
}