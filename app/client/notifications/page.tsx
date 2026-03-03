"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Bell, BellOff, CheckCheck, Trash2, Filter,
  CalendarCheck, CreditCard, ShieldAlert, MessageCircle,
  Star, ShieldCheck, Info, ChevronRight, Menu,
  Circle, Clock, X, Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { db, auth } from "@/lib/firebase";
import {
  collection, query, where, onSnapshot,
  doc, updateDoc, writeBatch, serverTimestamp, orderBy
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import ClientSidebar from "@/components/sidebar/ClientSidebar";
import toast, { Toaster } from "react-hot-toast";

// ─── Types ─────────────────────────────────────────────────────────────────────
type NotifType = "booking" | "payment" | "message" | "dispute" | "review" | "system" | "verification";

interface Notification {
  id: string;
  userId: string;
  type: NotifType;
  title: string;
  body: string;
  read: boolean;
  link?: string;
  createdAt?: { seconds: number };
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function formatTime(seconds?: number) {
  if (!seconds) return "—";
  const d = new Date(seconds * 1000);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  return d.toLocaleDateString("en-NG", { month: "short", day: "numeric" });
}

// ─── Notification config ────────────────────────────────────────────────────────
const NOTIF_CONFIG: Record<NotifType, { icon: React.ReactNode; iconBg: string; color: string }> = {
  booking:      { icon: <CalendarCheck className="w-5 h-5" />,  iconBg: "bg-[#e0f2fe]",  color: "text-[#0284c7]" },
  payment:      { icon: <CreditCard className="w-5 h-5" />,     iconBg: "bg-[#dcfce7]",  color: "text-[#10b981]" },
  message:      { icon: <MessageCircle className="w-5 h-5" />,  iconBg: "bg-[#f5f3ff]",  color: "text-[#7c3aed]" },
  dispute:      { icon: <ShieldAlert className="w-5 h-5" />,    iconBg: "bg-red-50",      color: "text-red-500" },
  review:       { icon: <Star className="w-5 h-5" />,           iconBg: "bg-yellow-50",   color: "text-yellow-500" },
  system:       { icon: <Info className="w-5 h-5" />,           iconBg: "bg-gray-100",    color: "text-gray-500" },
  verification: { icon: <ShieldCheck className="w-5 h-5" />,   iconBg: "bg-[#dcfce7]",  color: "text-[#10b981]" },
};

const TYPE_LABELS: Record<NotifType, string> = {
  booking:      "Booking",
  payment:      "Payment",
  message:      "Message",
  dispute:      "Dispute",
  review:       "Review",
  system:       "System",
  verification: "Verification",
};

// ─── Notification Item ──────────────────────────────────────────────────────────
function NotifItem({
  notif,
  onRead,
  onDelete,
}: {
  notif: Notification;
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const cfg = NOTIF_CONFIG[notif.type] || NOTIF_CONFIG.system;

  const inner = (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
      className={`group relative flex items-start gap-4 p-4 rounded-2xl border transition-all duration-200 cursor-pointer
        ${notif.read
          ? "bg-white border-gray-100 hover:shadow-sm"
          : "bg-[#f0f9ff] border-[#bae6fd] hover:shadow-md"
        }`}
      onClick={() => !notif.read && onRead(notif.id)}
    >
      {/* Unread dot */}
      {!notif.read && (
        <div className="absolute top-4 right-4 w-2 h-2 bg-[#0284c7] rounded-full" />
      )}

      {/* Icon */}
      <div className={`w-10 h-10 ${cfg.iconBg} rounded-xl flex items-center justify-center shrink-0 ${cfg.color}`}>
        {cfg.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pr-6">
        <div className="flex items-start justify-between gap-2 mb-0.5">
          <p className={`text-sm font-semibold leading-snug ${notif.read ? "text-gray-700" : "text-[#0c4a6e]"}`}>
            {notif.title}
          </p>
        </div>
        <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{notif.body}</p>
        <div className="flex items-center gap-2 mt-2">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            notif.read ? "bg-gray-100 text-gray-400" : `${cfg.iconBg} ${cfg.color}`
          }`}>
            {TYPE_LABELS[notif.type]}
          </span>
          <span className="text-[10px] text-gray-400 flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" /> {formatTime(notif.createdAt?.seconds)}
          </span>
        </div>
      </div>

      {/* Delete button */}
      <button
        onClick={e => { e.stopPropagation(); onDelete(notif.id); }}
        className="absolute top-3.5 right-3.5 w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-100 hover:text-red-500 transition-all"
        title="Delete"
      >
        <X className="w-3 h-3" />
      </button>
    </motion.div>
  );

  return notif.link ? (
    <Link href={notif.link} className="block">{inner}</Link>
  ) : inner;
}

// ─── Main Page ──────────────────────────────────────────────────────────────────
export default function NotificationsPage() {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<NotifType | "all">("all");
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) { router.push("/login"); return; }

      const q = query(
        collection(db, "notifications"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc")
      );

      const unsubSnap = onSnapshot(q, (snap) => {
        setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() } as Notification)));
        setLoading(false);
      });

      return () => unsubSnap();
    });
    return () => unsub();
  }, [router]);

  const markRead = async (id: string) => {
    await updateDoc(doc(db, "notifications", id), { read: true });
  };

  const deleteNotif = async (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    try {
      await updateDoc(doc(db, "notifications", id), { deleted: true, deletedAt: serverTimestamp() });
    } catch { /* swallow */ }
  };

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.read);
    if (!unread.length) return;
    const batch = writeBatch(db);
    unread.forEach(n => batch.update(doc(db, "notifications", n.id), { read: true }));
    await batch.commit();
    toast.success(`${unread.length} notification${unread.length > 1 ? "s" : ""} marked as read.`);
  };

  const clearAll = async () => {
    if (!notifications.length) return;
    setClearing(true);
    const batch = writeBatch(db);
    notifications.forEach(n => batch.update(doc(db, "notifications", n.id), { deleted: true }));
    await batch.commit();
    setNotifications([]);
    setClearing(false);
    toast.success("All notifications cleared.");
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  // Apply filters
  const filtered = notifications.filter(n => {
    const matchType = filter === "all" || n.type === filter;
    const matchRead = !showUnreadOnly || !n.read;
    return matchType && matchRead;
  });

  // Group by date
  const grouped: { label: string; items: Notification[] }[] = [];
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const yesterdayStart = new Date(todayStart); yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const weekStart = new Date(todayStart); weekStart.setDate(weekStart.getDate() - 7);

  const todays = filtered.filter(n => (n.createdAt?.seconds || 0) * 1000 >= todayStart.getTime());
  const yesterdays = filtered.filter(n => {
    const t = (n.createdAt?.seconds || 0) * 1000;
    return t >= yesterdayStart.getTime() && t < todayStart.getTime();
  });
  const olders = filtered.filter(n => (n.createdAt?.seconds || 0) * 1000 < yesterdayStart.getTime());

  if (todays.length) grouped.push({ label: "Today", items: todays });
  if (yesterdays.length) grouped.push({ label: "Yesterday", items: yesterdays });
  if (olders.length) grouped.push({ label: "Earlier", items: olders });

  const TYPE_FILTERS: { id: NotifType | "all"; label: string }[] = [
    { id: "all", label: "All" },
    { id: "booking", label: "Bookings" },
    { id: "payment", label: "Payments" },
    { id: "message", label: "Messages" },
    { id: "dispute", label: "Disputes" },
    { id: "system", label: "System" },
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
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-[#0c4a6e]">Notifications</span>
            {unreadCount > 0 && (
              <span className="w-5 h-5 bg-[#0284c7] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </div>
          <div className="w-9" />
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-2xl mx-auto space-y-5">

            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-[#0c4a6e]">Notifications</h1>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 bg-[#0284c7] text-white text-xs font-bold rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{notifications.length} total</p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="flex items-center gap-1.5 text-xs font-semibold text-[#0284c7] hover:text-[#0369a1] px-3 py-1.5 rounded-lg hover:bg-[#e0f2fe] transition"
                  >
                    <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={clearAll}
                    disabled={clearing}
                    className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-50 transition"
                  >
                    {clearing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    Clear all
                  </button>
                )}
              </div>
            </div>

            {/* Filter bar */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex gap-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-1 overflow-x-auto">
                {TYPE_FILTERS.map(f => (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                      filter === f.id ? "bg-[#0284c7] text-white shadow-sm" : "text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Unread toggle */}
              <button
                onClick={() => setShowUnreadOnly(p => !p)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition ${
                  showUnreadOnly
                    ? "bg-[#0284c7] text-white border-[#0284c7]"
                    : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
                }`}
              >
                <Circle className="w-3 h-3 fill-current" />
                Unread only
              </button>
            </div>

            {/* Content */}
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse flex gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-xl shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-gray-100 rounded w-1/2" />
                      <div className="h-2.5 bg-gray-100 rounded w-3/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : grouped.length > 0 ? (
              <div className="space-y-6">
                {grouped.map(group => (
                  <div key={group.label}>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">{group.label}</p>
                    <div className="space-y-2">
                      <AnimatePresence>
                        {group.items.map(notif => (
                          <NotifItem
                            key={notif.id}
                            notif={notif}
                            onRead={markRead}
                            onDelete={deleteNotif}
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-14 text-center">
                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <BellOff className="w-8 h-8 text-gray-200" />
                </div>
                <h3 className="text-base font-bold text-gray-400 mb-1">
                  {showUnreadOnly ? "No unread notifications" : "No notifications yet"}
                </h3>
                <p className="text-sm text-gray-300">
                  {showUnreadOnly
                    ? "You're all caught up!"
                    : "Updates about your bookings, payments, and messages will appear here."}
                </p>
                {showUnreadOnly && (
                  <button
                    onClick={() => setShowUnreadOnly(false)}
                    className="mt-4 text-xs text-[#0284c7] font-semibold hover:underline"
                  >
                    Show all notifications
                  </button>
                )}
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}