"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Search, Eye, Wallet, CheckCircle2, XCircle,
  Clock, ChevronLeft, ChevronRight, Banknote,
  Building, AlertCircle, TrendingDown
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { db, auth } from "@/lib/firebase";
import {
  collection, query, onSnapshot, doc, updateDoc,
  addDoc, serverTimestamp, orderBy, where, getDoc
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import AdminSidebar from "@/components/admin/AdminSidebar";
import toast, { Toaster } from "react-hot-toast";

interface Withdrawal {
  id: string;
  workerId: string;
  workerName?: string;
  amount: number;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  status: "pending" | "approved" | "rejected";
  adminNote?: string;
  createdAt?: { seconds: number };
  processedAt?: { seconds: number };
}

function fmt(s?: number) {
  if (!s) return "—";
  return new Date(s * 1000).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

const STATUS_MAP = {
  pending:  { cls: "bg-yellow-100 text-yellow-700",    label: "Pending" },
  approved: { cls: "bg-emerald-100 text-emerald-700",  label: "Approved" },
  rejected: { cls: "bg-red-100 text-red-600",          label: "Rejected" },
};

function WithdrawalModal({ withdrawal, onClose, onProcess }: {
  withdrawal: Withdrawal; onClose: () => void;
  onProcess: (id: string, action: "approved" | "rejected", note: string) => void;
}) {
  const [note, setNote] = useState("");
  const [processing, setProcessing] = useState(false);

  const handle = async (action: "approved" | "rejected") => {
    setProcessing(true);
    await onProcess(withdrawal.id, action, note);
    setProcessing(false);
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
        className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-[#10b981] to-[#059669] p-5 text-white">
          <h3 className="font-bold text-base">Withdrawal Request</h3>
          <p className="text-green-100 text-2xl font-bold mt-1">₦{withdrawal.amount.toLocaleString()}</p>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Worker</p>
              <p className="text-sm font-semibold text-[#0f172a]">{withdrawal.workerName || "—"}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Status</p>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_MAP[withdrawal.status]?.cls}`}>
                {STATUS_MAP[withdrawal.status]?.label}
              </span>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Bank</p>
              <p className="text-sm font-semibold text-[#0f172a]">{withdrawal.bankName || "—"}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Account</p>
              <p className="text-sm font-semibold text-[#0f172a]">{withdrawal.accountNumber || "—"}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 col-span-2">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Account Name</p>
              <p className="text-sm font-semibold text-[#0f172a]">{withdrawal.accountName || "—"}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Requested</p>
              <p className="text-sm text-[#0f172a]">{fmt(withdrawal.createdAt?.seconds)}</p>
            </div>
            {withdrawal.processedAt && (
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Processed</p>
                <p className="text-sm text-[#0f172a]">{fmt(withdrawal.processedAt.seconds)}</p>
              </div>
            )}
          </div>

          {withdrawal.adminNote && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
              <p className="text-xs font-bold text-[#0284c7] mb-1">Admin Note</p>
              <p className="text-sm text-gray-600">{withdrawal.adminNote}</p>
            </div>
          )}

          {withdrawal.status === "pending" && (
            <>
              <textarea
                value={note} onChange={e => setNote(e.target.value)}
                placeholder="Optional note for worker…"
                rows={2}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#10b981] resize-none"
              />
              <div className="flex gap-2">
                <button onClick={() => handle("approved")} disabled={processing}
                  className="flex-1 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-bold hover:bg-emerald-600 disabled:opacity-40 transition">
                  ✓ Approve & Pay
                </button>
                <button onClick={() => handle("rejected")} disabled={processing}
                  className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 disabled:opacity-40 transition">
                  ✗ Reject
                </button>
              </div>
            </>
          )}
        </div>
        <div className="px-5 pb-5">
          <button onClick={onClose} className="w-full py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-200 transition">Close</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

const PAGE_SIZE = 20;

export default function AdminWithdrawalsPage() {
  const router = useRouter();
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [filtered, setFiltered] = useState<Withdrawal[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [selected, setSelected] = useState<Withdrawal | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => { if (!user) router.push("/admin/login"); });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    const q = query(collection(db, "withdrawals"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, snap => {
      setWithdrawals(snap.docs.map(d => ({ id: d.id, ...d.data() } as Withdrawal)));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    let result = withdrawals;
    if (search) result = result.filter(w =>
      w.workerName?.toLowerCase().includes(search.toLowerCase()) ||
      w.bankName?.toLowerCase().includes(search.toLowerCase()) ||
      w.accountName?.toLowerCase().includes(search.toLowerCase())
    );
    if (statusFilter !== "all") result = result.filter(w => w.status === statusFilter);
    setFiltered(result);
    setPage(0);
  }, [withdrawals, search, statusFilter]);

  const processWithdrawal = async (id: string, action: "approved" | "rejected", note: string) => {
    const withdrawal = withdrawals.find(w => w.id === id);
    if (!withdrawal) return;

    await updateDoc(doc(db, "withdrawals", id), {
      status: action, adminNote: note || undefined, processedAt: serverTimestamp()
    });

    if (action === "approved") {
      // Deduct from worker wallet
      const workerRef = doc(db, "users", withdrawal.workerId);
      const workerSnap = await getDoc(workerRef);
      if (workerSnap.exists()) {
        const currentBalance = workerSnap.data().walletBalance || 0;
        await updateDoc(workerRef, { walletBalance: Math.max(0, currentBalance - withdrawal.amount) });
      }
      // Add debit transaction
      await addDoc(collection(db, "transactions"), {
        userId: withdrawal.workerId, type: "debit",
        amount: withdrawal.amount, withdrawalId: id,
        description: `Withdrawal to ${withdrawal.bankName} — ${withdrawal.accountNumber}`,
        status: "completed", createdAt: serverTimestamp(),
      });
      // Notify
      await addDoc(collection(db, "notifications"), {
        userId: withdrawal.workerId, type: "payment",
        title: "Withdrawal Approved 💸",
        body: `₦${withdrawal.amount.toLocaleString()} is on its way to ${withdrawal.bankName}. Allow 1–3 business days.`,
        link: "/worker/earnings", read: false, createdAt: serverTimestamp(),
      });
      toast.success("Withdrawal approved & worker notified");
    } else {
      // Refund back to wallet
      const workerRef = doc(db, "users", withdrawal.workerId);
      const workerSnap = await getDoc(workerRef);
      if (workerSnap.exists()) {
        const currentBalance = workerSnap.data().walletBalance || 0;
        await updateDoc(workerRef, { walletBalance: currentBalance + withdrawal.amount });
      }
      await addDoc(collection(db, "notifications"), {
        userId: withdrawal.workerId, type: "payment",
        title: "Withdrawal Rejected",
        body: `Your withdrawal of ₦${withdrawal.amount.toLocaleString()} was rejected. ${note ? `Reason: ${note}` : "Please contact support."}`,
        link: "/worker/earnings", read: false, createdAt: serverTimestamp(),
      });
      toast.success("Withdrawal rejected & funds returned to wallet");
    }
  };

  const pendingCount = withdrawals.filter(w => w.status === "pending").length;
  const pendingTotal = withdrawals.filter(w => w.status === "pending").reduce((s, w) => s + w.amount, 0);
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
              <h1 className="text-lg font-bold text-[#0f172a]">Withdrawals</h1>
              <p className="text-xs text-gray-400">{withdrawals.length} total requests</p>
            </div>
            {pendingCount > 0 && (
              <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2.5 py-1 rounded-full border border-orange-200">
                {pendingCount} pending · ₦{pendingTotal.toLocaleString()}
              </span>
            )}
          </div>
        </header>

        <div className="p-4 bg-white border-b border-gray-100 flex flex-wrap gap-3 shrink-0">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by worker or bank…"
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#10b981]" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#10b981]">
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <main className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="space-y-2">{[...Array(6)].map((_, i) => <div key={i} className="bg-white rounded-xl p-4 animate-pulse h-16 border border-gray-100" />)}</div>
          ) : paginated.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <Wallet className="w-10 h-10 text-gray-200 mb-3" />
              <p className="text-sm text-gray-400">No withdrawals found</p>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                <div className="hidden md:grid grid-cols-[2fr_1.5fr_1.5fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3 bg-gray-50 text-[11px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                  <span>Worker</span><span>Bank</span><span>Account</span>
                  <span>Amount</span><span>Date</span><span>Status</span><span></span>
                </div>
                <div className="divide-y divide-gray-50">
                  {paginated.map(w => {
                    const st = STATUS_MAP[w.status];
                    return (
                      <div key={w.id} className="flex md:grid md:grid-cols-[2fr_1.5fr_1.5fr_1fr_1fr_1fr_auto] items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition">
                        <span className="text-sm font-semibold text-[#0f172a] truncate">{w.workerName || "—"}</span>
                        <span className="hidden md:block text-sm text-gray-600 truncate">{w.bankName || "—"}</span>
                        <span className="hidden md:block text-sm text-gray-500 font-mono">{w.accountNumber || "—"}</span>
                        <span className="hidden md:block text-sm font-bold text-[#10b981]">₦{w.amount.toLocaleString()}</span>
                        <span className="hidden md:block text-xs text-gray-400">{fmt(w.createdAt?.seconds)}</span>
                        <span className={`hidden md:inline-flex text-[10px] font-bold px-2 py-1 rounded-full ${st?.cls}`}>{st?.label}</span>
                        <button onClick={() => setSelected(w)}
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
                  <p className="text-xs text-gray-400">{filtered.length} requests · Page {page + 1} of {totalPages}</p>
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
        {selected && <WithdrawalModal withdrawal={selected} onClose={() => setSelected(null)} onProcess={processWithdrawal} />}
      </AnimatePresence>
    </div>
  );
}