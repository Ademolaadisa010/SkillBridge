"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarCheck, Clock, CheckCircle2, AlertTriangle, Search,
  ChevronRight, Menu, ArrowLeft, MapPin, User, CreditCard,
  MessageCircle, Star, X, Eye, ShieldAlert, Loader2,
  CalendarPlus, Filter
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { db, auth } from "@/lib/firebase";
import {
  collection, query, where, onSnapshot, doc,
  updateDoc, serverTimestamp, addDoc
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import ClientSidebar from "@/components/sidebar/ClientSidebar";
import toast, { Toaster } from "react-hot-toast";

type BookingStatus = "pending" | "in-progress" | "completed" | "disputed";

interface Booking {
  id: string;
  service?: string;
  category?: string;
  description?: string;
  workerName?: string;
  workerId?: string;
  workerRating?: number;
  address?: string;
  date?: string;
  time?: string;
  amount?: number;
  status: BookingStatus;
  createdAt?: { seconds: number };
  urgency?: string;
}

// ─── Tab config ────────────────────────────────────────────────────────────────
const TABS: { id: BookingStatus | "all"; label: string; color: string }[] = [
  { id: "all",         label: "All",         color: "text-gray-600" },
  { id: "pending",     label: "Pending",     color: "text-yellow-600" },
  { id: "in-progress", label: "In Progress", color: "text-blue-600" },
  { id: "completed",   label: "Completed",   color: "text-green-600" },
  { id: "disputed",    label: "Disputed",    color: "text-red-600" },
];

// ─── Status Badge ───────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: BookingStatus }) {
  const map: Record<BookingStatus, { cls: string; icon: React.ReactNode; label: string }> = {
    pending:     { cls: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: <Clock className="w-3 h-3" />,        label: "Pending" },
    "in-progress": { cls: "bg-blue-100 text-[#0284c7] border-blue-200",   icon: <CalendarCheck className="w-3 h-3" />, label: "In Progress" },
    completed:   { cls: "bg-green-100 text-[#10b981] border-green-200",   icon: <CheckCircle2 className="w-3 h-3" />,  label: "Completed" },
    disputed:    { cls: "bg-red-100 text-red-600 border-red-200",         icon: <AlertTriangle className="w-3 h-3" />, label: "Disputed" },
  };
  const { cls, icon, label } = map[status] || map.pending;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border ${cls}`}>
      {icon}{label}
    </span>
  );
}

// ─── Booking Detail Modal ───────────────────────────────────────────────────────
function BookingModal({
  booking, onClose, onAction
}: {
  booking: Booking;
  onClose: () => void;
  onAction: (action: string, booking: Booking) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2 }}
        className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="bg-gradient-to-r from-[#0c4a6e] to-[#075985] p-5 text-white">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-bold text-base">{booking.service || booking.category || "Service Booking"}</h3>
              <p className="text-blue-200 text-xs mt-0.5">Booking #{booking.id.slice(-6).toUpperCase()}</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center hover:bg-white/20 transition">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-3">
            <StatusBadge status={booking.status} />
          </div>
        </div>

        {/* Modal body */}
        <div className="p-5 space-y-4">
          {booking.description && (
            <div>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Description</div>
              <p className="text-sm text-gray-600 leading-relaxed">{booking.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {booking.workerName && (
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1"><User className="w-3 h-3" /> Worker</div>
                <div className="text-sm font-semibold text-[#0c4a6e]">{booking.workerName}</div>
                {booking.workerRating && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                    <span className="text-xs text-gray-500">{booking.workerRating}</span>
                  </div>
                )}
              </div>
            )}
            {booking.amount && (
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1"><CreditCard className="w-3 h-3" /> Amount</div>
                <div className="text-sm font-bold text-[#0c4a6e]">₦{booking.amount.toLocaleString()}</div>
                <div className="text-[10px] text-[#10b981] font-medium mt-0.5">Escrow held</div>
              </div>
            )}
            {booking.address && (
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1"><MapPin className="w-3 h-3" /> Location</div>
                <div className="text-xs text-gray-600 leading-tight">{booking.address}</div>
              </div>
            )}
            {booking.date && (
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1"><CalendarCheck className="w-3 h-3" /> Date</div>
                <div className="text-sm font-semibold text-[#0c4a6e]">{booking.date}</div>
                {booking.time && <div className="text-xs text-gray-400">{booking.time}</div>}
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="p-5 pt-0 space-y-2">
          {booking.status === "in-progress" && (
            <button
              onClick={() => onAction("release", booking)}
              className="w-full bg-[#10b981] text-white py-3 rounded-xl text-sm font-bold hover:bg-[#059669] transition flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" /> Release Payment & Complete
            </button>
          )}
          {(booking.status === "pending" || booking.status === "in-progress") && (
            <button
              onClick={() => onAction("message", booking)}
              className="w-full bg-[#0284c7] text-white py-3 rounded-xl text-sm font-bold hover:bg-[#0369a1] transition flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4 h-4" /> Message Worker
            </button>
          )}
          {booking.status === "completed" && !booking.workerRating && (
            <button
              onClick={() => onAction("review", booking)}
              className="w-full bg-yellow-500 text-white py-3 rounded-xl text-sm font-bold hover:bg-yellow-600 transition flex items-center justify-center gap-2"
            >
              <Star className="w-4 h-4" /> Leave a Review
            </button>
          )}
          {(booking.status === "pending" || booking.status === "in-progress") && (
            <button
              onClick={() => onAction("dispute", booking)}
              className="w-full bg-white border border-red-200 text-red-600 py-3 rounded-xl text-sm font-semibold hover:bg-red-50 transition flex items-center justify-center gap-2"
            >
              <ShieldAlert className="w-4 h-4" /> Open Dispute
            </button>
          )}
          {booking.status === "pending" && (
            <button
              onClick={() => onAction("cancel", booking)}
              className="w-full text-gray-500 text-xs py-2 hover:text-red-500 transition"
            >
              Cancel Booking
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Booking Card ───────────────────────────────────────────────────────────────
function BookingCard({ booking, onClick }: { booking: Booking; onClick: () => void }) {
  const categoryColors: Record<string, string> = {
    plumbing: "bg-blue-100 text-blue-600",
    electrical: "bg-yellow-100 text-yellow-600",
    carpentry: "bg-orange-100 text-orange-600",
    painting: "bg-green-100 text-green-600",
    mechanics: "bg-red-100 text-red-600",
    "ac-technician": "bg-cyan-100 text-cyan-600",
    electrician: "bg-purple-100 text-purple-600",
    other: "bg-gray-100 text-gray-600",
  };
  const catColor = categoryColors[booking.category || "other"] || categoryColors.other;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden group cursor-pointer"
      onClick={onClick}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm shrink-0 ${catColor}`}>
              <i className="fas fa-tools" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-[#0c4a6e] text-sm truncate">
                {booking.service || booking.category || "Service Booking"}
              </h4>
              <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">
                {booking.description || "No description provided"}
              </p>
            </div>
          </div>
          <StatusBadge status={booking.status} />
        </div>

        <div className="grid grid-cols-2 gap-2 mt-4">
          {booking.workerName && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <User className="w-3 h-3 text-gray-300" />
              <span className="truncate">{booking.workerName}</span>
            </div>
          )}
          {booking.date && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <CalendarCheck className="w-3 h-3 text-gray-300" />
              <span>{booking.date}</span>
            </div>
          )}
          {booking.address && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500 col-span-2">
              <MapPin className="w-3 h-3 text-gray-300 shrink-0" />
              <span className="truncate">{booking.address}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50">
          <div>
            {booking.amount
              ? <span className="text-sm font-bold text-[#0c4a6e]">₦{booking.amount.toLocaleString()}</span>
              : <span className="text-xs text-gray-400 italic">Awaiting offer</span>
            }
          </div>
          <div className="flex items-center gap-1 text-xs text-[#0284c7] font-semibold group-hover:gap-2 transition-all">
            View Details <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      {/* Status strip */}
      <div className={`h-1 w-full ${
        booking.status === "pending"     ? "bg-yellow-300" :
        booking.status === "in-progress" ? "bg-[#0284c7]" :
        booking.status === "completed"   ? "bg-[#10b981]" :
        "bg-red-400"
      }`} />
    </motion.div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────────
export default function MyBookingsPage() {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<BookingStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) { router.push("/login"); return; }

      const q = query(collection(db, "jobs"), where("clientId", "==", user.uid));
      const unsubSnap = onSnapshot(q, (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Booking));
        // Sort newest first
        data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setBookings(data);
        setLoading(false);
      });

      return () => unsubSnap();
    });
    return () => unsub();
  }, [router]);

  // Filter
  const filtered = bookings.filter(b => {
    const matchTab = activeTab === "all" || b.status === activeTab;
    const matchSearch = !search || [b.service, b.category, b.workerName, b.address, b.description]
      .some(f => f?.toLowerCase().includes(search.toLowerCase()));
    return matchTab && matchSearch;
  });

  // Tab counts
  const counts = TABS.reduce<Record<string, number>>((acc, t) => {
    acc[t.id] = t.id === "all" ? bookings.length : bookings.filter(b => b.status === t.id).length;
    return acc;
  }, {});

  const handleAction = async (action: string, booking: Booking) => {
    setActionLoading(true);
    try {
      if (action === "release") {
        await updateDoc(doc(db, "jobs", booking.id), { status: "completed", completedAt: serverTimestamp() });
        toast.success("Payment released! Job marked as complete.");
        setSelectedBooking(null);
      } else if (action === "cancel") {
        await updateDoc(doc(db, "jobs", booking.id), { status: "cancelled", cancelledAt: serverTimestamp() });
        toast.success("Booking cancelled.");
        setSelectedBooking(null);
      } else if (action === "dispute") {
        router.push(`/client/disputes?booking=${booking.id}`);
      } else if (action === "message") {
        router.push(`/client/messages?worker=${booking.workerId}`);
      } else if (action === "review") {
        router.push(`/client/bookings/${booking.id}/review`);
      }
    } catch (err) {
      console.error(err);
      toast.error("Action failed. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Toaster position="top-center" />

      <ClientSidebar />

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full [&>aside]:flex">
            <ClientSidebar />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="lg:hidden bg-white border-b border-gray-100 px-4 h-14 flex items-center justify-between shrink-0 shadow-sm">
          <button onClick={() => setMobileOpen(true)} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition">
            <Menu className="w-5 h-5 text-[#0c4a6e]" />
          </button>
          <span className="text-base font-bold text-[#0c4a6e]">My Bookings</span>
          <div className="w-9" />
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-5xl mx-auto space-y-6">

            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <Link href="/client/dashboard" className="w-9 h-9 bg-white border border-gray-200 rounded-xl flex items-center justify-center hover:bg-gray-50 transition shrink-0 lg:hidden">
                  <ArrowLeft className="w-4 h-4 text-gray-500" />
                </Link>
                <div>
                  <h1 className="text-xl font-bold text-[#0c4a6e]">My Bookings</h1>
                  <p className="text-xs text-gray-400">{bookings.length} total booking{bookings.length !== 1 ? "s" : ""}</p>
                </div>
              </div>
              <Link
                href="/client/book"
                className="inline-flex items-center gap-2 bg-[#0284c7] text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#0369a1] transition shadow-md self-start sm:self-auto"
              >
                <CalendarPlus className="w-4 h-4" /> New Booking
              </Link>
            </div>

            {/* ── Search & Filter ── */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by service, worker, or location…"
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0284c7] transition"
                />
                {search && (
                  <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* ── Tabs ── */}
            <div className="flex gap-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-1.5 overflow-x-auto">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    activeTab === tab.id
                      ? "bg-[#0284c7] text-white shadow-sm"
                      : "text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  {tab.label}
                  {counts[tab.id] > 0 && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      activeTab === tab.id ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
                    }`}>
                      {counts[tab.id]}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* ── Content ── */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse space-y-3">
                    <div className="flex gap-3">
                      <div className="w-9 h-9 bg-gray-100 rounded-xl shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-gray-100 rounded w-3/4" />
                        <div className="h-2.5 bg-gray-100 rounded w-1/2" />
                      </div>
                    </div>
                    <div className="h-8 bg-gray-100 rounded-xl" />
                  </div>
                ))}
              </div>
            ) : filtered.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence>
                  {filtered.map(booking => (
                    <BookingCard
                      key={booking.id}
                      booking={booking}
                      onClick={() => setSelectedBooking(booking)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
                <CalendarCheck className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                <h3 className="text-base font-bold text-gray-400 mb-1">
                  {search ? "No bookings match your search" : activeTab === "all" ? "No bookings yet" : `No ${activeTab} bookings`}
                </h3>
                <p className="text-sm text-gray-300 mb-5">
                  {search ? "Try a different search term" : "Book your first service to get started"}
                </p>
                {!search && (
                  <Link
                    href="/client/book"
                    className="inline-flex items-center gap-2 bg-[#0284c7] text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-[#0369a1] transition"
                  >
                    <CalendarPlus className="w-4 h-4" /> Book a Service
                  </Link>
                )}
              </div>
            )}

          </div>
        </main>
      </div>

      {/* ── Booking Detail Modal ── */}
      <AnimatePresence>
        {selectedBooking && (
          <BookingModal
            booking={selectedBooking}
            onClose={() => setSelectedBooking(null)}
            onAction={handleAction}
          />
        )}
      </AnimatePresence>
    </div>
  );
}