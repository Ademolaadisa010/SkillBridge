"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Inbox, MapPin, Send, X, Menu, Search, Calendar,
  Image as ImageIcon, Loader2, Zap, CheckCircle2,
  Clock, XCircle, MessageCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { db, auth } from "@/lib/firebase";
import {
  collection, query, where, onSnapshot, addDoc,
  serverTimestamp, doc, getDoc
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import WorkerSidebar from "@/components/sidebar/WorkerSidebar";
import Link from "next/link";
import toast, { Toaster } from "react-hot-toast";

// ─── Types ─────────────────────────────────────────────────────────────────────
interface JobRequest {
  id: string;
  clientId?: string;
  clientName?: string;
  service?: string;
  category?: string;
  description: string;
  address: string;
  date: string;
  urgency?: string;
  imageCount?: number;
  status: string;
  createdAt?: { seconds: number };
}

interface MyOffer {
  id: string;
  jobId: string;
  clientId?: string;
  clientName?: string;
  price: number;
  message: string;
  status: "pending" | "accepted" | "rejected";
  service?: string;
  address?: string;
  date?: string;
  createdAt?: { seconds: number };
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
const CAT_COLOR: Record<string, string> = {
  plumbing: "bg-blue-100 text-blue-700",
  electrical: "bg-yellow-100 text-yellow-700",
  carpentry: "bg-orange-100 text-orange-700",
  painting: "bg-green-100 text-green-700",
  mechanics: "bg-red-100 text-red-700",
  other: "bg-gray-100 text-gray-600",
};

function timeAgo(s?: number) {
  if (!s) return "";
  const d = Date.now() - s * 1000;
  if (d < 3600000) return `${Math.floor(d / 60000)}m ago`;
  if (d < 86400000) return `${Math.floor(d / 3600000)}h ago`;
  return `${Math.floor(d / 86400000)}d ago`;
}

// ─── Offer Status Badge ─────────────────────────────────────────────────────────
function OfferBadge({ status }: { status: MyOffer["status"] }) {
  const map = {
    pending:  { cls: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: <Clock className="w-3 h-3" />,        label: "Pending" },
    accepted: { cls: "bg-green-100 text-[#10b981] border-green-200",   icon: <CheckCircle2 className="w-3 h-3" />, label: "Accepted!" },
    rejected: { cls: "bg-gray-100 text-gray-500 border-gray-200",      icon: <XCircle className="w-3 h-3" />,      label: "Declined" },
  };
  const { cls, icon, label } = map[status];
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border ${cls}`}>
      {icon}{label}
    </span>
  );
}

// ─── Send Offer Modal ───────────────────────────────────────────────────────────
function OfferModal({ job, onClose, onSubmit }: {
  job: JobRequest;
  onClose: () => void;
  onSubmit: (price: number, msg: string) => Promise<void>;
}) {
  const [price, setPrice] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const ok = price && Number(price) > 0 && message.length >= 20;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-[#10b981] to-[#059669] p-5 text-white flex items-start justify-between">
          <div>
            <h3 className="font-bold text-base">Send Offer</h3>
            <p className="text-green-100 text-xs mt-0.5">{job.service || job.category || "Service Request"}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center hover:bg-white/20 transition">
            <X className="w-4 h-4" />
          </button>
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
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">₦</span>
              <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="e.g. 5000"
                className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#10b981]" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Message to Client *</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={4}
              placeholder="Describe your approach and why you're the right person for this job..."
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#10b981] resize-none" />
            <p className={`text-xs text-right ${message.length >= 20 ? "text-[#10b981]" : "text-gray-400"}`}>
              {message.length}/20 min
            </p>
          </div>
        </div>
        <div className="px-5 pb-5">
          <button onClick={async () => { setSubmitting(true); await onSubmit(Number(price), message); setSubmitting(false); }}
            disabled={!ok || submitting}
            className="w-full bg-[#10b981] text-white py-3 rounded-xl text-sm font-bold hover:bg-[#059669] transition disabled:opacity-40 flex items-center justify-center gap-2 shadow-md">
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : <><Send className="w-4 h-4" /> Send Offer</>}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── My Offer Card ──────────────────────────────────────────────────────────────
function MyOfferCard({ offer }: { offer: MyOffer }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border-2 p-4 transition ${
        offer.status === "accepted" ? "border-[#10b981] bg-[#f0fdf4]"
        : offer.status === "rejected" ? "border-gray-100 bg-gray-50"
        : "border-gray-100 bg-white"
      }`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-[#0c4a6e] truncate">{offer.service || "Service Job"}</p>
          <div className="flex items-center gap-2 mt-1 text-xs text-gray-400 flex-wrap">
            {offer.address && <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-gray-300" />{offer.address}</span>}
            {offer.date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3 text-gray-300" />{offer.date}</span>}
            <span>{timeAgo(offer.createdAt?.seconds)}</span>
          </div>
        </div>
        <OfferBadge status={offer.status} />
      </div>

      {/* Price + client */}
      <div className="bg-gray-50 rounded-xl px-4 py-3 mb-3 flex items-center justify-between">
        <div>
          <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-0.5">Your Offer</p>
          <p className="text-lg font-bold text-[#0c4a6e]">₦{offer.price.toLocaleString()}</p>
        </div>
        {offer.clientName && (
          <div className="text-right">
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-0.5">Client</p>
            <p className="text-xs font-semibold text-[#0c4a6e]">{offer.clientName}</p>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-3 italic">"{offer.message}"</p>

      {offer.status === "accepted" && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 bg-[#dcfce7] border border-green-200 rounded-xl px-3 py-2.5">
            <CheckCircle2 className="w-4 h-4 text-[#10b981] shrink-0" />
            <p className="text-xs text-[#047857] font-semibold">
              Client accepted your offer! Go to My Jobs to get started.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/worker/my-jobs"
              className="flex-1 bg-[#10b981] text-white py-2.5 rounded-xl text-xs font-bold hover:bg-[#059669] transition flex items-center justify-center gap-2 shadow-sm">
              <CheckCircle2 className="w-3.5 h-3.5" /> View in My Jobs
            </Link>
            {offer.clientId && (
              <Link href={`/worker/messages?client=${offer.clientId}`}
                className="w-10 h-10 bg-[#f0fdf4] text-[#10b981] rounded-xl flex items-center justify-center hover:bg-[#dcfce7] transition shrink-0"
                title="Message client">
                <MessageCircle className="w-4 h-4" />
              </Link>
            )}
          </div>
        </div>
      )}

      {offer.status === "pending" && (
        <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-100 rounded-xl px-3 py-2.5">
          <Clock className="w-4 h-4 text-yellow-500 shrink-0" />
          <p className="text-xs text-yellow-700 font-medium">Awaiting client review. You'll be notified when they respond.</p>
        </div>
      )}

      {offer.status === "rejected" && (
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5">
          <XCircle className="w-4 h-4 text-gray-400 shrink-0" />
          <p className="text-xs text-gray-500">Client chose a different worker. Keep sending offers!</p>
        </div>
      )}
    </motion.div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────────
export default function JobRequestsPage() {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"browse" | "my-offers">("browse");

  // Browse state
  const [jobs, setJobs] = useState<JobRequest[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [filterUrgency, setFilterUrgency] = useState("all");
  const [selected, setSelected] = useState<JobRequest | null>(null);
  const [userId, setUserId] = useState("");
  const [alreadyApplied, setAlreadyApplied] = useState<Set<string>>(new Set());

  // My Offers state
  const [myOffers, setMyOffers] = useState<MyOffer[]>([]);
  const [loadingOffers, setLoadingOffers] = useState(true);
  const [offerFilter, setOfferFilter] = useState<"all" | "pending" | "accepted" | "rejected">("all");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      if (!user) { router.push("/login"); return; }
      setUserId(user.uid);

      // All pending jobs (excluding own)
      const jobQ = query(collection(db, "jobs"), where("status", "==", "pending"));
      const unsubJobs = onSnapshot(jobQ, snap => {
        const data = snap.docs
          .map(d => ({ id: d.id, ...d.data() } as JobRequest))
          .filter(j => j.clientId !== user.uid);
        data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setJobs(data);
        setLoadingJobs(false);
      });

      // This worker's offers — enrich with job details
      const offerQ = query(collection(db, "offers"), where("workerId", "==", user.uid));
      const unsubOffers = onSnapshot(offerQ, async snap => {
        const raw = snap.docs.map(d => ({ id: d.id, ...d.data() } as MyOffer));

        // Track which jobs this worker already applied to
        setAlreadyApplied(new Set(raw.map(o => o.jobId)));

        // Fetch job details for each offer
        const enriched = await Promise.all(
          raw.map(async offer => {
            try {
              const jobSnap = await getDoc(doc(db, "jobs", offer.jobId));
              if (jobSnap.exists()) {
                const j = jobSnap.data();
                return {
                  ...offer,
                  service:    j.service || j.category || "Service Job",
                  address:    j.address || "",
                  date:       j.date || "",
                  clientName: j.clientName || "",
                  clientId:   offer.clientId || j.clientId,
                };
              }
            } catch {}
            return offer;
          })
        );

        enriched.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setMyOffers(enriched);
        setLoadingOffers(false);
      });

      return () => { unsubJobs(); unsubOffers(); };
    });
    return () => unsub();
  }, [router]);

  const handleOffer = async (price: number, message: string) => {
    if (!selected) return;
    try {
      await addDoc(collection(db, "offers"), {
        jobId:      selected.id,
        workerId:   userId,
        clientId:   selected.clientId,
        price,
        message,
        status:     "pending",
        workerName: auth.currentUser?.displayName || "A worker",
        service:    selected.service || selected.category || "Service",
        createdAt:  serverTimestamp(),
      });

      // Notify client
      if (selected.clientId) {
        await addDoc(collection(db, "notifications"), {
          userId:    selected.clientId,
          type:      "booking",
          title:     "New offer on your request",
          body:      `${auth.currentUser?.displayName || "A worker"} sent an offer of ₦${price.toLocaleString()} for "${selected.service || selected.category || "your request"}"`,
          link:      `/client/bookings?booking=${selected.id}&tab=offers`,
          read:      false,
          createdAt: serverTimestamp(),
        });
      }

      toast.success("Offer sent! You'll be notified when the client responds.", {
        iconTheme: { primary: "#10b981", secondary: "#fff" },
      });
      setSelected(null);
      setActiveTab("my-offers"); // Auto-switch so worker sees their offer
    } catch {
      toast.error("Failed to send offer. Please try again.");
    }
  };

  const categories = ["all", ...Array.from(new Set(jobs.map(j => j.category || "other")))];
  const filtered = jobs.filter(j => {
    const s = search.toLowerCase();
    return (
      (!search || [j.service, j.category, j.description, j.address].some(f => f?.toLowerCase().includes(s))) &&
      (filterCat === "all" || j.category === filterCat) &&
      (filterUrgency === "all" || j.urgency === filterUrgency)
    );
  });

  const filteredOffers = offerFilter === "all" ? myOffers : myOffers.filter(o => o.status === offerFilter);
  const offerCounts = {
    all:      myOffers.length,
    pending:  myOffers.filter(o => o.status === "pending").length,
    accepted: myOffers.filter(o => o.status === "accepted").length,
    rejected: myOffers.filter(o => o.status === "rejected").length,
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Toaster position="top-center" />
      <WorkerSidebar />

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full [&>aside]:flex"><WorkerSidebar /></div>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="lg:hidden bg-white border-b border-gray-100 px-4 h-14 flex items-center justify-between shrink-0 shadow-sm">
          <button onClick={() => setMobileOpen(true)} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100">
            <Menu className="w-5 h-5 text-[#0c4a6e]" />
          </button>
          <span className="text-base font-bold text-[#0c4a6e]">Job Requests</span>
          <div className="w-9" />
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-4xl mx-auto space-y-6">

            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-[#0c4a6e]">Job Requests</h1>
                <p className="text-xs text-gray-400 mt-0.5">{jobs.length} open · {myOffers.length} applied</p>
              </div>
              {offerCounts.accepted > 0 && (
                <Link href="/worker/my-jobs"
                  className="inline-flex items-center gap-2 bg-[#10b981] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#059669] transition shadow-sm">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {offerCounts.accepted} accepted job{offerCounts.accepted > 1 ? "s" : ""}
                </Link>
              )}
            </div>

            {/* Main tabs */}
            <div className="flex gap-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-1.5">
              <button onClick={() => setActiveTab("browse")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition ${activeTab === "browse" ? "bg-[#10b981] text-white shadow-sm" : "text-gray-500 hover:bg-gray-50"}`}>
                <Inbox className="w-4 h-4" />
                Browse Jobs
                {jobs.length > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === "browse" ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"}`}>
                    {jobs.length}
                  </span>
                )}
              </button>
              <button onClick={() => setActiveTab("my-offers")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition ${activeTab === "my-offers" ? "bg-[#10b981] text-white shadow-sm" : "text-gray-500 hover:bg-gray-50"}`}>
                <Send className="w-4 h-4" />
                My Offers
                {myOffers.length > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    activeTab === "my-offers" ? "bg-white/20 text-white"
                    : offerCounts.accepted > 0 ? "bg-[#10b981] text-white"
                    : "bg-gray-100 text-gray-500"
                  }`}>
                    {myOffers.length}
                  </span>
                )}
              </button>
            </div>

            {/* ── BROWSE TAB ── */}
            {activeTab === "browse" && (
              <>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                      placeholder="Search description, location..."
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#10b981]" />
                  </div>
                  <select value={filterUrgency} onChange={e => setFilterUrgency(e.target.value)}
                    className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#10b981] text-gray-600">
                    <option value="all">All Urgency</option>
                    <option value="urgent">Urgent</option>
                    <option value="normal">Normal</option>
                  </select>
                </div>

                {categories.length > 1 && (
                  <div className="flex gap-2 flex-wrap">
                    {categories.map(cat => (
                      <button key={cat} onClick={() => setFilterCat(cat)}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-semibold capitalize transition ${filterCat === cat ? "bg-[#10b981] text-white" : "bg-white border border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                        {cat}
                      </button>
                    ))}
                  </div>
                )}

                {loadingJobs ? (
                  <div className="space-y-4">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
                        <div className="flex gap-3 mb-4">
                          <div className="w-10 h-10 bg-gray-100 rounded-xl" />
                          <div className="flex-1 space-y-2"><div className="h-3 bg-gray-100 rounded w-1/3" /><div className="h-2.5 bg-gray-100 rounded w-2/3" /></div>
                        </div>
                        <div className="h-8 bg-gray-100 rounded-xl" />
                      </div>
                    ))}
                  </div>
                ) : filtered.length > 0 ? (
                  <div className="space-y-4">
                    <AnimatePresence>
                      {filtered.map(job => {
                        const applied = alreadyApplied.has(job.id);
                        return (
                          <motion.div key={job.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition overflow-hidden">
                            <div className="p-5">
                              <div className="flex items-start justify-between gap-3 mb-3">
                                <div className="flex items-start gap-3 flex-1 min-w-0">
                                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm shrink-0 ${CAT_COLOR[job.category || "other"]}`}>
                                    <i className="fas fa-tools" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                      <h3 className="text-sm font-bold text-[#0c4a6e]">{job.service || job.category || "Service Request"}</h3>
                                      {job.urgency === "urgent" && (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-600">
                                          <Zap className="w-2.5 h-2.5" /> Urgent
                                        </span>
                                      )}
                                      {applied && (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#dcfce7] text-[#10b981]">
                                          <CheckCircle2 className="w-2.5 h-2.5" /> Applied
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs text-gray-500 line-clamp-2">{job.description}</p>
                                  </div>
                                </div>
                                <span className="text-[10px] text-gray-400 shrink-0">{timeAgo(job.createdAt?.seconds)}</span>
                              </div>

                              <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-4">
                                <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-gray-300" />{job.address}</span>
                                <span className="flex items-center gap-1"><Calendar className="w-3 h-3 text-gray-300" />{job.date}</span>
                                {(job.imageCount || 0) > 0 && (
                                  <span className="flex items-center gap-1">
                                    <ImageIcon className="w-3 h-3 text-gray-300" />
                                    {job.imageCount} photo{(job.imageCount || 0) > 1 ? "s" : ""}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                                <span className="text-xs text-gray-400">{job.clientName || "Client"}</span>
                                {applied ? (
                                  <button onClick={() => setActiveTab("my-offers")}
                                    className="flex items-center gap-2 bg-[#dcfce7] text-[#10b981] px-4 py-2 rounded-xl text-xs font-bold transition hover:bg-[#bbf7d0]">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> View Your Offer
                                  </button>
                                ) : (
                                  <button onClick={() => setSelected(job)}
                                    className="flex items-center gap-2 bg-[#10b981] text-white px-5 py-2 rounded-xl text-xs font-bold hover:bg-[#059669] transition shadow-sm">
                                    <Send className="w-3.5 h-3.5" /> Send Offer
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className={`h-0.5 ${job.urgency === "urgent" ? "bg-orange-400" : applied ? "bg-[#10b981]" : "bg-[#10b981]/30"}`} />
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
                    <Inbox className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                    <h3 className="text-base font-bold text-gray-400 mb-1">No job requests found</h3>
                    <p className="text-sm text-gray-300">New requests are posted regularly. Check back soon.</p>
                  </div>
                )}
              </>
            )}

            {/* ── MY OFFERS TAB ── */}
            {activeTab === "my-offers" && (
              <>
                {/* Summary stats */}
                {myOffers.length > 0 && (
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Pending",  count: offerCounts.pending,  cls: "bg-yellow-50 border-yellow-100 text-yellow-700" },
                      { label: "Accepted", count: offerCounts.accepted, cls: "bg-[#f0fdf4] border-green-200 text-[#10b981]" },
                      { label: "Declined", count: offerCounts.rejected, cls: "bg-gray-50 border-gray-200 text-gray-500" },
                    ].map(s => (
                      <div key={s.label} className={`border-2 rounded-2xl p-3 text-center ${s.cls}`}>
                        <p className="text-2xl font-bold">{s.count}</p>
                        <p className="text-xs font-semibold mt-0.5">{s.label}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Filter pills */}
                {myOffers.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {(["all", "pending", "accepted", "rejected"] as const).map(f => (
                      <button key={f} onClick={() => setOfferFilter(f)}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-semibold capitalize transition ${offerFilter === f ? "bg-[#10b981] text-white" : "bg-white border border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                        {f === "rejected" ? "Declined" : f}
                        {offerCounts[f] > 0 && (
                          <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${offerFilter === f ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"}`}>
                            {offerCounts[f]}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {/* Offers list */}
                {loadingOffers ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse space-y-3">
                        <div className="h-4 bg-gray-100 rounded w-1/2" />
                        <div className="h-16 bg-gray-100 rounded-xl" />
                        <div className="h-10 bg-gray-100 rounded-xl" />
                      </div>
                    ))}
                  </div>
                ) : filteredOffers.length > 0 ? (
                  <div className="space-y-4">
                    <AnimatePresence>
                      {filteredOffers.map(offer => <MyOfferCard key={offer.id} offer={offer} />)}
                    </AnimatePresence>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
                    <Send className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                    <h3 className="text-base font-bold text-gray-400 mb-1">
                      {myOffers.length > 0 ? `No ${offerFilter === "rejected" ? "declined" : offerFilter} offers` : "No offers sent yet"}
                    </h3>
                    <p className="text-sm text-gray-300 mb-5">
                      {myOffers.length > 0 ? "Try a different filter above" : "Browse open jobs and send your first offer to get hired"}
                    </p>
                    {myOffers.length === 0 && (
                      <button onClick={() => setActiveTab("browse")}
                        className="inline-flex items-center gap-2 bg-[#10b981] text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-[#059669] transition">
                        <Inbox className="w-4 h-4" /> Browse Jobs
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>

      <AnimatePresence>
        {selected && <OfferModal job={selected} onClose={() => setSelected(null)} onSubmit={handleOffer} />}
      </AnimatePresence>
    </div>
  );
}