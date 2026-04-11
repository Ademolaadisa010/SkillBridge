"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Inbox, CalendarCheck, Wallet, Star, ChevronRight,
  CheckCircle2, AlertCircle, Menu, BadgeCheck,
  MessageCircle, MapPin, Clock, Bell, TrendingUp,
  ShieldCheck, Zap, ArrowRight, Lock
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { db, auth } from "@/lib/firebase";
import {
  collection, query, where, onSnapshot,
  doc, onSnapshot as onDocSnap
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import WorkerSidebar from "@/components/sidebar/WorkerSidebar";

interface Job {
  id: string;
  service?: string;
  category?: string;
  clientName?: string;
  address?: string;
  amount?: number;
  status: string;
  paymentStatus?: string;
  createdAt?: { seconds: number };
}

interface Notification {
  id: string;
  title: string;
  body: string;
  link?: string;
  read: boolean;
  createdAt?: { seconds: number };
}

function StatusBadge({ status, paymentStatus }: { status: string; paymentStatus?: string }) {
  if (paymentStatus === "pending_verification") {
    return <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">Verifying Pay</span>;
  }
  const map: Record<string, string> = {
    pending:      "bg-yellow-100 text-yellow-700",
    "in-progress":"bg-blue-100 text-[#0284c7]",
    completed:    "bg-green-100 text-[#10b981]",
    disputed:     "bg-red-100 text-red-600",
  };
  return (
    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full capitalize ${map[status] || "bg-gray-100 text-gray-500"}`}>
      {status === "in-progress" ? "In Progress" : status}
    </span>
  );
}

function timeAgo(s?: number) {
  if (!s) return "";
  const d = Date.now() - s * 1000;
  if (d < 3600000)  return `${Math.floor(d / 60000)}m ago`;
  if (d < 86400000) return `${Math.floor(d / 3600000)}h ago`;
  return `${Math.floor(d / 86400000)}d ago`;
}

export default function WorkerDashboard() {
  const router = useRouter();
  const [mobileOpen, setMobileOpen]   = useState(false);
  const [workerName, setWorkerName]   = useState("Worker");
  const [verified, setVerified]       = useState(false);
  const [verifStatus, setVerifStatus] = useState<string>("unsubmitted");
  const [emailVerified, setEmailVerified] = useState(false);
  const [loading, setLoading]         = useState(true);

  const [stats, setStats] = useState({
    active: 0, completed: 0, pending: 0, disputed: 0,
    earnings: 0, escrow: 0, totalEarned: 0,
    rating: 0, totalJobs: 0, unread: 0,
    pendingPayments: 0, // jobs awaiting payment verification
  });

  const [recentJobs,  setRecentJobs]  = useState<Job[]>([]);
  const [recentNotifs, setRecentNotifs] = useState<Notification[]>([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      if (!user) { router.push("/login"); return; }

      setEmailVerified(user.emailVerified);

      // ── Real-time user doc (wallet, verification status) ──────────────────
      const unsubUser = onDocSnap(doc(db, "users", user.uid), snap => {
        if (snap.exists()) {
          const d = snap.data();
          setWorkerName(d.displayName || d.fullName || user.displayName || "Worker");
          setVerified(d.verified === true);
          setVerifStatus(d.verificationStatus || "unsubmitted");
          setStats(prev => ({
            ...prev,
            earnings:   d.walletBalance  || 0,
            escrow:     d.escrowBalance  || 0,
            totalEarned:d.totalEarned    || 0,
            rating:     d.rating         || 0,
            totalJobs:  d.totalJobs      || 0,
          }));
        }
        setLoading(false);
      });

      // ── Jobs ──────────────────────────────────────────────────────────────
      const unsubJobs = onSnapshot(
        query(collection(db, "jobs"), where("workerId", "==", user.uid)),
        snap => {
          const docs = snap.docs
            .map(d => ({ id: d.id, ...d.data() } as Job))
            .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

          setStats(prev => ({
            ...prev,
            active:          docs.filter(j => j.status === "in-progress").length,
            pending:         docs.filter(j => j.status === "pending").length,
            completed:       docs.filter(j => j.status === "completed").length,
            disputed:        docs.filter(j => j.status === "disputed").length,
            pendingPayments: docs.filter(j => j.paymentStatus === "pending_verification").length,
          }));
          setRecentJobs(docs.slice(0, 5));
        }
      );

      // ── Unread messages ───────────────────────────────────────────────────
      const unsubChats = onSnapshot(
        query(collection(db, "chats"), where("participants", "array-contains", user.uid)),
        snap => setStats(prev => ({
          ...prev,
          unread: snap.docs.reduce((a, d) => a + (d.data().unreadCount?.[user.uid] || 0), 0),
        }))
      );

      // ── Recent notifications ──────────────────────────────────────────────
      const unsubNotifs = onSnapshot(
        query(collection(db, "notifications"),
          where("userId", "==", user.uid),
          where("read", "==", false)
        ),
        snap => {
          const notifs = snap.docs
            .map(d => ({ id: d.id, ...d.data() } as Notification))
            .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
            .slice(0, 3);
          setRecentNotifs(notifs);
        }
      );

      return () => { unsubUser(); unsubJobs(); unsubChats(); unsubNotifs(); };
    });
    return () => unsub();
  }, [router]);

  const STATS = [
    { label: "Active Jobs",    value: stats.active,              icon: <CalendarCheck className="w-5 h-5 text-[#0284c7]" />, bg: "bg-[#e0f2fe] border-blue-100",    href: "/worker/my-jobs?tab=in-progress" },
    { label: "Completed",      value: stats.completed,           icon: <CheckCircle2 className="w-5 h-5 text-[#10b981]" />,  bg: "bg-[#dcfce7] border-green-100",   href: "/worker/my-jobs?tab=completed" },
    { label: "Wallet",         value: `₦${stats.earnings.toLocaleString()}`, icon: <Wallet className="w-5 h-5 text-yellow-500" />,     bg: "bg-yellow-50 border-yellow-100",  href: "/worker/earnings" },
    { label: "Rating",         value: stats.rating ? `${stats.rating.toFixed(1)}★` : "—", icon: <Star className="w-5 h-5 text-[#7c3aed]" />, bg: "bg-[#f5f3ff] border-violet-100", href: "/worker/reviews" },
  ];

  // Verification banner logic — only show if not fully verified
  const showVerifBanner = !verified;
  const verifBannerContent = () => {
    if (!emailVerified) return {
      color: "bg-amber-50 border-amber-200",
      icon:  <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />,
      title: "Verify your email",
      desc:  "Check your inbox and click the verification link to activate your account.",
      cta:   null,
    };
    if (verifStatus === "pending") return {
      color: "bg-blue-50 border-blue-200",
      icon:  <Clock className="w-5 h-5 text-[#0284c7] shrink-0 mt-0.5" />,
      title: "ID verification under review",
      desc:  "Our team is reviewing your documents. You'll be notified once approved (24–48 hrs).",
      cta:   null,
    };
    if (verifStatus === "rejected") return {
      color: "bg-red-50 border-red-200",
      icon:  <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />,
      title: "Verification rejected",
      desc:  "Your documents were not accepted. Please re-submit with clearer photos.",
      cta:   { label: "Re-submit →", href: "/worker/verification" },
    };
    return {
      color: "bg-amber-50 border-amber-200",
      icon:  <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />,
      title: "Complete your verification",
      desc:  "Verified workers get 3× more job requests and priority placement.",
      cta:   { label: "Verify Now →", href: "/worker/verification" },
    };
  };

  const banner = verifBannerContent();

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
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
          <span className="text-base font-bold text-[#0c4a6e]">Dashboard</span>
          <div className="w-9" />
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-5xl mx-auto space-y-6">

            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-sm text-gray-400 mb-0.5">Welcome back 👷</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-2xl font-bold text-[#0c4a6e]">{workerName}</h2>
                  {verified && (
                    <span className="inline-flex items-center gap-1 bg-[#dcfce7] text-[#10b981] text-xs font-bold px-2.5 py-1 rounded-full border border-green-200">
                      <BadgeCheck className="w-3 h-3" /> Verified
                    </span>
                  )}
                </div>
              </div>
              <Link href="/worker/jobs"
                className="inline-flex items-center gap-2 bg-[#10b981] text-white px-5 py-3 rounded-xl font-semibold text-sm hover:bg-[#059669] transition shadow-md self-start sm:self-auto">
                <Inbox className="w-4 h-4" /> Browse Jobs
              </Link>
            </div>

            {/* ── Verification banner — hidden when verified ── */}
            <AnimatePresence>
              {showVerifBanner && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  className={`border rounded-2xl p-4 flex items-start gap-3 ${banner.color}`}
                >
                  {banner.icon}
                  <div className="flex-1">
                    <p className="text-sm font-bold text-gray-800">{banner.title}</p>
                    <p className="text-xs text-gray-600 mt-0.5">{banner.desc}</p>
                  </div>
                  {banner.cta && (
                    <Link href={banner.cta.href}
                      className="shrink-0 text-xs font-bold text-white bg-[#10b981] px-3 py-1.5 rounded-lg hover:bg-[#059669] transition">
                      {banner.cta.label}
                    </Link>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Payment verifying alert ── */}
            {stats.pendingPayments > 0 && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex items-center gap-3">
                <Clock className="w-5 h-5 text-amber-500 shrink-0 animate-pulse" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-amber-800">
                    {stats.pendingPayments} payment{stats.pendingPayments > 1 ? "s" : ""} being verified
                  </p>
                  <p className="text-xs text-amber-600 mt-0.5">
                    Client has submitted payment. Admin is confirming the transfer — you'll be notified shortly.
                  </p>
                </div>
                <Link href="/worker/my-jobs"
                  className="shrink-0 text-xs font-bold text-amber-700 bg-amber-100 px-3 py-1.5 rounded-lg hover:bg-amber-200 transition">
                  View →
                </Link>
              </motion.div>
            )}

            {/* ── Recent notifications ── */}
            {recentNotifs.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-[#0284c7]" />
                    <span className="text-sm font-bold text-[#0c4a6e]">Notifications</span>
                    <span className="w-5 h-5 bg-[#0284c7] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {recentNotifs.length}
                    </span>
                  </div>
                  <Link href="/worker/notifications" className="text-xs text-[#10b981] font-semibold hover:underline">View all</Link>
                </div>
                {recentNotifs.map(n => (
                  <Link key={n.id} href={n.link || "#"}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition border-b border-gray-50 last:border-0">
                    <div className="w-2 h-2 rounded-full bg-[#0284c7] shrink-0 mt-1.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-[#0c4a6e] truncate">{n.title}</p>
                      <p className="text-xs text-gray-500 truncate">{n.body}</p>
                    </div>
                    <span className="text-[10px] text-gray-400 shrink-0">{timeAgo(n.createdAt?.seconds)}</span>
                  </Link>
                ))}
              </div>
            )}

            {/* ── Stat cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {loading
                ? [...Array(4)].map((_, i) => (
                    <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse space-y-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-xl" />
                      <div className="h-6 bg-gray-100 rounded w-1/2" />
                      <div className="h-3 bg-gray-100 rounded w-2/3" />
                    </div>
                  ))
                : STATS.map(s => (
                    <Link key={s.label} href={s.href}>
                      <div className={`p-5 rounded-2xl border ${s.bg} hover:shadow-md transition cursor-pointer`}>
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm mb-3">
                          {s.icon}
                        </div>
                        <div className="text-2xl font-bold text-[#0c4a6e] mb-1">{s.value}</div>
                        <div className="text-xs font-medium text-gray-500">{s.label}</div>
                      </div>
                    </Link>
                  ))}
            </div>

            {/* ── Extra stats row ── */}
            {!loading && (
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "In Escrow",    value: `₦${stats.escrow.toLocaleString()}`,      icon: <Lock className="w-4 h-4 text-[#0284c7]" />,     cls: "bg-[#e0f2fe] text-[#0284c7]" },
                  { label: "Total Earned", value: `₦${stats.totalEarned.toLocaleString()}`, icon: <TrendingUp className="w-4 h-4 text-[#10b981]" />, cls: "bg-[#dcfce7] text-[#10b981]" },
                  { label: "Total Jobs",   value: stats.totalJobs || (stats.active + stats.completed), icon: <CalendarCheck className="w-4 h-4 text-[#7c3aed]" />, cls: "bg-[#f5f3ff] text-[#7c3aed]" },
                ].map(s => (
                  <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${s.cls}`}>
                      {s.icon}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#0c4a6e]">{s.value}</p>
                      <p className="text-[10px] text-gray-400 font-medium">{s.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Recent Jobs ── */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-[#0c4a6e]">Recent Jobs</h3>
                <Link href="/worker/my-jobs" className="flex items-center gap-1 text-xs text-[#10b981] font-semibold hover:underline">
                  View All <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              {loading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse flex gap-4">
                      <div className="w-10 h-10 bg-gray-100 rounded-xl shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-gray-100 rounded w-1/3" />
                        <div className="h-2.5 bg-gray-100 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentJobs.length > 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
                  {recentJobs.map(job => (
                    <Link key={job.id} href="/worker/my-jobs"
                      className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 bg-[#dcfce7] rounded-xl flex items-center justify-center shrink-0">
                          <CalendarCheck className="w-4 h-4 text-[#10b981]" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#0c4a6e] truncate">{job.service || job.category || "Service"}</p>
                          <p className="text-xs text-gray-400 truncate">
                            {job.clientName || "Client"}{job.address ? ` · ${job.address}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-3">
                        {job.amount && <span className="text-sm font-bold text-[#0c4a6e]">₦{job.amount.toLocaleString()}</span>}
                        <StatusBadge status={job.status} paymentStatus={job.paymentStatus} />
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-8 text-center">
                  <CalendarCheck className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-sm text-gray-400 font-medium mb-1">No jobs yet</p>
                  <p className="text-xs text-gray-300 mb-4">Send offers to clients to get your first job</p>
                  <Link href="/worker/jobs"
                    className="inline-flex items-center gap-2 bg-[#10b981] text-white text-xs font-semibold px-5 py-2.5 rounded-xl hover:bg-[#059669] transition">
                    <Inbox className="w-3.5 h-3.5" /> Browse Jobs
                  </Link>
                </div>
              )}
            </div>

            {/* ── Quick links ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                { label: "Messages", href: "/worker/messages",     icon: <MessageCircle className="w-5 h-5" />, badge: stats.unread,  color: "text-[#7c3aed] bg-[#f5f3ff]" },
                { label: "Reviews",  href: "/worker/reviews",      icon: <Star className="w-5 h-5" />,          badge: 0,             color: "text-yellow-600 bg-yellow-50"  },
                { label: "Earnings", href: "/worker/earnings",     icon: <Wallet className="w-5 h-5" />,        badge: 0,             color: "text-[#10b981] bg-[#dcfce7]"   },
              ].map(item => (
                <Link key={item.href} href={item.href}
                  className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-3 hover:shadow-md transition group">
                  <div className={`w-10 h-10 ${item.color} rounded-xl flex items-center justify-center`}>
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#0c4a6e]">{item.label}</p>
                    {item.badge > 0 && <p className="text-xs text-[#10b981] font-semibold">{item.badge} new</p>}
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 ml-auto transition" />
                </Link>
              ))}
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}