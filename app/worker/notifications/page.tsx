"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bell, BellOff, CheckCheck, Trash2, Clock, X, Loader2, Menu, CalendarCheck, CreditCard, MessageCircle, ShieldAlert, Star, Info, ShieldCheck, Circle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { db, auth } from "@/lib/firebase";
import { collection, query, where, onSnapshot, doc, updateDoc, writeBatch, serverTimestamp, orderBy } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import WorkerSidebar from "@/components/sidebar/WorkerSidebar";
import toast, { Toaster } from "react-hot-toast";
import Link from "next/link";

type NotifType = "booking"|"payment"|"message"|"dispute"|"review"|"system"|"verification";
interface Notification { id: string; userId: string; type: NotifType; title: string; body: string; read: boolean; link?: string; createdAt?: { seconds: number }; }

function timeAgo(s?: number) { if (!s) return "—"; const d = Date.now() - s * 1000; if (d < 60000) return "Just now"; if (d < 3600000) return `${Math.floor(d/60000)}m ago`; if (d < 86400000) return `${Math.floor(d/3600000)}h ago`; if (d < 604800000) return `${Math.floor(d/86400000)}d ago`; return new Date(s * 1000).toLocaleDateString("en-NG", { month: "short", day: "numeric" }); }

const CFG: Record<NotifType, { icon: React.ReactNode; bg: string; color: string }> = {
  booking:      { icon: <CalendarCheck className="w-5 h-5" />, bg: "bg-[#dcfce7]",  color: "text-[#10b981]" },
  payment:      { icon: <CreditCard className="w-5 h-5" />,    bg: "bg-yellow-50",   color: "text-yellow-600" },
  message:      { icon: <MessageCircle className="w-5 h-5" />, bg: "bg-[#f5f3ff]",  color: "text-[#7c3aed]" },
  dispute:      { icon: <ShieldAlert className="w-5 h-5" />,   bg: "bg-red-50",      color: "text-red-500" },
  review:       { icon: <Star className="w-5 h-5" />,          bg: "bg-yellow-50",   color: "text-yellow-500" },
  system:       { icon: <Info className="w-5 h-5" />,          bg: "bg-gray-100",    color: "text-gray-500" },
  verification: { icon: <ShieldCheck className="w-5 h-5" />,   bg: "bg-[#dcfce7]",  color: "text-[#10b981]" },
};

const TYPE_LABELS: Record<NotifType, string> = { booking: "Booking", payment: "Payment", message: "Message", dispute: "Dispute", review: "Review", system: "System", verification: "Verification" };
const FILTERS: { id: NotifType | "all"; label: string }[] = [{ id: "all", label: "All" }, { id: "booking", label: "Bookings" }, { id: "payment", label: "Payments" }, { id: "message", label: "Messages" }, { id: "dispute", label: "Disputes" }, { id: "system", label: "System" }];

export default function WorkerNotificationsPage() {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<NotifType | "all">("all");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      if (!user) { router.push("/login"); return; }
      const q = query(collection(db, "notifications"), where("userId", "==", user.uid), orderBy("createdAt", "desc"));
      const unsubSnap = onSnapshot(q, snap => { setNotifs(snap.docs.map(d => ({ id: d.id, ...d.data() } as Notification))); setLoading(false); });
      return () => unsubSnap();
    });
    return () => unsub();
  }, [router]);

  const markRead = async (id: string) => { await updateDoc(doc(db, "notifications", id), { read: true }); };
  const deleteNotif = (id: string) => { setNotifs(p => p.filter(n => n.id !== id)); updateDoc(doc(db, "notifications", id), { deleted: true }).catch(() => {}); };
  const markAllRead = async () => { const u = notifs.filter(n => !n.read); if (!u.length) return; const b = writeBatch(db); u.forEach(n => b.update(doc(db, "notifications", n.id), { read: true })); await b.commit(); toast.success(`${u.length} marked as read.`); };
  const clearAll = async () => { if (!notifs.length) return; setClearing(true); const b = writeBatch(db); notifs.forEach(n => b.update(doc(db, "notifications", n.id), { deleted: true })); await b.commit(); setNotifs([]); setClearing(false); toast.success("All cleared."); };

  const unreadCount = notifs.filter(n => !n.read).length;
  const filtered = notifs.filter(n => (filter === "all" || n.type === filter) && (!unreadOnly || !n.read));

  const todayStart = new Date(); todayStart.setHours(0,0,0,0);
  const yStart = new Date(todayStart); yStart.setDate(yStart.getDate() - 1);
  const groups = [{ label: "Today", items: filtered.filter(n => (n.createdAt?.seconds||0)*1000 >= todayStart.getTime()) }, { label: "Yesterday", items: filtered.filter(n => { const t=(n.createdAt?.seconds||0)*1000; return t >= yStart.getTime() && t < todayStart.getTime(); }) }, { label: "Earlier", items: filtered.filter(n => (n.createdAt?.seconds||0)*1000 < yStart.getTime()) }].filter(g => g.items.length);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Toaster position="top-center" />
      <WorkerSidebar />
      {mobileOpen && <div className="fixed inset-0 z-50 lg:hidden"><div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} /><div className="absolute left-0 top-0 h-full [&>aside]:flex"><WorkerSidebar /></div></div>}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="lg:hidden bg-white border-b border-gray-100 px-4 h-14 flex items-center justify-between shrink-0 shadow-sm">
          <button onClick={() => setMobileOpen(true)} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100"><Menu className="w-5 h-5 text-[#0c4a6e]" /></button>
          <div className="flex items-center gap-2"><span className="text-base font-bold text-[#0c4a6e]">Notifications</span>{unreadCount > 0 && <span className="w-5 h-5 bg-[#10b981] text-white text-[10px] font-bold rounded-full flex items-center justify-center">{unreadCount > 9 ? "9+" : unreadCount}</span>}</div>
          <div className="w-9" />
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-2xl mx-auto space-y-5">
            <div className="flex items-center justify-between">
              <div><div className="flex items-center gap-2"><h1 className="text-xl font-bold text-[#0c4a6e]">Notifications</h1>{unreadCount > 0 && <span className="px-2 py-0.5 bg-[#10b981] text-white text-xs font-bold rounded-full">{unreadCount} new</span>}</div><p className="text-xs text-gray-400 mt-0.5">{notifs.length} total</p></div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && <button onClick={markAllRead} className="flex items-center gap-1.5 text-xs font-semibold text-[#10b981] hover:text-[#059669] px-3 py-1.5 rounded-lg hover:bg-[#dcfce7] transition"><CheckCheck className="w-3.5 h-3.5" /> Mark all read</button>}
                {notifs.length > 0 && <button onClick={clearAll} disabled={clearing} className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-50 transition">{clearing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} Clear all</button>}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex gap-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-1 overflow-x-auto">
                {FILTERS.map(f => <button key={f.id} onClick={() => setFilter(f.id)} className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${filter === f.id ? "bg-[#10b981] text-white shadow-sm" : "text-gray-500 hover:bg-gray-50"}`}>{f.label}</button>)}
              </div>
              <button onClick={() => setUnreadOnly(p => !p)} className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition ${unreadOnly ? "bg-[#10b981] text-white border-[#10b981]" : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"}`}><Circle className="w-3 h-3 fill-current" /> Unread</button>
            </div>

            {loading ? <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse flex gap-3"><div className="w-10 h-10 bg-gray-100 rounded-xl shrink-0" /><div className="flex-1 space-y-2"><div className="h-3 bg-gray-100 rounded w-1/2" /><div className="h-2.5 bg-gray-100 rounded w-3/4" /></div></div>)}</div>
            : groups.length > 0 ? (
              <div className="space-y-6">{groups.map(group => (
                <div key={group.label}>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">{group.label}</p>
                  <div className="space-y-2"><AnimatePresence>{group.items.map(n => {
                    const cfg = CFG[n.type] || CFG.system;
                    const inner = (
                      <motion.div key={n.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
                        className={`group relative flex items-start gap-4 p-4 rounded-2xl border transition cursor-pointer ${n.read ? "bg-white border-gray-100 hover:shadow-sm" : "bg-[#f0fdf4] border-[#bbf7d0] hover:shadow-md"}`}
                        onClick={() => !n.read && markRead(n.id)}>
                        {!n.read && <div className="absolute top-4 right-4 w-2 h-2 bg-[#10b981] rounded-full" />}
                        <div className={`w-10 h-10 ${cfg.bg} ${cfg.color} rounded-xl flex items-center justify-center shrink-0`}>{cfg.icon}</div>
                        <div className="flex-1 min-w-0 pr-6">
                          <p className={`text-sm font-semibold leading-snug ${n.read ? "text-gray-700" : "text-[#0c4a6e]"}`}>{n.title}</p>
                          <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mt-0.5">{n.body}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${n.read ? "bg-gray-100 text-gray-400" : `${cfg.bg} ${cfg.color}`}`}>{TYPE_LABELS[n.type]}</span>
                            <span className="text-[10px] text-gray-400 flex items-center gap-1"><Clock className="w-2.5 h-2.5" />{timeAgo(n.createdAt?.seconds)}</span>
                          </div>
                        </div>
                        <button onClick={e => { e.stopPropagation(); deleteNotif(n.id); }} className="absolute top-3.5 right-3.5 w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-100 hover:text-red-500 transition-all"><X className="w-3 h-3" /></button>
                      </motion.div>
                    );
                    return n.link ? <Link key={n.id} href={n.link} className="block">{inner}</Link> : inner;
                  })}</AnimatePresence></div>
                </div>
              ))}</div>
            ) : (
              <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-14 text-center">
                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4"><BellOff className="w-8 h-8 text-gray-200" /></div>
                <h3 className="text-base font-bold text-gray-400 mb-1">{unreadOnly ? "No unread notifications" : "No notifications yet"}</h3>
                <p className="text-sm text-gray-300">{unreadOnly ? "You're all caught up!" : "Updates about your jobs, earnings and messages appear here."}</p>
                {unreadOnly && <button onClick={() => setUnreadOnly(false)} className="mt-4 text-xs text-[#10b981] font-semibold hover:underline">Show all</button>}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}