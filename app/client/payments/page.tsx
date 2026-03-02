"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CreditCard, ShieldCheck, Clock, CheckCircle2,
  AlertCircle, ArrowDownLeft, ArrowUpRight,
  Download, Search, X, Menu, Filter,
  TrendingUp, Wallet, RefreshCcw, ChevronRight,
  Eye, Receipt, Lock, CalendarCheck
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { db, auth } from "@/lib/firebase";
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import ClientSidebar from "@/components/sidebar/ClientSidebar";
import toast, { Toaster } from "react-hot-toast";

// ─── Types ─────────────────────────────────────────────────────────────────────
type PaymentStatus = "escrow" | "released" | "refunded" | "pending";

interface Payment {
  id: string;
  jobId?: string;
  service?: string;
  workerName?: string;
  amount: number;
  status: PaymentStatus;
  createdAt?: { seconds: number };
  releasedAt?: { seconds: number };
  refundStatus?: "none" | "requested" | "approved" | "rejected";
  receiptUrl?: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(seconds?: number) {
  if (!seconds) return "—";
  return new Date(seconds * 1000).toLocaleDateString("en-NG", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function formatAmount(n: number) {
  return `₦${n.toLocaleString()}`;
}

// ─── Payment Status Badge ───────────────────────────────────────────────────────
function PaymentBadge({ status, refundStatus }: { status: PaymentStatus; refundStatus?: string }) {
  if (refundStatus === "requested") return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 border border-orange-200">
      <RefreshCcw className="w-2.5 h-2.5" /> Refund Requested
    </span>
  );
  if (refundStatus === "approved") return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-green-100 text-green-700 border border-green-200">
      <CheckCircle2 className="w-2.5 h-2.5" /> Refunded
    </span>
  );

  const map: Record<PaymentStatus, { cls: string; icon: React.ReactNode; label: string }> = {
    escrow:   { cls: "bg-blue-100 text-[#0284c7] border-blue-200",    icon: <Lock className="w-2.5 h-2.5" />,         label: "In Escrow" },
    released: { cls: "bg-green-100 text-[#10b981] border-green-200",  icon: <CheckCircle2 className="w-2.5 h-2.5" />,  label: "Released" },
    refunded: { cls: "bg-violet-100 text-violet-700 border-violet-200",icon: <RefreshCcw className="w-2.5 h-2.5" />,  label: "Refunded" },
    pending:  { cls: "bg-yellow-100 text-yellow-700 border-yellow-200",icon: <Clock className="w-2.5 h-2.5" />,        label: "Pending" },
  };
  const { cls, icon, label } = map[status];
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border ${cls}`}>
      {icon}{label}
    </span>
  );
}

// ─── Payment Detail Modal ───────────────────────────────────────────────────────
function PaymentModal({
  payment, onClose, onRefund
}: {
  payment: Payment;
  onClose: () => void;
  onRefund: (p: Payment) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-[#0c4a6e] to-[#075985] p-5 text-white">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-xs text-blue-300 mb-0.5">Receipt</p>
              <h3 className="font-bold text-lg">{formatAmount(payment.amount)}</h3>
            </div>
            <button onClick={onClose} className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center hover:bg-white/20 transition">
              <X className="w-4 h-4" />
            </button>
          </div>
          <PaymentBadge status={payment.status} refundStatus={payment.refundStatus} />
        </div>

        <div className="p-5 space-y-3">
          {[
            { label: "Service", value: payment.service || "—" },
            { label: "Worker", value: payment.workerName || "—" },
            { label: "Date", value: formatDate(payment.createdAt?.seconds) },
            { label: "Payment ID", value: `#${payment.id.slice(-8).toUpperCase()}` },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <span className="text-xs text-gray-400">{label}</span>
              <span className="text-sm font-semibold text-[#0c4a6e]">{value}</span>
            </div>
          ))}

          {/* Escrow explanation */}
          {payment.status === "escrow" && (
            <div className="bg-[#e0f2fe] rounded-xl p-3 flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-[#0284c7] shrink-0 mt-0.5" />
              <p className="text-xs text-[#0369a1]">This payment is safely held in escrow. It will be released to the worker once you confirm the job is complete.</p>
            </div>
          )}
        </div>

        <div className="p-5 pt-0 space-y-2">
          {payment.status === "escrow" && (
            <button
              onClick={() => onRefund(payment)}
              className="w-full bg-white border border-orange-200 text-orange-600 py-2.5 rounded-xl text-sm font-semibold hover:bg-orange-50 transition flex items-center justify-center gap-2"
            >
              <RefreshCcw className="w-4 h-4" /> Request Refund
            </button>
          )}
          <button className="w-full bg-[#0284c7] text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-[#0369a1] transition flex items-center justify-center gap-2">
            <Download className="w-4 h-4" /> Download Receipt
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────────
export default function PaymentsPage() {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<PaymentStatus | "all">("all");
  const [selected, setSelected] = useState<Payment | null>(null);

  const [stats, setStats] = useState({
    totalSpent: 0,
    inEscrow: 0,
    refunded: 0,
    count: 0,
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) { router.push("/login"); return; }
      const q = query(collection(db, "payments"), where("clientId", "==", user.uid));
      const unsubSnap = onSnapshot(q, (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Payment));
        data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setPayments(data);
        setStats({
          totalSpent: data.filter(p => p.status === "released").reduce((s, p) => s + p.amount, 0),
          inEscrow:   data.filter(p => p.status === "escrow").reduce((s, p) => s + p.amount, 0),
          refunded:   data.filter(p => p.status === "refunded" || p.refundStatus === "approved").reduce((s, p) => s + p.amount, 0),
          count:      data.length,
        });
        setLoading(false);
      });
      return () => unsubSnap();
    });
    return () => unsub();
  }, [router]);

  const handleRefund = async (payment: Payment) => {
    try {
      await updateDoc(doc(db, "payments", payment.id), {
        refundStatus: "requested",
        refundRequestedAt: serverTimestamp(),
      });
      toast.success("Refund request submitted. Our team will review within 24–48 hours.");
      setSelected(null);
    } catch {
      toast.error("Failed to submit refund request.");
    }
  };

  const filtered = payments.filter(p => {
    const matchFilter = filter === "all" || p.status === filter;
    const matchSearch = !search || [p.service, p.workerName].some(f => f?.toLowerCase().includes(search.toLowerCase()));
    return matchFilter && matchSearch;
  });

  const FILTERS: { id: PaymentStatus | "all"; label: string }[] = [
    { id: "all", label: "All" },
    { id: "escrow", label: "In Escrow" },
    { id: "released", label: "Released" },
    { id: "refunded", label: "Refunded" },
    { id: "pending", label: "Pending" },
  ];

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
          <span className="text-base font-bold text-[#0c4a6e]">Payments</span>
          <div className="w-9" />
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-4xl mx-auto space-y-6">

            {/* Header */}
            <div>
              <h1 className="text-xl font-bold text-[#0c4a6e]">Payments</h1>
              <p className="text-xs text-gray-400 mt-0.5">All your escrow payments, receipts, and refund requests</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Total Spent",  value: formatAmount(stats.totalSpent), icon: <TrendingUp className="w-5 h-5 text-[#0284c7]" />,  bg: "bg-[#e0f2fe] text-[#0284c7]",  border: "border-blue-100" },
                { label: "In Escrow",    value: formatAmount(stats.inEscrow),   icon: <Lock className="w-5 h-5 text-[#10b981]" />,         bg: "bg-[#dcfce7] text-[#10b981]",  border: "border-green-100" },
                { label: "Refunded",     value: formatAmount(stats.refunded),   icon: <RefreshCcw className="w-5 h-5 text-[#f97316]" />,   bg: "bg-[#fff7ed] text-[#f97316]",  border: "border-orange-100" },
                { label: "Transactions", value: stats.count,                    icon: <Receipt className="w-5 h-5 text-[#7c3aed]" />,      bg: "bg-[#f5f3ff] text-[#7c3aed]",  border: "border-violet-100" },
              ].map((s, i) => (
                <div key={i} className={`p-5 rounded-2xl border ${s.border} ${s.bg}`}>
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm mb-3">
                    {s.icon}
                  </div>
                  <div className="text-xl font-bold mb-0.5">{s.value}</div>
                  <div className="text-xs font-medium opacity-70">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Escrow info banner */}
            <div className="bg-gradient-to-r from-[#0c4a6e] to-[#075985] rounded-2xl p-5 text-white flex items-start gap-4">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 text-[#34d399]" />
              </div>
              <div>
                <h3 className="font-bold text-sm mb-1">How Escrow Works</h3>
                <p className="text-blue-200 text-xs leading-relaxed">
                  When you book a service, your payment is held in a secure escrow account — not sent to the worker. Funds are only released when you confirm the job is complete. This protects you at every step.
                </p>
              </div>
            </div>

            {/* Search & Filter */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by service or worker…"
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
                />
              </div>
            </div>

            {/* Filter tabs */}
            <div className="flex gap-1.5 flex-wrap">
              {FILTERS.map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${
                    filter === f.id
                      ? "bg-[#0284c7] text-white shadow-sm"
                      : "bg-white border border-gray-200 text-gray-500 hover:border-gray-300"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Payment list */}
            {loading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse flex gap-4">
                    <div className="w-10 h-10 bg-gray-100 rounded-xl shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-gray-100 rounded w-1/3" />
                      <div className="h-2.5 bg-gray-100 rounded w-1/2" />
                    </div>
                    <div className="w-20 h-8 bg-gray-100 rounded-xl" />
                  </div>
                ))}
              </div>
            ) : filtered.length > 0 ? (
              <div className="space-y-3">
                {filtered.map(payment => (
                  <motion.div
                    key={payment.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition cursor-pointer group"
                    onClick={() => setSelected(payment)}
                  >
                    <div className="flex items-center gap-4 p-5">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                        payment.status === "escrow"   ? "bg-[#e0f2fe]" :
                        payment.status === "released" ? "bg-[#dcfce7]" :
                        payment.status === "refunded" ? "bg-[#f5f3ff]" : "bg-yellow-50"
                      }`}>
                        {payment.status === "escrow"   ? <Lock className="w-5 h-5 text-[#0284c7]" /> :
                         payment.status === "released" ? <CheckCircle2 className="w-5 h-5 text-[#10b981]" /> :
                         payment.status === "refunded" ? <RefreshCcw className="w-5 h-5 text-violet-500" /> :
                         <Clock className="w-5 h-5 text-yellow-500" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#0c4a6e] truncate">
                              {payment.service || "Service Payment"}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {payment.workerName || "Worker"} · {formatDate(payment.createdAt?.seconds)}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-bold text-[#0c4a6e]">{formatAmount(payment.amount)}</p>
                            <div className="mt-1">
                              <PaymentBadge status={payment.status} refundStatus={payment.refundStatus} />
                            </div>
                          </div>
                        </div>
                      </div>

                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition shrink-0" />
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
                <CreditCard className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                <h3 className="text-base font-bold text-gray-400 mb-1">No payments found</h3>
                <p className="text-sm text-gray-300 mb-5">Payments appear here when you book and pay for a service</p>
                <Link href="/client/book" className="inline-flex items-center gap-2 bg-[#0284c7] text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-[#0369a1] transition">
                  <CalendarCheck className="w-4 h-4" /> Book a Service
                </Link>
              </div>
            )}

          </div>
        </main>
      </div>

      <AnimatePresence>
        {selected && (
          <PaymentModal payment={selected} onClose={() => setSelected(null)} onRefund={handleRefund} />
        )}
      </AnimatePresence>
    </div>
  );
}