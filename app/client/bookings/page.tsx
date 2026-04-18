"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  CalendarCheck, ChevronRight, Search, X,
  Menu, MapPin, Calendar, Clock, Star, CheckCircle2,
  Send, Inbox, User, CreditCard, ShieldAlert,
  MessageCircle, Loader2, BadgeCheck, AlertCircle,
  Zap, ShieldCheck, Banknote, Phone, Mail, Lock,
  Briefcase, Award, TrendingUp, ExternalLink
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { db, auth } from "@/lib/firebase";
import {
  collection, query, where, onSnapshot,
  doc, updateDoc, addDoc, serverTimestamp, getDocs, getDoc
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import ClientSidebar from "@/components/sidebar/ClientSidebar";
import toast, { Toaster } from "react-hot-toast";

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
  status: "pending" | "accepted" | "rejected" | "awaiting_payment";
  createdAt?: { seconds: number };
}

interface WorkerProfile {
  uid: string;
  displayName?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  bio?: string;
  skills?: string[];
  skillCategory?: string;
  experience?: string;
  location?: string;
  rating?: number;
  totalJobs?: number;
  verified?: boolean;
  verificationStatus?: string;
  walletBalance?: number;
  createdAt?: { seconds: number };
}

const PLATFORM_ACCOUNT = {
  bankName:      "Opay",
  accountNumber: "9058704410",
  accountName:   "SkillBridge Escrow",
};

function timeAgo(s?: number) {
  if (!s) return "";
  const d = Date.now() - s * 1000;
  if (d < 3600000)  return `${Math.floor(d / 60000)}m ago`;
  if (d < 86400000) return `${Math.floor(d / 3600000)}h ago`;
  return `${Math.floor(d / 86400000)}d ago`;
}

function StatusBadge({ status }: { status: BookingStatus }) {
  const map: Record<BookingStatus, { cls: string; label: string }> = {
    pending:      { cls: "bg-yellow-100 text-yellow-700 border-yellow-200", label: "Awaiting Worker" },
    "in-progress":{ cls: "bg-blue-100 text-[#0284c7] border-blue-200",     label: "In Progress"    },
    completed:    { cls: "bg-green-100 text-[#10b981] border-green-200",    label: "Completed"      },
    cancelled:    { cls: "bg-gray-100 text-gray-500 border-gray-200",       label: "Cancelled"      },
    disputed:     { cls: "bg-red-100 text-red-600 border-red-200",          label: "Disputed"       },
  };
  const { cls, label } = map[status] || map.pending;
  return <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${cls}`}>{label}</span>;
}

const AVATAR_COLORS = ["bg-blue-500","bg-emerald-500","bg-violet-500","bg-orange-500","bg-rose-500","bg-cyan-500"];
const avatarColor = (n: string) => AVATAR_COLORS[(n || "W").charCodeAt(0) % AVATAR_COLORS.length];
const initials    = (n: string) => (n || "W").split(" ").map(x => x[0]).join("").toUpperCase().slice(0, 2);

// ─── Worker Profile Modal ─────────────────────────────────────────────────────
function WorkerProfileModal({ workerId, onClose, onMessage, hasPaid }: {
  workerId: string;
  onClose: () => void;
  onMessage: () => void;
  hasPaid: boolean; // true if client has a confirmed/in-progress job with this worker
}) {
  const [worker, setWorker] = useState<WorkerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDoc(doc(db, "users", workerId)).then(snap => {
      if (snap.exists()) setWorker({ uid: snap.id, ...snap.data() } as WorkerProfile);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [workerId]);

  const name = worker?.displayName || worker?.fullName || "Worker";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="bg-gradient-to-r from-[#0c4a6e] to-[#075985] p-5 text-white shrink-0">
          <div className="flex items-start justify-between mb-4">
            <p className="text-xs text-blue-300">Worker Profile</p>
            <button onClick={onClose} className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center hover:bg-white/20 transition">
              <X className="w-4 h-4" />
            </button>
          </div>
          {loading ? (
            <div className="flex items-center gap-4 animate-pulse">
              <div className="w-16 h-16 bg-white/20 rounded-2xl" />
              <div className="space-y-2"><div className="h-4 bg-white/20 rounded w-32" /><div className="h-3 bg-white/20 rounded w-24" /></div>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 ${avatarColor(name)} rounded-2xl flex items-center justify-center text-white text-xl font-bold shrink-0 border-2 border-white/30`}>
                {initials(name)}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-lg">{name}</h3>
                  {worker?.verified && (
                    <span className="inline-flex items-center gap-1 bg-[#10b981]/20 text-[#34d399] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#10b981]/30">
                      <BadgeCheck className="w-2.5 h-2.5" /> Verified
                    </span>
                  )}
                </div>
                <p className="text-blue-200 text-sm mt-0.5">{worker?.skillCategory || worker?.skills?.[0] || "Skilled Worker"}</p>
                {worker?.location && (
                  <p className="text-blue-300 text-xs mt-1 flex items-center gap-1"><MapPin className="w-3 h-3" />{worker.location}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading ? (
            <div className="space-y-3 animate-pulse">
              {[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-xl" />)}
            </div>
          ) : worker ? (
            <>
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-[#f0fdf4] border border-green-100 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-[#10b981]">{worker.totalJobs || 0}</p>
                  <p className="text-[10px] text-gray-400 font-semibold uppercase">Jobs Done</p>
                </div>
                <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-yellow-600 flex items-center justify-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    {worker.rating ? worker.rating.toFixed(1) : "—"}
                  </p>
                  <p className="text-[10px] text-gray-400 font-semibold uppercase">Rating</p>
                </div>
                <div className="bg-[#e0f2fe] border border-blue-100 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-[#0284c7]">{worker.experience || "—"}</p>
                  <p className="text-[10px] text-gray-400 font-semibold uppercase">Experience</p>
                </div>
              </div>

              {/* Bio — always visible */}
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">About</p>
                {worker.bio
                  ? <p className="text-sm text-gray-600 leading-relaxed">{worker.bio}</p>
                  : <p className="text-sm text-gray-400 italic">No bio added yet.</p>
                }
              </div>

              {/* Skills — always visible */}
              {worker.skills && worker.skills.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Skills</p>
                  <div className="flex flex-wrap gap-2">
                    {worker.skills.map(s => (
                      <span key={s} className="text-xs bg-[#e0f2fe] text-[#0284c7] border border-blue-200 px-2.5 py-1 rounded-full font-medium">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Contact — only visible after payment confirmed */}
              {hasPaid ? (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Contact Details</p>
                  {worker.phone && (
                    <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                      <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                      <span className="text-sm font-semibold text-[#0c4a6e]">{worker.phone}</span>
                    </div>
                  )}
                  {worker.email && (
                    <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                      <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                      <span className="text-sm font-semibold text-[#0c4a6e] truncate">{worker.email}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                  <Lock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-amber-800">Contact details locked</p>
                    <p className="text-xs text-amber-600 mt-0.5 leading-relaxed">
                      Phone number and email are revealed after you accept an offer and payment is confirmed.
                    </p>
                  </div>
                </div>
              )}

              {/* Joined */}
              {worker.createdAt && (
                <p className="text-xs text-gray-400 text-center">
                  Member since {new Date(worker.createdAt.seconds * 1000).toLocaleDateString("en-NG", { month: "long", year: "numeric" })}
                </p>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <User className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-400">Profile not found</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 flex gap-2 shrink-0">
          <button onClick={onMessage}
            className="flex-1 bg-[#0284c7] text-white py-2.5 rounded-xl text-sm font-bold hover:bg-[#0369a1] transition flex items-center justify-center gap-2">
            <MessageCircle className="w-4 h-4" /> Message Worker
          </button>
          <button onClick={onClose}
            className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-200 transition">
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Offer Card ───────────────────────────────────────────────────────────────
function OfferCard({ offer, onAccept, onReject, onViewProfile }: {
  offer: Offer;
  onAccept: (offer: Offer) => void;
  onReject: (offer: Offer) => Promise<void>;
  onViewProfile: (workerId: string) => void;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className={`border-2 rounded-2xl p-4 transition ${
        offer.status === "accepted"        ? "border-[#10b981] bg-[#f0fdf4]"  :
        offer.status === "awaiting_payment"? "border-amber-300 bg-amber-50"   :
        offer.status === "rejected"        ? "border-gray-100 bg-gray-50 opacity-60" :
        "border-gray-100 bg-white hover:border-[#0284c7] hover:shadow-md"
      }`}>

      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <button onClick={() => onViewProfile(offer.workerId)}
            className={`w-10 h-10 ${avatarColor(offer.workerName || "W")} rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 hover:opacity-80 transition`}
            title="View profile">
            {initials(offer.workerName || "W")}
          </button>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button onClick={() => onViewProfile(offer.workerId)}
                className="text-sm font-bold text-[#0c4a6e] hover:underline text-left">
                {offer.workerName || "Worker"}
              </button>
              {offer.workerVerified && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-[#10b981] bg-[#dcfce7] px-1.5 py-0.5 rounded-full">
                  <BadgeCheck className="w-2.5 h-2.5" /> Verified
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
              {offer.workerRating && (
                <span className="flex items-center gap-0.5">
                  <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />{offer.workerRating}
                </span>
              )}
              {offer.workerCompletedJobs !== undefined && <span>{offer.workerCompletedJobs} jobs done</span>}
              <span>{timeAgo(offer.createdAt?.seconds)}</span>
              <button onClick={() => onViewProfile(offer.workerId)}
                className="flex items-center gap-0.5 text-[#0284c7] hover:underline font-medium">
                <ExternalLink className="w-2.5 h-2.5" /> View Profile
              </button>
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
          {offer.status === "awaiting_payment" && (
            <span className="text-[10px] font-bold text-amber-600 flex items-center gap-1 justify-end mt-0.5">
              <Clock className="w-3 h-3" /> Verifying
            </span>
          )}
          {offer.status === "rejected" && (
            <span className="text-[10px] font-bold text-gray-400 mt-0.5 block">Declined</span>
          )}
        </div>
      </div>

      <div className="bg-gray-50 rounded-xl px-4 py-3 mb-4">
        <p className="text-xs text-gray-600 leading-relaxed">{offer.message}</p>
      </div>

      {offer.status === "pending" && (
        <div className="flex gap-2">
          <button onClick={() => onAccept(offer)}
            className="flex-1 bg-[#0284c7] text-white py-2.5 rounded-xl text-xs font-bold hover:bg-[#0369a1] transition flex items-center justify-center gap-2 shadow-sm">
            <CheckCircle2 className="w-3.5 h-3.5" /> Accept Offer
          </button>
          <button onClick={() => onReject(offer)}
            className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-xs font-semibold hover:bg-gray-50 transition flex items-center justify-center gap-2">
            <X className="w-3.5 h-3.5" /> Decline
          </button>
          <button onClick={() => onViewProfile(offer.workerId)}
            className="w-10 h-10 bg-[#e0f2fe] text-[#0284c7] rounded-xl flex items-center justify-center hover:bg-[#bae6fd] transition"
            title="View worker profile">
            <User className="w-4 h-4" />
          </button>
        </div>
      )}

      {offer.status === "awaiting_payment" && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
          <Clock className="w-4 h-4 text-amber-500 shrink-0 animate-pulse" />
          <p className="text-xs text-amber-700 font-medium">Payment submitted — waiting for admin to verify your transfer</p>
        </div>
      )}

      {offer.status === "accepted" && (
        <div className="flex gap-2">
          <Link href={`/client/messages?worker=${offer.workerId}`}
            className="flex-1 flex items-center justify-center gap-2 bg-[#dcfce7] text-[#10b981] py-2.5 rounded-xl text-xs font-bold hover:bg-[#bbf7d0] transition">
            <MessageCircle className="w-3.5 h-3.5" /> Message {offer.workerName?.split(" ")[0]}
          </Link>
          <button onClick={() => onViewProfile(offer.workerId)}
            className="w-10 h-10 bg-gray-100 text-gray-500 rounded-xl flex items-center justify-center hover:bg-gray-200 transition"
            title="View worker profile">
            <User className="w-4 h-4" />
          </button>
        </div>
      )}
    </motion.div>
  );
}

// ─── Payment Modal ─────────────────────────────────────────────────────────────
function PaymentModal({ offer, booking, onClose, onConfirm, processing }: {
  offer: Offer; booking: Booking; onClose: () => void;
  onConfirm: () => Promise<void>; processing: boolean;
}) {
  const [copied, setCopied] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const copy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden max-h-[95vh] flex flex-col"
        onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-[#0284c7] to-[#0c4a6e] p-5 text-white shrink-0">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-xs text-blue-200 mb-0.5">Make Transfer</p>
              <h3 className="font-bold text-base">Pay into Escrow Account</h3>
            </div>
            <button onClick={onClose} className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center hover:bg-white/20 transition">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="bg-white/10 rounded-xl px-4 py-3 flex items-center justify-between">
            <div><p className="text-xs text-blue-200">Exact amount</p><p className="text-2xl font-bold">₦{offer.price.toLocaleString()}</p></div>
            <div className="text-right"><p className="text-xs text-blue-200">For</p><p className="text-sm font-semibold">{booking.service || booking.category || "Service"}</p></div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="bg-[#f0f9ff] border-2 border-[#bae6fd] rounded-2xl p-4 space-y-3">
            <p className="text-xs font-bold text-[#0284c7] uppercase tracking-wider flex items-center gap-1.5">
              <Banknote className="w-3.5 h-3.5" /> Transfer to this account
            </p>
            {[
              { label: "Bank Name",      value: PLATFORM_ACCOUNT.bankName,      field: "bank"    },
              { label: "Account Number", value: PLATFORM_ACCOUNT.accountNumber, field: "accno"   },
              { label: "Account Name",   value: PLATFORM_ACCOUNT.accountName,   field: "accname" },
            ].map(({ label, value, field }) => (
              <div key={field} className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-[#e0f2fe]">
                <div><p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{label}</p><p className="text-sm font-bold text-[#0c4a6e] mt-0.5">{value}</p></div>
                <button onClick={() => copy(value, field)} className="text-xs font-bold text-[#0284c7] bg-[#e0f2fe] px-3 py-1.5 rounded-lg hover:bg-[#bae6fd] transition flex items-center gap-1">
                  {copied === field ? <><CheckCircle2 className="w-3 h-3 text-[#10b981]" /> Copied!</> : "Copy"}
                </button>
              </div>
            ))}
            <div className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border-2 border-[#0284c7]">
              <div><p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Amount</p><p className="text-lg font-bold text-[#0284c7]">₦{offer.price.toLocaleString()}</p></div>
              <button onClick={() => copy(String(offer.price), "amount")} className="text-xs font-bold text-[#0284c7] bg-[#e0f2fe] px-3 py-1.5 rounded-lg hover:bg-[#bae6fd] transition flex items-center gap-1">
                {copied === "amount" ? <><CheckCircle2 className="w-3 h-3 text-[#10b981]" /> Copied!</> : "Copy"}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {["Open your banking app or USSD", `Transfer exactly ₦${offer.price.toLocaleString()} to the account above`, "Come back here and click \"I've Made Payment\" below", "Admin will verify and confirm your worker within minutes"].map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-[#0284c7] text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</div>
                <p className="text-xs text-gray-600 leading-relaxed">{step}</p>
              </div>
            ))}
          </div>

          <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl p-3.5 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-[#10b981] shrink-0 mt-0.5" />
            <p className="text-xs text-[#065f46] leading-relaxed"><span className="font-bold">Protected by Escrow.</span> Money is held safely and only released to the worker after you confirm the job is done.</p>
          </div>

          <label className="flex items-start gap-3 cursor-pointer bg-amber-50 border border-amber-200 rounded-xl p-3.5">
            <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} className="mt-0.5 w-4 h-4 accent-[#0284c7] shrink-0" />
            <p className="text-xs text-amber-800 leading-relaxed">
              I confirm that I have transferred <strong>₦{offer.price.toLocaleString()}</strong> to the SkillBridge Escrow account and the transaction is complete.
            </p>
          </label>
        </div>

        <div className="px-5 pb-5 pt-3 border-t border-gray-100 shrink-0">
          <button onClick={onConfirm} disabled={!confirmed || processing}
            className="w-full bg-[#0284c7] text-white py-3.5 rounded-xl text-sm font-bold hover:bg-[#0369a1] transition disabled:opacity-40 flex items-center justify-center gap-2 shadow-md">
            {processing ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : <><CheckCircle2 className="w-4 h-4" /> I've Made Payment — Notify Admin</>}
          </button>
          <p className="text-center text-[10px] text-gray-400 mt-2">Admin will verify your transfer and activate the worker</p>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Booking Detail Modal ─────────────────────────────────────────────────────
function BookingModal({ booking, onClose, defaultTab }: {
  booking: Booking; onClose: () => void; defaultTab?: string;
}) {
  const [tab, setTab]                 = useState<"details" | "offers">(defaultTab === "offers" ? "offers" : "details");
  const [offers, setOffers]           = useState<Offer[]>([]);
  const [loadingOffers, setLoading]   = useState(true);
  const [accepting, setAccepting]     = useState<string | null>(null);
  const [payOffer, setPayOffer]       = useState<Offer | null>(null);
  const [processing, setProcessing]   = useState(false);
  const [viewProfileId, setViewProfileId] = useState<string | null>(null);
  // hasPaid = payment verified by admin (job is in-progress or completed)
  const hasPaid = booking.status === "in-progress" || booking.status === "completed";

  useEffect(() => {
    const q = query(collection(db, "offers"), where("jobId", "==", booking.id));
    const unsub = onSnapshot(q, async snap => {
      const raw = snap.docs.map(d => ({ id: d.id, ...d.data() } as Offer));
      // Enrich worker details from users collection
      const enriched = await Promise.all(raw.map(async offer => {
        try {
          const uSnap = await getDoc(doc(db, "users", offer.workerId));
          if (uSnap.exists()) {
            const w = uSnap.data();
            return {
              ...offer,
              workerName:          w.displayName || w.fullName || offer.workerName || "Worker",
              workerRating:        w.rating        || undefined,
              workerVerified:      w.verified       || false,
              workerCompletedJobs: w.totalJobs      || 0,
            };
          }
        } catch {}
        return offer;
      }));
      enriched.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setOffers(enriched);
      setLoading(false);
    });
    return () => unsub();
  }, [booking.id]);

  const pendingOffers = offers.filter(o => o.status === "pending");

  const handlePaymentConfirm = async () => {
    if (!payOffer) return;
    setProcessing(true);
    try {
      const user = auth.currentUser!;
      const paymentRef = await addDoc(collection(db, "payments"), {
        jobId: booking.id, clientId: user.uid, workerId: payOffer.workerId,
        offerId: payOffer.id, amount: payOffer.price,
        service: booking.service || booking.category || "Service",
        workerName: payOffer.workerName || "", clientName: user.displayName || user.email || "",
        paymentMethod: "bank_transfer", status: "pending_verification", refundStatus: "none",
        platformBank: PLATFORM_ACCOUNT.bankName, platformAccNo: PLATFORM_ACCOUNT.accountNumber,
        createdAt: serverTimestamp(),
      });
      await addDoc(collection(db, "transactions"), {
        workerId: payOffer.workerId, clientId: user.uid, jobId: booking.id,
        paymentId: paymentRef.id, amount: payOffer.price, type: "escrow",
        description: `Payment for "${booking.service || booking.category || "service"}" — awaiting admin verification`,
        status: "pending", createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, "offers", payOffer.id), { status: "awaiting_payment", paymentId: paymentRef.id, updatedAt: serverTimestamp() });
      await updateDoc(doc(db, "jobs", booking.id), { paymentStatus: "pending_verification", paymentId: paymentRef.id, updatedAt: serverTimestamp() });
      await addDoc(collection(db, "notifications"), {
        userId: "admin", type: "payment_verification", title: "💰 New Payment to Verify",
        body: `${user.displayName || user.email} claims to have paid ₦${payOffer.price.toLocaleString()} for "${booking.service || booking.category || "a service"}". Worker: ${payOffer.workerName || payOffer.workerId}.`,
        link: "/admin/payments", paymentId: paymentRef.id, jobId: booking.id,
        clientId: user.uid, clientName: user.displayName || user.email || "",
        workerId: payOffer.workerId, workerName: payOffer.workerName || "",
        amount: payOffer.price, read: false, createdAt: serverTimestamp(),
      });
      await addDoc(collection(db, "notifications"), {
        userId: user.uid, type: "payment", title: "Payment submitted for verification ✅",
        body: `Your payment of ₦${payOffer.price.toLocaleString()} is being verified. Your worker will be confirmed shortly.`,
        link: `/client/bookings?booking=${booking.id}`, read: false, createdAt: serverTimestamp(),
      });
      await addDoc(collection(db, "notifications"), {
        userId: payOffer.workerId, type: "payment", title: "Payment pending for your offer 🕐",
        body: `A client submitted payment of ₦${payOffer.price.toLocaleString()} for "${booking.service || booking.category || "a service"}". Awaiting admin verification.`,
        link: "/worker/earnings", read: false, createdAt: serverTimestamp(),
      });
      setPayOffer(null);
      toast.success("Payment submitted! Admin will verify and confirm your worker shortly.", { duration: 6000 });
    } catch (err) { console.error(err); toast.error("Failed to submit. Please try again."); }
    finally { setProcessing(false); }
  };

  const handleReject = async (offer: Offer) => {
    try {
      await updateDoc(doc(db, "offers", offer.id), { status: "rejected", rejectedAt: serverTimestamp() });
      toast.success("Offer declined.");
    } catch { toast.error("Failed to decline offer."); }
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        onClick={onClose}>
        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
          onClick={e => e.stopPropagation()}>

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

          <div className="flex border-b border-gray-100 bg-white shrink-0">
            <button onClick={() => setTab("details")} className={`flex-1 py-3 text-sm font-semibold transition ${tab === "details" ? "text-[#0284c7] border-b-2 border-[#0284c7]" : "text-gray-400 hover:text-gray-600"}`}>Details</button>
            <button onClick={() => setTab("offers")} className={`flex-1 py-3 text-sm font-semibold transition flex items-center justify-center gap-2 ${tab === "offers" ? "text-[#0284c7] border-b-2 border-[#0284c7]" : "text-gray-400 hover:text-gray-600"}`}>
              Offers
              {pendingOffers.length > 0 && <span className="w-5 h-5 bg-[#0284c7] text-white text-[10px] font-bold rounded-full flex items-center justify-center">{pendingOffers.length}</span>}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {tab === "details" && (
              <div className="p-5 space-y-4">
                <div className="space-y-2">
                  {[
                    { icon: <MapPin className="w-3.5 h-3.5" />,    label: "Location",     value: booking.address || "—" },
                    { icon: <Calendar className="w-3.5 h-3.5" />,  label: "Date",         value: booking.date ? `${booking.date}${booking.time ? ` at ${booking.time}` : ""}` : "—" },
                    ...(booking.urgency === "urgent" ? [{ icon: <Zap className="w-3.5 h-3.5" />, label: "Urgency", value: "Urgent" }] : []),
                    ...(booking.amount   ? [{ icon: <CreditCard className="w-3.5 h-3.5" />, label: "Agreed Price", value: `₦${booking.amount.toLocaleString()}` }] : []),
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
                    <div className="flex gap-2">
                      <Link href={`/client/messages?worker=${booking.workerId}`}
                        className="flex-1 flex items-center justify-center gap-2 bg-[#0284c7] text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-[#0369a1] transition">
                        <MessageCircle className="w-4 h-4" /> Message Worker
                      </Link>
                      <button onClick={() => setViewProfileId(booking.workerId!)}
                        className="w-11 h-11 bg-gray-100 text-gray-600 rounded-xl flex items-center justify-center hover:bg-gray-200 transition"
                        title="View worker profile">
                        <User className="w-4 h-4" />
                      </button>
                    </div>
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
                  <div className="space-y-3">{[...Array(2)].map((_, i) => (
                    <div key={i} className="bg-gray-50 rounded-2xl p-4 animate-pulse space-y-3">
                      <div className="flex gap-3"><div className="w-10 h-10 bg-gray-100 rounded-full" /><div className="flex-1 space-y-2"><div className="h-3 bg-gray-100 rounded w-1/2" /><div className="h-2.5 bg-gray-100 rounded w-1/4" /></div></div>
                      <div className="h-12 bg-gray-100 rounded-xl" />
                    </div>
                  ))}</div>
                ) : offers.length > 0 ? (
                  <div className="space-y-4">
                    {offers.some(o => o.status === "accepted") && (
                      <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl p-3 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#10b981]" />
                        <p className="text-xs text-[#047857] font-medium">You've accepted an offer. Other offers have been declined.</p>
                      </div>
                    )}
                    {offers.map(offer => (
                      <OfferCard key={offer.id} offer={offer}
                        onAccept={o => setPayOffer(o)}
                        onReject={handleReject}
                        onViewProfile={id => setViewProfileId(id)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <Inbox className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                    <h3 className="text-sm font-bold text-gray-400 mb-1">No offers yet</h3>
                    <p className="text-xs text-gray-300 max-w-xs mx-auto">Workers who can help will send offers here within a few hours.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* Payment modal */}
      <AnimatePresence>
        {payOffer && (
          <PaymentModal offer={payOffer} booking={booking}
            onClose={() => setPayOffer(null)}
            onConfirm={handlePaymentConfirm}
            processing={processing} />
        )}
      </AnimatePresence>

      {/* Worker profile modal */}
      <AnimatePresence>
        {viewProfileId && (
          <WorkerProfileModal
            workerId={viewProfileId}
            onClose={() => setViewProfileId(null)}
            onMessage={() => { setViewProfileId(null); }}
            hasPaid={hasPaid}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
function MyBookingsPageInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const [mobileOpen,      setMobileOpen]      = useState(false);
  const [bookings,        setBookings]         = useState<Booking[]>([]);
  const [loading,         setLoading]          = useState(true);
  const [search,          setSearch]           = useState("");
  const [activeTab,       setActiveTab]        = useState<BookingStatus | "all">("all");
  const [selected,        setSelected]         = useState<Booking | null>(null);
  const [defaultModalTab, setDefaultModalTab]  = useState<string>("details");
  const [offerCounts,     setOfferCounts]      = useState<Record<string, number>>({});

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      if (!user) { router.push("/login"); return; }
      const q = query(collection(db, "jobs"), where("clientId", "==", user.uid));
      const unsubSnap = onSnapshot(q, snap => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Booking))
          .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setBookings(data);
        setLoading(false);
        data.filter(b => b.status === "pending").forEach(booking => {
          onSnapshot(
            query(collection(db, "offers"), where("jobId", "==", booking.id), where("status", "==", "pending")),
            oSnap => setOfferCounts(prev => ({ ...prev, [booking.id]: oSnap.size }))
          );
        });
      });
      return () => unsubSnap();
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    const jobId = searchParams.get("booking");
    if (jobId && bookings.length > 0) {
      const found = bookings.find(b => b.id === jobId);
      if (found) { setSelected(found); setDefaultModalTab(searchParams.get("tab") || "details"); }
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
    const matchTab    = activeTab === "all" || b.status === activeTab;
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
          <button onClick={() => setMobileOpen(true)} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100"><Menu className="w-5 h-5 text-[#0c4a6e]" /></button>
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
              <Link href="/client/book" className="inline-flex items-center gap-2 bg-[#0284c7] text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#0369a1] transition shadow-md">
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
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"}`}>{counts[tab.id]}</span>
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
                        onClick={() => { setSelected(booking); setDefaultModalTab(pendingOfferCount > 0 ? "offers" : "details"); }}>
                        {pendingOfferCount > 0 && (
                          <div className="absolute top-3 right-3 z-10">
                            <span className="inline-flex items-center gap-1 bg-[#0284c7] text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-md animate-pulse">
                              <Inbox className="w-2.5 h-2.5" />{pendingOfferCount} offer{pendingOfferCount > 1 ? "s" : ""}
                            </span>
                          </div>
                        )}
                        <div className="p-4">
                          <div className="flex items-start gap-3 mb-3 pr-20">
                            <div className="w-9 h-9 bg-[#e0f2fe] rounded-xl flex items-center justify-center shrink-0"><CalendarCheck className="w-4 h-4 text-[#0284c7]" /></div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-[#0c4a6e] truncate">{booking.service || booking.category || "Service Booking"}</p>
                              <StatusBadge status={booking.status} />
                            </div>
                          </div>
                          <div className="space-y-1.5 mb-4">
                            {booking.address && <div className="flex items-center gap-1.5 text-xs text-gray-400"><MapPin className="w-3 h-3 text-gray-300 shrink-0" /><span className="truncate">{booking.address}</span></div>}
                            {booking.date    && <div className="flex items-center gap-1.5 text-xs text-gray-400"><Calendar className="w-3 h-3 text-gray-300 shrink-0" />{booking.date}</div>}
                            {booking.workerName && <div className="flex items-center gap-1.5 text-xs text-gray-400"><User className="w-3 h-3 text-gray-300 shrink-0" />{booking.workerName}</div>}
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
          <BookingModal booking={selected}
            onClose={() => { setSelected(null); setDefaultModalTab("details"); }}
            defaultTab={defaultModalTab} />
        )}
      </AnimatePresence>
    </div>
  );
}

export default function MyBookingsPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-[#0284c7] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <MyBookingsPageInner />
    </Suspense>
  );
}