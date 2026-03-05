"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Search, Eye, Briefcase, MapPin, Calendar,
  Clock, CheckCircle2, XCircle, AlertTriangle,
  ChevronLeft, ChevronRight, User, CreditCard
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { db, auth } from "@/lib/firebase";
import { collection, onSnapshot, doc, updateDoc, serverTimestamp, orderBy, query } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import AdminSidebar from "@/components/admin/AdminSidebar";
import toast, { Toaster } from "react-hot-toast";

interface Job {
  id: string;
  service?: string;
  category?: string;
  description?: string;
  address?: string;
  date?: string;
  time?: string;
  urgency?: string;
  status: string;
  clientId?: string;
  clientName?: string;
  workerId?: string;
  workerName?: string;
  amount?: number;
  paymentStatus?: string;
  createdAt?: { seconds: number };
  completedAt?: { seconds: number };
}

function fmt(s?: number) {
  if (!s) return "—";
  return new Date(s * 1000).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

const STATUS_MAP: Record<string, { cls: string; label: string }> = {
  pending:      { cls: "bg-yellow-100 text-yellow-700",    label: "Pending" },
  "in-progress":{ cls: "bg-blue-100 text-[#0284c7]",      label: "In Progress" },
  completed:    { cls: "bg-emerald-100 text-emerald-700",  label: "Completed" },
  cancelled:    { cls: "bg-red-100 text-red-600",          label: "Cancelled" },
  disputed:     { cls: "bg-orange-100 text-orange-700",    label: "Disputed" },
};

function JobModal({ job, onClose, onCancel }: {
  job: Job; onClose: () => void; onCancel: (id: string) => void;
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
        <div className="bg-gradient-to-r from-violet-600 to-violet-700 p-5 text-white shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-bold text-base">{job.service || job.category || "Job"}</h3>
              <p className="text-violet-200 text-xs mt-0.5">ID: {job.id.slice(0, 12)}…</p>
            </div>
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${STATUS_MAP[job.status]?.cls || "bg-gray-100 text-gray-500"}`}>
              {STATUS_MAP[job.status]?.label || job.status}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Client</p>
              <p className="text-sm font-semibold text-[#0f172a]">{job.clientName || "—"}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Worker</p>
              <p className="text-sm font-semibold text-[#0f172a]">{job.workerName || "Unassigned"}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Amount</p>
              <p className="text-sm font-bold text-[#0284c7]">{job.amount ? `₦${job.amount.toLocaleString()}` : "—"}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Payment</p>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                job.paymentStatus === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
              }`}>{job.paymentStatus || "unpaid"}</span>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Posted</p>
              <p className="text-sm text-[#0f172a]">{fmt(job.createdAt?.seconds)}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Scheduled</p>
              <p className="text-sm text-[#0f172a]">{job.date || "—"}</p>
            </div>
          </div>

          {job.address && (
            <div className="flex items-start gap-2 text-sm text-gray-600 bg-gray-50 rounded-xl p-3">
              <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
              <span>{job.address}</span>
            </div>
          )}

          {job.description && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Description</p>
              <p className="text-sm text-gray-600 leading-relaxed">{job.description}</p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-100 flex gap-2 shrink-0">
          {["pending", "in-progress"].includes(job.status) && (
            <button onClick={() => { onCancel(job.id); onClose(); }}
              className="flex-1 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-bold hover:bg-red-100 transition">
              Cancel Job
            </button>
          )}
          <button onClick={onClose} className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-200 transition">
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

const PAGE_SIZE = 25;

export default function AdminJobsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filtered, setFiltered] = useState<Job[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => { if (!user) router.push("/admin/login"); });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    const q = query(collection(db, "jobs"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, snap => {
      setJobs(snap.docs.map(d => ({ id: d.id, ...d.data() } as Job)));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    let result = jobs;
    if (search) result = result.filter(j =>
      j.service?.toLowerCase().includes(search.toLowerCase()) ||
      j.category?.toLowerCase().includes(search.toLowerCase()) ||
      j.clientName?.toLowerCase().includes(search.toLowerCase()) ||
      j.workerName?.toLowerCase().includes(search.toLowerCase())
    );
    if (statusFilter !== "all") result = result.filter(j => j.status === statusFilter);
    setFiltered(result);
    setPage(0);
  }, [jobs, search, statusFilter]);

  const cancelJob = async (id: string) => {
    await updateDoc(doc(db, "jobs", id), { status: "cancelled", cancelledAt: serverTimestamp() });
    toast.success("Job cancelled");
  };

  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <AdminSidebar />
      <Toaster position="top-right" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-100 px-6 py-4 shrink-0">
          <div className="pl-10 lg:pl-0">
            <h1 className="text-lg font-bold text-[#0f172a]">Jobs</h1>
            <p className="text-xs text-gray-400">{jobs.length} total jobs</p>
          </div>
        </header>

        <div className="p-4 bg-white border-b border-gray-100 flex flex-wrap gap-3 shrink-0">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by service, client, worker…"
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="disputed">Disputed</option>
          </select>
        </div>

        <main className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="space-y-2">{[...Array(10)].map((_, i) => <div key={i} className="bg-white rounded-xl p-4 animate-pulse h-16 border border-gray-100" />)}</div>
          ) : paginated.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <Briefcase className="w-10 h-10 text-gray-200 mb-3" />
              <p className="text-sm text-gray-400">No jobs found</p>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                <div className="hidden md:grid grid-cols-[2fr_1.5fr_1.5fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3 bg-gray-50 text-[11px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                  <span>Service</span><span>Client</span><span>Worker</span>
                  <span>Amount</span><span>Date</span><span>Status</span><span></span>
                </div>
                <div className="divide-y divide-gray-50">
                  {paginated.map(job => {
                    const st = STATUS_MAP[job.status] || { cls: "bg-gray-100 text-gray-500", label: job.status };
                    return (
                      <div key={job.id} className="flex md:grid md:grid-cols-[2fr_1.5fr_1.5fr_1fr_1fr_1fr_auto] items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#0f172a] truncate">{job.service || job.category || "—"}</p>
                          <p className="text-xs text-gray-400 truncate">{job.address || ""}</p>
                        </div>
                        <span className="hidden md:block text-sm text-gray-600 truncate">{job.clientName || "—"}</span>
                        <span className="hidden md:block text-sm text-gray-600 truncate">{job.workerName || "Unassigned"}</span>
                        <span className="hidden md:block text-sm font-bold text-[#0284c7]">{job.amount ? `₦${job.amount.toLocaleString()}` : "—"}</span>
                        <span className="hidden md:block text-xs text-gray-400">{fmt(job.createdAt?.seconds)}</span>
                        <span className={`hidden md:inline-flex text-[10px] font-bold px-2 py-1 rounded-full ${st.cls}`}>{st.label}</span>
                        <button onClick={() => setSelected(job)}
                          className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200 transition ml-auto">
                          <Eye className="w-3.5 h-3.5 text-gray-500" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 px-1">
                  <p className="text-xs text-gray-400">{filtered.length} jobs · Page {page + 1} of {totalPages}</p>
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
        {selected && <JobModal job={selected} onClose={() => setSelected(null)} onCancel={cancelJob} />}
      </AnimatePresence>
    </div>
  );
}