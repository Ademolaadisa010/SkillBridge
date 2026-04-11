"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Wallet, ArrowDownLeft, TrendingUp, Lock, Send,
  X, Loader2, Menu, Clock, CheckCircle2, AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { db, auth } from "@/lib/firebase";
import {
  collection, query, where, onSnapshot, addDoc,
  serverTimestamp, doc, onSnapshot as onDocSnapshot
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import WorkerSidebar from "@/components/sidebar/WorkerSidebar";
import toast, { Toaster } from "react-hot-toast";

interface Tx {
  id: string;
  type: "credit" | "debit" | "escrow";
  amount: number;
  description: string;
  status: string;
  createdAt?: { seconds: number };
}

function fmt(s?: number) {
  return s
    ? new Date(s * 1000).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })
    : "—";
}

// ─── Withdraw Modal ───────────────────────────────────────────────────────────
function WithdrawModal({ balance, onClose, onSubmit }: {
  balance: number;
  onClose: () => void;
  onSubmit: (d: any) => Promise<void>;
}) {
  const [form, setForm] = useState({ bankName: "", accountNumber: "", accountName: "", amount: "" });
  const [submitting, setSubmitting] = useState(false);
  const BANKS = ["Access Bank", "GTBank", "First Bank", "Zenith Bank", "UBA", "Kuda Bank", "Opay", "Palmpay", "Moniepoint", "Wema Bank", "Other"];
  const ok = form.bankName && form.accountNumber.length >= 10 && form.accountName && Number(form.amount) >= 500 && Number(form.amount) <= balance;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}>

        <div className="bg-gradient-to-r from-[#10b981] to-[#059669] p-5 text-white shrink-0 flex items-start justify-between">
          <div>
            <h3 className="font-bold text-base">Withdraw Earnings</h3>
            <p className="text-green-100 text-xs mt-0.5">Available: ₦{balance.toLocaleString()}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center hover:bg-white/20 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Bank</label>
            <select value={form.bankName} onChange={e => setForm(p => ({ ...p, bankName: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#10b981] bg-white">
              <option value="">Select bank...</option>
              {BANKS.map(b => <option key={b}>{b}</option>)}
            </select>
          </div>

          {([
            ["accountNumber", "Account Number", "10-digit number", "number"],
            ["accountName",   "Account Name",   "As on your account", "text"],
          ] as const).map(([k, l, p, t]) => (
            <div key={k} className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{l}</label>
              <input type={t} value={form[k]} onChange={e => setForm(prev => ({ ...prev, [k]: e.target.value }))}
                placeholder={p} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#10b981]" />
            </div>
          ))}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Amount (₦) — Min ₦500</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">₦</span>
              <input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                placeholder="Amount" min="500" max={balance}
                className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#10b981]" />
            </div>
            {Number(form.amount) > balance && <p className="text-xs text-red-500">Exceeds available balance</p>}
            {Number(form.amount) > 0 && Number(form.amount) <= balance && (
              <p className="text-xs text-gray-400">
                You'll receive ₦{(Number(form.amount) * 0.98).toLocaleString()} after 2% service fee
              </p>
            )}
          </div>

          <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl p-3 flex items-start gap-2">
            <Clock className="w-4 h-4 text-[#10b981] shrink-0 mt-0.5" />
            <p className="text-xs text-[#047857]">Processed within 1–2 business days. 2% service fee applies.</p>
          </div>
        </div>

        <div className="p-5 border-t border-gray-50 shrink-0">
          <button
            onClick={async () => { setSubmitting(true); await onSubmit(form); setSubmitting(false); }}
            disabled={!ok || submitting}
            className="w-full bg-[#10b981] text-white py-3 rounded-xl text-sm font-bold hover:bg-[#059669] transition disabled:opacity-40 flex items-center justify-center gap-2 shadow-md">
            {submitting
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
              : <><Send className="w-4 h-4" /> Request Withdrawal</>}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function EarningsPage() {
  const router = useRouter();
  const [mobileOpen,    setMobileOpen]    = useState(false);
  const [showWithdraw,  setShowWithdraw]  = useState(false);
  const [txs,           setTxs]           = useState<Tx[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [wallet, setWallet] = useState({ balance: 0, escrow: 0, earned: 0, withdrawn: 0 });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      if (!user) { router.push("/login"); return; }

      // ── Real-time wallet from users collection (NOT workers) ──────────────
      const userRef = doc(db, "users", user.uid);
      const unsubUser = onDocSnapshot(userRef, snap => {
        if (snap.exists()) {
          const d = snap.data();
          setWallet({
            balance:   d.walletBalance   || 0,
            escrow:    d.escrowBalance   || 0,
            earned:    d.totalEarned     || 0,
            withdrawn: d.totalWithdrawn  || 0,
          });
        }
      });

      // ── Transactions — workerId field ─────────────────────────────────────
      const q = query(collection(db, "transactions"), where("workerId", "==", user.uid));
      const unsubTx = onSnapshot(q, snap => {
        const data = snap.docs
          .map(d => ({ id: d.id, ...d.data() } as Tx))
          .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setTxs(data);
        setLoading(false);
      });

      return () => { unsubUser(); unsubTx(); };
    });
    return () => unsub();
  }, [router]);

  const handleWithdraw = async (req: any) => {
    try {
      const user = auth.currentUser!;
      await addDoc(collection(db, "withdrawals"), {
        workerId:      user.uid,
        bankName:      req.bankName,
        accountNumber: req.accountNumber,
        accountName:   req.accountName,
        amount:        Number(req.amount),
        netAmount:     Number(req.amount) * 0.98,
        status:        "pending",
        createdAt:     serverTimestamp(),
      });

      // Notify admin
      await addDoc(collection(db, "notifications"), {
        userId:    "admin",
        type:      "withdrawal",
        title:     "💸 New Withdrawal Request",
        body:      `${user.displayName || "A worker"} requested withdrawal of ₦${Number(req.amount).toLocaleString()} to ${req.bankName} (${req.accountNumber}).`,
        link:      "/admin/withdrawals",
        read:      false,
        createdAt: serverTimestamp(),
      });

      toast.success("Withdrawal request submitted! Funds arrive in 1–2 business days.");
      setShowWithdraw(false);
    } catch {
      toast.error("Failed to submit withdrawal.");
    }
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
          <span className="text-base font-bold text-[#0c4a6e]">Earnings</span>
          <div className="w-9" />
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-3xl mx-auto space-y-6">

            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-[#0c4a6e]">Earnings</h1>
                <p className="text-xs text-gray-400 mt-0.5">Wallet and transaction history</p>
              </div>
              <button
                onClick={() => setShowWithdraw(true)}
                disabled={wallet.balance < 500}
                className="inline-flex items-center gap-2 bg-[#10b981] text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#059669] transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed">
                <ArrowDownLeft className="w-4 h-4" /> Withdraw
              </button>
            </div>

            {/* Wallet card */}
            <div className="bg-gradient-to-br from-[#0c4a6e] to-[#0369a1] rounded-3xl p-6 text-white">
              <p className="text-blue-300 text-sm mb-1">Available Balance</p>
              <p className="text-4xl font-bold mb-5">₦{wallet.balance.toLocaleString()}</p>
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/10">
                {[
                  { label: "In Escrow",    value: `₦${wallet.escrow.toLocaleString()}`,    icon: <Lock className="w-4 h-4 text-blue-300" /> },
                  { label: "Total Earned", value: `₦${wallet.earned.toLocaleString()}`,    icon: <TrendingUp className="w-4 h-4 text-[#34d399]" /> },
                  { label: "Withdrawn",    value: `₦${wallet.withdrawn.toLocaleString()}`, icon: <ArrowDownLeft className="w-4 h-4 text-blue-300" /> },
                ].map(s => (
                  <div key={s.label}>
                    <div className="flex items-center gap-1 mb-1">{s.icon}<span className="text-blue-300 text-xs">{s.label}</span></div>
                    <p className="text-sm font-bold">{s.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Minimum balance note */}
            {wallet.balance > 0 && wallet.balance < 500 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                <p className="text-xs text-amber-700">Minimum withdrawal is ₦500. Keep completing jobs to reach the threshold.</p>
              </div>
            )}

            {/* Transactions */}
            <div>
              <h3 className="text-sm font-bold text-[#0c4a6e] mb-4">Transaction History</h3>
              {loading ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse flex gap-4">
                      <div className="w-10 h-10 bg-gray-100 rounded-xl shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-gray-100 rounded w-1/3" />
                        <div className="h-2.5 bg-gray-100 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : txs.length > 0 ? (
                <div className="space-y-3">
                  {txs.map(tx => (
                    <motion.div key={tx.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                        tx.status === "completed" ? "bg-[#dcfce7]" :
                        tx.status === "escrow"    ? "bg-[#e0f2fe]" :
                        tx.type   === "credit"    ? "bg-[#dcfce7]" :
                        tx.type   === "escrow"    ? "bg-[#e0f2fe]" : "bg-orange-50"
                      }`}>
                        {tx.status === "completed"
                          ? <TrendingUp className="w-5 h-5 text-[#10b981]" />
                          : tx.status === "escrow" || tx.type === "escrow"
                          ? <Lock className="w-5 h-5 text-[#0284c7]" />
                          : tx.type === "credit"
                          ? <TrendingUp className="w-5 h-5 text-[#10b981]" />
                          : <ArrowDownLeft className="w-5 h-5 text-orange-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#0c4a6e] truncate">{tx.description}</p>
                        <p className="text-xs text-gray-400">{fmt(tx.createdAt?.seconds)}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-sm font-bold ${
                          tx.status === "completed" || tx.type === "credit" ? "text-[#10b981]" :
                          tx.type === "debit"  ? "text-orange-500" : "text-[#0284c7]"
                        }`}>
                          {(tx.status === "completed" || tx.type === "credit") ? "+" : tx.type === "debit" ? "−" : ""}₦{tx.amount.toLocaleString()}
                        </p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          tx.status === "completed" ? "bg-green-100 text-green-700" :
                          tx.status === "escrow"    ? "bg-blue-100 text-[#0284c7]"  :
                          tx.status === "pending"   ? "bg-yellow-100 text-yellow-700" :
                          "bg-red-100 text-red-600"
                        }`}>
                          {tx.status === "completed" ? "Paid ✓" :
                           tx.status === "escrow"    ? "In Escrow" :
                           tx.status === "pending"   ? "Pending" :
                           tx.status}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
                  <Wallet className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                  <h3 className="text-base font-bold text-gray-400 mb-1">No transactions yet</h3>
                  <p className="text-sm text-gray-300">Complete jobs to start earning</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      <AnimatePresence>
        {showWithdraw && (
          <WithdrawModal
            balance={wallet.balance}
            onClose={() => setShowWithdraw(false)}
            onSubmit={handleWithdraw}
          />
        )}
      </AnimatePresence>
    </div>
  );
}