"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Search, Eye, CreditCard, Lock, CheckCircle2,
  RefreshCcw, Clock, ChevronLeft, ChevronRight,
  TrendingUp, Wallet, ArrowDownLeft, AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { db, auth } from "@/lib/firebase";
import {
  collection, query, onSnapshot, doc, updateDoc,
  addDoc, serverTimestamp, orderBy, getDoc, getDocs, where
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import AdminSidebar from "@/components/admin/AdminSidebar";
import toast, { Toaster } from "react-hot-toast";

interface Payment {
  id: string;
  jobId?: string;
  offerId?: string;
  service?: string;
  clientId?: string;
  clientName?: string;
  workerId?: string;
  workerName?: string;
  amount: number;
  status: "escrow" | "released" | "refunded" | "pending" | "pending_verification";
  paymentMethod?: string;
  refundStatus?: "none" | "requested" | "approved" | "rejected";
  createdAt?: { seconds: number };
  releasedAt?: { seconds: number };
  platformAccNo?: string;
  platformBank?: string;
}

function fmt(s?: number) {
  if (!s) return "—";
  return new Date(s * 1000).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

// ─── Auto-create chat between client and worker ───────────────────────────────
async function getOrCreateChat(clientId: string, workerId: string, service: string, jobId: string): Promise<void> {
  try {
    const snap = await getDocs(query(collection(db, "chats"), where("participants", "array-contains", clientId)));
    const existing = snap.docs.find(d => (d.data().participants as string[]).includes(workerId));
    if (existing) return; // chat already exists

    // Fetch names
    let clientName = "Client", workerName = "Worker";
    const [cSnap, wSnap] = await Promise.all([
      getDoc(doc(db, "users", clientId)),
      getDoc(doc(db, "users", workerId)),
    ]);
    if (cSnap.exists()) clientName = cSnap.data().displayName || cSnap.data().fullName || "Client";
    if (wSnap.exists()) workerName = wSnap.data().displayName || wSnap.data().fullName || "Worker";

    const chatRef = await addDoc(collection(db, "chats"), {
      participants: [clientId, workerId],
      participantDetails: {
        [clientId]: { name: clientName, role: "client" },
        [workerId]: { name: workerName, role: "worker" },
      },
      jobId, bookingService: service, paymentConfirmed: true,
      lastMessage:   "Payment confirmed — chat unlocked!",
      lastMessageAt: serverTimestamp(),
      unreadCount:   { [clientId]: 1, [workerId]: 1 },
      createdAt:     serverTimestamp(),
    });
    await addDoc(collection(db, "messages"), {
      chatId: chatRef.id, senderId: "system",
      text: `✅ Payment confirmed for "${service}"! You can now chat here.`,
      createdAt: serverTimestamp(), read: false, system: true,
    });
  } catch (e) { console.error("Chat creation error:", e); }
}


const STATUS_MAP = {
  escrow:               { cls: "bg-blue-100 text-[#0284c7]",     label: "In Escrow",          icon: Lock },
  released:             { cls: "bg-emerald-100 text-emerald-700", label: "Released",            icon: CheckCircle2 },
  refunded:             { cls: "bg-violet-100 text-violet-700",   label: "Refunded",            icon: RefreshCcw },
  pending:              { cls: "bg-yellow-100 text-yellow-700",   label: "Pending",             icon: Clock },
  pending_verification: { cls: "bg-orange-100 text-orange-700",  label: "Awaiting Verification", icon: Clock },
};

function PaymentModal({ payment, onClose, onVerify, onRelease, onRefund }: {
  payment: Payment; onClose: () => void;
  onVerify: (p: Payment) => void;
  onRelease: (p: Payment) => void; onRefund: (p: Payment) => void;
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
        className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-[#0284c7] to-[#0369a1] p-5 text-white">
          <h3 className="font-bold text-base">Payment Details</h3>
          <p className="text-blue-100 text-2xl font-bold mt-1">₦{payment.amount.toLocaleString()}</p>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Status</p>
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${STATUS_MAP[payment.status]?.cls}`}>
                {STATUS_MAP[payment.status]?.label}
              </span>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Method</p>
              <p className="text-sm font-semibold text-[#0f172a]">{payment.paymentMethod === "bank_transfer" ? "Bank Transfer" : payment.paymentMethod || "—"}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Client</p>
              <p className="text-sm font-semibold text-[#0f172a]">{payment.clientName || "—"}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Worker</p>
              <p className="text-sm font-semibold text-[#0f172a]">{payment.workerName || "—"}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Service</p>
              <p className="text-sm font-semibold text-[#0f172a]">{payment.service || "—"}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Date</p>
              <p className="text-sm font-semibold text-[#0f172a]">{fmt(payment.createdAt?.seconds)}</p>
            </div>
          </div>

          {/* Pending verification banner */}
          {payment.status === "pending_verification" && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-3.5 space-y-1.5">
              <p className="text-xs font-bold text-orange-800 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Awaiting Your Verification
              </p>
              <p className="text-xs text-orange-700 leading-relaxed">
                Client claims to have transferred <strong>₦{payment.amount.toLocaleString()}</strong> to your{" "}
                {payment.platformBank} account <strong>{payment.platformAccNo}</strong>.
                Check your bank app, then click Confirm below.
              </p>
            </div>
          )}

          {payment.refundStatus === "requested" && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
              <p className="text-xs text-orange-700 font-medium">Client has requested a refund for this payment.</p>
            </div>
          )}

          <div className="flex gap-2 pt-1 flex-wrap">
            {payment.status === "pending_verification" && (
              <>
                <button onClick={() => { onVerify(payment); onClose(); }}
                  className="flex-1 py-2.5 bg-[#10b981] text-white rounded-xl text-sm font-bold hover:bg-[#059669] transition">
                  ✓ Confirm Payment Received
                </button>
                <button onClick={() => { onRefund(payment); onClose(); }}
                  className="flex-1 py-2.5 bg-red-100 text-red-600 rounded-xl text-sm font-bold hover:bg-red-200 transition">
                  ✗ Reject — Not Received
                </button>
              </>
            )}
            {payment.status === "escrow" && (
              <>
                <button onClick={() => { onRelease(payment); onClose(); }}
                  className="flex-1 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-bold hover:bg-emerald-600 transition">
                  Release to Worker
                </button>
                <button onClick={() => { onRefund(payment); onClose(); }}
                  className="flex-1 py-2.5 bg-violet-500 text-white rounded-xl text-sm font-bold hover:bg-violet-600 transition">
                  Refund Client
                </button>
              </>
            )}
            <button onClick={onClose} className={`py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-200 transition ${(payment.status === "escrow" || payment.status === "pending_verification") ? "px-4" : "flex-1"}`}>
              Close
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

const PAGE_SIZE = 25;

export default function AdminPaymentsPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filtered, setFiltered] = useState<Payment[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => { if (!user) router.push("/admin/login"); });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    const q = query(collection(db, "payments"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, snap => {
      setPayments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Payment)));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    let result = payments;
    if (search) result = result.filter(p =>
      p.service?.toLowerCase().includes(search.toLowerCase()) ||
      p.clientName?.toLowerCase().includes(search.toLowerCase()) ||
      p.workerName?.toLowerCase().includes(search.toLowerCase())
    );
    if (statusFilter !== "all") result = result.filter(p => p.status === statusFilter);
    setFiltered(result);
    setPage(0);
  }, [payments, search, statusFilter]);

  const verifyPayment = async (payment: Payment) => {
    // 1. Mark payment as escrow (verified, held)
    await updateDoc(doc(db, "payments", payment.id), {
      status: "escrow",
      verifiedAt: serverTimestamp(),
    });

    // 2. Accept the offer
    if (payment.offerId) {
      await updateDoc(doc(db, "offers", payment.offerId), {
        status: "accepted",
        acceptedAt: serverTimestamp(),
      });
    }

    // 3. Mark job as in-progress with worker assigned
    if (payment.jobId) {
      await updateDoc(doc(db, "jobs", payment.jobId), {
        status: "in-progress",
        paymentStatus: "paid",
        workerId: payment.workerId,
        workerName: payment.workerName || "",
        amount: payment.amount,
        startedAt: serverTimestamp(),
      });
    }

    // 4. Update existing pending transaction → show "In Escrow" in worker earnings
    //    (created by client booking page with status:"pending", type:"escrow")
    if (payment.workerId) {
      const txSnap = await getDocs(
        query(collection(db, "transactions"),
          where("paymentId", "==", payment.id),
          where("workerId", "==", payment.workerId)
        )
      );
      if (!txSnap.empty) {
        // Update the existing pending transaction to escrow/completed
        await updateDoc(doc(db, "transactions", txSnap.docs[0].id), {
          type:        "escrow",
          status:      "escrow",
          description: `Payment held in escrow for "${payment.service || "a service"}" — job in progress`,
          updatedAt:   serverTimestamp(),
        });
      } else {
        // No existing transaction — create one
        await addDoc(collection(db, "transactions"), {
          workerId:    payment.workerId,
          clientId:    payment.clientId || "",
          jobId:       payment.jobId    || "",
          paymentId:   payment.id,
          type:        "escrow",
          amount:      payment.amount,
          description: `Payment held in escrow for "${payment.service || "a service"}" — job in progress`,
          status:      "escrow",
          createdAt:   serverTimestamp(),
        });
      }
    }

    // 5. Notify worker — offer accepted
    if (payment.workerId) {
      await addDoc(collection(db, "notifications"), {
        userId:    payment.workerId,
        type:      "booking",
        title:     "Offer accepted & payment verified! 🎉",
        body:      `Payment of ₦${payment.amount.toLocaleString()} for "${payment.service || "a service"}" has been verified. Head to My Jobs to get started.`,
        link:      "/worker/my-jobs",
        read:      false,
        createdAt: serverTimestamp(),
      });
    }

    // 6. Notify client — payment confirmed
    if (payment.clientId) {
      await addDoc(collection(db, "notifications"), {
        userId:    payment.clientId,
        type:      "payment",
        title:     "Payment verified ✅",
        body:      `Your payment of ₦${payment.amount.toLocaleString()} has been verified. ${payment.workerName || "Your worker"} has been confirmed and will be in touch soon.`,
        link:      `/client/bookings?booking=${payment.jobId}`,
        read:      false,
        createdAt: serverTimestamp(),
      });
    }

    // 7. Auto-create chat between client and worker
    if (payment.clientId && payment.workerId) {
      await getOrCreateChat(payment.clientId, payment.workerId, payment.service || "Service", payment.jobId || "");
    }

    toast.success("Payment verified! Worker and client have been notified.");
  };

  const releasePayment = async (payment: Payment) => {
    // 1. Mark payment as released
    await updateDoc(doc(db, "payments", payment.id), {
      status: "released", releasedAt: serverTimestamp(),
    });

    if (payment.workerId) {
      // 2. Get current wallet balance from users collection
      const workerSnap = await getDoc(doc(db, "users", payment.workerId));
      const workerData = workerSnap.exists() ? workerSnap.data() : {};
      const currentBalance  = workerData.walletBalance  || 0;
      const currentEarned   = workerData.totalEarned    || 0;

      // 3. Update worker wallet balance in users collection
      await updateDoc(doc(db, "users", payment.workerId), {
        walletBalance: currentBalance + payment.amount,
        totalEarned:   currentEarned  + payment.amount,
      });

      // 4. Update existing transaction to "credit/completed" — or create if missing
      const txSnap = await getDocs(
        query(collection(db, "transactions"),
          where("paymentId", "==", payment.id),
          where("workerId", "==", payment.workerId)
        )
      );
      if (!txSnap.empty) {
        await updateDoc(doc(db, "transactions", txSnap.docs[0].id), {
          type:        "credit",
          status:      "completed",
          description: `₦${payment.amount.toLocaleString()} earned for "${payment.service || "a service"}"`,
          releasedAt:  serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, "transactions"), {
          workerId:    payment.workerId,
          clientId:    payment.clientId  || "",
          jobId:       payment.jobId     || "",
          paymentId:   payment.id,
          type:        "credit",
          amount:      payment.amount,
          description: `₦${payment.amount.toLocaleString()} earned for "${payment.service || "a service"}"`,
          status:      "completed",
          createdAt:   serverTimestamp(),
        });
      }

      // 5. Notify worker
      await addDoc(collection(db, "notifications"), {
        userId:    payment.workerId,
        type:      "payment",
        title:     "Payment Released! 💰",
        body:      `₦${payment.amount.toLocaleString()} has been added to your wallet for "${payment.service || "a job"}".`,
        link:      "/worker/earnings",
        read:      false,
        createdAt: serverTimestamp(),
      });
    }

    // 6. Update job payment status
    if (payment.jobId) {
      await updateDoc(doc(db, "jobs", payment.jobId), { paymentStatus: "released" });
    }

    toast.success(`₦${payment.amount.toLocaleString()} released to ${payment.workerName || "worker"}`);
  };

  const refundPayment = async (payment: Payment) => {
    await updateDoc(doc(db, "payments", payment.id), {
      status: "refunded", refundStatus: "approved", refundedAt: serverTimestamp()
    });
    if (payment.clientId) {
      await addDoc(collection(db, "notifications"), {
        userId: payment.clientId, type: "payment",
        title: "Refund Processed ✅",
        body: `₦${payment.amount.toLocaleString()} has been refunded. It may take 3–5 business days to appear.`,
        link: "/client/payments", read: false, createdAt: serverTimestamp(),
      });
    }
    toast.success("Payment refunded");
  };

  const pendingVerifCount = payments.filter(p => p.status === "pending_verification").length;
  const totalEscrow = payments.filter(p => p.status === "escrow" || p.status === "pending_verification").reduce((s, p) => s + p.amount, 0);
  const totalReleased = payments.filter(p => p.status === "released").reduce((s, p) => s + p.amount, 0);
  const refundRequests = payments.filter(p => p.refundStatus === "requested").length;

  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <AdminSidebar />
      <Toaster position="top-right" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-100 px-6 py-4 shrink-0">
          <div className="pl-10 lg:pl-0">
            <h1 className="text-lg font-bold text-[#0f172a]">Payments</h1>
            <p className="text-xs text-gray-400">{payments.length} total transactions</p>
          </div>
        </header>

        {/* Summary cards */}
        {/* Pending verification alert */}
        {pendingVerifCount > 0 && (
          <div className="mx-4 mt-4 bg-orange-50 border-2 border-orange-300 rounded-2xl p-4 flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-orange-600 animate-pulse" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-orange-800">
                {pendingVerifCount} payment{pendingVerifCount > 1 ? "s" : ""} awaiting your verification
              </p>
              <p className="text-xs text-orange-600 mt-0.5">
                Clients have submitted bank transfers. Check your account and verify below.
              </p>
            </div>
            <button onClick={() => setStatusFilter("pending_verification")}
              className="shrink-0 text-xs font-bold bg-orange-600 text-white px-3 py-1.5 rounded-lg hover:bg-orange-700 transition">
              View All →
            </button>
          </div>
        )}

        <div className="px-4 pt-4 shrink-0 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className={`rounded-xl border p-3.5 ${pendingVerifCount > 0 ? "bg-orange-50 border-orange-200" : "bg-white border-gray-100"}`}>
            <div className="flex items-center gap-2 mb-1">
              <Clock className={`w-4 h-4 ${pendingVerifCount > 0 ? "text-orange-500" : "text-gray-300"}`} />
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">To Verify</span>
            </div>
            <p className={`text-lg font-bold ${pendingVerifCount > 0 ? "text-orange-600" : "text-[#0f172a]"}`}>{pendingVerifCount}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-3.5">
            <div className="flex items-center gap-2 mb-1">
              <Lock className="w-4 h-4 text-[#0284c7]" />
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">In Escrow</span>
            </div>
            <p className="text-lg font-bold text-[#0f172a]">₦{totalEscrow.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-3.5">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Released</span>
            </div>
            <p className="text-lg font-bold text-[#0f172a]">₦{totalReleased.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-3.5">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className={`w-4 h-4 ${refundRequests > 0 ? "text-orange-500" : "text-gray-300"}`} />
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Refund Reqs</span>
            </div>
            <p className={`text-lg font-bold ${refundRequests > 0 ? "text-orange-600" : "text-[#0f172a]"}`}>{refundRequests}</p>
          </div>
        </div>

        <div className="p-4 bg-white border-b border-gray-100 flex flex-wrap gap-3 shrink-0 mt-4">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search payments…"
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0284c7]" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0284c7]">
            <option value="all">All Status</option>
            <option value="escrow">In Escrow</option>
            <option value="released">Released</option>
            <option value="refunded">Refunded</option>
            <option value="pending_verification">Awaiting Verification</option>
            <option value="pending">Pending</option>
          </select>
        </div>

        <main className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="space-y-2">{[...Array(8)].map((_, i) => <div key={i} className="bg-white rounded-xl p-4 animate-pulse h-16 border border-gray-100" />)}</div>
          ) : paginated.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <CreditCard className="w-10 h-10 text-gray-200 mb-3" />
              <p className="text-sm text-gray-400">No payments found</p>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                <div className="hidden md:grid grid-cols-[2fr_1.5fr_1.5fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3 bg-gray-50 text-[11px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                  <span>Service</span><span>Client</span><span>Worker</span>
                  <span>Amount</span><span>Date</span><span>Status</span><span></span>
                </div>
                <div className="divide-y divide-gray-50">
                  {paginated.map(payment => {
                    const st = STATUS_MAP[payment.status];
                    const Icon = st?.icon || Clock;
                    return (
                      <div key={payment.id} className="flex md:grid md:grid-cols-[2fr_1.5fr_1.5fr_1fr_1fr_1fr_auto] items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#0f172a] truncate">{payment.service || "—"}</p>
                          {payment.refundStatus === "requested" && (
                            <span className="text-[10px] text-orange-600 font-bold">⚠ Refund requested</span>
                          )}
                        </div>
                        <span className="hidden md:block text-sm text-gray-600 truncate">{payment.clientName || "—"}</span>
                        <span className="hidden md:block text-sm text-gray-600 truncate">{payment.workerName || "—"}</span>
                        <span className="hidden md:block text-sm font-bold text-[#0284c7]">₦{payment.amount.toLocaleString()}</span>
                        <span className="hidden md:block text-xs text-gray-400">{fmt(payment.createdAt?.seconds)}</span>
                        <span className={`hidden md:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full ${st?.cls}`}>
                          <Icon className="w-2.5 h-2.5" />{st?.label}
                        </span>
                        <button onClick={() => setSelected(payment)}
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
                  <p className="text-xs text-gray-400">{filtered.length} payments · Page {page + 1} of {totalPages}</p>
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
        {selected && <PaymentModal payment={selected} onClose={() => setSelected(null)} onVerify={verifyPayment} onRelease={releasePayment} onRefund={refundPayment} />}
      </AnimatePresence>
    </div>
  );
}