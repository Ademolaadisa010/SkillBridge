"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Hero from "@/public/hero.jpg";
import { db, auth } from "@/lib/firebase";
import {
  collection, query, where, onSnapshot,
  getDocs, limit, doc
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import Link from "next/link";
import {
  CalendarCheck, CheckCircle2, CreditCard, MessageCircle,
  CalendarPlus, ChevronRight, Clock, Star, MapPin,
  AlertCircle, ArrowUpRight, Zap, ShieldCheck, Menu
} from "lucide-react";
import ClientSidebar from "@/components/sidebar/ClientSidebar";

interface Worker {
  id: string;
  fullName: string;
  service: string;
  rating: number;
  reviews: number;
  price: string;
  location?: string;
  verified?: boolean;
}

interface Booking {
  id: string;
  workerName?: string;
  service?: string;
  status: string;
  amount?: number;
  date?: string;
}

// ─── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({
  label, value, icon, color, href
}: {
  label: string; value: number | string;
  icon: React.ReactNode; color: string; href?: string;
}) {
  const styles: Record<string, string> = {
    blue:   "bg-[#e0f2fe] text-[#0284c7] border-blue-100",
    green:  "bg-[#dcfce7] text-[#10b981] border-green-100",
    orange: "bg-[#fff7ed] text-[#f97316] border-orange-100",
    violet: "bg-[#f5f3ff] text-[#7c3aed] border-violet-100",
  };

  const card = (
    <div className={`relative p-5 rounded-2xl border ${styles[color]} group hover:shadow-md transition-all duration-200 cursor-pointer`}>
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
          {icon}
        </div>
        {href && <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-60 transition-opacity" />}
      </div>
      <div className="text-3xl font-bold mb-1">{value}</div>
      <div className="text-sm font-medium opacity-80">{label}</div>
    </div>
  );

  return href ? <Link href={href}>{card}</Link> : card;
}

// ─── Activity Item ──────────────────────────────────────────────────────────────
function ActivityItem({
  icon, color, text, time, sub
}: {
  icon: React.ReactNode; color: string;
  text: string; time: string; sub?: string;
}) {
  const bg: Record<string, string> = {
    green:  "bg-[#dcfce7] text-[#10b981]",
    blue:   "bg-[#e0f2fe] text-[#0284c7]",
    orange: "bg-[#fff7ed] text-[#f97316]",
    red:    "bg-red-50 text-red-500",
    violet: "bg-[#f5f3ff] text-[#7c3aed]",
  };
  return (
    <div className="flex items-center gap-3 p-3.5 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition">
      <div className={`w-9 h-9 ${bg[color]} rounded-xl flex items-center justify-center shrink-0`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#0c4a6e] truncate">{text}</p>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
      <span className="text-xs text-gray-400 shrink-0">{time}</span>
    </div>
  );
}

// ─── Status Badge ───────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending:       "bg-yellow-100 text-yellow-700",
    active:        "bg-blue-100 text-[#0284c7]",
    "in-progress": "bg-blue-100 text-[#0284c7]",
    completed:     "bg-green-100 text-[#10b981]",
    disputed:      "bg-red-100 text-red-600",
  };
  return (
    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full capitalize ${map[status] || "bg-gray-100 text-gray-500"}`}>
      {status}
    </span>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────────
export default function ClientDashboardPage() {
  const [userName, setUserName] = useState("Client");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [stats, setStats] = useState({
    activeBookings: 0,
    completedJobs: 0,
    pendingPayments: 0,
    newMessages: 0,
  });
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [recommendedWorkers, setRecommendedWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (!user) return;
      const userId = user.uid;
      setUserName(user.displayName?.split(" ")[0] || "Client");

      // 1. Jobs
      const jobsQ = query(collection(db, "jobs"), where("clientId", "==", userId));
      const unsubJobs = onSnapshot(jobsQ, (snap) => {
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Booking));
        setStats(prev => ({
          ...prev,
          activeBookings:  docs.filter(j => ["active", "pending", "in-progress"].includes(j.status)).length,
          completedJobs:   docs.filter(j => j.status === "completed").length,
          pendingPayments: docs.filter(j => j.status === "pending" && j.amount).length,
        }));
        setRecentBookings(docs.slice(0, 4));
      });

      // 2. Saved workers
      const unsubBookmarks = onSnapshot(doc(db, "bookmarks", userId), (docSnap) => {
        if (docSnap.exists()) {
          const items = docSnap.data().items || {};
          setStats(prev => ({ ...prev, savedWorkers: Object.keys(items).length }));
        }
      });

      // 3. Unread messages
      const chatQ = query(collection(db, "chats"), where("participants", "array-contains", userId));
      const unsubChats = onSnapshot(chatQ, (snap) => {
        const total = snap.docs.reduce((acc, d) => acc + (d.data().unread || 0), 0);
        setStats(prev => ({ ...prev, newMessages: total }));
      });

      // 4. Recommended workers
      getDocs(query(collection(db, "workers"), limit(3))).then((snap) => {
        setRecommendedWorkers(snap.docs.map(d => ({ id: d.id, ...d.data() } as Worker)));
        setLoading(false);
      });

      return () => { unsubJobs(); unsubBookmarks(); unsubChats(); };
    });

    return () => unsubAuth();
  }, []);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {/* ── Desktop Sidebar ── */}
      <ClientSidebar />

      {/* ── Mobile Sidebar Overlay ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer — override hidden class for mobile */}
          <div className="absolute left-0 top-0 h-full [&>aside]:flex">
            <ClientSidebar />
          </div>
        </div>
      )}

      {/* ── Main Content Area ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Mobile Top Bar */}
        <header className="lg:hidden bg-white border-b border-gray-100 px-4 h-14 flex items-center justify-between shrink-0 shadow-sm">
          <button
            onClick={() => setMobileOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition text-[#0c4a6e]"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="bg-[#10b981] p-1.5 rounded-lg">
              <i className="fas fa-handshake text-white text-sm"></i>
            </div>
            <span className="text-base font-bold text-[#0c4a6e]">SkillBridge</span>
          </div>
          {/* Spacer to keep logo centred */}
          <div className="w-9" />
        </header>

        {/* Scrollable Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <section className="max-w-5xl mx-auto animate-in fade-in duration-500 space-y-8">

            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-sm text-gray-400 mb-0.5">Welcome back 👋</p>
                <h2 className="text-2xl sm:text-3xl font-bold text-[#0c4a6e]">{userName}</h2>
              </div>
              <Link
                href="/client/book"
                className="inline-flex items-center gap-2 bg-[#0284c7] text-white px-5 py-3 rounded-xl font-semibold text-sm hover:bg-[#0369a1] transition shadow-md self-start sm:self-auto"
              >
                <CalendarPlus className="w-4 h-4" />
                Quick Book
              </Link>
            </div>

            {/* ── Stats Grid ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Active Bookings"  value={stats.activeBookings}  icon={<CalendarCheck className="w-5 h-5 text-[#0284c7]"  />} color="blue"   href="/client/bookings" />
              <StatCard label="Completed Jobs"   value={stats.completedJobs}   icon={<CheckCircle2  className="w-5 h-5 text-[#10b981]"  />} color="green"  href="/client/bookings" />
              <StatCard label="Pending Payments" value={stats.pendingPayments} icon={<CreditCard    className="w-5 h-5 text-[#f97316]"  />} color="orange" href="/client/payments"  />
              <StatCard label="New Messages"     value={stats.newMessages}     icon={<MessageCircle className="w-5 h-5 text-[#7c3aed]" />} color="violet" href="/client/messages"  />
            </div>

            {/* ── Recent Bookings ── */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-[#0c4a6e]">Recent Bookings</h3>
                <Link href="/client/bookings" className="flex items-center gap-1 text-xs text-[#0284c7] font-semibold hover:underline">
                  View All <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {recentBookings.length > 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="divide-y divide-gray-50">
                    {recentBookings.map((booking) => (
                      <div key={booking.id} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-[#e0f2fe] rounded-xl flex items-center justify-center">
                            <CalendarCheck className="w-4 h-4 text-[#0284c7]" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-[#0c4a6e]">{booking.service || "Service Booking"}</p>
                            <p className="text-xs text-gray-400">{booking.workerName || "Awaiting worker"} · {booking.date || "—"}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {booking.amount && (
                            <span className="text-sm font-bold text-[#0c4a6e]">₦{booking.amount.toLocaleString()}</span>
                          )}
                          <StatusBadge status={booking.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-8 text-center">
                  <CalendarCheck className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-sm text-gray-400 font-medium">No bookings yet</p>
                  <p className="text-xs text-gray-300 mt-1 mb-4">Book your first service to get started</p>
                  <Link
                    href="/client/book"
                    className="inline-flex items-center gap-2 bg-[#0284c7] text-white text-xs font-semibold px-5 py-2.5 rounded-xl hover:bg-[#0369a1] transition"
                  >
                    <CalendarPlus className="w-3.5 h-3.5" /> Book a Service
                  </Link>
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-[#0c4a6e]">Recommended Workers</h3>
                <Link href="/client/book" className="flex items-center gap-1 text-xs text-[#0284c7] font-semibold hover:underline">
                  View All <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? (
                  [...Array(3)].map((_, i) => (
                    <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse">
                      <div className="flex gap-3 mb-3">
                        <div className="w-14 h-14 bg-gray-100 rounded-full" />
                        <div className="flex-1 space-y-2 pt-1">
                          <div className="h-3 bg-gray-100 rounded w-3/4" />
                          <div className="h-2.5 bg-gray-100 rounded w-1/2" />
                        </div>
                      </div>
                      <div className="h-8 bg-gray-100 rounded-xl" />
                    </div>
                  ))
                ) : recommendedWorkers.length > 0 ? (
                  recommendedWorkers.map((worker) => (
                    <div key={worker.id} className="bg-white border border-gray-100 rounded-2xl p-4 hover:shadow-lg transition group">
                      <div className="flex items-start gap-3 mb-4">
                        <div className="relative">
                          <Image src={Hero} alt="worker" className="w-14 h-14 rounded-full object-cover" />
                          {worker.verified && (
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#10b981] rounded-full flex items-center justify-center border-2 border-white">
                              <ShieldCheck className="w-2.5 h-2.5 text-white" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-[#0c4a6e] text-sm truncate">{worker.fullName}</h4>
                          <p className="text-xs text-gray-500 mb-1">{worker.service}</p>
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                            <span className="text-xs font-semibold text-gray-700">{worker.rating || "5.0"}</span>
                            <span className="text-xs text-gray-400">({worker.reviews || 0} reviews)</span>
                          </div>
                          {worker.location && (
                            <div className="flex items-center gap-1 mt-1">
                              <MapPin className="w-2.5 h-2.5 text-gray-300" />
                              <span className="text-[10px] text-gray-400">{worker.location}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                        <span className="text-sm font-bold text-[#0284c7]">{worker.price}/hr</span>
                        <Link
                          href={`/client/book?worker=${worker.id}`}
                          className="bg-[#0284c7] text-white px-4 py-1.5 rounded-lg text-xs font-semibold hover:bg-[#0369a1] transition"
                        >
                          Book Now
                        </Link>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-3 text-center py-8">
                    <Zap className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">Finding workers near you...</p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-base font-bold text-[#0c4a6e] mb-4">Recent Activity</h3>
              <div className="space-y-2">
                {stats.activeBookings > 0 && (
                  <ActivityItem icon={<CalendarCheck className="w-4 h-4" />} color="blue"
                    text={`You have ${stats.activeBookings} active booking${stats.activeBookings > 1 ? "s" : ""}`}
                    sub="Track progress in My Bookings" time="Live" />
                )}
                {stats.pendingPayments > 0 && (
                  <ActivityItem icon={<AlertCircle className="w-4 h-4" />} color="orange"
                    text={`${stats.pendingPayments} payment${stats.pendingPayments > 1 ? "s" : ""} awaiting release`}
                    sub="Review and release from Payments" time="Pending" />
                )}
                {stats.newMessages > 0 && (
                  <ActivityItem icon={<MessageCircle className="w-4 h-4" />} color="violet"
                    text={`${stats.newMessages} unread message${stats.newMessages > 1 ? "s" : ""}`}
                    sub="Open Messages to reply" time="Unread" />
                )}
                {stats.completedJobs > 0 && (
                  <ActivityItem icon={<CheckCircle2 className="w-4 h-4" />} color="green"
                    text={`${stats.completedJobs} job${stats.completedJobs > 1 ? "s" : ""} completed successfully`}
                    sub="Leave a review for your worker" time="Done" />
                )}
                {stats.activeBookings === 0 && stats.completedJobs === 0 && stats.newMessages === 0 && (
                  <ActivityItem icon={<Clock className="w-4 h-4" />} color="blue"
                    text="No recent activity yet"
                    sub="Book your first service to get started" time="—" />
                )}
              </div>
            </div>

          </section>
        </main>
      </div>
    </div>
  );
}