"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  CalendarCheck, ChevronRight, Search, Filter, X,
  Menu, MapPin, Calendar, Clock, Star, CheckCircle2,
  Send, Inbox, User, CreditCard, ShieldAlert,
  MessageCircle, Loader2, BadgeCheck, AlertCircle,
  ArrowRight, Zap, ShieldCheck, Lock, Banknote
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { db, auth } from "@/lib/firebase";
import {
  collection, query, where, onSnapshot,
  doc, updateDoc, addDoc, serverTimestamp, getDocs
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import ClientSidebar from "@/components/sidebar/ClientSidebar";
import toast, { Toaster } from "react-hot-toast";

// ─── Types ─────────────────────────────────────────────────────────────────────
type BookingStatus = "pending" | "in-progress" | "completed" | "cancelled" | "disputed";

interface Booking {
  id: string;
  service?: string;
  category?: string;
  description?: string;
  address?: string;
  date?: string;
  time?: string;
  urgency?: string;
  status: BookingStatus;
  workerId?: string;
  workerName?: string;
  amount?: number;
  paymentStatus?: string;
  createdAt?: { seconds: number };
}

interface Offer {
  id: string;
  jobId: string;
  workerId: string;
  clientId: string;
  workerName?: string;
  workerRating?: number;
  workerVerified?: boolean;
  workerCompletedJobs?: number;
  price: number;
  message: string;
  status: "pending" | "accepted" | "rejected";
  createdAt?: { seconds: number };
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function timeAgo(s?: number) {
  if (!s) return "";
  const d = Date.now() - s * 1000;
  if (d < 3600000) return `${Math.floor(d / 60000)}m ago`;
  if (d < 86400000) return `${Math.floor(d / 3600000)}h ago`;
  return `${Math.floor(d / 86400000)}d ago`;
}

function StatusBadge({ status }: { status: BookingStatus }) {
  const map: Record<BookingStatus, { cls: string; label: string }> = {
    pending:     { cls: "bg-yellow-100 text-yellow-700 border-yellow-200", label: "Awaiting Worker" },
    "in-progress":{ cls: "bg-blue-100 text-[#0284c7] border-blue-200",     label: "In Progress" },
    completed:   { cls: "bg-green-100 text-[#10b981] border-green-200",    label: "Completed" },
    cancelled:   { cls: "bg-gray-100 text-gray-500 border-gray-200",       label: "Cancelled" },
    disputed:    { cls: "bg-red-100 text-red-600 border-red-200",          label: "Disputed" },
  };
  const { cls, label } = map[status] || map.pending;
  return <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${cls}`}>{label}</span>;
}

// ─── Offer Card ─────────────────────────────────────────────────────────────────
function OfferCard({
  offer,
  onAccept,
  onReject,
  accepting,
}: {
  offer: Offer;
  onAccept: (offer: Offer) => Promise<void>;
  onReject: (offer: Offer) => Promise<void>;
  accepting: string | null;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`border-2 rounded-2xl p-4 transition ${
        offer.status === "accepted"
          ? "border-[#10b981] bg-[#f0fdf4]"
          : offer.status === "rejected"
          ? "border-gray-100 bg-gray-50 opacity-60"
          : "border-gray-100 bg-white hover:border-[#0284c7] hover:shadow-md"
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-[#0284c7] to-[#0c4a6e] rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0">
            {offer.workerName?.[0]?.toUpperCase() || "W"}
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-sm font-bold text-[#0c4a6e]">{offer.workerName || "Worker"}</p>
              {offer.workerVerified && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-[#10b981] bg-[#dcfce7] px-1.5 py-0.5 rounded-full">
                  <BadgeCheck className="w-2.5 h-2.5" /> Verified
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
              {offer.workerRating && (
                <span className="flex items-center gap-0.5">
                  <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                  {offer.workerRating}
                </span>
              )}
              {offer.workerCompletedJobs !== undefined && (
                <span>{offer.workerCompletedJobs} jobs done</span>
              )}
              <span>{timeAgo(offer.createdAt?.seconds)}</span>
            </div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-lg font-bold text-[#0c4a6e]">₦{offer.price.toLocaleString()}</p>
          {offer.status === "accepted" && (
            <span className="text-[10px] font-bold text-[#10b981] flex items-center gap-1 justify-end mt-0.5">
              <CheckCircle2 className="w-3 h-3" /> Accepted
            </span>
          )}
          {offer.status === "rejected" && (
            <span className="text-[10px] font-bold text-gray-400 mt-0.5 block">Declined</span>
          )}
        </div>
      </div>

      {/* Worker message */}
      <div className="bg-gray-50 rounded-xl px-4 py-3 mb-4">
        <p className="text-xs text-gray-600 leading-relaxed">{offer.message}</p>
      </div>

      {/* Actions */}
      {offer.status === "pending" && (
        <div className="flex gap-2">
          <button
            onClick={() => onAccept(offer)}
            disabled={accepting === offer.id}
            className="flex-1 bg-[#0284c7] text-white py-2.5 rounded-xl text-xs font-bold hover:bg-[#0369a1] transition flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm"
          >
            {accepting === offer.id
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <CheckCircle2 className="w-3.5 h-3.5" />
            }
            Accept Offer
          </button>
          <button
            onClick={() => onReject(offer)}
            disabled={accepting === offer.id}
            className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-xs font-semibold hover:bg-gray-50 transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <X className="w-3.5 h-3.5" /> Decline
          </button>
          <Link
            href={`/client/messages?worker=${offer.workerId}`}
            className="w-10 h-10 bg-[#f5f3ff] text-[#7c3aed] rounded-xl flex items-center justify-center hover:bg-[#ede9fe] transition"
            title="Message worker"
          >
            <MessageCircle className="w-4 h-4" />
          </Link>
        </div>
      )}

      {offer.status === "accepted" && (
        <Link
          href={`/client/messages?worker=${offer.workerId}`}
          className="w-full flex items-center justify-center gap-2 bg-[#dcfce7] text-[#10b981] py-2.5 rounded-xl text-xs font-bold hover:bg-[#bbf7d0] transition"
        >
          <MessageCircle className="w-3.5 h-3.5" /> Message {offer.workerName?.split(" ")[0]}
        </Link>
      )}
    </motion.div>
  );
}

// ─── Payment Modal ────────────────────────────────────────────────────────────
function PaymentModal({
  offer, booking, onClose, onConfirm, processing,
}: {
  offer: Offer; booking: Booking; onClose: () => void;
  onConfirm: (method: string) => Promise<void>; processing: boolean;
}) {
  const [method, setMethod] = useState<"card" | "transfer" | "ussd">("card");
  const methods = [
    { id: "card" as const,     label: "Debit / Credit Card",  sub: "Visa, Mastercard, Verve",  icon: <CreditCard className="w-5 h-5" /> },
    { id: "transfer" as const, label: "Bank Transfer",         sub: "Instant transfer via NIP",  icon: <Banknote className="w-5 h-5" /> },
    { id: "ussd" as const,     label: "USSD",                  sub: "*737#, *919#, *822# etc.",  icon: <Lock className="w-5 h-5" /> },
  ];
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0284c7] to-[#0c4a6e] p-5 text-white">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-xs text-blue-200 mb-0.5">Secure Payment</p>
              <h3 className="font-bold text-base">Pay to Confirm Worker</h3>
            </div>
            <button onClick={onClose} className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center hover:bg-white/20 transition">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="bg-white/10 rounded-xl px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-blue-200">Total to pay</p>
              <p className="text-2xl font-bold">₦{offer.price.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-blue-200">For</p>
              <p className="text-sm font-semibold">{booking.service || booking.category || "Service"}</p>
            </div>
          </div>
        </div>
        <div className="p-5 space-y-4">
          {/* Worker summary */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <div className="w-10 h-10 bg-gradient-to-br from-[#0284c7] to-[#0c4a6e] rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0">
              {offer.workerName?.[0]?.toUpperCase() || "W"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[#0c4a6e]">{offer.workerName || "Worker"}</p>
              <p className="text-xs text-gray-400">Payment held in escrow until job is complete</p>
            </div>
            <ShieldCheck className="w-5 h-5 text-[#10b981] shrink-0" />
          </div>
          {/* Payment methods */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Payment Method</p>
            {methods.map(m => (
              <button key={m.id} onClick={() => setMethod(m.id)}
                className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 transition text-left ${method === m.id ? "border-[#0284c7] bg-[#e0f2fe]" : "border-gray-100 bg-white hover:border-gray-200"}`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${method === m.id ? "bg-[#0284c7] text-white" : "bg-gray-100 text-gray-500"}`}>
                  {m.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#0c4a6e]">{m.label}</p>
                  <p className="text-xs text-gray-400">{m.sub}</p>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${method === m.id ? "border-[#0284c7] bg-[#0284c7]" : "border-gray-300"}`}>
                  {method === m.id && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                </div>
              </button>
            ))}
          </div>
          {/* Escrow notice */}
          <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl p-3.5 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-[#10b981] shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-[#047857]">Protected by Escrow</p>
              <p className="text-xs text-[#065f46] mt-0.5 leading-relaxed">
                Your payment is held securely and only released to the worker after you confirm the job is done.
              </p>
            </div>
          </div>
        </div>
        <div className="px-5 pb-5">
          <button onClick={() => onConfirm(method)} disabled={processing}
            className="w-full bg-[#0284c7] text-white py-3.5 rounded-xl text-sm font-bold hover:bg-[#0369a1] transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-md">
            {processing
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing Payment…</>
              : <><ShieldCheck className="w-4 h-4" /> Pay \u20a6{offer.price.toLocaleString()} Securely</>
            }
          </button>
          <p className="text-center text-[10px] text-gray-400 mt-2">🔒 Secured with 256-bit SSL encryption</p>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Booking Detail Modal ───────────────────────────────────────────────────────
function BookingModal({
  booking,
  onClose,
  defaultTab,
}: {
  booking: Booking;
  onClose: () => void;
  defaultTab?: string;
}) {
  const [tab, setTab] = useState<"details" | "offers">(defaultTab === "offers" ? "offers" : "details");
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loadingOffers, setLoadingOffers] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);
  // Payment gate state
  const [payOffer, setPayOffer] = useState<Offer | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "offers"), where("jobId", "==", booking.id));
    const unsub = onSnapshot(q, async (snap) => {
      const rawOffers = snap.docs.map(d => ({ id: d.id, ...d.data() } as Offer));

      // Enrich with worker details
      const enriched = await Promise.all(
        rawOffers.map(async (offer) => {
          try {
            const wSnap = await getDocs(query(collection(db, "workers"), where("__name__", "==", offer.workerId)));
            if (!wSnap.empty) {
              const w = wSnap.docs[0].data();
              return {
                ...offer,
                workerName: w.fullName || offer.workerName || "Worker",
                workerRating: w.rating,
                workerVerified: w.verified || false,
                workerCompletedJobs: w.completedJobs || 0,
              };
            }
          } catch {}
          return offer;
        })
      );

      enriched.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setOffers(enriched);
      setLoadingOffers(false);
    });
    return () => unsub();
  }, [booking.id]);

  const pendingOffers = offers.filter(o => o.status === "pending");

  // Step 1 — client clicks Accept → open payment modal
  const handleAccept = (offer: Offer) => {
    setPayOffer(offer);
  };

  // Step 2 — client pays → then confirm everything
  const handlePaymentConfirm = async (paymentMethod: string) => {
    if (!payOffer) return;
    setProcessing(true);
    try {
      const user = auth.currentUser!;

      // 1. Create escrow payment record
      await addDoc(collection(db, "payments"), {
        jobId:         booking.id,
        clientId:      user.uid,
        workerId:      payOffer.workerId,
        offerId:       payOffer.id,
        amount:        payOffer.price,
        service:       booking.service || booking.category || "Service",
        workerName:    payOffer.workerName || "",
        paymentMethod,
        status:        "escrow",
        refundStatus:  "none",
        createdAt:     serverTimestamp(),
      });

      // 2. Accept this offer
      await updateDoc(doc(db, "offers", payOffer.id), {
        status:     "accepted",
        acceptedAt: serverTimestamp(),
      });

      // 3. Reject all other pending offers
      const others = offers.filter(o => o.id !== payOffer.id && o.status === "pending");
      await Promise.all(others.map(o =>
        updateDoc(doc(db, "offers", o.id), { status: "rejected" })
      ));

      // 4. Update the job — mark in-progress with worker assigned
      await updateDoc(doc(db, "jobs", booking.id), {
        workerId:      payOffer.workerId,
        workerName:    payOffer.workerName || "",
        amount:        payOffer.price,
        status:        "in-progress",
        paymentStatus: "paid",
        startedAt:     serverTimestamp(),
      });

      // 5. Notify worker — offer accepted + payment received
      await addDoc(collection(db, "notifications"), {
        userId:    payOffer.workerId,
        type:      "booking",
        title:     "Offer accepted & payment received! 🎉",
        body:      `Your offer of ₦${payOffer.price.toLocaleString()} for "${booking.service || booking.category || "a service"}" was accepted and paid. Head to My Jobs to get started.`,
        link:      "/worker/my-jobs",
        read:      false,
        createdAt: serverTimestamp(),
      });

      // 6. Notify client — payment confirmed
      await addDoc(collection(db, "notifications"), {
        userId:    user.uid,
        type:      "booking",
        title:     "Payment successful",
        body:      `Payment of ₦${payOffer.price.toLocaleString()} held in escrow. ${payOffer.workerName || "Your worker"} has been confirmed.`,
        link:      `/client/bookings?booking=${booking.id}`,
        read:      false,
        createdAt: serverTimestamp(),
      });

      setPayOffer(null);
      toast.success(`Payment successful! ${payOffer.workerName || "The worker"} has been confirmed.`, {
        iconTheme: { primary: "#10b981", secondary: "#fff" },
        duration: 5000,
      });
    } catch {
      toast.error("Payment failed. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (offer: Offer) => {
    try {
      await updateDoc(doc(db, "offers", offer.id), {
        status: "rejected",
        rejectedAt: serverTimestamp(),
      });
      toast.success("Offer declined.");
    } catch {
      toast.error("Failed to decline offer.");
    }
  };

  return (
    <>
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0c4a6e] to-[#075985] p-5 text-white shrink-0">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-xs text-blue-300 mb-0.5">Booking #{booking.id.slice(-6).toUpperCase()}</p>
              <h3 className="font-bold text-base">{booking.service || booking.category || "Service Request"}</h3>
            </div>
            <button onClick={onClose} className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center hover:bg-white/20 transition">
              <X className="w-4 h-4" />
            </button>
          </div>
          <StatusBadge status={booking.status} />
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 bg-white shrink-0">
          <button
            onClick={() => setTab("details")}
            className={`flex-1 py-3 text-sm font-semibold transition ${tab === "details" ? "text-[#0284c7] border-b-2 border-[#0284c7]" : "text-gray-400 hover:text-gray-600"}`}
          >
            Details
          </button>
          <button
            onClick={() => setTab("offers")}
            className={`flex-1 py-3 text-sm font-semibold transition flex items-center justify-center gap-2 ${tab === "offers" ? "text-[#0284c7] border-b-2 border-[#0284c7]" : "text-gray-400 hover:text-gray-600"}`}
          >
            Offers
            {pendingOffers.length > 0 && (
              <span className="w-5 h-5 bg-[#0284c7] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {pendingOffers.length}
              </span>
            )}
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {tab === "details" && (
            <div className="p-5 space-y-4">
              {/* Info rows */}
              <div className="space-y-2">
                {[
                  { icon: <MapPin className="w-3.5 h-3.5" />, label: "Location", value: booking.address || "—" },
                  { icon: <Calendar className="w-3.5 h-3.5" />, label: "Date", value: booking.date ? `${booking.date}${booking.time ? ` at ${booking.time}` : ""}` : "—" },
                  ...(booking.urgency === "urgent" ? [{ icon: <Zap className="w-3.5 h-3.5" />, label: "Urgency", value: "Urgent" }] : []),
                  ...(booking.amount ? [{ icon: <CreditCard className="w-3.5 h-3.5" />, label: "Agreed Price", value: `₦${booking.amount.toLocaleString()}` }] : []),
                  ...(booking.workerName ? [{ icon: <User className="w-3.5 h-3.5" />, label: "Worker", value: booking.workerName }] : []),
                ].map(({ icon, label, value }) => (
                  <div key={label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-2 text-gray-400 text-xs">{icon}{label}</div>
                    <span className="text-sm font-semibold text-[#0c4a6e]">{value}</span>
                  </div>
                ))}
              </div>

              {booking.description && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1.5">Description</p>
                  <p className="text-sm text-gray-600 leading-relaxed">{booking.description}</p>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-2 pt-2">
                {booking.status === "pending" && (
                  <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-3.5 flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-yellow-800">Waiting for offers</p>
                      <p className="text-xs text-yellow-600 mt-0.5">Workers can see your request and send offers. Check the Offers tab above.</p>
                    </div>
                  </div>
                )}
                {booking.workerId && (
                  <Link href={`/client/messages?worker=${booking.workerId}`}
                    className="w-full flex items-center justify-center gap-2 bg-[#0284c7] text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-[#0369a1] transition">
                    <MessageCircle className="w-4 h-4" /> Message Worker
                  </Link>
                )}
                {booking.status === "in-progress" && (
                  <Link href={`/client/disputes?booking=${booking.id}`}
                    className="w-full flex items-center justify-center gap-2 border border-red-200 text-red-600 py-2.5 rounded-xl text-sm font-semibold hover:bg-red-50 transition">
                    <ShieldAlert className="w-4 h-4" /> Open Dispute
                  </Link>
                )}
              </div>
            </div>
          )}

          {tab === "offers" && (
            <div className="p-5 space-y-4">
              {loadingOffers ? (
                <div className="space-y-3">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="bg-gray-50 rounded-2xl p-4 animate-pulse space-y-3">
                      <div className="flex gap-3"><div className="w-10 h-10 bg-gray-100 rounded-full" /><div className="flex-1 space-y-2"><div className="h-3 bg-gray-100 rounded w-1/2" /><div className="h-2.5 bg-gray-100 rounded w-1/4" /></div></div>
                      <div className="h-12 bg-gray-100 rounded-xl" />
                    </div>
                  ))}
                </div>
              ) : offers.length > 0 ? (
                <div className="space-y-4">
                  {offers.some(o => o.status === "accepted") && (
                    <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl p-3 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#10b981]" />
                      <p className="text-xs text-[#047857] font-medium">You've accepted an offer. Other offers have been automatically declined.</p>
                    </div>
                  )}
                  {offers.map(offer => (
                    <OfferCard
                      key={offer.id}
                      offer={offer}
                      onAccept={handleAccept}
                      onReject={handleReject}
                      accepting={accepting}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-10">
                  <Inbox className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                  <h3 className="text-sm font-bold text-gray-400 mb-1">No offers yet</h3>
                  <p className="text-xs text-gray-300 max-w-xs mx-auto leading-relaxed">
                    Workers who can help will send you offers here. This usually happens within a few hours.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>

    {/* Payment modal — rendered above booking modal */}
    <AnimatePresence>
      {payOffer && (
        <PaymentModal
          offer={payOffer}
          booking={booking}
          onClose={() => setPayOffer(null)}
          onConfirm={handlePaymentConfirm}
          processing={processing}
        />
      )}
    </AnimatePresence>
    </>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────────
function MyBookingsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<BookingStatus | "all">("all");
  const [selected, setSelected] = useState<Booking | null>(null);
  const [defaultModalTab, setDefaultModalTab] = useState<string>("details");
  const [offerCounts, setOfferCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      if (!user) { router.push("/login"); return; }

      const q = query(collection(db, "jobs"), where("clientId", "==", user.uid));
      const unsubSnap = onSnapshot(q, snap => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Booking));
        data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setBookings(data);
        setLoading(false);

        // For each pending booking, count pending offers
        data.filter(b => b.status === "pending").forEach(booking => {
          const oQ = query(collection(db, "offers"),
            where("jobId", "==", booking.id),
            where("status", "==", "pending")
          );
          onSnapshot(oQ, oSnap => {
            setOfferCounts(prev => ({ ...prev, [booking.id]: oSnap.size }));
          });
        });
      });
      return () => unsubSnap();
    });

    // Auto-open from notification link: /client/bookings/JOBID?tab=offers
    const jobId = searchParams.get("booking");
    const tabParam = searchParams.get("tab");
    if (jobId) {
      setDefaultModalTab(tabParam || "details");
      // We'll open the modal once bookings load — handled below
    }

    return () => unsub();
  }, [router, searchParams]);

  // Auto-open modal from URL params
  useEffect(() => {
    const jobId = searchParams.get("booking");
    if (jobId && bookings.length > 0) {
      const found = bookings.find(b => b.id === jobId);
      if (found) {
        setSelected(found);
        setDefaultModalTab(searchParams.get("tab") || "details");
      }
    }
  }, [bookings, searchParams]);

  const TABS: { id: BookingStatus | "all"; label: string }[] = [
    { id: "all", label: "All" }, { id: "pending", label: "Pending" },
    { id: "in-progress", label: "In Progress" }, { id: "completed", label: "Completed" },
    { id: "cancelled", label: "Cancelled" },
  ];

  const counts = TABS.reduce<Record<string, number>>((acc, t) => {
    acc[t.id] = t.id === "all" ? bookings.length : bookings.filter(b => b.status === t.id).length;
    return acc;
  }, {});

  const filtered = bookings.filter(b => {
    const matchTab = activeTab === "all" || b.status === activeTab;
    const matchSearch = !search || [b.service, b.category, b.address].some(f => f?.toLowerCase().includes(search.toLowerCase()));
    return matchTab && matchSearch;
  });

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
          <span className="text-base font-bold text-[#0c4a6e]">My Bookings</span>
          <div className="w-9" />
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-5xl mx-auto space-y-6">

            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-[#0c4a6e]">My Bookings</h1>
                <p className="text-xs text-gray-400 mt-0.5">{bookings.length} total booking{bookings.length !== 1 ? "s" : ""}</p>
              </div>
              <Link href="/client/book"
                className="inline-flex items-center gap-2 bg-[#0284c7] text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#0369a1] transition shadow-md">
                <Send className="w-4 h-4" /> New Booking
              </Link>
            </div>

            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search bookings..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0284c7]" />
            </div>

            <div className="flex gap-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-1.5 overflow-x-auto">
              {TABS.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${activeTab === tab.id ? "bg-[#0284c7] text-white shadow-sm" : "text-gray-500 hover:bg-gray-50"}`}>
                  {tab.label}
                  {counts[tab.id] > 0 && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"}`}>
                      {counts[tab.id]}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse space-y-3">
                    <div className="flex gap-3"><div className="w-9 h-9 bg-gray-100 rounded-xl" /><div className="flex-1 space-y-2"><div className="h-3 bg-gray-100 rounded w-3/4" /><div className="h-2.5 bg-gray-100 rounded w-1/2" /></div></div>
                    <div className="h-8 bg-gray-100 rounded-xl" />
                  </div>
                ))}
              </div>
            ) : filtered.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence>
                  {filtered.map(booking => {
                    const pendingOfferCount = offerCounts[booking.id] || 0;
                    return (
                      <motion.div key={booking.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition cursor-pointer group overflow-hidden relative"
                        onClick={() => {
                          setSelected(booking);
                          setDefaultModalTab(pendingOfferCount > 0 ? "offers" : "details");
                        }}>

                        {/* Offer badge */}
                        {pendingOfferCount > 0 && (
                          <div className="absolute top-3 right-3 z-10">
                            <span className="inline-flex items-center gap-1 bg-[#0284c7] text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-md animate-pulse">
                              <Inbox className="w-2.5 h-2.5" />
                              {pendingOfferCount} offer{pendingOfferCount > 1 ? "s" : ""}
                            </span>
                          </div>
                        )}

                        <div className="p-4">
                          <div className="flex items-start gap-3 mb-3 pr-20">
                            <div className="w-9 h-9 bg-[#e0f2fe] rounded-xl flex items-center justify-center shrink-0">
                              <CalendarCheck className="w-4 h-4 text-[#0284c7]" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-[#0c4a6e] truncate">{booking.service || booking.category || "Service Booking"}</p>
                              <StatusBadge status={booking.status} />
                            </div>
                          </div>
                          <div className="space-y-1.5 mb-4">
                            {booking.address && (
                              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                <MapPin className="w-3 h-3 text-gray-300 shrink-0" /><span className="truncate">{booking.address}</span>
                              </div>
                            )}
                            {booking.date && (
                              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                <Calendar className="w-3 h-3 text-gray-300 shrink-0" />{booking.date}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                            <span className={`text-sm font-bold ${booking.amount ? "text-[#0c4a6e]" : "text-gray-300 text-xs"}`}>
                              {booking.amount ? `₦${booking.amount.toLocaleString()}` : "Awaiting offers"}
                            </span>
                            <div className="flex items-center gap-1 text-xs text-[#0284c7] font-semibold">
                              {pendingOfferCount > 0 ? "View offers" : "Details"} <ChevronRight className="w-3.5 h-3.5" />
                            </div>
                          </div>
                        </div>
                        <div className={`h-0.5 ${booking.status === "pending" ? "bg-yellow-300" : booking.status === "in-progress" ? "bg-[#0284c7]" : booking.status === "completed" ? "bg-[#10b981]" : "bg-gray-200"}`} />
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
                <CalendarCheck className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                <h3 className="text-base font-bold text-gray-400 mb-1">{search ? "No bookings match" : "No bookings yet"}</h3>
                <p className="text-sm text-gray-300 mb-5">Post a service request to get offers from workers</p>
                <Link href="/client/book" className="inline-flex items-center gap-2 bg-[#0284c7] text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-[#0369a1] transition">
                  <Send className="w-4 h-4" /> Book a Service
                </Link>
              </div>
            )}
          </div>
        </main>
      </div>

      <AnimatePresence>
        {selected && (
          <BookingModal
            booking={selected}
            onClose={() => { setSelected(null); setDefaultModalTab("details"); }}
            defaultTab={defaultModalTab}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
// ─── Suspense Wrapper (required for useSearchParams in Next.js) ────────────────
export default function MyBookingsPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-[#0284c7] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400 font-medium">Loading bookings…</p>
        </div>
      </div>
    }>
      <MyBookingsPageInner />
    </Suspense>
  );
}