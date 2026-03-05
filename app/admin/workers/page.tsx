"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Search, Eye, Ban, CheckCircle2, XCircle, Star,
  Briefcase, Shield, ChevronLeft, ChevronRight,
  BadgeCheck, Clock, AlertTriangle, Wallet
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { db, auth } from "@/lib/firebase";
import {
  collection, query, where, onSnapshot,
  doc, updateDoc, addDoc, serverTimestamp
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import AdminSidebar from "@/components/admin/AdminSidebar";
import toast, { Toaster } from "react-hot-toast";

interface Worker {
  id: string;
  displayName?: string;
  email?: string;
  phone?: string;
  skills?: string[];
  rating?: number;
  totalJobs?: number;
  totalEarnings?: number;
  status?: "active" | "suspended";
  verified?: boolean;
  verificationStatus?: "pending" | "approved" | "rejected" | "none";
  createdAt?: { seconds: number };
  location?: string;
  bio?: string;
  idUrl?: string;
  selfieUrl?: string;
  walletBalance?: number;
}

function fmt(s?: number) {
  if (!s) return "—";
  return new Date(s * 1000).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

function getInitials(name: string) {
  return (name || "W").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}
const COLORS = ["bg-blue-500","bg-emerald-500","bg-violet-500","bg-orange-500","bg-rose-500","bg-cyan-500"];
function avatarColor(name: string) { return COLORS[(name || "W").charCodeAt(0) % COLORS.length]; }

function WorkerModal({ worker, onClose, onAction }: {
  worker: Worker; onClose: () => void;
  onAction: (id: string, action: "approve" | "reject" | "suspend" | "unsuspend") => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-[#10b981] to-[#059669] p-6 text-white shrink-0">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 ${avatarColor(worker.displayName || "")} rounded-2xl flex items-center justify-center text-white text-lg font-bold border-2 border-white/30`}>
              {getInitials(worker.displayName || "W")}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg">{worker.displayName || "Unknown"}</h3>
                {worker.verified && <BadgeCheck className="w-4 h-4 text-white" />}
              </div>
              <p className="text-green-100 text-sm">{worker.email}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-[#0f172a]">{worker.totalJobs || 0}</p>
              <p className="text-[10px] text-gray-400 font-semibold uppercase">Jobs</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-[#0f172a]">{worker.rating?.toFixed(1) || "—"}</p>
              <p className="text-[10px] text-gray-400 font-semibold uppercase">Rating</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-[#0f172a]">₦{(worker.walletBalance || 0).toLocaleString()}</p>
              <p className="text-[10px] text-gray-400 font-semibold uppercase">Balance</p>
            </div>
          </div>

          {worker.skills && worker.skills.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {worker.skills.map(s => (
                  <span key={s} className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full font-medium">{s}</span>
                ))}
              </div>
            </div>
          )}

          {worker.bio && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Bio</p>
              <p className="text-sm text-gray-600 leading-relaxed">{worker.bio}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Verification</p>
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                worker.verificationStatus === "approved" ? "bg-emerald-100 text-emerald-700" :
                worker.verificationStatus === "pending" ? "bg-yellow-100 text-yellow-700" :
                worker.verificationStatus === "rejected" ? "bg-red-100 text-red-600" :
                "bg-gray-100 text-gray-500"
              }`}>{worker.verificationStatus || "none"}</span>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Account</p>
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${worker.status === "suspended" ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-700"}`}>
                {worker.status === "suspended" ? "Suspended" : "Active"}
              </span>
            </div>
          </div>

          {/* Verification docs */}
          {(worker.idUrl || worker.selfieUrl) && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Verification Docs</p>
              <div className="flex gap-2">
                {worker.idUrl && (
                  <a href={worker.idUrl} target="_blank" rel="noopener noreferrer"
                    className="flex-1 py-2 bg-blue-50 border border-blue-200 rounded-xl text-xs font-bold text-[#0284c7] text-center hover:bg-blue-100 transition">
                    View ID
                  </a>
                )}
                {worker.selfieUrl && (
                  <a href={worker.selfieUrl} target="_blank" rel="noopener noreferrer"
                    className="flex-1 py-2 bg-blue-50 border border-blue-200 rounded-xl text-xs font-bold text-[#0284c7] text-center hover:bg-blue-100 transition">
                    View Selfie
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-100 flex flex-wrap gap-2 shrink-0">
          {worker.verificationStatus === "pending" && (
            <>
              <button onClick={() => { onAction(worker.id, "approve"); onClose(); }}
                className="flex-1 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-bold hover:bg-emerald-600 transition">
                ✓ Approve
              </button>
              <button onClick={() => { onAction(worker.id, "reject"); onClose(); }}
                className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition">
                ✗ Reject
              </button>
            </>
          )}
          <button onClick={() => { onAction(worker.id, worker.status === "suspended" ? "unsuspend" : "suspend"); onClose(); }}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition ${
              worker.status === "suspended" ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-red-100 text-red-600 hover:bg-red-200"
            }`}>
            {worker.status === "suspended" ? "Unsuspend" : "Suspend"}
          </button>
          <button onClick={onClose} className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-200 transition">
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

const PAGE_SIZE = 20;

export default function AdminWorkersPage() {
  const router = useRouter();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [filtered, setFiltered] = useState<Worker[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<Worker | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => { if (!user) router.push("/admin/login"); });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    const q = query(collection(db, "users"), where("role", "==", "worker"));
    const unsub = onSnapshot(q, snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Worker));
      data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setWorkers(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    let result = workers;
    if (search) result = result.filter(w =>
      w.displayName?.toLowerCase().includes(search.toLowerCase()) ||
      w.email?.toLowerCase().includes(search.toLowerCase()) ||
      w.skills?.some(s => s.toLowerCase().includes(search.toLowerCase()))
    );
    if (filter === "pending") result = result.filter(w => w.verificationStatus === "pending");
    else if (filter === "verified") result = result.filter(w => w.verified);
    else if (filter === "suspended") result = result.filter(w => w.status === "suspended");
    setFiltered(result);
    setPage(0);
  }, [workers, search, filter]);

  const handleAction = async (id: string, action: "approve" | "reject" | "suspend" | "unsuspend") => {
    const ref = doc(db, "users", id);
    const worker = workers.find(w => w.id === id);
    if (!worker) return;

    if (action === "approve") {
      await updateDoc(ref, { verified: true, verificationStatus: "approved", updatedAt: serverTimestamp() });
      await addDoc(collection(db, "notifications"), {
        userId: id, type: "verification",
        title: "Identity Verified ✅",
        body: "Your identity has been verified. You can now receive jobs on SkillBridge.",
        link: "/worker/dashboard", read: false, createdAt: serverTimestamp(),
      });
      toast.success("Worker verified");
    } else if (action === "reject") {
      await updateDoc(ref, { verificationStatus: "rejected", updatedAt: serverTimestamp() });
      await addDoc(collection(db, "notifications"), {
        userId: id, type: "verification",
        title: "Verification Rejected",
        body: "Your verification was rejected. Please re-submit with clear documents.",
        link: "/worker/verification", read: false, createdAt: serverTimestamp(),
      });
      toast.success("Verification rejected");
    } else if (action === "suspend") {
      await updateDoc(ref, { status: "suspended", updatedAt: serverTimestamp() });
      toast.success("Worker suspended");
    } else {
      await updateDoc(ref, { status: "active", updatedAt: serverTimestamp() });
      toast.success("Worker unsuspended");
    }
  };

  const pendingCount = workers.filter(w => w.verificationStatus === "pending").length;
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <AdminSidebar />
      <Toaster position="top-right" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-100 px-6 py-4 shrink-0">
          <div className="pl-10 lg:pl-0 flex items-center gap-3">
            <div>
              <h1 className="text-lg font-bold text-[#0f172a]">Workers</h1>
              <p className="text-xs text-gray-400">{workers.length} registered workers</p>
            </div>
            {pendingCount > 0 && (
              <span className="bg-yellow-100 text-yellow-700 text-xs font-bold px-2.5 py-1 rounded-full border border-yellow-200">
                {pendingCount} pending verification
              </span>
            )}
          </div>
        </header>

        <div className="p-4 bg-white border-b border-gray-100 flex flex-wrap gap-3 shrink-0">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, email, skill…"
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#10b981]" />
          </div>
          <select value={filter} onChange={e => setFilter(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#10b981]">
            <option value="all">All Workers</option>
            <option value="pending">Pending Verification</option>
            <option value="verified">Verified</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>

        <main className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="space-y-2">{[...Array(8)].map((_, i) => <div key={i} className="bg-white rounded-xl p-4 animate-pulse h-16 border border-gray-100" />)}</div>
          ) : paginated.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <Briefcase className="w-10 h-10 text-gray-200 mb-3" />
              <p className="text-sm text-gray-400">No workers found</p>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                <div className="hidden md:grid grid-cols-[2fr_2fr_1fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3 bg-gray-50 text-[11px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                  <span>Name</span><span>Skills</span><span>Joined</span>
                  <span>Jobs</span><span>Rating</span><span>Status</span><span></span>
                </div>
                <div className="divide-y divide-gray-50">
                  {paginated.map(worker => (
                    <div key={worker.id} className="flex md:grid md:grid-cols-[2fr_2fr_1fr_1fr_1fr_1fr_auto] items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-8 h-8 ${avatarColor(worker.displayName || "")} rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                          {getInitials(worker.displayName || "W")}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="text-sm font-semibold text-[#0f172a] truncate">{worker.displayName || "—"}</span>
                            {worker.verified && <BadgeCheck className="w-3 h-3 text-[#10b981] shrink-0" />}
                          </div>
                          <span className="text-xs text-gray-400 hidden md:block">{worker.email}</span>
                        </div>
                      </div>
                      <div className="hidden md:flex flex-wrap gap-1">
                        {(worker.skills || []).slice(0, 2).map(s => (
                          <span key={s} className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-md font-medium">{s}</span>
                        ))}
                        {(worker.skills?.length || 0) > 2 && (
                          <span className="text-[10px] text-gray-400">+{(worker.skills?.length || 0) - 2}</span>
                        )}
                      </div>
                      <span className="hidden md:block text-xs text-gray-400">{fmt(worker.createdAt?.seconds)}</span>
                      <span className="hidden md:block text-sm font-semibold text-[#0f172a]">{worker.totalJobs || 0}</span>
                      <span className="hidden md:flex items-center gap-1 text-sm font-semibold text-amber-500">
                        {worker.rating ? <><Star className="w-3 h-3 fill-amber-400 text-amber-400" />{worker.rating.toFixed(1)}</> : "—"}
                      </span>
                      <div className="hidden md:flex flex-col gap-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full w-fit ${
                          worker.verificationStatus === "approved" ? "bg-emerald-100 text-emerald-700" :
                          worker.verificationStatus === "pending" ? "bg-yellow-100 text-yellow-700" :
                          worker.verificationStatus === "rejected" ? "bg-red-100 text-red-600" :
                          "bg-gray-100 text-gray-500"
                        }`}>{worker.verificationStatus || "unverified"}</span>
                        {worker.status === "suspended" && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full w-fit bg-red-100 text-red-600">Suspended</span>}
                      </div>
                      <button onClick={() => setSelected(worker)}
                        className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200 transition ml-auto">
                        <Eye className="w-3.5 h-3.5 text-gray-500" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 px-1">
                  <p className="text-xs text-gray-400">{filtered.length} workers · Page {page + 1} of {totalPages}</p>
                  <div className="flex gap-2">
                    <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                      className="w-8 h-8 bg-white border border-gray-200 rounded-lg flex items-center justify-center disabled:opacity-40 hover:bg-gray-50 transition">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}
                      className="w-8 h-8 bg-white border border-gray-200 rounded-lg flex items-center justify-center disabled:opacity-40 hover:bg-gray-50 transition">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      <AnimatePresence>
        {selected && <WorkerModal worker={selected} onClose={() => setSelected(null)} onAction={handleAction} />}
      </AnimatePresence>
    </div>
  );
}