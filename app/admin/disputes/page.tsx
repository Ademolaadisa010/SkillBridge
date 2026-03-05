"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Search, Eye, ShieldAlert, CheckCircle2, XCircle,
  Clock, ChevronLeft, ChevronRight, AlertTriangle,
  MessageCircle, Scale, User, Briefcase
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { db, auth } from "@/lib/firebase";
import {
  collection, query, onSnapshot, doc, updateDoc,
  addDoc, serverTimestamp, orderBy
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import AdminSidebar from "@/components/admin/AdminSidebar";
import toast, { Toaster } from "react-hot-toast";

interface Dispute {
  id: string;
  jobId: string;
  clientId: string;
  clientName?: string;
  workerId?: string;
  workerName?: string;
  service?: string;
  reason: string;
  description?: string;
  status: "open" | "under_review" | "resolved" | "rejected";
  resolution?: "refund_client" | "pay_worker" | "partial";
  adminNote?: string;
  amount?: number;
  evidence?: string[];
  createdAt?: { seconds: number };
  resolvedAt?: { seconds: number };
}

function fmt(s?: number) {
  if (!s) return "—";
  return new Date(s * 1000).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

const STATUS_MAP = {
  open:          { cls: "bg-red-100 text-red-600",       label: "Open" },
  under_review:  { cls: "bg-yellow-100 text-yellow-700", label: "Under Review" },
  resolved:      { cls: "bg-emerald-100 text-emerald-700", label: "Resolved" },
  rejected:      { cls: "bg-gray-100 text-gray-500",     label: "Rejected" },
};

const REASON_LABELS: Record<string, string> = {
  work_not_done: "Work Not Done",
  poor_quality:  "Poor Quality",
  no_show:       "No Show",
  overcharge:    "Overcharge",
  damage:        "Damage",
  other:         "Other",
};

function DisputeModal({ dispute, onClose, onResolve }: {
  dispute: Dispute; onClose: () => void;
  onResolve: (id: string, resolution: string, adminNote: string) => void;
}) {
  const [resolution, setResolution] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleResolve = async () => {
    if (!resolution) { toast.error("Select a resolution"); return; }
    setSubmitting(true);
    await onResolve(dispute.id, resolution, adminNote);
    setSubmitting(false);
    onClose();
  };

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
        <div className="bg-gradient-to-r from-red-600 to-red-700 p-5 text-white shrink-0">
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert className="w-5 h-5" />
            <h3 className="font-bold text-base">Dispute Review</h3>
          </div>
          <p className="text-red-100 text-sm">{REASON_LABELS[dispute.reason] || dispute.reason}</p>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><User className="w-3 h-3" />Client</p>
              <p className="text-sm font-semibold text-[#0f172a]">{dispute.clientName || "—"}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><Briefcase className="w-3 h-3" />Worker</p>
              <p className="text-sm font-semibold text-[#0f172a]">{dispute.workerName || "Unassigned"}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Service</p>
              <p className="text-sm font-semibold text-[#0f172a]">{dispute.service || "—"}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Amount</p>
              <p className="text-sm font-bold text-[#0284c7]">{dispute.amount ? `₦${dispute.amount.toLocaleString()}` : "—"}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Filed</p>
              <p className="text-sm text-[#0f172a]">{fmt(dispute.createdAt?.seconds)}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Status</p>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_MAP[dispute.status]?.cls}`}>
                {STATUS_MAP[dispute.status]?.label}
              </span>
            </div>
          </div>

          {dispute.description && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Client Description</p>
              <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-600 leading-relaxed">{dispute.description}</div>
            </div>
          )}

          {dispute.status !== "resolved" && dispute.status !== "rejected" && (
            <div className="space-y-3 pt-2 border-t border-gray-100">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Admin Resolution</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "refund_client", label: "Refund Client", cls: "border-violet-200 text-violet-700 bg-violet-50" },
                  { value: "pay_worker",    label: "Pay Worker",    cls: "border-emerald-200 text-emerald-700 bg-emerald-50" },
                  { value: "rejected",      label: "Reject Dispute", cls: "border-gray-200 text-gray-600 bg-gray-50" },
                ].map(opt => (
                  <button key={opt.value} onClick={() => setResolution(opt.value)}
                    className={`py-2.5 rounded-xl text-xs font-bold border transition ${opt.cls} ${resolution === opt.value ? "ring-2 ring-offset-1 ring-[#0284c7]" : ""}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
              <textarea
                value={adminNote} onChange={e => setAdminNote(e.target.value)}
                placeholder="Admin note (shown to both parties)…"
                rows={3}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0284c7] resize-none"
              />
              <button onClick={handleResolve} disabled={!resolution || submitting}
                className="w-full py-2.5 bg-[#0284c7] text-white rounded-xl text-sm font-bold hover:bg-[#0369a1] disabled:opacity-40 transition">
                {submitting ? "Submitting…" : "Submit Resolution"}
              </button>
            </div>
          )}

          {dispute.adminNote && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
              <p className="text-xs font-bold text-[#0284c7] mb-1">Admin Note</p>
              <p className="text-sm text-gray-600">{dispute.adminNote}</p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-100 shrink-0">
          <button onClick={onClose} className="w-full py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-200 transition">Close</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

const PAGE_SIZE = 20;

export default function AdminDisputesPage() {
  const router = useRouter();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [filtered, setFiltered] = useState<Dispute[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<Dispute | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => { if (!user) router.push("/admin/login"); });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    const q = query(collection(db, "disputes"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, snap => {
      setDisputes(snap.docs.map(d => ({ id: d.id, ...d.data() } as Dispute)));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    let result = disputes;
    if (search) result = result.filter(d =>
      d.clientName?.toLowerCase().includes(search.toLowerCase()) ||
      d.workerName?.toLowerCase().includes(search.toLowerCase()) ||
      d.service?.toLowerCase().includes(search.toLowerCase())
    );
    if (statusFilter !== "all") result = result.filter(d => d.status === statusFilter);
    setFiltered(result);
    setPage(0);
  }, [disputes, search, statusFilter]);

  const resolveDispute = async (id: string, resolution: string, adminNote: string) => {
    const dispute = disputes.find(d => d.id === id);
    if (!dispute) return;

    const isRejected = resolution === "rejected";
    await updateDoc(doc(db, "disputes", id), {
      status: isRejected ? "rejected" : "resolved",
      resolution: isRejected ? undefined : resolution,
      adminNote, resolvedAt: serverTimestamp(),
    });

    // Notify both parties
    const notifs = [];
    if (dispute.clientId) {
      notifs.push(addDoc(collection(db, "notifications"), {
        userId: dispute.clientId, type: "dispute",
        title: isRejected ? "Dispute Rejected" : resolution === "refund_client" ? "Dispute Resolved — Refund Approved ✅" : "Dispute Resolved",
        body: adminNote || "Your dispute has been reviewed by admin.",
        link: "/client/disputes", read: false, createdAt: serverTimestamp(),
      }));
    }
    if (dispute.workerId) {
      notifs.push(addDoc(collection(db, "notifications"), {
        userId: dispute.workerId, type: "dispute",
        title: resolution === "pay_worker" ? "Dispute Resolved — Payment Released 💰" : "Dispute Resolved",
        body: adminNote || "A dispute on your job has been reviewed.",
        link: "/worker/disputes", read: false, createdAt: serverTimestamp(),
      }));
    }
    await Promise.all(notifs);
    toast.success("Dispute resolved and parties notified");
  };

  const openCount = disputes.filter(d => d.status === "open").length;
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
              <h1 className="text-lg font-bold text-[#0f172a]">Disputes</h1>
              <p className="text-xs text-gray-400">{disputes.length} total disputes</p>
            </div>
            {openCount > 0 && (
              <span className="bg-red-100 text-red-600 text-xs font-bold px-2.5 py-1 rounded-full border border-red-200">
                {openCount} open
              </span>
            )}
          </div>
        </header>

        <div className="p-4 bg-white border-b border-gray-100 flex flex-wrap gap-3 shrink-0">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search disputes…"
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400">
            <option value="all">All</option>
            <option value="open">Open</option>
            <option value="under_review">Under Review</option>
            <option value="resolved">Resolved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <main className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="space-y-2">{[...Array(6)].map((_, i) => <div key={i} className="bg-white rounded-xl p-4 animate-pulse h-16 border border-gray-100" />)}</div>
          ) : paginated.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <Scale className="w-10 h-10 text-gray-200 mb-3" />
              <p className="text-sm text-gray-400">No disputes found</p>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                <div className="hidden md:grid grid-cols-[2fr_1.5fr_1.5fr_1.5fr_1fr_1fr_auto] gap-4 px-5 py-3 bg-gray-50 text-[11px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                  <span>Reason</span><span>Client</span><span>Worker</span>
                  <span>Service</span><span>Filed</span><span>Status</span><span></span>
                </div>
                <div className="divide-y divide-gray-50">
                  {paginated.map(dispute => {
                    const st = STATUS_MAP[dispute.status];
                    return (
                      <div key={dispute.id} className="flex md:grid md:grid-cols-[2fr_1.5fr_1.5fr_1.5fr_1fr_1fr_auto] items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition">
                        <div className="flex items-center gap-2 min-w-0">
                          <ShieldAlert className={`w-4 h-4 shrink-0 ${dispute.status === "open" ? "text-red-500" : "text-gray-400"}`} />
                          <span className="text-sm font-semibold text-[#0f172a] truncate">{REASON_LABELS[dispute.reason] || dispute.reason}</span>
                        </div>
                        <span className="hidden md:block text-sm text-gray-600 truncate">{dispute.clientName || "—"}</span>
                        <span className="hidden md:block text-sm text-gray-600 truncate">{dispute.workerName || "—"}</span>
                        <span className="hidden md:block text-sm text-gray-500 truncate">{dispute.service || "—"}</span>
                        <span className="hidden md:block text-xs text-gray-400">{fmt(dispute.createdAt?.seconds)}</span>
                        <span className={`hidden md:inline-flex text-[10px] font-bold px-2 py-1 rounded-full ${st?.cls}`}>{st?.label}</span>
                        <button onClick={() => setSelected(dispute)}
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
                  <p className="text-xs text-gray-400">{filtered.length} disputes · Page {page + 1} of {totalPages}</p>
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
        {selected && <DisputeModal dispute={selected} onClose={() => setSelected(null)} onResolve={resolveDispute} />}
      </AnimatePresence>
    </div>
  );
}